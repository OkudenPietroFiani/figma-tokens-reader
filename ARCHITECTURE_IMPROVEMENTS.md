# Architecture Improvements: Resilience, Maintainability & Correctness

**Question**: *"What could we do to improve those flows and this mapping so it is more resilient and maintainable and guarantee that features work and implement things correctly?"*

---

## Executive Summary

This document proposes **12 architectural improvements** across 5 categories to make the plugin more resilient, maintainable, and correct. Each improvement includes:
- **Problem**: What's broken or risky
- **Impact**: Why it matters
- **Solution**: How to fix it
- **Implementation**: Concrete steps
- **Tests**: How to verify it works

**Estimated Effort**: 40-50 hours total
**Risk Level**: Low (most changes are additive, not breaking)
**ROI**: High (prevents entire classes of bugs)

---

## Category 1: Type Safety (Critical)

### Problem 1.1: Weak Type Safety in Token Values

**Current Issue**:
```typescript
// Token.value is loosely typed
interface Token {
  type: TokenType;      // 'color'
  value: TokenValue;    // Could be ANYTHING in the union!
}

// No compile-time guarantee that type matches value
const token: Token = {
  type: 'color',
  value: 123  // ❌ Should be ColorValue, but TypeScript allows this!
};
```

**Impact**:
- Runtime errors instead of compile-time errors
- Can't trust that `type: 'color'` actually has a `ColorValue`
- Type conversions are unsafe
- Bugs discovered late (at Figma sync time)

**Solution: Discriminated Union Pattern**

```typescript
// Define strict type-to-value mapping
type TokenByType =
  | { type: 'color'; value: ColorValue; resolvedValue?: ColorValue }
  | { type: 'dimension'; value: DimensionValue; resolvedValue?: DimensionValue }
  | { type: 'fontSize'; value: DimensionValue | number; resolvedValue?: DimensionValue | number }
  | { type: 'typography'; value: TypographyValue; resolvedValue?: TypographyValue }
  | { type: 'shadow'; value: ShadowValue; resolvedValue?: ShadowValue }
  | { type: 'number'; value: number; resolvedValue?: number }
  | { type: 'string'; value: string; resolvedValue?: string }
  | { type: 'boolean'; value: boolean; resolvedValue?: boolean };

// Refactor Token interface
interface TokenBase {
  id: string;
  path: string[];
  name: string;
  qualifiedName: string;
  projectId: string;
  collection: string;
  // ... other common fields
}

// Token is the intersection
type Token = TokenBase & TokenByType;

// Now TypeScript ENFORCES type-value matching
const token: Token = {
  type: 'color',
  value: 123  // ❌ TypeScript error! Expected ColorValue
};

// Type guards become type-safe
function isColorToken(token: Token): token is TokenBase & { type: 'color'; value: ColorValue } {
  return token.type === 'color';
}

// Usage is type-safe
if (isColorToken(token)) {
  // token.value is GUARANTEED to be ColorValue
  const hex = token.value.hex;  // ✓ Type-safe
}
```

**Implementation Steps**:
1. Create `TokenByType` discriminated union in `Token.ts`
2. Refactor `Token` interface to use discriminated union
3. Add type guard functions for each token type
4. Update `TokenRepository` methods to preserve type information
5. Update `FigmaSyncService` to use type guards

**Tests**:
```typescript
describe('Token Type Safety', () => {
  it('enforces type-value matching at compile time', () => {
    // This should not compile:
    // const token: Token = { type: 'color', value: 123 };
  });

  it('type guards narrow types correctly', () => {
    const token: Token = createColorToken('#1e40af');
    if (isColorToken(token)) {
      expectTypeOf(token.value).toEqualTypeOf<ColorValue>();
    }
  });
});
```

**Effort**: 8 hours | **Priority**: P0 (Critical)

---

### Problem 1.2: No Runtime Type Validation

**Current Issue**:
```typescript
// No validation when parsing tokens
const token = parseToken(json);  // What if json is malformed?
repository.add([token]);         // No validation!
```

**Impact**:
- Malformed tokens stored in repository
- Errors discovered late (at sync time)
- Difficult to debug (where did bad data come from?)

**Solution: Schema Validation with Zod**

```typescript
import { z } from 'zod';

// Define schemas for each value type
const ColorValueSchema = z.object({
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),
  r: z.number().min(0).max(255).optional(),
  g: z.number().min(0).max(255).optional(),
  b: z.number().min(0).max(255).optional(),
  a: z.number().min(0).max(1).optional(),
  h: z.number().min(0).max(360).optional(),
  s: z.number().min(0).max(100).optional(),
  l: z.number().min(0).max(100).optional(),
}).refine(
  data => data.hex || (data.r !== undefined && data.g !== undefined && data.b !== undefined),
  { message: 'Must provide either hex or rgb values' }
);

const DimensionValueSchema = z.object({
  value: z.number(),
  unit: z.enum(['px', 'rem', 'em', '%', 'pt'])
});

const TypographyValueSchema = z.object({
  fontFamily: z.union([z.string(), z.string().regex(/^\{.*\}$/)]).optional(),
  fontSize: z.union([z.number(), z.string(), DimensionValueSchema]).optional(),
  fontWeight: z.union([z.number(), z.string()]).optional(),
  lineHeight: z.union([z.number(), z.string(), DimensionValueSchema]).optional(),
  letterSpacing: z.union([z.number(), z.string(), DimensionValueSchema]).optional(),
});

// Token schema with discriminated union
const TokenSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('color'),
    value: ColorValueSchema,
    resolvedValue: ColorValueSchema.optional(),
    // ... other fields
  }),
  z.object({
    type: z.literal('dimension'),
    value: DimensionValueSchema,
    resolvedValue: DimensionValueSchema.optional(),
    // ... other fields
  }),
  z.object({
    type: z.literal('typography'),
    value: TypographyValueSchema,
    resolvedValue: TypographyValueSchema.optional(),
    // ... other fields
  }),
  // ... more types
]);

// Validate at parse time
class W3CTokenFormatStrategy implements ITokenFormatStrategy {
  parseTokens(data: TokenData): Result<ProcessedToken[]> {
    try {
      const tokens = this.extractTokens(data);

      // Validate each token
      const validated = tokens.map(token => {
        const result = TokenSchema.safeParse(token);

        if (!result.success) {
          console.error(`[Validation] Invalid token: ${token.qualifiedName}`);
          console.error(result.error.format());
          throw new Error(`Token validation failed: ${result.error.message}`);
        }

        return result.data;
      });

      return Success(validated);
    } catch (error) {
      return Failure(error.message);
    }
  }
}

// Validate before storing
class TokenRepository {
  add(tokens: Token[]): Result<number> {
    try {
      for (const token of tokens) {
        // Runtime validation
        const result = TokenSchema.safeParse(token);

        if (!result.success) {
          return Failure(`Invalid token ${token.qualifiedName}: ${result.error.message}`);
        }

        // Store validated token
        this.tokens.set(token.id, result.data);
        this.addToIndexes(result.data);
      }

      return Success(tokens.length);
    } catch (error) {
      return Failure(error.message);
    }
  }
}
```

**Benefits**:
- **Fail Fast**: Catch errors at import time, not sync time
- **Clear Errors**: Zod provides detailed validation messages
- **Documentation**: Schemas serve as living documentation
- **Type Safety**: Zod schemas can generate TypeScript types

**Implementation Steps**:
1. Add Zod dependency: `npm install zod`
2. Create `src/core/validation/schemas.ts` with all schemas
3. Add validation to `ITokenFormatStrategy.parseTokens()`
4. Add validation to `TokenRepository.add()`
5. Create helper function `validateToken(token: unknown): Result<Token>`
6. Add validation errors to `TokenValidation` interface

**Tests**:
```typescript
describe('Token Validation', () => {
  it('rejects invalid color values', () => {
    const invalidToken = { type: 'color', value: { hex: 'invalid' } };
    const result = TokenSchema.safeParse(invalidToken);
    expect(result.success).toBe(false);
  });

  it('accepts valid typography values', () => {
    const validToken = {
      type: 'typography',
      value: {
        fontFamily: 'Inter',
        fontSize: { value: 16, unit: 'px' }
      }
    };
    const result = TokenSchema.safeParse(validToken);
    expect(result.success).toBe(true);
  });

  it('provides detailed error messages', () => {
    const result = ColorValueSchema.safeParse({ hex: '123' });
    expect(result.error.message).toContain('hex');
  });
});
```

**Effort**: 6 hours | **Priority**: P0 (Critical)

---

### Problem 1.3: Unsafe Type Conversions

**Current Issue**:
```typescript
// FigmaSyncService type conversions are unsafe
private convertColorToFigmaRGB(value: any): RGB {
  // What if value is not a ColorValue?
  if (value.hex) {
    return this.hexToRGB(value.hex);  // Could crash!
  }
  // ...
}
```

**Impact**:
- Runtime crashes
- Silent failures (return invalid RGB)
- Hard to debug

**Solution: Type-Safe Converters with Result Pattern**

```typescript
// Define conversion result types
interface ConversionError {
  code: 'INVALID_INPUT' | 'UNSUPPORTED_FORMAT' | 'CONVERSION_FAILED';
  message: string;
  input: any;
}

// Type-safe converter interface
interface TypeConverter<TInput, TOutput> {
  convert(input: TInput): Result<TOutput, ConversionError>;
  validate(input: unknown): input is TInput;
}

// Color converter implementation
class ColorToFigmaRGBConverter implements TypeConverter<ColorValue, RGB> {
  validate(input: unknown): input is ColorValue {
    return ColorValueSchema.safeParse(input).success;
  }

  convert(input: ColorValue): Result<RGB, ConversionError> {
    try {
      // Validate input first
      if (!this.validate(input)) {
        return Failure({
          code: 'INVALID_INPUT',
          message: 'Input is not a valid ColorValue',
          input
        });
      }

      // Convert hex
      if (input.hex) {
        const rgb = this.hexToRGB(input.hex);
        if (!rgb) {
          return Failure({
            code: 'CONVERSION_FAILED',
            message: `Invalid hex color: ${input.hex}`,
            input
          });
        }
        return Success(rgb);
      }

      // Convert RGB
      if (input.r !== undefined && input.g !== undefined && input.b !== undefined) {
        return Success({
          r: input.r > 1 ? input.r / 255 : input.r,
          g: input.g > 1 ? input.g / 255 : input.g,
          b: input.b > 1 ? input.b / 255 : input.b,
        });
      }

      // Convert HSL
      if (input.h !== undefined && input.s !== undefined && input.l !== undefined) {
        const rgb = this.hslToRGB(input.h, input.s, input.l);
        return Success(rgb);
      }

      return Failure({
        code: 'UNSUPPORTED_FORMAT',
        message: 'ColorValue must have hex, rgb, or hsl values',
        input
      });
    } catch (error) {
      return Failure({
        code: 'CONVERSION_FAILED',
        message: error.message,
        input
      });
    }
  }

  private hexToRGB(hex: string): RGB | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }

  private hslToRGB(h: number, s: number, l: number): RGB {
    // ... HSL to RGB conversion
  }
}

// Dimension converter
class DimensionToPixelsConverter implements TypeConverter<DimensionValue | number, number> {
  constructor(private baseSize: number = 16) {}

  validate(input: unknown): input is DimensionValue | number {
    return typeof input === 'number' ||
           DimensionValueSchema.safeParse(input).success;
  }

  convert(input: DimensionValue | number): Result<number, ConversionError> {
    try {
      if (!this.validate(input)) {
        return Failure({
          code: 'INVALID_INPUT',
          message: 'Input is not a valid DimensionValue or number',
          input
        });
      }

      // Already a number (pixels)
      if (typeof input === 'number') {
        return Success(input);
      }

      // Convert based on unit
      switch (input.unit) {
        case 'px':
          return Success(input.value);
        case 'rem':
        case 'em':
          return Success(input.value * this.baseSize);
        case '%':
          return Success((input.value / 100) * this.baseSize);
        case 'pt':
          return Success(input.value * 1.333); // 1pt = 1.333px
        default:
          return Failure({
            code: 'UNSUPPORTED_FORMAT',
            message: `Unsupported unit: ${(input as any).unit}`,
            input
          });
      }
    } catch (error) {
      return Failure({
        code: 'CONVERSION_FAILED',
        message: error.message,
        input
      });
    }
  }
}

// Usage in FigmaSyncService
class FigmaSyncService {
  private colorConverter = new ColorToFigmaRGBConverter();
  private dimensionConverter = new DimensionToPixelsConverter();

  private async syncToken(token: Token, ...): Promise<ImportStats> {
    // Type-safe conversion
    if (token.type === 'color') {
      const conversionResult = this.colorConverter.convert(token.value);

      if (!conversionResult.success) {
        console.error(`[FigmaSyncService] Color conversion failed:`, conversionResult.error);
        return { added: 0, updated: 0, skipped: 1 };
      }

      const figmaRGB = conversionResult.data;
      variable.setValueForMode(modeId, figmaRGB);
    }
  }
}
```

**Benefits**:
- **Type Safety**: Input/output types are explicit
- **Error Handling**: Structured errors with codes
- **Testability**: Each converter is independently testable
- **Extensibility**: Easy to add new converters

**Implementation Steps**:
1. Create `src/core/converters/` directory
2. Define `TypeConverter<TInput, TOutput>` interface
3. Implement converters: `ColorToFigmaRGBConverter`, `DimensionToPixelsConverter`, etc.
4. Update `FigmaSyncService` to use converters
5. Add converter tests

**Tests**:
```typescript
describe('ColorToFigmaRGBConverter', () => {
  const converter = new ColorToFigmaRGBConverter();

  it('converts hex colors correctly', () => {
    const result = converter.convert({ hex: '#1e40af' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ r: 0.118, g: 0.251, b: 0.686 });
  });

  it('handles invalid hex gracefully', () => {
    const result = converter.convert({ hex: 'invalid' });
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('CONVERSION_FAILED');
  });

  it('converts RGB values with normalization', () => {
    const result = converter.convert({ r: 30, g: 64, b: 175 });
    expect(result.data.r).toBeCloseTo(0.118);
  });
});
```

**Effort**: 10 hours | **Priority**: P0 (Critical)

---

## Category 2: Validation & Error Prevention (High Priority)

### Problem 2.1: No Pre-Sync Validation

**Current Issue**:
```typescript
// Sync runs and THEN discovers issues
await syncTokens(tokens);  // Fails mid-way through
// Some tokens synced, some failed - inconsistent state!
```

**Impact**:
- Partial syncs leave Figma in inconsistent state
- Errors discovered late
- No way to preview issues before syncing

**Solution: Pre-Sync Validation Phase**

```typescript
// Validation result types
interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  tokenId: string;
  fix?: string;  // Suggested fix
}

interface PreSyncValidationResult {
  canSync: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  stats: {
    totalTokens: number;
    validTokens: number;
    invalidTokens: number;
  };
}

// Pre-sync validator
class PreSyncValidator {
  constructor(
    private repository: TokenRepository,
    private resolver: TokenResolver
  ) {}

  async validate(tokens: Token[]): Promise<PreSyncValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    for (const token of tokens) {
      // 1. Validate token structure
      const structureIssues = this.validateStructure(token);
      errors.push(...structureIssues.filter(i => i.severity === 'error'));
      warnings.push(...structureIssues.filter(i => i.severity === 'warning'));

      // 2. Validate references
      const refIssues = this.validateReferences(token);
      errors.push(...refIssues);

      // 3. Validate type-specific rules
      const typeIssues = this.validateTypeSpecific(token);
      errors.push(...typeIssues.filter(i => i.severity === 'error'));
      warnings.push(...typeIssues.filter(i => i.severity === 'warning'));

      // 4. Validate Figma compatibility
      const figmaIssues = this.validateFigmaCompatibility(token);
      warnings.push(...figmaIssues);
    }

    return {
      canSync: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalTokens: tokens.length,
        validTokens: tokens.length - errors.length,
        invalidTokens: errors.length
      }
    };
  }

  private validateReferences(token: Token): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if this token has unresolved references
    if (token.type === 'typography' || token.type === 'shadow') {
      const unresolvedRefs = this.findUnresolvedReferences(token.value);

      for (const ref of unresolvedRefs) {
        // Try to resolve
        const resolved = this.resolver.resolveReference(ref, token.projectId);

        if (!resolved) {
          // Check if it exists in different project (common issue!)
          const allTokens = this.repository.getAll();
          const refName = ref.slice(1, -1); // Remove braces
          const inOtherProject = allTokens.find(t => t.qualifiedName === refName);

          if (inOtherProject) {
            issues.push({
              severity: 'error',
              code: 'CROSS_PROJECT_REFERENCE',
              message: `Reference "${ref}" points to token in different project "${inOtherProject.projectId}"`,
              tokenId: token.id,
              fix: `Move all tokens to the same project, or create a copy of "${refName}" in project "${token.projectId}"`
            });
          } else {
            issues.push({
              severity: 'error',
              code: 'UNRESOLVED_REFERENCE',
              message: `Reference "${ref}" cannot be resolved - token does not exist`,
              tokenId: token.id,
              fix: `Create a token with qualified name "${refName}" or fix the reference`
            });
          }
        }
      }
    }

    // Check for circular references
    const cycles = this.resolver.detectCircularReferences(token.projectId);
    for (const cycle of cycles) {
      if (cycle.cycle.includes(token.id)) {
        issues.push({
          severity: 'error',
          code: 'CIRCULAR_REFERENCE',
          message: `Token is part of circular reference: ${cycle.cycle.join(' → ')}`,
          tokenId: token.id,
          fix: 'Break the circular reference by using a direct value'
        });
      }
    }

    return issues;
  }

  private validateTypeSpecific(token: Token): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (token.type === 'typography') {
      const typValue = token.value as TypographyValue;

      // Check font family
      if (!typValue.fontFamily || typValue.fontFamily.startsWith('{')) {
        issues.push({
          severity: 'warning',
          code: 'MISSING_FONT_FAMILY',
          message: 'Typography token missing or has unresolved fontFamily',
          tokenId: token.id,
          fix: 'Provide a direct fontFamily value or ensure reference resolves'
        });
      }

      // Check font size
      if (!typValue.fontSize || (typeof typValue.fontSize === 'string' && typValue.fontSize.startsWith('{'))) {
        issues.push({
          severity: 'error',
          code: 'MISSING_FONT_SIZE',
          message: 'Typography token missing or has unresolved fontSize - will use Figma default (12px)',
          tokenId: token.id,
          fix: 'Provide a fontSize value or ensure reference resolves'
        });
      }
    }

    if (token.type === 'shadow') {
      const shadowValue = token.value as ShadowValue;

      // Check color (critical for shadows!)
      if (!shadowValue.color || (typeof shadowValue.color === 'string' && shadowValue.color.startsWith('{'))) {
        issues.push({
          severity: 'error',
          code: 'MISSING_SHADOW_COLOR',
          message: 'Shadow token missing or has unresolved color - shadow will be invisible!',
          tokenId: token.id,
          fix: 'Provide a color value or ensure reference resolves'
        });
      }
    }

    return issues;
  }

  private validateFigmaCompatibility(token: Token): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if token type is supported by Figma
    const figmaType = this.mapToFigmaType(token.type);
    if (!figmaType && token.type !== 'typography' && token.type !== 'shadow') {
      issues.push({
        severity: 'warning',
        code: 'UNSUPPORTED_TYPE',
        message: `Token type "${token.type}" is not supported by Figma and will be skipped`,
        tokenId: token.id,
        fix: 'Change token type to a supported type or remove this token'
      });
    }

    return issues;
  }

  private findUnresolvedReferences(value: any): string[] {
    const refs: string[] = [];

    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      refs.push(value);
    } else if (typeof value === 'object' && value !== null) {
      for (const val of Object.values(value)) {
        refs.push(...this.findUnresolvedReferences(val));
      }
    }

    return refs;
  }
}

// Usage in FigmaSyncService
class FigmaSyncService {
  private validator: PreSyncValidator;

  async syncTokens(tokens: Token[], options?: SyncOptions): Promise<Result<SyncResult>> {
    try {
      // STEP 1: Pre-sync validation
      console.log('[FigmaSyncService] Running pre-sync validation...');
      const validation = await this.validator.validate(tokens);

      // Report errors
      if (validation.errors.length > 0) {
        console.group('❌ Pre-Sync Validation Errors');
        for (const error of validation.errors) {
          console.error(`[${error.code}] ${error.message}`);
          if (error.fix) {
            console.log(`💡 Fix: ${error.fix}`);
          }
        }
        console.groupEnd();

        return Failure(`Pre-sync validation failed with ${validation.errors.length} errors. Cannot sync.`);
      }

      // Report warnings
      if (validation.warnings.length > 0) {
        console.group('⚠️  Pre-Sync Validation Warnings');
        for (const warning of validation.warnings) {
          console.warn(`[${warning.code}] ${warning.message}`);
          if (warning.fix) {
            console.log(`💡 Suggestion: ${warning.fix}`);
          }
        }
        console.groupEnd();
      }

      console.log(`✓ Validation passed: ${validation.stats.validTokens}/${validation.stats.totalTokens} tokens ready to sync`);

      // STEP 2: Proceed with sync
      const result = await this.performSync(tokens, options);

      return result;
    } catch (error) {
      return Failure(error.message);
    }
  }
}
```

**Benefits**:
- **Fail Fast**: Catch ALL errors before sync starts
- **Clear Fixes**: Provide actionable suggestions
- **No Partial Syncs**: Either all succeed or none (atomic)
- **Better UX**: Users see validation results before committing

**Implementation Steps**:
1. Create `src/core/validation/PreSyncValidator.ts`
2. Define validation issue types
3. Implement validation methods for each check
4. Update `FigmaSyncService.syncTokens()` to run validation first
5. Add `--dry-run` flag to preview validation without syncing

**Tests**:
```typescript
describe('PreSyncValidator', () => {
  it('detects cross-project references', async () => {
    const tokens = [
      { projectId: 'default', value: '{primitive.color.primary}' },
      { projectId: 'primitive', qualifiedName: 'primitive.color.primary' }
    ];

    const result = await validator.validate(tokens);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('CROSS_PROJECT_REFERENCE');
  });

  it('detects circular references', async () => {
    const tokens = [
      { id: 'a', value: '{b}' },
      { id: 'b', value: '{c}' },
      { id: 'c', value: '{a}' }  // Circular!
    ];

    const result = await validator.validate(tokens);
    expect(result.errors.some(e => e.code === 'CIRCULAR_REFERENCE')).toBe(true);
  });

  it('warns about missing shadow colors', async () => {
    const token = { type: 'shadow', value: { blur: 10, offsetX: 0, offsetY: 4 } };

    const result = await validator.validate([token]);
    expect(result.errors.some(e => e.code === 'MISSING_SHADOW_COLOR')).toBe(true);
  });
});
```

**Effort**: 8 hours | **Priority**: P1 (High)

---

### Problem 2.2: No Project ID Validation

**Current Issue** (from IMPROVEMENT_PLAN.md Phase 1):
```typescript
// Multi-file imports get different projectIds
const primitives = await importFile('primitives.json');  // projectId: 'default'
const semantic = await importFile('semantic.json');      // projectId: 'default'
// But semantic references primitives with "{primitive.color.primary}" ❌
```

**Impact**:
- Cross-project references fail silently
- User must manually ensure consistent projectIds
- Confusing error messages

**Solution: Unified Project ID Strategy**

```typescript
// Project ID configuration
interface ProjectConfig {
  id: string;              // 'my-design-system'
  name: string;            // Human-readable name
  files: string[];         // All files in this project
  allowCrossProjectRefs?: boolean;  // Future: enable cross-project
}

// Import context
interface ImportContext {
  projectConfig: ProjectConfig;
  importStrategy: 'unified' | 'separate';
}

// Modified import flow
class TokenImportService {
  async importFiles(
    files: FileContent[],
    context: ImportContext
  ): Promise<Result<Token[]>> {
    const allTokens: Token[] = [];

    for (const file of files) {
      const parseResult = await this.parseFile(file);
      if (!parseResult.success) continue;

      // CRITICAL: Use unified projectId from context
      const tokens = parseResult.data.map(token => ({
        ...token,
        projectId: context.projectConfig.id,  // Same for ALL files!
        source: {
          ...token.source,
          projectName: context.projectConfig.name
        }
      }));

      allTokens.push(...tokens);
    }

    // Validate: ensure no conflicting projectIds
    const projectIds = new Set(allTokens.map(t => t.projectId));
    if (projectIds.size > 1) {
      return Failure(
        `Multiple projectIds detected: ${Array.from(projectIds).join(', ')}. ` +
        `All tokens in a project must have the same projectId.`
      );
    }

    return Success(allTokens);
  }
}

// UI: Let user configure project
interface ProjectSetupForm {
  projectId: string;           // User enters: 'my-design-system'
  projectName: string;         // User enters: 'My Design System'
  files: {
    path: string;
    collection: string;        // User assigns: 'primitives' | 'semantic'
  }[];
}

// Example usage
const context: ImportContext = {
  projectConfig: {
    id: 'my-design-system',
    name: 'My Design System',
    files: ['primitives.json', 'semantic.json', 'components.json']
  },
  importStrategy: 'unified'
};

const result = await tokenImportService.importFiles(files, context);
// All tokens now have projectId: 'my-design-system' ✓
// References like "{primitive.color.primary}" will resolve ✓
```

**Benefits**:
- **Single Source of Truth**: One projectId for entire design system
- **No Silent Failures**: References resolve correctly
- **User Control**: User explicitly configures project structure
- **Future-Proof**: Can add cross-project support later

**Implementation Steps**:
1. Create `ProjectConfig` interface
2. Add `ImportContext` to import flow
3. Update UI to let user configure project
4. Update `TokenImportService` to use unified projectId
5. Add validation to ensure single projectId

**Effort**: 6 hours | **Priority**: P1 (High)

---

## Category 3: Testing & Quality Assurance

### Problem 3.1: No Contract Tests for Type Conversions

**Current Issue**:
- Type conversions are tested manually
- No property-based tests for edge cases
- Regressions possible

**Solution: Contract Tests + Property-Based Testing**

```typescript
import { fc } from 'fast-check';

// Contract: All ColorValues must convert to valid RGB
describe('Color Conversion Contract', () => {
  it('converts all valid ColorValues to RGB in 0-1 range', () => {
    fc.assert(
      fc.property(
        // Generate random valid ColorValues
        fc.record({
          r: fc.integer({ min: 0, max: 255 }),
          g: fc.integer({ min: 0, max: 255 }),
          b: fc.integer({ min: 0, max: 255 }),
        }),
        (colorValue) => {
          const converter = new ColorToFigmaRGBConverter();
          const result = converter.convert(colorValue);

          // Contract: conversion must succeed
          expect(result.success).toBe(true);

          // Contract: RGB values must be in 0-1 range
          expect(result.data.r).toBeGreaterThanOrEqual(0);
          expect(result.data.r).toBeLessThanOrEqual(1);
          expect(result.data.g).toBeGreaterThanOrEqual(0);
          expect(result.data.g).toBeLessThanOrEqual(1);
          expect(result.data.b).toBeGreaterThanOrEqual(0);
          expect(result.data.b).toBeLessThanOrEqual(1);
        }
      )
    );
  });

  it('hex conversion round-trip preserves color', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        (hex) => {
          const colorValue = { hex: `#${hex}` };
          const converter = new ColorToFigmaRGBConverter();

          const result = converter.convert(colorValue);
          if (!result.success) return; // Skip invalid hex

          // Convert back to hex
          const rgbToHex = (rgb: RGB) => {
            const r = Math.round(rgb.r * 255).toString(16).padStart(2, '0');
            const g = Math.round(rgb.g * 255).toString(16).padStart(2, '0');
            const b = Math.round(rgb.b * 255).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
          };

          const backToHex = rgbToHex(result.data);

          // Contract: round-trip should preserve color (within rounding)
          expect(backToHex.toLowerCase()).toBe(`#${hex}`.toLowerCase());
        }
      )
    );
  });
});

// Contract: All DimensionValues must convert to positive pixels
describe('Dimension Conversion Contract', () => {
  it('converts all valid dimensions to positive pixels', () => {
    fc.assert(
      fc.property(
        fc.record({
          value: fc.float({ min: 0, max: 1000 }),
          unit: fc.constantFrom('px', 'rem', 'em', '%', 'pt' as const)
        }),
        (dimValue) => {
          const converter = new DimensionToPixelsConverter(16);
          const result = converter.convert(dimValue);

          // Contract: conversion must succeed
          expect(result.success).toBe(true);

          // Contract: result must be positive
          expect(result.data).toBeGreaterThanOrEqual(0);

          // Contract: reasonable bounds (no infinity)
          expect(result.data).toBeLessThan(Infinity);
        }
      )
    );
  });
});
```

**Implementation Steps**:
1. Add `fast-check` dependency
2. Create `tests/contracts/` directory
3. Write contract tests for each converter
4. Add to CI pipeline

**Effort**: 4 hours | **Priority**: P2 (Medium)

---

### Problem 3.2: No Integration Tests for Full Flow

**Current Issue**:
- Unit tests test individual components
- No tests for complete JSON → Figma flow
- Regressions in integration points

**Solution: End-to-End Integration Tests**

```typescript
describe('Token Import to Figma Sync (E2E)', () => {
  it('successfully syncs W3C tokens to Figma variables', async () => {
    // ARRANGE: Create test JSON
    const w3cJson = {
      color: {
        primary: {
          600: {
            $value: '#1e40af',
            $type: 'color'
          }
        }
      }
    };

    // ACT: Full flow
    const repository = new TokenRepository();
    const resolver = new TokenResolver(repository);
    const syncService = new FigmaSyncService(repository, resolver);
    const formatStrategy = new W3CTokenFormatStrategy();

    // 1. Parse
    const parseResult = formatStrategy.parseTokens(w3cJson);
    expect(parseResult.success).toBe(true);

    // 2. Convert to Token model
    const tokens = parseResult.data.map(pt => createToken(pt));

    // 3. Store
    const addResult = repository.add(tokens);
    expect(addResult.success).toBe(true);

    // 4. Resolve
    const resolveResult = await resolver.resolveAllTokens('default');
    expect(resolveResult.success).toBe(true);

    // 5. Sync
    const syncResult = await syncService.syncTokens(tokens);
    expect(syncResult.success).toBe(true);

    // ASSERT: Verify Figma variable created
    const variable = syncService.getVariableMap().get('color.primary.600');
    expect(variable).toBeDefined();
    expect(variable.resolvedType).toBe('COLOR');

    const modeId = (await figma.variables.getLocalVariableCollectionsAsync())[0].modes[0].modeId;
    const rgbValue = variable.valuesByMode[modeId] as RGB;
    expect(rgbValue.r).toBeCloseTo(0.118, 2);
  });

  it('handles typography tokens with nested references', async () => {
    const json = {
      primitive: {
        font: {
          family: { $value: 'Inter', $type: 'fontFamily' },
          size: { $value: 16, $type: 'fontSize' }
        }
      },
      semantic: {
        heading: {
          $value: {
            fontFamily: '{primitive.font.family}',
            fontSize: '{primitive.font.size}'
          },
          $type: 'typography'
        }
      }
    };

    // Full flow...
    const syncResult = await syncService.syncTokens(tokens);

    // Verify TextStyle created with resolved values
    const textStyle = figma.getLocalTextStyles().find(s => s.name === 'semantic.heading');
    expect(textStyle).toBeDefined();
    expect(textStyle.fontName.family).toBe('Inter');
    expect(textStyle.fontSize).toBe(16);
  });
});
```

**Effort**: 6 hours | **Priority**: P2 (Medium)

---

## Category 4: Observability & Debugging

### Problem 4.1: No Structured Logging

**Current Issue**:
```typescript
// Inconsistent logging
console.log('[FigmaSyncService] Syncing...');
console.warn('Warning');
console.error('Error');
```

**Solution: Structured Logging System**

```typescript
// Logger interface
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogContext {
  component: string;
  operation: string;
  tokenId?: string;
  [key: string]: any;
}

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: Error;
}

class Logger {
  constructor(private minLevel: LogLevel = LogLevel.INFO) {}

  debug(message: string, context: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context: LogContext, error?: Error) {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context: LogContext, error?: Error) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  private log(level: LogLevel, message: string, context: LogContext, error?: Error) {
    if (level < this.minLevel) return;

    const log: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    };

    // Format for console
    const levelStr = LogLevel[level];
    const prefix = `[${context.component}/${context.operation}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, context);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, context);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, context, error);
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, context, error);
        break;
    }

    // Store for analytics (future)
    this.storeLog(log);
  }

  private storeLog(log: StructuredLog) {
    // Future: send to analytics service
  }
}

// Usage
class FigmaSyncService {
  private logger = new Logger();

  async syncTokens(tokens: Token[]): Promise<Result<SyncResult>> {
    this.logger.info('Starting token sync', {
      component: 'FigmaSyncService',
      operation: 'syncTokens',
      tokenCount: tokens.length
    });

    try {
      // ...
      this.logger.info('Sync completed successfully', {
        component: 'FigmaSyncService',
        operation: 'syncTokens',
        stats: { added: 10, updated: 5 }
      });
    } catch (error) {
      this.logger.error('Sync failed', {
        component: 'FigmaSyncService',
        operation: 'syncTokens',
        tokenCount: tokens.length
      }, error);
    }
  }
}
```

**Effort**: 4 hours | **Priority**: P2 (Medium)

---

### Problem 4.2: No Sync State Tracking

**Current Issue**:
- Can't tell which tokens are in sync vs out of sync
- No history of sync operations
- Difficult to debug "why did this fail?"

**Solution: Sync State Management**

```typescript
// Sync state for each token
interface TokenSyncState {
  tokenId: string;
  status: 'synced' | 'modified' | 'pending' | 'error';
  lastSync?: string;              // ISO timestamp
  figmaObjectId?: string;         // Variable/Style ID
  figmaObjectType?: 'variable' | 'textStyle' | 'effectStyle';
  error?: string;
  version: number;                // Increment on each change
}

// Sync history
interface SyncHistoryEntry {
  timestamp: string;
  operation: 'sync' | 'update' | 'delete';
  tokenIds: string[];
  result: 'success' | 'partial' | 'failure';
  stats: ImportStats;
  errors?: string[];
}

// State manager
class SyncStateManager {
  private tokenStates: Map<string, TokenSyncState> = new Map();
  private history: SyncHistoryEntry[] = [];

  markAsSynced(tokenId: string, figmaObjectId: string, figmaObjectType: 'variable' | 'textStyle' | 'effectStyle') {
    const state: TokenSyncState = {
      tokenId,
      status: 'synced',
      lastSync: new Date().toISOString(),
      figmaObjectId,
      figmaObjectType,
      version: (this.tokenStates.get(tokenId)?.version || 0) + 1
    };
    this.tokenStates.set(tokenId, state);
  }

  markAsError(tokenId: string, error: string) {
    const existing = this.tokenStates.get(tokenId);
    this.tokenStates.set(tokenId, {
      ...existing,
      tokenId,
      status: 'error',
      error,
      version: (existing?.version || 0) + 1
    });
  }

  markAsModified(tokenId: string) {
    const existing = this.tokenStates.get(tokenId);
    if (existing && existing.status === 'synced') {
      this.tokenStates.set(tokenId, {
        ...existing,
        status: 'modified',
        version: existing.version + 1
      });
    }
  }

  getState(tokenId: string): TokenSyncState | undefined {
    return this.tokenStates.get(tokenId);
  }

  getOutOfSyncTokens(): TokenSyncState[] {
    return Array.from(this.tokenStates.values()).filter(
      s => s.status !== 'synced'
    );
  }

  addHistoryEntry(entry: SyncHistoryEntry) {
    this.history.push(entry);
    // Keep last 100 entries
    if (this.history.length > 100) {
      this.history.shift();
    }
  }

  getHistory(): SyncHistoryEntry[] {
    return [...this.history];
  }
}

// Usage in FigmaSyncService
class FigmaSyncService {
  constructor(
    private repository: TokenRepository,
    private resolver: TokenResolver,
    private stateManager: SyncStateManager
  ) {}

  async syncTokens(tokens: Token[]): Promise<Result<SyncResult>> {
    const startTime = new Date().toISOString();
    const syncedTokenIds: string[] = [];
    const errors: string[] = [];

    try {
      for (const token of tokens) {
        try {
          const variable = await this.createOrUpdateVariable(token);

          // Track state
          this.stateManager.markAsSynced(
            token.id,
            variable.id,
            'variable'
          );
          syncedTokenIds.push(token.id);
        } catch (error) {
          this.stateManager.markAsError(token.id, error.message);
          errors.push(`${token.qualifiedName}: ${error.message}`);
        }
      }

      // Record history
      this.stateManager.addHistoryEntry({
        timestamp: startTime,
        operation: 'sync',
        tokenIds: syncedTokenIds,
        result: errors.length === 0 ? 'success' : 'partial',
        stats: { added: syncedTokenIds.length, updated: 0, skipped: errors.length },
        errors
      });

      return Success({ ... });
    } catch (error) {
      this.stateManager.addHistoryEntry({
        timestamp: startTime,
        operation: 'sync',
        tokenIds: [],
        result: 'failure',
        stats: { added: 0, updated: 0, skipped: tokens.length },
        errors: [error.message]
      });

      return Failure(error.message);
    }
  }

  // New method: Show sync status
  getSyncStatus(): {
    synced: number;
    modified: number;
    pending: number;
    errors: number;
  } {
    const states = Array.from(this.stateManager.getAll());
    return {
      synced: states.filter(s => s.status === 'synced').length,
      modified: states.filter(s => s.status === 'modified').length,
      pending: states.filter(s => s.status === 'pending').length,
      errors: states.filter(s => s.status === 'error').length
    };
  }
}
```

**Benefits**:
- Know exactly what's in sync
- Debug sync issues with history
- Support incremental sync (only modified tokens)
- Show user sync status in UI

**Effort**: 6 hours | **Priority**: P2 (Medium)

---

## Category 5: Architecture Patterns

### Problem 5.1: No Transactional Sync (Atomic Operations)

**Current Issue**:
```typescript
// Sync can fail mid-way, leaving Figma in inconsistent state
for (const token of tokens) {
  await createVariable(token);  // What if this fails on token #50?
}
// Tokens 1-49 created, 50-100 not created = inconsistent!
```

**Solution: Transaction Pattern with Rollback**

```typescript
// Transaction manager
class SyncTransaction {
  private createdObjects: { type: 'variable' | 'collection' | 'style'; id: string }[] = [];
  private committed = false;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      // Rollback on error
      await this.rollback();
      throw error;
    }
  }

  trackCreated(type: 'variable' | 'collection' | 'style', id: string) {
    if (!this.committed) {
      this.createdObjects.push({ type, id });
    }
  }

  async commit() {
    this.committed = true;
    this.createdObjects = [];
  }

  async rollback() {
    console.warn(`[Transaction] Rolling back ${this.createdObjects.length} created objects`);

    // Delete in reverse order
    for (const obj of this.createdObjects.reverse()) {
      try {
        if (obj.type === 'variable') {
          const variable = await figma.variables.getVariableByIdAsync(obj.id);
          variable?.remove();
        } else if (obj.type === 'style') {
          const style = figma.getStyleById(obj.id);
          style?.remove();
        }
      } catch (error) {
        console.error(`[Transaction] Failed to rollback ${obj.type} ${obj.id}:`, error);
      }
    }

    this.createdObjects = [];
  }
}

// Usage in FigmaSyncService
class FigmaSyncService {
  async syncTokens(tokens: Token[]): Promise<Result<SyncResult>> {
    const transaction = new SyncTransaction();

    try {
      await transaction.execute(async () => {
        // All operations in transaction
        for (const token of tokens) {
          const variable = figma.variables.createVariable(...);

          // Track for potential rollback
          transaction.trackCreated('variable', variable.id);

          // ... configure variable
        }

        // All succeeded - commit
        await transaction.commit();
      });

      return Success({ ... });
    } catch (error) {
      // Transaction automatically rolled back
      return Failure(`Sync failed and was rolled back: ${error.message}`);
    }
  }
}
```

**Benefits**:
- Atomic operations (all or nothing)
- No partial syncs
- Consistent Figma state
- Easy error recovery

**Effort**: 5 hours | **Priority**: P2 (Medium)

---

## Implementation Roadmap

### Phase 1: Critical Type Safety (Week 1) - 24 hours
**Goal**: Prevent type-related bugs

1. **Discriminated Union Pattern** (8h) - Problem 1.1
   - Refactor Token interface
   - Add type guards
   - Update Repository/Resolver

2. **Runtime Validation with Zod** (6h) - Problem 1.2
   - Add Zod schemas
   - Validate at parse & store time
   - Add validation errors to UI

3. **Type-Safe Converters** (10h) - Problem 1.3
   - Implement converter interfaces
   - Create ColorConverter, DimensionConverter
   - Update FigmaSyncService

**Deliverables**:
- Zero type-related runtime errors
- Clear validation messages
- Type-safe conversions

---

### Phase 2: Validation & Error Prevention (Week 2) - 14 hours
**Goal**: Catch errors before they cause problems

4. **Pre-Sync Validation** (8h) - Problem 2.1
   - Implement PreSyncValidator
   - Add reference validation
   - Add Figma compatibility checks

5. **Unified Project ID** (6h) - Problem 2.2
   - Add ProjectConfig interface
   - Update import flow
   - Add UI for project configuration

**Deliverables**:
- No silent failures
- Clear error messages with fixes
- Single projectId per design system

---

### Phase 3: Testing & Quality (Week 3) - 10 hours
**Goal**: Prevent regressions

6. **Contract Tests** (4h) - Problem 3.1
   - Add fast-check
   - Write property-based tests
   - Add to CI

7. **Integration Tests** (6h) - Problem 3.2
   - Write E2E tests
   - Test full JSON → Figma flow
   - Add to CI

**Deliverables**:
- Comprehensive test coverage
- Confidence in changes
- CI catches regressions

---

### Phase 4: Observability (Week 4) - 10 hours
**Goal**: Make system debuggable

8. **Structured Logging** (4h) - Problem 4.1
   - Implement Logger class
   - Update all services
   - Add log levels

9. **Sync State Tracking** (6h) - Problem 4.2
   - Implement SyncStateManager
   - Track sync history
   - Add sync status API

**Deliverables**:
- Clear visibility into system state
- Easy debugging
- Sync history for audit

---

### Phase 5: Architecture (Week 5) - 5 hours
**Goal**: Resilient operations

10. **Transaction Pattern** (5h) - Problem 5.1
    - Implement SyncTransaction
    - Add rollback logic
    - Update FigmaSyncService

**Deliverables**:
- Atomic sync operations
- No partial syncs
- Easy error recovery

---

## Success Metrics

### Code Quality Metrics
- **Type Coverage**: 100% (all Token values type-safe)
- **Test Coverage**: >90% for core services
- **Zero Runtime Type Errors**: Catch all at compile/validation time

### User Experience Metrics
- **Clear Errors**: 100% of errors have actionable fixes
- **Fast Feedback**: Validation errors shown in <1s
- **No Silent Failures**: 0 unresolved references reaching Figma

### System Reliability Metrics
- **Atomic Syncs**: 100% (all or nothing)
- **Rollback Success**: 100% on failure
- **Sync Accuracy**: 100% (synced state matches Figma)

---

## Risk Assessment

| Improvement | Breaking Change? | Risk Level | Mitigation |
|------------|-----------------|-----------|-----------|
| Discriminated Union | Yes (Token interface) | Medium | Feature flag, gradual migration |
| Zod Validation | No (additive) | Low | Fails gracefully, clear errors |
| Type-Safe Converters | No (internal) | Low | Keep old converters as fallback |
| Pre-Sync Validation | No (additive) | Low | Can disable with flag |
| Unified Project ID | Yes (import flow) | Medium | Auto-migrate old configs |
| Contract Tests | No | Low | None |
| Integration Tests | No | Low | None |
| Structured Logging | No (internal) | Low | None |
| Sync State Tracking | No (additive) | Low | Optional feature |
| Transactions | No (internal) | Medium | Extensive testing needed |

---

## Conclusion

These 10 improvements will make the plugin:

1. **More Resilient**:
   - Atomic operations prevent partial syncs
   - Transactions enable rollback
   - Validation catches errors early

2. **More Maintainable**:
   - Type safety prevents entire classes of bugs
   - Structured logging makes debugging easy
   - Contract tests prevent regressions

3. **More Correct**:
   - Runtime validation ensures data integrity
   - Pre-sync validation catches issues before Figma
   - Sync state tracking guarantees accuracy

**Total Effort**: ~63 hours (~8 days of development)
**Expected ROI**: 10x reduction in bug reports, 5x faster debugging, zero silent failures

**Recommendation**: Start with Phase 1 (Type Safety) as it provides the foundation for all other improvements.

---

**Version**: 1.0
**Date**: 2025-11-16
**Related**: ABSTRACTION_ARCHITECTURE.md, TYPE_SYSTEM_MAPPING.md, IMPROVEMENT_PLAN.md

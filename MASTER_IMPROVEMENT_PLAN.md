# Master Improvement Plan: Figma Tokens Reader

**Version**: 2.0
**Date**: 2025-11-16
**Status**: Ready for Implementation
**Branch**: `claude/fix-figma-sync-01LpNaUoQzF6uvjYA1DLUwLX`

---

## Table of Contents

1. [Product Specifications](#1-product-specifications)
2. [Technical Specifications](#2-technical-specifications)
3. [Implementation Plan](#3-implementation-plan)
4. [Acceptance Criteria](#4-acceptance-criteria)
5. [Testing Strategy](#5-testing-strategy)
6. [Risk Management](#6-risk-management)

---

# 1. Product Specifications

## 1.1 Problem Statement

### Current Issues

**Primary Problem**: Users report that typography tokens sync to Figma showing incorrect values (12px font size, AUTO line height) instead of the actual values defined in their token files. Shadow tokens render invisible due to missing color values.

**Impact**:
- Designers cannot trust synced typography styles
- Shadow effects are invisible in Figma
- Manual fixes required after every sync
- Loss of confidence in the plugin

**Root Cause**: Token references across different project IDs fail to resolve. When semantic tokens (projectId: "default") reference primitive tokens (projectId: "primitive"), the resolver cannot find the referenced tokens, leaving unresolved reference strings like `"{primitive.font.size.20}"` which Figma cannot parse.

### User Stories

**US-1**: As a designer, I want typography tokens to sync with correct font sizes and line heights so that I don't have to manually fix styles in Figma.

**US-2**: As a designer, I want shadow tokens to include their colors so that effects are visible in Figma.

**US-3**: As a design system maintainer, I want clear error messages with actionable fixes when tokens fail to sync so that I can quickly resolve issues.

**US-4**: As a developer, I want type-safe token handling so that I can confidently add new token types without breaking existing functionality.

**US-5**: As a design system team, I want atomic sync operations so that Figma is never left in an inconsistent state.

## 1.2 Solution Overview

### High-Level Features

#### Feature 1: Unified Project ID System
**What**: All token files import into a single, user-configured project.
**Why**: Enables cross-file references to resolve correctly.
**User Benefit**: Typography and shadow tokens work correctly without manual intervention.

#### Feature 2: Pre-Sync Validation
**What**: Comprehensive validation before any Figma objects are created.
**Why**: Catches all errors upfront before partial sync can occur.
**User Benefit**: Clear list of issues with suggested fixes, no inconsistent Figma state.

#### Feature 3: Type-Safe Token System
**What**: Compile-time and runtime type validation for all token operations.
**Why**: Prevents type mismatches that cause silent failures.
**User Benefit**: Reliable sync, fewer mysterious bugs.

#### Feature 4: Transactional Sync
**What**: All-or-nothing sync with automatic rollback on failure.
**Why**: Prevents partial syncs that leave Figma in inconsistent state.
**User Benefit**: Either sync succeeds completely or nothing changes.

#### Feature 5: Sync State Management
**What**: Track sync status for each token (synced, modified, pending, error).
**Why**: Users need visibility into what's in sync vs out of sync.
**User Benefit**: Know exactly what needs to be re-synced.

## 1.3 Success Metrics

### User-Facing Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Typography sync accuracy | ~60% | 100% | % of typography tokens with correct values |
| Shadow sync accuracy | ~40% | 100% | % of shadow tokens with visible colors |
| Errors with actionable fixes | 0% | 100% | % of errors that include fix suggestion |
| Time to identify sync issue | ~30 min | <1 min | Average time from error to root cause |
| Partial sync occurrences | ~20% of syncs | 0% | % of syncs that leave Figma inconsistent |
| User-reported bugs | Baseline | -90% | Monthly bug reports |

### Technical Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Type safety coverage | ~40% | 100% |
| Runtime validation coverage | 0% | 100% |
| Test coverage | ~70% | >90% |
| Reference resolution success rate | ~60% | 100% |
| Transaction rollback success | N/A | 100% |

---

# 2. Technical Specifications

## 2.1 Architecture Changes

### Current Architecture (3 Layers)

```
┌─────────────────────────────────────────────────┐
│ Layer 0: Input (JSON files)                     │
│   - W3C format: { "$value": "...", "$type": ... }│
│   - Style Dictionary format                      │
├─────────────────────────────────────────────────┤
│ Layer 1: Parse (ITokenFormatStrategy)           │
│   - W3CTokenFormatStrategy                       │
│   - StyleDictionaryFormatStrategy                │
│   - Output: ProcessedToken[]                     │
├─────────────────────────────────────────────────┤
│ Layer 2: Token Model (Universal)                │
│   - Token interface (25 fields)                  │
│   - TokenRepository (5 indexes)                  │
│   - TokenResolver (3-tier cache)                 │
│   - PROJECT-SCOPED RESOLUTION ← ISSUE            │
├─────────────────────────────────────────────────┤
│ Layer 3: Translation (FigmaSyncService)         │
│   - Type mapping (TokenType → Figma type)        │
│   - Value conversion (ColorValue → RGB, etc)     │
│   - Nested reference resolution                  │
├─────────────────────────────────────────────────┤
│ Layer 4: Figma API                               │
│   - Variables (simple types)                     │
│   - TextStyles (typography)                      │
│   - EffectStyles (shadows)                       │
└─────────────────────────────────────────────────┘
```

### New Architecture (Enhanced)

```
┌─────────────────────────────────────────────────┐
│ Layer 0: Input (JSON files)                     │
│   + ImportContext (project config)               │
├─────────────────────────────────────────────────┤
│ Layer 1: Parse                                   │
│   + Runtime validation (Zod schemas)             │
│   + Validation error collection                  │
├─────────────────────────────────────────────────┤
│ Layer 2: Token Model                            │
│   + Discriminated union types                    │
│   + Unified project ID strategy                  │
│   + Cross-project reference support              │
│   + Type-safe converters                         │
├─────────────────────────────────────────────────┤
│ Layer 2.5: Validation (NEW)                     │
│   + PreSyncValidator                             │
│   + Reference validation                         │
│   + Type-specific validation                     │
│   + Figma compatibility checks                   │
├─────────────────────────────────────────────────┤
│ Layer 3: Translation                             │
│   + Structured error handling                    │
│   + Type-safe converters                         │
│   + Transaction management                       │
│   + Sync state tracking                          │
├─────────────────────────────────────────────────┤
│ Layer 4: Figma API                               │
│   + Rollback support                             │
│   + Sync history tracking                        │
└─────────────────────────────────────────────────┘
```

## 2.2 Type System Changes

### 2.2.1 Discriminated Union for Token

**Current** (Weak typing):
```typescript
interface Token {
  type: TokenType;      // 'color' | 'dimension' | ...
  value: TokenValue;    // string | number | ColorValue | ... (any!)
  resolvedValue?: TokenValue;
}
```

**New** (Strict typing):
```typescript
// Base properties shared by all tokens
interface TokenBase {
  id: string;
  path: string[];
  name: string;
  qualifiedName: string;
  projectId: string;
  collection: string;
  description?: string;
  sourceFormat: 'w3c' | 'style-dictionary' | 'figma' | 'custom';
  source: TokenSource;
  extensions: TokenExtensions;
  tags: string[];
  status: TokenStatus;
  created: string;
  lastModified: string;
  validation?: TokenValidation;
  aliasTo?: string;
  referencedBy?: string[];
  theme?: string;
  brand?: string;
  version?: string;
}

// Discriminated union - type determines value type
type Token = TokenBase & (
  | { type: 'color'; rawValue: any; value: ColorValue; resolvedValue?: ColorValue }
  | { type: 'dimension'; rawValue: any; value: DimensionValue; resolvedValue?: DimensionValue }
  | { type: 'fontSize'; rawValue: any; value: DimensionValue | number; resolvedValue?: DimensionValue | number }
  | { type: 'fontWeight'; rawValue: any; value: number | string; resolvedValue?: number | string }
  | { type: 'fontFamily'; rawValue: any; value: string; resolvedValue?: string }
  | { type: 'lineHeight'; rawValue: any; value: DimensionValue | number; resolvedValue?: DimensionValue | number }
  | { type: 'letterSpacing'; rawValue: any; value: DimensionValue | number; resolvedValue?: DimensionValue | number }
  | { type: 'spacing'; rawValue: any; value: DimensionValue; resolvedValue?: DimensionValue }
  | { type: 'shadow'; rawValue: any; value: ShadowValue; resolvedValue?: ShadowValue }
  | { type: 'border'; rawValue: any; value: any; resolvedValue?: any }
  | { type: 'duration'; rawValue: any; value: number | string; resolvedValue?: number | string }
  | { type: 'cubicBezier'; rawValue: any; value: CubicBezierValue; resolvedValue?: CubicBezierValue }
  | { type: 'number'; rawValue: any; value: number; resolvedValue?: number }
  | { type: 'string'; rawValue: any; value: string; resolvedValue?: string }
  | { type: 'typography'; rawValue: any; value: TypographyValue; resolvedValue?: TypographyValue }
  | { type: 'boolean'; rawValue: any; value: boolean; resolvedValue?: boolean }
  | { type: 'other'; rawValue: any; value: any; resolvedValue?: any }
);

// Type guards for narrowing
export function isColorToken(token: Token): token is TokenBase & { type: 'color'; value: ColorValue } {
  return token.type === 'color';
}

export function isTypographyToken(token: Token): token is TokenBase & { type: 'typography'; value: TypographyValue } {
  return token.type === 'typography';
}

export function isShadowToken(token: Token): token is TokenBase & { type: 'shadow'; value: ShadowValue } {
  return token.type === 'shadow';
}

// Usage - TypeScript enforces type-value matching
if (isColorToken(token)) {
  // token.value is guaranteed to be ColorValue
  const hex: string | undefined = token.value.hex;  // Type-safe!
}
```

### 2.2.2 Runtime Validation Schemas (Zod)

**File**: `src/core/validation/schemas.ts`

```typescript
import { z } from 'zod';

// Value schemas
export const ColorValueSchema = z.object({
  colorSpace: z.enum(['sRGB', 'display-p3', 'hsl', 'hsla', 'rgb', 'rgba']).optional(),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),
  r: z.number().min(0).max(255).optional(),
  g: z.number().min(0).max(255).optional(),
  b: z.number().min(0).max(255).optional(),
  a: z.number().min(0).max(1).optional(),
  h: z.number().min(0).max(360).optional(),
  s: z.number().min(0).max(100).optional(),
  l: z.number().min(0).max(100).optional(),
}).refine(
  data => data.hex || (data.r !== undefined && data.g !== undefined && data.b !== undefined) ||
          (data.h !== undefined && data.s !== undefined && data.l !== undefined),
  { message: 'Must provide either hex, rgb, or hsl values' }
);

export const DimensionValueSchema = z.object({
  value: z.number(),
  unit: z.enum(['px', 'rem', 'em', '%', 'pt'])
});

export const ShadowValueSchema = z.object({
  offsetX: z.union([z.number(), z.string()]),
  offsetY: z.union([z.number(), z.string()]),
  blur: z.union([z.number(), z.string()]),
  spread: z.union([z.number(), z.string()]).optional(),
  color: z.union([z.string(), ColorValueSchema]),
  inset: z.boolean().optional()
});

export const TypographyValueSchema = z.object({
  fontFamily: z.union([z.string(), z.string().regex(/^\{.*\}$/)]).optional(),
  fontSize: z.union([z.number(), z.string(), DimensionValueSchema]).optional(),
  fontWeight: z.union([z.number(), z.string()]).optional(),
  lineHeight: z.union([z.number(), z.string(), DimensionValueSchema]).optional(),
  letterSpacing: z.union([z.number(), z.string(), DimensionValueSchema]).optional()
});

export const CubicBezierValueSchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number()
});

// Token base schema
const TokenBaseSchema = z.object({
  id: z.string(),
  path: z.array(z.string()).min(1),
  name: z.string(),
  qualifiedName: z.string(),
  projectId: z.string(),
  collection: z.string(),
  description: z.string().optional(),
  sourceFormat: z.enum(['w3c', 'style-dictionary', 'figma', 'custom']),
  source: z.any(), // TokenSource
  extensions: z.record(z.any()),
  tags: z.array(z.string()),
  status: z.enum(['active', 'deprecated', 'draft', 'archived']),
  created: z.string(),
  lastModified: z.string(),
  validation: z.any().optional(),
  aliasTo: z.string().optional(),
  referencedBy: z.array(z.string()).optional(),
  theme: z.string().optional(),
  brand: z.string().optional(),
  version: z.string().optional()
});

// Discriminated union schema
export const TokenSchema = z.discriminatedUnion('type', [
  TokenBaseSchema.extend({
    type: z.literal('color'),
    rawValue: z.any(),
    value: ColorValueSchema,
    resolvedValue: ColorValueSchema.optional()
  }),
  TokenBaseSchema.extend({
    type: z.literal('dimension'),
    rawValue: z.any(),
    value: DimensionValueSchema,
    resolvedValue: DimensionValueSchema.optional()
  }),
  TokenBaseSchema.extend({
    type: z.literal('typography'),
    rawValue: z.any(),
    value: TypographyValueSchema,
    resolvedValue: TypographyValueSchema.optional()
  }),
  TokenBaseSchema.extend({
    type: z.literal('shadow'),
    rawValue: z.any(),
    value: ShadowValueSchema,
    resolvedValue: ShadowValueSchema.optional()
  }),
  // ... more types
]);

// Validation helper
export function validateToken(token: unknown): Result<Token, z.ZodError> {
  const result = TokenSchema.safeParse(token);
  if (result.success) {
    return Success(result.data as Token);
  } else {
    return Failure(result.error);
  }
}
```

### 2.2.3 Type-Safe Converters

**File**: `src/core/converters/TypeConverter.ts`

```typescript
import { Result } from '../../shared/types';

// Conversion error type
export interface ConversionError {
  code: 'INVALID_INPUT' | 'UNSUPPORTED_FORMAT' | 'CONVERSION_FAILED';
  message: string;
  input: any;
  context?: Record<string, any>;
}

// Generic converter interface
export interface TypeConverter<TInput, TOutput> {
  /**
   * Validate that input matches expected type
   */
  validate(input: unknown): input is TInput;

  /**
   * Convert input to output with error handling
   */
  convert(input: TInput): Result<TOutput, ConversionError>;

  /**
   * Get converter name for logging
   */
  getName(): string;
}
```

**File**: `src/core/converters/ColorToFigmaRGBConverter.ts`

```typescript
import { TypeConverter, ConversionError } from './TypeConverter';
import { ColorValue } from '../models/Token';
import { ColorValueSchema } from '../validation/schemas';
import { Result, Success, Failure } from '../../shared/types';

export class ColorToFigmaRGBConverter implements TypeConverter<ColorValue, RGB> {
  getName(): string {
    return 'ColorToFigmaRGBConverter';
  }

  validate(input: unknown): input is ColorValue {
    return ColorValueSchema.safeParse(input).success;
  }

  convert(input: ColorValue): Result<RGB, ConversionError> {
    // Validate input
    if (!this.validate(input)) {
      return Failure({
        code: 'INVALID_INPUT',
        message: 'Input is not a valid ColorValue',
        input
      });
    }

    try {
      // Convert from hex
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

      // Convert from RGB (0-255 or 0-1)
      if (input.r !== undefined && input.g !== undefined && input.b !== undefined) {
        const normalize = (v: number) => v > 1 ? v / 255 : v;
        return Success({
          r: normalize(input.r),
          g: normalize(input.g),
          b: normalize(input.b)
        });
      }

      // Convert from HSL
      if (input.h !== undefined && input.s !== undefined && input.l !== undefined) {
        const rgb = this.hslToRGB(input.h, input.s, input.l);
        return Success(rgb);
      }

      return Failure({
        code: 'UNSUPPORTED_FORMAT',
        message: 'ColorValue must have hex, rgb, or hsl properties',
        input
      });
    } catch (error) {
      return Failure({
        code: 'CONVERSION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
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
      b: parseInt(result[3], 16) / 255
    };
  }

  private hslToRGB(h: number, s: number, l: number): RGB {
    // Normalize s and l from 0-100 to 0-1
    s = s / 100;
    l = l / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (h < 60) {
      r = c; g = x; b = 0;
    } else if (h < 120) {
      r = x; g = c; b = 0;
    } else if (h < 180) {
      r = 0; g = c; b = x;
    } else if (h < 240) {
      r = 0; g = x; b = c;
    } else if (h < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    return {
      r: r + m,
      g: g + m,
      b: b + m
    };
  }
}
```

**File**: `src/core/converters/DimensionToPixelsConverter.ts`

```typescript
import { TypeConverter, ConversionError } from './TypeConverter';
import { DimensionValue } from '../models/Token';
import { DimensionValueSchema } from '../validation/schemas';
import { Result, Success, Failure } from '../../shared/types';

export class DimensionToPixelsConverter implements TypeConverter<DimensionValue | number, number> {
  constructor(private baseSize: number = 16) {}

  getName(): string {
    return 'DimensionToPixelsConverter';
  }

  validate(input: unknown): input is DimensionValue | number {
    return typeof input === 'number' || DimensionValueSchema.safeParse(input).success;
  }

  convert(input: DimensionValue | number): Result<number, ConversionError> {
    if (!this.validate(input)) {
      return Failure({
        code: 'INVALID_INPUT',
        message: 'Input is not a valid DimensionValue or number',
        input
      });
    }

    try {
      // Already a number (assumed pixels)
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
        message: error instanceof Error ? error.message : 'Unknown error',
        input
      });
    }
  }
}
```

## 2.3 Project ID System

### 2.3.1 Project Configuration

**File**: `src/core/models/ProjectConfig.ts`

```typescript
export interface ProjectConfig {
  /**
   * Unique project identifier
   * All tokens imported with this config will have this projectId
   */
  id: string;

  /**
   * Human-readable project name
   */
  name: string;

  /**
   * Description of the project/design system
   */
  description?: string;

  /**
   * Files that belong to this project
   */
  files: ProjectFileConfig[];

  /**
   * Default collection name if not specified in file
   */
  defaultCollection?: string;

  /**
   * Allow cross-project references (future feature)
   * @default false
   */
  allowCrossProjectRefs?: boolean;

  /**
   * Created timestamp
   */
  created: string;

  /**
   * Last modified timestamp
   */
  lastModified: string;
}

export interface ProjectFileConfig {
  /**
   * File path or URL
   */
  path: string;

  /**
   * Collection name for tokens in this file
   * Overrides defaultCollection
   */
  collection?: string;

  /**
   * File format (auto-detected if not specified)
   */
  format?: 'w3c' | 'style-dictionary' | 'figma';

  /**
   * Whether this file is enabled for import
   */
  enabled: boolean;
}

export interface ImportContext {
  /**
   * Project configuration
   */
  projectConfig: ProjectConfig;

  /**
   * Import strategy
   */
  importStrategy: 'unified' | 'separate';

  /**
   * Base size for percentage calculations (px)
   */
  percentageBase?: number;
}
```

### 2.3.2 Unified Import Flow

**File**: `src/core/services/TokenImportService.ts`

```typescript
import { ProjectConfig, ImportContext, ProjectFileConfig } from '../models/ProjectConfig';
import { Token } from '../models/Token';
import { IFileSource } from '../interfaces/IFileSource';
import { ITokenFormatStrategy } from '../interfaces/ITokenFormatStrategy';
import { Result, Success, Failure } from '../../shared/types';

export class TokenImportService {
  constructor(
    private fileSource: IFileSource,
    private formatStrategies: ITokenFormatStrategy[]
  ) {}

  /**
   * Import tokens from multiple files with unified project ID
   */
  async importFiles(
    context: ImportContext
  ): Promise<Result<Token[]>> {
    try {
      const allTokens: Token[] = [];
      const { projectConfig } = context;

      console.log(`[TokenImportService] Importing project: ${projectConfig.name} (ID: ${projectConfig.id})`);

      // Import each file
      for (const fileConfig of projectConfig.files) {
        if (!fileConfig.enabled) {
          console.log(`[TokenImportService] Skipping disabled file: ${fileConfig.path}`);
          continue;
        }

        console.log(`[TokenImportService] Importing file: ${fileConfig.path}`);

        // Fetch file content
        const contentResult = await this.fileSource.fetchFileContent(
          { type: 'local', location: fileConfig.path },
          fileConfig.path
        );

        if (!contentResult.success) {
          return Failure(`Failed to fetch ${fileConfig.path}: ${contentResult.error}`);
        }

        // Detect format
        const strategy = this.detectFormat(contentResult.data, fileConfig.format);
        if (!strategy) {
          return Failure(`Could not detect format for ${fileConfig.path}`);
        }

        // Parse tokens
        const parseResult = strategy.parseTokens(contentResult.data);
        if (!parseResult.success) {
          return Failure(`Failed to parse ${fileConfig.path}: ${parseResult.error}`);
        }

        // Convert to Token model with UNIFIED projectId
        const tokens = parseResult.data.map(pt => this.processedTokenToToken(
          pt,
          projectConfig.id,  // ← CRITICAL: Same projectId for ALL files
          fileConfig.collection || projectConfig.defaultCollection || 'default',
          fileConfig.path
        ));

        allTokens.push(...tokens);
      }

      // Validate: Ensure all tokens have same projectId
      const projectIds = new Set(allTokens.map(t => t.projectId));
      if (projectIds.size > 1) {
        return Failure(
          `Multiple projectIds detected: ${Array.from(projectIds).join(', ')}. ` +
          `All tokens must have the same projectId.`
        );
      }

      console.log(`[TokenImportService] Successfully imported ${allTokens.length} tokens`);

      return Success(allTokens);
    } catch (error) {
      return Failure(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private detectFormat(data: any, hint?: string): ITokenFormatStrategy | null {
    if (hint) {
      const strategy = this.formatStrategies.find(s =>
        s.getFormatInfo().name.toLowerCase().includes(hint.toLowerCase())
      );
      if (strategy) return strategy;
    }

    // Auto-detect
    let bestStrategy: ITokenFormatStrategy | null = null;
    let bestScore = 0;

    for (const strategy of this.formatStrategies) {
      const score = strategy.detectFormat(data);
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = strategy;
      }
    }

    return bestScore > 0.5 ? bestStrategy : null;
  }

  private processedTokenToToken(
    pt: ProcessedToken,
    projectId: string,
    collection: string,
    sourcePath: string
  ): Token {
    // Implementation details...
    // Create Token from ProcessedToken with specified projectId
  }
}
```

## 2.4 Pre-Sync Validation

**File**: `src/core/validation/PreSyncValidator.ts`

```typescript
import { Token } from '../models/Token';
import { TokenRepository } from '../services/TokenRepository';
import { TokenResolver } from '../services/TokenResolver';
import { Result, Success, Failure } from '../../shared/types';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  tokenId: string;
  tokenName: string;
  fix?: string;
  context?: Record<string, any>;
}

export interface PreSyncValidationResult {
  canSync: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  stats: {
    totalTokens: number;
    validTokens: number;
    tokensWithErrors: number;
    tokensWithWarnings: number;
  };
}

export class PreSyncValidator {
  constructor(
    private repository: TokenRepository,
    private resolver: TokenResolver
  ) {}

  /**
   * Validate tokens before sync
   * Returns all issues found
   */
  async validate(tokens: Token[]): Promise<PreSyncValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const info: ValidationIssue[] = [];

    console.log(`[PreSyncValidator] Validating ${tokens.length} tokens...`);

    for (const token of tokens) {
      // 1. Validate token structure
      const structureIssues = this.validateStructure(token);
      this.categorizeIssues(structureIssues, errors, warnings, info);

      // 2. Validate references
      const refIssues = await this.validateReferences(token);
      this.categorizeIssues(refIssues, errors, warnings, info);

      // 3. Validate type-specific rules
      const typeIssues = this.validateTypeSpecific(token);
      this.categorizeIssues(typeIssues, errors, warnings, info);

      // 4. Validate Figma compatibility
      const figmaIssues = this.validateFigmaCompatibility(token);
      this.categorizeIssues(figmaIssues, errors, warnings, info);
    }

    const tokensWithErrors = new Set(errors.map(e => e.tokenId)).size;
    const tokensWithWarnings = new Set(warnings.map(w => w.tokenId)).size;

    const result: PreSyncValidationResult = {
      canSync: errors.length === 0,
      errors,
      warnings,
      info,
      stats: {
        totalTokens: tokens.length,
        validTokens: tokens.length - tokensWithErrors,
        tokensWithErrors,
        tokensWithWarnings
      }
    };

    console.log(`[PreSyncValidator] Validation complete: ${result.stats.validTokens}/${tokens.length} valid`);
    if (errors.length > 0) {
      console.error(`[PreSyncValidator] Found ${errors.length} errors - cannot sync`);
    }
    if (warnings.length > 0) {
      console.warn(`[PreSyncValidator] Found ${warnings.length} warnings`);
    }

    return result;
  }

  private validateStructure(token: Token): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate required fields
    if (!token.id) {
      issues.push({
        severity: 'error',
        code: 'MISSING_ID',
        message: 'Token is missing required "id" field',
        tokenId: token.id || 'unknown',
        tokenName: token.qualifiedName
      });
    }

    if (!token.qualifiedName) {
      issues.push({
        severity: 'error',
        code: 'MISSING_QUALIFIED_NAME',
        message: 'Token is missing required "qualifiedName" field',
        tokenId: token.id,
        tokenName: 'unknown'
      });
    }

    if (!token.type) {
      issues.push({
        severity: 'error',
        code: 'MISSING_TYPE',
        message: 'Token is missing required "type" field',
        tokenId: token.id,
        tokenName: token.qualifiedName
      });
    }

    if (token.value === undefined || token.value === null) {
      issues.push({
        severity: 'error',
        code: 'MISSING_VALUE',
        message: 'Token is missing required "value" field',
        tokenId: token.id,
        tokenName: token.qualifiedName
      });
    }

    return issues;
  }

  private async validateReferences(token: Token): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Check direct alias
    if (token.aliasTo) {
      const target = this.repository.get(token.aliasTo);
      if (!target) {
        issues.push({
          severity: 'error',
          code: 'BROKEN_ALIAS',
          message: `Token references non-existent target: ${token.aliasTo}`,
          tokenId: token.id,
          tokenName: token.qualifiedName,
          fix: 'Ensure the referenced token exists or remove the alias'
        });
      }
    }

    // Check nested references (for composite types)
    if (token.type === 'typography' || token.type === 'shadow') {
      const unresolvedRefs = this.findUnresolvedReferences(token.value);

      for (const ref of unresolvedRefs) {
        const refName = ref.slice(1, -1); // Remove braces
        const resolved = this.resolver.resolveReference(ref, token.projectId);

        if (!resolved) {
          // Check if it exists in different project
          const allTokens = this.repository.getAll();
          const inOtherProject = allTokens.find(t => t.qualifiedName === refName);

          if (inOtherProject) {
            issues.push({
              severity: 'error',
              code: 'CROSS_PROJECT_REFERENCE',
              message: `Reference "${ref}" points to token in different project "${inOtherProject.projectId}"`,
              tokenId: token.id,
              tokenName: token.qualifiedName,
              fix: `Move all tokens to the same project (currently: "${token.projectId}" → "${inOtherProject.projectId}"), or create a copy of "${refName}" in project "${token.projectId}"`,
              context: {
                reference: ref,
                currentProject: token.projectId,
                targetProject: inOtherProject.projectId
              }
            });
          } else {
            // Token doesn't exist anywhere
            issues.push({
              severity: 'error',
              code: 'UNRESOLVED_REFERENCE',
              message: `Reference "${ref}" cannot be resolved - token does not exist`,
              tokenId: token.id,
              tokenName: token.qualifiedName,
              fix: `Create a token with qualified name "${refName}" in project "${token.projectId}", or fix the reference`,
              context: {
                reference: ref,
                projectId: token.projectId
              }
            });
          }
        }
      }
    }

    // Check for circular references
    const cycles = this.resolver.detectCircularReferences(token.projectId);
    for (const cycle of cycles) {
      if (cycle.cycle.includes(token.id)) {
        const cyclePath = cycle.cycle.map(id => {
          const t = this.repository.get(id);
          return t?.qualifiedName || id;
        }).join(' → ');

        issues.push({
          severity: 'error',
          code: 'CIRCULAR_REFERENCE',
          message: `Token is part of circular reference: ${cyclePath}`,
          tokenId: token.id,
          tokenName: token.qualifiedName,
          fix: 'Break the circular reference by using a direct value instead of an alias',
          context: {
            cycle: cycle.cycle,
            cyclePath
          }
        });
      }
    }

    return issues;
  }

  private validateTypeSpecific(token: Token): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Typography validation
    if (token.type === 'typography') {
      const typValue = token.value as TypographyValue;

      // Check font family
      if (!typValue.fontFamily) {
        issues.push({
          severity: 'warning',
          code: 'MISSING_FONT_FAMILY',
          message: 'Typography token missing fontFamily - will use Figma default',
          tokenId: token.id,
          tokenName: token.qualifiedName,
          fix: 'Add a fontFamily property to the typography value'
        });
      } else if (typeof typValue.fontFamily === 'string' && typValue.fontFamily.startsWith('{')) {
        issues.push({
          severity: 'warning',
          code: 'UNRESOLVED_FONT_FAMILY',
          message: `Typography token has unresolved fontFamily reference: ${typValue.fontFamily}`,
          tokenId: token.id,
          tokenName: token.qualifiedName,
          fix: 'Ensure the referenced font family token exists and resolves correctly'
        });
      }

      // Check font size
      if (!typValue.fontSize) {
        issues.push({
          severity: 'error',
          code: 'MISSING_FONT_SIZE',
          message: 'Typography token missing fontSize - will use Figma default (12px)',
          tokenId: token.id,
          tokenName: token.qualifiedName,
          fix: 'Add a fontSize property to the typography value'
        });
      } else if (typeof typValue.fontSize === 'string' && typValue.fontSize.startsWith('{')) {
        issues.push({
          severity: 'error',
          code: 'UNRESOLVED_FONT_SIZE',
          message: `Typography token has unresolved fontSize reference: ${typValue.fontSize}`,
          tokenId: token.id,
          tokenName: token.qualifiedName,
          fix: 'Ensure the referenced font size token exists and resolves correctly'
        });
      }
    }

    // Shadow validation
    if (token.type === 'shadow') {
      const shadowValue = token.value as ShadowValue;

      // Check color (critical!)
      if (!shadowValue.color) {
        issues.push({
          severity: 'error',
          code: 'MISSING_SHADOW_COLOR',
          message: 'Shadow token missing color - shadow will be invisible in Figma!',
          tokenId: token.id,
          tokenName: token.qualifiedName,
          fix: 'Add a color property to the shadow value'
        });
      } else if (typeof shadowValue.color === 'string' && shadowValue.color.startsWith('{')) {
        issues.push({
          severity: 'error',
          code: 'UNRESOLVED_SHADOW_COLOR',
          message: `Shadow token has unresolved color reference: ${shadowValue.color} - shadow will be invisible!`,
          tokenId: token.id,
          tokenName: token.qualifiedName,
          fix: 'Ensure the referenced color token exists and resolves correctly'
        });
      }
    }

    return issues;
  }

  private validateFigmaCompatibility(token: Token): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if token type is supported
    const supportedTypes = [
      'color', 'dimension', 'fontSize', 'fontWeight', 'fontFamily',
      'lineHeight', 'letterSpacing', 'spacing', 'number', 'string',
      'boolean', 'typography', 'shadow'
    ];

    if (!supportedTypes.includes(token.type)) {
      issues.push({
        severity: 'warning',
        code: 'UNSUPPORTED_TYPE',
        message: `Token type "${token.type}" is not supported by Figma and will be skipped`,
        tokenId: token.id,
        tokenName: token.qualifiedName,
        fix: 'Change token type to a supported type or remove this token'
      });
    }

    return issues;
  }

  private findUnresolvedReferences(value: any, path: string = ''): string[] {
    const refs: string[] = [];

    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      refs.push(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const [key, val] of Object.entries(value)) {
        refs.push(...this.findUnresolvedReferences(val, path ? `${path}.${key}` : key));
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        refs.push(...this.findUnresolvedReferences(item, `${path}[${index}]`));
      });
    }

    return refs;
  }

  private categorizeIssues(
    issues: ValidationIssue[],
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[]
  ): void {
    for (const issue of issues) {
      switch (issue.severity) {
        case 'error':
          errors.push(issue);
          break;
        case 'warning':
          warnings.push(issue);
          break;
        case 'info':
          info.push(issue);
          break;
      }
    }
  }
}
```

## 2.5 Transaction System

**File**: `src/core/services/SyncTransaction.ts`

```typescript
export interface CreatedObject {
  type: 'variable' | 'collection' | 'textStyle' | 'effectStyle';
  id: string;
  name: string;
}

export class SyncTransaction {
  private createdObjects: CreatedObject[] = [];
  private committed = false;
  private rolledBack = false;

  /**
   * Execute an operation within transaction context
   * Automatically rolls back on error
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.committed) {
      throw new Error('Transaction already committed');
    }
    if (this.rolledBack) {
      throw new Error('Transaction already rolled back');
    }

    try {
      const result = await operation();
      return result;
    } catch (error) {
      console.error('[SyncTransaction] Operation failed, rolling back...', error);
      await this.rollback();
      throw error;
    }
  }

  /**
   * Track a created Figma object for potential rollback
   */
  trackCreated(type: CreatedObject['type'], id: string, name: string): void {
    if (this.committed) {
      return; // Already committed, no need to track
    }

    this.createdObjects.push({ type, id, name });
    console.log(`[SyncTransaction] Tracked ${type}: ${name} (${id})`);
  }

  /**
   * Commit the transaction - no rollback possible after this
   */
  async commit(): Promise<void> {
    if (this.rolledBack) {
      throw new Error('Cannot commit - transaction was rolled back');
    }

    this.committed = true;
    console.log(`[SyncTransaction] Committed ${this.createdObjects.length} objects`);
    this.createdObjects = [];
  }

  /**
   * Rollback all created objects
   */
  async rollback(): Promise<void> {
    if (this.committed) {
      throw new Error('Cannot rollback - transaction already committed');
    }
    if (this.rolledBack) {
      console.warn('[SyncTransaction] Already rolled back');
      return;
    }

    console.warn(`[SyncTransaction] Rolling back ${this.createdObjects.length} created objects...`);

    // Delete in reverse order (LIFO)
    const objectsToDelete = [...this.createdObjects].reverse();
    let successCount = 0;
    let failureCount = 0;

    for (const obj of objectsToDelete) {
      try {
        await this.deleteObject(obj);
        successCount++;
        console.log(`[SyncTransaction] Rolled back ${obj.type}: ${obj.name}`);
      } catch (error) {
        failureCount++;
        console.error(`[SyncTransaction] Failed to rollback ${obj.type} ${obj.id}:`, error);
      }
    }

    this.rolledBack = true;
    this.createdObjects = [];

    console.log(`[SyncTransaction] Rollback complete: ${successCount} deleted, ${failureCount} failed`);

    if (failureCount > 0) {
      console.warn('[SyncTransaction] Some objects could not be rolled back - manual cleanup may be required');
    }
  }

  /**
   * Get rollback status
   */
  getStatus(): { committed: boolean; rolledBack: boolean; pendingObjects: number } {
    return {
      committed: this.committed,
      rolledBack: this.rolledBack,
      pendingObjects: this.createdObjects.length
    };
  }

  private async deleteObject(obj: CreatedObject): Promise<void> {
    switch (obj.type) {
      case 'variable': {
        const variable = await figma.variables.getVariableByIdAsync(obj.id);
        if (variable) {
          variable.remove();
        }
        break;
      }

      case 'collection': {
        const collection = await figma.variables.getVariableCollectionByIdAsync(obj.id);
        if (collection) {
          collection.remove();
        }
        break;
      }

      case 'textStyle': {
        const style = figma.getStyleById(obj.id) as TextStyle | null;
        if (style) {
          style.remove();
        }
        break;
      }

      case 'effectStyle': {
        const style = figma.getStyleById(obj.id) as EffectStyle | null;
        if (style) {
          style.remove();
        }
        break;
      }

      default:
        throw new Error(`Unknown object type: ${(obj as any).type}`);
    }
  }
}
```

## 2.6 Sync State Management

**File**: `src/core/services/SyncStateManager.ts`

```typescript
export interface TokenSyncState {
  tokenId: string;
  qualifiedName: string;
  status: 'synced' | 'modified' | 'pending' | 'error';
  lastSync?: string;              // ISO timestamp
  figmaObjectId?: string;         // Variable/Style ID
  figmaObjectType?: 'variable' | 'textStyle' | 'effectStyle';
  error?: string;
  errorCode?: string;
  version: number;                // Increment on each change
}

export interface SyncHistoryEntry {
  id: string;                     // Unique ID for this entry
  timestamp: string;              // ISO timestamp
  operation: 'sync' | 'update' | 'delete';
  tokenIds: string[];
  result: 'success' | 'partial' | 'failure';
  stats: {
    added: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors?: string[];
  duration?: number;              // Milliseconds
}

export class SyncStateManager {
  private tokenStates: Map<string, TokenSyncState> = new Map();
  private history: SyncHistoryEntry[] = [];
  private maxHistorySize = 100;

  /**
   * Mark token as successfully synced
   */
  markAsSynced(
    tokenId: string,
    qualifiedName: string,
    figmaObjectId: string,
    figmaObjectType: 'variable' | 'textStyle' | 'effectStyle'
  ): void {
    const existing = this.tokenStates.get(tokenId);
    const state: TokenSyncState = {
      tokenId,
      qualifiedName,
      status: 'synced',
      lastSync: new Date().toISOString(),
      figmaObjectId,
      figmaObjectType,
      version: (existing?.version || 0) + 1,
      error: undefined,
      errorCode: undefined
    };
    this.tokenStates.set(tokenId, state);
  }

  /**
   * Mark token as having an error
   */
  markAsError(tokenId: string, qualifiedName: string, error: string, errorCode?: string): void {
    const existing = this.tokenStates.get(tokenId);
    const state: TokenSyncState = {
      ...existing,
      tokenId,
      qualifiedName,
      status: 'error',
      error,
      errorCode,
      version: (existing?.version || 0) + 1
    };
    this.tokenStates.set(tokenId, state);
  }

  /**
   * Mark token as modified (needs re-sync)
   */
  markAsModified(tokenId: string, qualifiedName: string): void {
    const existing = this.tokenStates.get(tokenId);
    if (existing && existing.status === 'synced') {
      this.tokenStates.set(tokenId, {
        ...existing,
        status: 'modified',
        version: existing.version + 1
      });
    } else {
      // Not yet synced, mark as pending
      this.tokenStates.set(tokenId, {
        tokenId,
        qualifiedName,
        status: 'pending',
        version: (existing?.version || 0) + 1
      });
    }
  }

  /**
   * Mark token as pending sync
   */
  markAsPending(tokenId: string, qualifiedName: string): void {
    const existing = this.tokenStates.get(tokenId);
    this.tokenStates.set(tokenId, {
      tokenId,
      qualifiedName,
      status: 'pending',
      version: (existing?.version || 0) + 1
    });
  }

  /**
   * Get state for a specific token
   */
  getState(tokenId: string): TokenSyncState | undefined {
    return this.tokenStates.get(tokenId);
  }

  /**
   * Get all token states
   */
  getAll(): TokenSyncState[] {
    return Array.from(this.tokenStates.values());
  }

  /**
   * Get tokens that are out of sync
   */
  getOutOfSyncTokens(): TokenSyncState[] {
    return Array.from(this.tokenStates.values()).filter(
      s => s.status !== 'synced'
    );
  }

  /**
   * Get tokens by status
   */
  getByStatus(status: TokenSyncState['status']): TokenSyncState[] {
    return Array.from(this.tokenStates.values()).filter(s => s.status === status);
  }

  /**
   * Get sync statistics
   */
  getStats(): {
    total: number;
    synced: number;
    modified: number;
    pending: number;
    errors: number;
  } {
    const states = Array.from(this.tokenStates.values());
    return {
      total: states.length,
      synced: states.filter(s => s.status === 'synced').length,
      modified: states.filter(s => s.status === 'modified').length,
      pending: states.filter(s => s.status === 'pending').length,
      errors: states.filter(s => s.status === 'error').length
    };
  }

  /**
   * Add entry to sync history
   */
  addHistoryEntry(entry: Omit<SyncHistoryEntry, 'id'>): void {
    const historyEntry: SyncHistoryEntry = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...entry
    };

    this.history.push(historyEntry);

    // Keep only recent entries
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get sync history
   */
  getHistory(limit?: number): SyncHistoryEntry[] {
    const history = [...this.history].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get last sync entry
   */
  getLastSync(): SyncHistoryEntry | undefined {
    return this.history[this.history.length - 1];
  }

  /**
   * Clear all state (for testing)
   */
  clear(): void {
    this.tokenStates.clear();
    this.history = [];
  }

  /**
   * Export state for persistence
   */
  export(): { states: TokenSyncState[]; history: SyncHistoryEntry[] } {
    return {
      states: Array.from(this.tokenStates.values()),
      history: this.history
    };
  }

  /**
   * Import state from persistence
   */
  import(data: { states: TokenSyncState[]; history: SyncHistoryEntry[] }): void {
    this.tokenStates.clear();
    for (const state of data.states) {
      this.tokenStates.set(state.tokenId, state);
    }
    this.history = data.history;
  }
}
```

---

# 3. Implementation Plan

## 3.1 Phases Overview

| Phase | Name | Duration | Priority | Dependencies |
|-------|------|----------|----------|--------------|
| 0 | Foundation | 2h | P0 | None |
| 1 | Type Safety Core | 24h | P0 | Phase 0 |
| 2 | Project ID & Validation | 22h | P0 | Phase 1 |
| 3 | Testing Infrastructure | 10h | P1 | Phase 2 |
| 4 | Observability | 10h | P1 | Phase 2 |
| 5 | Architecture Patterns | 5h | P1 | Phase 2 |
| 6 | Integration & Polish | 8h | P1 | All |

**Total Estimated Effort**: 81 hours (~10 days of full-time work)

## 3.2 Detailed Phase Breakdown

### Phase 0: Foundation (2 hours) - CRITICAL

**Goal**: Set up infrastructure for safe experimentation

#### Tasks

1. **Feature Flags Setup** (1h)
   ```typescript
   // src/core/config/FeatureFlags.ts
   export const FeatureFlags = {
     DISCRIMINATED_UNION_TYPES: false,        // Default OFF
     ZOD_VALIDATION: false,                   // Default OFF
     PRE_SYNC_VALIDATION: false,              // Default OFF
     UNIFIED_PROJECT_ID: false,               // Default OFF
     TRANSACTION_SYNC: false,                 // Default OFF
     SYNC_STATE_TRACKING: false,              // Default OFF
     TYPE_SAFE_CONVERTERS: false,             // Default OFF
   };
   ```

2. **Test Fixtures** (1h)
   - Create sample token files (W3C format)
   - Create sample token files (Style Dictionary format)
   - Create tokens with known issues (cross-project refs, circular deps)
   - Store in `tests/fixtures/`

#### Deliverables
- ✓ Feature flag system implemented
- ✓ Test fixtures created and documented
- ✓ Safe to enable features incrementally

---

### Phase 1: Type Safety Core (24 hours) - CRITICAL

**Goal**: Implement compile-time and runtime type safety

#### Milestone 1.1: Discriminated Union Types (8h)

**Tasks**:
1. Create new `Token.ts` with discriminated union (2h)
2. Create type guard functions for each token type (1h)
3. Update `TokenRepository` to preserve type information (2h)
4. Update `FigmaSyncService` to use type guards (2h)
5. Write unit tests for type guards (1h)

**Files Modified**:
- `src/core/models/Token.ts` - Refactor to discriminated union
- `src/core/services/TokenRepository.ts` - Update methods
- `src/core/services/FigmaSyncService.ts` - Use type guards

**Migration Strategy**:
- Keep old Token interface as `LegacyToken`
- Create adapter: `LegacyToken → Token`
- Feature flag: `DISCRIMINATED_UNION_TYPES`

#### Milestone 1.2: Zod Validation (6h)

**Tasks**:
1. Install Zod: `npm install zod` (5min)
2. Create validation schemas for all value types (2h)
3. Create `TokenSchema` with discriminated union (1h)
4. Add validation to parse step (1h)
5. Add validation to repository add step (1h)
6. Write validation tests (1h)

**Files Created**:
- `src/core/validation/schemas.ts` - All Zod schemas
- `tests/validation/schemas.test.ts` - Validation tests

**Feature Flag**: `ZOD_VALIDATION`

#### Milestone 1.3: Type-Safe Converters (10h)

**Tasks**:
1. Create `TypeConverter` interface (1h)
2. Implement `ColorToFigmaRGBConverter` (2h)
3. Implement `DimensionToPixelsConverter` (1h)
4. Implement other converters (typography, shadow, etc.) (3h)
5. Update `FigmaSyncService` to use converters (2h)
6. Write converter tests (1h)

**Files Created**:
- `src/core/converters/TypeConverter.ts` - Interface
- `src/core/converters/ColorToFigmaRGBConverter.ts`
- `src/core/converters/DimensionToPixelsConverter.ts`
- `src/core/converters/TypographyConverter.ts`
- `src/core/converters/ShadowConverter.ts`
- `tests/converters/*.test.ts` - Converter tests

**Feature Flag**: `TYPE_SAFE_CONVERTERS`

#### Deliverables
- ✓ Compile-time type safety (discriminated unions)
- ✓ Runtime validation (Zod schemas)
- ✓ Type-safe conversions (converter classes)
- ✓ Zero type-related runtime errors

---

### Phase 2: Project ID & Validation (22 hours) - CRITICAL

**Goal**: Fix cross-project reference issues and add pre-sync validation

#### Milestone 2.1: Unified Project ID (6h)

**Tasks**:
1. Create `ProjectConfig` interface (1h)
2. Create `ImportContext` interface (30min)
3. Update `TokenImportService` to use project config (2h)
4. Create UI for project configuration (2h)
5. Add auto-migration for existing tokens (30min)

**Files Created**:
- `src/core/models/ProjectConfig.ts`
- `src/ui/components/ProjectConfigForm.tsx` (if UI exists)

**Files Modified**:
- `src/core/services/TokenImportService.ts`

**Feature Flag**: `UNIFIED_PROJECT_ID`

#### Milestone 2.2: Cross-Project References (4h)

**Tasks**:
1. Add project registry to `TokenRepository` (1h)
2. Update `TokenResolver` to support cross-project lookups (2h)
3. Add configuration option for cross-project refs (30min)
4. Write cross-project reference tests (30min)

**Files Modified**:
- `src/core/services/TokenRepository.ts`
- `src/core/services/TokenResolver.ts`
- `src/core/models/ProjectConfig.ts`

**Feature Flag**: `CROSS_PROJECT_REFS` (nested under `UNIFIED_PROJECT_ID`)

#### Milestone 2.3: Pre-Sync Validation (8h)

**Tasks**:
1. Create `PreSyncValidator` class (3h)
2. Implement reference validation (2h)
3. Implement type-specific validation (1h)
4. Implement Figma compatibility checks (1h)
5. Write validation tests (1h)

**Files Created**:
- `src/core/validation/PreSyncValidator.ts`
- `tests/validation/PreSyncValidator.test.ts`

**Feature Flag**: `PRE_SYNC_VALIDATION`

#### Milestone 2.4: Enhanced FigmaSyncService (4h)

**Tasks**:
1. Integrate `PreSyncValidator` into sync flow (1h)
2. Add structured error reporting (1h)
3. Add validation result UI display (1h)
4. Test integration (1h)

**Files Modified**:
- `src/core/services/FigmaSyncService.ts`

#### Deliverables
- ✓ Unified project ID system
- ✓ Cross-project references supported (future-proof)
- ✓ Pre-sync validation catches all errors upfront
- ✓ Clear, actionable error messages

---

### Phase 3: Testing Infrastructure (10 hours) - HIGH PRIORITY

**Goal**: Comprehensive test coverage to prevent regressions

#### Milestone 3.1: Contract Tests (4h)

**Tasks**:
1. Install fast-check: `npm install --save-dev fast-check` (5min)
2. Write property-based tests for color conversion (1h)
3. Write property-based tests for dimension conversion (1h)
4. Write property-based tests for other converters (1h)
5. Add contract tests to CI (1h)

**Files Created**:
- `tests/contracts/ColorConverter.contract.test.ts`
- `tests/contracts/DimensionConverter.contract.test.ts`
- `tests/contracts/converters.contract.test.ts`

#### Milestone 3.2: Integration Tests (6h)

**Tasks**:
1. Set up Figma plugin test harness (2h)
2. Write E2E test: W3C → Figma Variable (1h)
3. Write E2E test: Typography with nested refs (1h)
4. Write E2E test: Shadow with color ref (1h)
5. Add integration tests to CI (1h)

**Files Created**:
- `tests/integration/token-import.test.ts`
- `tests/integration/figma-sync.test.ts`
- `tests/integration/typography-sync.test.ts`
- `tests/integration/shadow-sync.test.ts`

#### Deliverables
- ✓ Property-based tests for edge cases
- ✓ End-to-end tests for complete flows
- ✓ >90% test coverage
- ✓ CI catches regressions

---

### Phase 4: Observability (10 hours) - MEDIUM PRIORITY

**Goal**: Make system debuggable and transparent

#### Milestone 4.1: Structured Logging (4h)

**Tasks**:
1. Create `Logger` class (1h)
2. Update all services to use logger (2h)
3. Add log level configuration (30min)
4. Write logging tests (30min)

**Files Created**:
- `src/core/logging/Logger.ts`
- `tests/logging/Logger.test.ts`

**Files Modified**: All service files

#### Milestone 4.2: Sync State Management (6h)

**Tasks**:
1. Create `SyncStateManager` class (2h)
2. Integrate into `FigmaSyncService` (2h)
3. Add sync history persistence (1h)
4. Create state query API (1h)

**Files Created**:
- `src/core/services/SyncStateManager.ts`
- `tests/services/SyncStateManager.test.ts`

**Files Modified**:
- `src/core/services/FigmaSyncService.ts`

**Feature Flag**: `SYNC_STATE_TRACKING`

#### Deliverables
- ✓ Structured logging with context
- ✓ Sync state tracking for all tokens
- ✓ Sync history for auditing
- ✓ Easy debugging of sync issues

---

### Phase 5: Architecture Patterns (5 hours) - MEDIUM PRIORITY

**Goal**: Atomic operations with rollback

#### Milestone 5.1: Transaction System (5h)

**Tasks**:
1. Create `SyncTransaction` class (2h)
2. Integrate into `FigmaSyncService` (2h)
3. Write transaction tests (1h)

**Files Created**:
- `src/core/services/SyncTransaction.ts`
- `tests/services/SyncTransaction.test.ts`

**Files Modified**:
- `src/core/services/FigmaSyncService.ts`

**Feature Flag**: `TRANSACTION_SYNC`

#### Deliverables
- ✓ Atomic sync operations
- ✓ Automatic rollback on failure
- ✓ No partial syncs
- ✓ Consistent Figma state guaranteed

---

### Phase 6: Integration & Polish (8 hours)

**Goal**: Ensure all features work together seamlessly

#### Tasks

1. **Enable All Features** (1h)
   - Test each feature flag individually
   - Test features in combination
   - Document feature dependencies

2. **End-to-End Testing** (3h)
   - Test complete flow with real token files
   - Test error scenarios
   - Test recovery scenarios

3. **Performance Testing** (2h)
   - Benchmark with large token sets (1000+ tokens)
   - Optimize slow paths
   - Ensure <5s sync time for typical projects

4. **Documentation** (2h)
   - Update README with new features
   - Document troubleshooting steps
   - Create migration guide

#### Deliverables
- ✓ All features working together
- ✓ Performance validated
- ✓ Documentation complete
- ✓ Ready for production

---

## 3.3 Implementation Schedule

### Week 1: Critical Type Safety
- **Day 1-2**: Phase 0 + Milestone 1.1 (Foundation + Discriminated Unions)
- **Day 3**: Milestone 1.2 (Zod Validation)
- **Day 4-5**: Milestone 1.3 (Type-Safe Converters)

**Deliverable**: Type-safe system, zero runtime type errors

---

### Week 2: Project ID & Validation
- **Day 6**: Milestone 2.1 (Unified Project ID) ← **FIXES YOUR ISSUE**
- **Day 7**: Milestone 2.2 (Cross-Project Refs)
- **Day 8-9**: Milestone 2.3 (Pre-Sync Validation)
- **Day 10**: Milestone 2.4 (Integration)

**Deliverable**: Typography/shadow sync works, comprehensive validation

---

### Week 3: Testing & Observability
- **Day 11-12**: Phase 3 (Testing Infrastructure)
- **Day 13-14**: Phase 4 (Observability)
- **Day 15**: Phase 5 (Transactions)

**Deliverable**: Bulletproof system with full observability

---

### Week 4: Polish & Launch
- **Day 16-17**: Phase 6 (Integration & Polish)
- **Day 18**: Buffer for unexpected issues
- **Day 19**: Final testing and documentation
- **Day 20**: Launch / Production deployment

**Deliverable**: Production-ready system

---

## 3.4 Risk Mitigation

### Risk 1: Breaking Changes in Token Interface
**Mitigation**:
- Feature flags for gradual rollout
- Keep legacy interface during transition
- Adapter pattern for compatibility
- Comprehensive migration tests

### Risk 2: Performance Degradation
**Mitigation**:
- Benchmark before/after each phase
- Optimize critical paths (caching, batching)
- Set performance budgets (<5s sync for 1000 tokens)
- Profile and optimize hot paths

### Risk 3: User Adoption
**Mitigation**:
- Clear migration documentation
- Auto-migration where possible
- Backwards compatibility for 1 version
- Feature flags allow opt-in

### Risk 4: Incomplete Testing
**Mitigation**:
- Test coverage target: >90%
- Property-based testing for edge cases
- Integration tests for critical flows
- Manual testing with real projects

---

# 4. Acceptance Criteria

## 4.1 Feature-Level Acceptance Criteria

### Feature 1: Unified Project ID System

**AC-1.1**: When user imports multiple token files, they can specify a single project ID for all files
- **Given** user has 3 token files (primitives.json, semantic.json, components.json)
- **When** user configures project with ID "my-design-system"
- **Then** all tokens from all 3 files have projectId "my-design-system"

**AC-1.2**: Tokens with same project ID can reference each other
- **Given** token A in primitives.json references token B in semantic.json
- **And** both files imported with same project ID
- **When** TokenResolver resolves token A
- **Then** reference to token B resolves successfully

**AC-1.3**: System validates all tokens have same project ID
- **Given** tokens with mixed project IDs
- **When** attempting to import
- **Then** system rejects import with clear error message
- **And** error message lists all project IDs found

**AC-1.4**: Existing tokens auto-migrate to unified project ID
- **Given** existing tokens with project ID "default"
- **When** user enables unified project ID feature
- **Then** system migrates all tokens to new project ID
- **And** no data loss occurs

---

### Feature 2: Pre-Sync Validation

**AC-2.1**: System validates all tokens before any Figma object is created
- **Given** 100 tokens to sync, 5 have errors
- **When** user initiates sync
- **Then** validation runs first
- **And** no Figma objects created until validation passes
- **And** validation errors reported upfront

**AC-2.2**: Cross-project references detected and reported
- **Given** token in project "A" references token in project "B"
- **When** pre-sync validation runs
- **Then** error reported with code "CROSS_PROJECT_REFERENCE"
- **And** error message includes both project IDs
- **And** fix suggestion provided

**AC-2.3**: Circular references detected and reported
- **Given** tokens with circular reference: A → B → C → A
- **When** pre-sync validation runs
- **Then** error reported with code "CIRCULAR_REFERENCE"
- **And** error message shows complete cycle path
- **And** fix suggestion provided

**AC-2.4**: Missing shadow colors detected
- **Given** shadow token without color property
- **When** pre-sync validation runs
- **Then** error reported with code "MISSING_SHADOW_COLOR"
- **And** error message warns shadow will be invisible
- **And** fix suggestion provided

**AC-2.5**: Missing typography font sizes detected
- **Given** typography token without fontSize property
- **When** pre-sync validation runs
- **Then** error reported with code "MISSING_FONT_SIZE"
- **And** error message warns will use Figma default (12px)
- **And** fix suggestion provided

**AC-2.6**: All errors include actionable fixes
- **Given** any validation error
- **Then** error includes "fix" field with actionable suggestion
- **And** fix is specific to the error type
- **And** fix can be understood by non-technical users

**AC-2.7**: Validation results structured and queryable
- **Given** validation complete
- **Then** results include:
  - `canSync: boolean`
  - `errors: ValidationIssue[]`
  - `warnings: ValidationIssue[]`
  - `stats: { totalTokens, validTokens, tokensWithErrors, tokensWithWarnings }`

---

### Feature 3: Type-Safe Token System

**AC-3.1**: Token type determines value type at compile time
- **Given** token with type "color"
- **Then** TypeScript enforces value is ColorValue
- **And** TypeScript error if value is number or string

**AC-3.2**: Type guards narrow token types correctly
- **Given** token variable of type Token
- **When** isColorToken(token) returns true
- **Then** TypeScript knows token.value is ColorValue
- **And** can access ColorValue properties without casting

**AC-3.3**: Runtime validation rejects invalid tokens
- **Given** token with type "color" and value 123
- **When** TokenSchema.safeParse(token) runs
- **Then** validation fails
- **And** error message explains type mismatch

**AC-3.4**: Type converters validate input
- **Given** ColorToFigmaRGBConverter
- **When** convert() called with invalid input
- **Then** returns Failure result
- **And** error includes code "INVALID_INPUT"
- **And** error includes original input for debugging

**AC-3.5**: Type converters handle edge cases
- **Given** ColorValue with r=300 (out of range)
- **When** converter validates
- **Then** validation fails with clear error
- **And** error specifies valid range (0-255)

---

### Feature 4: Transactional Sync

**AC-4.1**: Sync creates all objects or none
- **Given** 100 tokens to sync, token #50 has error
- **When** sync runs
- **Then** error detected at token #50
- **And** transaction rolls back
- **And** all 49 created variables deleted
- **And** Figma state unchanged

**AC-4.2**: Rollback deletes in reverse order
- **Given** created objects: Collection A, Variable B, Variable C
- **When** rollback occurs
- **Then** objects deleted in order: C, B, A
- **And** all deletes succeed

**AC-4.3**: Rollback reports failures
- **Given** rollback needed
- **And** deletion of object B fails
- **When** rollback completes
- **Then** logs warning about failed deletion
- **And** still attempts to delete other objects
- **And** returns summary of rollback status

**AC-4.4**: Committed transaction cannot rollback
- **Given** transaction committed
- **When** attempting to rollback
- **Then** throws error "Cannot rollback - transaction already committed"

**AC-4.5**: Transaction status queryable
- **Given** transaction in progress
- **When** getStatus() called
- **Then** returns { committed: false, rolledBack: false, pendingObjects: N }

---

### Feature 5: Sync State Management

**AC-5.1**: Synced tokens tracked with Figma IDs
- **Given** token synced to Figma variable
- **When** sync completes
- **Then** state manager records:
  - `status: 'synced'`
  - `lastSync: <timestamp>`
  - `figmaObjectId: <variable-id>`
  - `figmaObjectType: 'variable'`

**AC-5.2**: Modified tokens detected
- **Given** token with status "synced"
- **When** token value changes
- **Then** status updated to "modified"
- **And** version incremented

**AC-5.3**: Error tokens tracked with error details
- **Given** token sync fails
- **When** error occurs
- **Then** state manager records:
  - `status: 'error'`
  - `error: <error message>`
  - `errorCode: <error code>`

**AC-5.4**: Sync history maintained
- **Given** multiple sync operations
- **When** sync completes
- **Then** history entry created with:
  - `timestamp`
  - `operation: 'sync'`
  - `result: 'success' | 'partial' | 'failure'`
  - `stats: { added, updated, skipped, failed }`
  - `errors: string[]` (if any)

**AC-5.5**: Sync statistics accurate
- **Given** 100 tokens: 80 synced, 10 modified, 5 pending, 5 errors
- **When** getStats() called
- **Then** returns exact counts

**AC-5.6**: Out-of-sync tokens queryable
- **Given** tokens with various statuses
- **When** getOutOfSyncTokens() called
- **Then** returns only tokens with status != 'synced'

---

## 4.2 Technical Acceptance Criteria

### Type Safety

**TAC-T1**: Zero `any` types in core token handling code
- No `any` types in Token.ts
- No `any` types in TokenRepository.ts
- No `any` types in TokenResolver.ts
- No `any` types in FigmaSyncService.ts

**TAC-T2**: 100% type coverage for token values
- Every token type has explicit value type
- Type guards exist for all token types
- Converters are type-safe (input/output typed)

**TAC-T3**: Runtime validation matches compile-time types
- Zod schemas aligned with TypeScript types
- Schema validation catches all type mismatches
- Validation errors include field paths

---

### Performance

**TAC-P1**: Sync performance acceptable
- <5 seconds to sync 1000 tokens
- <10 seconds to sync 5000 tokens
- Memory usage <500MB for 10,000 tokens

**TAC-P2**: Validation performance acceptable
- Pre-sync validation <2 seconds for 1000 tokens
- Reference resolution <1 second for 1000 tokens
- Cache hit rate >95%

**TAC-P3**: No performance regressions
- All operations within 10% of baseline
- Benchmarks tracked in CI
- Alerts on >20% slowdown

---

### Code Quality

**TAC-Q1**: Test coverage >90%
- Unit tests: >95%
- Integration tests: >80%
- Contract tests: all converters
- E2E tests: critical flows

**TAC-Q2**: No ESLint errors
- Zero lint errors in modified files
- Zero TypeScript errors
- All tests pass

**TAC-Q3**: Documentation complete
- All public APIs documented with JSDoc
- README updated with new features
- Migration guide provided
- Troubleshooting guide updated

---

### Backwards Compatibility

**TAC-BC1**: Legacy tokens supported during migration
- Old Token interface still works
- Adapter converts legacy → new format
- No data loss during migration

**TAC-BC2**: Feature flags enable gradual rollout
- All features off by default
- Features can be enabled independently
- No breaking changes with flags off

**TAC-BC3**: Storage format backwards compatible
- New storage format reads old format
- Old format auto-migrated on first read
- Migration is idempotent

---

## 4.3 User Acceptance Criteria

### UAC-1: Typography Sync Works Correctly
**Given**: Typography token with references to primitive tokens
**When**: User syncs tokens to Figma
**Then**:
- ✓ TextStyle created in Figma
- ✓ Font family matches token value
- ✓ Font size matches token value (not 12px default)
- ✓ Line height matches token value (not AUTO default)
- ✓ Font weight matches token value
- ✓ Letter spacing matches token value

**Verify**:
```
1. Open Figma
2. Check TextStyle in local styles
3. Verify all properties match token values
4. Create text element, apply style
5. Verify text renders correctly
```

---

### UAC-2: Shadow Sync Works Correctly
**Given**: Shadow token with color reference
**When**: User syncs tokens to Figma
**Then**:
- ✓ EffectStyle created in Figma
- ✓ Shadow has correct color (not transparent)
- ✓ Shadow has correct offset
- ✓ Shadow has correct blur
- ✓ Shadow has correct spread
- ✓ Shadow is visible when applied

**Verify**:
```
1. Open Figma
2. Check EffectStyle in local effects
3. Create rectangle, apply shadow
4. Verify shadow is visible and correct color
```

---

### UAC-3: Error Messages Are Clear and Actionable
**Given**: Tokens with cross-project references
**When**: User attempts to sync
**Then**:
- ✓ Sync blocked before creating Figma objects
- ✓ Error message lists all issues
- ✓ Each error includes fix suggestion
- ✓ Error codes are consistent and searchable
- ✓ User can fix issues based on messages alone

**Verify**:
```
1. Import tokens with known issues
2. Attempt sync
3. Read error messages
4. Follow fix suggestions
5. Verify issues resolved
6. Retry sync - succeeds
```

---

### UAC-4: Sync Is Atomic (All or Nothing)
**Given**: Tokens where one has an error
**When**: User syncs all tokens
**Then**:
- ✓ Error detected before partial sync
- ✓ No Figma objects created
- ✓ If error during sync, all objects rolled back
- ✓ Figma state same before/after failed sync
- ✓ User can fix error and retry

**Verify**:
```
1. Note number of Figma variables before sync
2. Attempt sync with error
3. Sync fails
4. Check Figma - variable count unchanged
5. Fix error
6. Retry sync - succeeds
7. Check Figma - all variables created
```

---

### UAC-5: Sync Status Is Visible
**Given**: Tokens synced to Figma
**When**: User views sync status
**Then**:
- ✓ Can see which tokens are synced
- ✓ Can see which tokens are modified
- ✓ Can see which tokens have errors
- ✓ Can see last sync timestamp
- ✓ Can see sync history

**Verify**:
```
1. Sync tokens
2. View sync status (UI or API)
3. Verify counts match expectations
4. Modify a token
5. Check status - shows as "modified"
6. Re-sync
7. Check status - shows as "synced"
```

---

## 4.4 Acceptance Testing Checklist

### Pre-Launch Checklist

- [ ] All Phase 0-6 tasks completed
- [ ] All feature flags tested individually
- [ ] All feature flags tested in combination
- [ ] All acceptance criteria verified
- [ ] Test coverage >90%
- [ ] Performance benchmarks pass
- [ ] Documentation complete
- [ ] Migration guide tested
- [ ] Rollback plan documented
- [ ] Known issues documented

### Launch Readiness Checklist

- [ ] Production environment tested
- [ ] Rollback tested and verified
- [ ] Monitoring/logging in place
- [ ] Error tracking configured
- [ ] User documentation published
- [ ] Support team trained
- [ ] Stakeholders notified
- [ ] Launch plan approved

---

# 5. Testing Strategy

## 5.1 Unit Tests

### Coverage Targets
- **Core Models**: 100%
- **Services**: >95%
- **Converters**: 100%
- **Validators**: >95%

### Test Files

```
tests/
├── models/
│   └── Token.test.ts                     # Token type guards, interfaces
├── services/
│   ├── TokenRepository.test.ts           # CRUD, indexes, queries
│   ├── TokenResolver.test.ts             # Reference resolution, caching
│   ├── FigmaSyncService.test.ts          # Sync logic, type mapping
│   ├── TokenImportService.test.ts        # Import with project config
│   ├── SyncStateManager.test.ts          # State tracking, history
│   └── SyncTransaction.test.ts           # Transactions, rollback
├── validation/
│   ├── schemas.test.ts                   # Zod schema validation
│   └── PreSyncValidator.test.ts          # Validation logic
├── converters/
│   ├── ColorToFigmaRGBConverter.test.ts
│   ├── DimensionToPixelsConverter.test.ts
│   └── TypeConverter.test.ts
└── fixtures/
    ├── w3c-tokens.json                   # Test data
    ├── style-dictionary-tokens.json
    └── tokens-with-issues.json
```

### Example Unit Test

```typescript
// tests/converters/ColorToFigmaRGBConverter.test.ts
import { ColorToFigmaRGBConverter } from '../../src/core/converters/ColorToFigmaRGBConverter';

describe('ColorToFigmaRGBConverter', () => {
  const converter = new ColorToFigmaRGBConverter();

  describe('validate', () => {
    it('accepts valid hex color', () => {
      expect(converter.validate({ hex: '#1e40af' })).toBe(true);
    });

    it('rejects invalid hex color', () => {
      expect(converter.validate({ hex: 'invalid' })).toBe(false);
    });

    it('accepts valid RGB color', () => {
      expect(converter.validate({ r: 30, g: 64, b: 175 })).toBe(true);
    });
  });

  describe('convert', () => {
    it('converts hex to RGB (0-1 range)', () => {
      const result = converter.convert({ hex: '#1e40af' });

      expect(result.success).toBe(true);
      expect(result.data?.r).toBeCloseTo(0.118, 3);
      expect(result.data?.g).toBeCloseTo(0.251, 3);
      expect(result.data?.b).toBeCloseTo(0.686, 3);
    });

    it('normalizes RGB from 0-255 to 0-1', () => {
      const result = converter.convert({ r: 30, g: 64, b: 175 });

      expect(result.success).toBe(true);
      expect(result.data?.r).toBeCloseTo(0.118, 3);
    });

    it('handles RGB already in 0-1 range', () => {
      const result = converter.convert({ r: 0.118, g: 0.251, b: 0.686 });

      expect(result.success).toBe(true);
      expect(result.data?.r).toBeCloseTo(0.118, 3);
    });

    it('returns error for invalid input', () => {
      const result = converter.convert({ hex: 'invalid' } as any);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONVERSION_FAILED');
    });

    it('converts HSL to RGB', () => {
      const result = converter.convert({ h: 225, s: 70, l: 40 });

      expect(result.success).toBe(true);
      expect(result.data?.r).toBeCloseTo(0.118, 1);
      expect(result.data?.g).toBeCloseTo(0.251, 1);
      expect(result.data?.b).toBeCloseTo(0.686, 1);
    });
  });
});
```

---

## 5.2 Contract Tests (Property-Based)

### Purpose
Test converters with thousands of random inputs to find edge cases

### Example Contract Test

```typescript
// tests/contracts/ColorConverter.contract.test.ts
import { fc } from 'fast-check';
import { ColorToFigmaRGBConverter } from '../../src/core/converters/ColorToFigmaRGBConverter';

describe('ColorConverter Contract', () => {
  const converter = new ColorToFigmaRGBConverter();

  it('all valid RGB colors convert to 0-1 range', () => {
    fc.assert(
      fc.property(
        fc.record({
          r: fc.integer({ min: 0, max: 255 }),
          g: fc.integer({ min: 0, max: 255 }),
          b: fc.integer({ min: 0, max: 255 })
        }),
        (colorValue) => {
          const result = converter.convert(colorValue);

          // Contract: conversion must succeed
          expect(result.success).toBe(true);

          // Contract: values in 0-1 range
          expect(result.data!.r).toBeGreaterThanOrEqual(0);
          expect(result.data!.r).toBeLessThanOrEqual(1);
          expect(result.data!.g).toBeGreaterThanOrEqual(0);
          expect(result.data!.g).toBeLessThanOrEqual(1);
          expect(result.data!.b).toBeGreaterThanOrEqual(0);
          expect(result.data!.b).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 1000 } // Test 1000 random inputs
    );
  });

  it('hex conversion round-trip preserves color', () => {
    fc.assert(
      fc.property(
        fc.hexaString({ minLength: 6, maxLength: 6 }),
        (hex) => {
          const colorValue = { hex: `#${hex}` };
          const result = converter.convert(colorValue);

          if (!result.success) return; // Skip invalid hex

          // Convert back
          const r = Math.round(result.data.r * 255).toString(16).padStart(2, '0');
          const g = Math.round(result.data.g * 255).toString(16).padStart(2, '0');
          const b = Math.round(result.data.b * 255).toString(16).padStart(2, '0');
          const backToHex = `#${r}${g}${b}`;

          // Contract: round-trip preserves value (within rounding)
          expect(backToHex.toLowerCase()).toBe(`#${hex}`.toLowerCase());
        }
      ),
      { numRuns: 500 }
    );
  });

  it('never returns NaN or Infinity', () => {
    fc.assert(
      fc.property(
        fc.record({
          r: fc.float({ min: 0, max: 255, noNaN: true }),
          g: fc.float({ min: 0, max: 255, noNaN: true }),
          b: fc.float({ min: 0, max: 255, noNaN: true })
        }),
        (colorValue) => {
          const result = converter.convert(colorValue);

          if (result.success) {
            expect(Number.isNaN(result.data.r)).toBe(false);
            expect(Number.isNaN(result.data.g)).toBe(false);
            expect(Number.isNaN(result.data.b)).toBe(false);
            expect(Number.isFinite(result.data.r)).toBe(true);
            expect(Number.isFinite(result.data.g)).toBe(true);
            expect(Number.isFinite(result.data.b)).toBe(true);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });
});
```

---

## 5.3 Integration Tests

### Purpose
Test complete flows from JSON import to Figma sync

### Example Integration Test

```typescript
// tests/integration/typography-sync.test.ts
import { TokenRepository } from '../../src/core/services/TokenRepository';
import { TokenResolver } from '../../src/core/services/TokenResolver';
import { FigmaSyncService } from '../../src/core/services/FigmaSyncService';
import { W3CTokenFormatStrategy } from '../../src/core/adapters/W3CTokenFormatStrategy';
import { PreSyncValidator } from '../../src/core/validation/PreSyncValidator';

describe('Typography Sync (E2E)', () => {
  let repository: TokenRepository;
  let resolver: TokenResolver;
  let syncService: FigmaSyncService;
  let validator: PreSyncValidator;
  let formatStrategy: W3CTokenFormatStrategy;

  beforeEach(() => {
    repository = new TokenRepository();
    resolver = new TokenResolver(repository);
    validator = new PreSyncValidator(repository, resolver);
    syncService = new FigmaSyncService(repository, resolver, validator);
    formatStrategy = new W3CTokenFormatStrategy();
  });

  it('syncs typography with nested references correctly', async () => {
    // ARRANGE: Create test JSON with references
    const json = {
      primitive: {
        font: {
          family: {
            primary: {
              $value: 'Inter',
              $type: 'fontFamily'
            }
          },
          size: {
            base: {
              $value: 16,
              $type: 'fontSize'
            }
          },
          weight: {
            semibold: {
              $value: 600,
              $type: 'fontWeight'
            }
          }
        }
      },
      semantic: {
        heading: {
          h1: {
            $value: {
              fontFamily: '{primitive.font.family.primary}',
              fontSize: '{primitive.font.size.base}',
              fontWeight: '{primitive.font.weight.semibold}'
            },
            $type: 'typography'
          }
        }
      }
    };

    // ACT: Full flow
    // 1. Parse
    const parseResult = formatStrategy.parseTokens(json);
    expect(parseResult.success).toBe(true);

    // 2. Convert to Token model (unified project ID)
    const tokens = parseResult.data!.map(pt =>
      createTokenFromProcessed(pt, 'test-project', 'default')
    );

    // 3. Store
    const addResult = repository.add(tokens);
    expect(addResult.success).toBe(true);

    // 4. Validate
    const validation = await validator.validate(tokens);
    expect(validation.canSync).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // 5. Sync
    const syncResult = await syncService.syncTokens(tokens);
    expect(syncResult.success).toBe(true);

    // ASSERT: Verify TextStyle created correctly
    const textStyles = figma.getLocalTextStyles();
    const h1Style = textStyles.find(s => s.name === 'semantic.heading.h1');

    expect(h1Style).toBeDefined();
    expect(h1Style!.fontName.family).toBe('Inter');
    expect(h1Style!.fontSize).toBe(16);
    expect(h1Style!.fontName.style).toContain('Semi'); // "Semi Bold" or "SemiBold"

    // Verify sync state
    const h1Token = tokens.find(t => t.qualifiedName === 'semantic.heading.h1');
    const syncState = syncService.getStateManager().getState(h1Token!.id);

    expect(syncState?.status).toBe('synced');
    expect(syncState?.figmaObjectType).toBe('textStyle');
    expect(syncState?.figmaObjectId).toBe(h1Style!.id);
  });

  it('detects and reports cross-project references', async () => {
    // ARRANGE: Tokens with cross-project references
    const primitiveTokens = [
      createToken({
        projectId: 'primitive-project',
        qualifiedName: 'primitive.color.primary',
        type: 'color',
        value: { hex: '#1e40af' }
      })
    ];

    const semanticTokens = [
      createToken({
        projectId: 'semantic-project', // Different project!
        qualifiedName: 'semantic.button.bg',
        type: 'color',
        value: '{primitive.color.primary}' // Reference to other project
      })
    ];

    repository.add([...primitiveTokens, ...semanticTokens]);

    // ACT: Validate
    const validation = await validator.validate(semanticTokens);

    // ASSERT: Error detected
    expect(validation.canSync).toBe(false);
    expect(validation.errors).toHaveLength(1);
    expect(validation.errors[0].code).toBe('CROSS_PROJECT_REFERENCE');
    expect(validation.errors[0].message).toContain('primitive-project');
    expect(validation.errors[0].fix).toBeDefined();
  });

  it('rolls back on error during sync', async () => {
    // ARRANGE: Tokens where one will fail
    const tokens = [
      createColorToken('valid1', '#ff0000'),
      createColorToken('valid2', '#00ff00'),
      createInvalidToken('invalid'), // Will cause error
      createColorToken('valid3', '#0000ff')
    ];

    repository.add(tokens);

    // Get initial variable count
    const initialVarCount = (await figma.variables.getLocalVariablesAsync()).length;

    // ACT: Sync (will fail)
    const syncResult = await syncService.syncTokens(tokens);

    // ASSERT: Sync failed
    expect(syncResult.success).toBe(false);

    // Verify rollback occurred - no new variables
    const finalVarCount = (await figma.variables.getLocalVariablesAsync()).length;
    expect(finalVarCount).toBe(initialVarCount);

    // Verify sync state reflects error
    const invalidToken = tokens[2];
    const syncState = syncService.getStateManager().getState(invalidToken.id);
    expect(syncState?.status).toBe('error');
  });
});
```

---

## 5.4 Test Automation

### CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:contract

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:integration

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run lint
      - run: npm run type-check
```

### Test Scripts

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/(models|services|validation|converters)",
    "test:contract": "jest --testPathPattern=tests/contracts",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:coverage": "jest --coverage --coverageReporters=text --coverageReporters=lcov",
    "test:watch": "jest --watch",
    "lint": "eslint src tests --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

---

# 6. Risk Management

## 6.1 Technical Risks

### Risk T-1: Breaking Changes in Token Interface
**Likelihood**: High
**Impact**: High
**Severity**: CRITICAL

**Mitigation**:
1. Feature flags for gradual rollout
2. Keep `LegacyToken` interface during transition
3. Adapter: `LegacyToken → Token` with auto-migration
4. Deprecation warning for 1 version before removal
5. Comprehensive migration tests

**Rollback Plan**:
- Feature flag: `DISCRIMINATED_UNION_TYPES = false`
- Revert to legacy interface
- No data loss (adapter works both ways)

---

### Risk T-2: Performance Degradation
**Likelihood**: Medium
**Impact**: Medium
**Severity**: HIGH

**Mitigation**:
1. Benchmark before/after each phase
2. Set performance budgets:
   - <5s sync for 1000 tokens
   - <10s sync for 5000 tokens
   - Memory <500MB for 10k tokens
3. Profile hot paths and optimize
4. Cache aggressively (3-tier cache in resolver)
5. Batch Figma API calls

**Monitoring**:
- Track sync duration in CI
- Alert on >20% regression
- Profile memory usage

---

### Risk T-3: Zod Validation Overhead
**Likelihood**: Low
**Impact**: Medium
**Severity**: MEDIUM

**Mitigation**:
1. Validate only at parse time and repository add
2. Skip validation for already-validated tokens
3. Cache validation results
4. Use `safeParse` (no exceptions)
5. Make validation optional via feature flag

**Benchmark Target**:
- Validation adds <100ms for 1000 tokens
- Memory overhead <10%

---

### Risk T-4: Rollback Failures
**Likelihood**: Low
**Impact**: High
**Severity**: HIGH

**Mitigation**:
1. Test rollback extensively (integration tests)
2. Track all created objects in order
3. Delete in reverse order (LIFO)
4. Continue rollback even if some deletes fail
5. Log all rollback errors
6. Manual cleanup procedure documented

**Testing**:
- Test rollback with 1 object
- Test rollback with 100 objects
- Test rollback with partial deletion failure
- Test rollback with Figma API errors

---

## 6.2 User Adoption Risks

### Risk U-1: Migration Friction
**Likelihood**: Medium
**Impact**: Medium
**Severity**: MEDIUM

**Mitigation**:
1. Auto-migration where possible
2. Clear migration documentation with screenshots
3. Migration guide with step-by-step instructions
4. Video tutorial (optional)
5. Support for old format for 1 version

**User Communication**:
- Release notes explaining changes
- Migration guide published before release
- Support channel for migration questions

---

### Risk U-2: Breaking User Workflows
**Likelihood**: Medium
**Impact**: High
**Severity**: HIGH

**Mitigation**:
1. Feature flags default OFF
2. Users opt-in to new features
3. Backwards compatibility for 1 version
4. Clearly communicate breaking changes
5. Provide rollback instructions

**Testing**:
- Test all existing user workflows
- Beta testing with early adopters
- Collect feedback before full release

---

### Risk U-3: Confusion with Project IDs
**Likelihood**: High
**Impact**: Low
**Severity**: MEDIUM

**Mitigation**:
1. Clear UI for project configuration
2. Sensible defaults (project ID from folder name)
3. Validation prevents common mistakes
4. Error messages explain project ID concept
5. Documentation with examples

**UX Improvements**:
- Auto-suggest project ID based on file names
- Validate project ID format (no spaces, lowercase)
- Show preview of how tokens will be grouped

---

## 6.3 Project Risks

### Risk P-1: Schedule Overrun
**Likelihood**: Medium
**Impact**: Medium
**Severity**: MEDIUM

**Mitigation**:
1. Buffer time in schedule (18 days planned for 15 days work)
2. Prioritize phases (P0 must complete, P1-P2 optional)
3. Track progress daily
4. Escalate blockers immediately
5. Reduce scope if needed (cut P2 features)

**Contingency**:
- Cut Phase 5 (transactions) if behind schedule
- Cut Phase 4 (observability) if severely behind
- Phase 1-2 are non-negotiable (fix core issues)

---

### Risk P-2: Incomplete Testing
**Likelihood**: Medium
**Impact**: High
**Severity**: HIGH

**Mitigation**:
1. Test coverage target: >90% (enforced in CI)
2. Property-based testing for converters (catches edge cases)
3. Integration tests for critical flows
4. Manual testing with real projects
5. Beta testing with users

**Quality Gates**:
- No merge without tests
- No merge with failing tests
- No merge with coverage <90%
- No merge without code review

---

### Risk P-3: Insufficient Documentation
**Likelihood**: Low
**Impact**: Medium
**Severity**: MEDIUM

**Mitigation**:
1. Documentation updated with each PR
2. JSDoc comments for all public APIs
3. README updated with new features
4. Migration guide mandatory
5. Troubleshooting guide updated

**Documentation Checklist**:
- [ ] README.md updated
- [ ] Migration guide complete
- [ ] API documentation complete
- [ ] Troubleshooting guide updated
- [ ] Release notes written

---

## 6.4 Risk Register

| ID | Risk | Likelihood | Impact | Severity | Owner | Status |
|----|------|-----------|--------|----------|-------|--------|
| T-1 | Breaking changes in Token interface | High | High | CRITICAL | Dev Lead | Mitigated |
| T-2 | Performance degradation | Medium | Medium | HIGH | Dev Lead | Monitoring |
| T-3 | Zod validation overhead | Low | Medium | MEDIUM | Dev | Mitigated |
| T-4 | Rollback failures | Low | High | HIGH | Dev | Testing |
| U-1 | Migration friction | Medium | Medium | MEDIUM | PM | Documented |
| U-2 | Breaking user workflows | Medium | High | HIGH | PM | Testing |
| U-3 | Confusion with project IDs | High | Low | MEDIUM | UX | Mitigated |
| P-1 | Schedule overrun | Medium | Medium | MEDIUM | PM | Buffered |
| P-2 | Incomplete testing | Medium | High | HIGH | QA | Enforced |
| P-3 | Insufficient documentation | Low | Medium | MEDIUM | Tech Writer | Tracked |

---

## Summary

This Master Improvement Plan consolidates:
- `FLOW_ANALYSIS.md` - Flow acceptance criteria
- `IMPROVEMENT_PLAN.md` - Original 4-phase plan
- `ABSTRACTION_ARCHITECTURE.md` - Architecture details
- `TYPE_SYSTEM_MAPPING.md` - Type system details
- `ARCHITECTURE_IMPROVEMENTS.md` - 10 improvements
- `EXECUTIVE_SUMMARY.md` - High-level overview

**Ready for Implementation**: All specifications defined, plan detailed, acceptance criteria clear.

**Next Step**: Review and approve this plan, then begin Phase 0 (Foundation).

---

**Version**: 2.0
**Last Updated**: 2025-11-16
**Status**: Ready for Approval

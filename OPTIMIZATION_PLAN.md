# Project Optimization Plan

**Goal**: Reduce complexity, improve maintainability, and simplify logging WITHOUT touching core features.

**Current State**:
- 61 source files, 16,548 total lines
- Largest file: FigmaSyncService.ts (1,229 lines, 29 methods, 98 if statements)
- Console logging: 130 warn/error statements, 125 debug.log statements
- Bundle size: 420KB (196KB + 95KB + 126KB)

---

## Phase 1: Code Duplication Elimination

### 1.1 Converter Duplication (HIGH PRIORITY)

**Problem**: FigmaSyncService has duplicate conversion logic despite dedicated Converter classes existing.

**Current State**:
```
src/core/converters/           (1,431 lines - UNUSED in FigmaSyncService)
├── ColorConverter.ts          418 lines
├── TypographyConverter.ts     367 lines
├── DimensionConverter.ts      ~300 lines
└── ShadowConverter.ts         ~300 lines

src/core/services/FigmaSyncService.ts (1,229 lines)
├── convertValue()             ❌ DUPLICATES converter logic
├── convertColorValue()        ❌ DUPLICATES ColorConverter
├── convertColorToRGBA()       ❌ DUPLICATES ColorConverter
├── convertNumericValue()      ❌ DUPLICATES DimensionConverter
└── convertLineHeight()        ❌ DUPLICATES TypographyConverter
```

**Impact**:
- 2x maintenance burden (fix bugs in 2 places)
- Inconsistent behavior (converters vs FigmaSyncService)
- ~500 lines of duplicate code

**Solution**:
```typescript
// FigmaSyncService.ts - Use existing converters
import { ColorConverter } from '../converters/ColorConverter';
import { TypographyConverter } from '../converters/TypographyConverter';
import { DimensionConverter } from '../converters/DimensionConverter';

export class FigmaSyncService {
  private colorConverter = new ColorConverter();
  private typographyConverter = new TypographyConverter();
  private dimensionConverter = new DimensionConverter();

  // REMOVE: convertColorValue, convertColorToRGBA, convertNumericValue, convertLineHeight
  // REPLACE with: this.colorConverter.toRGB(), this.dimensionConverter.toPixels(), etc.
}
```

**Estimated Reduction**: -500 lines in FigmaSyncService, -40% complexity

---

### 1.2 Error Message Duplication (MEDIUM PRIORITY)

**Problem**: Similar error messages repeated across services.

**Examples**:
```typescript
// Duplicated pattern across 15+ files
console.error('[ServiceName] Failed to X:', error.message);
console.warn('[ServiceName] Could not Y:', value);
```

**Solution**: Create centralized error message templates
```typescript
// src/shared/errors.ts
export const ErrorMessages = {
  PARSE_FAILED: (service: string, detail: string) =>
    `[${service}] Failed to parse: ${detail}`,
  CONVERSION_FAILED: (service: string, value: any) =>
    `[${service}] Could not convert value: ${typeof value}`,
  NOT_FOUND: (service: string, id: string) =>
    `[${service}] Not found: ${id}`,
};

// Usage
console.error(ErrorMessages.PARSE_FAILED('TokenProcessor', error.message));
```

**Estimated Reduction**: -50 lines, improved consistency

---

## Phase 2: Complexity Reduction

### 2.1 FigmaSyncService Refactoring (HIGH PRIORITY)

**Problem**: 1,229 lines, 29 methods, 98 if statements - too complex for SRP.

**Responsibilities Identified**:
1. Collection management (create/update collections)
2. Variable CRUD (create/update variables)
3. Value conversion (color, dimension, typography)
4. Style generation (text styles, effect styles)
5. Code syntax generation (CSS, Android, iOS)
6. Reference resolution coordination

**Current**: Single god class handling 6 responsibilities

**Solution**: Split into focused services

```typescript
// NEW: CollectionManager.ts (~200 lines)
export class CollectionManager {
  getOrCreateCollection(name: string): VariableCollection
  groupTokensByCollection(tokens: Token[]): Map<string, Token[]>
}

// NEW: VariableManager.ts (~300 lines)
export class VariableManager {
  createVariable(token: Token, collection: VariableCollection): Variable
  updateVariable(variable: Variable, token: Token): void
  setVariableValue(variable: Variable, value: any): void
  setVariableAlias(variable: Variable, targetId: string): void
}

// NEW: CodeSyntaxGenerator.ts (~150 lines)
export class CodeSyntaxGenerator {
  generateWebSyntax(token: Token): string
  generateAndroidSyntax(token: Token): string
  generateIOSSyntax(token: Token): string
}

// REFACTORED: FigmaSyncService.ts (~400 lines - 67% reduction)
export class FigmaSyncService {
  constructor(
    private collectionManager: CollectionManager,
    private variableManager: VariableManager,
    private syntaxGenerator: CodeSyntaxGenerator,
    private colorConverter: ColorConverter,
    private typographyConverter: TypographyConverter
  ) {}

  async syncTokens(tokens: Token[]): Promise<Result<SyncResult>> {
    // Orchestrate only - delegate to specialized services
    const byCollection = this.collectionManager.groupTokensByCollection(tokens);

    for (const [name, tokens] of byCollection) {
      const collection = this.collectionManager.getOrCreateCollection(name);

      for (const token of tokens) {
        const variable = this.variableManager.createVariable(token, collection);
        const value = this.convertTokenValue(token);
        this.variableManager.setVariableValue(variable, value);
        const syntax = this.syntaxGenerator.generateWebSyntax(token);
        variable.codeSyntax = { WEB: syntax };
      }
    }
  }
}
```

**Benefits**:
- Each service < 400 lines
- Single responsibility per service
- Easier to test (mock dependencies)
- Easier to understand (clear boundaries)

**Estimated Reduction**: -800 lines in FigmaSyncService (split into 3 new services)

---

### 2.2 Nested If Statement Simplification (MEDIUM PRIORITY)

**Problem**: Deep nesting (4-5 levels) in color/value conversion logic.

**Example** (current):
```typescript
private convertColorValue(value: any): RGB {
  if (typeof value === 'string') {
    if (value.startsWith('#')) {
      return this.hexToRgb(value);
    } else if (value.startsWith('rgb')) {
      return this.rgbStringToRgb(value);
    }
  } else if (typeof value === 'object') {
    if ('r' in value && 'g' in value && 'b' in value) {
      return this.normalizeRgb(value);
    } else if ('colorSpace' in value) {
      if (value.colorSpace === 'hsl') {
        if ('hex' in value) {
          return this.hexToRgb(value.hex);
        }
      }
    }
  }
  return { r: 0, g: 0, b: 0 };
}
```

**Solution**: Early returns + strategy pattern
```typescript
private convertColorValue(value: any): RGB {
  // Early returns
  if (typeof value === 'string') {
    if (value.startsWith('#')) return this.hexToRgb(value);
    if (value.startsWith('rgb')) return this.rgbStringToRgb(value);
  }

  if (typeof value !== 'object' || value === null) {
    return { r: 0, g: 0, b: 0 };
  }

  // Object handlers
  if ('r' in value) return this.normalizeRgb(value);
  if ('colorSpace' in value) return this.handleColorSpace(value);
  if ('components' in value) return this.handleComponents(value);

  return { r: 0, g: 0, b: 0 };
}
```

**Benefits**:
- Max nesting depth: 2 (down from 5)
- Easier to read (linear flow)
- Easier to add new formats

**Estimated Reduction**: -30% cyclomatic complexity in converters

---

### 2.3 Type Simplification (LOW PRIORITY)

**Problem**: 31 type definitions in shared/types.ts, some overly complex.

**Examples of complex types**:
```typescript
// Overly complex discriminated union (unused)
type TokenValue =
  | { type: 'color'; value: ColorValue }
  | { type: 'dimension'; value: DimensionValue }
  | { type: 'typography'; value: TypographyValue }
  // ... 15 more variants
```

**Solution**: Simplify or remove unused types
- Keep only actively used types
- Move type-specific definitions to their modules
- Document why each type exists

**Estimated Reduction**: -10 unused types, clearer type system

---

## Phase 3: Logging Simplification

### 3.1 Structured Logging with Levels (HIGH PRIORITY)

**Problem**: 130 console.warn/error + 125 debug.log statements with inconsistent formats.

**Current State**:
```typescript
// Inconsistent formats across files
console.error('[TokenProcessor] Failed to process:', error);
console.warn('[FigmaSyncService] Could not convert color value - type: string');
debug.log('[AppState] Token files updated: 5 files');
console.error('Sync failed:', message);  // Missing service prefix
```

**Solution**: Enhance logger with log levels
```typescript
// src/shared/logger.ts
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private serviceName: string;
  private minLevel: LogLevel = LogLevel.INFO;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  error(message: string, ...args: any[]): void {
    if (this.minLevel >= LogLevel.ERROR) {
      console.error(`[${this.serviceName}] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.minLevel >= LogLevel.WARN) {
      console.warn(`[${this.serviceName}] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.minLevel >= LogLevel.INFO && isFeatureEnabled('DEBUG_MODE')) {
      console.log(`[${this.serviceName}] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.minLevel >= LogLevel.DEBUG && isFeatureEnabled('DEBUG_MODE')) {
      console.log(`[${this.serviceName}] ${message}`, ...args);
    }
  }
}

export const createLogger = (serviceName: string) => new Logger(serviceName);

// Usage in services
const logger = createLogger('TokenProcessor');
logger.error('Failed to process tokens', error);
logger.warn('Token missing required field', token);
logger.info('Processing 50 tokens');
logger.debug('Token details:', token);
```

**Benefits**:
- Consistent format: `[ServiceName] message`
- Filterable by level (ERROR, WARN, INFO, DEBUG)
- Service name always included
- Single place to control logging behavior

**Migration**:
```typescript
// Before
console.error('[TokenProcessor] Failed:', error);
debug.log('[TokenProcessor] Processing:', count);

// After
logger.error('Failed to process tokens', error);
logger.info('Processing tokens', { count });
```

**Estimated Reduction**:
- All 255 log statements become consistent
- Easier to filter/disable logging by level
- Better debugging experience

---

### 3.2 Remove Redundant Logging (MEDIUM PRIORITY)

**Problem**: Logging same information multiple times in call chain.

**Example**:
```typescript
// Parent service
async processTokens(data: TokenData) {
  debug.log('[Parent] Starting processing');
  const result = await this.childService.parse(data);
  debug.log('[Parent] Processing complete');
}

// Child service
async parse(data: TokenData) {
  debug.log('[Child] Parsing tokens');  // ❌ Redundant
  const tokens = this.parseInternal(data);
  debug.log('[Child] Parsed', tokens.length);  // ❌ Redundant
  return tokens;
}
```

**Solution**: Log at boundaries only
```typescript
// Parent service - Log inputs/outputs
async processTokens(data: TokenData) {
  logger.info('Processing tokens', { fileCount: data.length });
  const result = await this.childService.parse(data);
  logger.info('Processing complete', { tokenCount: result.length });
}

// Child service - NO logging (internal implementation)
async parse(data: TokenData) {
  const tokens = this.parseInternal(data);
  return tokens;
}
```

**Rule**: Log at public API boundaries, not internal methods.

**Estimated Reduction**: -40% debug.log statements (-50 lines)

---

### 3.3 Error Context Standardization (LOW PRIORITY)

**Problem**: Errors lack context for debugging.

**Current**:
```typescript
console.error('Token not found');  // ❌ Which token? Which project?
```

**Solution**: Include context in all errors
```typescript
logger.error('Token not found', {
  tokenId: token.id,
  projectId: project.id,
  qualifiedName: token.qualifiedName,
});
```

**Benefits**:
- Faster debugging (all info in one log)
- No need for multiple log statements

---

## Phase 4: Architecture Cleanup

### 4.1 Remove Unused Visualizers (if not needed) (LOW PRIORITY)

**Question**: Are visualizers actually used in production?

**Current State**:
```
src/core/visualizers/  (6 files, ~23KB)
├── ColorVisualizer.ts
├── FontSizeVisualizer.ts
├── FontWeightVisualizer.ts
├── SpacingVisualizer.ts
├── BorderRadiusVisualizer.ts
└── DefaultVisualizer.ts
```

**Action Required**:
1. Verify usage in production
2. If only used in tests → Move to test utilities
3. If unused → Remove

**Estimated Reduction**: -23KB if unused, -6 files

---

### 4.2 Consolidate Utility Files (LOW PRIORITY)

**Problem**: Utilities scattered across directories.

**Current**:
```
src/utils/
├── htmlSanitizer.ts
├── BatchProcessor.ts
├── Base64Decoder.ts
└── parser.ts

src/shared/
├── utils.ts          ❌ Duplicate location
└── documentation-config.ts
```

**Solution**: Single utilities directory
```
src/utils/
├── sanitization/
│   └── htmlSanitizer.ts
├── processing/
│   └── BatchProcessor.ts
├── encoding/
│   └── Base64Decoder.ts
├── parsing/
│   └── parser.ts
└── data/
    └── deepClone.ts  (moved from shared/utils.ts)
```

**Benefits**:
- Clear organization
- No confusion about where utilities go
- Easier to find utilities

---

### 4.3 Service Registry Simplification (LOW PRIORITY)

**Problem**: Registries might be over-engineered for current needs.

**Current State**:
```
TokenFormatRegistry (2 strategies registered)
FileSourceRegistry (2 sources registered)
TokenVisualizerRegistry (6 visualizers registered)
```

**Question**: Do we actually need dynamic registration, or is it premature optimization?

**Analysis Needed**:
- Are strategies/sources added at runtime? NO
- Are they configurable by users? NO
- Are there plans for plugins? NO

**Possible Simplification**:
```typescript
// Instead of registry pattern
export class TokenFormatDetector {
  private strategies = [
    new W3CTokenFormatStrategy(),
    new StyleDictionaryFormatStrategy(),
  ];

  detect(data: TokenData): ITokenFormatStrategy | null {
    for (const strategy of this.strategies) {
      if (strategy.detectFormat(data) >= 50) return strategy;
    }
    return null;
  }
}
```

**Trade-offs**:
- ✅ Simpler (no registry abstraction)
- ❌ Less extensible (but extensibility not currently needed)

**Decision**: Keep registries (good architecture), but document why they exist.

---

## Phase 5: Testing & Documentation Cleanup

### 5.1 Test Organization (LOW PRIORITY)

**Problem**: Tests scattered (__tests__ folders in every directory).

**Current**:
```
src/core/services/__tests__/
src/core/adapters/__tests__/
src/core/converters/__tests__/
src/utils/__tests__/
```

**Alternative** (optional):
```
tests/
├── unit/
│   ├── services/
│   ├── adapters/
│   └── converters/
└── integration/
    └── sync-flow.test.ts
```

**Benefits**:
- Clearer separation
- Easier to run unit vs integration tests
- Tests don't pollute source directories

**Trade-off**: Further from source code (co-location is good)

**Recommendation**: Keep current structure (co-location is valuable)

---

### 5.2 JSDoc Standardization (LOW PRIORITY)

**Problem**: Inconsistent JSDoc coverage.

**Solution**: Enforce JSDoc on all public APIs
```typescript
/**
 * Syncs tokens to Figma variables
 *
 * @param tokens - Array of tokens to sync
 * @param options - Sync options (updateExisting, preserveScopes, etc.)
 * @returns Result containing sync statistics or error message
 *
 * @example
 * ```typescript
 * const result = await service.syncTokens(tokens, { updateExisting: true });
 * if (result.success) {
 *   console.log('Synced', result.data.stats.added, 'tokens');
 * }
 * ```
 */
async syncTokens(tokens: Token[], options?: SyncOptions): Promise<Result<SyncResult>>
```

**Tool**: Use ESLint rule `require-jsdoc` for enforcement

---

## Implementation Priority

### High Priority (Do First)
1. **Converter Duplication** - Biggest complexity win
2. **FigmaSyncService Refactoring** - Largest file, highest complexity
3. **Structured Logging** - Improves debugging immediately

**Estimated Impact**: -1,300 lines, -50% complexity in FigmaSyncService

---

### Medium Priority (Do Second)
1. **Error Message Duplication** - Small win, easy to do
2. **Nested If Simplification** - Readability improvement
3. **Remove Redundant Logging** - Cleaner logs

**Estimated Impact**: -100 lines, +20% readability

---

### Low Priority (Do Later)
1. **Type Simplification** - Nice to have
2. **Unused Visualizers** - Verify first
3. **Utility Consolidation** - Organization only
4. **JSDoc Standardization** - Documentation only

**Estimated Impact**: -50 lines, better organization

---

## Success Metrics

**Before Optimization**:
- FigmaSyncService: 1,229 lines, 29 methods, 98 if statements
- Console logging: 255 statements (inconsistent formats)
- Duplicate conversion logic: 2 implementations
- Bundle size: 420KB

**After Optimization** (estimated):
- FigmaSyncService: ~400 lines, 12 methods, 40 if statements
- Console logging: 200 statements (consistent format, structured levels)
- Conversion logic: Single implementation (converters)
- Bundle size: 400KB (-5%)

**Code Quality**:
- Cyclomatic complexity: -40%
- DRY violations: 0 (removed duplicates)
- SOLID score: 9.5/10 (improved SRP in FigmaSyncService)
- Maintainability index: +30%

---

## Risk Assessment

### Low Risk Changes
- Converter consolidation (well-tested)
- Logging improvements (no behavior change)
- Error message standardization (cosmetic)

### Medium Risk Changes
- FigmaSyncService refactoring (large change, needs thorough testing)
- Nested if simplification (logic changes, needs validation)

### High Risk Changes
- None (not touching core features)

---

## Testing Strategy

1. **Before refactoring**: Run full test suite, ensure 100% pass
2. **During refactoring**: Write tests for new services first (TDD)
3. **After refactoring**: Run full test suite, ensure 100% pass
4. **Integration tests**: Test full sync flow end-to-end
5. **Bundle verification**: Ensure no ES2019+ features introduced

---

## Timeline Estimate

**Phase 1 (Duplication)**: 2-3 days
- Converter consolidation: 1 day
- Error message templates: 0.5 day
- Testing: 0.5 day

**Phase 2 (Complexity)**: 4-5 days
- FigmaSyncService split: 2 days
- Nested if simplification: 1 day
- Testing: 1-2 days

**Phase 3 (Logging)**: 1-2 days
- Structured logger: 0.5 day
- Migration: 0.5 day
- Testing: 0.5 day

**Total**: 7-10 days for high + medium priority items

---

## Maintenance Plan

**After optimization**:

1. **Enforce standards** via ESLint rules:
   - Max function length: 50 lines
   - Max cyclomatic complexity: 10
   - Max nesting depth: 3
   - Require JSDoc on public APIs

2. **Code review checklist**:
   - ✅ No duplicate logic
   - ✅ Uses structured logger
   - ✅ Single responsibility
   - ✅ Max 400 lines per file
   - ✅ ES2017 compliant

3. **Automated checks**:
   - Bundle size limit: 450KB
   - Test coverage: 85%+
   - No ES2019+ features in bundle

---

## Questions for Decision

1. **Visualizers**: Are they used in production or only tests?
2. **Registries**: Keep pattern or simplify to direct instantiation?
3. **Test location**: Keep __tests__ co-located or move to /tests/?
4. **Type complexity**: Which types are actually used?

---

## Conclusion

This plan focuses on **reducing complexity without changing behavior**:

- ✅ Eliminate duplication (converters)
- ✅ Simplify large files (FigmaSyncService)
- ✅ Standardize logging (structured logger)
- ✅ Improve readability (flatten nesting)
- ✅ Better organization (utilities)

**Net Result**:
- ~1,400 lines removed
- 40% complexity reduction
- 100% consistent logging
- 0 feature changes
- Easier maintenance

All changes are **low/medium risk** and **fully testable**.

# Figma Tokens Reader - Improvement Plan with Regression Protection

**Date**: 2025-11-16
**Purpose**: Phased improvement plan with zero regression guarantee
**Current Status**: 311 passing tests, 15 test suites

---

## Table of Contents
1. [Current Working Features (Protected)](#current-working-features-protected)
2. [Identified Issues (To Fix)](#identified-issues-to-fix)
3. [Regression Protection Strategy](#regression-protection-strategy)
4. [Phased Implementation Plan](#phased-implementation-plan)
5. [Testing Strategy](#testing-strategy)
6. [Rollback Plan](#rollback-plan)

---

## Current Working Features (Protected)

### ✅ Features That MUST NOT Regress

#### 1. Token Import Pipeline
**Status**: ✅ WORKING (85%+ test coverage)

**What Works**:
- GitHub file source: Fetches files from repositories
- Local file source: Uploads JSON files
- Format auto-detection: W3C and Style Dictionary
- Base64 decoding: GitHub API content
- Parallel file fetching: 6x faster (BatchProcessor)
- Token parsing: Recursive tree traversal
- Token repository: In-memory storage with indexing

**Tests Protecting This**:
```
✅ GitHubFileSource.test.ts
✅ LocalFileSource.test.ts
✅ W3CTokenFormatStrategy.test.ts
✅ StyleDictionaryFormatStrategy.test.ts
✅ TokenFormatRegistry.test.ts
✅ FileSourceRegistry.test.ts
✅ TokenProcessor.test.ts
✅ TokenRepository.test.ts
✅ Base64Decoder.test.ts
✅ BatchProcessor.test.ts
✅ FileClassifier.test.ts
```

**Regression Risk**: LOW
- Well-tested with 311 passing tests
- No changes planned to core parsing logic
- Only adding options, not modifying behavior

**Protection**:
- Keep all existing tests passing
- Add new tests for new options
- Do NOT modify TokenProcessor parsing logic

---

#### 2. Top-Level Token Resolution
**Status**: ✅ WORKING (TokenResolver tested)

**What Works**:
- Alias resolution: `{token.reference}` → actual value
- Topological sort: Resolves dependencies in correct order
- Circular reference detection: Logs and handles gracefully
- Three-tier caching: Exact, normalized, fuzzy matching
- Reference normalization: `color.primary` = `color/primary`

**Tests Protecting This**:
```
✅ TokenResolver.test.ts
   - Simple alias resolution
   - Chained aliases (A→B→C)
   - Circular reference detection
   - Case-insensitive matching
   - Fuzzy matching
```

**Regression Risk**: MEDIUM
- Improvements will modify resolution logic
- BUT: Only extending, not replacing

**Protection**:
- All existing TokenResolver tests MUST pass
- Add new tests for cross-project resolution
- Feature flag for new behavior: `enableCrossProjectRefs`
- Default: OFF (current behavior)

---

#### 3. Figma Variable Sync (Simple Types)
**Status**: ✅ WORKING

**What Works**:
- Collection creation/reuse
- Variable type mapping: color→COLOR, dimension→FLOAT, etc.
- Value conversion: Hex→RGB, rem→px, %→number
- Variable creation/update
- Scope assignment
- Code syntax generation

**Tests Protecting This**:
```
✅ FigmaSyncService.test.ts
   - Collection management
   - Variable creation
   - Type mapping
   - Value conversion
```

**Regression Risk**: LOW
- No planned changes to simple variable sync
- Improvements target composite tokens only

**Protection**:
- Keep all variable sync tests passing
- Do NOT modify conversion functions
- Only add new options, not change defaults

---

#### 4. Unit Conversions
**Status**: ✅ WORKING

**What Works**:
- Hex color → RGB 0-1
- rem/em → pixels (base 16)
- % → pixels (percentageBase)
- Unitless line height → PERCENT
- px line height → PIXELS
- Letter spacing → PIXELS

**Functions Protected**:
```typescript
convertColorToRGBA(color: any): RGBA
convertNumericValue(value: any, percentageBase: number): number
convertLineHeight(value: any, percentageBase: number): LineHeight
```

**Regression Risk**: VERY LOW
- Pure functions with clear inputs/outputs
- Well-tested
- No changes planned

**Protection**:
- Do NOT modify these functions
- Keep exact test coverage
- Add tests only for new edge cases

---

#### 5. Diagnostic Logging
**Status**: ✅ WORKING (recently added)

**What Works**:
- Collapsible console groups
- Project mismatch detection
- Naming issue detection
- Missing token detection
- Typography validation summaries
- Shadow validation summaries
- Font error summaries

**Regression Risk**: VERY LOW
- Recently added, well-structured
- No changes planned

**Protection**:
- Keep logging format consistent
- Add new diagnostics only
- Do NOT remove existing logs

---

### ⚠️ Features With Known Limitations (Not Broken)

#### 1. Text Style Creation
**Status**: ⚠️ WORKS BUT LIMITED

**What Works**:
- Font loading (with fallback to Regular)
- Font weight mapping
- Font stack parsing (first font only)
- Line height conversion
- Letter spacing conversion

**Known Limitation**:
- ❌ Nested references only resolve in SAME project
- This is BY DESIGN (current constraint)
- Not a bug, just a limitation

**NO REGRESSION**: This limitation is documented and expected

---

#### 2. Effect Style Creation
**Status**: ⚠️ WORKS BUT LIMITED

**What Works**:
- Shadow type detection (drop vs inner)
- Color conversion with alpha
- Dimension conversion

**Known Limitation**:
- ❌ Color references only resolve in SAME project
- This is BY DESIGN (current constraint)

**NO REGRESSION**: This limitation is documented and expected

---

## Identified Issues (To Fix)

### 🐛 Issue #1: Project ID Scoping Prevents Cross-File References

**Current Behavior**:
```
primitives.json → projectId = "primitive" (hash of import session)
semantic.json   → projectId = "default" (different import session)

Result: semantic can't reference primitive → Unresolved refs → Defaults
```

**Impact**: HIGH (Root cause of 12px/AUTO issue)

**NOT a Regression**: This is current expected behavior
- System working as designed (project-scoped)
- Just insufficient for multi-file use case

**Fix**: Add cross-project resolution with opt-in flag

---

### 🐛 Issue #2: No Control Over Project ID Assignment

**Current Behavior**:
```
projectId = auto-assigned based on import session
Users can't control which project tokens go into
```

**Impact**: MEDIUM (Causes Issue #1)

**NOT a Regression**: This is current behavior
- No UI for project selection
- No API for explicit projectId

**Fix**: Add project ID options to UI

---

### 🐛 Issue #3: No Validation Before Sync

**Current Behavior**:
```
Sync attempts even with unresolved refs
Styles created with defaults
Errors logged DURING sync (too late)
```

**Impact**: MEDIUM (Poor UX)

**NOT a Regression**: This is how it currently works
- No pre-sync validation exists

**Fix**: Add validation step before sync

---

## Regression Protection Strategy

### 1. Test Coverage Requirements

**Rule**: All existing tests MUST pass before any commit

**Current Baseline**:
```
Test Suites: 14 passed, 15 total
Tests:       311 passing
Coverage:    85-100% on tested modules
```

**Regression Definition**:
```
❌ REGRESSION = Any existing test fails
❌ REGRESSION = Test coverage drops below 85%
❌ REGRESSION = Existing feature stops working
```

**Prevention**:
```bash
# Before EVERY commit:
npm test                 # All tests must pass
npm run test:coverage    # Coverage must be >= 85%

# CI/CD enforcement (recommended):
git push → triggers tests → fails if any test fails
```

---

### 2. Feature Flags for New Behavior

**Strategy**: New features default to OFF

**Implementation**:
```typescript
interface SyncOptions {
  // Existing options (DO NOT CHANGE defaults)
  updateExisting?: boolean;     // default: true ✅
  preserveScopes?: boolean;     // default: true ✅
  createStyles?: boolean;       // default: true ✅
  percentageBase?: number;      // default: 16 ✅

  // NEW options (default: OFF for safety)
  enableCrossProjectRefs?: boolean;   // default: false (NEW)
  validateBeforeSync?: boolean;       // default: false (NEW)
  explicitProjectId?: string;         // default: undefined (NEW)
}
```

**Guarantees**:
- Existing code with no options → Same behavior ✅
- New features require explicit opt-in → No surprise changes ✅
- Rollback = Remove flag → Back to old behavior ✅

---

### 3. Backward Compatibility

**Rule**: Never break existing API contracts

**Protected Interfaces**:
```typescript
// DO NOT CHANGE signatures:
class TokenRepository {
  add(tokens: Token[]): void;              // ✅ Keep
  get(id: string): Token | undefined;      // ✅ Keep
  getByProject(projectId: string): Token[]; // ✅ Keep
  // Can ADD new methods, can't CHANGE existing
}

class TokenResolver {
  resolveAllTokens(projectId: string): Promise<Map<string, TokenValue>>; // ✅ Keep
  resolveReference(reference: string, projectId: string): Token | null;   // ✅ Keep
  // Can ADD new methods, can't CHANGE existing
}

class FigmaSyncService {
  syncTokens(tokens: Token[], options?: SyncOptions): Promise<Result<SyncResult>>; // ✅ Keep
  // Can ADD new methods, can't CHANGE signature
}
```

**Allowed Changes**:
- ✅ Add new optional parameters
- ✅ Add new methods
- ✅ Add new properties to interfaces (optional)
- ❌ Change return types
- ❌ Change required parameters
- ❌ Remove methods
- ❌ Remove properties

---

### 4. Defensive Programming

**Strategy**: Validate inputs, handle errors gracefully

**Pattern**:
```typescript
// BEFORE (risky):
function newFeature(token: Token) {
  const resolved = resolveInAllProjects(token);  // Might fail
  return resolved;
}

// AFTER (safe):
function newFeature(token: Token, options: { enableNew?: boolean } = {}) {
  // Feature flag check
  if (!options.enableNew) {
    return existingBehavior(token);  // ✅ Fallback to old
  }

  // Try new behavior with error handling
  try {
    const resolved = resolveInAllProjects(token);
    return resolved;
  } catch (error) {
    console.error(`[NewFeature] Failed:`, error.message);
    return existingBehavior(token);  // ✅ Fallback on error
  }
}
```

**Guarantees**:
- Feature flag OFF → Old behavior ✅
- Feature flag ON + Error → Old behavior (safe fallback) ✅
- No unexpected crashes ✅

---

### 5. Comprehensive Testing for New Features

**Rule**: New features require >= 90% test coverage

**Test Requirements**:
```typescript
// For each new feature:
describe('NewFeature', () => {
  describe('Feature Flag OFF (default)', () => {
    test('should use old behavior', () => {
      // Verify exact same behavior as before
    });
  });

  describe('Feature Flag ON', () => {
    describe('Happy Path', () => {
      test('should work with valid inputs', () => {
        // New feature works
      });
    });

    describe('Edge Cases', () => {
      test('should handle empty input', () => {});
      test('should handle null values', () => {});
      test('should handle circular refs', () => {});
    });

    describe('Error Cases', () => {
      test('should fallback on error', () => {
        // Error → Old behavior
      });
      test('should log error message', () => {});
    });

    describe('Backward Compatibility', () => {
      test('should not break existing behavior', () => {
        // Run old tests with new code
      });
    });
  });
});
```

**Minimum Tests per Feature**: 6-10 tests

---

## Phased Implementation Plan

### Phase 0: Pre-Implementation (MANDATORY)

**Goal**: Establish safety net BEFORE any changes

**Tasks**:
1. ✅ Run full test suite: `npm test`
2. ✅ Verify all 311 tests pass
3. ✅ Generate coverage report: `npm run test:coverage`
4. ✅ Document current coverage baseline
5. ✅ Create git branch: `feature/cross-project-resolution`
6. ✅ Commit: "chore: Baseline before improvements"

**Success Criteria**:
- All tests green ✅
- Coverage >= 85% ✅
- Clean git state ✅

**Estimated Time**: 30 minutes

---

### Phase 1: Add Unified Project ID Assignment (LOW RISK)

**Goal**: Give users control over projectId without changing defaults

**Risk Level**: 🟢 LOW
- Only ADDS options, doesn't change behavior
- No impact if options not used
- Easy to test

**Changes**:
1. Add `explicitProjectId` option to `TokenProcessor`
2. Add UI dropdown: "Import into project: [default | primitive | custom]"
3. If option provided → Use it, else → Current auto-assignment

**Code Changes**:
```typescript
// TokenProcessor.ts
interface ProcessOptions {
  explicitProjectId?: string;  // NEW
}

parseTokens(data: any, options: ProcessOptions = {}): Token[] {
  const projectId = options.explicitProjectId || this.generateProjectId();
  // Rest unchanged
}
```

**Tests Required** (NEW):
```typescript
describe('Explicit Project ID', () => {
  test('should use explicit projectId when provided', () => {
    const result = processor.parseTokens(data, { explicitProjectId: 'custom' });
    expect(result[0].projectId).toBe('custom');
  });

  test('should auto-assign when not provided', () => {
    const result = processor.parseTokens(data);
    expect(result[0].projectId).toMatch(/^[a-f0-9]{8}$/); // Hash pattern
  });

  test('should use same projectId for all tokens', () => {
    const result = processor.parseTokens(data, { explicitProjectId: 'unified' });
    const projectIds = new Set(result.map(t => t.projectId));
    expect(projectIds.size).toBe(1);
    expect(projectIds.has('unified')).toBe(true);
  });
});
```

**Regression Tests** (RUN EXISTING):
- ✅ All TokenProcessor.test.ts tests MUST still pass
- ✅ All token parsing tests MUST still pass

**Success Criteria**:
- New tests: 3+ tests, all passing ✅
- Existing tests: 311 tests, all passing ✅
- No behavior change when option not used ✅

**Estimated Time**: 2 hours

**Commit**: "feat: Add explicit projectId option to TokenProcessor"

---

### Phase 2: Add Cross-Project Reference Resolution (MEDIUM RISK)

**Goal**: Enable references across project boundaries with opt-in flag

**Risk Level**: 🟡 MEDIUM
- Modifies resolution logic (core feature)
- Must not break existing resolution
- Feature flag protects existing behavior

**Changes**:
1. Add `enableCrossProjectRefs` option to `SyncOptions`
2. Modify `TokenResolver.resolveReference()`:
   - If flag OFF → Current behavior (project-scoped)
   - If flag ON → Fallback to global search
3. Add warning when cross-project ref found

**Code Changes**:
```typescript
// TokenResolver.ts
resolveReference(
  reference: string,
  projectId: string,
  options: { enableCrossProjectRefs?: boolean } = {}
): Token | null {
  // 1. Try project scope (EXISTING)
  const projectMatch = this.repository.getByQualifiedName(projectId, cleanRef);
  if (projectMatch) {
    return projectMatch;
  }

  // 2. NEW: Try global search if enabled
  if (options.enableCrossProjectRefs) {
    const allTokens = this.repository.getAll();
    const globalMatch = allTokens.find(t => t.qualifiedName === cleanRef);

    if (globalMatch) {
      console.warn(
        `[TokenResolver] Cross-project reference: "${cleanRef}" ` +
        `found in project "${globalMatch.projectId}" (expected: "${projectId}")`
      );
      return globalMatch;
    }
  }

  // 3. Not found (EXISTING)
  return null;
}
```

**Tests Required** (NEW):
```typescript
describe('Cross-Project Resolution', () => {
  describe('Flag OFF (default)', () => {
    test('should NOT resolve cross-project refs', () => {
      // Token A in project "primitive"
      // Token B in project "default" refs A
      const resolved = resolver.resolveReference('{A}', 'default');
      expect(resolved).toBeNull();  // Current behavior
    });
  });

  describe('Flag ON', () => {
    test('should resolve cross-project refs', () => {
      const resolved = resolver.resolveReference(
        '{A}',
        'default',
        { enableCrossProjectRefs: true }
      );
      expect(resolved).not.toBeNull();
      expect(resolved.projectId).toBe('primitive');
    });

    test('should log warning for cross-project refs', () => {
      const spy = jest.spyOn(console, 'warn');
      resolver.resolveReference('{A}', 'default', { enableCrossProjectRefs: true });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Cross-project reference'));
    });

    test('should prefer same-project match over global', () => {
      // Token "color.primary" exists in BOTH projects
      const resolved = resolver.resolveReference(
        '{color.primary}',
        'default',
        { enableCrossProjectRefs: true }
      );
      expect(resolved.projectId).toBe('default');  // Same project wins
    });
  });

  describe('Backward Compatibility', () => {
    test('should work exactly as before when flag not provided', () => {
      // Run ALL existing TokenResolver tests
      // Verify NO behavior change
    });
  });
});
```

**Regression Tests** (RUN EXISTING):
- ✅ All TokenResolver.test.ts tests MUST still pass
- ✅ Verify same-project resolution still works
- ✅ Verify circular detection still works

**Success Criteria**:
- New tests: 6+ tests, all passing ✅
- Existing tests: 311+ tests, all passing ✅
- Flag OFF → Exact same behavior ✅
- Flag ON → Cross-project works ✅

**Estimated Time**: 4 hours

**Commit**: "feat: Add cross-project reference resolution with opt-in flag"

---

### Phase 3: Add Pre-Sync Validation (LOW RISK)

**Goal**: Validate tokens before sync to catch issues early

**Risk Level**: 🟢 LOW
- Adds new validation step (doesn't change sync)
- Runs BEFORE sync (no impact if user proceeds anyway)
- Pure addition, no modification

**Changes**:
1. Add `validateBeforeSync` option to `SyncOptions`
2. Create `validateTokens()` method in `FigmaSyncService`
3. If validation fails → Show UI confirmation
4. User can choose: Fix tokens OR Sync anyway

**Code Changes**:
```typescript
// FigmaSyncService.ts
interface ValidationError {
  tokenId: string;
  tokenName: string;
  type: 'unresolved-ref' | 'invalid-value' | 'missing-font';
  message: string;
  unresolvedRefs?: string[];
  suggestion?: string;
}

interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

validateTokens(
  tokens: Token[],
  options: { enableCrossProjectRefs?: boolean } = {}
): ValidationReport {
  const report: ValidationReport = {
    valid: true,
    errors: [],
    warnings: []
  };

  for (const token of tokens) {
    // Validate composite tokens (typography, shadow)
    if (token.type === 'typography' || token.type === 'shadow') {
      const unresolvedRefs = this.findUnresolvedReferences(
        token.value,
        token.projectId,
        options
      );

      if (unresolvedRefs.length > 0) {
        report.valid = false;
        report.errors.push({
          tokenId: token.id,
          tokenName: token.qualifiedName,
          type: 'unresolved-ref',
          message: `${unresolvedRefs.length} unresolved reference(s)`,
          unresolvedRefs: unresolvedRefs,
          suggestion: this.suggestFix(unresolvedRefs)
        });
      }
    }
  }

  return report;
}

// In syncTokens():
async syncTokens(tokens: Token[], options?: SyncOptions): Promise<Result<SyncResult>> {
  const opts = { validateBeforeSync: false, ...options };

  // NEW: Pre-sync validation
  if (opts.validateBeforeSync) {
    const validation = this.validateTokens(tokens, opts);

    if (!validation.valid) {
      console.group('⚠️  VALIDATION ERRORS');
      validation.errors.forEach(err => {
        console.error(`❌ ${err.tokenName}: ${err.message}`);
        if (err.unresolvedRefs) {
          err.unresolvedRefs.forEach(ref => console.error(`   ${ref}`));
        }
        if (err.suggestion) {
          console.error(`   💡 ${err.suggestion}`);
        }
      });
      console.groupEnd();

      // Return validation errors (user can decide)
      return Failure(`Validation failed: ${validation.errors.length} errors found`);
    }
  }

  // Continue with sync (EXISTING)
  // ...
}
```

**Tests Required** (NEW):
```typescript
describe('Pre-Sync Validation', () => {
  describe('Flag OFF (default)', () => {
    test('should skip validation', async () => {
      const spy = jest.spyOn(service, 'validateTokens');
      await service.syncTokens(tokens);
      expect(spy).not.toHaveBeenCalled();
    });

    test('should sync even with invalid tokens', async () => {
      // Tokens with unresolved refs
      const result = await service.syncTokens(invalidTokens);
      expect(result.success).toBe(true);  // Syncs anyway (current behavior)
    });
  });

  describe('Flag ON', () => {
    test('should validate before sync', async () => {
      const spy = jest.spyOn(service, 'validateTokens');
      await service.syncTokens(tokens, { validateBeforeSync: true });
      expect(spy).toHaveBeenCalled();
    });

    test('should return error if validation fails', async () => {
      const result = await service.syncTokens(invalidTokens, { validateBeforeSync: true });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    test('should provide detailed error report', async () => {
      const validation = service.validateTokens(invalidTokens);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toHaveProperty('tokenName');
      expect(validation.errors[0]).toHaveProperty('unresolvedRefs');
    });

    test('should sync valid tokens', async () => {
      const result = await service.syncTokens(validTokens, { validateBeforeSync: true });
      expect(result.success).toBe(true);
    });
  });
});
```

**Regression Tests** (RUN EXISTING):
- ✅ All FigmaSyncService.test.ts tests MUST still pass
- ✅ Sync behavior unchanged when flag OFF

**Success Criteria**:
- New tests: 5+ tests, all passing ✅
- Existing tests: 311+ tests, all passing ✅
- Validation detects unresolved refs ✅
- Validation doesn't block sync when flag OFF ✅

**Estimated Time**: 3 hours

**Commit**: "feat: Add pre-sync validation with opt-in flag"

---

### Phase 4: Add Sync State Tracking (LOW RISK)

**Goal**: Track which tokens are synced to which Figma objects

**Risk Level**: 🟢 LOW
- Adds new data storage (doesn't change sync)
- Stores in plugin data (persistent)
- Pure addition, no modification

**Changes**:
1. Create `SyncState` interface
2. Store in `figma.root.setPluginData('syncState', ...)`
3. Update after each sync
4. Use for future optimizations (skip unchanged)

**Code Changes**:
```typescript
// SyncState.ts (NEW FILE)
interface SyncedVariable {
  tokenId: string;
  variableId: string;
  variableName: string;
  collectionId: string;
  collectionName: string;
  status: 'created' | 'updated' | 'skipped';
  lastSynced: string;  // ISO timestamp
  valueHash: string;   // hash(JSON.stringify(resolvedValue))
}

interface SyncedStyle {
  tokenId: string;
  styleId: string;
  styleName: string;
  styleType: 'TEXT' | 'EFFECT';
  status: 'created' | 'updated' | 'skipped' | 'error';
  error?: string;
  lastSynced: string;
  valueHash: string;
}

interface SyncState {
  variables: Map<string, SyncedVariable>;
  styles: Map<string, SyncedStyle>;
  lastSync: string;
  version: string;  // Plugin version
}

class SyncStateManager {
  private static STORAGE_KEY = 'syncState';

  static load(): SyncState | null {
    const data = figma.root.getPluginData(this.STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  }

  static save(state: SyncState): void {
    figma.root.setPluginData(this.STORAGE_KEY, JSON.stringify(state));
  }

  static recordVariable(variable: Variable, token: Token, status: string): void {
    const state = this.load() || this.createEmpty();

    state.variables.set(token.id, {
      tokenId: token.id,
      variableId: variable.id,
      variableName: variable.name,
      collectionId: variable.variableCollectionId,
      collectionName: token.collection,
      status: status as any,
      lastSynced: new Date().toISOString(),
      valueHash: this.hashValue(token.resolvedValue)
    });

    this.save(state);
  }

  static recordStyle(style: TextStyle | EffectStyle, token: Token, status: string): void {
    // Similar to recordVariable
  }

  static hasChanged(token: Token): boolean {
    const state = this.load();
    if (!state) return true;  // No history = treat as new

    const synced = state.variables.get(token.id) || state.styles.get(token.id);
    if (!synced) return true;  // Not synced before

    const currentHash = this.hashValue(token.resolvedValue);
    return synced.valueHash !== currentHash;
  }

  private static hashValue(value: any): string {
    return crypto.createHash('md5').update(JSON.stringify(value)).digest('hex');
  }

  private static createEmpty(): SyncState {
    return {
      variables: new Map(),
      styles: new Map(),
      lastSync: new Date().toISOString(),
      version: '1.1.0'
    };
  }
}
```

**Integration**:
```typescript
// In FigmaSyncService.syncTokens():
// After creating/updating variable:
SyncStateManager.recordVariable(variable, token, 'created');

// After creating/updating style:
SyncStateManager.recordStyle(style, token, 'created');
```

**Tests Required** (NEW):
```typescript
describe('SyncStateManager', () => {
  beforeEach(() => {
    // Mock figma.root.setPluginData / getPluginData
  });

  test('should save sync state', () => {
    const state: SyncState = { ... };
    SyncStateManager.save(state);
    expect(figma.root.setPluginData).toHaveBeenCalled();
  });

  test('should load sync state', () => {
    const state = SyncStateManager.load();
    expect(state).not.toBeNull();
  });

  test('should record variable sync', () => {
    SyncStateManager.recordVariable(variable, token, 'created');
    const state = SyncStateManager.load();
    expect(state.variables.has(token.id)).toBe(true);
  });

  test('should detect value changes', () => {
    // First sync
    SyncStateManager.recordVariable(variable, token, 'created');
    expect(SyncStateManager.hasChanged(token)).toBe(false);

    // Change token value
    token.resolvedValue = 'new value';
    expect(SyncStateManager.hasChanged(token)).toBe(true);
  });

  test('should persist across plugin reloads', () => {
    SyncStateManager.recordVariable(variable, token, 'created');

    // Simulate reload: clear memory, reload from storage
    const reloaded = SyncStateManager.load();
    expect(reloaded.variables.has(token.id)).toBe(true);
  });
});
```

**Regression Tests** (RUN EXISTING):
- ✅ All sync tests MUST still pass
- ✅ Sync behavior unchanged (just records state)

**Success Criteria**:
- New tests: 5+ tests, all passing ✅
- Existing tests: 311+ tests, all passing ✅
- State persists across reloads ✅
- No impact on sync behavior ✅

**Estimated Time**: 3 hours

**Commit**: "feat: Add sync state tracking with persistent storage"

---

## Testing Strategy

### 1. Unit Tests (Existing + New)

**Requirement**: All unit tests must pass

**Command**: `npm test`

**Coverage Target**: >= 85%

**New Tests Required**:
- Phase 1: +3 tests (explicit projectId)
- Phase 2: +6 tests (cross-project resolution)
- Phase 3: +5 tests (pre-sync validation)
- Phase 4: +5 tests (sync state tracking)

**Total New Tests**: +19 tests

**Expected Final Count**: 311 + 19 = 330 tests

---

### 2. Integration Tests (Manual)

**Requirement**: Test real-world scenarios

**Test Cases**:

#### Test Case 1: Multi-File Import with Unified ProjectId
```
GIVEN:
- primitives.json with color tokens
- semantic.json with references to primitives

WHEN:
- Import primitives.json with projectId="design-system"
- Import semantic.json with projectId="design-system"
- Sync with enableCrossProjectRefs=true

THEN:
- All references resolve ✅
- Typography tokens have correct font sizes ✅
- Shadow tokens have correct colors ✅
- No "12px, AUTO" defaults ✅
```

#### Test Case 2: Backward Compatibility
```
GIVEN:
- Existing token files from v1.0

WHEN:
- Import without new options
- Sync without new flags

THEN:
- Same behavior as v1.0 ✅
- All variables created ✅
- All styles created ✅
- No errors ✅
```

#### Test Case 3: Validation Prevents Bad Sync
```
GIVEN:
- semantic.json with broken references

WHEN:
- Sync with validateBeforeSync=true

THEN:
- Validation fails with clear errors ✅
- Sync does not proceed ✅
- Error messages helpful ✅
```

#### Test Case 4: State Tracking
```
GIVEN:
- Tokens synced in previous session

WHEN:
- Reload plugin
- Check sync state

THEN:
- State persists ✅
- Can detect which tokens synced ✅
- Can detect value changes ✅
```

---

### 3. Regression Test Suite

**Requirement**: Verify no existing features broken

**Test Plan**:

1. **Import Tests** (Existing Features)
   - [ ] GitHub import works
   - [ ] Local upload works
   - [ ] Format auto-detection works
   - [ ] W3C parsing works
   - [ ] Style Dictionary parsing works
   - [ ] Parallel fetching works (6x faster)

2. **Resolution Tests** (Existing Features)
   - [ ] Simple aliases resolve
   - [ ] Chained aliases resolve
   - [ ] Circular refs detected
   - [ ] Case-insensitive matching works
   - [ ] Fuzzy matching works

3. **Variable Sync Tests** (Existing Features)
   - [ ] Color variables created
   - [ ] Dimension variables created
   - [ ] Collections created
   - [ ] Hex → RGB conversion correct
   - [ ] rem → px conversion correct
   - [ ] Scopes assigned correctly

4. **Style Creation Tests** (Existing Features)
   - [ ] Text styles created
   - [ ] Font loading works (with fallback)
   - [ ] Line height conversion correct
   - [ ] Effect styles created
   - [ ] Shadow colors with alpha work

5. **Diagnostic Tests** (Existing Features)
   - [ ] Collapsible console groups work
   - [ ] Project mismatch detected
   - [ ] Missing tokens detected
   - [ ] Font errors logged

**Execution**: Run after EACH phase completion

**Pass Criteria**: All checklist items ✅

---

## Rollback Plan

### Scenario 1: Phase Fails Tests

**Trigger**: Any test fails after phase implementation

**Action**:
```bash
# Revert phase commits
git reset --hard HEAD~1  # Undo last commit

# Or revert specific commit
git revert <commit-hash>

# Re-run tests
npm test

# Verify: All 311 baseline tests pass
```

**Recovery Time**: < 5 minutes

---

### Scenario 2: Integration Tests Fail

**Trigger**: Manual testing reveals issue

**Action**:
1. Document failing scenario
2. Add unit test to reproduce
3. Fix code until test passes
4. Re-run integration test
5. If can't fix quickly → Rollback phase

---

### Scenario 3: Production Issue Reported

**Trigger**: User reports broken feature

**Action**:
1. Identify which phase introduced issue
2. Disable feature flag (if applicable)
3. Or rollback entire branch
4. Release hotfix without new features
5. Fix in separate branch

**Feature Flag Rollback**:
```typescript
// Quick disable without code change:
const EMERGENCY_DISABLE_NEW_FEATURES = true;

if (EMERGENCY_DISABLE_NEW_FEATURES) {
  options.enableCrossProjectRefs = false;
  options.validateBeforeSync = false;
}
```

---

## Success Metrics

### Phase Completion Criteria

**Phase is COMPLETE when**:
- [ ] All new tests passing (100%)
- [ ] All existing tests passing (311+)
- [ ] Code coverage >= 85%
- [ ] Integration tests passing
- [ ] Regression tests passing
- [ ] Documentation updated
- [ ] Commit clean and atomic

### Overall Success Criteria

**Implementation is SUCCESSFUL when**:
- [ ] All 4 phases complete
- [ ] 330+ tests passing
- [ ] Zero regressions detected
- [ ] User issues resolved (12px/AUTO fixed)
- [ ] Documentation complete
- [ ] Feature flags work correctly

---

## Timeline Estimate

| Phase | Risk | Time | Tests | Status |
|-------|------|------|-------|--------|
| Phase 0: Pre-Implementation | 🟢 | 0.5h | 311 | Ready |
| Phase 1: Unified ProjectId | 🟢 | 2h | +3 | Pending |
| Phase 2: Cross-Project Refs | 🟡 | 4h | +6 | Pending |
| Phase 3: Pre-Sync Validation | 🟢 | 3h | +5 | Pending |
| Phase 4: Sync State Tracking | 🟢 | 3h | +5 | Pending |
| **TOTAL** | | **12.5h** | **+19** | |

**Conservative Estimate**: 2-3 working days
**Aggressive Estimate**: 1.5 working days

---

## Approval Checklist

Before proceeding with implementation:

- [ ] User validates FLOW_ANALYSIS.md (acceptance criteria correct)
- [ ] User approves phased approach (4 phases)
- [ ] User agrees to feature flag strategy (defaults OFF)
- [ ] User approves testing requirements (330+ tests)
- [ ] User confirms regression protection acceptable
- [ ] User prioritizes phases (or approves current order)

**Once approved → Proceed with Phase 0**

---

**Next Steps**:
1. Please review this improvement plan
2. Validate regression protection strategy
3. Approve phased approach
4. Confirm: Should I proceed with Phase 0?


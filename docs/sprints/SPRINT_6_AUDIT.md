# Codebase Audit Report: Deprecated and Unused Code Analysis

**Date:** 2025-11-30
**Scope:** Figma Tokens Reader Plugin v3.0
**Focus Areas:** Adapters, Registries, Controllers, Infrastructure Migration

---

## Executive Summary

The codebase has undergone a significant architectural evolution from a simple v2.0 service-based architecture to a layered hexagonal architecture (v3.0). This audit identified code that can be safely maintained, code that needs updates, and code that is currently functional but may be redundant.

**Key Findings:**
- **Total Code in Focus Areas:** 2,238 lines of code across 12 files
- **Deprecated Files:** 0 (no files are completely deprecated)
- **Files Needing Updates:** 3 registries (old-style, should be deprecated in favor of new infrastructure)
- **Files Ready for Removal:** 1 unused adapter (LocalFileSource)
- **Controllers Status:** All 4 controllers are active and properly integrated

---

## 1. src/core/adapters/ Analysis

### 1.1 W3CTokenFormatStrategy.ts (234 lines)

**Status:** ✅ KEEP WITH MINOR NOTES

**Usage:**
- Imported and instantiated in `/backend/main.ts:27` - registered to TokenFormatRegistry
- Wrapped by new `W3CTokenParser` in `/infrastructure/input/W3CTokenParser.ts:10`
- Used by `TokenProcessor` for format auto-detection
- Has comprehensive test coverage: `__tests__/core/adapters/W3CTokenFormatStrategy.test.ts`

**Assessment:**
- **Active:** Yes, still being used for token format detection
- **Replaced:** Partially - wrapped by W3CTokenParser infrastructure adapter
- **Status:** This is a legitimate domain-layer abstraction that is properly integrated into the layered architecture. It implements `ITokenFormatStrategy` interface and is used by both legacy TokenProcessor and new W3CTokenParser.

**Recommendation:** **KEEP**
- This is a proper domain-layer implementation of the Strategy pattern
- No conflicts with new architecture
- Still actively used for format detection
- Well-tested and documented

---

### 1.2 StyleDictionaryFormatStrategy.ts (231 lines)

**Status:** ✅ KEEP WITH FUTURE ENHANCEMENT

**Usage:**
- Imported and instantiated in `/backend/main.ts:28` - registered to TokenFormatRegistry
- Referenced in comments as planned implementation in infrastructure layer
- Marked as TODO for StyleDictionaryParser in `/backend/main.ts:128`
- Has comprehensive test coverage: `__tests__/core/adapters/StyleDictionaryFormatStrategy.test.ts`

**Assessment:**
- **Active:** Yes, registered and available for auto-detection
- **Complete:** Implementation is complete and working
- **Wrapped:** Not yet wrapped by infrastructure adapter (TODO in code)
- **Status:** Ready for use but infrastructure adapter needs to be created for consistency with W3C pattern

**Recommendation:** **KEEP, PLAN INFRASTRUCTURE ADAPTER**
- Create `StyleDictionaryParser` in `/infrastructure/input/` to match W3CTokenParser pattern
- Register in `TokenParserRegistry` in `main.ts:129` when ready
- No breaking changes required - existing code continues to work

---

### 1.3 GitHubFileSource.ts (153 lines)

**Status:** ✅ KEEP - Infrastructure Adapter

**Usage:**
- Imported in `/backend/main.ts:26`
- Registered to `FileSourceRegistry` in `/backend/main.ts:186`
- Implements `IFileSource` interface
- Used by `GitHubService` and `GitHubController`

**Assessment:**
- **Active:** Yes, actively used for GitHub file operations
- **Integrated:** Properly integrated into controller flow
- **Status:** Legitimate infrastructure adapter for GitHub file source

**Recommendation:** **KEEP**
- No issues identified
- Properly implements the IFileSource port/interface pattern
- Essential for GitHub import functionality

---

### 1.4 LocalFileSource.ts (196 lines)

**Status:** ⚠️ CONSIDER FOR REMOVAL - Unused Adapter

**Usage:**
- Defined in `/core/adapters/LocalFileSource.ts`
- **NOT registered anywhere** in the codebase
- **NOT imported** in any non-test files
- Has test coverage: `__tests__/core/adapters/LocalFileSource.test.ts`

**Assessment:**
- **Active:** No - never instantiated or registered
- **Implemented:** Yes, fully implemented
- **Purpose:** Was likely planned for local file uploads but implementation was superseded
- **Status:** Dead code - implements `IFileSource` but is never actually used

**Recommendation:** **REMOVE OR DEPRECATE**

Options:
1. **REMOVE IMMEDIATELY** (Safest Option)
   - Delete: `/core/adapters/LocalFileSource.ts`
   - Delete: `/src/__tests__/core/adapters/LocalFileSource.test.ts`
   - No active code depends on it
   - Can always be recovered from git history

2. **DEPRECATE AND PLAN REMOVAL** (Safer for Team)
   - Add deprecation notice to file
   - Mark for removal in next major version
   - Keep tests for regression checking

**Impact if Removed:** None - no code depends on this file

---

### 1.5 TokenDocumentationAdapter.ts (69 lines)

**Status:** ✅ KEEP - Active Adapter

**Usage:**
- Imported in `/backend/services/DocumentationGenerator.ts:2`
- Instantiated in `DocumentationGenerator` constructor
- Used for converting Token[] to TokenMetadata[] for documentation
- Has test coverage: `__tests__/core/adapters/TokenDocumentationAdapter.test.ts`

**Assessment:**
- **Active:** Yes, actively used in documentation generation
- **Integrated:** Properly integrated into DocumentationGenerator
- **Status:** Essential adapter for v2.0 documentation system

**Recommendation:** **KEEP**
- Bridge adapter between new Token[] model and legacy TokenMetadata[] model
- Essential for backward compatibility in documentation generation
- No issues identified

---

## 2. src/core/registries/ Analysis

### 2.1 TokenFormatRegistry.ts (125 lines)

**Status:** ⚠️ KEEP BUT DEPRECATED IN FAVOR OF NEW INFRASTRUCTURE

**Usage:**
- Imported in `/backend/main.ts:25`
- Imported in `/core/services/TokenProcessor.ts:9`
- Used in `registerArchitectureComponents()` method in main.ts
- Used by `TokenProcessor.processTokenData()` for auto-detection
- Has test coverage: `__tests__/core/registries/TokenFormatRegistry.test.ts`

**Assessment:**
- **Status:** Superseded by new `TokenParserRegistry` in infrastructure layer
- **Old Pattern:** Static registry using singleton pattern (v1.0/v2.0 style)
- **New Pattern:** Instance-based registry in infrastructure layer (v3.0 layered architecture)
- **Active:** Yes, still being used
- **Conflict:** Slight architectural duplication - both registries handle format detection

**Recommendation:** **KEEP FOR NOW, PLAN DEPRECATION**

Rationale:
- Still in use by `TokenProcessor` which is used by both old and new flows
- New `TokenParserRegistry` provides cleaner layered architecture
- Gradual migration path: Keep both during transition
- Plan full migration to `TokenParserRegistry` in future version

Migration Path:
1. **Phase 1 (Current):** Keep both registries active
2. **Phase 2 (Next Sprint):** Update `TokenProcessor` to use `TokenParserRegistry` instead
3. **Phase 3 (Future Version):** Remove `TokenFormatRegistry` completely

**Current Code Locations to Update:**
- `/core/services/TokenProcessor.ts:9` - Replace with TokenParserRegistry usage
- `/backend/main.ts:25, 189-190` - Move registration to token parser initialization

---

### 2.2 FileSourceRegistry.ts (97 lines)

**Status:** ⚠️ KEEP BUT NOT ACTIVELY USED

**Usage:**
- Imported in `/backend/main.ts:24`
- Registered with GitHubFileSource in `/backend/main.ts:186`
- **NOT used anywhere** after registration
- Has test coverage: `__tests__/core/registries/FileSourceRegistry.test.ts`

**Assessment:**
- **Status:** Initialized but not used in active code flow
- **Original Purpose:** Registry pattern for multiple file sources (GitHub, GitLab, Local)
- **Current Reality:** Only GitHub is implemented, and GitHubFileSource is used directly via controller
- **Dead Code:** The registration happens but the registry is never queried
- **Pattern:** Legacy pattern that was not fully integrated into new layered architecture

**Recommendation:** **KEEP FOR NOW, MARK FOR REVIEW**

Observations:
- Registration in main.ts:186 is performed but serve no active purpose
- `GitHubService` is used directly instead of going through registry
- Could be useful for future expansion (GitLab support, etc.)
- Current implementation is safe (passive registration has no side effects)

**Suggested Cleanup:**
1. Move registration into a dedicated initialization method
2. Document intended use case
3. Plan integration with infrastructure adapters layer

**Current Issues:**
- Registration statement in main.ts:186 can be removed if GitHubFileSource is never queried from registry
- Verify that `GitHubService` is the actual point of use (it is)

---

### 2.3 TokenVisualizerRegistry.ts (104 lines)

**Status:** ✅ KEEP - Active Registry

**Usage:**
- Imported in `/backend/main.ts:42`
- Used in `registerArchitectureComponents()` to register 6 visualizers
- Visualizers are instantiated and registered: ColorVisualizer, SpacingVisualizer, FontSizeVisualizer, FontWeightVisualizer, BorderRadiusVisualizer, DefaultVisualizer
- Used by documentation system
- No direct test file but supported by integration tests

**Assessment:**
- **Active:** Yes, actively used for documentation generation
- **Status:** Essential for token visualization in documentation
- **Pattern:** Proper registry pattern implementation

**Recommendation:** **KEEP**
- No issues identified
- Essential for documentation system
- Well-integrated

---

## 3. src/backend/controllers/ Analysis

### 3.1 TokenController.ts (246 lines)

**Status:** ✅ KEEP - Active Controller

**Usage:**
- Instantiated in `/backend/main.ts:95`
- Used in message handler for 'import-tokens', 'save-tokens', 'load-tokens' messages
- Receives dependency-injected services: FigmaSyncService, StorageService, TokenRepository, TokenResolver
- Methods called from main.ts message handlers

**Assessment:**
- **Active:** Yes, essential entry point for token operations
- **Integrated:** Properly integrated with dependency injection
- **Architecture:** Follows controller pattern in presentation layer
- **Status:** No deprecated code identified

**Methods:**
- `importTokens()` - Uses new `TokenProcessor` for token parsing
- `saveTokens()` - Persists token state
- `loadTokens()` - Retrieves saved tokens
- `clearTokens()` - Resets token state
- `getTokens()` - Query operation

**Recommendation:** **KEEP**
- Properly implemented
- No deprecated patterns detected
- Good separation of concerns

---

### 3.2 GitHubController.ts (218 lines)

**Status:** ✅ KEEP - Active Controller

**Usage:**
- Instantiated in `/backend/main.ts:96`
- Used in message handlers for 'github-fetch-files', 'github-import-files', GitHub config operations
- Properly injected with dependencies: GitHubService, StorageService

**Assessment:**
- **Active:** Yes, handles all GitHub-related operations
- **Integrated:** Properly layered
- **Status:** No deprecated code identified

**Methods:**
- `fetchFiles()` - Lists files from GitHub repo
- `importFiles()` - Imports selected files
- `saveConfig()` / `loadConfig()` - Manages GitHub configuration
- `clearConfig()` - Resets GitHub connection
- `validateConfig()` - Tests GitHub connection

**Recommendation:** **KEEP**
- Well-implemented controller
- Proper error handling
- All methods are actively used

---

### 3.3 DocumentationController.ts (118 lines)

**Status:** ✅ KEEP - Active Controller

**Usage:**
- Instantiated in `/backend/main.ts:101-105`
- Used in message handler for 'generate-documentation'
- Depends on: DocumentationGenerator, StorageService, TokenRepository

**Assessment:**
- **Active:** Yes, handles documentation generation requests
- **Integrated:** Properly integrated with DI pattern
- **Status:** No deprecated code identified

**Recommendation:** **KEEP**
- Essential for documentation feature
- Proper controller implementation
- All code is active

---

### 3.4 ScopeController.ts (447 lines)

**Status:** ✅ KEEP WITH DEPRECATION NOTES

**Usage:**
- Instantiated in `/backend/main.ts:97`
- Used in message handlers for 'get-figma-variables', 'apply-variable-scopes'
- Direct Figma API access (no service dependencies)

**Assessment:**
- **Active:** Yes, essential for Figma variable scope management
- **Integrated:** Properly integrated
- **Deprecation Markers:** File contains @deprecated annotations for:
  - `applyScopes()` - marked to use `applyScopesFromTokens()`
  - `getVariableByName()` - marked to use `getVariableByToken()`

**Deprecated Methods (Still Active):**
```typescript
// @deprecated Use applyScopesFromTokens() for O(1) Token ID-based lookups
async applyScopes(variableScopes: ScopeAssignments): Promise<Result<number>>

// @deprecated Use getVariableByToken() for O(1) lookups
private getVariableByName(name: string, variables: {...}): FigmaVariableData | undefined
```

**Recommendation:** **KEEP - Gradual Deprecation**

Current Status:
- Old methods are still functional and called from main.ts
- New Token-based methods are available but not yet used
- Migration path is documented with performance notes (O(n) vs O(1))

Next Steps:
1. Keep both old and new methods active
2. Update calling code to use new Token-based methods when available
3. Remove old methods in future major version
4. No immediate action needed - properly deprecated with clear alternatives

---

## 4. Commented-Out Code Analysis

**Findings:** ✅ NO MAJOR ISSUES

Comprehensive search found only legitimate TODO comments:
1. `/frontend/components/ImportScreen.ts:418` - TODO for ZIP file support (legitimate feature request)
2. `/backend/controllers/TokenController.ts:150` - TODO for tracking add vs update stats (valid enhancement)
3. `/backend/main.ts:128` - TODO for StyleDictionaryParser (planned implementation)
4. `/backend/main.ts:134` - TODO for FigmaStylesExporter and other exporters (future features)

**Assessment:** All TODO comments are legitimate future enhancements, not abandoned code.

**Recommendation:** **NO ACTION NEEDED** - TODOs are appropriately marked and documented.

---

## 5. Unused Imports Analysis

**Findings:** Minimal issues detected

**Imports Verified:**
- All major imports in main.ts are actively used
- Controllers receive all injected dependencies
- Infrastructure components are properly registered
- Only unused item: FileSourceRegistry registration (but registration itself is harmless)

**Recommendation:** **MINIMAL CLEANUP**
- Consider documenting why FileSourceRegistry is registered but not queried
- All other imports are necessary and active

---

## 6. Cross-Cutting Analysis: Architecture Consistency

### New Infrastructure Layer (v3.0)

**Status:** ✅ PROPERLY IMPLEMENTED

New files supporting layered architecture:
- `/infrastructure/input/TokenParserRegistry.ts` ✅ Active and registered
- `/infrastructure/input/W3CTokenParser.ts` ✅ Active and used
- `/infrastructure/output/TokenExporterRegistry.ts` ✅ Active and registered
- `/infrastructure/output/FigmaVariablesExporter.ts` ✅ Active and used
- `/infrastructure/storage/InMemoryTokenRepository.ts` ✅ Active and used

**Assessment:**
- New infrastructure components are properly integrated
- Use case layer successfully abstracts from presentation layer
- Dependency injection properly implemented in main.ts
- All new components actively used in ImportTokensUseCase, SyncToFigmaVariablesUseCase, GetTokensUseCase

---

## Summary Table

| Component | File | Lines | Status | Action |
|-----------|------|-------|--------|--------|
| W3CTokenFormatStrategy | adapters/ | 234 | Active | **KEEP** |
| StyleDictionaryFormatStrategy | adapters/ | 231 | Active | **KEEP** + Plan infrastructure wrapper |
| GitHubFileSource | adapters/ | 153 | Active | **KEEP** |
| LocalFileSource | adapters/ | 196 | Unused | **REMOVE** or Deprecate |
| TokenDocumentationAdapter | adapters/ | 69 | Active | **KEEP** |
| TokenFormatRegistry | registries/ | 125 | Partial | **KEEP** + Plan migration to TokenParserRegistry |
| FileSourceRegistry | registries/ | 97 | Unused | **REVIEW** - registration has no effect |
| TokenVisualizerRegistry | registries/ | 104 | Active | **KEEP** |
| TokenController | controllers/ | 246 | Active | **KEEP** |
| GitHubController | controllers/ | 218 | Active | **KEEP** |
| DocumentationController | controllers/ | 118 | Active | **KEEP** |
| ScopeController | controllers/ | 447 | Active | **KEEP** - some methods deprecated |

---

## Detailed Removal Recommendations

### 1. Safe to Remove Immediately

**LocalFileSource.ts** (196 lines)
- Delete: `/core/adapters/LocalFileSource.ts`
- Delete: `/src/__tests__/core/adapters/LocalFileSource.test.ts`
- **Impact:** NONE - No active code depends on this

### 2. Safe to Clean Up (Non-Breaking)

**FileSourceRegistry Registration** (3 lines)
- Location: `/backend/main.ts:186`
- Action: Remove or comment out the registration line
- Rationale: Registry is registered but never queried from anywhere
- **Impact:** NONE - No code queries this registry

### 3. Deprecate for Future Removal

**Old Methods in ScopeController** (TBD line count)
- Methods: `applyScopes()`, `getVariableByName()`
- Timeline: Keep active, document migration path to Token-based methods
- Future action: Remove in next major version

### 4. Plan Infrastructure Modernization

**TokenFormatRegistry** (125 lines)
- Status: Keep active, migrate uses to TokenParserRegistry
- Timeline:
  - Keep both registries functional during v3.0
  - Migrate TokenProcessor to use TokenParserRegistry in next sprint
  - Remove TokenFormatRegistry in v3.1+
- Impact: Improves architectural consistency, enables future cleanup

---

## Code Quality Observations

### Strengths ✅
1. **Proper SOLID Principles:** Single responsibility well-maintained
2. **Clear Deprecation Markers:** @deprecated annotations are used appropriately
3. **Comprehensive Testing:** Most components have test coverage
4. **Good Documentation:** JSDoc comments explain design patterns
5. **Layered Architecture:** Clear separation of concerns across layers
6. **Dependency Injection:** Properly implemented in controllers and main.ts

### Areas for Improvement
1. **Duplicate Registries:** TokenFormatRegistry and TokenParserRegistry serve similar purposes (plan consolidation)
2. **Unused Registration:** FileSourceRegistry is registered but never queried
3. **Legacy Adapters:** LocalFileSource is implemented but never used
4. **Incomplete Wrappers:** StyleDictionaryFormatStrategy lacks infrastructure wrapper (unlike W3C)

---

## Migration Roadmap

### Phase 1: Immediate (This Sprint)
- [ ] Remove unused LocalFileSource.ts and tests
- [ ] Document FileSourceRegistry usage intent or remove registration
- [ ] Add deprecation notice to ScopeController methods

### Phase 2: Next Sprint
- [ ] Create StyleDictionaryParser infrastructure adapter
- [ ] Update TokenProcessor to use TokenParserRegistry
- [ ] Remove TokenFormatRegistry registration from main.ts

### Phase 3: v3.1+
- [ ] Remove TokenFormatRegistry entirely
- [ ] Migrate any remaining old-style registries to layered architecture
- [ ] Remove deprecated ScopeController methods

---

## Conclusion

The codebase is in **good health** with a clear migration path from v2.0 to v3.0 layered architecture. The main opportunities for cleanup are:

1. **Low-Risk Removals:** LocalFileSource (unused) - Safe to remove immediately
2. **Medium-Risk Cleanups:** FileSourceRegistry registration (non-functional) - Safe to remove/comment out
3. **Planned Deprecations:** TokenFormatRegistry and ScopeController methods - Keep active with documented migration path
4. **Future Enhancements:** StyleDictionaryParser infrastructure adapter - Completes the symmetry with W3CTokenParser

No files have truly deprecated code that is both unused and problematic. The architecture is transitioning cleanly, and old patterns are being phased out appropriately.

**Overall Assessment:** 🟢 **READY FOR CLEANUP WITH LOW RISK**

---

**Report Generated:** 2025-11-30
**Analysis Method:** Static code analysis, grep searches, manual code review
**Coverage:** 97 TypeScript files, 2,238 lines in focus areas

# Deprecation Guide - Token Architecture Migration

## Overview

This document tracks deprecated files from the legacy architecture (v1.x) and explains the migration path to the new architecture (v2.0). These files are intentionally kept during the gradual rollout phase but will be removed after production stability is confirmed.

---

## Deprecation Strategy

**Approach:** Strangler Fig Pattern
- Old code continues to run (production path)
- New code runs in parallel for validation
- Feature flags control gradual rollout
- Old code removed after 2 weeks of production stability

**Timeline:**
- **Phase 1-2:** Validation mode (old code active, new code validates)
- **Phase 3:** Gradual rollout (25% → 50% → 75% → 100%)
- **Phase 4:** Full production (old code removed after 2 weeks stability)

See: `RELEASE_CHECKLIST.md` for detailed deployment plan

---

## Deprecated Files

### 1. src/services/variableManager.ts

**Status:** DEPRECATED
**Replaced by:** `src/core/services/FigmaSyncService.ts`
**Removal:** Deployment Phase 4 (after 2 weeks stability)

**Used by (legacy paths):**
- `src/core/services/DualRunValidator.ts` (intentional - validation)
- `src/backend/controllers/TokenController.ts` (legacy path)
- `src/backend/controllers/DocumentationController.ts` (legacy path)
- `src/backend/main.ts` (legacy initialization)

**Why deprecated:**
- Hardcoded primitive/semantic model (not extensible)
- O(n²) fuzzy reference resolution (slow)
- Tree-based token traversal (complex)
- Inline processing logic (not modular)

**New architecture benefits:**
- Dynamic collections (multi-brand, multi-theme)
- O(1) token lookups via TokenRepository
- Flat Token[] model (simpler)
- Modular services (TokenResolver, TokenProcessor, FigmaSyncService)

**Migration path:**
```typescript
// Old (v1.x)
const manager = new VariableManager();
await manager.importTokens(primitives, semantics);

// New (v2.0)
const syncService = new FigmaSyncService(repository, resolver);
await syncService.syncTokens(tokens);
```

---

### 2. src/utils/tokenProcessor.ts

**Status:** DEPRECATED
**Replaced by:** `src/core/services/TokenProcessor.ts`
**Removal:** Deployment Phase 4 (after 2 weeks stability)

**Used by:**
- `src/services/variableManager.ts` (deprecated)
- `src/services/styleManager.ts` (has new methods, old methods use this)

**Why deprecated:**
- Coupled to specific token format
- No format auto-detection
- O(n²) fuzzy reference matching
- Not extensible for new formats

**New architecture benefits:**
- Format-agnostic via TokenFormatRegistry
- Auto-detection (W3C, Style Dictionary, custom)
- O(1) reference resolution via TokenResolver
- Extensible for future formats (Figma, API, etc.)

**Migration path:**
```typescript
// Old (v1.x)
const processed = await processTokenValue(value, type, variableMap);

// New (v2.0)
const processor = new TokenProcessor();
const tokens = await processor.processTokenData(data, options);
// Then use TokenResolver for references
const resolver = new TokenResolver(repository);
const resolved = await resolver.resolveAllTokens(projectId);
```

---

## Legacy Methods (Deprecated but Maintained)

These methods exist in migrated files but are marked as deprecated:

### src/backend/controllers/ScopeController.ts
- `applyScopes()` - O(n) name-based lookups
- `getVariableByName()` - O(n) linear search

**Replaced by:**
- `applyScopesFromTokens()` - O(1) Token ID-based (80% faster)
- `getVariableByToken()` - O(1) direct lookup

### src/services/styleManager.ts
- `createTextStyles()` - Tree traversal
- `createEffectStyles()` - Tree traversal

**Replaced by:**
- `createTextStylesFromTokens()` - Flat array processing
- `createEffectStylesFromTokens()` - Flat array processing

---

## Feature Flags

Control migration progress via `src/core/services/DualRunValidator.ts`:

```typescript
export const FEATURE_FLAGS = {
  ENABLE_NEW_TOKEN_MODEL: false,    // Master switch
  ENABLE_DUAL_RUN: true,            // Run both paths
  SWITCH_TO_NEW_MODEL: false,       // Use new output
  AUTO_ROLLBACK_THRESHOLD: 0.05,    // 5% discrepancy triggers rollback
};
```

**Current state (pre-deployment):**
- Old system active
- New system validates in parallel
- Discrepancies logged for analysis

**Production rollout:**
See `RELEASE_CHECKLIST.md` Phase 1-4 deployment plan

---

## Files Safe to Remove (Already Replaced)

None. All deprecated files are still required for dual-run validation.

After deployment Phase 4 (2 weeks of production stability), these files can be removed:
- `src/services/variableManager.ts`
- `src/utils/tokenProcessor.ts`
- Legacy method implementations in migrated files
- `src/core/services/DualRunValidator.ts` (no longer needed)

---

## Verification Checklist

Before removing deprecated files in Phase 4:

- [ ] FEATURE_FLAGS.ENABLE_NEW_TOKEN_MODEL = true for 2+ weeks
- [ ] FEATURE_FLAGS.ENABLE_DUAL_RUN = false (old path disabled)
- [ ] Zero rollback events
- [ ] Zero discrepancy reports
- [ ] All 311 tests passing
- [ ] Production metrics stable (error rate, performance)
- [ ] User feedback positive

---

## Architecture Comparison

### Old Architecture (v1.x)
```
Input → VariableManager.importTokens(primitives, semantics)
  ↓
Hardcoded 2-collection model
  ↓
Inline O(n²) reference resolution
  ↓
Tree traversal for processing
  ↓
Figma Variables Created
```

### New Architecture (v2.0)
```
Input → FileSourceRegistry → IFileSource.fetch()
  ↓
TokenProcessor.process() (auto-detect format)
  ↓
TokenRepository.add() (indexed storage)
  ↓
TokenResolver.resolve() (O(1) cached resolution)
  ↓
FigmaSyncService.sync() (dynamic collections)
  ↓
Figma Variables Created
```

---

## Performance Improvements

| Operation | Old (v1.x) | New (v2.0) | Improvement |
|-----------|------------|------------|-------------|
| Reference Resolution | O(n²) fuzzy | O(1) cached | **98% faster** |
| Token Lookups | O(n) scan | O(1) indexed | **O(n) → O(1)** |
| Scope Operations | O(n) name | O(1) ID | **80% faster** |
| Collection Model | Hardcoded 2 | Dynamic unlimited | **Extensible** |

---

## Questions?

See documentation:
- `MIGRATION_PROGRESS.md` - Complete migration status
- `MIGRATION_HANDOFF.md` - Implementation details
- `RELEASE_CHECKLIST.md` - Deployment plan
- `BRANCH_SUMMARY.md` - Branch overview

---

**Last Updated:** 2025-11-11
**Status:** Phase 7 (Cleanup) - Deprecation notices added
**Next Step:** Production deployment Phase 1 (Validation mode)

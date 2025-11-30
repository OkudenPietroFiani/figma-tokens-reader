# Manual Test Checklist

**Version:** 1.0
**Last Updated:** 2025-11-30
**Architecture:** v3.0 (Layered Architecture)

---

## Pre-Test Setup

### Requirements
- [ ] Figma Desktop App or Browser
- [ ] Test repository with token files (or use local files)
- [ ] Developer mode enabled in Figma

### Test Data
Use the existing test data in `test-data/`:
- `test-data/primitives.json` - Primitive tokens
- `test-data/semantics.json` - Semantic tokens

Or create your own test repository with:
```json
{
  "color": {
    "primary": {
      "$type": "color",
      "$value": "#0066CC"
    }
  }
}
```

---

## Test Execution

### ✅ = Pass | ❌ = Fail | ⚠️ = Partial/Warning

---

## 1. Plugin Installation & Startup

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Load plugin in Figma | Plugin loads without errors | ☐ | |
| Check console for errors | No errors in console | ☐ | |
| Welcome screen appears | Shows import options | ☐ | |
| Plugin UI renders correctly | All UI elements visible | ☐ | |

**Pass Criteria:** Plugin loads and welcome screen displays

---

## 2. Import Tokens from Local File

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Click "Import from Local File" | File picker opens | ☐ | |
| Select valid JSON file | File loads successfully | ☐ | |
| Tokens appear in token list | All tokens visible | ☐ | |
| Token hierarchy correct | No redundant nesting | ☐ | Check: semantic.semantic not present |
| Token count accurate | Count matches JSON | ☐ | |
| Token values correct | Values match JSON | ☐ | |
| Collection name set | Based on filename or explicit | ☐ | |

**Test Data:** Use `test-data/primitives.json`

**Pass Criteria:**
- File imports successfully
- All tokens visible
- Hierarchy normalized (no `semantic.semantic`)

**Common Issues:**
- Invalid JSON → Should show error message
- Empty file → Should show warning

---

## 3. Import Tokens from GitHub

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Click "Import from GitHub" | GitHub form appears | ☐ | |
| Enter valid repo URL | URL accepted | ☐ | Format: `owner/repo` |
| Enter valid file path | Path accepted | ☐ | e.g., `tokens/primitives.json` |
| Click "Fetch" | Tokens load from GitHub | ☐ | |
| Tokens appear in list | All tokens visible | ☐ | |
| Token hierarchy correct | No redundant nesting | ☐ | |
| Can switch sources | GitHub ↔ Local works | ☐ | |

**Test Data:** Use a public test repository or create one

**Pass Criteria:**
- GitHub import works
- All tokens visible
- Source switching works

**Common Issues:**
- Invalid repo → Error message
- Private repo without token → 404 error
- Invalid file path → Not found error

---

## 4. Token Level Detection & Normalization

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Import primitives.json | Level: "primitives" | ☐ | |
| Import semantics.json | Level: "semantic" | ☐ | |
| Check token paths | No duplicate level in path | ☐ | Should be `color.primary` not `semantic.color.primary` |
| Redundancy detected | Console shows detection | ☐ | Check browser console |
| Paths normalized | Redundant level removed | ☐ | |

**Test Data:**
```json
// semantics.json
{
  "semantic": {
    "color": {
      "primary": { "$type": "color", "$value": "#0066CC" }
    }
  }
}
```

**Pass Criteria:**
- TokenLevelAnalyzer detects `semantic` level
- Redundant top-level key removed
- Token path: `color.primary` (not `semantic.color.primary`)

---

## 5. Sync to Figma Variables

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Import tokens | Tokens loaded | ☐ | |
| Click "Sync to Variables" | Sync starts | ☐ | |
| Variable collections created | Collections exist in Figma | ☐ | Check via Figma UI |
| Variables created | All tokens synced | ☐ | |
| Variable names correct | Match token names | ☐ | |
| Variable values correct | Match token values | ☐ | |
| Variable scopes set | Correct scopes applied | ☐ | |
| Collections organized | By token level/type | ☐ | |
| Update existing variables | Re-sync updates values | ☐ | |

**Test Data:** Use `test-data/primitives.json`

**Pass Criteria:**
- Variable collections created
- All tokens synced as variables
- Values correct
- Re-sync updates (not duplicates)

**Manual Verification:**
1. Open Figma → Local Variables panel
2. Check collections exist
3. Check variable names/values
4. Modify token value and re-sync
5. Verify variable updated

---

## 6. Sync to Figma Styles

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Import color tokens | Colors loaded | ☐ | |
| Import text tokens | Typography loaded | ☐ | |
| Click "Sync to Styles" | Sync starts | ☐ | |
| Color styles created | In Figma styles panel | ☐ | |
| Text styles created | In Figma styles panel | ☐ | |
| Effect styles created | For shadows | ☐ | |
| Style names correct | Match token names | ☐ | |
| Style values correct | Match token values | ☐ | |

**Test Data:** Mix of color, typography, shadow tokens

**Pass Criteria:**
- Styles created in Figma
- Names and values correct

---

## 7. Documentation Generation

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Import tokens | Tokens loaded | ☐ | |
| Click "Generate Documentation" | Documentation generated | ☐ | |
| Figma page created | "Token Documentation" page | ☐ | |
| Token visualizations | Color swatches, type samples | ☐ | |
| Token values documented | All values shown | ☐ | |
| Hierarchy reflected | Organized by groups | ☐ | |

**Test Data:** Use tokens with different types (color, typography, spacing)

**Pass Criteria:**
- Documentation page created
- All tokens visualized
- Values accurate

---

## 8. Scope Management

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Open scope settings | Scope UI appears | ☐ | |
| View current scopes | Scopes listed | ☐ | |
| Modify scope | Changes saved | ☐ | |
| Apply scopes to variables | Variables updated | ☐ | |

**Pass Criteria:**
- Scope UI functional
- Changes persist

---

## 9. Token Query & Filtering

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Search tokens by name | Results filtered | ☐ | |
| Filter by type (color) | Only colors shown | ☐ | |
| Filter by collection | Correct tokens shown | ☐ | |
| Clear filters | All tokens shown | ☐ | |

**Pass Criteria:**
- Search works
- Filters accurate

---

## 10. Error Handling

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Import invalid JSON | Error message shown | ☐ | |
| Import empty file | Warning shown | ☐ | |
| GitHub 404 error | Error message clear | ☐ | |
| Network error | Retry/error handling | ☐ | |
| Malformed token data | Validation error | ☐ | |

**Test Data:**
- Invalid JSON: `{ "bad": json }`
- Empty file: `{}`
- Missing required fields

**Pass Criteria:**
- Errors don't crash plugin
- Error messages clear and helpful
- User can recover from errors

---

## 11. Performance

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| Import 100 tokens | < 2 seconds | ☐ | |
| Import 500 tokens | < 5 seconds | ☐ | |
| Sync 100 variables | < 10 seconds | ☐ | |
| UI remains responsive | No freezing | ☐ | |
| Plugin bundle size | < 300 KB | ☐ | Already verified: 247.9 KB ✅ |

**Pass Criteria:**
- Operations complete in reasonable time
- UI responsive
- No memory leaks

---

## 12. New Architecture Integration

| Test Case | Expected Result | Status | Notes |
|-----------|----------------|--------|-------|
| UseCaseRegistry initialized | No errors in console | ☐ | |
| ImportTokensUseCase works | Tokens import correctly | ☐ | |
| SyncToFigmaVariablesUseCase works | Variables sync correctly | ☐ | |
| GetTokensUseCase works | Token queries work | ☐ | |
| TokenParserRegistry detects format | Auto-detects W3C format | ☐ | |
| InMemoryTokenRepository works | CRUD operations work | ☐ | |

**Pass Criteria:**
- All use cases execute successfully
- Registries function correctly
- Repository operations work

---

## Test Summary

### Overall Results

**Total Test Cases:** _____
**Passed:** _____
**Failed:** _____
**Warnings:** _____

**Pass Rate:** _____%

### Critical Issues Found
1.
2.
3.

### Minor Issues Found
1.
2.
3.

### Recommendations
-
-
-

---

## Sign-off

**Tested By:** _________________
**Date:** _________________
**Version:** _________________
**Result:** ☐ PASS | ☐ FAIL | ☐ PASS WITH WARNINGS

**Notes:**


---

## Automated Test Verification

After manual testing, run automated tests to verify:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Check for no failing tests
npm test 2>&1 | grep -c "FAIL" # Should be 0
```

**Expected Results:**
- All tests pass (after Sprint 8)
- Coverage ≥ 75% (after Sprint 8)
- 0 failing tests

---

## Next Steps After Testing

### If All Tests Pass ✅
- Proceed to Sprint 6 (Code Cleanup)
- Document any observations
- Create GitHub issues for minor improvements

### If Tests Fail ❌
- Document failures in detail
- Create bug report with:
  - Steps to reproduce
  - Expected vs actual result
  - Console errors
  - Screenshots
- Fix critical issues before proceeding
- Re-test after fixes

---

**Note:** This checklist should be run:
1. After major refactoring (like layered architecture)
2. Before releases
3. When adding new features
4. Periodically as regression testing

Keep this checklist updated as features evolve.

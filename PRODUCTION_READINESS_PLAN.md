# Production Readiness Plan (Sprints 5-8)

**Version:** 1.0
**Created:** 2025-11-30
**Status:** 📋 Ready to Execute

---

## Overview

This plan focuses on cleaning, testing, and preparing the Figma Tokens Reader plugin for production use after completing the layered architecture refactoring (Sprints 0-4).

**Goals:**
1. ✅ Verify plugin works correctly with new architecture
2. 🧹 Remove deprecated and unused code
3. 📚 Consolidate and clean documentation
4. 🔒 Guarantee test coverage and security

**Timeline:** 2-3 weeks
**Total Story Points:** 65 points

---

## Sprint 5: Plugin Verification & Integration Testing
**Duration:** 3-5 days
**Story Points:** 21
**Status:** 📋 Planned

### Goals
- Verify all features work end-to-end with new architecture
- Test plugin in real Figma environment
- Document any issues or gaps
- Create regression test suite

### User Stories

#### US-5.1: Manual Plugin Testing (8 points)
**As a** plugin user
**I want** all features to work correctly
**So that** I can trust the refactored architecture

**Tasks:**
- [ ] Build plugin with new architecture
- [ ] Load plugin in Figma
- [ ] Test import tokens from local JSON
- [ ] Test import tokens from GitHub
- [ ] Test switch between sources
- [ ] Test sync to Figma Variables
- [ ] Test sync to Figma Styles
- [ ] Test documentation generation
- [ ] Test scope management
- [ ] Document any issues found

**Acceptance Criteria:**
- ✅ Plugin builds without errors
- ✅ All import sources work (local, GitHub)
- ✅ Token sync creates correct Figma Variables
- ✅ Token sync creates correct Figma Styles
- ✅ Documentation generates correctly
- ✅ No console errors during normal operation

**Dependencies:** None

---

#### US-5.2: Create Manual Test Checklist (5 points)
**As a** developer
**I want** a comprehensive test checklist
**So that** I can verify all features systematically

**Tasks:**
- [ ] Create test checklist document
- [ ] Document test data requirements
- [ ] Define pass/fail criteria
- [ ] Include edge cases (empty tokens, invalid JSON, etc.)
- [ ] Add visual verification steps

**Acceptance Criteria:**
- ✅ Checklist covers all user flows
- ✅ Each test has clear pass/fail criteria
- ✅ Test data samples provided
- ✅ Checklist can be run by any developer

**Dependencies:** None

---

#### US-5.3: Integration Tests for Use Cases (8 points)
**As a** developer
**I want** integration tests for use cases
**So that** I can verify end-to-end flows programmatically

**Tasks:**
- [ ] Create `__tests__/integration/` directory
- [ ] Write integration test for ImportTokensUseCase
- [ ] Write integration test for SyncToFigmaVariablesUseCase
- [ ] Write integration test for GetTokensUseCase
- [ ] Mock Figma API calls
- [ ] Use real test token data (primitives.json, semantics.json)
- [ ] Verify token hierarchy and normalization

**Acceptance Criteria:**
- ✅ Integration tests pass
- ✅ Tests use real data from test-data/
- ✅ Figma API is mocked (no actual API calls)
- ✅ Coverage increases by 10%+

**Dependencies:** None

---

## Sprint 6: Code Cleanup & Deprecation Removal
**Duration:** 3-5 days
**Story Points:** 13
**Status:** 📋 Planned

### Goals
- Identify and remove deprecated code
- Remove unused files and functions
- Consolidate duplicate code
- Update imports and references

### User Stories

#### US-6.1: Audit and Remove Deprecated Code (8 points)
**As a** developer
**I want** to remove deprecated code
**So that** the codebase is clean and maintainable

**Tasks:**
- [ ] Identify deprecated adapters (if fully replaced)
- [ ] Check if old TokenFormatRegistry is still needed
- [ ] Check if old FileSourceRegistry is still needed
- [ ] Identify unused utilities or helpers
- [ ] Remove commented-out code
- [ ] Update imports to use new architecture
- [ ] Run build to verify no breakage

**Files to Review:**
- `src/core/adapters/` (old format strategies)
- `src/core/registries/` (old registries vs new)
- `src/backend/controllers/` (check if using new use cases)
- `src/services/` (check if duplicated in infrastructure)

**Acceptance Criteria:**
- ✅ All deprecated code identified
- ✅ Unused files removed (git history preserved)
- ✅ No commented-out code blocks
- ✅ Build succeeds
- ✅ Tests pass

**Dependencies:** US-5.1 (verify features work first)

---

#### US-6.2: Consolidate Duplicate Code (5 points)
**As a** developer
**I want** to eliminate code duplication
**So that** maintenance is easier

**Tasks:**
- [ ] Find duplicate logic between old and new architecture
- [ ] Consolidate into single implementation
- [ ] Update references to use consolidated code
- [ ] Verify no functionality lost

**Acceptance Criteria:**
- ✅ Duplicate code identified and removed
- ✅ Single source of truth for each function
- ✅ Tests still pass
- ✅ Bundle size maintained or reduced

**Dependencies:** US-6.1

---

## Sprint 7: Documentation Consolidation
**Duration:** 2-3 days
**Story Points:** 13
**Status:** 📋 Planned

### Goals
- Consolidate all documentation
- Keep only README.md in root
- Move technical docs to .claude/instructions/
- Synthesize README to essentials only

### User Stories

#### US-7.1: Reorganize Documentation Structure (5 points)
**As a** developer
**I want** organized documentation
**So that** I can find information easily

**Tasks:**
- [ ] Create `.claude/instructions/ARCHITECTURE_GUIDE.md` (comprehensive)
- [ ] Move ARCHITECTURE.md content to instructions
- [ ] Move SPRINT_4_SUMMARY.md to docs/sprints/
- [ ] Move AGILE_IMPLEMENTATION_PLAN.md to docs/planning/
- [ ] Move TEST_COVERAGE.md to docs/testing/
- [ ] Keep docs/adr/ (Architecture Decision Records)
- [ ] Update all internal links

**New Structure:**
```
/
├── README.md (essentials only)
├── .claude/
│   └── instructions/
│       ├── TECHNICAL_SPECIFICATION.md (current)
│       ├── ARCHITECTURE_GUIDE.md (NEW - comprehensive)
│       └── DEVELOPMENT_GUIDE.md (NEW - how to add features)
├── docs/
│   ├── adr/ (keep)
│   ├── planning/
│   │   ├── AGILE_IMPLEMENTATION_PLAN.md
│   │   └── PRODUCTION_READINESS_PLAN.md
│   ├── sprints/
│   │   └── SPRINT_4_SUMMARY.md
│   └── testing/
│       ├── TEST_COVERAGE.md
│       └── MANUAL_TEST_CHECKLIST.md
```

**Acceptance Criteria:**
- ✅ Only README.md in root
- ✅ All docs organized by category
- ✅ All internal links updated
- ✅ No broken references

**Dependencies:** None

---

#### US-7.2: Synthesize README.md (3 points)
**As a** user
**I want** a concise README
**So that** I can quickly understand the plugin

**Tasks:**
- [ ] Keep only essentials: What, Why, Quick Start, Features
- [ ] Remove detailed architecture (move to instructions)
- [ ] Add "For Developers" section with links to docs
- [ ] Add badges (build status, coverage if available)
- [ ] Ensure installation instructions are clear

**Content to Keep:**
- Plugin description (1-2 paragraphs)
- Key features (bullet list)
- Quick start (3-5 steps)
- Links to full documentation

**Content to Move:**
- Detailed architecture → .claude/instructions/ARCHITECTURE_GUIDE.md
- Development setup → .claude/instructions/DEVELOPMENT_GUIDE.md
- Testing info → docs/testing/

**Acceptance Criteria:**
- ✅ README is concise (<200 lines)
- ✅ Clear for new users
- ✅ Links to detailed docs for developers
- ✅ Professional appearance

**Dependencies:** US-7.1

---

#### US-7.3: Create Development Guide (5 points)
**As a** developer
**I want** a development guide
**So that** I know how to contribute

**Tasks:**
- [ ] Create `.claude/instructions/DEVELOPMENT_GUIDE.md`
- [ ] Document how to add a new parser
- [ ] Document how to add a new exporter
- [ ] Document how to add a new use case
- [ ] Document testing strategy
- [ ] Document build and deployment process
- [ ] Include code examples

**Acceptance Criteria:**
- ✅ Guide covers all common development tasks
- ✅ Code examples provided
- ✅ Clear step-by-step instructions
- ✅ References architecture guide

**Dependencies:** US-7.1

---

## Sprint 8: Test Coverage & Security
**Duration:** 5-7 days
**Story Points:** 18
**Status:** 📋 Planned

### Goals
- Add tests for new architecture (Priority 1)
- Fix 6 failing tests
- Security audit and fixes
- Achieve 75%+ test coverage

### User Stories

#### US-8.1: Test New Architecture Components (13 points)
**As a** developer
**I want** comprehensive test coverage
**So that** I can confidently make changes

**Tasks:**
- [ ] Test ImportTokensUseCase (unit + integration)
- [ ] Test SyncToFigmaVariablesUseCase (unit + integration)
- [ ] Test GetTokensUseCase (unit)
- [ ] Test UseCaseRegistry
- [ ] Test W3CTokenParser adapter
- [ ] Test TokenParserRegistry
- [ ] Test FigmaVariablesExporter adapter
- [ ] Test TokenExporterRegistry
- [ ] Test InMemoryTokenRepository adapter
- [ ] Run coverage report

**Test Structure:**
```
src/__tests__/
├── application/
│   ├── use-cases/
│   │   ├── ImportTokensUseCase.test.ts
│   │   ├── SyncToFigmaVariablesUseCase.test.ts
│   │   └── GetTokensUseCase.test.ts
│   └── UseCaseRegistry.test.ts
├── infrastructure/
│   ├── input/
│   │   ├── W3CTokenParser.test.ts
│   │   └── TokenParserRegistry.test.ts
│   ├── output/
│   │   ├── FigmaVariablesExporter.test.ts
│   │   └── TokenExporterRegistry.test.ts
│   └── storage/
│       └── InMemoryTokenRepository.test.ts
└── integration/
    └── end-to-end-flows.test.ts
```

**Acceptance Criteria:**
- ✅ All new architecture components have tests
- ✅ Tests follow layer-specific strategy (unit/integration)
- ✅ Coverage increases to 60%+
- ✅ All tests pass

**Dependencies:** None

---

#### US-8.2: Fix Failing Tests (3 points)
**As a** developer
**I want** all tests to pass
**So that** CI/CD is reliable

**Tasks:**
- [ ] Fix StorageAdapter.test.ts TypeScript error
- [ ] Fix TokenRepository.validation.test.ts (2 tests)
- [ ] Verify all tests pass
- [ ] Update TEST_COVERAGE.md

**Acceptance Criteria:**
- ✅ 0 failing tests
- ✅ All tests pass in CI
- ✅ Coverage report updated

**Dependencies:** None

---

#### US-8.3: Security Audit (2 points)
**As a** user
**I want** a secure plugin
**So that** my data is protected

**Tasks:**
- [ ] Audit dependencies for vulnerabilities (npm audit)
- [ ] Check input validation (JSON parsing, GitHub URLs)
- [ ] Verify no XSS vulnerabilities (htmlSanitizer usage)
- [ ] Check for injection vulnerabilities
- [ ] Verify secure storage practices
- [ ] Document security considerations

**Security Checklist:**
- ✅ npm audit shows no high/critical vulnerabilities
- ✅ User inputs are validated
- ✅ HTML output is sanitized
- ✅ No eval() or Function() usage
- ✅ GitHub tokens handled securely
- ✅ No sensitive data in logs

**Acceptance Criteria:**
- ✅ Security audit completed
- ✅ All critical/high vulnerabilities fixed
- ✅ Security report documented
- ✅ Best practices followed

**Dependencies:** None

---

## Success Metrics

### Sprint 5 Success Criteria
- ✅ Plugin runs successfully in Figma
- ✅ All features verified working
- ✅ Integration tests added
- ✅ Test checklist created

### Sprint 6 Success Criteria
- ✅ All deprecated code removed
- ✅ No duplicate code
- ✅ Build succeeds
- ✅ Bundle size maintained or reduced

### Sprint 7 Success Criteria
- ✅ Only README.md in root
- ✅ All docs organized in docs/ or .claude/instructions/
- ✅ README concise and clear
- ✅ Development guide created

### Sprint 8 Success Criteria
- ✅ Test coverage ≥ 75%
- ✅ 0 failing tests
- ✅ Security audit passed
- ✅ No critical vulnerabilities

---

## Overall Success Criteria

### Code Quality
- ✅ No deprecated code
- ✅ No duplicate code
- ✅ Clean imports
- ✅ TypeScript strict mode (or documented exceptions)

### Testing
- ✅ Test coverage ≥ 75%
- ✅ All tests pass
- ✅ Integration tests cover main flows
- ✅ Manual test checklist exists

### Documentation
- ✅ README concise and professional
- ✅ Architecture documented in instructions
- ✅ Development guide for contributors
- ✅ All docs organized

### Security
- ✅ No critical/high vulnerabilities
- ✅ Input validation in place
- ✅ Secure coding practices
- ✅ Security report documented

### Performance
- ✅ Bundle size < 300 KB
- ✅ No performance regressions
- ✅ Plugin responsive in Figma

---

## Risk Assessment

### High Risk
- **Plugin not working in Figma**: Mitigate with US-5.1 manual testing first
- **Breaking existing features**: Mitigate with comprehensive test suite

### Medium Risk
- **Removing code that's still needed**: Mitigate with careful auditing and git history
- **Security vulnerabilities**: Mitigate with audit and best practices

### Low Risk
- **Documentation reorganization**: Low impact, reversible

---

## Dependencies & Blockers

### External Dependencies
- Figma environment for testing
- GitHub test repository (for import tests)

### Potential Blockers
- Discovering critical bugs during testing
- Security vulnerabilities requiring significant refactoring
- Test coverage gaps requiring extensive new tests

---

## Timeline

```
Week 1: Sprint 5 (Verification)
├── Day 1-2: Manual testing (US-5.1)
├── Day 2-3: Test checklist (US-5.2)
└── Day 3-5: Integration tests (US-5.3)

Week 2: Sprint 6 (Cleanup) + Sprint 7 (Docs)
├── Day 1-3: Code cleanup (US-6.1, US-6.2)
└── Day 4-5: Documentation (US-7.1, US-7.2, US-7.3)

Week 3: Sprint 8 (Testing & Security)
├── Day 1-5: Test coverage (US-8.1)
├── Day 5-6: Fix failing tests (US-8.2)
└── Day 6-7: Security audit (US-8.3)
```

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Execute Sprint 5** - Verify plugin works
3. **Execute Sprint 6** - Clean deprecated code
4. **Execute Sprint 7** - Consolidate documentation
5. **Execute Sprint 8** - Guarantee coverage and security

---

## Appendix: Story Point Estimation

**Story Points Scale (Fibonacci):**
- 1 point: <1 hour (trivial)
- 2 points: 1-2 hours (simple)
- 3 points: 2-4 hours (moderate)
- 5 points: 4-8 hours (complex)
- 8 points: 1-2 days (very complex)
- 13 points: 2-3 days (epic)

**Total Points:**
- Sprint 5: 21 points (3-5 days)
- Sprint 6: 13 points (3-5 days)
- Sprint 7: 13 points (2-3 days)
- Sprint 8: 18 points (5-7 days)
- **Total: 65 points (2-3 weeks)**

---

**Last Updated:** 2025-11-30
**Status:** Ready for execution
**Next Sprint:** Sprint 5 - Plugin Verification

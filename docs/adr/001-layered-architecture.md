# ADR 001: Adopt Layered Architecture for Token Management

**Status:** Accepted

**Date:** 2025-11-30

**Deciders:** Development Team

---

## Context

The Figma Design Token plugin currently has a functional architecture but lacks clear separation of concerns. As we prepare to add new features (CRUD operations, two-way sync, multiple export formats), we need a more maintainable and extensible architecture.

### Current Pain Points

1. **Mixed Concerns**: Business logic scattered across services
2. **Tight Coupling**: Direct dependencies between components
3. **Hard to Test**: Difficult to mock external dependencies
4. **Hard to Extend**: Adding new formats/operations requires touching multiple files
5. **UI Challenges**: Plugin UI would need to know about parsers, repositories, Figma API

### Requirements

1. **Figma Environment Constraints**
   - Small bundle size (esbuild bundles to single code.js)
   - No Node.js runtime dependencies
   - Performance critical (runs on UI thread)
   - Limited memory

2. **Feature Requirements**
   - Support current features (import, sync, documentation)
   - Enable future features (CRUD, two-way sync, exports)
   - Plugin UI shows abstract Token model, not raw data

3. **Quality Requirements**
   - 100% backward compatibility
   - Easy to test (unit + integration)
   - Easy to onboard new developers

---

## Decision

We will adopt **Layered Architecture** (Option 2 from ARCHITECTURE_PROPOSAL.md) with the following layers:

```
┌─────────────────────────────────────────┐
│      PRESENTATION LAYER                  │
│   (Figma Plugin UI - src/frontend)      │
│   Shows: Token model, operation status   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      APPLICATION LAYER (NEW)             │
│        (src/application)                 │
│   Use Cases: Import, Sync, Export, etc. │
│   Orchestrates domain + infrastructure   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      DOMAIN LAYER                        │
│         (src/core)                       │
│   Models: Token, Collection              │
│   Services: Validator, Resolver          │
│   Ports: ITokenRepository, IParser       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      INFRASTRUCTURE LAYER (NEW)          │
│      (src/infrastructure)                │
│   Input: Parsers (W3C, SD, etc.)        │
│   Output: Exporters (Figma, JSON, CSS)  │
│   Storage: Repository implementations    │
└─────────────────────────────────────────┘
```

### Layer Responsibilities

**Presentation Layer** (src/frontend)
- Figma plugin UI
- User interactions
- Calls use cases via application layer
- Shows Token model only (no format details)

**Application Layer** (src/application) - **NEW**
- Use cases (ImportTokensUseCase, SyncToFigmaUseCase, etc.)
- Orchestrates domain services and infrastructure
- Transaction boundaries
- Error handling and logging

**Domain Layer** (src/core)
- Core business logic
- Token model (entities, value objects)
- Domain services (validation, resolution, transformation)
- Ports (interfaces for infrastructure)
- **No dependencies on infrastructure**

**Infrastructure Layer** (src/infrastructure) - **NEW**
- Adapters to external systems
- Parsers (W3C, Style Dictionary)
- Exporters (Figma Variables, Figma Styles, JSON, CSS)
- Repository implementations
- **Implements domain ports**

---

## Consequences

### Positive

✅ **Clear Separation of Concerns**
- Each layer has single responsibility
- Easy to understand where code belongs

✅ **Testability**
- Domain layer tested without infrastructure
- Use cases tested with mocked dependencies
- Integration tests for full flow

✅ **Extensibility**
- New parsers: Add to infrastructure/input
- New exporters: Add to infrastructure/output
- New operations: Add use case to application layer

✅ **UI Simplicity**
- UI only depends on application layer (use cases)
- UI works with abstract Token model
- No knowledge of parsers, Figma API, etc.

✅ **Future-Proof**
- CRUD operations: Add use cases
- Two-way sync: Add use case + exporter
- Multi-format export: Add exporters

✅ **Figma-Compatible**
- Still bundles to single code.js
- No additional runtime dependencies
- Just better organization

### Negative

⚠️ **More Files**
- More interfaces and classes
- Deeper folder structure
- Potential: Slightly larger bundle size (minimal impact)

⚠️ **Learning Curve**
- Team needs to understand layers
- New developers need onboarding
- Mitigation: Good documentation

⚠️ **Refactoring Effort**
- ~4 weeks to implement
- Risk of regressions (mitigated by tests)
- Requires discipline to maintain

### Neutral

➖ **Indirection**
- More abstraction layers
- But: Makes code more flexible

---

## Alternatives Considered

### Option 1: Minimal Refactor
- Add operation interfaces only
- Keep current structure
- **Rejected:** Doesn't solve core problems

### Option 3: Full DDD + CQRS
- Commands, queries, events, event sourcing
- **Rejected:** Overkill for a Figma plugin

---

## Implementation Plan

See: `AGILE_IMPLEMENTATION_PLAN.md`

**Phases:**
1. Sprint 0: Planning & Setup (2-3 days)
2. Sprint 1: Define Domain Boundaries (5-7 days)
3. Sprint 2: Create Application Layer (5-7 days)
4. Sprint 3: Refactor Infrastructure (5-7 days)
5. Sprint 4: Testing & Documentation (3-5 days)

**Total:** ~4 weeks, 80 story points

---

## Acceptance Criteria

This ADR is successful when:
- [ ] All layers implemented
- [ ] All current features work identically
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Team understands and uses architecture
- [ ] New features (CRUD, export) can be added easily

---

## References

- [ARCHITECTURE_PROPOSAL.md](../../ARCHITECTURE_PROPOSAL.md)
- [AGILE_IMPLEMENTATION_PLAN.md](../../AGILE_IMPLEMENTATION_PLAN.md)
- Clean Architecture by Robert C. Martin
- Hexagonal Architecture by Alistair Cockburn

---

## Notes

**Figma Bundle Size Monitoring:**
- Current code.js: ~223 KB
- Target: < 300 KB after refactoring
- Monitor with each sprint

**Testing Strategy:**
- Unit tests for each layer
- Integration tests for use cases
- Manual regression tests weekly

**Rollback Plan:**
- Keep old code until new is proven
- Feature flags for new paths (if needed)
- Git branches for each sprint

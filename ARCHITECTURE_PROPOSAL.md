# Architecture Improvement Proposal
**Design Token Management Platform - Solidifying the Abstraction Layer**

---

## 📋 Context

### What We're Building
A **design token management platform** that can:
- Import tokens from various formats (W3C, Style Dictionary, Figma, etc.)
- Provide a universal abstraction layer for token manipulation
- Perform operations on tokens (sync, transform, validate, CRUD)
- Export to multiple targets (Figma Variables, Figma Styles, JSON, CSS, etc.)

### Key Principle
**"The plugin UI shows the abstract layer, not the raw data"**

This means:
- Users interact with a **unified Token model**, regardless of source format
- Operations work on the abstraction, not on JSON/format-specific structures
- The system is format-agnostic and extensible

---

## 🔍 Current Situation

### What Exists Now (✅ Good Foundation)

```
Input Layer
├── Local Files (JSON)
├── TokenProcessor (converts to Token model)
└── TokenRepository (stores tokens)

Domain Layer
├── Token Model (universal abstraction) ⭐
├── TokenRepository (in-memory storage)
├── TokenResolver (resolves references)
└── TokenLevelAnalyzer (hierarchy detection)

Output Layer
└── FigmaSyncService (syncs to Figma Variables)
```

### Strengths
1. ✅ **Universal Token Model** - Already have a format-agnostic Token type
2. ✅ **Strategy Pattern** - Format parsing is extensible (W3C, etc.)
3. ✅ **Repository Pattern** - Centralized token storage with querying
4. ✅ **Reference Resolution** - Handles token aliases/references
5. ✅ **Level Detection** - Smart hierarchy analysis (just implemented!)

### Gaps & Weaknesses

#### 1. **No Clear Layer Separation**
```
Current:
FigmaSyncService directly accesses TokenRepository
TokenProcessor directly creates tokens
No clear boundaries between layers
```

**Problem:** Tight coupling, hard to test, hard to extend

#### 2. **Operations Are Scattered**
```
Current locations:
- Sync logic → FigmaSyncService
- Validation → TokenRepository (mixed in)
- CRUD → No dedicated layer
- Export → Doesn't exist yet
```

**Problem:** No unified way to perform operations on tokens

#### 3. **No Operation Abstraction**
```
Current:
Each operation (sync, export) is implemented differently
No common interface
Can't compose, track, or rollback operations
```

**Problem:** Can't build a plugin UI that generically executes operations

#### 4. **Input/Output Coupling**
```
Current:
Format parsers (W3C) are tightly coupled to Token creation
Output (Figma sync) is tightly coupled to Figma API
Hard to add new inputs/outputs
```

**Problem:** Not truly agnostic - adding new sources/targets is hard

#### 5. **UI Would Show Mixed Concerns**
```
Current hypothetical UI:
- Shows Token model ✅
- But sync logic is buried in services ❌
- No way to generically "execute operation X" ❌
- Can't show operation history/status ❌
```

**Problem:** UI can't be built on clean abstractions

---

## 🎯 Objective

### Primary Goal
**Create a clean, layered architecture where:**
1. **Each layer has a single responsibility**
2. **Layers depend on abstractions, not implementations**
3. **The UI can show and manipulate the abstract Token model**
4. **Operations are first-class citizens that can be executed, validated, tracked**
5. **Adding new formats, operations, or outputs is trivial**

### Design Principles to Follow

#### 1. **Hexagonal/Ports & Adapters Architecture**
- Core domain (Token model, operations) is independent
- Adapters connect to external systems (files, Figma, APIs)
- Ports define contracts (interfaces)

#### 2. **SOLID Principles**
- **Single Responsibility**: Each class has one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Implementations are interchangeable
- **Interface Segregation**: Focused, role-specific interfaces
- **Dependency Inversion**: Depend on abstractions

#### 3. **Domain-Driven Design (DDD) Concepts**
- **Entities**: Token (has identity)
- **Value Objects**: Color, Spacing (immutable values)
- **Aggregates**: TokenCollection (group of related tokens)
- **Services**: Operations that don't belong to entities
- **Repositories**: Persistence abstraction

---

## 💡 Propositions

### Option 1: **Minimal Refactor** (Low Risk, Medium Benefit)

**Keep current structure, add operation interfaces**

```
Add:
├── ITokenOperation interface (base for all operations)
├── OperationRegistry (register and execute operations)
└── Refactor FigmaSyncService to implement ITokenOperation

Benefits:
✅ Quick to implement
✅ Backward compatible
✅ Enables operation abstraction

Drawbacks:
❌ Doesn't fix layer coupling
❌ Still scattered logic
❌ Minimal architectural improvement
```

**Effort:** 2-3 days
**Risk:** Low
**Long-term Value:** Medium

---

### Option 2: **Layered Architecture** (Medium Risk, High Benefit) ⭐ RECOMMENDED

**Introduce clear layers with defined boundaries**

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│              (Figma Plugin UI - Future)                      │
│    Shows: Token Model, Collections, Operation Status         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│              (Orchestrates Use Cases)                        │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │           Use Case Controllers                   │        │
│  │  • ImportTokensUseCase                          │        │
│  │  • SyncToFigmaUseCase                           │        │
│  │  • TransformTokensUseCase                       │        │
│  │  • ExportTokensUseCase                          │        │
│  │  • ValidateTokensUseCase                        │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER ⭐                          │
│              (Business Logic & Abstractions)                 │
│                                                               │
│  ┌──────────────────────────────────────────────┐           │
│  │              Core Models                      │           │
│  │  • Token (entity)                            │           │
│  │  • TokenCollection (aggregate)               │           │
│  │  • TokenReference (value object)             │           │
│  └──────────────────────────────────────────────┘           │
│                                                               │
│  ┌──────────────────────────────────────────────┐           │
│  │           Domain Services                     │           │
│  │  • TokenValidator                            │           │
│  │  • TokenResolver                             │           │
│  │  • TokenTransformer                          │           │
│  │  • TokenLevelAnalyzer                        │           │
│  └──────────────────────────────────────────────┘           │
│                                                               │
│  ┌──────────────────────────────────────────────┐           │
│  │            Repository Interfaces (Ports)      │           │
│  │  • ITokenRepository                          │           │
│  │  • ITokenHistoryRepository                   │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                         │
│              (Adapters to External Systems)                  │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   INPUT      │  │   STORAGE    │  │   OUTPUT     │      │
│  │   ADAPTERS   │  │   ADAPTERS   │  │   ADAPTERS   │      │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤      │
│  │ • W3CParser  │  │ • InMemory   │  │ • FigmaSync  │      │
│  │ • SDParser   │  │ • FileSystem │  │ • JSONExport │      │
│  │ • FigmaRead  │  │ • LocalStore │  │ • CSSExport  │      │
│  │ • APIReader  │  │              │  │ • SDKExport  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

**Key Changes:**

1. **Application Layer (NEW)**
   - Use Cases orchestrate domain operations
   - Example: `ImportTokensUseCase`:
     ```typescript
     execute(input: JSONFiles) {
       1. Parse with ITokenParser (infrastructure)
       2. Validate with TokenValidator (domain)
       3. Store with ITokenRepository (domain port)
       4. Return abstract Token[]
     }
     ```

2. **Domain Layer (ENHANCED)**
   - Pure business logic, no external dependencies
   - Only depends on interfaces (ports)
   - Token model is the center

3. **Infrastructure Layer (REORGANIZED)**
   - All adapters live here
   - Implement domain interfaces
   - Can be swapped/mocked easily

**Benefits:**
✅ Clear separation of concerns
✅ Easy to test (mock infrastructure)
✅ Easy to extend (add new adapters)
✅ UI works purely with domain layer
✅ Business logic is isolated

**Drawbacks:**
❌ More files/folders
❌ Requires refactoring existing code
❌ Learning curve for team

**Effort:** 1-2 weeks
**Risk:** Medium
**Long-term Value:** High ⭐

---

### Option 3: **Full DDD + CQRS** (High Risk, Highest Benefit)

**Add Command/Query separation and event sourcing**

```
Domain Layer
├── Commands (write operations)
│   ├── CreateTokenCommand
│   ├── UpdateTokenCommand
│   └── SyncToFigmaCommand
│
├── Queries (read operations)
│   ├── GetTokenByIdQuery
│   ├── SearchTokensQuery
│   └── GetCollectionQuery
│
├── Events (domain events)
│   ├── TokenCreatedEvent
│   ├── TokenUpdatedEvent
│   └── TokensSyncedEvent
│
└── Event Handlers
    ├── NotifyUIHandler
    ├── InvalidateCacheHandler
    └── AuditLogHandler
```

**Benefits:**
✅ Extremely scalable
✅ Full operation history
✅ Easy undo/redo
✅ Reactive UI updates
✅ Audit trail built-in

**Drawbacks:**
❌ Very complex
❌ Overkill for current needs
❌ 3-4 week refactor
❌ High risk

**Effort:** 3-4 weeks
**Risk:** High
**Long-term Value:** Highest (but maybe unnecessary)

---

## 📊 Comparison Matrix

| Aspect | Option 1: Minimal | Option 2: Layered ⭐ | Option 3: Full DDD |
|--------|------------------|---------------------|-------------------|
| **Effort** | 2-3 days | 1-2 weeks | 3-4 weeks |
| **Risk** | Low | Medium | High |
| **Testability** | Medium | High | Highest |
| **Extensibility** | Medium | High | Highest |
| **UI Simplicity** | Medium | High | High |
| **Maintainability** | Medium | High | Highest |
| **Learning Curve** | Low | Medium | High |
| **Overkill Factor** | No | No | **Yes** |

---

## 🎯 Recommended Approach: **Option 2 (Layered Architecture)**

### Why This Is The Sweet Spot

1. **Addresses Core Problems**
   - ✅ Separates concerns clearly
   - ✅ Makes UI work with abstractions
   - ✅ Enables easy extension

2. **Pragmatic**
   - ✅ Not overkill for a Figma plugin
   - ✅ Reasonable effort (1-2 weeks)
   - ✅ Can evolve to Option 3 later if needed

3. **Enables Future Features**
   - ✅ CRUD operations become trivial
   - ✅ Multiple export formats easy to add
   - ✅ Plugin UI can be built on clean APIs

---

## 📝 Implementation Plan (Option 2)

### Phase 1: **Define Domain Boundaries** (2-3 days)

**Goal:** Create clear interfaces and contracts

**Tasks:**
1. Define Use Case interfaces
   ```typescript
   interface IUseCase<TInput, TOutput> {
     execute(input: TInput): Promise<Result<TOutput>>;
   }
   ```

2. Define domain ports (interfaces)
   ```typescript
   interface ITokenParser {
     parse(data: unknown, context?: ParseContext): Result<Token[]>;
   }

   interface ITokenExporter {
     export(tokens: Token[], options: ExportOptions): Result<OutputData>;
   }
   ```

3. Document layer boundaries
   - What each layer is responsible for
   - What each layer can/cannot depend on

**Deliverable:** Architecture decision record (ADR) document

---

### Phase 2: **Create Application Layer** (3-4 days)

**Goal:** Implement use cases that orchestrate operations

**Tasks:**
1. Create Use Case base class/interface
2. Implement core use cases:
   - `ImportTokensUseCase`
   - `SyncToFigmaUseCase`
   - `ExportTokensUseCase`
   - `GetTokensUseCase` (query)

3. Add dependency injection container (optional but recommended)

**Deliverable:** Working use cases with tests

---

### Phase 3: **Refactor Infrastructure** (3-4 days)

**Goal:** Move adapters to infrastructure layer

**Tasks:**
1. Create `src/infrastructure/` folder structure:
   ```
   infrastructure/
   ├── input/
   │   ├── W3CTokenParser.ts
   │   ├── StyleDictionaryParser.ts
   │   └── FigmaTokenReader.ts
   ├── output/
   │   ├── FigmaVariablesSyncer.ts
   │   ├── FigmaStylesSyncer.ts
   │   ├── JSONExporter.ts
   │   └── CSSExporter.ts
   └── storage/
       ├── InMemoryTokenRepository.ts
       └── FileSystemTokenRepository.ts
   ```

2. Make all adapters implement domain interfaces
3. Update imports throughout codebase

**Deliverable:** Clean infrastructure layer

---

### Phase 4: **Enhance Domain Layer** (2-3 days)

**Goal:** Add missing domain services and value objects

**Tasks:**
1. Extract domain services:
   - `TokenValidator` (validation logic)
   - `TokenTransformer` (transform operations)
   - Keep: `TokenResolver`, `TokenLevelAnalyzer`

2. Create value objects for complex types:
   - `ColorValue`
   - `DimensionValue`
   - `TokenReference`

3. Add domain events (optional):
   - `TokenImportedEvent`
   - `TokensSyncedEvent`

**Deliverable:** Rich domain model

---

### Phase 5: **Update Plugin Integration** (1-2 days)

**Goal:** Make backend use new architecture

**Tasks:**
1. Update `src/backend/main.ts` to use use cases
2. Replace direct service calls with use case execution
3. Add error handling at use case boundaries

**Deliverable:** Plugin works with new architecture

---

### Phase 6: **Testing & Documentation** (2-3 days)

**Goal:** Ensure quality and knowledge transfer

**Tasks:**
1. Write tests for each layer
2. Create architecture diagram
3. Update ARCHITECTURE.md
4. Add migration guide

**Deliverable:** Fully tested, documented architecture

---

## 🎬 Next Steps

### To Proceed, We Need To Decide:

1. **Do you agree with Option 2 (Layered Architecture)?**
   - Or prefer Option 1 (minimal) or Option 3 (full DDD)?

2. **What's the priority?**
   - Ship features fast → Option 1
   - Build solid foundation → Option 2 ⭐
   - Future-proof everything → Option 3

3. **What's your timeline?**
   - Need it ASAP → Option 1
   - Can invest 1-2 weeks → Option 2 ⭐
   - Have 1 month → Option 3

4. **Which phase should we start with?**
   - I recommend: **Phase 1 (Define Domain Boundaries)**
   - This is low-risk and gives us clear direction

---

## 💬 Discussion Questions

1. **UI Direction:** What should users see/do in the plugin UI?
   - Browse tokens by collection/level?
   - Execute operations (sync, export)?
   - Edit tokens (CRUD)?
   - Validate tokens?

2. **Future Features:** What operations are planned?
   - Export to CSS/SCSS?
   - Import from Figma?
   - Token versioning?
   - Diffing/merging?

3. **Integration:** Will this integrate with external systems?
   - Git repositories?
   - Design system documentation?
   - CI/CD pipelines?

4. **Constraints:** Any technical constraints?
   - Bundle size limits?
   - Performance requirements?
   - Team skill level?

---

## 📚 References

- **Hexagonal Architecture**: Alistair Cockburn
- **Clean Architecture**: Robert C. Martin
- **Domain-Driven Design**: Eric Evans
- **SOLID Principles**: Robert C. Martin

---

**Let's discuss! Which option resonates with you? What questions do you have?**

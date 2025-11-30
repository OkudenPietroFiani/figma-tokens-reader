# Layer Responsibilities & Dependency Rules

**Layered Architecture for Figma Token Management Plugin**

---

## 📐 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                         │
│                   (src/frontend + src/backend/main.ts)        │
│                                                                │
│  Responsibilities:                                            │
│  • Figma plugin UI (React components)                        │
│  • User interactions and events                              │
│  • Display Token model                                       │
│  • Call use cases                                            │
│                                                                │
│  Dependencies: ↓ Application Layer only                      │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                          │
│                     (src/application)                         │
│                                                                │
│  Responsibilities:                                            │
│  • Use cases (ImportTokensUseCase, SyncToFigmaUseCase)      │
│  • Orchestrate domain services + infrastructure             │
│  • Transaction boundaries                                    │
│  • Error handling, logging                                   │
│  • Input validation                                          │
│                                                                │
│  Dependencies: ↓ Domain Layer, ↓ Infrastructure Layer       │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                             │
│                       (src/core)                              │
│                                                                │
│  Responsibilities:                                            │
│  • Core business logic                                       │
│  • Token model (entities, value objects)                    │
│  • Domain services (validation, resolution, transformation)  │
│  • Ports (interfaces for infrastructure)                    │
│  • Business rules and invariants                            │
│                                                                │
│  Dependencies: NONE (pure domain logic)                      │
└──────────────────────────────────────────────────────────────┘
                              ↑
┌──────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                         │
│                   (src/infrastructure)                        │
│                                                                │
│  Responsibilities:                                            │
│  • Adapters to external systems                             │
│  • Input: Parsers (W3C, Style Dictionary, Figma)           │
│  • Output: Exporters (Figma Variables, Styles, JSON, CSS)  │
│  • Storage: Repository implementations                      │
│  • External API clients                                     │
│                                                                │
│  Dependencies: ↑ Domain Layer (implements ports)            │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Dependency Rule

**The Golden Rule:**
> **Dependencies flow inward → Domain layer has NO outward dependencies**

```
Presentation → Application → Domain ← Infrastructure
```

- **Presentation** depends on **Application**
- **Application** depends on **Domain** and **Infrastructure**
- **Domain** depends on **nothing** (pure business logic)
- **Infrastructure** depends on **Domain** (implements interfaces)

**Why?**
- Domain logic is independent of frameworks, UIs, databases
- Easy to test domain logic in isolation
- Easy to swap infrastructure (e.g., different storage, different parsers)

---

## 📁 Folder Structure

```
src/
├── frontend/                    # PRESENTATION LAYER
│   ├── components/              # React components
│   ├── hooks/                   # React hooks
│   └── index.ts                 # Entry point
│
├── backend/                     # PRESENTATION LAYER (Plugin Backend)
│   └── main.ts                  # Figma plugin entry, wires dependencies
│
├── application/                 # APPLICATION LAYER (NEW)
│   ├── use-cases/
│   │   ├── ImportTokensUseCase.ts
│   │   ├── SyncToFigmaVariablesUseCase.ts
│   │   ├── SyncToFigmaStylesUseCase.ts
│   │   ├── GetTokensUseCase.ts
│   │   └── GenerateDocumentationUseCase.ts
│   ├── interfaces/
│   │   └── IUseCase.ts
│   └── UseCaseRegistry.ts
│
├── core/                        # DOMAIN LAYER
│   ├── models/                  # Entities & Value Objects
│   │   ├── Token.ts
│   │   ├── TokenCollection.ts
│   │   └── TokenReference.ts
│   ├── services/                # Domain Services
│   │   ├── TokenValidator.ts
│   │   ├── TokenResolver.ts
│   │   ├── TokenTransformer.ts
│   │   └── TokenLevelAnalyzer.ts
│   ├── ports/                   # Interfaces for Infrastructure (NEW)
│   │   ├── ITokenParser.ts
│   │   ├── ITokenExporter.ts
│   │   └── ITokenRepository.ts
│   ├── interfaces/              # Domain Interfaces
│   │   └── (existing interfaces)
│   └── config/                  # Domain configuration
│
├── infrastructure/              # INFRASTRUCTURE LAYER (NEW)
│   ├── input/                   # Input Adapters (Parsers)
│   │   ├── W3CTokenParser.ts
│   │   ├── StyleDictionaryParser.ts
│   │   ├── TokenParserRegistry.ts
│   │   └── FigmaTokenReader.ts (future)
│   ├── output/                  # Output Adapters (Exporters)
│   │   ├── FigmaVariablesExporter.ts
│   │   ├── FigmaStylesExporter.ts
│   │   ├── JSONExporter.ts
│   │   ├── CSSExporter.ts (future)
│   │   └── TokenExporterRegistry.ts
│   └── storage/                 # Storage Adapters
│       ├── InMemoryTokenRepository.ts
│       └── LocalStorageTokenRepository.ts (future)
│
├── shared/                      # Shared utilities
│   ├── types.ts
│   └── utils.ts
│
└── __tests__/                   # Tests (mirror src structure)
```

---

## 📋 Layer Details

### 1. Presentation Layer

**Location:** `src/frontend/`, `src/backend/main.ts`

**What Belongs Here:**
- ✅ React components (UI)
- ✅ Figma plugin event handlers
- ✅ User input validation (UI-level)
- ✅ Display logic
- ✅ Dependency injection setup (main.ts)

**What Does NOT Belong Here:**
- ❌ Business logic
- ❌ Token validation rules
- ❌ Parsing logic
- ❌ Figma API calls (those go in Infrastructure)

**Example Code:**
```typescript
// src/backend/main.ts
import { ImportTokensUseCase } from '../application/use-cases/ImportTokensUseCase';
import { InMemoryTokenRepository } from '../infrastructure/storage/InMemoryTokenRepository';
import { W3CTokenParser } from '../infrastructure/input/W3CTokenParser';

// Wire dependencies
const repository = new InMemoryTokenRepository();
const parser = new W3CTokenParser();
const importUseCase = new ImportTokensUseCase(parser, repository);

// Handle Figma plugin command
figma.on('import-tokens', async (data) => {
  const result = await importUseCase.execute({ data, projectId: 'default' });
  // Handle result
});
```

**Dependencies:**
- ✅ Can import from Application Layer
- ❌ Cannot import from Domain or Infrastructure directly

---

### 2. Application Layer

**Location:** `src/application/`

**What Belongs Here:**
- ✅ Use cases (one per user action/operation)
- ✅ Orchestration logic (coordinate domain + infrastructure)
- ✅ Transaction boundaries
- ✅ Error handling and logging
- ✅ Input/output DTOs (if needed)

**What Does NOT Belong Here:**
- ❌ Business rules (those go in Domain)
- ❌ External API calls (those go in Infrastructure)
- ❌ UI logic

**Example Code:**
```typescript
// src/application/use-cases/ImportTokensUseCase.ts
import { IUseCase } from '../interfaces/IUseCase';
import { ITokenParser } from '../../core/ports/ITokenParser';
import { ITokenRepository } from '../../core/ports/ITokenRepository';
import { TokenValidator } from '../../core/services/TokenValidator';
import { Token } from '../../core/models/Token';
import { Result } from '../../shared/types';

export class ImportTokensUseCase implements IUseCase<ImportInput, Token[]> {
  constructor(
    private parser: ITokenParser,
    private repository: ITokenRepository,
    private validator: TokenValidator
  ) {}

  async execute(input: ImportInput): Promise<Result<Token[]>> {
    // 1. Parse tokens (infrastructure)
    const parseResult = await this.parser.parse(input.data, input.context);
    if (!parseResult.success) return parseResult;

    // 2. Validate tokens (domain)
    const validation = this.validator.validateMany(parseResult.data);
    if (!validation.valid) {
      return Failure(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // 3. Store tokens (infrastructure)
    const saveResult = this.repository.saveMany(parseResult.data);

    return saveResult;
  }
}
```

**Dependencies:**
- ✅ Can import from Domain Layer (ports, services, models)
- ✅ Can import from Infrastructure Layer (concrete implementations)
- ❌ Cannot import from Presentation Layer

---

### 3. Domain Layer

**Location:** `src/core/`

**What Belongs Here:**
- ✅ Entities (Token, TokenCollection)
- ✅ Value objects (ColorValue, DimensionValue)
- ✅ Domain services (TokenValidator, TokenResolver)
- ✅ Ports (interfaces for infrastructure)
- ✅ Business rules and invariants
- ✅ Domain events (optional)

**What Does NOT Belong Here:**
- ❌ Framework-specific code (React, Figma API)
- ❌ External dependencies (axios, fs, etc.)
- ❌ UI logic
- ❌ Infrastructure details

**Example Code:**
```typescript
// src/core/models/Token.ts
export interface Token {
  id: string;
  name: string;
  qualifiedName: string;
  path: string[];
  type: TokenType;
  value: any;
  // ... business logic, no infrastructure
}

// src/core/services/TokenValidator.ts
export class TokenValidator {
  validate(token: Token): ValidationResult {
    // Pure business logic
    if (!token.name) {
      return { valid: false, errors: ['Token must have a name'] };
    }
    // More validation rules...
    return { valid: true, errors: [] };
  }
}

// src/core/ports/ITokenRepository.ts (Port for infrastructure)
export interface ITokenRepository {
  findById(id: string): Token | undefined;
  saveMany(tokens: Token[]): Result<Token[]>;
  // ... interface only, implementation in infrastructure
}
```

**Dependencies:**
- ❌ ZERO dependencies on other layers
- ✅ Can depend on shared utilities (if pure functions)

---

### 4. Infrastructure Layer

**Location:** `src/infrastructure/`

**What Belongs Here:**
- ✅ Parsers (W3C, Style Dictionary, etc.)
- ✅ Exporters (Figma Variables, Figma Styles, JSON, CSS)
- ✅ Repository implementations
- ✅ External API clients
- ✅ File I/O, network calls
- ✅ Framework integrations

**What Does NOT Belong Here:**
- ❌ Business logic
- ❌ Domain rules

**Example Code:**
```typescript
// src/infrastructure/input/W3CTokenParser.ts
import { ITokenParser } from '../../core/ports/ITokenParser';
import { Token } from '../../core/models/Token';
import { Result } from '../../shared/types';

export class W3CTokenParser implements ITokenParser {
  readonly name = 'W3C Design Tokens';

  detectFormat(data: unknown): number {
    // Detection logic
    return 0.9; // 90% confidence
  }

  parse(data: unknown, context?: ParseContext): Result<Token[]> {
    // Parse W3C format
    // Convert to Token model
    return Success(tokens);
  }
}

// src/infrastructure/output/FigmaVariablesExporter.ts
import { ITokenExporter } from '../../core/ports/ITokenExporter';
import { Token } from '../../core/models/Token';

export class FigmaVariablesExporter implements ITokenExporter {
  readonly name = 'Figma Variables';

  export(tokens: Token[], options: ExportOptions): Result<ExportData> {
    // Call Figma API
    for (const token of tokens) {
      figma.variables.createVariable(token.name, ...);
    }
    return Success({ count: tokens.length });
  }
}
```

**Dependencies:**
- ✅ Can import from Domain Layer (implements ports)
- ❌ Cannot import from Application or Presentation layers

---

## ✅ Checklist: Where Does This Code Go?

### Is it a React component or UI logic?
→ **Presentation Layer** (`src/frontend/`)

### Is it orchestrating multiple domain/infrastructure pieces?
→ **Application Layer** (`src/application/use-cases/`)

### Is it a business rule, entity, or domain service?
→ **Domain Layer** (`src/core/`)

### Is it talking to external systems (Figma API, files, network)?
→ **Infrastructure Layer** (`src/infrastructure/`)

---

## 🚫 Anti-Patterns to Avoid

### ❌ Domain Depending on Infrastructure
```typescript
// BAD: Domain importing from infrastructure
import { FigmaSyncService } from '../../infrastructure/output/FigmaSync';

export class Token {
  sync() {
    new FigmaSyncService().sync(this); // ❌ Domain knows about Figma
  }
}
```

```typescript
// GOOD: Domain defines port, infrastructure implements
export interface ITokenExporter {
  export(token: Token): Result<void>;
}

// Infrastructure implements
export class FigmaVariablesExporter implements ITokenExporter {
  export(token: Token): Result<void> { ... }
}
```

### ❌ Presentation Calling Infrastructure Directly
```typescript
// BAD: UI calling parser directly
import { W3CTokenParser } from '../infrastructure/input/W3CTokenParser';

function ImportButton() {
  const parser = new W3CTokenParser();
  const tokens = parser.parse(data); // ❌ UI knows about parsers
}
```

```typescript
// GOOD: UI calls use case
import { useImportTokens } from '../hooks/useImportTokens';

function ImportButton() {
  const { importTokens } = useImportTokens();
  importTokens(data); // ✅ UI calls application layer
}
```

### ❌ Business Logic in Infrastructure
```typescript
// BAD: Validation in parser
export class W3CTokenParser {
  parse(data: unknown): Token[] {
    const tokens = ...;
    // ❌ Business logic in infrastructure
    if (token.value < 0) {
      throw new Error('Invalid value');
    }
  }
}
```

```typescript
// GOOD: Validation in domain
export class TokenValidator {
  validate(token: Token): ValidationResult {
    // ✅ Business logic in domain
    if (token.value < 0) {
      return { valid: false, errors: ['Value must be positive'] };
    }
  }
}
```

---

## 📊 Testing Strategy by Layer

### Presentation Layer
- **Unit Tests:** React component tests (Jest + React Testing Library)
- **Integration Tests:** User flow tests
- **Mocks:** Mock use cases

### Application Layer
- **Unit Tests:** Use case tests with mocked dependencies
- **Integration Tests:** Use cases with real domain + mocked infrastructure
- **Mocks:** Mock parsers, exporters, repositories

### Domain Layer
- **Unit Tests:** Pure domain logic tests (no mocks needed!)
- **Tests:** Fast, isolated, deterministic
- **No Mocks:** Domain has no dependencies

### Infrastructure Layer
- **Unit Tests:** Adapter tests with mocked external systems
- **Integration Tests:** Real Figma API calls (in test environment)
- **Mocks:** Mock Figma API, file system, network

---

## 🎯 Summary

| Layer | Location | Dependencies | What Goes Here |
|-------|----------|--------------|----------------|
| **Presentation** | `frontend/`, `backend/main.ts` | → Application | UI, user interactions, wiring |
| **Application** | `application/` | → Domain, Infrastructure | Use cases, orchestration |
| **Domain** | `core/` | None | Business logic, entities, ports |
| **Infrastructure** | `infrastructure/` | → Domain | Parsers, exporters, storage, APIs |

**Remember:** Domain layer is the heart. Keep it pure and independent! 💚

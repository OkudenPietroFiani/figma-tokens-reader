# Architecture Documentation

## Overview

This plugin follows **Layered Architecture** (Hexagonal/Ports & Adapters pattern) with strict separation of concerns across four layers.

**Version:** 3.0 (Layered Architecture)
**Last Updated:** 2025-11-30

---

## Layered Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                         │
│  • Figma Plugin UI (React-free vanilla TS)                   │
│  • Plugin Backend (dependency injection)                     │
│  • Controllers (request handlers)                            │
│                                                                │
│  Responsibilities: User interactions, wiring dependencies    │
└────────────────────────┬─────────────────────────────────────┘
                         │ calls
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                          │
│  • Use Cases (ImportTokens, SyncToFigma, GetTokens, etc.)   │
│  • Use Case Registry (command execution)                     │
│                                                                │
│  Responsibilities: Orchestrate domain + infrastructure       │
└────────────────────────┬─────────────────────────────────────┘
                         │ orchestrates
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                       DOMAIN LAYER                            │
│  • Token Model (universal abstraction)                       │
│  • Domain Services (Validator, Resolver, Transformer)        │
│  • Ports (ITokenParser, ITokenExporter, ITokenRepository)    │
│                                                                │
│  Responsibilities: Pure business logic (NO external deps)    │
└────────────────────────┬─────────────────────────────────────┘
                         ↑ implements
                         │
┌──────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                        │
│  • Input Adapters (W3CParser, StyleDictionaryParser)         │
│  • Output Adapters (FigmaExporter, JSONExporter, CSSExporter)│
│  • Storage Adapters (InMemoryRepository, LocalStorage)       │
│  • Registries (ParserRegistry, ExporterRegistry)             │
│                                                                │
│  Responsibilities: External system interactions              │
└──────────────────────────────────────────────────────────────┘
```

### Dependency Rule

**Critical**: Dependencies flow **inward** toward the domain:

```
Presentation → Application → Domain ← Infrastructure
```

- **Domain** has ZERO dependencies on outer layers (pure business logic)
- **Application** depends on Domain (uses domain services) and Infrastructure (uses adapters)
- **Infrastructure** depends on Domain (implements ports)
- **Presentation** depends on Application (calls use cases)

---

## Directory Structure

```
src/
├── application/                    # APPLICATION LAYER
│   ├── use-cases/
│   │   ├── ImportTokensUseCase.ts          # Import tokens from files
│   │   ├── SyncToFigmaVariablesUseCase.ts  # Sync to Figma Variables
│   │   └── GetTokensUseCase.ts             # Query tokens
│   ├── interfaces/
│   │   └── IUseCase.ts                     # Base use case interface
│   └── UseCaseRegistry.ts                  # Central command registry
│
├── core/                           # DOMAIN LAYER
│   ├── models/
│   │   └── Token.ts                        # Universal token model (entity)
│   ├── services/
│   │   ├── TokenValidator.ts               # Validation logic
│   │   ├── TokenResolver.ts                # Reference resolution
│   │   ├── TokenTransformer.ts             # Transformations
│   │   ├── TokenLevelAnalyzer.ts           # Hierarchy analysis
│   │   ├── TokenProcessor.ts               # Format → Token conversion
│   │   ├── TokenRepository.ts              # Core repository (to be moved)
│   │   └── FigmaSyncService.ts             # Figma sync logic
│   ├── ports/                              # Interfaces for infrastructure
│   │   ├── ITokenParser.ts                 # Input adapter interface
│   │   ├── ITokenExporter.ts               # Output adapter interface
│   │   └── ITokenRepository.ts             # Storage interface
│   ├── interfaces/
│   │   ├── ITokenFormatStrategy.ts
│   │   └── IFileSource.ts
│   ├── adapters/                           # (Legacy, being phased out)
│   │   ├── W3CTokenFormatStrategy.ts       # Used by W3CTokenParser
│   │   └── StyleDictionaryFormatStrategy.ts
│   ├── registries/
│   │   ├── TokenFormatRegistry.ts
│   │   └── FileSourceRegistry.ts
│   ├── converters/                         # Value converters
│   └── config/
│       └── FeatureFlags.ts
│
├── infrastructure/                 # INFRASTRUCTURE LAYER
│   ├── input/                              # Input Adapters (Parsers)
│   │   ├── W3CTokenParser.ts               # W3C format parser
│   │   ├── TokenParserRegistry.ts          # Parser registry
│   │   └── StyleDictionaryParser.ts        # (TODO)
│   ├── output/                             # Output Adapters (Exporters)
│   │   ├── FigmaVariablesExporter.ts       # Export to Figma Variables
│   │   ├── FigmaStylesExporter.ts          # (TODO) Export to Figma Styles
│   │   ├── JSONExporter.ts                 # (TODO) Export to JSON
│   │   ├── CSSExporter.ts                  # (TODO) Export to CSS
│   │   └── TokenExporterRegistry.ts        # Exporter registry
│   └── storage/                            # Storage Adapters
│       ├── InMemoryTokenRepository.ts      # In-memory storage
│       └── LocalStorageRepository.ts       # (TODO) Browser localStorage
│
├── backend/                        # PRESENTATION LAYER (Backend)
│   ├── main.ts                             # Plugin entry, dependency injection
│   ├── controllers/
│   │   ├── TokenController.ts              # Token operations
│   │   ├── GitHubController.ts             # GitHub integration
│   │   ├── ScopeController.ts              # Scope management
│   │   └── DocumentationController.ts      # Doc generation
│   ├── services/
│   │   ├── DocumentationGenerator.ts
│   │   └── StorageService.ts
│   └── utils/
│       └── ErrorHandler.ts
│
├── frontend/                       # PRESENTATION LAYER (UI)
│   ├── index.ts                            # UI entry point
│   ├── components/
│   │   ├── WelcomeScreen.ts
│   │   ├── ImportScreen.ts
│   │   ├── TokenScreen.ts
│   │   ├── ScopeScreen.ts
│   │   └── DocumentationScreen.ts
│   ├── services/
│   │   └── PluginBridge.ts                 # postMessage wrapper
│   └── state/
│       └── AppState.ts                     # State management
│
├── services/                       # Shared Services
│   ├── githubService.ts
│   └── styleManager.ts
│
├── shared/                         # Shared Code
│   ├── types.ts
│   ├── constants.ts
│   ├── utils.ts
│   └── logger.ts
│
├── utils/                          # Pure Utilities
│   ├── BatchProcessor.ts
│   ├── Base64Decoder.ts
│   └── htmlSanitizer.ts
│
└── __tests__/                      # Tests
    ├── application/
    ├── core/
    ├── infrastructure/
    └── utils/
```

---

## Core Patterns

### 1. Layered Architecture

**Purpose**: Separate concerns across clear boundaries

**Layers**:
- **Presentation**: UI, user interactions
- **Application**: Use cases, orchestration
- **Domain**: Business logic, pure functions
- **Infrastructure**: External system adapters

**Benefits**:
- Easy to test (mock dependencies)
- Easy to extend (add new use cases/adapters)
- Independent deployment (layers can evolve separately)

### 2. Ports & Adapters (Hexagonal Architecture)

**Domain defines "ports" (interfaces)**:
```typescript
// Domain layer defines the contract
export interface ITokenParser {
  parse(data: TokenData): Promise<Result<Token[]>>;
}
```

**Infrastructure provides "adapters" (implementations)**:
```typescript
// Infrastructure implements the contract
export class W3CTokenParser implements ITokenParser {
  async parse(data: TokenData): Promise<Result<Token[]>> {
    // Implementation details
  }
}
```

### 3. Use Case Pattern

Each user action is a dedicated use case:

```typescript
export class ImportTokensUseCase implements IUseCase<ImportInput, Token[]> {
  constructor(
    private parser: ITokenParser,
    private repository: ITokenRepository
  ) {}

  async execute(input: ImportInput): Promise<Result<Token[]>> {
    // 1. Parse tokens
    const parseResult = await this.parser.parse(input.data);

    // 2. Store tokens
    const saveResult = this.repository.saveMany(parseResult.data);

    return saveResult;
  }
}
```

**Benefits**:
- Single responsibility (one action per use case)
- Easy to test (mock dependencies)
- Clear API for presentation layer

### 4. Repository Pattern

Abstract storage interface:

```typescript
export interface ITokenRepository {
  findById(id: string): Token | undefined;
  query(criteria: QueryCriteria): Token[];
  save(token: Token): Result<Token>;
  // ... CRUD operations
}
```

**Implementations**:
- `InMemoryTokenRepository` (current)
- `LocalStorageRepository` (future)
- `RemoteAPIRepository` (future)

### 5. Registry Pattern

Dynamic registration of parsers/exporters:

```typescript
// Register parsers
parserRegistry.register(new W3CTokenParser());
parserRegistry.register(new StyleDictionaryParser());

// Auto-detect and use
const parser = parserRegistry.detectParser(data);
const tokens = await parser.parse(data);
```

**Benefits**:
- Open/Closed principle (add without modifying)
- Auto-detection of formats
- Easy to add new parsers

### 6. Dependency Injection

All dependencies wired in `main.ts`:

```typescript
// Create infrastructure
const parserRegistry = new TokenParserRegistry();
parserRegistry.register(new W3CTokenParser());

const repository = new InMemoryTokenRepository();
const exporter = new FigmaVariablesExporter(repository, resolver);

// Create use cases with dependencies
const importUseCase = new ImportTokensUseCase(parserRegistry, repository);
const syncUseCase = new SyncToFigmaVariablesUseCase(repository, exporter);

// Register use cases
useCaseRegistry.register('import-tokens', importUseCase);
useCaseRegistry.register('sync-to-figma', syncUseCase);
```

**Benefits**:
- Testability (swap real implementations with mocks)
- Flexibility (change implementations without changing code)
- Clear dependencies (all in one place)

### 7. Result Pattern

Type-safe error handling:

```typescript
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Usage
const result = await useCase.execute(input);
if (result.success) {
  // Handle success
  console.log(result.data);
} else {
  // Handle error
  console.error(result.error);
}
```

**Benefits**:
- No exceptions
- Forced error handling
- Type-safe

---

## Adding New Features

### Add a New Parser

1. **Create adapter** in `src/infrastructure/input/`:
```typescript
export class StyleDictionaryParser implements ITokenParser {
  readonly name = 'Style Dictionary';

  detectFormat(data: TokenData): number {
    // Detection logic
  }

  async parse(data: TokenData): Promise<Result<Token[]>> {
    // Parsing logic
  }
}
```

2. **Register in main.ts**:
```typescript
parserRegistry.register(new StyleDictionaryParser());
```

**Done!** No other changes needed.

### Add a New Exporter

1. **Create adapter** in `src/infrastructure/output/`:
```typescript
export class CSSExporter implements ITokenExporter {
  readonly name = 'CSS Variables';
  readonly targetFormat = 'css';

  async export(tokens: Token[]): Promise<Result<ExportResult>> {
    // Generate CSS
  }
}
```

2. **Register in main.ts**:
```typescript
exporterRegistry.register(new CSSExporter());
```

**Done!**

### Add a New Use Case

1. **Create use case** in `src/application/use-cases/`:
```typescript
export class CreateTokenUseCase extends UseCase<CreateInput, Token> {
  constructor(
    private repository: ITokenRepository,
    private validator: ITokenValidator
  ) {
    super();
  }

  protected async executeImpl(input: CreateInput): Promise<Result<Token>> {
    // Validate
    const validation = this.validator.validate(input);

    // Create token
    const token = { ...input, id: generateId() };

    // Save
    return this.repository.save(token);
  }
}
```

2. **Register in main.ts**:
```typescript
const createUseCase = new CreateTokenUseCase(repository, validator);
useCaseRegistry.register('create-token', createUseCase);
```

3. **Call from UI/controller**:
```typescript
const result = await useCaseRegistry.execute('create-token', input);
```

**Done!**

---

## Testing Strategy

### Domain Layer
- **Pure unit tests** (no mocks needed!)
- Test business logic in isolation
- Fast, deterministic

### Application Layer
- **Unit tests with mocked dependencies**
- Mock parsers, exporters, repositories
- Test orchestration logic

### Infrastructure Layer
- **Integration tests** (mock external systems)
- Test parsers with real JSON
- Test exporters with mocked Figma API

### Presentation Layer
- **End-to-end tests**
- Test full user flows
- Use real use cases with mocked infrastructure

---

## Figma Environment Constraints

### Bundle Size
- **Current**: 247.9 KB
- **Target**: < 300 KB
- **Strategy**: Tree-shaking, minimal dependencies

### Runtime Constraints
- No Node.js APIs (fs, path, etc.)
- ES2017 target
- Runs in Figma sandbox (limited browser APIs)

### Performance
- In-memory storage (fast)
- Indexed queries (O(1) lookups)
- Batch processing for Figma API calls

---

## Migration Path (Old → New)

**Current Status**: Hybrid architecture
- ✅ New layered architecture implemented
- ✅ Use cases available
- ✅ Infrastructure adapters created
- ⏳ Old controllers still work (backward compat)
- ⏳ Gradual migration to use cases

**Next Steps**:
1. Migrate controllers to use use cases
2. Remove duplicate code
3. Full transition to layered architecture

---

## Resources

- [ADR 001: Layered Architecture](./docs/adr/001-layered-architecture.md)
- [Layer Responsibilities](./docs/LAYER_RESPONSIBILITIES.md)
- [Agile Implementation Plan](./AGILE_IMPLEMENTATION_PLAN.md)
- [Architecture Proposal](./ARCHITECTURE_PROPOSAL.md)

---

**Last Updated**: 2025-11-30 (v3.0 Layered Architecture)

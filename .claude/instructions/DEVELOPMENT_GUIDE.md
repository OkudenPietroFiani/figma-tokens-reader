# Development Guide

**For:** Contributors and developers extending the Figma Tokens Reader plugin
**Last Updated:** 2025-11-30
**Architecture Version:** 3.0 (Layered Architecture)

---

## Quick Start

### Prerequisites
```bash
- Node.js 16+
- npm 7+
- Figma Desktop App (for testing)
```

### Setup
```bash
git clone https://github.com/OkudenPietroFiani/figma-tokens-reader
cd figma-tokens-reader
npm install
npm run build
```

### Development Workflow
```bash
# Build plugin
npm run build          # Build both backend and frontend

# Run tests
npm test              # Run all tests
npm run test:coverage # Run with coverage report

# Development cycle
npm run watch         # Auto-rebuild on changes
```

### Loading in Figma
1. Open Figma Desktop
2. Plugins → Development → Import plugin from manifest
3. Select `manifest.json` from project root
4. Plugin appears in Plugins → Development → Figma Tokens Reader

---

## Architecture Overview

The plugin follows **Layered Architecture** (Hexagonal/Ports & Adapters):

```
Presentation → Application → Domain ← Infrastructure
    (UI)      (Use Cases)    (Pure)   (Adapters)
```

**Key Principles:**
- Dependencies flow inward toward Domain
- Domain has zero external dependencies
- Infrastructure implements Domain ports
- Presentation calls Application use cases

See [ARCHITECTURE_GUIDE.md](./ARCHITECTURE_GUIDE.md) for complete details.

---

## How to Add Features

### Add a New Token Parser

**Goal:** Support a new token format (e.g., Tailwind, Theo)

**Steps:**

1. **Create Parser Adapter** in `src/infrastructure/input/`

```typescript
// src/infrastructure/input/TailwindTokenParser.ts
import { ITokenParser } from '../../core/ports/ITokenParser';
import { Token } from '../../core/models/Token';
import { Result, Success, Failure, TokenData } from '../../shared/types';

export class TailwindTokenParser implements ITokenParser {
  readonly name = 'Tailwind Tokens';

  /**
   * Detect if data is Tailwind format
   * Return confidence 0-1
   */
  detectFormat(data: TokenData): number {
    // Check for Tailwind-specific structure
    if (data.theme && data.theme.colors) {
      return 0.9;
    }
    return 0;
  }

  /**
   * Parse Tailwind tokens to Token[]
   */
  async parse(data: TokenData, context?: ParseContext): Promise<Result<Token[]>> {
    try {
      const tokens: Token[] = [];

      // Transform Tailwind format to Token model
      // e.g., theme.colors.blue.500 → Token

      return Success(tokens);
    } catch (error) {
      return Failure(`Failed to parse Tailwind tokens: ${error.message}`);
    }
  }
}
```

2. **Register Parser** in `src/backend/main.ts`

```typescript
// In initializeLayeredArchitecture()
this.parserRegistry.register(new TailwindTokenParser());
```

3. **Test** your parser

```typescript
// src/__tests__/infrastructure/input/TailwindTokenParser.test.ts
describe('TailwindTokenParser', () => {
  it('should detect Tailwind format', () => {
    const parser = new TailwindTokenParser();
    const confidence = parser.detectFormat(tailwindData);
    expect(confidence).toBeGreaterThan(0.5);
  });

  it('should parse Tailwind tokens', async () => {
    // Test parsing
  });
});
```

**That's it!** The parser is now available. Auto-detection will use it when importing.

---

### Add a New Exporter

**Goal:** Export tokens to a new format (CSS, SCSS, JSON)

**Steps:**

1. **Create Exporter Adapter** in `src/infrastructure/output/`

```typescript
// src/infrastructure/output/CSSExporter.ts
import { ITokenExporter, ExportOptions, ExportResult } from '../../core/ports/ITokenExporter';
import { Token } from '../../core/models/Token';
import { Result, Success } from '../../shared/types';

export class CSSExporter implements ITokenExporter {
  readonly name = 'CSS Variables';
  readonly targetFormat = 'css';

  async export(tokens: Token[], options?: ExportOptions): Promise<Result<ExportResult>> {
    // Generate CSS variables
    const css = this.generateCSS(tokens);

    return Success({
      exported: tokens.length,
      created: tokens.length,
      updated: 0,
      failed: 0,
      metadata: { output: css }
    });
  }

  private generateCSS(tokens: Token[]): string {
    let css = ':root {\n';
    tokens.forEach(token => {
      css += `  --${token.qualifiedName}: ${token.value};\n`;
    });
    css += '}\n';
    return css;
  }
}
```

2. **Register Exporter** in `src/backend/main.ts`

```typescript
// In initializeLayeredArchitecture()
const cssExporter = new CSSExporter();
this.exporterRegistry.register(cssExporter);
```

3. **Create Use Case** (if needed for UI)

```typescript
// src/application/use-cases/ExportToCSSUseCase.ts
export class ExportToCSSUseCase extends UseCase<ExportInput, ExportOutput> {
  constructor(
    private repository: ITokenRepository,
    private cssExporter: ITokenExporter
  ) {
    super();
  }

  protected async executeImpl(input: ExportInput): Promise<Result<ExportOutput>> {
    const tokens = this.repository.query(input.criteria);
    return await this.cssExporter.export(tokens);
  }
}
```

**Done!** Tokens can now be exported to CSS.

---

### Add a New Use Case

**Goal:** Add a new user action/operation

**Steps:**

1. **Create Use Case** in `src/application/use-cases/`

```typescript
// src/application/use-cases/DeleteTokenUseCase.ts
import { UseCase } from '../interfaces/IUseCase';
import { ITokenRepository } from '../../core/ports/ITokenRepository';
import { Result } from '../../shared/types';

interface DeleteInput {
  tokenId: string;
}

interface DeleteOutput {
  deleted: boolean;
}

export class DeleteTokenUseCase extends UseCase<DeleteInput, DeleteOutput> {
  constructor(private repository: ITokenRepository) {
    super();
  }

  protected async executeImpl(input: DeleteInput): Promise<Result<DeleteOutput>> {
    const result = this.repository.delete(input.tokenId);

    if (result.success) {
      return Success({ deleted: result.data });
    }

    return Failure(result.error);
  }
}
```

2. **Register Use Case** in `src/backend/main.ts`

```typescript
// In initializeLayeredArchitecture()
const deleteTokenUseCase = new DeleteTokenUseCase(this.repositoryAdapter);
this.useCaseRegistry.register('delete-token', deleteTokenUseCase);
```

3. **Call from Controller/UI**

```typescript
// In controller
const result = await this.useCaseRegistry.execute('delete-token', { tokenId: 'token-123' });

if (result.success) {
  console.log('Token deleted');
}
```

**Complete!** The use case is now available throughout the app.

---

## Testing Strategy

### Test by Layer

**Domain Layer:** Pure unit tests (no mocks)
```typescript
describe('TokenValidator', () => {
  it('should validate token structure', () => {
    const validator = new TokenValidator();
    const result = validator.validate(invalidToken);
    expect(result.valid).toBe(false);
  });
});
```

**Application Layer:** Unit tests with mocked dependencies
```typescript
describe('ImportTokensUseCase', () => {
  it('should orchestrate import', async () => {
    const mockParser = { parse: jest.fn() };
    const mockRepo = { saveMany: jest.fn() };

    const useCase = new ImportTokensUseCase(mockParser, mockRepo);
    await useCase.execute(input);

    expect(mockParser.parse).toHaveBeenCalled();
    expect(mockRepo.saveMany).toHaveBeenCalled();
  });
});
```

**Infrastructure Layer:** Integration tests
```typescript
describe('FigmaVariablesExporter', () => {
  it('should export to Figma', async () => {
    // Mock Figma API
    const mockFigma = { variables: { createVariable: jest.fn() } };

    const exporter = new FigmaVariablesExporter(repo, resolver);
    await exporter.export(tokens);

    expect(mockFigma.variables.createVariable).toHaveBeenCalled();
  });
});
```

### Run Tests
```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage

# Specific test file
npm test -- TokenParser.test.ts

# Integration tests only
npm test -- --testPathPattern="integration"
```

---

## Code Style & Conventions

### File Naming
- Use PascalCase for classes: `TokenParser.ts`
- Use camelCase for utilities: `tokenUtils.ts`
- Use SCREAMING_SNAKE_CASE for constants: `DEFAULT_CONFIG.ts`

### Code Organization
```
src/
├── application/       # Use cases, orchestration
├── core/             # Domain logic (pure, no deps)
├── infrastructure/   # Adapters to external systems
├── backend/          # Presentation layer (backend)
├── frontend/         # Presentation layer (UI)
├── shared/           # Shared types, constants
└── utils/            # Pure utilities
```

### TypeScript
- Use strict mode
- Prefer interfaces over types for public APIs
- Use Result pattern for error handling (no exceptions)
- Document complex logic with JSDoc

### Imports
```typescript
// Absolute imports from src/
import { Token } from '../../core/models/Token';

// Group imports logically
import { /* framework */ } from 'framework';
import { /* local */ } from './local';
```

---

## Common Tasks

### Add a New Token Type

1. Add type to `src/shared/types.ts`:
```typescript
export type TokenType =
  | 'color'
  | 'dimension'
  | 'your-new-type'; // Add here
```

2. Update parser to recognize it
3. Update Figma exporter if needed
4. Add visualizer if for documentation

### Debug in Figma

1. Open Figma Console: Plugins → Development → Open Console
2. Add console.log() statements
3. Rebuild: `npm run build`
4. Reload plugin in Figma
5. Check console output

### Profile Performance

```typescript
// Add timing
const start = Date.now();
// ... operation
console.log(`Operation took ${Date.now() - start}ms`);
```

### Update Bundle

After significant changes:
```bash
npm run build
ls -lh code.js  # Check size (must be < 300 KB)
```

---

## Git Workflow

### Branch Naming
- `feature/add-css-export`
- `fix/token-parsing-bug`
- `refactor/consolidate-registries`

### Commit Messages
```
feat: add CSS export functionality
fix: resolve token reference resolution bug
docs: update development guide
refactor: consolidate token registries
test: add integration tests for parsers
```

### Pull Requests
1. Create feature branch
2. Make changes
3. Add tests
4. Update documentation
5. Ensure `npm test` passes
6. Ensure `npm run build` succeeds
7. Create PR with description

---

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Tests Fail
```bash
# Clear Jest cache
npm test -- --clearCache
npm test
```

### Plugin Won't Load in Figma
1. Check manifest.json is valid JSON
2. Check code.js and ui.html exist
3. Check console for errors
4. Try reimporting plugin

### Bundle Too Large
```bash
# Check bundle size
ls -lh code.js

# Analyze what's included
npm run build -- --metafile=meta.json
# Use esbuild-visualizer to see what's in bundle
```

---

## Resources

- [Architecture Guide](./.claude/instructions/ARCHITECTURE_GUIDE.md)
- [Technical Specification](./.claude/instructions/TECHNICAL_SPECIFICATION.md)
- [Figma API Reference](./.claude/instructions/FIGMA_API.md)
- [Test Coverage Report](../docs/testing/TEST_COVERAGE.md)
- [ADR: Layered Architecture](../docs/adr/001-layered-architecture.md)

---

## Getting Help

1. Check existing docs in `.claude/instructions/`
2. Search issues on GitHub
3. Review test files for examples
4. Check code comments for implementation details

---

**Happy Coding!** 🚀

_Last updated: 2025-11-30_
_Architecture version: 3.0 (Layered)_

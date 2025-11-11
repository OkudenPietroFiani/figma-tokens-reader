# Development Guide

Complete guide for contributing code to the Figma Tokens Reader project.

---

## Prerequisites

Before contributing, you MUST read:
1. [`PRINCIPLES.md`](./PRINCIPLES.md) - Mandatory patterns
2. [`TESTING.md`](./TESTING.md) - Testing requirements
3. [`ARCHITECTURE.md`](./ARCHITECTURE.md) - System structure

---

## Code Style Standards

### Naming Conventions

**Files**:
```
kebab-case.ts          ✅ GOOD
PascalCase.ts          ❌ BAD (except for classes)
```

**Classes**:
```typescript
class GitHubService {}       ✅ GOOD (PascalCase)
class githubService {}       ❌ BAD
```

**Interfaces**:
```typescript
interface IFileSource {}     ✅ GOOD (I prefix + PascalCase)
interface FileSource {}      ❌ BAD (no I prefix)
```

**Variables & Functions**:
```typescript
const userName = 'John';     ✅ GOOD (camelCase)
function fetchUserData() {}  ✅ GOOD

const user_name = 'John';    ❌ BAD
```

**Constants**:
```typescript
const MAX_RETRY_COUNT = 3;   ✅ GOOD (UPPER_SNAKE_CASE)
const maxRetryCount = 3;     ❌ BAD
```

---

### Logging Guidelines

**Minimize console.log. Only log errors and critical information.**

✅ **Good**:
```typescript
try {
  await processFiles();
} catch (error) {
  console.error('[ServiceName] Operation failed:', error.message);
}
```

❌ **Bad**:
```typescript
console.log('Starting process...');      // Remove
console.log('File fetched successfully'); // Remove
```

**Action**:
- ✅ Use `console.error()` for failures only
- ✅ Use `[ServiceName]` prefix for context
- ❌ Remove `console.log()` for normal operations

---

### Comment Guidelines

**Code should be self-documenting. Comments explain WHY, not WHAT.**

✅ **Good**:
```typescript
// Parallel processing is 6x faster for large file sets
if (FEATURE_FLAGS.ENABLE_PARALLEL_FETCHING) {
  return this.fetchMultipleFilesParallel(config, filePaths);
}
```

❌ **Bad**:
```typescript
// Increment counter
counter++;

// TODO: Fix this (no context)
```

**Action**:
- ✅ Use JSDoc for public APIs
- ✅ Explain WHY, not WHAT
- ❌ Remove commented-out code
- ❌ Remove obvious comments

---

### File Organization

```typescript
// 1. Imports (grouped)
import { externalLibrary } from 'library';
import { InternalType } from '../shared/types';

// 2. Interfaces/Types
interface MyConfig { /* ... */ }

// 3. Class/Function
export class MyClass {
  // Private properties
  private prop: string;

  // Constructor
  constructor() {}

  // Public methods
  public publicMethod() {}

  // Private methods
  private privateMethod() {}
}
```

**File Length**:
- ✅ < 300 lines: Good
- ⚠️ 300-500 lines: Consider splitting
- ❌ > 500 lines: MUST split

---

### TypeScript Best Practices

✅ **Good**:
```typescript
function processToken(token: DesignToken): ProcessedToken {
  return { ...token, processed: true };
}
```

❌ **Bad**:
```typescript
function processToken(token: any): any {  // Avoid 'any'
  return token;
}
```

### Null Safety
```typescript
const fileName = filePath.split('/').pop() || filePath;  // Good
```

### Async/Await
```typescript
async function fetchData(): Promise<Result> {
  try {
    const data = await fetch(url);
    return Success(data);
  } catch (error) {
    return Failure(error.message);
  }
}
```

---

## Adding New Features

### Adding a New File Source (2 hours)

**Example: GitLab Support**

#### Step 1: Create Adapter
```bash
touch src/core/adapters/GitLabFileSource.ts
```

```typescript
import { IFileSource, FileMetadata } from '../interfaces/IFileSource';
import { Result, Success, Failure } from '../../shared/types';

export class GitLabFileSource implements IFileSource {
  async fetchFileList(config: FileSourceConfig): Promise<Result<FileMetadata[]>> {
    try {
      // GitLab API call
      const response = await fetch(url, { headers });
      const files = await response.json();

      const metadata: FileMetadata[] = files
        .filter(f => f.type === 'blob' && f.path.endsWith('.json'))
        .map(f => ({ path: f.path, type: 'file', sha: f.id }));

      return Success(metadata);
    } catch (error) {
      return Failure(error.message);
    }
  }

  async fetchFileContent(config, path) { /* ... */ }
  async fetchMultipleFiles(config, paths) { /* Use BatchProcessor */ }
  async validateConfig(config) { /* ... */ }
  getSourceType() { return 'gitlab'; }
}
```

#### Step 2: Register
```typescript
// src/backend/main.ts
FileSourceRegistry.register(new GitLabFileSource());
```

#### Step 3: Add Tests
```typescript
// src/core/adapters/__tests__/GitLabFileSource.test.ts
describe('GitLabFileSource', () => {
  test('should fetch file list', async () => {
    const source = new GitLabFileSource();
    const result = await source.fetchFileList(config);
    expect(result.success).toBe(true);
  });
});
```

---

### Adding a New Token Format (1 hour)

**Example: Theo Format**

```typescript
export class TheoFormatStrategy implements ITokenFormatStrategy {
  detectFormat(data: TokenData): number {
    if (data.props || data.aliases) return 0.9;
    return 0;
  }

  parseTokens(data: TokenData): Result<ProcessedToken[]> {
    try {
      const tokens = this.recursivelyParse(data);
      return Success(tokens);
    } catch (error) {
      return Failure(error.message);
    }
  }

  getFormatName() { return 'Theo'; }
  getFormatVersion() { return '8.x'; }
}
```

**Register**:
```typescript
TokenFormatRegistry.register(new TheoFormatStrategy());
```

---

### Adding a New Visualizer (30 minutes)

```typescript
export class ShadowVisualizer implements ITokenVisualizer {
  canVisualize(token: TokenMetadata): boolean {
    return token.type === 'shadow' || token.type === 'boxShadow';
  }

  renderVisualization(token: TokenMetadata, width: number, height: number): FrameNode {
    const container = figma.createFrame();
    container.layoutMode = 'HORIZONTAL';
    container.primaryAxisSizingMode = 'FIXED';
    container.counterAxisSizingMode = 'AUTO';

    // Create element with shadow
    const element = figma.createRectangle();
    element.resize(64, 64);
    element.effects = [this.parseShadow(token.value)];

    container.appendChild(element);
    container.resize(width, container.height);

    return container;
  }

  getType() { return 'shadow'; }
}
```

---

## Testing Requirements

All new features MUST have tests. Minimum coverage: 85%.

```typescript
describe('NewFeature', () => {
  test('should handle normal case', () => {
    // Arrange
    const input = createTestInput();

    // Act
    const result = feature(input);

    // Assert
    expect(result).toBe(expected);
  });

  test('should handle edge case', () => { /* ... */ });
  test('should handle error case', () => { /* ... */ });
});
```

See [`TESTING.md`](./TESTING.md) for details.

---

## Build & Development

### Commands
```bash
npm run build           # Build everything
npm run build:backend   # Build backend only
npm run build:frontend  # Build frontend only
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Development Workflow
1. Write code in TypeScript
2. Add tests
3. Run tests: `npm test`
4. Build: `npm run build`
5. Test in Figma
6. Commit with descriptive message

---

## Code Review Checklist

Before committing, verify:

- [ ] No code duplication (DRY)
- [ ] No duplicate CSS (DRY)
- [ ] Proper naming conventions
- [ ] No excessive logging
- [ ] Types are explicit (no 'any')
- [ ] Errors are handled
- [ ] Tests are included (85%+ coverage)
- [ ] Comments explain WHY, not WHAT
- [ ] File length < 300 lines
- [ ] Imports are organized
- [ ] SOLID principles followed

---

## Git Commit Guidelines

### Commit Message Format
```
<type>: <subject>

<body>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Build/tooling

**Example**:
```
feat: Add GitLab file source support

- Implement IFileSource interface
- Add parallel file fetching
- Include comprehensive tests
- Update documentation
```

---

## Import Organization

**Order**:
```typescript
// 1. External libraries
import { someLib } from 'external-lib';

// 2. Shared types
import { Type1 } from '../shared/types';

// 3. Core architecture
import { IFileSource } from '../core/interfaces/IFileSource';

// 4. Services
import { GitHubService } from '../services/githubService';

// 5. Utilities
import { Base64Decoder } from '../utils/Base64Decoder';

// 6. Constants
import { FEATURE_FLAGS } from '../shared/constants';
```

---

## Error Handling

Always use Result pattern:

```typescript
async function operation(): Promise<Result<Data>> {
  try {
    const result = await fetchData();
    return Success(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ServiceName] Failed: ${message}`);
    return Failure(message);
  }
}
```

---

## Performance Considerations

- Use `BatchProcessor` for parallel operations
- Configure batch size and delays for rate limiting
- Provide progress feedback for long operations
- Isolate errors (one failure shouldn't break all)

```typescript
await BatchProcessor.processBatch(
  items,
  async (item) => await process(item),
  { batchSize: 10, delayMs: 100 }
);
```

---

## Documentation

When adding new features:
1. Update relevant .md files
2. Add JSDoc comments to public APIs
3. Include usage examples
4. Update API_REFERENCE.md

---

**Last Updated**: 2025-11-11
**Version**: 3.0
**Status**: Production Ready ✅

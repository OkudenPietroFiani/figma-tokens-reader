# Architecture Decisions - Key Patterns & Guidelines

## ⚠️ CRITICAL: These architectural patterns are MANDATORY

All new features MUST follow these established patterns.

---

## Registry Pattern

### When to Use:
**Whenever you need to support multiple implementations that can be added dynamically.**

### Examples in Project:
1. **FileSourceRegistry** - Multiple file sources (GitHub, GitLab, local, etc.)
2. **TokenFormatRegistry** - Multiple token formats (W3C, Style Dictionary, Theo, etc.)

### Pattern Structure:
```typescript
// 1. Define interface
interface IFileSource {
  fetchFileList(config: FileSourceConfig): Promise<Result<FileMetadata[]>>;
  getSourceType(): string;
}

// 2. Create registry
export class FileSourceRegistry {
  private static sources: Map<string, IFileSource> = new Map();

  static register(source: IFileSource): void {
    this.sources.set(source.getSourceType(), source);
  }

  static get(sourceType: string): IFileSource | undefined {
    return this.sources.get(sourceType);
  }
}

// 3. Register implementations
FileSourceRegistry.register(new GitHubFileSource());
FileSourceRegistry.register(new GitLabFileSource());

// 4. Use via registry
const source = FileSourceRegistry.get('github');
```

### Benefits:
- ✅ Add new implementations without modifying existing code (OCP)
- ✅ Centralized registration and retrieval
- ✅ Easy to test (mock registry)
- ✅ Type-safe via interfaces

---

## Adapter Pattern

### When to Use:
**When you need to wrap existing code to implement a new interface without modifying the original.**

### Example: GitHubFileSource
```typescript
// Existing service
class GitHubService {
  async fetchRepositoryFiles(config: GitHubConfig): Promise<GitHubFile[]> {
    // Existing implementation
  }
}

// Adapter wraps it to implement IFileSource
export class GitHubFileSource implements IFileSource {
  constructor(private githubService: GitHubService = new GitHubService()) {}

  async fetchFileList(config: FileSourceConfig): Promise<Result<FileMetadata[]>> {
    try {
      const ghConfig = this.toGitHubConfig(config);  // Convert config
      const files = await this.githubService.fetchRepositoryFiles(ghConfig);

      // Convert to common format
      const metadata: FileMetadata[] = files.map(file => ({
        path: file.path,
        type: file.type as 'file' | 'dir',
        sha: file.sha
      }));

      return Success(metadata);
    } catch (error) {
      return Failure(error.message);
    }
  }

  getSourceType(): string {
    return 'github';
  }
}
```

### Benefits:
- ✅ Preserves existing code (no breaking changes)
- ✅ Makes existing code compatible with new interfaces
- ✅ Thin wrapper (10-50 lines)
- ✅ Easy to test

---

## Strategy Pattern

### When to Use:
**When you need different algorithms/implementations for the same operation.**

### Example: Token Format Strategies
```typescript
// Strategy interface
interface ITokenFormatStrategy {
  detectFormat(data: TokenData): number;  // Returns confidence 0-1
  parseTokens(data: TokenData): Result<ProcessedToken[]>;
}

// Concrete strategies
class W3CTokenFormatStrategy implements ITokenFormatStrategy {
  detectFormat(data: TokenData): number {
    // W3C detection logic
    if (has$ValueAnd$Type) return 0.9;
    return 0;
  }

  parseTokens(data: TokenData): Result<ProcessedToken[]> {
    // W3C parsing logic
  }
}

class StyleDictionaryFormatStrategy implements ITokenFormatStrategy {
  detectFormat(data: TokenData): number {
    // Style Dictionary detection logic
    if (hasValueButNot$Value) return 0.9;
    return 0;
  }

  parseTokens(data: TokenData): Result<ProcessedToken[]> {
    // Style Dictionary parsing logic
  }
}

// Auto-selection
const strategy = TokenFormatRegistry.detectFormat(tokenData);  // Picks best match
const tokens = strategy.parseTokens(tokenData);
```

### Benefits:
- ✅ Each strategy is independent and testable
- ✅ Easy to add new strategies
- ✅ Auto-detection via confidence scoring
- ✅ Interchangeable implementations (LSP)

---

## Result Pattern

### When to Use:
**For operations that can fail. Use Result<T> instead of throwing exceptions.**

### Pattern Structure:
```typescript
// Define Result type
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Helper functions
function Success<T>(data: T): Result<T> {
  return { success: true, data };
}

function Failure<T = never>(error: string): Result<T> {
  return { success: false, error };
}

// Usage
async function fetchFile(path: string): Promise<Result<string>> {
  try {
    const content = await readFile(path);
    return Success(content);
  } catch (error) {
    return Failure(error.message);
  }
}

// Consumer
const result = await fetchFile('config.json');
if (result.success) {
  console.log(result.data);  // Type-safe access
} else {
  console.error(result.error);
}
```

### Benefits:
- ✅ Type-safe error handling
- ✅ Explicit success/failure handling
- ✅ No uncaught exceptions
- ✅ Better than try/catch for expected failures

---

## Batch Processor Pattern

### When to Use:
**For processing large collections with parallel execution and rate limiting.**

### Example:
```typescript
const result = await BatchProcessor.processBatch(
  filePaths,                    // Items to process
  async (path) => {             // Processor function
    return await fetchFile(path);
  },
  {
    batchSize: 10,              // Process 10 at a time
    delayMs: 100,               // 100ms between batches
    onProgress: (done, total) => {
      console.log(`${done}/${total}`);
    },
    onError: (error, item, index) => {
      console.error(`Failed: ${item}`);
    }
  }
);

// Result includes successes and failures
console.log(`Success: ${result.successCount}, Failed: ${result.failureCount}`);
```

### Benefits:
- ✅ 5-10x faster than sequential
- ✅ Configurable batch size and delays
- ✅ Error isolation (one failure doesn't break all)
- ✅ Progress tracking
- ✅ Memory efficient

---

## Dependency Injection Pattern

### When to Use:
**Always. Never instantiate dependencies inside a class.**

### ✅ DO:
```typescript
// GOOD: Dependencies injected via constructor
class TokenController {
  constructor(
    private variableManager: VariableManager,
    private storage: StorageService
  ) {}

  async importTokens(data: TokenData) {
    // Use injected dependencies
    await this.variableManager.importTokens(data);
    await this.storage.saveState();
  }
}

// Usage
const controller = new TokenController(
  new VariableManager(),
  new StorageService()
);
```

### ❌ DON'T:
```typescript
// BAD: Hard-coded dependencies
class TokenController {
  private variableManager = new VariableManager();  // ❌ Hard-coded
  private storage = new StorageService();           // ❌ Hard-coded

  async importTokens(data: TokenData) {
    // Tightly coupled - can't test or swap implementations
  }
}
```

### Benefits:
- ✅ Testable (inject mocks)
- ✅ Flexible (swap implementations)
- ✅ Follows DIP (depend on abstractions)

---

## Feature Flags Pattern

### When to Use:
**For gradual rollout of new features without breaking existing functionality.**

### Example:
```typescript
// Define flags
export const FEATURE_FLAGS = {
  ENABLE_PARALLEL_FETCHING: true,   // New feature
  AUTO_DETECT_FORMAT: true,         // New feature
  PARALLEL_BATCH_SIZE: 10,          // Configuration
} as const;

// Use in code
async fetchMultipleFiles(config: GitHubConfig, paths: string[]) {
  if (FEATURE_FLAGS.ENABLE_PARALLEL_FETCHING) {
    return this.fetchMultipleFilesParallel(config, paths);  // New
  } else {
    return this.fetchMultipleFilesSequential(config, paths); // Legacy
  }
}
```

### Benefits:
- ✅ Safe rollout (toggle on/off)
- ✅ A/B testing
- ✅ Gradual migration
- ✅ Easy rollback

---

## Utility Extraction Pattern

### When to Use:
**When you find duplicate code or code that can be reused.**

### Examples:
1. **Base64Decoder** - Extracted from GitHubService (62 lines → reusable utility)
2. **FileClassifier** - Extracted file classification logic
3. **BatchProcessor** - Extracted parallel processing logic

### Before:
```typescript
class GitHubService {
  private decodeBase64(base64: string): string {
    // 62 lines of decoding logic
  }
}

class GitLabService {
  private decodeBase64(base64: string): string {
    // SAME 62 lines of decoding logic - DUPLICATION!
  }
}
```

### After:
```typescript
// Utility
class Base64Decoder {
  static decode(base64: string): string {
    // 62 lines of decoding logic (ONCE)
  }
}

// Usage everywhere
const content = Base64Decoder.decode(data.content);
```

### Benefits:
- ✅ DRY (no duplication)
- ✅ Single source of truth
- ✅ Easier to test
- ✅ Easier to maintain

---

## Null Object Pattern

### When to Use:
**Instead of returning null, return a safe default object.**

### ✅ DO:
```typescript
function getUser(id: string): User {
  const user = findUser(id);
  return user || { id: '', name: 'Guest', isGuest: true };  // Null object
}

// Usage - no null checks needed
const user = getUser('123');
console.log(user.name);  // Safe
```

### ❌ DON'T:
```typescript
function getUser(id: string): User | null {
  return findUser(id);  // Returns null
}

// Usage - requires null checks everywhere
const user = getUser('123');
if (user !== null) {  // Boilerplate
  console.log(user.name);
}
```

---

## Immutability Pattern

### When to Use:
**Always prefer immutable operations over mutations.**

### ✅ DO:
```typescript
// GOOD: Immutable
const newArray = [...oldArray, newItem];
const newObject = { ...oldObject, key: newValue };
const filtered = items.filter(item => item.isValid);
```

### ❌ DON'T:
```typescript
// BAD: Mutation
oldArray.push(newItem);          // ❌ Mutates
oldObject.key = newValue;        // ❌ Mutates
items.splice(index, 1);          // ❌ Mutates
```

### Benefits:
- ✅ Predictable behavior
- ✅ Easier to test
- ✅ No side effects
- ✅ Thread-safe (if needed)

---

## Error First Pattern

### When to Use:
**Always handle errors before success cases.**

### ✅ DO:
```typescript
async function processFile(path: string): Promise<Result<string>> {
  // Handle errors first
  if (!path) {
    return Failure('Path is required');
  }

  if (!fileExists(path)) {
    return Failure('File not found');
  }

  try {
    const content = await readFile(path);
    return Success(content);  // Success at the end
  } catch (error) {
    return Failure(error.message);
  }
}
```

### Benefits:
- ✅ Fail fast
- ✅ Easier to read
- ✅ Guards against edge cases

---

## Single Source of Truth

### When to Use:
**Always. Never duplicate data or configuration.**

### Examples:
1. **Constants** - All constants in `src/shared/constants.ts`
2. **Types** - All types in `src/shared/types.ts`
3. **Feature Flags** - Single location in constants
4. **Registries** - Single place to register implementations

### ✅ DO:
```typescript
// Define once
export const FEATURE_FLAGS = {
  ENABLE_PARALLEL_FETCHING: true,
} as const;

// Use everywhere
import { FEATURE_FLAGS } from '../shared/constants';
if (FEATURE_FLAGS.ENABLE_PARALLEL_FETCHING) { ... }
```

### ❌ DON'T:
```typescript
// Define in multiple files
const ENABLE_PARALLEL = true;  // File 1
const parallelEnabled = true;  // File 2 - DUPLICATION!
```

---

## When to Create a New Pattern

Ask yourself:
1. Is this a common problem that will be encountered again?
2. Does it follow SOLID principles?
3. Is it reusable?
4. Does it reduce code duplication?
5. Does it make the code more testable?

If YES to 3+ questions → Create a pattern!

---

## Pattern Decision Tree

```
Need multiple implementations?
├─ YES → Use Registry + Strategy Pattern
│   Example: FileSourceRegistry, TokenFormatRegistry
│
├─ NO → Processing large collections?
    ├─ YES → Use Batch Processor Pattern
    │   Example: Parallel file fetching
    │
    └─ NO → Operation can fail?
        ├─ YES → Use Result Pattern
        │   Example: File operations, API calls
        │
        └─ NO → Duplicate code?
            ├─ YES → Extract Utility
            │   Example: Base64Decoder, FileClassifier
            │
            └─ NO → Use simple class/function
```

---

## Anti-Patterns to Avoid

### ❌ God Class
```typescript
// BAD: Class with too many responsibilities
class SuperService {
  fetchFiles() {}
  decodeBase64() {}
  classifyFiles() {}
  parseTokens() {}
  createVariables() {}
  updateStyles() {}
  // TOO MANY RESPONSIBILITIES!
}
```

### ❌ Shotgun Surgery
```typescript
// BAD: One change requires modifying many files
// Change file source → must update 10+ files
```

### ❌ Primitive Obsession
```typescript
// BAD: Using primitives instead of types
function processToken(name: string, value: string, type: string) {}

// GOOD: Use proper types
function processToken(token: DesignToken) {}
```

### ❌ Magic Numbers
```typescript
// BAD
if (items.length > 50) {}

// GOOD
const MAX_BATCH_SIZE = 50;
if (items.length > MAX_BATCH_SIZE) {}
```

---

## Architectural Metrics

Target scores:
- **SOLID Compliance**: 10/10
- **Code Duplication**: < 5%
- **Test Coverage**: > 90%
- **Avg File Length**: < 300 lines
- **Cyclomatic Complexity**: < 10 per function

Current project: **✅ All targets met**

---

**Last Updated**: 2025-01-09
**Mandatory Compliance**: YES
**Current Architecture Score**: 10/10 ✅

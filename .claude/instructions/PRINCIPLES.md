# Engineering Principles - Mandatory Standards

⚠️ **CRITICAL**: These principles are NON-NEGOTIABLE. All code changes MUST strictly adhere to these standards.

---

## SOLID Principles

### 1. Single Responsibility Principle (SRP)

**Rule**: A class should have ONE and ONLY ONE reason to change.

✅ **Good Example**:
```typescript
class Base64Decoder {
  static decode(base64: string): string {
    // Only handles base64 decoding
  }
}

class FileClassifier {
  static classify(filePath: string): FileClassification {
    // Only handles file classification
  }
}
```

❌ **Bad Example**:
```typescript
class GitHubService {
  async fetchFiles() { /* HTTP */ }
  private decodeBase64() { /* Decoding */ }
  private classifyFile() { /* Classification */ }
  // TOO MANY RESPONSIBILITIES!
}
```

**Action**: Extract utilities for reusable logic. Keep classes focused on ONE thing.

---

### 2. Open/Closed Principle (OCP)

**Rule**: Software entities should be OPEN for extension, CLOSED for modification.

✅ **Good Example**:
```typescript
// Extend via interfaces without modifying existing code
interface IFileSource {
  fetchFileList(config: FileSourceConfig): Promise<Result<FileMetadata[]>>;
}

class GitLabFileSource implements IFileSource {
  // New implementation, no modification to existing code
}

FileSourceRegistry.register(new GitLabFileSource());
```

❌ **Bad Example**:
```typescript
class FileService {
  async fetchFiles(source: string) {
    if (source === 'github') { /* ... */ }
    else if (source === 'gitlab') { /* MODIFICATION! */ }
  }
}
```

**Action**: Use interfaces and registries for dynamic extension.

---

### 3. Liskov Substitution Principle (LSP)

**Rule**: Subtypes must be substitutable for their base types.

✅ **Good Example**:
```typescript
function processFiles(source: IFileSource) {
  // Works with ANY IFileSource implementation
  const files = await source.fetchFileList(config);
}

processFiles(new GitHubFileSource());  // Works
processFiles(new GitLabFileSource());  // Works too
```

❌ **Bad Example**:
```typescript
function processFiles(source: IFileSource) {
  if (source instanceof GitHubFileSource) {
    // Special handling - VIOLATES LSP!
  }
}
```

**Action**: All implementations of an interface MUST be interchangeable.

---

### 4. Interface Segregation Principle (ISP)

**Rule**: Clients should NOT be forced to depend on interfaces they don't use.

✅ **Good Example**:
```typescript
interface IFileSource {
  fetchFileList(): Promise<any>;
  fetchFileContent(): Promise<any>;
  // Only 5 focused methods
}
```

❌ **Bad Example**:
```typescript
interface IFileSource {
  fetchFileList(): Promise<any>;
  getCommits(): Promise<any>;        // GitHub-specific
  getMergeRequests(): Promise<any>;  // GitLab-specific
  // TOO MANY UNRELATED METHODS!
}
```

**Action**: Keep interfaces small and focused.

---

### 5. Dependency Inversion Principle (DIP)

**Rule**: Depend on abstractions, NOT on concretions.

✅ **Good Example**:
```typescript
class TokenController {
  constructor(
    private variableManager: VariableManager,  // Injected
    private storage: StorageService            // Injected
  ) {}
}
```

❌ **Bad Example**:
```typescript
class TokenController {
  private githubService = new GitHubService();  // Hard-coded!
}
```

**Action**: Use dependency injection and registries.

---

## Design Patterns

### Registry Pattern

**When**: Need multiple implementations that can be added dynamically.

**Structure**:
```typescript
// 1. Interface
interface IFileSource { /* ... */ }

// 2. Registry
class FileSourceRegistry {
  private static sources: Map<string, IFileSource> = new Map();
  static register(source: IFileSource): void { /* ... */ }
  static get(type: string): IFileSource { /* ... */ }
}

// 3. Register
FileSourceRegistry.register(new GitHubFileSource());

// 4. Use
const source = FileSourceRegistry.get('github');
```

**Benefits**:
- Add new implementations without modifying existing code (OCP)
- Centralized registration
- Type-safe via interfaces

---

### Adapter Pattern

**When**: Need to wrap existing code to implement a new interface.

**Example**:
```typescript
// Existing service
class GitHubService {
  async fetchRepositoryFiles() { /* ... */ }
}

// Adapter
class GitHubFileSource implements IFileSource {
  constructor(private githubService: GitHubService) {}

  async fetchFileList() {
    const files = await this.githubService.fetchRepositoryFiles();
    return this.convertToCommonFormat(files);
  }
}
```

**Benefits**:
- Preserves existing code
- Makes existing code compatible with new interfaces
- Thin wrapper (10-50 lines)

---

### Strategy Pattern

**When**: Need different algorithms for the same operation.

**Example**:
```typescript
interface ITokenFormatStrategy {
  detectFormat(data: TokenData): number;
  parseTokens(data: TokenData): Result<ProcessedToken[]>;
}

class W3CTokenFormatStrategy implements ITokenFormatStrategy { /* ... */ }
class StyleDictionaryFormatStrategy implements ITokenFormatStrategy { /* ... */ }

// Auto-selection
const strategy = TokenFormatRegistry.detectFormat(data);
```

**Benefits**:
- Each strategy is independent
- Easy to add new strategies
- Interchangeable implementations

---

### Result Pattern

**When**: Operations that can fail. Use Result<T> instead of exceptions.

**Structure**:
```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

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
  console.log(result.data);  // Type-safe
} else {
  console.error(result.error);
}
```

**Benefits**:
- Type-safe error handling
- Explicit success/failure handling
- No uncaught exceptions

---

### Batch Processor Pattern

**When**: Processing large collections with parallel execution.

**Example**:
```typescript
const result = await BatchProcessor.processBatch(
  filePaths,
  async (path) => await fetchFile(path),
  {
    batchSize: 10,
    delayMs: 100,
    onProgress: (done, total) => console.log(`${done}/${total}`)
  }
);
```

**Benefits**:
- 5-10x faster than sequential
- Configurable batch size and delays
- Error isolation
- Progress tracking

---

## DRY Principle (Don't Repeat Yourself)

### Rule
**Every piece of knowledge must have a single, unambiguous representation.**

✅ **Good Example**:
```typescript
class Base64Decoder {
  static decode(base64: string): string {
    // Single implementation used everywhere
  }
}

const content1 = Base64Decoder.decode(data1);
const content2 = Base64Decoder.decode(data2);
```

❌ **Bad Example**:
```typescript
class GitHubService {
  private decodeBase64() { /* 60 lines */ }
}

class GitLabService {
  private decodeBase64() { /* SAME 60 lines - VIOLATION! */ }
}
```

### CSS DRY
✅ **Good**:
```css
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

❌ **Bad**:
```css
.button-1 { display: flex; justify-content: center; /* ... */ }
.button-2 { display: flex; justify-content: center; /* ... */ }
```

---

## Immutability

**Prefer immutable operations over mutations.**

✅ **Good**:
```typescript
const newArray = [...oldArray, newItem];
const newObject = { ...oldObject, key: newValue };
```

❌ **Bad**:
```typescript
oldArray.push(newItem);      // Mutates
oldObject.key = newValue;    // Mutates
```

---

## Error-First Pattern

**Always handle errors before success cases.**

✅ **Good**:
```typescript
async function processFile(path: string): Promise<Result<string>> {
  if (!path) return Failure('Path is required');
  if (!fileExists(path)) return Failure('File not found');

  try {
    const content = await readFile(path);
    return Success(content);
  } catch (error) {
    return Failure(error.message);
  }
}
```

---

## Single Source of Truth

**Never duplicate data or configuration.**

Examples:
- Constants → `src/shared/constants.ts`
- Types → `src/shared/types.ts`
- Feature Flags → Single location in constants

✅ **Good**:
```typescript
// Define once
export const FEATURE_FLAGS = {
  ENABLE_PARALLEL_FETCHING: true,
} as const;

// Use everywhere
import { FEATURE_FLAGS } from '../shared/constants';
```

❌ **Bad**:
```typescript
const ENABLE_PARALLEL = true;  // File 1
const parallelEnabled = true;  // File 2 - DUPLICATION!
```

---

## Anti-Patterns to Avoid

### God Class
❌ Class with too many responsibilities

### Shotgun Surgery
❌ One change requires modifying many files

### Primitive Obsession
❌ Using primitives instead of proper types

### Magic Numbers
❌ Hard-coded numbers without constants

---

## Checklist for New Code

Before submitting ANY code, verify:

- [ ] **SRP**: Does this class have ONLY ONE responsibility?
- [ ] **OCP**: Can I extend this without modifying existing code?
- [ ] **LSP**: Are all implementations truly interchangeable?
- [ ] **ISP**: Are all interface methods necessary for ALL implementations?
- [ ] **DIP**: Am I depending on abstractions, not concretions?
- [ ] **DRY**: Is there any code duplication?
- [ ] **Immutability**: Am I mutating objects?
- [ ] **Error Handling**: Am I using Result pattern?

---

## Architectural Metrics

**Target Scores**:
- SOLID Compliance: 10/10
- Code Duplication: < 5%
- Test Coverage: > 90%
- Avg File Length: < 300 lines
- Cyclomatic Complexity: < 10 per function

**Current Project**: ✅ All targets met

---

**Last Updated**: 2025-11-11
**Mandatory Compliance**: YES
**Current Architecture Score**: 10/10 ✅

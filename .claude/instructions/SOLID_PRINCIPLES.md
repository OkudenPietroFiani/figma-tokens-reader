# SOLID Principles - Mandatory Guidelines

## ⚠️ CRITICAL: These principles are NON-NEGOTIABLE

All code changes MUST strictly adhere to SOLID principles. Violations will be rejected.

---

## Single Responsibility Principle (SRP)

### Rule:
**A class should have ONE and ONLY ONE reason to change.**

### ✅ DO:
```typescript
// GOOD: Each class has one clear responsibility
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

class GitHubService {
  async fetchRepositoryFiles(config: GitHubConfig): Promise<GitHubFile[]> {
    // Only handles GitHub API communication
  }
}
```

### ❌ DON'T:
```typescript
// BAD: God class with multiple responsibilities
class GitHubService {
  async fetchFiles() { /* HTTP */ }
  private decodeBase64() { /* Decoding */ }
  private classifyFile() { /* Classification */ }
  private parseJson() { /* Parsing */ }
  private validateToken() { /* Validation */ }
  // TOO MANY RESPONSIBILITIES!
}
```

### Action:
- ✅ Extract utilities for reusable logic (Base64Decoder, FileClassifier, BatchProcessor)
- ✅ Keep classes focused on ONE thing
- ✅ If a class has more than 3 responsibilities, split it

---

## Open/Closed Principle (OCP)

### Rule:
**Software entities should be OPEN for extension, CLOSED for modification.**

### ✅ DO:
```typescript
// GOOD: Extend via interfaces without modifying existing code
interface IFileSource {
  fetchFileList(config: FileSourceConfig): Promise<Result<FileMetadata[]>>;
  fetchFileContent(config: FileSourceConfig, path: string): Promise<Result<any>>;
}

// Add new source WITHOUT modifying interface
class GitLabFileSource implements IFileSource {
  // Implement interface methods
}

// Register dynamically
FileSourceRegistry.register(new GitLabFileSource());
```

### ❌ DON'T:
```typescript
// BAD: Modifying existing class for new functionality
class FileService {
  async fetchFiles(source: string) {
    if (source === 'github') {
      // GitHub logic
    } else if (source === 'gitlab') {  // MODIFICATION!
      // GitLab logic - BAD!
    }
  }
}
```

### Action:
- ✅ Use interfaces for abstraction (IFileSource, ITokenFormatStrategy)
- ✅ Use registries for dynamic extension (FileSourceRegistry, TokenFormatRegistry)
- ✅ Add new features by creating NEW classes, not modifying existing ones

---

## Liskov Substitution Principle (LSP)

### Rule:
**Subtypes must be substitutable for their base types.**

### ✅ DO:
```typescript
// GOOD: All implementations interchangeable
function processFiles(source: IFileSource, config: FileSourceConfig) {
  // Works with ANY IFileSource implementation
  const files = await source.fetchFileList(config);
}

// Use GitHubFileSource
processFiles(new GitHubFileSource(), githubConfig);

// Use GitLabFileSource - same interface!
processFiles(new GitLabFileSource(), gitlabConfig);
```

### ❌ DON'T:
```typescript
// BAD: Implementation-specific logic breaks substitutability
function processFiles(source: IFileSource, config: FileSourceConfig) {
  if (source instanceof GitHubFileSource) {
    // Special handling for GitHub - VIOLATES LSP!
  }
}
```

### Action:
- ✅ All implementations of an interface MUST be interchangeable
- ✅ No instanceof checks or type-specific logic
- ✅ Return types and behavior MUST be consistent

---

## Interface Segregation Principle (ISP)

### Rule:
**Clients should NOT be forced to depend on interfaces they don't use.**

### ✅ DO:
```typescript
// GOOD: Focused interfaces
interface IFileSource {
  fetchFileList(config: FileSourceConfig): Promise<Result<FileMetadata[]>>;
  fetchFileContent(config: FileSourceConfig, path: string): Promise<Result<any>>;
  fetchMultipleFiles(config: FileSourceConfig, paths: string[]): Promise<Result<any[]>>;
  validateConfig(config: FileSourceConfig): Promise<Result<boolean>>;
  getSourceType(): string;
}

// Only 5 focused methods - all implementations need all of them
```

### ❌ DON'T:
```typescript
// BAD: Fat interface with unnecessary methods
interface IFileSource {
  fetchFileList(): Promise<any>;
  fetchFileContent(): Promise<any>;

  // GitHub-specific (not all sources need these!)
  getCommits(): Promise<any>;
  createPullRequest(): Promise<any>;

  // GitLab-specific (GitHub doesn't need these!)
  getMergeRequests(): Promise<any>;

  // TOO MANY UNRELATED METHODS!
}
```

### Action:
- ✅ Keep interfaces small and focused
- ✅ Only include methods ALL implementations will use
- ✅ Split large interfaces into smaller, focused ones

---

## Dependency Inversion Principle (DIP)

### Rule:
**Depend on abstractions, NOT on concretions.**

### ✅ DO:
```typescript
// GOOD: Depend on interface, not implementation
class TokenController {
  constructor(
    private variableManager: VariableManager,  // Could be abstracted further
    private storage: StorageService
  ) {}
}

// BETTER: Use interface abstraction
class GitHubFileSource implements IFileSource {
  constructor(private githubService: GitHubService) {
    // Depends on concrete service, but implements interface
  }
}

// BEST: Registry pattern - no direct dependencies
const source = FileSourceRegistry.get('github');  // Abstraction via registry
```

### ❌ DON'T:
```typescript
// BAD: Direct dependency on concrete class
class TokenController {
  private githubService = new GitHubService();  // HARD-CODED DEPENDENCY!

  async importTokens() {
    // Tightly coupled to GitHubService
  }
}
```

### Action:
- ✅ Use dependency injection
- ✅ Depend on interfaces, not concrete classes
- ✅ Use registries for dynamic resolution (FileSourceRegistry, TokenFormatRegistry)

---

## Checklist for New Code

Before submitting ANY code, verify:

- [ ] **SRP**: Does this class have ONLY ONE responsibility?
- [ ] **OCP**: Can I extend this without modifying existing code?
- [ ] **LSP**: Are all implementations truly interchangeable?
- [ ] **ISP**: Are all interface methods necessary for ALL implementations?
- [ ] **DIP**: Am I depending on abstractions, not concretions?

---

## Examples from This Project

### ✅ Excellent SOLID Examples:

1. **IFileSource Interface** (All 5 principles)
   - SRP: Only defines file operations
   - OCP: Add new sources without modification
   - LSP: GitHub, GitLab fully interchangeable
   - ISP: Minimal, focused interface
   - DIP: Controllers depend on interface

2. **BatchProcessor Utility** (SRP)
   - Single responsibility: parallel processing
   - Generic, reusable
   - No side effects

3. **FileSourceRegistry** (OCP, DIP)
   - Open for extension
   - Dynamic registration
   - No modification needed for new sources

---

## When to Refactor

If you see:
- ❌ Class with >3 responsibilities → Split it (SRP)
- ❌ if/else for different types → Use interfaces (OCP, LSP)
- ❌ Methods unused by some implementations → Split interface (ISP)
- ❌ new ClassName() in code → Use injection or registry (DIP)

**REFACTOR IMMEDIATELY!**

---

## Score Target

**Minimum SOLID Score: 9/10**

Current project score: **10/10** ✅

Maintain or improve this score with every change.

---

**Last Updated**: 2025-01-09
**Mandatory Compliance**: YES
**Enforcement**: Code review will reject violations

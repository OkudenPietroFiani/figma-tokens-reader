# API Reference

Complete reference for all interfaces, services, registries, and utilities in the Figma Tokens Reader.

---

## Table of Contents

1. [Core Interfaces](#core-interfaces)
2. [Registries](#registries)
3. [Services](#services)
4. [Utilities](#utilities)
5. [Types](#types)
6. [Controllers](#controllers)
7. [Visualizers](#visualizers)

---

## Core Interfaces

### IFileSource Interface

**Purpose**: Abstraction for file sources (GitHub, GitLab, local, etc.)

**Location**: `src/core/interfaces/IFileSource.ts`

**Methods**:

```typescript
interface IFileSource {
  /**
   * Fetch list of available files from the source
   */
  fetchFileList(config: FileSourceConfig): Promise<Result<FileMetadata[]>>;

  /**
   * Fetch content of a single file
   */
  fetchFileContent(config: FileSourceConfig, filePath: string): Promise<Result<any>>;

  /**
   * Fetch multiple files (supports parallel processing)
   */
  fetchMultipleFiles(config: FileSourceConfig, filePaths: string[]): Promise<Result<any[]>>;

  /**
   * Validate the source configuration
   */
  validateConfig(config: FileSourceConfig): Promise<Result<boolean>>;

  /**
   * Get the source type identifier
   */
  getSourceType(): string;
}
```

**Example Implementation**:

```typescript
export class GitHubFileSource implements IFileSource {
  async fetchFileList(config: FileSourceConfig): Promise<Result<FileMetadata[]>> {
    try {
      const ghConfig = config as GitHubFileSourceConfig;
      // Fetch files from GitHub API
      const files = await this.githubService.fetchRepositoryFiles(ghConfig);

      const metadata: FileMetadata[] = files.map(f => ({
        path: f.path,
        type: f.type as 'file' | 'dir',
        sha: f.sha
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

**Usage**:

```typescript
// Register
FileSourceRegistry.register(new GitHubFileSource());

// Use
const source = FileSourceRegistry.get('github');
const result = await source.fetchFileList(config);
```

---

### ITokenFormatStrategy Interface

**Purpose**: Abstraction for token format parsers (W3C, Style Dictionary, etc.)

**Location**: `src/core/interfaces/ITokenFormatStrategy.ts`

**Methods**:

```typescript
interface ITokenFormatStrategy {
  /**
   * Detect if data matches this format (returns confidence 0-1)
   */
  detectFormat(data: TokenData): number;

  /**
   * Parse tokens from data
   */
  parseTokens(data: TokenData): Result<ProcessedToken[]>;

  /**
   * Get format name
   */
  getFormatName(): string;

  /**
   * Get format version
   */
  getFormatVersion(): string;
}
```

**Example Implementation**:

```typescript
export class W3CTokenFormatStrategy implements ITokenFormatStrategy {
  detectFormat(data: TokenData): number {
    // Check for W3C-specific markers
    const hasKeys = this.hasKeys(data, ['$value', '$type']);
    const noStyleDictKeys = !this.hasKeys(data, ['value', 'type']);

    if (hasKeys && noStyleDictKeys) {
      return 0.9; // High confidence
    }
    return 0.0;
  }

  parseTokens(data: TokenData): Result<ProcessedToken[]> {
    try {
      const tokens = this.recursivelyParseTokens(data);
      return Success(tokens);
    } catch (error) {
      return Failure(error.message);
    }
  }

  getFormatName(): string {
    return 'W3C Design Tokens';
  }
}
```

**Usage**:

```typescript
// Auto-detection
const strategy = TokenFormatRegistry.detectFormat(tokenData);
const tokens = strategy.parseTokens(tokenData);

// Manual selection
const w3c = TokenFormatRegistry.get('W3C Design Tokens');
```

---

### ITokenVisualizer Interface

**Purpose**: Abstraction for token visualizers

**Location**: `src/core/interfaces/ITokenVisualizer.ts`

**Methods**:

```typescript
interface ITokenVisualizer {
  /**
   * Check if this visualizer can handle the token
   */
  canVisualize(token: TokenMetadata): boolean;

  /**
   * Render visualization for token
   */
  renderVisualization(token: TokenMetadata, width: number, height: number): FrameNode;

  /**
   * Get visualizer type
   */
  getType(): string;
}
```

**Example Implementation**:

```typescript
export class ColorVisualizer implements ITokenVisualizer {
  canVisualize(token: TokenMetadata): boolean {
    return token.type === 'color';
  }

  renderVisualization(token: TokenMetadata, width: number, height: number): FrameNode {
    const container = figma.createFrame();
    container.layoutMode = 'HORIZONTAL';
    container.primaryAxisSizingMode = 'FIXED';
    container.counterAxisSizingMode = 'AUTO';

    const square = figma.createRectangle();
    square.resize(32, 32);
    square.fills = [{ type: 'SOLID', color: this.parseColor(token.value) }];

    container.appendChild(square);
    container.resize(width, container.height);

    return container;
  }

  getType(): string {
    return 'color';
  }
}
```

---

## Registries

### FileSourceRegistry

**Purpose**: Central registry for file source implementations

**Location**: `src/core/registries/FileSourceRegistry.ts`

**Methods**:

```typescript
class FileSourceRegistry {
  /**
   * Register a file source implementation
   */
  static register(source: IFileSource): void;

  /**
   * Get file source by type
   */
  static get(sourceType: string): IFileSource | undefined;

  /**
   * Get all registered sources
   */
  static getAll(): IFileSource[];

  /**
   * Check if source exists
   */
  static has(sourceType: string): boolean;

  /**
   * Clear all registrations (for testing)
   */
  static clear(): void;
}
```

**Usage**:

```typescript
// Register sources
FileSourceRegistry.register(new GitHubFileSource());
FileSourceRegistry.register(new GitLabFileSource());

// Use
const github = FileSourceRegistry.get('github');
const allSources = FileSourceRegistry.getAll();
```

---

### TokenFormatRegistry

**Purpose**: Central registry for token format strategies

**Location**: `src/core/registries/TokenFormatRegistry.ts`

**Methods**:

```typescript
class TokenFormatRegistry {
  /**
   * Register a format strategy
   */
  static register(strategy: ITokenFormatStrategy): void;

  /**
   * Get strategy by name
   */
  static get(formatName: string): ITokenFormatStrategy | undefined;

  /**
   * Auto-detect format from data
   */
  static detectFormat(data: TokenData): ITokenFormatStrategy;

  /**
   * Get all registered strategies
   */
  static getAll(): ITokenFormatStrategy[];
}
```

**Usage**:

```typescript
// Auto-detection
const strategy = TokenFormatRegistry.detectFormat(data);
const tokens = strategy.parseTokens(data);

// Manual
const w3c = TokenFormatRegistry.get('W3C Design Tokens');
```

---

### TokenVisualizerRegistry

**Purpose**: Central registry for token visualizers

**Location**: `src/core/registries/TokenVisualizerRegistry.ts`

**Methods**:

```typescript
class TokenVisualizerRegistry {
  /**
   * Register a visualizer
   */
  static register(visualizer: ITokenVisualizer): void;

  /**
   * Get visualizer for token
   */
  static getForToken(token: TokenMetadata): ITokenVisualizer | undefined;

  /**
   * Get all registered visualizers
   */
  static getAll(): ITokenVisualizer[];
}
```

**Usage**:

```typescript
// Register
TokenVisualizerRegistry.register(new ColorVisualizer());

// Use
const visualizer = TokenVisualizerRegistry.getForToken(token);
const frameNode = visualizer.renderVisualization(token, width, height);
```

---

## Services

### GitHubService

**Purpose**: GitHub API integration

**Location**: `src/services/githubService.ts`

**Methods**:

```typescript
class GitHubService {
  /**
   * Fetch repository files
   */
  async fetchRepositoryFiles(config: GitHubConfig): Promise<GitHubFile[]>;

  /**
   * Fetch single file content
   */
  async fetchFileContent(config: GitHubConfig, filePath: string): Promise<any>;

  /**
   * Fetch multiple files in parallel
   */
  async fetchMultipleFilesParallel(
    config: GitHubConfig,
    filePaths: string[],
    options?: BatchOptions
  ): Promise<BatchResult<any>>;

  /**
   * Validate GitHub configuration
   */
  async validateConfig(config: GitHubConfig): Promise<Result<boolean>>;
}
```

---

### VariableManager

**Purpose**: Manage Figma variables

**Location**: `src/services/variableManager.ts`

**Methods**:

```typescript
class VariableManager {
  /**
   * Import tokens as Figma variables
   */
  async importTokens(data: ImportData): Promise<Result<void>>;

  /**
   * Get all local variable collections
   */
  async getLocalCollections(): Promise<VariableCollection[]>;

  /**
   * Create or update variable
   */
  async createOrUpdateVariable(
    collection: VariableCollection,
    name: string,
    value: any,
    type: VariableResolvedDataType
  ): Promise<Variable>;
}
```

---

### DocumentationGenerator

**Purpose**: Generate visual token documentation

**Location**: `src/backend/services/DocumentationGenerator.ts`

**Methods**:

```typescript
class DocumentationGenerator {
  /**
   * Generate documentation table
   */
  async generate(
    tokenFiles: Map<string, TokenFile>,
    tokenMetadata: TokenMetadata[],
    options: DocumentationOptions
  ): Promise<Result<DocumentationResult>>;
}
```

**Options**:

```typescript
interface DocumentationOptions {
  fileNames: string[];           // Files to include
  fontFamily?: string;           // Font for documentation
  includeDescriptions: boolean;  // Show description column
}
```

---

## Utilities

### BatchProcessor

**Purpose**: Generic parallel processing with rate limiting

**Location**: `src/utils/BatchProcessor.ts`

**Methods**:

```typescript
class BatchProcessor {
  /**
   * Process items in batches with progress tracking
   */
  static async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: BatchOptions
  ): Promise<BatchResult<R>>;
}
```

**Options**:

```typescript
interface BatchOptions {
  batchSize?: number;                     // Items per batch (default: 10)
  delayMs?: number;                       // Delay between batches (default: 100)
  onProgress?: (done: number, total: number) => void;
  onError?: (error: Error, item: any, index: number) => void;
}
```

**Usage**:

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

console.log(`Success: ${result.successCount}, Failed: ${result.failureCount}`);
```

---

### Base64Decoder

**Purpose**: Decode base64 strings

**Location**: `src/utils/Base64Decoder.ts`

**Methods**:

```typescript
class Base64Decoder {
  /**
   * Decode base64 to UTF-8 string
   */
  static decode(base64: string): string;
}
```

**Usage**:

```typescript
const content = Base64Decoder.decode(githubFileContent);
const json = JSON.parse(content);
```

---

### FileClassifier

**Purpose**: Classify files by type

**Location**: `src/utils/FileClassifier.ts`

**Methods**:

```typescript
class FileClassifier {
  /**
   * Classify file by path
   */
  static classify(filePath: string): FileClassification;

  /**
   * Check if file is JSON
   */
  static isJsonFile(filePath: string): boolean;

  /**
   * Check if file is token file
   */
  static isTokenFile(filePath: string): boolean;
}
```

---

## Types

### Result Type

**Purpose**: Type-safe error handling

```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Helpers
function Success<T>(data: T): Result<T>;
function Failure<T = never>(error: string): Result<T>;
```

**Usage**:

```typescript
async function fetchData(): Promise<Result<string>> {
  try {
    const data = await fetch(url);
    return Success(data);
  } catch (error) {
    return Failure(error.message);
  }
}

// Consumer
const result = await fetchData();
if (result.success) {
  console.log(result.data); // Type: string
} else {
  console.error(result.error); // Type: string
}
```

---

### Token Types

```typescript
/**
 * Raw token data from file
 */
interface TokenData {
  [key: string]: any;
}

/**
 * Processed token with metadata
 */
interface ProcessedToken {
  name: string;
  value: any;
  type: string;
  path: string[];
  description?: string;
}

/**
 * Token metadata for Figma
 */
interface TokenMetadata {
  name: string;
  fullPath: string;
  type: string;
  value: any;
  originalValue?: any;
  description?: string;
  collection: string;
}
```

---

### Configuration Types

```typescript
/**
 * File source configuration
 */
interface FileSourceConfig {
  source: 'github' | 'gitlab' | 'local';
  [key: string]: any;
}

/**
 * GitHub-specific configuration
 */
interface GitHubConfig extends FileSourceConfig {
  source: 'github';
  token: string;
  repoUrl: string;
  branch: string;
  tokenDirectory?: string;
}

/**
 * Documentation options
 */
interface DocumentationOptions {
  fileNames: string[];
  fontFamily?: string;
  includeDescriptions: boolean;
}
```

---

## Controllers

### TokenController

**Purpose**: Orchestrate token import operations

**Location**: `src/backend/controllers/TokenController.ts`

**Methods**:

```typescript
class TokenController {
  /**
   * Import tokens from files
   */
  async importTokens(request: ImportRequest): Promise<Result<ImportResponse>>;

  /**
   * Get current token state
   */
  getTokenState(): TokenState;
}
```

---

### ScopeController

**Purpose**: Manage scope selection

**Location**: `src/backend/controllers/ScopeController.ts`

**Methods**:

```typescript
class ScopeController {
  /**
   * Load variables from Figma
   */
  async loadVariables(): Promise<Result<VariableData[]>>;

  /**
   * Apply selected scopes
   */
  async applyScopes(selectedIds: string[]): Promise<Result<void>>;
}
```

---

## Visualizers

### Color Visualizer

**Type**: `color`
**Visual**: Colored square (32x32px)
**Supports**: Hex, RGB, HSL, RGBA, HSLA

### Spacing Visualizer

**Type**: `spacing`, `dimension`
**Visual**: Blue bar (width = token value)
**Supports**: px, rem values

### Font Size Visualizer

**Type**: `fontSize`
**Visual**: Text "Aa" at token size
**Supports**: px, rem values

### Font Weight Visualizer

**Type**: `fontWeight`
**Visual**: Weight number + "Aa" sample
**Supports**: 100-900, named weights

### Border Radius Visualizer

**Type**: `borderRadius`
**Visual**: 100x100 square with radius applied
**Supports**: px values

### Default Visualizer

**Type**: Fallback for unknown types
**Visual**: Dash (—)

---

## Extension Points

### Adding New File Source

1. Implement `IFileSource`
2. Register in `FileSourceRegistry`
3. Use via registry

**Time**: 2 hours

### Adding New Token Format

1. Implement `ITokenFormatStrategy`
2. Register in `TokenFormatRegistry`
3. Auto-detection handles the rest

**Time**: 1 hour

### Adding New Visualizer

1. Implement `ITokenVisualizer`
2. Register in `TokenVisualizerRegistry`
3. Handles matching tokens automatically

**Time**: 30 minutes

---

## Error Handling

All operations return `Result<T>` for type-safe error handling:

```typescript
const result = await operation();

if (result.success) {
  // result.data is available (type T)
  processData(result.data);
} else {
  // result.error is available (type string)
  console.error(result.error);
}
```

---

## Feature Flags

**Location**: `src/shared/constants.ts`

```typescript
export const FEATURE_FLAGS = {
  USE_NEW_ARCHITECTURE: true,
  ENABLE_PARALLEL_FETCHING: true,
  AUTO_DETECT_FORMAT: true,
  PARALLEL_BATCH_SIZE: 10,
  BATCH_DELAY_MS: 100,
} as const;
```

---

**Last Updated**: 2025-11-11
**Version**: 3.0
**Status**: Production Ready ✅

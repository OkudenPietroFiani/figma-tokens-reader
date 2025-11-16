# Architecture Documentation

## Overview

This plugin uses a layered architecture with strict separation of concerns:

```
┌─────────────────────────────────────────────────┐
│                   Frontend (UI)                  │
│         React-free, vanilla TypeScript           │
│         Runs in iframe (full DOM access)         │
└────────────────┬────────────────────────────────┘
                 │ postMessage
                 ▼
┌─────────────────────────────────────────────────┐
│                Backend (Sandbox)                 │
│         Figma Plugin API access                  │
│         No DOM, limited APIs (ES2017)            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│             Core (Format-agnostic)               │
│    Token processing, validation, resolution      │
│         Strategy + Registry patterns             │
└─────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── backend/              # Figma plugin backend (sandbox)
│   ├── main.ts           # Entry point, event handlers
│   ├── controllers/      # Orchestration layer
│   │   └── ScopeController.ts
│   ├── services/         # Figma API interactions
│   │   └── DocumentationGenerator.ts
│   └── utils/
│       └── ErrorHandler.ts
│
├── frontend/             # UI layer (iframe)
│   ├── index.ts          # Entry point, app initialization
│   ├── components/       # Screen components
│   │   ├── WelcomeScreen.ts
│   │   ├── ImportScreen.ts
│   │   ├── TokenScreen.ts
│   │   ├── ScopeScreen.ts
│   │   └── DocumentationScreen.ts
│   ├── services/
│   │   └── PluginBridge.ts     # postMessage wrapper
│   └── state/
│       └── AppState.ts          # Centralized state (Observable pattern)
│
├── core/                 # Format-agnostic token processing
│   ├── models/
│   │   └── Token.ts      # Universal token model
│   ├── services/
│   │   ├── TokenProcessor.ts    # Format → Token[]
│   │   ├── TokenRepository.ts   # In-memory storage with indexes
│   │   ├── TokenResolver.ts     # Reference resolution
│   │   ├── FigmaSyncService.ts  # Token[] → Figma variables
│   │   └── StorageAdapter.ts    # Figma clientStorage wrapper
│   ├── adapters/         # Format strategies
│   │   ├── W3CTokenFormatStrategy.ts
│   │   ├── StyleDictionaryFormatStrategy.ts
│   │   ├── GitHubFileSource.ts
│   │   └── LocalFileSource.ts
│   ├── registries/       # Dynamic feature discovery
│   │   ├── TokenFormatRegistry.ts
│   │   └── FileSourceRegistry.ts
│   ├── interfaces/       # Abstraction contracts
│   │   ├── ITokenFormatStrategy.ts
│   │   └── IFileSource.ts
│   └── config/
│       └── FeatureFlags.ts
│
├── services/             # Shared business logic
│   ├── githubService.ts  # GitHub API client
│   └── styleManager.ts   # Text/Effect style creation
│
├── shared/               # Shared utilities and types
│   ├── types.ts          # Core type definitions
│   ├── constants.ts      # Figma scopes, categories
│   ├── utils.ts          # deepClone, etc.
│   └── logger.ts         # Debug logging (feature-gated)
│
└── utils/                # Pure utility functions
    ├── htmlSanitizer.ts
    ├── BatchProcessor.ts
    └── Base64Decoder.ts
```

---

## Core Patterns

### 1. Registry Pattern

**Purpose:** Dynamic feature discovery without hard-coded dependencies

**Implementation:**

```typescript
// TokenFormatRegistry.ts
export class TokenFormatRegistry {
  private static strategies: ITokenFormatStrategy[] = [];

  static register(strategy: ITokenFormatStrategy): void {
    this.strategies.push(strategy);
  }

  static detectFormat(data: TokenData): ITokenFormatStrategy | null {
    let bestStrategy: ITokenFormatStrategy | null = null;
    let highestScore = 0;

    for (const strategy of this.strategies) {
      const score = strategy.detectFormat(data);
      if (score > highestScore) {
        highestScore = score;
        bestStrategy = strategy;
      }
    }

    return highestScore >= 50 ? bestStrategy : null;
  }
}
```

**Benefits:**
- Add new formats without modifying existing code
- Auto-detection with confidence scoring (0-100)
- Open/Closed principle compliance

**Usage:**
```typescript
// Register formats at startup
TokenFormatRegistry.register(new W3CTokenFormatStrategy());
TokenFormatRegistry.register(new StyleDictionaryFormatStrategy());

// Auto-detect format
const strategy = TokenFormatRegistry.detectFormat(data);
```

---

### 2. Strategy Pattern

**Purpose:** Pluggable algorithms for different token formats

**Interface:**
```typescript
export interface ITokenFormatStrategy {
  getFormatInfo(): FormatInfo;
  detectFormat(data: TokenData): number;  // Returns confidence 0-100
  parseTokens(data: TokenData): Result<ProcessedToken[]>;
  isReference(value: any): boolean;
  extractReference(value: any): string | undefined;
}
```

**Concrete Strategies:**

```typescript
// W3CTokenFormatStrategy.ts
export class W3CTokenFormatStrategy implements ITokenFormatStrategy {
  detectFormat(data: TokenData): number {
    if (this.hasW3CTokens(data)) return 95;
    if (this.hasStyleDictTokens(data)) return 30;  // Lower confidence
    return 0;
  }

  parseTokens(data: TokenData): Result<ProcessedToken[]> {
    // W3C-specific parsing: $value, $type properties
  }

  isReference(value: any): boolean {
    return typeof value === 'string' && /^\{[^}]+\}$/.test(value);
  }
}
```

**Benefits:**
- Each format has dedicated parser
- Easy to add new formats
- Format-specific reference resolution
- Single Responsibility principle

---

### 3. Result Pattern

**Purpose:** Type-safe error handling without exceptions

**Definition:**
```typescript
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export const Success = <T>(data: T): Result<T> => ({ success: true, data });
export const Failure = <T>(error: string): Result<T> => ({ success: false, error });
```

**Usage:**
```typescript
// Service method
async processTokenData(data: TokenData): Promise<Result<Token[]>> {
  try {
    const strategy = TokenFormatRegistry.detectFormat(data);
    if (!strategy) {
      return Failure('Could not detect token format');
    }

    const parseResult = strategy.parseTokens(data);
    if (!parseResult.success) {
      return Failure(`Failed to parse: ${parseResult.error}`);
    }

    return Success(tokens);
  } catch (error) {
    return Failure(error.message);
  }
}

// Caller
const result = await processor.processTokenData(data, options);
if (result.success) {
  const tokens = result.data;  // Type: Token[]
} else {
  console.error(result.error);  // Type: string
}
```

**Benefits:**
- No try/catch at call sites
- Explicit error paths
- Type-safe (TypeScript narrows types)
- No uncaught exceptions

---

### 4. Observer Pattern

**Purpose:** Centralized state management with event notifications

**Implementation:**
```typescript
// AppState.ts
export class AppState {
  private listeners: Map<string, Set<Function>> = new Map();

  subscribe(event: AppStateEvent, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  private emit(event: AppStateEvent, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  setTokenFiles(files: TokenFile[]): void {
    files.forEach(file => this._tokenFiles.set(file.name, file));
    this.emit('files-loaded', files);  // Notify subscribers
  }
}
```

**Usage:**
```typescript
// Subscribe to events
appState.subscribe('files-loaded', (files: TokenFile[]) => {
  this.renderFileList(files);
});

// Trigger state change (emits event automatically)
appState.setTokenFiles(loadedFiles);
```

**Benefits:**
- Decoupled components
- Single source of truth
- Reactive UI updates
- No prop drilling

---

### 5. Adapter Pattern

**Purpose:** Wrap legacy services with modern interfaces

**Example:**
```typescript
// Legacy service
class GitHubService {
  async fetchFiles(owner: string, repo: string): Promise<any[]> {
    // Old implementation
  }
}

// Modern adapter
export class GitHubFileSource implements IFileSource {
  constructor(private githubService: GitHubService) {}

  async fetchTokenFiles(config: FileSourceConfig): Promise<Result<FileData[]>> {
    try {
      const files = await this.githubService.fetchFiles(
        config.owner,
        config.repo
      );
      return Success(this.transformFiles(files));
    } catch (error) {
      return Failure(error.message);
    }
  }
}
```

**Benefits:**
- Gradual migration to new architecture
- Preserve working legacy code
- Modern interface for new code

---

## Data Flow

### Import Flow (GitHub)

```
1. User enters repo details
   ├─▶ ImportScreen.ts (frontend)
   │
2. Click "Fetch Files"
   ├─▶ PluginBridge.postMessage('fetch-github-files', config)
   │
3. Backend receives message
   ├─▶ backend/main.ts
   ├─▶ GitHubFileSource.fetchTokenFiles(config)
   │   ├─▶ githubService.fetchRepositoryFiles()
   │   └─▶ BatchProcessor (parallel fetching, 6x faster)
   │
4. Files returned to frontend
   ├─▶ AppState.setTokenFiles(files)
   ├─▶ emit('files-loaded')
   │
5. UI updates
   └─▶ ImportScreen renders file list
```

### Sync Flow (Tokens → Figma)

```
1. User clicks "Sync to Figma"
   ├─▶ PluginBridge.postMessage('sync-tokens', files)
   │
2. Backend processes tokens
   ├─▶ TokenProcessor.processTokenData(file.data)
   │   ├─▶ TokenFormatRegistry.detectFormat(data)  # Auto-detect W3C/Style Dict
   │   ├─▶ Strategy.parseTokens(data)              # Parse to ProcessedToken[]
   │   └─▶ Convert to Token[]                       # Universal model
   │
3. Add to repository
   ├─▶ TokenRepository.add(tokens)                  # In-memory storage
   │
4. Resolve references
   ├─▶ TokenResolver.resolveAll(repository)
   │   ├─▶ Build dependency graph
   │   ├─▶ Detect circular references
   │   ├─▶ Topological sort
   │   └─▶ Resolve {references} to actual values
   │
5. Sync to Figma
   ├─▶ FigmaSyncService.syncTokens(tokens)
   │   ├─▶ Group by collection
   │   ├─▶ Create/update variable collections
   │   ├─▶ Create/update variables
   │   ├─▶ Set values (or aliases)
   │   ├─▶ Generate code syntax (CSS, Android, iOS)
   │   └─▶ Create styles (Typography, Shadows)
   │
6. Return stats
   └─▶ Frontend shows success message
```

---

## Critical Architectural Constraints

### 1. ES2017 Runtime

**Figma plugins run in a sandboxed ES2017 environment.**

**Implications:**
- Cannot use ES2019+ features (flatMap, Promise.allSettled, etc.)
- Cannot use BigInt or libraries that use BigInt
- Must manually polyfill or reimplement modern APIs

**Enforcement:**
```bash
# Verification after build
grep -c "flatMap\|Promise.allSettled\|BigInt" code.js  # Must be 0
```

### 2. Zero Runtime Dependencies

**Bundle must be self-contained (no node_modules in production).**

**Rationale:**
- Bundle size control (~420KB total)
- ES2017 compatibility guarantee (no external library breakage)
- Security (full control over code)

**Allowed:**
- devDependencies: TypeScript, esbuild, Jest, ESLint
- Custom utilities in `src/utils/`
- Standard library only (ES2017)

### 3. Frontend ↔ Backend Communication

**Figma plugins have two separate contexts:**

```
┌──────────────────┐        ┌──────────────────┐
│   Frontend (UI)  │        │ Backend (Sandbox)│
│                  │        │                  │
│  - Full DOM      │        │  - Figma API     │
│  - No Figma API  │◀─────▶ │  - No DOM        │
│  - iframe        │  msg   │  - ES2017        │
│                  │        │                  │
└──────────────────┘        └──────────────────┘
```

**Communication via postMessage:**

```typescript
// Frontend sends
pluginBridge.postMessage('sync-tokens', { files });

// Backend receives
figma.ui.onmessage = (msg) => {
  if (msg.type === 'sync-tokens') {
    const result = await syncTokens(msg.files);
    figma.ui.postMessage({ type: 'sync-complete', result });
  }
};

// Frontend receives
window.onmessage = (event) => {
  if (event.data.pluginMessage?.type === 'sync-complete') {
    this.handleSyncComplete(event.data.pluginMessage.result);
  }
};
```

**Rules:**
- Frontend CANNOT access Figma API directly
- Backend CANNOT access DOM directly
- All data must be JSON-serializable (no functions, no circular references)

### 4. Immutable Token Values

**All token values must be deep cloned to prevent shared references.**

```typescript
// ✅ Correct
const token: Token = {
  value: deepClone(processedToken.value),
  resolvedValue: deepClone(processedToken.resolvedValue),
};

// ❌ Wrong - tokens share same object reference
const token: Token = {
  value: processedToken.value,  // Shared reference!
};
```

**Why:** Without deep cloning, modifying one token's value modifies all tokens sharing that reference.

---

## Performance Optimizations

### 1. Parallel File Fetching

**BatchProcessor for concurrent GitHub API calls:**

```typescript
// Before: Sequential (slow)
for (const file of files) {
  const content = await fetchFile(file);
}

// After: Parallel batches (6x faster)
await BatchProcessor.processBatch(files, async (file) => {
  return await fetchFile(file);
}, {
  batchSize: 10,  // 10 concurrent requests
  onProgress: (completed, total) => {
    figma.ui.postMessage({ type: 'progress', completed, total });
  }
});
```

**Result:** 60 files in ~10s instead of ~60s

### 2. Indexed Repository Queries

**TokenRepository uses multiple indexes for O(1) lookups:**

```typescript
class TokenRepository {
  private tokens: Map<string, Token>;                  // id → token
  private projectIndex: Map<string, Set<string>>;      // projectId → token ids
  private typeIndex: Map<TokenType, Set<string>>;      // type → token ids
  private pathIndex: Map<string, string>;              // qualifiedName → id

  // O(1) lookup by qualified name
  getByQualifiedName(projectId: string, name: string): Token | undefined {
    const key = `${projectId}:${name}`;
    const id = this.pathIndex.get(key);
    return id ? this.tokens.get(id) : undefined;
  }
}
```

**Performance:**
- Get by ID: O(1)
- Get by qualified name: O(1)
- Get by project: O(k) where k = result set size
- Query by type: O(k) where k = result set size

### 3. Feature-Gated Debug Logging

**All debug.log() calls are gated by DEBUG_MODE flag:**

```typescript
// Production: 0 debug.log() calls execute
import { debug } from './shared/logger';

debug.log('Processing tokens...');  // Only runs if DEBUG_MODE = true
console.error('Sync failed');       // Always runs
```

**Result:** Production bundle has zero debug overhead

---

## Testing Strategy

### Unit Tests

**Every service/utility has dedicated tests:**

```typescript
// TokenRepository.test.ts
describe('TokenRepository', () => {
  it('should add tokens with indexes', () => {
    const repo = new TokenRepository();
    const result = repo.add(mockTokens);

    expect(result.success).toBe(true);
    expect(repo.count()).toBe(mockTokens.length);
  });

  it('should query by qualified name O(1)', () => {
    const token = repo.getByQualifiedName('default', 'color.primary');
    expect(token).toBeDefined();
    expect(token.qualifiedName).toBe('color.primary');
  });
});
```

**Coverage:** 85-100% for all core services

### Integration Tests

**Full pipeline tests:**

```typescript
// TokenProcessor.test.ts
describe('TokenProcessor integration', () => {
  it('should process W3C tokens end-to-end', async () => {
    const processor = new TokenProcessor();
    const result = await processor.processTokenData(w3cData, options);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(expectedCount);
    expect(result.data[0]).toMatchObject({
      type: 'color',
      value: expect.any(Object),
    });
  });
});
```

---

## Security Considerations

### 1. XSS Prevention

**All user-provided content sanitized before innerHTML:**

```typescript
import { escapeHtml } from './utils/htmlSanitizer';

// ✅ Safe
element.innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;

// ❌ Vulnerable
element.innerHTML = `<div class="error">${error.message}</div>`;
```

**Critical paths:** Error messages, token names, file names, repository names

### 2. GitHub Token Security

**GitHub personal access tokens stored in clientStorage:**

```typescript
// Storage is plugin-specific and encrypted by Figma
await figma.clientStorage.setAsync('github-token', token);
```

**Never logged or exposed in UI.**

### 3. No eval() or Function()

**Code is statically analyzable - no dynamic code execution.**

---

## Future Extensibility

### Planned Features (Feature Flags)

```typescript
export const FeatureFlags = {
  UNIFIED_PROJECT_ID: false,      // Single project for all imports
  CROSS_PROJECT_REFS: false,      // References across projects
  SYNC_STATE_TRACKING: false,     // Track synced/modified status
  TRANSACTION_SYNC: false,        // Atomic operations with rollback
};
```

**How to add:**
1. Implement feature behind flag
2. Test with flag enabled
3. Enable flag in production when stable
4. Remove flag and dead code after rollout

---

## Deployment

### Build Process

```bash
npm run build
# 1. esbuild compiles TypeScript → ES2017
# 2. Backend: src/backend/main.ts → code.js
# 3. Frontend: src/frontend/index.ts → ui.js
# 4. UI: build-ui.js bundles ui.js + CSS → ui.html
```

### Artifacts

```
code.js   196KB   Backend bundle (Figma sandbox)
ui.js      95KB   Frontend bundle (iframe)
ui.html   126KB   Complete UI (HTML + CSS + JS inline)
```

**Total:** ~420KB (well under 1MB storage limit)

---

## Troubleshooting

### Bundle Size Too Large

1. Check for accidental runtime dependencies: `npm list --production`
2. Analyze bundle: `esbuild --analyze`
3. Remove unused code
4. Consider code splitting (if supported by Figma)

### ES2017 Violations

1. Search for ES2019+ features: `grep -n "flatMap\|Promise.allSettled" src/**/*.ts`
2. Replace with ES2017 equivalents
3. Verify bundle: `grep -c "flatMap\|Promise.allSettled\|BigInt" code.js`

### Performance Issues

1. Enable DEBUG_MODE to see bottlenecks
2. Check BatchProcessor batch size (default: 10)
3. Profile with Figma performance tools
4. Optimize token resolution (current: O(n) for n tokens)

---

## License

MIT License - See LICENSE file

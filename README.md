# W3C Design Tokens Importer for Figma

A Figma plugin that imports W3C Design Tokens and Style Dictionary formats, converting them to Figma variables with automatic type detection, reference resolution, and style generation.

## Features

- **Multiple Token Formats**: W3C Design Tokens and Style Dictionary with auto-detection
- **Smart References**: Automatic resolution of token aliases (e.g., `{color.primary}`)
- **GitHub Integration**: Direct import from repositories with parallel fetching
- **Local Import**: Upload ZIP files or individual JSON files
- **Type Support**: Colors, dimensions, typography, shadows, spacing, numbers, strings
- **Style Generation**: Typography → Text Styles, Shadows → Effect Styles
- **Unit Conversion**: Automatic rem/em/% to pixel conversion
- **Scope Management**: Apply Figma variable scopes via dedicated UI

---

## Critical Technical Constraints

### ES2017 Runtime Environment

**Figma plugins run in a strict ES2017 JavaScript environment.**

✅ **Allowed:**
- ES2017 features: async/await, Object.values(), Object.entries()
- Promise.all(), Promise.race()
- Array.map(), .filter(), .reduce(), .concat()

❌ **NOT Allowed:**
- ES2019+ features: `Array.flatMap()`, `Promise.allSettled()`, `Object.fromEntries()`
- BigInt type or libraries using BigInt
- ES2020+ features

**Critical:** Dependencies MUST be ES2017-compatible. Libraries like Zod 4.x (uses BigInt) will cause runtime errors.

### Dependency Policy

**Zero runtime dependencies.** All production code is self-contained.

- ✅ DevDependencies only: TypeScript, esbuild, Jest, ESLint
- ❌ No runtime dependencies (no libraries in node_modules bundled)
- ✅ If validation is needed: Write custom validators (no Zod, Yup, etc.)

**Rationale:** Bundle size control, ES2017 compatibility guarantee, no external breakage

### Bundle Size Limits

**Figma has strict plugin size limits.**

- code.js (backend): ~200KB target (current: 196KB)
- ui.js (frontend): ~100KB target (current: 95KB)
- ui.html: ~130KB target (current: 126KB)

**Total:** ~420KB (well under 1MB storage limit)

### Build Artifacts in Git

**Build artifacts (code.js, ui.js, ui.html) are committed to git.**

**Rationale:** Non-technical users can use the plugin without building. The repository is ready to import into Figma immediately.

---

## Key Architecture Principles

### 1. SOLID Principles (9/10 minimum)

**Every component follows SOLID design:**

- **Single Responsibility**: One class, one purpose
  - `TokenRepository`: Storage only
  - `TokenResolver`: Reference resolution only
  - `FigmaSyncService`: Figma API sync only

- **Open/Closed**: Extension via strategies/adapters
  - Add new token formats by implementing `ITokenFormatStrategy`
  - Add new file sources by implementing `IFileSource`

- **Dependency Inversion**: Depend on abstractions
  - Services depend on interfaces, not concrete implementations

**Example:**
```typescript
// ✅ Good: Depends on interface
class TokenProcessor {
  constructor(private strategy: ITokenFormatStrategy) {}
}

// ❌ Bad: Depends on concrete class
class TokenProcessor {
  constructor(private w3cParser: W3CParser) {}
}
```

### 2. Registry Pattern

**Dynamic feature discovery via registries:**

- `TokenFormatRegistry`: Detects W3C vs Style Dictionary format
- `FileSourceRegistry`: Manages GitHub, Local, API sources

**Benefits:**
- Add new formats without modifying existing code
- Auto-detection with confidence scoring
- Extensible without breaking changes

### 3. Type Safety

**TypeScript strict mode, Result pattern for errors:**

```typescript
// All operations return Result<T> for type-safe error handling
const result = await tokenProcessor.processTokenData(data, options);
if (result.success) {
  const tokens = result.data; // Type: Token[]
} else {
  console.error(result.error); // Type: string
}
```

**No exceptions thrown:** All errors returned as Result<T> values

### 4. Minimal Logging in Production

**Debug logging is gated by feature flags:**

```typescript
import { debug } from './shared/logger';

// Only logs when DEBUG_MODE = true
debug.log('Processing tokens...');

// Always logs (for user-facing errors)
console.warn('Token not found');
console.error('Sync failed');
```

**Production bundle:** 0 debug.log() calls execute (controlled by `FeatureFlags.DEBUG_MODE`)

---

## Critical Quality Points

### 1. No Shared Mutable State

**Deep clone all token values to prevent reference pollution:**

```typescript
// ✅ Correct: Deep clone prevents shared references
value: deepClone(pt.value)

// ❌ Wrong: Multiple tokens share same object reference
value: pt.value
```

**Why:** Prevents bugs where modifying one token affects another

### 2. XSS Prevention

**All user-provided content must be sanitized:**

```typescript
import { escapeHtml } from './utils/htmlSanitizer';

// ✅ Safe
element.innerHTML = `<div>${escapeHtml(userInput)}</div>`;

// ❌ Unsafe
element.innerHTML = `<div>${error.message}</div>`;
```

**Critical paths:** Error messages, token names, file names

### 3. ES2017 Compliance

**All code must transpile to ES2017:**

```typescript
// ✅ ES2017-compatible
const arr = [1, 2, 3];
const doubled = arr.reduce((acc, val) => acc.concat(val * 2), []);

// ❌ ES2019+ (will break in Figma)
const doubled = arr.flatMap(val => [val * 2]);
```

**Verification:** `grep -c "flatMap\|Promise.allSettled\|BigInt" code.js` must return 0

### 4. Reference Resolution

**All token references MUST be in the same project:**

```json
// ✅ Works: Both in "default" project
{
  "color": { "primary": { "$value": "#1e40af" } },
  "button": { "bg": { "$value": "{color.primary}" } }
}

// ❌ Fails: Different projects
// Project "primitives": color.primary
// Project "semantic": button.bg references {color.primary}
```

**Rule:** Cross-project references are NOT supported (would require registry refactoring)

### 5. Figma API Constraints

**Variable types are immutable:**

- Cannot change COLOR variable to FLOAT
- Cannot change alias to direct value (or vice versa)
- Plugin detects mismatches and warns user

**Alpha channels:**
- Variables: Alpha ignored (Figma COLOR limitation)
- Effect Styles: Alpha preserved (RGBA support)

---

## Installation

### For Users (No Build Required)

1. Download or clone repository
2. In Figma: **Plugins → Development → Import plugin from manifest**
3. Select `manifest.json`
4. Plugin ready to use

### For Developers

```bash
git clone https://github.com/OkudenPietroFiana/figma-tokens-reader.git
cd figma-tokens-reader
npm install
npm run build
```

---

## Usage

### Quick Start

1. Open plugin in Figma
2. Select import mode:
   - **GitHub**: Enter repo details (owner/repo/branch/token)
   - **Local**: Upload ZIP or JSON files
3. Review loaded tokens
4. Click **Sync to Figma**

### Supported Token Formats

**W3C Design Tokens:**
```json
{
  "color": {
    "primary": {
      "$value": "#1e40af",
      "$type": "color"
    }
  }
}
```

**Style Dictionary:**
```json
{
  "color": {
    "primary": {
      "value": "#1e40af",
      "type": "color"
    }
  }
}
```

**References:**
```json
{
  "button": {
    "background": {
      "$value": "{color.primary}",
      "$type": "color"
    }
  }
}
```

### Color Formats

All formats auto-convert to Figma RGB:

- **Hex**: `#E8E9EC`, `#f80`, `#ff8800ff`
- **RGB**: `rgb(255, 128, 0)`, `{ r: 255, g: 128, b: 0 }`
- **HSL with hex fallback**: `{ colorSpace: "hsl", components: [225, 16, 92], hex: "#E8E9EC" }`
- **Nested components**: `{ colorSpace: "hsl", components: { components: [60, 8, 33], alpha: 1 } }`

### Unit Conversion

**Automatic rem/em to pixels (16px base):**

- `0.625rem` → `10px`
- `0.75rem` → `12px`
- `1rem` → `16px`
- `1.5rem` → `24px`

### Collections

Tokens organize into Figma variable collections by filename or metadata:

- `primitives.json` → "primitives" collection
- `semantic-colors.json` → "semantic-colors" collection
- Auto-detected from file path

---

## Troubleshooting

### Plugin Won't Load

**Error:** "ReferenceError: 'BigInt' is not defined"

**Cause:** A library using BigInt was added

**Fix:** Remove the library. Use ES2017-compatible alternatives only.

---

### Colors Appear Black

**Cause:** HSL colors without hex fallback OR nested components object

**Fix:** Ensure HSL tokens include `hex` property:
```json
{
  "colorSpace": "hsl",
  "components": [225, 16, 92],
  "hex": "#E8E9EC"
}
```

---

### Typography Shows 12px/AUTO

**Cause:** Unresolved font size or line height reference

**Diagnosis:**
1. Open **Plugins → Development → Open Console**
2. Look for `❌ UNRESOLVED:` errors
3. Check if referenced tokens are in different project ID

**Fix:** Ensure all tokens imported together use same project ID

---

### Dimensions Show 0.625 Instead of 10px

**Cause:** REM values not converting

**Fix:** Verify token has explicit unit:
```json
{
  "fontSize": {
    "$value": "0.625rem",
    "$type": "dimension"
  }
}
```

---

### Shadows Missing Colors

**Cause:** Unresolved color reference in shadow token

**Fix:** Ensure shadow color tokens exist in same project:
```json
{
  "shadow": {
    "color": "{color.neutral.900}",  // Must exist in same project
    "offsetX": 0,
    "offsetY": 1
  }
}
```

---

## Development

### Build Commands

```bash
npm run build          # Build plugin (backend + frontend)
npm run watch          # Auto-rebuild on changes
npm test               # Run 172+ tests
npm run test:coverage  # Generate coverage report
npm run lint           # Check code quality
npm run lint:fix       # Auto-fix issues
```

### Debug Mode

Enable verbose logging:

1. Edit `src/core/config/FeatureFlags.ts`
2. Set `DEBUG_MODE: true`
3. Rebuild: `npm run build`
4. Open Figma console to see debug.log() output

**Production:** Always set `DEBUG_MODE: false` before committing

### Adding a New Token Format

1. Implement `ITokenFormatStrategy` interface
2. Register in `TokenFormatRegistry`
3. Add detection logic with confidence score
4. Write tests (85%+ coverage required)

Example:
```typescript
export class MyFormatStrategy implements ITokenFormatStrategy {
  detectFormat(data: TokenData): number {
    // Return 0-100 confidence score
    return data.hasOwnProperty('myFormat') ? 90 : 0;
  }

  parseTokens(data: TokenData): Result<ProcessedToken[]> {
    // Parse and return tokens
  }
}
```

### Code Quality Standards

All contributions must meet:

- ✅ **SOLID Score**: 9/10 minimum
- ✅ **Test Coverage**: 85-100%
- ✅ **ES2017 Compliance**: No ES2019+ features
- ✅ **Type Safety**: TypeScript strict mode
- ✅ **Error Handling**: Result<T> pattern (no throw)
- ✅ **Documentation**: JSDoc on public APIs

---

## Architecture Overview

```
src/
├── backend/          # Figma plugin backend (runs in sandbox)
│   ├── controllers/  # Business logic coordination
│   └── services/     # Figma API interactions
├── frontend/         # UI components (runs in iframe)
│   ├── components/   # Screen components
│   ├── services/     # Bridge to backend
│   └── state/        # App state management
├── core/             # Format-agnostic token processing
│   ├── services/     # TokenProcessor, TokenResolver, FigmaSyncService
│   ├── models/       # Token data model
│   ├── adapters/     # Format strategies (W3C, Style Dictionary)
│   └── registries/   # Dynamic feature discovery
├── services/         # Shared services (GitHub, styles)
├── shared/           # Shared types and utilities
│   ├── types.ts      # Core type definitions
│   ├── logger.ts     # Debug logging (feature-gated)
│   └── constants.ts  # Figma scopes and categories
└── utils/            # Pure utility functions
```

**Key Patterns:**
- **Registry**: Dynamic feature discovery (formats, sources)
- **Strategy**: Pluggable token format parsers
- **Adapter**: Legacy service wrappers
- **Result**: Type-safe error handling (no exceptions)
- **Observer**: State change events (AppState)

---

## Technology Stack

- **TypeScript 5.3**: Strict mode, ES2017 target
- **Figma Plugin API**: Variables, styles, scopes
- **GitHub API**: Repository integration
- **Jest**: Testing (172+ tests, 85-100% coverage)
- **ESBuild**: Fast compilation to ES2017

---

## Feature Flags

Control experimental features in `src/core/config/FeatureFlags.ts`:

```typescript
export const FeatureFlags = {
  DEBUG_MODE: false,              // Enable verbose logging
  DRY_RUN: false,                 // Validate without syncing
  UNIFIED_PROJECT_ID: false,      // Experimental: Single project
  CROSS_PROJECT_REFS: false,      // Experimental: Cross-project refs
  SYNC_STATE_TRACKING: false,     // Experimental: Track sync state
  TRANSACTION_SYNC: false,        // Experimental: Atomic operations
};
```

**Production Rule:** All experimental flags MUST be `false`

---

## License

MIT License - See LICENSE file

---

## Support

- **Issues**: [GitHub Issues](https://github.com/OkudenPietroFiana/figma-tokens-reader/issues)
- **Specs**: [W3C Design Tokens](https://design-tokens.github.io/community-group/format/)
- **Docs**: [Style Dictionary](https://amzn.github.io/style-dictionary/)

---

**Version**: 1.1.0
**Author**: Pietro Fiana
**Repository**: https://github.com/OkudenPietroFiana/figma-tokens-reader

# Contributing Guide

## Quick Start for Developers

```bash
git clone https://github.com/OkudenPietroFiana/figma-tokens-reader.git
cd figma-tokens-reader
npm install
npm run build
```

In Figma: **Plugins → Development → Import plugin from manifest** → Select `manifest.json`

---

## Critical Rules

### 1. ES2017 Compliance (MANDATORY)

**Figma plugins run in ES2017 environment. Using ES2019+ features will break the plugin.**

✅ **Allowed:**
```typescript
// ES2017
async/await
Promise.all(), Promise.race()
Object.values(), Object.entries()
Array.map(), .filter(), .reduce()
```

❌ **NOT Allowed:**
```typescript
// ES2019+
Array.flatMap()           // Use .reduce((acc, val) => acc.concat(val), [])
Promise.allSettled()      // Use Promise.all() + try/catch wrapper
Object.fromEntries()      // Use manual reduce

// ES2020+
BigInt                    // NO libraries using BigInt (Zod 4.x, etc.)
?.                        // Optional chaining
??                        // Nullish coalescing
```

**Verification:**
```bash
npm run build
grep -c "flatMap\|Promise.allSettled\|BigInt" code.js  # Must return 0
```

---

### 2. Zero Runtime Dependencies (MANDATORY)

**No libraries in production bundle.**

✅ **Allowed:**
- DevDependencies: TypeScript, esbuild, Jest, ESLint
- Custom utilities in `src/utils/`
- Standard library only (ES2017)

❌ **NOT Allowed:**
- Runtime dependencies (lodash, date-fns, etc.)
- Validation libraries (Zod, Yup, etc.)
- UI frameworks (React, Vue, etc.)

**Why:**
- Bundle size control (~420KB total)
- ES2017 compatibility guarantee
- No external library breaking changes

**If you need validation:** Write custom validators in `src/utils/`

---

### 3. SOLID Principles (9/10 minimum)

Every class/service must follow SOLID design:

#### Single Responsibility
**One class, one purpose.**

✅ Good:
```typescript
class TokenRepository {
  add(tokens: Token[]): Result<number> { /* ... */ }
  get(id: string): Token | undefined { /* ... */ }
}
```

❌ Bad:
```typescript
class TokenService {
  add(tokens: Token[]) { /* ... */ }
  get(id: string) { /* ... */ }
  parseFromW3C() { /* ... */ }  // ❌ Mixing storage + parsing
  syncToFigma() { /* ... */ }   // ❌ Mixing storage + sync
}
```

#### Open/Closed
**Extend via interfaces, not modification.**

✅ Good:
```typescript
// Add new format by implementing interface
export class MyFormatStrategy implements ITokenFormatStrategy {
  detectFormat(data: TokenData): number { /* ... */ }
  parseTokens(data: TokenData): Result<ProcessedToken[]> { /* ... */ }
}

// Register in registry
TokenFormatRegistry.register(new MyFormatStrategy());
```

❌ Bad:
```typescript
// Modifying existing class to add new format
class TokenParser {
  parse(data: any) {
    if (isW3C(data)) { /* ... */ }
    if (isStyleDict(data)) { /* ... */ }
    if (isMyFormat(data)) { /* ... */ }  // ❌ Modified existing code
  }
}
```

#### Dependency Inversion
**Depend on abstractions (interfaces), not concrete classes.**

✅ Good:
```typescript
class TokenProcessor {
  constructor(private strategy: ITokenFormatStrategy) {}
}
```

❌ Bad:
```typescript
class TokenProcessor {
  constructor(private w3cParser: W3CParser) {}  // ❌ Depends on concrete class
}
```

---

### 4. Type Safety (MANDATORY)

**TypeScript strict mode, Result pattern for errors.**

✅ **Allowed:**
```typescript
// Result pattern (no throw)
function processTokens(data: TokenData): Result<Token[]> {
  if (!data) {
    return Failure('No data provided');
  }
  return Success(tokens);
}

// Usage
const result = processTokens(data);
if (result.success) {
  const tokens = result.data;  // Type: Token[]
} else {
  console.error(result.error);  // Type: string
}
```

❌ **NOT Allowed:**
```typescript
// Throwing exceptions
function processTokens(data: TokenData): Token[] {
  if (!data) {
    throw new Error('No data');  // ❌ Never throw
  }
  return tokens;
}
```

**Why:** Type-safe error handling, explicit error paths, no uncaught exceptions

---

### 5. Security (MANDATORY)

#### XSS Prevention

**All user-provided content must be sanitized before innerHTML.**

✅ Good:
```typescript
import { escapeHtml } from './utils/htmlSanitizer';

element.innerHTML = `<div>${escapeHtml(error.message)}</div>`;
```

❌ Bad:
```typescript
element.innerHTML = `<div>${error.message}</div>`;  // ❌ XSS vulnerability
```

**Critical paths:** Error messages, token names, file names, repository names

#### No Shared Mutable State

**Deep clone all token values.**

✅ Good:
```typescript
import { deepClone } from './shared/utils';

const token: Token = {
  value: deepClone(pt.value),  // ✅ Prevents shared references
};
```

❌ Bad:
```typescript
const token: Token = {
  value: pt.value,  // ❌ Multiple tokens share same object
};
```

**Why:** Prevents bugs where modifying one token affects another

---

## Development Workflow

### 1. Make Changes

```bash
# Edit files in src/
vim src/core/services/FigmaSyncService.ts
```

### 2. Build

```bash
npm run build
```

**Important:** Build artifacts (code.js, ui.js, ui.html) are committed to git. Always commit them with your changes.

### 3. Test in Figma

1. Reload plugin in Figma: **Plugins → Development → Your Plugin**
2. Test your changes
3. Open console: **Plugins → Development → Open Console**

### 4. Run Tests

```bash
npm test              # Run all tests
npm run test:coverage # Generate coverage report
```

**Required:** 85%+ coverage for new code

### 5. Lint

```bash
npm run lint          # Check issues
npm run lint:fix      # Auto-fix
```

### 6. Commit

```bash
git add .
git commit -m "feat: Add support for new color format"
```

**Commit format:** `type: description`
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructure (no behavior change)
- `docs`: Documentation only
- `test`: Tests only

---

## Debug Mode

Enable verbose logging to see what's happening:

1. Edit `src/core/config/FeatureFlags.ts`:
   ```typescript
   export const FeatureFlags = {
     DEBUG_MODE: true,  // ✅ Enable debug logging
   };
   ```

2. Rebuild: `npm run build`

3. Open Figma console to see `debug.log()` output

**Production:** Always set `DEBUG_MODE: false` before committing

---

## Adding Features

### Adding a New Token Format

1. **Create strategy:**
   ```typescript
   // src/core/adapters/MyFormatStrategy.ts
   export class MyFormatStrategy implements ITokenFormatStrategy {
     getFormatInfo(): FormatInfo {
       return { name: 'My Format', version: '1.0' };
     }

     detectFormat(data: TokenData): number {
       // Return 0-100 confidence score
       return data.hasOwnProperty('myFormat') ? 90 : 0;
     }

     parseTokens(data: TokenData): Result<ProcessedToken[]> {
       // Parse tokens
       const tokens: ProcessedToken[] = [];
       // ... parsing logic
       return Success(tokens);
     }

     isReference(value: any): boolean {
       // Detect if value is a reference
       return typeof value === 'string' && value.startsWith('{');
     }

     extractReference(value: any): string | undefined {
       // Extract reference path
       return value.replace(/[{}]/g, '');
     }
   }
   ```

2. **Register strategy:**
   ```typescript
   // src/core/registries/TokenFormatRegistry.ts
   TokenFormatRegistry.register(new MyFormatStrategy());
   ```

3. **Write tests:**
   ```typescript
   // src/core/adapters/__tests__/MyFormatStrategy.test.ts
   describe('MyFormatStrategy', () => {
     it('should detect my format', () => {
       const strategy = new MyFormatStrategy();
       const score = strategy.detectFormat({ myFormat: true });
       expect(score).toBeGreaterThan(80);
     });
   });
   ```

4. **Test coverage:** 85%+ required

---

### Adding a New File Source

1. **Create source:**
   ```typescript
   // src/core/adapters/MyFileSource.ts
   export class MyFileSource implements IFileSource {
     async fetchTokenFiles(config: any): Promise<Result<Array<{ data: TokenData; filePath: string }>>> {
       // Fetch files from your source
       return Success(files);
     }
   }
   ```

2. **Register source:**
   ```typescript
   // src/core/registries/FileSourceRegistry.ts
   FileSourceRegistry.register('my-source', new MyFileSource());
   ```

3. **Add UI support:** Update `src/frontend/components/ImportScreen.ts`

---

## Code Quality Checklist

Before submitting a PR, verify:

- ✅ **ES2017 Compliance**: `grep -c "flatMap\|Promise.allSettled\|BigInt" code.js` returns 0
- ✅ **No Runtime Dependencies**: `package.json` has no dependencies (only devDependencies)
- ✅ **Tests Pass**: `npm test` passes all tests
- ✅ **Coverage**: `npm run test:coverage` shows 85%+ for new code
- ✅ **Lint**: `npm run lint` has no errors
- ✅ **Type Safety**: All functions return `Result<T>`, no `throw`
- ✅ **SOLID Score**: 9/10 minimum (single responsibility, dependency inversion)
- ✅ **Build Artifacts**: code.js, ui.js, ui.html committed
- ✅ **DEBUG_MODE**: Set to `false` in FeatureFlags.ts
- ✅ **XSS**: All innerHTML uses `escapeHtml()`
- ✅ **Deep Clone**: All token values use `deepClone()`

---

## Common Mistakes

### ❌ Using ES2019+ Features
```typescript
// ❌ Wrong
const flattened = array.flatMap(x => x);

// ✅ Correct
const flattened = array.reduce((acc, x) => acc.concat(x), []);
```

### ❌ Adding Runtime Dependencies
```bash
# ❌ Wrong
npm install lodash

# ✅ Correct (if needed)
# Write custom utility in src/utils/
```

### ❌ Throwing Exceptions
```typescript
// ❌ Wrong
if (!data) throw new Error('No data');

// ✅ Correct
if (!data) return Failure('No data');
```

### ❌ Direct innerHTML with User Data
```typescript
// ❌ Wrong
element.innerHTML = `<div>${error.message}</div>`;

// ✅ Correct
element.innerHTML = `<div>${escapeHtml(error.message)}</div>`;
```

### ❌ Shared Object References
```typescript
// ❌ Wrong
const token = { value: originalValue };

// ✅ Correct
const token = { value: deepClone(originalValue) };
```

---

## Support

- **Questions**: Open an issue with `question` label
- **Bugs**: Open an issue with `bug` label
- **Features**: Open an issue with `enhancement` label

**GitHub**: https://github.com/OkudenPietroFiana/figma-tokens-reader/issues

---

## License

MIT License - See LICENSE file

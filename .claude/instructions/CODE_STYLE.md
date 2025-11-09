# Code Style Guidelines - Mandatory Standards

## ⚠️ CRITICAL: These standards are NON-NEGOTIABLE

All code MUST follow these style guidelines. Consistency is paramount.

---

## DRY Principle (Don't Repeat Yourself)

### Rule:
**Every piece of knowledge must have a single, unambiguous representation.**

### ✅ DO:
```typescript
// GOOD: Extract reusable utility
class Base64Decoder {
  static decode(base64: string): string {
    // Single implementation used everywhere
  }
}

// Use it everywhere
const content1 = Base64Decoder.decode(data1);
const content2 = Base64Decoder.decode(data2);
```

### ❌ DON'T:
```typescript
// BAD: Duplicate base64 decoding logic
class GitHubService {
  private decodeBase64(base64: string) {
    // 60 lines of decoding logic
  }
}

class GitLabService {
  private decodeBase64(base64: string) {
    // SAME 60 lines of decoding logic - VIOLATION!
  }
}
```

### Action:
- ✅ Extract shared logic to utilities
- ✅ Use constants for repeated values
- ✅ Create reusable components/functions
- ❌ NEVER copy-paste code

---

## CSS DRY Principles

### Rule:
**CSS classes must be reusable and not duplicated.**

### ✅ DO:
```css
/* GOOD: Reusable utility classes */
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.button-primary {
  background: var(--color-primary);
  padding: 8px 16px;
  border-radius: 4px;
}

/* Use in HTML */
<button class="button-primary flex-center">Click</button>
```

### ❌ DON'T:
```css
/* BAD: Duplicate flex centering */
.import-button {
  display: flex;
  justify-content: center;
  align-items: center;
  /* other styles */
}

.submit-button {
  display: flex;
  justify-content: center;
  align-items: center;  /* DUPLICATE! */
  /* other styles */
}
```

### Action:
- ✅ Use CSS variables for colors, spacing, etc.
- ✅ Create utility classes for common patterns
- ✅ Consolidate duplicate styles
- ❌ NEVER duplicate CSS rules

**See**: `src/frontend/styles/main.css` for consolidated styles

---

## Naming Conventions

### Files
```
kebab-case.ts          ✅ GOOD
camelCase.ts           ❌ BAD
PascalCase.ts          ❌ BAD (except for classes)
snake_case.ts          ❌ BAD
```

### Classes
```typescript
class GitHubService {}       ✅ GOOD (PascalCase)
class githubService {}       ❌ BAD
class github_service {}      ❌ BAD
```

### Interfaces
```typescript
interface IFileSource {}     ✅ GOOD (I prefix + PascalCase)
interface FileSource {}      ❌ BAD (no I prefix)
interface iFileSource {}     ❌ BAD (lowercase i)
```

### Variables & Functions
```typescript
const userName = 'John';              ✅ GOOD (camelCase)
function fetchUserData() {}           ✅ GOOD (camelCase)

const user_name = 'John';             ❌ BAD
const UserName = 'John';              ❌ BAD
```

### Constants
```typescript
const MAX_RETRY_COUNT = 3;            ✅ GOOD (UPPER_SNAKE_CASE)
const REM_TO_PX_RATIO = 16;           ✅ GOOD

const maxRetryCount = 3;              ❌ BAD
const max_retry_count = 3;            ❌ BAD
```

### Private Members
```typescript
class Example {
  private userName: string;           ✅ GOOD (camelCase, no prefix)
  private _userName: string;          ❌ BAD (underscore prefix not needed in TS)
}
```

---

## Logging Guidelines

### Rule:
**Minimize console.log. Only log errors and critical information.**

### ✅ DO:
```typescript
// GOOD: Log only errors
try {
  await processFiles();
} catch (error) {
  console.error('[ServiceName] Operation failed:', error.message);
  throw error;
}

// GOOD: Log critical failures
if (result.failureCount > 0) {
  console.error(`[ServiceName] Failed to process ${result.failureCount} items`);
}
```

### ❌ DON'T:
```typescript
// BAD: Excessive logging clutters console
console.log('Starting process...');              // ❌ Remove
console.log('Fetching file:', filePath);         // ❌ Remove
console.log('File fetched successfully');        // ❌ Remove
console.log('Decoding content...');              // ❌ Remove
console.log('Content decoded:', content);        // ❌ Remove
```

### Action:
- ✅ **console.error()** for failures only
- ✅ Use `[ServiceName]` prefix for context
- ❌ Remove `console.log()` for normal operations
- ❌ Remove `console.log()` for debugging (use debugger instead)

---

## Comment Guidelines

### Rule:
**Code should be self-documenting. Comments explain WHY, not WHAT.**

### ✅ DO:
```typescript
// GOOD: Explains WHY
// Parallel processing is 6x faster for large file sets
if (FEATURE_FLAGS.ENABLE_PARALLEL_FETCHING) {
  return this.fetchMultipleFilesParallel(config, filePaths);
}

// GOOD: Documents complex logic
/**
 * Infer token type from value and path
 * Style Dictionary organizes tokens as category/type/item
 */
private inferType(value: any, path: string[]): string {
  // ...
}
```

### ❌ DON'T:
```typescript
// BAD: Comments state the obvious
// Increment counter
counter++;

// BAD: Commented-out code
// const oldMethod = () => {
//   // old implementation
// }

// BAD: TODO without context
// TODO: Fix this
```

### Action:
- ✅ Use JSDoc for public APIs
- ✅ Explain WHY, not WHAT
- ❌ Remove commented-out code
- ❌ Remove obvious comments
- ✅ TODO comments must have context and assignee

---

## File Organization

### Structure:
```typescript
// 1. Imports (grouped)
import { externalLibrary } from 'library';
import { InternalType } from '../shared/types';

// 2. Interfaces/Types
interface MyConfig {
  // ...
}

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

### File Length:
- ✅ **< 300 lines**: Good
- ⚠️ **300-500 lines**: Consider splitting
- ❌ **> 500 lines**: MUST split

**Current project adherence**: ✅ All files < 500 lines

---

## TypeScript Best Practices

### Type Safety
```typescript
// GOOD: Explicit types
function processToken(token: DesignToken): ProcessedToken {
  return { ...token, processed: true };
}

// BAD: Any types
function processToken(token: any): any {  // ❌ Avoid 'any'
  return token;
}
```

### Null Safety
```typescript
// GOOD: Null checks
const fileName = filePath.split('/').pop() || filePath;

// BAD: Potential null reference
const fileName = filePath.split('/').pop()!;  // ❌ Avoid !
```

### Async/Await
```typescript
// GOOD: Modern async/await
async function fetchData(): Promise<Result> {
  try {
    const data = await fetch(url);
    return Success(data);
  } catch (error) {
    return Failure(error.message);
  }
}

// BAD: Promise chains
function fetchData() {
  return fetch(url)
    .then(data => Success(data))
    .catch(error => Failure(error));  // ❌ Use async/await instead
}
```

---

## Testing Requirements

### Rule:
**Every new feature MUST have tests.**

### Coverage Targets:
- ✅ **Utilities**: 90-100% coverage
- ✅ **Services**: 85-95% coverage
- ✅ **Adapters**: 85-95% coverage
- ✅ **Registries**: 100% coverage

### Test Structure:
```typescript
describe('ClassName', () => {
  describe('methodName()', () => {
    test('should handle normal case', () => {
      // Arrange
      const input = createInput();

      // Act
      const result = method(input);

      // Assert
      expect(result).toBe(expected);
    });

    test('should handle edge case', () => {
      // Test edge cases
    });

    test('should handle error case', () => {
      // Test error handling
    });
  });
});
```

**See**: `TESTING.md` for detailed testing guidelines

---

## Error Handling

### Rule:
**Always handle errors gracefully with proper context.**

### ✅ DO:
```typescript
// GOOD: Proper error handling with context
try {
  const result = await operation();
  return Success(result);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[ServiceName] Operation failed: ${message}`);
  return Failure(message);
}
```

### ❌ DON'T:
```typescript
// BAD: Silent failures
try {
  await operation();
} catch (error) {
  // Silent failure - BAD!
}

// BAD: Generic errors
throw new Error('Error');  // ❌ No context
```

---

## Import Organization

### Order:
```typescript
// 1. External libraries
import { someLib } from 'external-lib';

// 2. Shared types
import { Type1, Type2 } from '../shared/types';

// 3. Core architecture
import { IFileSource } from '../core/interfaces/IFileSource';
import { FileSourceRegistry } from '../core/registries/FileSourceRegistry';

// 4. Services
import { GitHubService } from '../services/githubService';

// 5. Utilities
import { Base64Decoder } from '../utils/Base64Decoder';

// 6. Constants
import { FEATURE_FLAGS } from '../shared/constants';
```

---

## Code Review Checklist

Before committing, verify:

- [ ] No code duplication (DRY)
- [ ] No duplicate CSS (DRY)
- [ ] Proper naming conventions
- [ ] No excessive logging
- [ ] Types are explicit (no 'any')
- [ ] Errors are handled
- [ ] Tests are included
- [ ] Comments explain WHY, not WHAT
- [ ] File length < 300 lines
- [ ] Imports are organized

---

## Formatting

### Use Prettier/ESLint Settings:
- Indent: 2 spaces
- Semicolons: Yes
- Quotes: Single quotes
- Trailing commas: Yes
- Max line length: 100

### Run before commit:
```bash
npm run lint:fix    # Auto-fix linting issues
npm test            # Ensure tests pass
npm run build       # Ensure build succeeds
```

---

**Last Updated**: 2025-01-09
**Mandatory Compliance**: YES
**Current Project Score**: 10/10 ✅

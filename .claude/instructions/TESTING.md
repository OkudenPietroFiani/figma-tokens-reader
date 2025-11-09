# Testing Guidelines - Mandatory Requirements

## ⚠️ CRITICAL: All new code MUST have tests

**Minimum coverage: 85%** | **Target coverage: 90-100%**

---

## Test Coverage Requirements

### By Component Type:

| Component | Minimum Coverage | Target |
|-----------|-----------------|--------|
| **Utilities** | 90% | 100% |
| **Registries** | 95% | 100% |
| **Adapters** | 85% | 95% |
| **Services** | 85% | 90% |
| **Controllers** | 80% | 85% |

### Current Project Status:
- ✅ Total Tests: 172
- ✅ Coverage: 85-100% on new code
- ✅ All tests passing

---

## Test Structure

### AAA Pattern (Arrange-Act-Assert)

```typescript
describe('ClassName', () => {
  describe('methodName()', () => {
    test('should do something specific', () => {
      // Arrange: Set up test data
      const input = createTestInput();

      // Act: Execute the code under test
      const result = methodUnderTest(input);

      // Assert: Verify the result
      expect(result).toBe(expected);
    });
  });
});
```

---

## What to Test

### ✅ MUST Test:

1. **Happy Path** (normal operation)
```typescript
test('should process valid input successfully', () => {
  const validInput = { value: '#ff0000' };
  const result = parseColor(validInput);

  expect(result.success).toBe(true);
  expect(result.data).toEqual({ r: 1, g: 0, b: 0 });
});
```

2. **Edge Cases**
```typescript
test('should handle empty array', () => {
  const result = processItems([]);

  expect(result).toEqual([]);
});

test('should handle null input', () => {
  const result = processValue(null);

  expect(result).toBeNull();
});
```

3. **Error Cases**
```typescript
test('should throw error for invalid input', () => {
  expect(() => parseColor('invalid')).toThrow('Invalid color format');
});

test('should return failure result on error', async () => {
  const result = await fetchWithError();

  expect(result.success).toBe(false);
  expect(result.error).toContain('Failed');
});
```

4. **Boundary Conditions**
```typescript
test('should handle maximum batch size', () => {
  const items = Array(1000).fill(0);
  const result = processBatch(items, { batchSize: 100 });

  expect(result.successCount).toBe(1000);
});
```

5. **Type Inference**
```typescript
test('should infer color from hex value', () => {
  const result = inferType('#ff0000');

  expect(result).toBe('color');
});
```

---

## Testing Utilities

### Example: Base64Decoder Tests
```typescript
describe('Base64Decoder', () => {
  describe('decode()', () => {
    test('should decode simple ASCII text', () => {
      const base64 = 'SGVsbG8gV29ybGQ=';
      const result = Base64Decoder.decode(base64);

      expect(result).toBe('Hello World');
    });

    test('should handle whitespace in base64', () => {
      const base64 = 'SGVs\nbG8g\nV29y\nbGQ=';
      const result = Base64Decoder.decode(base64);

      expect(result).toBe('Hello World');
    });

    test('should throw error for empty string', () => {
      expect(() => Base64Decoder.decode('')).toThrow('Empty base64 string');
    });

    // Test coverage: 19 tests, 100% coverage ✅
  });
});
```

**See**: `src/__tests__/utils/Base64Decoder.test.ts`

---

## Testing Services

### Example: GitHubFileSource Tests
```typescript
describe('GitHubFileSource', () => {
  let mockService: MockGitHubService;
  let fileSource: GitHubFileSource;

  beforeEach(() => {
    mockService = new MockGitHubService();
    fileSource = new GitHubFileSource(mockService);
  });

  describe('fetchFileList()', () => {
    test('should fetch and convert file list successfully', async () => {
      mockService.mockFiles = [
        { path: 'tokens/colors.json', type: 'blob', sha: 'abc123' }
      ];

      const result = await fileSource.fetchFileList(testConfig);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].path).toBe('tokens/colors.json');
    });

    test('should return failure result on error', async () => {
      mockService.shouldThrow = true;

      const result = await fileSource.fetchFileList(testConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  // Test coverage: 20+ tests, 95% coverage ✅
});
```

**See**: `src/__tests__/core/adapters/GitHubFileSource.test.ts`

---

## Testing Parallel Processing

### Example: BatchProcessor Tests
```typescript
describe('BatchProcessor', () => {
  describe('processBatch()', () => {
    test('should process items successfully', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = async (item: number) => item * 2;

      const result = await BatchProcessor.processBatch(items, processor);

      expect(result.successCount).toBe(5);
      expect(result.successes).toEqual([2, 4, 6, 8, 10]);
    });

    test('should isolate errors (one failure does not break all)', async () => {
      const processor = async (item: number) => {
        if (item === 3) throw new Error('Item 3 failed');
        return item * 2;
      };

      const result = await BatchProcessor.processBatch([1, 2, 3, 4, 5], processor);

      expect(result.successCount).toBe(4);
      expect(result.failureCount).toBe(1);
      expect(result.successes).toEqual([2, 4, 8, 10]);
    });

    test('should respect batch size configuration', async () => {
      const items = Array(100).fill(0);

      await BatchProcessor.processBatch(items, async () => {}, {
        batchSize: 10
      });

      // Verify batching behavior
    });

    // Test coverage: 19 tests, 95% coverage ✅
  });
});
```

**See**: `src/__tests__/utils/BatchProcessor.test.ts`

---

## Testing Format Strategies

### Example: W3CTokenFormatStrategy Tests
```typescript
describe('W3CTokenFormatStrategy', () => {
  let strategy: W3CTokenFormatStrategy;

  beforeEach(() => {
    strategy = new W3CTokenFormatStrategy();
  });

  describe('detectFormat()', () => {
    test('should return high score for valid W3C format', () => {
      const w3cData = {
        color: {
          primary: { $value: '#0000ff', $type: 'color' }
        }
      };

      const score = strategy.detectFormat(w3cData);

      expect(score).toBeGreaterThan(0.8);
    });

    test('should return low score for non-W3C format', () => {
      const nonW3C = {
        colors: {
          primary: '#0000ff'  // No $value
        }
      };

      const score = strategy.detectFormat(nonW3C);

      expect(score).toBeLessThan(0.5);
    });
  });

  describe('parseTokens()', () => {
    test('should parse simple W3C tokens', () => {
      const data = {
        color: {
          primary: { $value: '#0000ff', $type: 'color' }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].value).toBe('#0000ff');
    });
  });

  // Test coverage: 31+ tests, 92% coverage ✅
});
```

**See**: `src/__tests__/core/adapters/W3CTokenFormatStrategy.test.ts`

---

## Mocking Guidelines

### Use Mock Classes
```typescript
class MockGitHubService extends GitHubService {
  public mockFiles: any[] = [];
  public shouldThrow: boolean = false;

  async fetchRepositoryFiles(config: GitHubConfig): Promise<any[]> {
    if (this.shouldThrow) throw new Error('Mock error');
    return this.mockFiles;
  }
}

// Use in tests
const mockService = new MockGitHubService();
mockService.mockFiles = [/* test data */];
const result = await mockService.fetchRepositoryFiles(config);
```

### Use Jest Spies for External Dependencies
```typescript
const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' })
});

// Test code that uses fetch

fetchSpy.mockRestore();
```

---

## Performance Testing

### Test Parallel vs Sequential
```typescript
describe('performance characteristics', () => {
  test('parallel should be faster than sequential', async () => {
    const items = Array(20).fill(0);

    // Sequential timing
    const sequentialStart = Date.now();
    for (const item of items) {
      await delay(50);
    }
    const sequentialTime = Date.now() - sequentialStart;

    // Parallel timing
    const parallelStart = Date.now();
    await BatchProcessor.processBatch(
      items,
      async (item) => await delay(50),
      { batchSize: 10 }
    );
    const parallelTime = Date.now() - parallelStart;

    expect(parallelTime).toBeLessThan(sequentialTime * 0.6);
  });
});
```

---

## Testing Registries

### Example: FileSourceRegistry Tests
```typescript
describe('FileSourceRegistry', () => {
  beforeEach(() => {
    FileSourceRegistry.clear();
  });

  afterEach(() => {
    FileSourceRegistry.clear();
  });

  test('should register a new file source', () => {
    const source = new MockFileSource('test');

    FileSourceRegistry.register(source);

    expect(FileSourceRegistry.has('test')).toBe(true);
    expect(FileSourceRegistry.count()).toBe(1);
  });

  test('should throw error when registering duplicate', () => {
    const source1 = new MockFileSource('github');
    const source2 = new MockFileSource('github');

    FileSourceRegistry.register(source1);

    expect(() => FileSourceRegistry.register(source2)).toThrow(
      "File source 'github' is already registered"
    );
  });

  // Test coverage: 34 tests, 100% coverage ✅
});
```

**See**: `src/__tests__/core/registries/FileSourceRegistry.test.ts`

---

## Test Organization

### File Structure:
```
src/
├── __tests__/
│   ├── core/
│   │   ├── adapters/
│   │   │   ├── GitHubFileSource.test.ts
│   │   │   ├── W3CTokenFormatStrategy.test.ts
│   │   │   └── StyleDictionaryFormatStrategy.test.ts
│   │   └── registries/
│   │       ├── FileSourceRegistry.test.ts
│   │       └── TokenFormatRegistry.test.ts
│   └── utils/
│       ├── Base64Decoder.test.ts
│       ├── FileClassifier.test.ts
│       └── BatchProcessor.test.ts
```

### Naming Convention:
- Test file: `ClassName.test.ts`
- Test suite: `describe('ClassName', ...)`
- Test case: `test('should do something', ...)`

---

## Running Tests

### Commands:
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode for development
npm run test:coverage       # Generate coverage report
```

### Coverage Report:
```bash
npm run test:coverage

# View report
open coverage/lcov-report/index.html
```

---

## Pre-Commit Checklist

Before committing code:

- [ ] All tests passing (`npm test`)
- [ ] Coverage meets minimum (85%+)
- [ ] No console errors in test output
- [ ] Tests cover happy path
- [ ] Tests cover edge cases
- [ ] Tests cover error cases
- [ ] Build succeeds (`npm run build`)
- [ ] Linting passes (`npm run lint`)

---

## Writing Good Tests

### ✅ DO:
- Test one thing per test case
- Use descriptive test names
- Arrange-Act-Assert pattern
- Mock external dependencies
- Clean up after tests (beforeEach/afterEach)
- Test edge cases and errors
- Aim for high coverage

### ❌ DON'T:
- Test implementation details
- Write tests that depend on other tests
- Use real external services (mock them)
- Skip error case testing
- Leave commented-out test code
- Write tests without assertions

---

## Test Maintenance

### Keep Tests Updated:
- When refactoring, update tests
- When fixing bugs, add regression tests
- When adding features, add feature tests
- Remove obsolete tests
- Keep test code as clean as production code

---

## Current Test Statistics

| Category | Tests | Coverage |
|----------|-------|----------|
| **Utilities** | 62 | 90-100% |
| **Registries** | 34 | 100% |
| **Adapters** | 76 | 85-95% |
| **Total** | 172 | 85-100% |

**All tests passing**: ✅
**Build status**: ✅
**Ready for production**: ✅

---

**Last Updated**: 2025-01-09
**Mandatory Compliance**: YES
**Minimum Coverage**: 85%
**Target Coverage**: 90-100%

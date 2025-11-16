# Test Fixtures

Test data for validation, conversion, and integration testing.

## Files

### W3C Format Tokens

#### `w3c-primitives.json`
Primitive design tokens in W3C format.

**Contents**:
- **Colors**: Primary (9 shades), Neutral (11 shades from white to black)
- **Dimensions**: Spacing scale (0, 1, 2, 3, 4, 6, 8, 12, 16)
- **Typography Primitives**:
  - Font families: Inter (primary), JetBrains Mono (mono)
  - Font sizes: 12, 14, 16, 20, 24, 32 (in rem)
  - Font weights: regular (400), medium (500), semibold (600), bold (700)
  - Line heights: tight (1.25), normal (1.5), relaxed (1.75)
  - Letter spacing: tight (-0.01em), normal (0em), wide (0.05em)

**Use Cases**:
- Test parsing of W3C format
- Test basic token creation
- Source for semantic token references

---

#### `w3c-semantic.json`
Semantic design tokens that reference primitives.

**Contents**:
- **Colors**: Text colors (primary, secondary, tertiary, inverse), Background colors, Button states, Border colors
- **Typography Styles**:
  - Headings: h1, h2, h3 (with nested references to primitives)
  - Body: default, small, code
- **Shadows**: sm, md, lg (with color references)

**Key Feature**: All composite tokens (typography, shadow) use **nested references** to primitive tokens.

**Use Cases**:
- Test reference resolution
- Test nested reference resolution in composite types
- Test cross-file references (when imported with same project ID)
- **Test YOUR ORIGINAL ISSUE**: Typography/shadow tokens with references

**Known Scenarios**:
- ✅ **WILL WORK** if both files imported with same project ID
- ❌ **WILL FAIL** if files have different project IDs (cross-project refs)

---

#### `tokens-with-issues.json`
Tokens with known validation issues for testing error detection.

**Contents**:

| Token | Issue | Error Code | Expected Behavior |
|-------|-------|-----------|-------------------|
| `color.invalidHex` | Invalid hex value ("not-a-color") | `INVALID_VALUE` | Zod validation fails |
| `color.crossProjectRef` | References token in different project | `CROSS_PROJECT_REFERENCE` | Pre-sync validation detects |
| `typography.missingFontSize` | Missing fontSize property | `MISSING_FONT_SIZE` | Pre-sync validation warns, Figma uses 12px |
| `typography.unresolvedFontSize` | Reference to non-existent token | `UNRESOLVED_REFERENCE` | Pre-sync validation fails |
| `typography.unresolvedFontFamily` | Reference to non-existent token | `UNRESOLVED_REFERENCE` | Pre-sync validation warns |
| `shadow.missingColor` | Shadow without color | `MISSING_SHADOW_COLOR` | Pre-sync validation fails, shadow invisible |
| `shadow.unresolvedColor` | Color reference to non-existent token | `UNRESOLVED_REFERENCE` | Pre-sync validation fails, shadow invisible |
| `circular.a/b/c` | Circular reference (a→b→c→a) | `CIRCULAR_REFERENCE` | Pre-sync validation detects cycle |
| `dimension.invalidUnit` | Invalid unit syntax | `INVALID_VALUE` | Zod validation fails |
| `dimension.negativeValue` | Negative dimension | `INVALID_VALUE` | Zod validation warns (or accepts depending on context) |

**Use Cases**:
- Test Zod validation error messages
- Test pre-sync validation error detection
- Test error fix suggestions
- Verify all validation rules work correctly

---

### Style Dictionary Format (TODO)

Create `style-dictionary-tokens.json` with equivalent content to test format detection and parsing.

---

## Usage Examples

### Basic Import Test
```typescript
import primitivesJson from './fixtures/w3c-primitives.json';
import semanticJson from './fixtures/w3c-semantic.json';

// Parse primitives
const primTokens = formatStrategy.parseTokens(primitivesJson);

// Parse semantic (with references)
const semTokens = formatStrategy.parseTokens(semanticJson);

// Combine with SAME project ID (critical!)
const allTokens = [
  ...primTokens.map(t => ({ ...t, projectId: 'test-project' })),
  ...semTokens.map(t => ({ ...t, projectId: 'test-project' }))
];

// References should resolve ✓
```

### Validation Testing
```typescript
import issuesJson from './fixtures/tokens-with-issues.json';

// Parse tokens with issues
const tokens = formatStrategy.parseTokens(issuesJson);

// Test validation
const validation = await preSyncValidator.validate(tokens);

// Expect errors
expect(validation.errors).toContain(
  expect.objectContaining({ code: 'MISSING_SHADOW_COLOR' })
);
expect(validation.errors).toContain(
  expect.objectContaining({ code: 'CIRCULAR_REFERENCE' })
);
```

### Cross-Project Reference Test
```typescript
// Import with DIFFERENT project IDs (simulate the original issue)
const primTokens = formatStrategy.parseTokens(primitivesJson).map(t => ({
  ...t,
  projectId: 'primitive-project'
}));

const semTokens = formatStrategy.parseTokens(semanticJson).map(t => ({
  ...t,
  projectId: 'semantic-project'  // Different!
}));

repository.add([...primTokens, ...semTokens]);

// Validation should detect cross-project refs
const validation = await preSyncValidator.validate(semTokens);

expect(validation.errors).toContain(
  expect.objectContaining({ code: 'CROSS_PROJECT_REFERENCE' })
);
```

### Typography Sync Test (E2E)
```typescript
// Import with unified project ID
const allTokens = [
  ...primTokens.map(t => ({ ...t, projectId: 'my-ds' })),
  ...semTokens.map(t => ({ ...t, projectId: 'my-ds' }))
];

repository.add(allTokens);
await resolver.resolveAllTokens('my-ds');

// Sync typography
const typTokens = allTokens.filter(t => t.type === 'typography');
await syncService.syncTokens(typTokens);

// Verify TextStyles created correctly
const h1Style = figma.getLocalTextStyles().find(s => s.name === 'typography.heading.h1');
expect(h1Style.fontName.family).toBe('Inter');
expect(h1Style.fontSize).toBe(32); // NOT 12px default!
expect(h1Style.lineHeight.value).toBe(1.25);
```

---

## Adding New Fixtures

When adding new test fixtures:

1. **Name clearly**: Describe what the fixture tests
2. **Document issues**: List known validation errors
3. **Update this README**: Add to the table above
4. **Use in tests**: Reference in integration/contract tests

---

## Notes

- All W3C fixtures use `$value`, `$type`, `$description` format
- All references use `{path.to.token}` syntax
- Primitive tokens have NO references
- Semantic tokens ONLY reference primitives
- Issue tokens are isolated (don't reference valid tokens)

**Critical for Testing Your Issue**:
The `w3c-semantic.json` file reproduces your exact issue:
- Typography tokens reference font size, font family, etc.
- Shadow tokens reference colors
- If project IDs differ → references fail → 12px/AUTO appears
- If project IDs match → references resolve → correct values appear

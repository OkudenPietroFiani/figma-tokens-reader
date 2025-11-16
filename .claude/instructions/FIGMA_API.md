# Figma API Requirements & Integration Guide

## Figma Plugin Constraints

### 1. JavaScript Execution

**CRITICAL**: Figma plugins **cannot load external JavaScript** via `<script src="...">`.

❌ **This will NOT work**:
```html
<script src="ui.js"></script>
```

✅ **This WILL work**:
```html
<script>
  // All JavaScript inlined directly
  console.log('Hello from Figma plugin!');
</script>
```

**Reason**: Figma's plugin sandbox blocks external resources for security.

**Solution**: Build process inlines all JavaScript into HTML.

### 2. Build Process

**Build Flow**:
```
src/frontend/index.ts
  ↓ (esbuild)
ui.js (bundled)
  ↓ (build-ui.js)
ui.html (final with inlined JavaScript)
```

**Commands**:
```bash
npm run build:frontend  # Runs esbuild + inlining
```

---

## Auto-Layout Pattern (CRITICAL)

### The "Hug Content" Pattern

⚠️ **CRITICAL**: When using `counterAxisSizingMode = 'AUTO'`, the timing of `resize()` is crucial.

#### ❌ INCORRECT Pattern

```typescript
// BAD: Resizing BEFORE adding children locks the dimension
const frame = figma.createFrame();
frame.layoutMode = 'HORIZONTAL';
frame.counterAxisSizingMode = 'AUTO';
frame.resize(width, 1); // ⚠️ Locks height at 1px!

frame.appendChild(child); // Height stays 1px
```

#### ✅ CORRECT Pattern

```typescript
// GOOD: Add children FIRST, then resize
const frame = figma.createFrame();
frame.layoutMode = 'HORIZONTAL';
frame.primaryAxisSizingMode = 'FIXED';
frame.counterAxisSizingMode = 'AUTO';

frame.appendChild(child); // Add children first

// Now resize using naturally calculated height
frame.resize(width, frame.height); // ✓ Preserves auto height
```

### Why This Matters

When `counterAxisSizingMode = 'AUTO'`:
- Figma calculates frame height based on children
- Calling `resize()` **before** adding children sets a fixed height that persists
- Even though mode is AUTO, early `resize()` overrides it
- **Solution**: Add children first, then `resize(width, frame.height)`

### Text Width Filling

**Problem**: Text doesn't fill container width, so it won't wrap.

**Solution**: Fixed width text with height auto-resize

```typescript
const text = figma.createText();
text.characters = value;

// Calculate available width (accounting for padding)
const availableWidth = cellWidth - (padding * 2);

// Set text to fill width, only auto-resize height
text.textAutoResize = 'HEIGHT'; // Not 'WIDTH_AND_HEIGHT'!
text.resize(availableWidth, text.height);

cellFrame.appendChild(text);
```

**Result**:
- Text fills full width
- Text wraps to multiple lines when needed
- Cell and row height adapt to text content

---

## Token Sync to Figma

### Token Type Mapping

| Token Type | Figma Object | Notes |
|------------|--------------|-------|
| `color` | Variable (COLOR) | RGB only, no alpha |
| `dimension` | Variable (FLOAT) | Converted to pixels |
| `fontSize` | Variable (FLOAT) | Converted to pixels |
| `spacing` | Variable (FLOAT) | Converted to pixels |
| `number` | Variable (FLOAT) | Direct value |
| `string` | Variable (STRING) | Direct value |
| `boolean` | Variable (BOOLEAN) | Direct value |
| `typography` | **Text Style** | Not a variable! |
| `shadow` | **Effect Style** | Not a variable! |

### Unit Conversion

**Supported Input Units**:
- `px`: No conversion (1px = 1)
- `rem`: Multiply by 16 (standard browser base)
- `em`: Multiply by 16 (standard browser base)
- `%`: Multiply by `percentageBase` (default 16)

**Examples**:
- `0.625rem` → `10px`
- `1.5rem` → `24px`
- `50%` → `8px` (with base 16)

**Implementation**:
```typescript
private convertNumericValue(value: any, percentageBase: number = 16): number {
  // Extract numeric value and unit
  const { numericValue, unit } = this.parseValue(value);

  // Convert based on unit
  if (unit === 'rem' || unit === 'em') {
    return numericValue * 16;
  }
  if (unit === '%') {
    return (numericValue / 100) * percentageBase;
  }
  return numericValue; // px or unitless
}
```

### Color Conversion

**Critical**: Figma COLOR type only accepts RGB (3 properties), NOT RGBA.

✅ **Correct**:
```typescript
const rgb: RGB = { r: 0.91, g: 0.91, b: 0.93 };
variable.setValueForMode(modeId, rgb);
```

❌ **Incorrect**:
```typescript
const rgba: RGBA = { r: 0.91, g: 0.91, b: 0.93, a: 1.0 };
variable.setValueForMode(modeId, rgba); // ERROR!
```

**Color Input Formats**:
1. Hex: `"#E8E9EC"`
2. RGB objects (0-255): `{ r: 232, g: 233, b: 236 }`
3. RGB objects (0-1): `{ r: 0.91, g: 0.91, b: 0.93 }`
4. RGB strings: `"rgb(232, 233, 236)"`
5. HSL with hex fallback: `{ colorSpace: "hsl", hex: "#E8E9EC" }`

**Output**: Always RGB 0-1 range

---

## Nested Reference Resolution (CRITICAL)

### Problem
Typography and shadow tokens can contain **nested references** within their composite values:

```json
{
  "semantic": {
    "typography": {
      "body": {
        "$type": "typography",
        "$value": {
          "fontFamily": "{primitive.typography.font-family.primary}",
          "fontSize": "{primitive.typography.font-size.md}",
          "lineHeight": "{primitive.typography.line-height.normal}"
        }
      }
    }
  }
}
```

### Solution
**Automatic nested reference resolution** before creating styles:

```typescript
// BEFORE resolution
{
  fontFamily: "{primitive.typography.font-family.primary}",
  fontSize: "{primitive.typography.font-size.md}"
}

// AFTER resolution
{
  fontFamily: "Inter",
  fontSize: "16px"
}
```

**Implementation** (uses TokenResolver for robust resolution):
```typescript
private resolveNestedReferences(value: any, projectId: string): any {
  // Use TokenResolver for sophisticated resolution
  // Handles: brace removal, normalization, case-insensitive, fuzzy matching
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    const referencedToken = this.resolver.resolveReference(value, projectId);
    if (referencedToken) {
      const resolvedValue = referencedToken.resolvedValue || referencedToken.value;
      // Recursively resolve in case the resolved value is also a reference
      return this.resolveNestedReferences(resolvedValue, projectId);
    }
    // FAILED - Log diagnostics and return unresolved
    this.logUnresolvedReference(value, projectId);
    return value; // Return as-is if can't resolve
  }
  // ... recursively process objects and arrays
}
```

**Why TokenResolver?**
- Handles different reference formats (dots, slashes, case variations)
- Three-tier caching (exact, normalized, fuzzy)
- Supports chained references (reference to a reference)
- Normalizes `color.primary` and `color/primary` to same token
- Case-insensitive matching
- Fuzzy suffix matching for partial references

**Applied to**:
- Typography tokens (fontFamily, fontSize, fontWeight, lineHeight, letterSpacing)
- Shadow tokens (color, offsetX, offsetY, blur, spread)

### Project ID Scoping (CRITICAL)

**IMPORTANT**: Token resolution is **scoped to project ID**. References can only resolve tokens in the SAME project.

**Common Failure Pattern**:
```typescript
// Typography token in project "default"
{
  projectId: "default",
  value: {
    fontFamily: "{primitive.typography.font-family.primary}"  // ❌ FAILS
  }
}

// Referenced token in project "primitive"
{
  projectId: "primitive",  // ← Different project ID!
  qualifiedName: "primitive.typography.font-family.primary",
  value: "Inter"
}
```

**Why This Fails**:
- `resolver.resolveReference(ref, "default")` only searches project "default"
- Referenced token exists but in project "primitive"
- Result: Reference remains unresolved → Figma uses defaults (12px, AUTO)

**Solutions**:
1. **Import all tokens with same project ID** (recommended)
2. **Future**: Implement cross-project reference resolution

### Diagnostic Logging

The plugin provides comprehensive diagnostics for unresolved references:

**Collapsible Error Groups** (console.group):
```
❌ UNRESOLVED: {primitive.typography.font-size.20}
  🔍 Searching in project: "default" (45 tokens)
  🎯 Looking for: "primitive.typography.font-size.20"

  ⚠️  PROJECT MISMATCH - Token found in different project(s):
    📍 "primitive.typography.font-size.20"
       Project: "primitive" (expected: "default")
       Collection: primitive
       Type: fontSize
       Value: "1.25rem"

    💡 FIX: Ensure all tokens are in the same project ID
```

**Error Types**:
1. **PROJECT MISMATCH**: Token exists but in different project ID
   - Shows actual project ID vs expected
   - Shows token value for verification
2. **NAMING ISSUE**: Similar tokens found (typos detected)
   - Shows partial matches with project IDs
3. **TOKEN NOT FOUND**: Token doesn't exist anywhere
   - Shows available tokens in current project

**Token Validation Summaries**:
```typescript
// Typography validation
const unresolvedRefs = this.findUnresolvedReferences(resolvedValue);
if (unresolvedRefs.length > 0) {
  console.group(`⚠️  TYPOGRAPHY: ${token.qualifiedName}`);
  console.log(`❌ ${unresolvedRefs.length} unresolved reference(s) - will use Figma defaults (12px, AUTO)`);
  // ... show which properties failed
  console.groupEnd();
}

// Shadow validation (highlights missing colors!)
if (unresolvedRefs.length > 0) {
  console.group(`⚠️  SHADOW: ${token.qualifiedName}`);
  unresolvedRefs.forEach(ref => {
    if (ref.includes('color')) {
      console.log(`   ${ref} ⚠️  MISSING COLOR - shadow will be invisible!`);
    }
  });
  console.groupEnd();
}
```

**Benefits**:
- Instant identification of project ID mismatches
- Clear distinction between missing tokens vs wrong project
- Collapsible groups prevent console spam
- Color references in shadows explicitly flagged

---

## Group Token Filtering (CRITICAL)

### Problem
Parent/group tokens were being synced as styles, creating useless hierarchies:

```json
{
  "typography": {
    "$type": "typography",  // ← Group token (no actual values)
    "body": {
      "$type": "typography",
      "$value": { "fontFamily": "Inter", ... }  // ← Leaf token (has values)
    }
  }
}
```

### Solution
**Only sync leaf tokens** with actual typography/shadow properties:

```typescript
private isStyleToken(token: Token): boolean {
  if (token.type === 'typography') {
    const value = token.resolvedValue || token.value;
    if (typeof value === 'object' && value !== null) {
      // Check for LEAF token properties
      const hasTypographyProps =
        'fontFamily' in value ||
        'fontSize' in value ||
        'fontWeight' in value ||
        'lineHeight' in value ||
        'letterSpacing' in value;
      return hasTypographyProps;  // Only true for leaf tokens
    }
  }
  // ... same for shadow tokens
}
```

**Result**:
- ✅ Leaf tokens synced as styles
- ❌ Group tokens skipped

---

## Text Styles (Typography Tokens)

**Font Weight Mapping**:
```typescript
private mapFontWeightToStyle(weight: number | string): string {
  const weightMap = {
    100: 'Thin',
    200: 'ExtraLight',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'SemiBold',
    700: 'Bold',
    800: 'ExtraBold',
    900: 'Black',
  };
  return weightMap[weight] || 'Regular';
}
```

**Font Loading**:
```typescript
// MUST load font asynchronously before setting
await figma.loadFontAsync({
  family: fontFamily,
  style: fontStyle
});

textStyle.fontName = { family: fontFamily, style: fontStyle };
```

**Font Family Handling** (Font Stacks):
```typescript
// Typography tokens may contain CSS font stacks
"fontFamily": "Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"

// SOLUTION: Extract first font from stack
let fontFamily: string;
if (typValue.fontFamily.includes(',')) {
  const fontStack = typValue.fontFamily.split(',').map(f => f.trim());
  fontFamily = fontStack[0];  // Use "Inter" only
}

// Figma only supports single font, not fallback stacks
```

**Font Weight Resolution** (Common Pitfall):
```typescript
// Font weight might be an unresolved reference
const fontWeight = typValue.fontWeight || 400;

if (typeof fontWeight === 'string' && fontWeight.startsWith('{')) {
  // ❌ UNRESOLVED: "{primitive.typography.font-weight.semibold}"
  // Fallback to Regular to prevent errors
  await figma.loadFontAsync({ family: fontFamily, style: 'Regular' });
} else {
  // ✅ Resolved numeric weight
  const fontStyle = this.mapFontWeightToStyle(fontWeight);

  try {
    await figma.loadFontAsync({ family: fontFamily, style: fontStyle });
  } catch (error) {
    // Font style not available (e.g., "SemiBold" vs "Semi Bold")
    // Fallback to "Regular"
    await figma.loadFontAsync({ family: fontFamily, style: 'Regular' });
  }
}
```

**Common Font Loading Errors**:
- `"Inter SemiBold"` fails → Font not installed or wrong style name
- Different fonts use different style names:
  - Some: "SemiBold" (one word)
  - Others: "Semi Bold" (two words)
  - Mapping 600 → "SemiBold" may fail if font uses "Semi Bold"
- **Solution**: Always fallback to "Regular" on load failure

**Line Height** (CRITICAL: Unit handling):
```typescript
// Unitless values → PERCENT (CSS standard)
// 1.3 → { value: 130, unit: 'PERCENT' }
// 1.5 → { value: 150, unit: 'PERCENT' }

// Pixel values → PIXELS
// "24px" → { value: 24, unit: 'PIXELS' }

// Percentage values → PERCENT
// "150%" → { value: 150, unit: 'PERCENT' }

// Rem/em values → PIXELS (converted)
// "1.5rem" → { value: 24, unit: 'PIXELS' }

textStyle.lineHeight = this.convertLineHeight(value);
```

**Letter Spacing**:
```typescript
// Use PIXELS unit
textStyle.letterSpacing = {
  value: letterSpacingInPixels,
  unit: 'PIXELS'
};
```

### Effect Styles (Shadow Tokens)

**Shadow Type Discrimination**:
```typescript
const shadowEffect: DropShadowEffect | InnerShadowEffect = shadowValue.inset
  ? {
      type: 'INNER_SHADOW',
      visible: true,
      color: this.convertColorToRGBA(shadowValue.color), // RGBA!
      offset: { x: offsetX, y: offsetY },
      radius: blur,
      spread: spread,
      blendMode: 'NORMAL',
    }
  : {
      type: 'DROP_SHADOW',
      visible: true,
      color: this.convertColorToRGBA(shadowValue.color),
      offset: { x: offsetX, y: offsetY },
      radius: blur,
      spread: spread,
      blendMode: 'NORMAL',
    };
```

**Critical**: Unlike variables, shadow effects **support RGBA** (alpha channel).

```typescript
private convertColorToRGBA(value: any): RGBA {
  const rgb = this.convertColorValue(value);
  let alpha = 1;

  // Extract alpha from various formats
  if (typeof value === 'object' && value !== null) {
    if ('a' in value) alpha = value.a;
    else if ('alpha' in value) alpha = value.alpha;
  }

  return { ...rgb, a: alpha };
}
```

---

## Async API Methods (CRITICAL FIX)

### Problem: Dynamic Page Access

**Error**:
```
in getLocalTextStyles: Cannot call with documentAccess: dynamic-page.
Use figma.getLocalTextStylesAsync instead.
```

### Solution: Use Async Methods

❌ **Synchronous (fails with dynamic-page)**:
```typescript
const existingStyles = figma.getLocalTextStyles();
const existingEffects = figma.getLocalEffectStyles();
```

✅ **Asynchronous (works with all access modes)**:
```typescript
const existingStyles = await figma.getLocalTextStylesAsync();
const existingEffects = await figma.getLocalEffectStylesAsync();
```

**Rule**: Always use async versions for text and effect styles.

---

## Variable Code Syntax

**Purpose**: Auto-generate code for CSS, Android, iOS

**Format**:
```typescript
variable.setVariableCodeSyntax('WEB', '--color-primary');
variable.setVariableCodeSyntax('ANDROID', '@dimen/color_primary');
variable.setVariableCodeSyntax('iOS', 'color.primary');
```

**Path to Code Syntax**:
```typescript
private pathToCodeSyntax(path: string[], platform: 'WEB' | 'ANDROID' | 'iOS'): string {
  switch (platform) {
    case 'WEB':
      return `--${path.join('-')}`;
    case 'ANDROID':
      return `@dimen/${path.join('_')}`;
    case 'iOS':
      return path.join('.');
  }
}
```

**Examples**:
- Path: `['color', 'primary']`
- WEB: `--color-primary`
- ANDROID: `@dimen/color_primary`
- iOS: `color.primary`

---

## Component Initialization Pattern

### Problem: Constructor Event Binding

❌ **This causes errors**:
```typescript
class BaseComponent {
  constructor(state: AppState) {
    this.state = state;
    this.bindEvents(); // ❌ Child properties not set yet!
  }
}

class ChildComponent extends BaseComponent {
  private bridge: PluginBridge;

  constructor(state: AppState, bridge: PluginBridge) {
    super(state); // Calls bindEvents() before this.bridge is set!
    this.bridge = bridge; // Too late!
  }

  bindEvents() {
    this.bridge.on('event', ...); // ❌ Error: undefined
  }
}
```

### Solution: Two-Phase Initialization

✅ **Use this instead**:
```typescript
class BaseComponent {
  constructor(state: AppState) {
    this.state = state;
    // Don't call bindEvents() here
  }

  init(): void {
    this.bindEvents(); // ✅ Call after all properties set
  }
}

class ChildComponent extends BaseComponent {
  private bridge: PluginBridge;

  constructor(state: AppState, bridge: PluginBridge) {
    super(state);
    this.bridge = bridge; // ✅ Set properties first
  }

  bindEvents() {
    this.bridge.on('event', ...); // ✅ bridge is defined
  }
}

// Usage
const component = new ChildComponent(state, bridge);
component.init(); // ✅ Bind events after construction
```

---

## Common Pitfalls

### 1. Nested References Not Resolved
❌ Typography token with `fontFamily: "{primitive.typography.font-family.primary}"` causes font loading error
✅ Use `resolveNestedReferences()` to resolve all references before creating styles

### 2. Group Tokens Synced as Styles
❌ Parent tokens without actual properties create empty styles
✅ Check for leaf token properties (`fontFamily`, `fontSize`, etc.) before syncing

### 3. Unitless Line Height Interpreted as Pixels
❌ `lineHeight: 1.3` → `{ value: 1.3, unit: 'PIXELS' }` (incorrect!)
✅ `lineHeight: 1.3` → `{ value: 130, unit: 'PERCENT' }` (CSS standard)

### 4. Using `resize()` Too Early
❌ `frame.resize(width, 1)` before `appendChild()`
✅ `appendChild()` first, then `frame.resize(width, frame.height)`

### 5. Wrong Text Auto-Resize Mode
❌ `text.textAutoResize = 'WIDTH_AND_HEIGHT'` (text won't fill width)
✅ `text.textAutoResize = 'HEIGHT'` + `text.resize(width, text.height)`

### 6. Forgetting Both Axis Sizing Modes
❌ Only setting `counterAxisSizingMode = 'AUTO'`
✅ Set both `primaryAxisSizingMode = 'FIXED'` and `counterAxisSizingMode = 'AUTO'`

### 7. Using RGB for Shadows
❌ `color: convertColorValue(value)` returns RGB (no alpha)
✅ `color: convertColorToRGBA(value)` returns RGBA (with alpha)

### 8. Using Synchronous Style APIs
❌ `figma.getLocalTextStyles()` fails with dynamic-page
✅ `await figma.getLocalTextStylesAsync()` works everywhere

---

## Debugging Guide

### Console Logging Patterns

**Color conversions**:
```
[FigmaSyncService] Converting HSL color using hex fallback: #E8E9EC
```

**Unit conversions**:
```
[FigmaSyncService] Converted 0.625rem to 10px
[FigmaSyncService] Converted 50% to 8px (base: 16px)
```

**Nested reference resolution**:
```
[FigmaSyncService] Resolved nested reference {primitive.typography.font-family.primary} → "Inter"
[FigmaSyncService] Resolved nested reference {primitive.typography.font-size.md} → "16px"
```

**Text style creation**:
```
[FigmaSyncService] Processing typography token semantic.typography.body.md: { fontFamily: "Inter", fontSize: "16px", ... }
[FigmaSyncService] Loading font: Inter Regular
[FigmaSyncService] Font size converted: 16px → 16px
[FigmaSyncService] Line height converted: 1.5 → 150%
[FigmaSyncService] Letter spacing converted: 0.02em → 0.32px
[FigmaSyncService] Created text style: typography/heading/h1
[FigmaSyncService] Updated text style: typography/body/regular
```

**Effect style creation**:
```
[FigmaSyncService] Created effect style: shadow/card/default
```

**Errors to watch for**:
```
[FigmaSyncService] Could not convert color value
[FigmaSyncService] Could not load font: Inter Bold
[FigmaSyncService] Failed to create text style: ...
```

### Common Issues

**Issue**: All colors are black
- **Cause**: Unresolved references or HSL without hex fallback
- **Fix**: Ensure resolution step runs AND HSL has hex property

**Issue**: Dimensions show 0.625 instead of 10
- **Cause**: REM/EM not converted to pixels
- **Fix**: Ensure unit conversion runs

**Issue**: Typography tokens create variables instead of text styles
- **Cause**: `createStyles` option disabled
- **Fix**: Ensure `createStyles: true` (default)

**Issue**: Text style has wrong font style (Regular instead of Bold)
- **Cause**: Font style not available in Figma
- **Fix**: Install all font weights

**Issue**: Shadow has no transparency
- **Cause**: Using `convertColorValue()` instead of `convertColorToRGBA()`
- **Fix**: Use RGBA converter for shadows

**Issue**: Font loading error with reference string
- **Cause**: Nested reference not resolved: `fontFamily: "{primitive.typography.font-family.primary}"`
- **Check**: Console for "Could not load font {primitive.typography.font-family.primary}"
- **Fix**: Ensure `resolveNestedReferences()` is called before creating styles

**Issue**: Group tokens creating empty styles
- **Cause**: Parent tokens without actual properties being synced
- **Check**: Verify only leaf tokens with properties are synced
- **Fix**: Use property checks in `isStyleToken()` method

**Issue**: Line height showing as tiny value (1.3px instead of 130%)
- **Cause**: Unitless line height converted to PIXELS instead of PERCENT
- **Check**: Console for "Line height converted: 1.3 → 1.3px"
- **Fix**: Use `convertLineHeight()` which returns PERCENT for unitless values

**Issue**: Font size < 1 validation error
- **Cause**: Invalid unit conversion returning 0 or negative value
- **Check**: Console for "Invalid font size: 0px (must be >= 1)"
- **Fix**: Debug unit conversion, ensure proper rem/em/px handling

---

## Testing Checklist

### Auto-Layout
- [ ] Set `counterAxisSizingMode = 'AUTO'`
- [ ] Set `primaryAxisSizingMode = 'FIXED'`
- [ ] Add all children **before** calling `resize()`
- [ ] Call `resize(fixedDimension, frame.calculatedDimension)`
- [ ] For text: use `textAutoResize = 'HEIGHT'` and set fixed width
- [ ] Verify frames show "Hug contents" in Figma

### Token Sync
- [ ] Colors: verify correct RGB values (not black)
- [ ] Dimensions: verify pixel conversion (10px not 0.625rem)
- [ ] Percentages: verify conversion (50% = 8px with base 16)
- [ ] Typography: verify text styles created (not variables)
- [ ] Shadows: verify effect styles created (not variables)
- [ ] Shadow alpha: verify transparency preserved
- [ ] Code syntax: verify WEB, ANDROID, iOS formats

---

## Figma API Limitations

### Variable Limitations
1. **No Alpha Channel**: COLOR variables don't support transparency
   - Semi-transparent colors sync as fully opaque
   - **Workaround**: Use shadow effects (they support alpha)

2. **Fixed Unit Base**: REM/EM use 16px base by default
   - **Workaround**: Configurable via `percentageBase` option

### Style Limitations
1. **Font Must Exist**: Text styles require font to be installed
   - If font missing, creation fails
   - **Workaround**: Install fonts before syncing

2. **Async Required**: Text/effect style APIs require async versions
   - Synchronous APIs fail with dynamic-page access
   - **Always use**: `getLocalTextStylesAsync()`, `getLocalEffectStylesAsync()`

---

## References

- [Figma Plugin API Documentation](https://www.figma.com/plugin-docs/)
- [Creating UI in Figma Plugins](https://www.figma.com/plugin-docs/creating-ui/)
- [FrameNode.counterAxisSizingMode](https://www.figma.com/plugin-docs/api/properties/nodes-counteraxissizingmode/)
- [TextNode.textAutoResize](https://www.figma.com/plugin-docs/api/properties/nodes-textautoresize/)
- [Variable API](https://www.figma.com/plugin-docs/api/Variable/)

---

**Version**: 1.0
**Last Updated**: 2025-11-15
**Status**: Production Ready ✅

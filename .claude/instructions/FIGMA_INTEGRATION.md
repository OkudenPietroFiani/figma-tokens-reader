# Figma Integration Guide

Complete guide to Figma-specific requirements, constraints, and best practices.

---

## Plugin Requirements

### JavaScript Execution

#### ❌ External Script Loading NOT Supported

Figma plugins **cannot load external JavaScript** via `<script src="...">`.

**This will NOT work**:
```html
<script src="ui.js"></script>
```

**Why**: Figma's plugin sandbox blocks external resources for security.

#### ✅ Inline JavaScript Required

All JavaScript must be **inlined directly** in HTML.

**This WILL work**:
```html
<script>
  // All your JavaScript code here, inlined
  console.log('Hello from Figma plugin!');
</script>
```

---

### Build Process

Our solution:
1. **Bundle** frontend TypeScript → `ui.js`
2. **Inline** bundled JavaScript into HTML template
3. **Generate** final `ui.html` with embedded JavaScript

**Build Flow**:
```
src/frontend/index.ts
  ↓ (esbuild)
ui.js (bundled)
  ↓ (build-ui.js)
ui-template.html + ui.js
  ↓
ui.html (final, with inlined JavaScript)
```

**Build Scripts**:
```bash
npm run build:frontend
# Runs: esbuild + node build-ui.js
```

---

## Auto-Layout Principles

### The "Hug Content" Pattern

⚠️ **CRITICAL**: When using `counterAxisSizingMode = 'AUTO'` (hug contents), the timing of `resize()` is crucial.

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

---

### Why This Matters

When `counterAxisSizingMode = 'AUTO'`:
- Figma calculates frame height based on children
- Calling `resize()` **before** adding children sets a fixed height that persists
- Even though mode is AUTO, early `resize()` overrides it
- **Solution**: Add children first, then `resize(width, frame.height)`

---

### Application: Visualization Containers

All visualizers follow this pattern:

```typescript
renderVisualization(token: TokenMetadata, width: number, height: number): FrameNode {
  const container = figma.createFrame();
  container.layoutMode = 'HORIZONTAL';
  container.primaryAxisSizingMode = 'FIXED';
  container.counterAxisSizingMode = 'AUTO'; // Hug contents

  // Add padding and children
  container.paddingLeft = padding;
  container.paddingRight = padding;
  container.appendChild(visualElement);

  // Resize AFTER adding children
  container.resize(width, container.height);

  return container;
}
```

**Applies to**:
- DefaultVisualizer
- ColorVisualizer
- BorderRadiusVisualizer
- SpacingVisualizer
- FontSizeVisualizer
- FontWeightVisualizer

---

### Application: Cell Frames

```typescript
private createTextCell(value: string, width: number): FrameNode {
  const cellFrame = figma.createFrame();
  cellFrame.layoutMode = 'HORIZONTAL';
  cellFrame.primaryAxisSizingMode = 'FIXED';
  cellFrame.counterAxisSizingMode = 'AUTO';

  cellFrame.paddingLeft = padding;
  cellFrame.paddingRight = padding;

  const text = figma.createText();
  text.characters = value;
  cellFrame.appendChild(text);

  // Resize AFTER adding children
  cellFrame.resize(width, cellFrame.height);

  return cellFrame;
}
```

**Applies to**:
- `createHeaderCell()`
- `createTextCell()`
- `createVisualizationCell()`

---

### Application: Row Frames

```typescript
private createHeaderRow(...): FrameNode {
  const rowFrame = figma.createFrame();
  rowFrame.layoutMode = 'HORIZONTAL';
  rowFrame.primaryAxisSizingMode = 'FIXED';
  rowFrame.counterAxisSizingMode = 'AUTO';

  // Add all cells
  for (const column of columns) {
    const cell = this.createHeaderCell(column.label, width);
    rowFrame.appendChild(cell);
  }

  // Resize AFTER adding all cells
  rowFrame.resize(tableWidth, rowFrame.height);

  return rowFrame;
}
```

**Applies to**:
- `createHeaderRow()`
- `createDataRow()`

---

### Text Width Filling

#### Problem

Text doesn't fill container width, so it won't wrap.

#### Solution

Fixed width text with height auto-resize:

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

### Common Pitfalls

#### 1. Using `resize()` Too Early
❌ `frame.resize(width, 1)` before `appendChild()`
✅ `appendChild()` first, then `frame.resize(width, frame.height)`

#### 2. Wrong Text Auto-Resize Mode
❌ `text.textAutoResize = 'WIDTH_AND_HEIGHT'` (text won't fill width)
✅ `text.textAutoResize = 'HEIGHT'` + `text.resize(width, text.height)`

#### 3. Forgetting Both Axis Sizing Modes
❌ Only setting `counterAxisSizingMode = 'AUTO'`
✅ Set both `primaryAxisSizingMode = 'FIXED'` and `counterAxisSizingMode = 'AUTO'`

---

### Hierarchy of Hug Content

Pattern cascades from bottom to top:

1. **Visualization Elements** → hug content (colored squares, text)
2. **Visualization Containers** → hug visualization elements
3. **Cells** → hug containers/text
4. **Rows** → hug all cells
5. **Table** → hug all rows

Each level: **Add children first, then resize**.

---

## Component Initialization

### ❌ Constructor Event Binding Issue

**This causes errors**:
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

### ✅ Two-Phase Initialization Pattern

**Use this instead**:
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

## Plugin Structure

### Required Files

1. **manifest.json** - Plugin metadata
2. **code.js** - Backend (runs in Figma sandbox)
3. **ui.html** - Frontend UI (runs in iframe)

### File Size

- **ui.html** with inlined JS: ~123KB (acceptable)
- **code.js** backend bundle: ~165KB (acceptable)
- Well within Figma limits

---

## CSS Requirements

### Inline Styles Recommended

Inline all CSS in HTML to avoid loading issues:

```html
<head>
  <style>
    /* All CSS inlined here */
    body { font-family: sans-serif; }
  </style>
</head>
```

---

## Common Issues & Solutions

### 1. Blank Screen / UI Not Rendering

**Symptoms**: Plugin opens but shows nothing

**Cause**: External JavaScript not executing

**Solution**: Inline all JavaScript in ui.html

### 2. "Cannot read properties of undefined"

**Symptoms**: Error during component initialization

**Cause**: BaseComponent constructor calls methods before child properties set

**Solution**: Use two-phase initialization (constructor + init())

### 3. Module Import Errors

**Symptoms**: "Cannot use import statement outside a module"

**Cause**: Not bundling code, trying to use ES modules directly

**Solution**: Use esbuild to create single JavaScript file

---

## Development Workflow

### Recommended Process

1. Write code in TypeScript with proper modules
2. Bundle using esbuild
3. Inline frontend bundle into HTML
4. Test in Figma by reloading plugin
5. Debug using Chrome DevTools

### Debugging Tips

- **Frontend console**: Right-click plugin UI → Inspect → Console
- **Backend console**: Figma Desktop → Help → Toggle Developer Tools
- **Two contexts**: Frontend (iframe) and Backend (sandbox) have separate consoles

---

## Testing Checklist

When implementing auto-layout frames:

- [ ] Set `counterAxisSizingMode = 'AUTO'` for hugging dimension
- [ ] Set `primaryAxisSizingMode = 'FIXED'` for fixed dimension
- [ ] Add all children **before** calling `resize()`
- [ ] Call `resize(fixedDimension, frame.calculatedDimension)`
- [ ] For wrapping text: use `textAutoResize = 'HEIGHT'` and set fixed width
- [ ] Verify in Figma that frames show "Hug contents", not fixed height

---

## Best Practices

1. ✅ **Always inline JavaScript** in ui.html
2. ✅ **Use two-phase initialization** for components
3. ✅ **Bundle all code** into single files
4. ✅ **Test after every change** - reload plugin in Figma
5. ✅ **Keep builds automated** - use npm scripts
6. ✅ **Follow hug content pattern** for dynamic layouts

---

## References

- [Figma Plugin API Documentation](https://www.figma.com/plugin-docs/)
- [Creating UI in Figma Plugins](https://www.figma.com/plugin-docs/creating-ui/)
- [Plugin Manifest Reference](https://www.figma.com/plugin-docs/manifest/)
- [FrameNode.counterAxisSizingMode](https://www.figma.com/plugin-docs/api/properties/nodes-counteraxissizingmode/)
- [TextNode.textAutoResize](https://www.figma.com/plugin-docs/api/properties/nodes-textautoresize/)

---

## Token Sync to Figma Variables

### Overview

The plugin syncs design tokens to Figma with full type preservation, reference resolution, and unit conversion. Tokens are converted to the appropriate Figma object type based on their token type:

- **Variables**: Color, dimension, number, string, boolean tokens
- **Text Styles**: Typography tokens (fontFamily, fontSize, fontWeight, lineHeight, letterSpacing)
- **Effect Styles**: Shadow tokens (offsetX, offsetY, blur, spread, color, inset)

### Feature Summary

| Token Type | Figma Type | Supported Properties | Unit Conversion |
|------------|------------|---------------------|-----------------|
| `color` | Variable (COLOR) | Hex, RGB, HSL (with hex), RGBA (alpha ignored) | N/A |
| `dimension` | Variable (FLOAT) | px, rem, em, % | rem/em × 16, % × base |
| `fontSize` | Variable (FLOAT) | px, rem, em, % | rem/em × 16, % × base |
| `spacing` | Variable (FLOAT) | px, rem, em, % | rem/em × 16, % × base |
| `number` | Variable (FLOAT) | Any number | N/A |
| `string` | Variable (STRING) | Any string | N/A |
| `boolean` | Variable (BOOLEAN) | true, false | N/A |
| `typography` | Text Style | fontFamily, fontSize, fontWeight, lineHeight, letterSpacing | All units converted |
| `shadow` | Effect Style | offsetX, offsetY, blur, spread, color (RGBA), inset | All units converted |

**Key Features:**
- ✅ Automatic unit conversion (rem, em, % → pixels)
- ✅ Token reference resolution (aliases and embedded references)
- ✅ Code syntax generation (CSS, Android, iOS)
- ✅ Multiple collections (primitive, semantic, custom)
- ✅ Font weight mapping (100-900 → Thin/Regular/Bold/etc.)
- ✅ Shadow alpha channel support (RGBA)
- ✅ Configurable percentage base
- ✅ Update existing styles/variables

---

### Supported Token Formats

#### Color Tokens

**Input Formats**:
1. **Hex strings**: `"#ff8800"`, `"#f80"` (3-digit), `"#ff8800ff"` (8-digit with alpha)
2. **RGB objects (0-255)**: `{ r: 255, g: 128, b: 0 }`
3. **RGB objects (0-1)**: `{ r: 1.0, g: 0.5, b: 0.0 }`
4. **RGB strings**: `"rgb(255, 128, 0)"`, `"rgba(255, 128, 0, 0.5)"`
5. **HSL with hex fallback**: `{ colorSpace: "hsl", components: [225, 16, 92], alpha: 1, hex: "#E8E9EC" }`
6. **RGB colorSpace**: `{ colorSpace: "rgb", components: [255, 128, 0] }`
7. **W3C components**: `{ components: [255, 128, 0], alpha: 1 }`

**Output Format**: Figma RGB `{ r: 0-1, g: 0-1, b: 0-1 }`

**Important**:
- Figma COLOR type only accepts RGB (3 properties), NOT RGBA with 'a' property
- Alpha channels are ignored (Figma limitation)
- HSL colors use hex fallback for accurate conversion

---

#### Numeric/Dimension Tokens

**Input Formats**:
1. **Direct numbers**: `16`
2. **Strings with px**: `"32px"`
3. **Strings with rem**: `"2.5rem"` → converted to **40px** (× 16)
4. **Strings with em**: `"1.5em"` → converted to **24px** (× 16)
5. **DimensionValue objects with px**: `{ value: 16, unit: "px" }`
6. **DimensionValue objects with rem**: `{ value: 0.625, unit: "rem" }` → converted to **10px**
7. **DimensionValue objects with em**: `{ value: 1.5, unit: "em" }` → converted to **24px**

**Output Format**: Number (pixels)

**Unit Conversion**:
- **px**: No conversion (1px = 1)
- **rem**: Multiply by 16 (standard browser base)
- **em**: Multiply by 16 (standard browser base)

**Examples**:
- `0.625rem` → `10px`
- `0.75rem` → `12px`
- `1rem` → `16px`
- `1.5rem` → `24px`
- `2.5rem` → `40px`

---

#### String Tokens

**Input**: Any string value

**Output**: String (unchanged)

**Examples**:
- Font families: `"Inter"`, `["Inter", "system-ui", "sans-serif"]`
- CSS values: `"bold"`, `"italic"`

---

#### Boolean Tokens

**Input**: `true`, `false`

**Output**: Boolean (unchanged)

---

#### Typography Tokens

**Input Formats** (composite object):
```json
{
  "$type": "typography",
  "$value": {
    "fontFamily": "Inter" | ["Inter", "system-ui"],
    "fontSize": "1rem" | "16px" | "100%",
    "fontWeight": 400 | "700",
    "lineHeight": "1.5rem" | "24px" | "150%",
    "letterSpacing": "0.02em" | "0.32px"
  }
}
```

**Output Format**: Figma Text Style

**Font Weight Mapping**:
- 100 → Thin
- 200 → ExtraLight
- 300 → Light
- 400 → Regular (default)
- 500 → Medium
- 600 → SemiBold
- 700 → Bold
- 800 → ExtraBold
- 900 → Black

**Unit Conversion**:
- `fontSize`, `lineHeight`, `letterSpacing`: rem/em/% → pixels
- Line height: PIXELS unit (not AUTO or PERCENT)
- Letter spacing: PIXELS unit

**Examples**:
```json
{
  "heading/h1": {
    "$type": "typography",
    "$value": {
      "fontFamily": "Inter",
      "fontSize": "2.5rem",     // → 40px
      "fontWeight": 700,          // → Bold
      "lineHeight": "3rem",       // → 48px (PIXELS)
      "letterSpacing": "0.02em"   // → 0.32px (PIXELS, 0.02 × 16)
    }
  }
}
```

**Important**:
- Font must be available in Figma (plugin loads font asynchronously)
- Font style must exist (e.g., Inter Bold must be installed)
- If font loading fails, text style creation is skipped with warning

---

#### Shadow Tokens

**Input Formats** (composite object):
```json
{
  "$type": "shadow",
  "$value": {
    "offsetX": "0px" | "0.5rem" | "50%",
    "offsetY": "4px" | "1rem" | "100%",
    "blur": "8px" | "2rem",
    "spread": "0px" | "0.5rem" (optional),
    "color": "#000000" | "rgba(0,0,0,0.1)" | { r, g, b, a },
    "inset": true | false (optional, default: false)
  }
}
```

**Output Format**: Figma Effect Style (DROP_SHADOW or INNER_SHADOW)

**Shadow Type**:
- `inset: false` or undefined → DROP_SHADOW
- `inset: true` → INNER_SHADOW

**Unit Conversion**:
- `offsetX`, `offsetY`, `blur`, `spread`: rem/em/% → pixels
- All numeric values converted to absolute pixels

**Color Format**: RGBA (alpha channel supported, unlike variables)

**Examples**:
```json
{
  "shadow/card/default": {
    "$type": "shadow",
    "$value": {
      "offsetX": "0px",
      "offsetY": "4px",
      "blur": "8px",
      "spread": "0px",
      "color": "rgba(0, 0, 0, 0.1)"  // Alpha preserved!
    }
  },
  "shadow/card/hover": {
    "$type": "shadow",
    "$value": {
      "offsetX": "0px",
      "offsetY": "8px",
      "blur": "16px",
      "spread": "0px",
      "color": "rgba(0, 0, 0, 0.15)",
      "inset": false                  // DROP_SHADOW
    }
  },
  "shadow/inset": {
    "$type": "shadow",
    "$value": {
      "offsetX": "0px",
      "offsetY": "2px",
      "blur": "4px",
      "color": "rgba(0, 0, 0, 0.1)",
      "inset": true                   // INNER_SHADOW
    }
  }
}
```

**Important**:
- Alpha channel IS supported for shadows (unlike variable colors)
- Shadow color can use any color format (hex, rgb, rgba, object)
- All dimension values support unit conversion

---

### Token Reference Resolution

**Critical Requirement**: Token resolution **MUST** happen before Figma sync.

#### Resolution Flow

```typescript
// 1. Import and process tokens
const tokens = await processor.processTokenData(data);

// 2. Add to repository
repository.add(tokens);

// 3. CRITICAL: Resolve all aliases and references
const resolveResult = await resolver.resolveAllTokens('default');

// 4. Update tokens with resolved values
for (const [tokenId, resolvedValue] of resolvedValues.entries()) {
  repository.update(tokenId, { resolvedValue });
}

// 5. Sync to Figma (uses resolvedValue)
await figmaSyncService.syncTokens(tokens);
```

#### Reference Formats

**Alias tokens** (entire value is reference):
```json
{
  "$type": "color",
  "$value": "{primitive.color.primary.600}"
}
```

**Embedded references** (references within values):
```json
{
  "$type": "color",
  "$value": {
    "colorSpace": "hsl",
    "components": "{primitive.color.neutral.700}",
    "alpha": "{primitive.color.transparency.25}"
  }
}
```

**Resolution Requirement**: Both formats must be resolved to actual values before sync.

---

### Figma Variable Creation

#### Variable Types

**Mapping**: TokenType → Figma VariableResolvedDataType

```typescript
{
  color: 'COLOR',
  number: 'FLOAT',
  boolean: 'BOOLEAN',
  string: 'STRING',
  dimension: 'FLOAT',
  fontSize: 'FLOAT',
  spacing: 'FLOAT',
  lineHeight: 'FLOAT',
  letterSpacing: 'FLOAT',
  fontWeight: 'FLOAT',
}
```

#### Variable Collections

**Organization**:
- Tokens grouped by `collection` property
- Collections: `primitive`, `semantic`, custom names
- Dynamic collection creation (no hardcoding)

#### Code Syntax

**Generated for all variables**:
- **WEB**: `--color-primary` (CSS custom properties)
- **ANDROID**: `@dimen/color_primary` (Android resources)
- **iOS**: `color.primary` (iOS tokens)

**Format**: Uses Figma's `setVariableCodeSyntax()` API

---

### Sync Configuration Options

The `FigmaSyncService.syncTokens()` method accepts an optional `SyncOptions` parameter to control sync behavior:

```typescript
interface SyncOptions {
  updateExisting?: boolean;    // Update existing variables/styles (default: true)
  preserveScopes?: boolean;    // Preserve existing variable scopes (default: true)
  createStyles?: boolean;      // Create text/effect styles from typography/shadow tokens (default: true)
  percentageBase?: number;     // Base size for percentage calculations in pixels (default: 16)
}
```

**Option Details:**

| Option | Default | Description | Impact |
|--------|---------|-------------|--------|
| `updateExisting` | `true` | Update existing variables and styles | If `false`, existing items are skipped (not updated) |
| `preserveScopes` | `true` | Keep existing variable scope assignments | If `false`, scopes might be reset (use Scopes tab instead) |
| `createStyles` | `true` | Create Text Styles and Effect Styles | If `false`, typography/shadow tokens are skipped |
| `percentageBase` | `16` | Base size for % unit conversion (pixels) | Used for all percentage calculations across all token types |

**Usage Examples:**

```typescript
// Default behavior (all features enabled)
await figmaSyncService.syncTokens(tokens);

// Disable style creation (only sync variables)
await figmaSyncService.syncTokens(tokens, {
  createStyles: false
});

// Custom percentage base (20px instead of 16px)
await figmaSyncService.syncTokens(tokens, {
  percentageBase: 20  // 50% = 10px instead of 8px
});

// Skip updates (only create new items)
await figmaSyncService.syncTokens(tokens, {
  updateExisting: false
});

// Combination of options
await figmaSyncService.syncTokens(tokens, {
  updateExisting: true,
  createStyles: true,
  percentageBase: 18
});
```

---

### Acceptance Criteria

#### ✅ Color Sync Acceptance

**Test Case 1: Hex Colors**
```
Given: Token with value "#E8E9EC"
When: Synced to Figma
Then: Variable shows RGB(232, 233, 236) = { r: 0.910, g: 0.914, b: 0.925 }
```

**Test Case 2: HSL Colors**
```
Given: Token with { colorSpace: "hsl", components: [225, 16, 92], hex: "#E8E9EC" }
When: Synced to Figma
Then: Variable shows RGB from hex fallback, NOT black
```

**Test Case 3: Token References**
```
Given: Semantic token "{primitive.color.primary.600}"
When: Resolved and synced
Then: Variable shows resolved color, NOT "{primitive.color.primary.600}" string
```

**Fail Condition**: Variable shows black (#000000) or gray (#808080) → indicates unresolved reference or unsupported format

---

#### ✅ Dimension Sync Acceptance

**Test Case 1: Direct Pixels**
```
Given: Token with value { value: 16, unit: "px" }
When: Synced to Figma
Then: Variable shows 16
```

**Test Case 2: REM to Pixels**
```
Given: Token with value { value: 0.625, unit: "rem" }
When: Synced to Figma
Then: Variable shows 10 (0.625 × 16)
```

**Test Case 3: Font Size REM**
```
Given: Font-size token with 0.625rem
When: Synced to Figma
Then: Variable shows 10px, NOT 0.625
```

**Fail Condition**: Variable shows fractional rem value (0.625, 0.75, etc.) instead of pixel equivalent

---

#### ✅ Type Matching Acceptance

**Test Case 1: Color Type**
```
Given: Token with type "color"
When: Synced to Figma
Then: Figma variable type = COLOR
```

**Test Case 2: Dimension Types**
```
Given: Token with type "fontSize" | "spacing" | "dimension"
When: Synced to Figma
Then: Figma variable type = FLOAT
```

**Test Case 3: String Type**
```
Given: Token with type "fontFamily" | "string"
When: Synced to Figma
Then: Figma variable type = STRING
```

**Fail Condition**: Type mismatch (e.g., color token creates FLOAT variable)

---

#### ✅ Code Syntax Acceptance

**Test Case 1: Simple Path**
```
Given: Token with path ["color", "primary"]
When: Synced to Figma
Then: Variable has code syntax:
  - WEB: --color-primary
  - ANDROID: @dimen/color_primary
  - iOS: color.primary
```

**Test Case 2: Nested Path**
```
Given: Token with path ["color", "background", "primary", "default"]
When: Synced to Figma
Then: Variable has code syntax:
  - WEB: --color-background-primary-default
  - ANDROID: @dimen/color_background_primary_default
  - iOS: color.background.primary.default
```

**Fail Condition**: Code syntax missing or incorrect format

---

#### ✅ Reference Resolution Acceptance

**Test Case 1: Single-Level Alias**
```
Given: semantic.color.text = "{primitive.color.neutral.900}"
When: Resolved and synced
Then: Variable value = primitive.color.neutral.900's value
```

**Test Case 2: Multi-Level Alias**
```
Given: alias1 → alias2 → primitive value
When: Resolved and synced
Then: All aliases resolve to primitive value
```

**Test Case 3: Cross-Collection Reference**
```
Given: Semantic token referencing primitive token
When: Resolved and synced
Then: Both collections exist, semantic uses primitive value
```

**Fail Condition**: Variable shows "{...}" reference string instead of resolved value

---

#### ✅ Collection Organization Acceptance

**Test Case 1: Primitive Collection**
```
Given: Tokens with collection = "primitive"
When: Synced to Figma
Then: Variables appear in "primitive" collection
```

**Test Case 2: Semantic Collection**
```
Given: Tokens with collection = "semantic"
When: Synced to Figma
Then: Variables appear in "semantic" collection
```

**Test Case 3: Multiple Collections**
```
Given: Tokens with different collection values
When: Synced to Figma
Then: Each collection created separately, no mixing
```

**Fail Condition**: All tokens in single collection or collection names incorrect

---

#### ✅ Typography Style Sync Acceptance

**Test Case 1: Basic Typography Token**
```
Given: Token with type "typography" and value:
  {
    fontFamily: "Inter",
    fontSize: "1rem",
    fontWeight: 400
  }
When: Synced to Figma with createStyles=true
Then: Text Style created with:
  - Name: token path joined with "/"
  - Font: Inter Regular
  - Size: 16px (not 1rem)
```

**Test Case 2: Font Weight Mapping**
```
Given: Typography token with fontWeight: 700
When: Synced to Figma
Then: Text Style uses "Bold" font style (not "Regular")
```

**Test Case 3: Full Typography Properties**
```
Given: Typography token with:
  {
    fontFamily: "Inter",
    fontSize: "2.5rem",
    fontWeight: 600,
    lineHeight: "3rem",
    letterSpacing: "0.02em"
  }
When: Synced to Figma
Then: Text Style has:
  - Font: Inter SemiBold
  - Size: 40px
  - Line height: 48px (PIXELS unit)
  - Letter spacing: 0.32px (PIXELS unit)
```

**Test Case 4: Typography with Percentage Units**
```
Given: Typography token with fontSize: "150%"
When: Synced with percentageBase=16
Then: Text Style has fontSize: 24px (150% of 16px)
```

**Test Case 5: Update Existing Text Style**
```
Given: Existing text style "heading/h1"
  And: Typography token "heading/h1" with updated fontSize
When: Synced with updateExisting=true
Then: Existing text style is updated (not duplicated)
```

**Fail Condition**: Typography token creates variable instead of text style, or text style missing properties

---

#### ✅ Shadow Effect Style Sync Acceptance

**Test Case 1: Basic Drop Shadow**
```
Given: Token with type "shadow" and value:
  {
    offsetX: "0px",
    offsetY: "4px",
    blur: "8px",
    spread: "0px",
    color: "#000000"
  }
When: Synced to Figma with createStyles=true
Then: Effect Style created with:
  - Name: token path joined with "/"
  - Type: DROP_SHADOW
  - Offset: {x: 0, y: 4}
  - Radius: 8
  - Spread: 0
  - Color: {r: 0, g: 0, b: 0, a: 1}
```

**Test Case 2: Inner Shadow**
```
Given: Shadow token with inset: true
When: Synced to Figma
Then: Effect Style has type: INNER_SHADOW (not DROP_SHADOW)
```

**Test Case 3: Shadow with Alpha Color**
```
Given: Shadow token with color: "rgba(0, 0, 0, 0.1)"
When: Synced to Figma
Then: Effect Style color has alpha: 0.1 (not 1.0)
  - Note: Shadows support alpha, unlike variables
```

**Test Case 4: Shadow with Unit Conversion**
```
Given: Shadow token with:
  {
    offsetX: "0.5rem",
    offsetY: "1rem",
    blur: "2rem",
    spread: "50%"
  }
When: Synced with percentageBase=16
Then: Effect Style has:
  - Offset: {x: 8, y: 16} (rem converted)
  - Radius: 32 (rem converted)
  - Spread: 8 (50% of 16px)
```

**Test Case 5: Update Existing Effect Style**
```
Given: Existing effect style "shadow/card"
  And: Shadow token "shadow/card" with updated blur
When: Synced with updateExisting=true
Then: Existing effect style is updated (not duplicated)
```

**Fail Condition**: Shadow token creates variable instead of effect style, or effect style has wrong shadow type (inner/drop)

---

#### ✅ Percentage Unit Conversion Acceptance

**Test Case 1: Basic Percentage Conversion**
```
Given: Dimension token with value "50%"
When: Synced with percentageBase=16 (default)
Then: Variable shows 8 (50% of 16px)
```

**Test Case 2: Custom Percentage Base**
```
Given: Dimension token with value "50%"
When: Synced with percentageBase=20
Then: Variable shows 10 (50% of 20px)
```

**Test Case 3: Percentage in DimensionValue Object**
```
Given: Token with value { value: 75, unit: "%" }
When: Synced with percentageBase=16
Then: Variable shows 12 (75% of 16px)
```

**Test Case 4: Percentage in Typography**
```
Given: Typography token with fontSize: "125%"
When: Synced with percentageBase=16
Then: Text Style has fontSize: 20px (125% of 16px)
```

**Test Case 5: Percentage in Shadow**
```
Given: Shadow token with blur: "200%"
When: Synced with percentageBase=16
Then: Effect Style has radius: 32px (200% of 16px)
```

**Fail Condition**: Percentage values show as 0 or show the raw percentage value (e.g., 50 instead of 8)

---

#### ✅ Style Creation Configuration Acceptance

**Test Case 1: Disable Style Creation**
```
Given: Typography and shadow tokens
When: Synced with createStyles=false
Then: Typography and shadow tokens are skipped
  And: Only color/dimension/string tokens create variables
```

**Test Case 2: Skip Updates on Existing Styles**
```
Given: Existing text style "heading/h1"
  And: Typography token "heading/h1" with different fontSize
When: Synced with updateExisting=false
Then: Existing text style is NOT updated (remains unchanged)
  And: Stats show token as "skipped"
```

**Test Case 3: Mixed Token Types**
```
Given: 10 color tokens, 5 typography tokens, 3 shadow tokens
When: Synced with createStyles=true
Then:
  - 10 variables created (colors)
  - 5 text styles created (typography)
  - 3 effect styles created (shadows)
  - Stats: {added: 18, updated: 0, skipped: 0}
```

**Fail Condition**: Style configuration options don't affect behavior, or wrong token types create wrong Figma objects

---

### Known Limitations

#### Color Limitations

1. **No Alpha Channel**: Figma COLOR type doesn't support RGBA
   - Alpha values are silently ignored
   - Semi-transparent colors sync as fully opaque

2. **HSL Requires Hex**: HSL colors must include hex fallback
   - Without hex, falls back to black
   - Pure HSL calculation not implemented

#### Dimension Limitations

1. **Fixed Base Size**: REM/EM use 16px base
   - Configurable via `percentageBase` option (default: 16px)
   - Assumes standard browser default

2. **Percentage Supported**: Values like "50%" are converted using `percentageBase`
   - Default: "50%" with 16px base = 8px
   - Configurable via sync options

#### Reference Limitations

1. **Circular References**: Detected but may cause partial resolution
   - Tokens involved in cycle use unresolved values
   - Warning logged in console

2. **Missing Targets**: References to non-existent tokens
   - Falls back to raw value
   - Warning logged in console

#### Style Token Support ✅

1. **Typography Tokens**: ✅ **Now Supported**
   - Synced as Figma Text Styles (not variables)
   - Supports: fontFamily, fontSize, fontWeight, lineHeight, letterSpacing
   - Automatically maps font weights to Figma font styles
   - Console logging: `Created text style: ...` or `Updated text style: ...`

2. **Shadow Tokens**: ✅ **Now Supported**
   - Synced as Figma Effect Styles (not variables)
   - Supports: offsetX, offsetY, blur, spread, color, inset
   - Creates DROP_SHADOW or INNER_SHADOW based on inset property
   - Console logging: `Created effect style: ...` or `Updated effect style: ...`

**Configuration Options:**
- `createStyles`: Enable/disable style creation (default: true)
- `updateExisting`: Update existing styles (default: true)
- `percentageBase`: Base size for percentage calculations (default: 16px)

---

### Debugging Guide

#### Console Logging

**Color conversions**:
```
[FigmaSyncService] Converting HSL color using hex fallback: #E8E9EC
```

**Unit conversions**:
```
[FigmaSyncService] Converted 0.625rem to 10px
[FigmaSyncService] Converted 2.5rem to 40px
```

**Resolution**:
```
[TokenController] Resolving 245 tokens...
[TokenController] Resolved 245 token values
```

**Sync**:
```
[FigmaSyncService] Setting value for primitive/color/primary/600: {...}
[FigmaSyncService] Converted value for primitive/color/primary/600: { r: 0.2, g: 0.4, b: 0.8 }
[FigmaSyncService] Code syntax set successfully for primitive.color.primary.600
```

**Text Style Creation**:
```
[FigmaSyncService] Created text style: typography/heading/h1
[FigmaSyncService] Updated text style: typography/body/regular
```

**Effect Style Creation**:
```
[FigmaSyncService] Created effect style: shadow/card/default
[FigmaSyncService] Updated effect style: shadow/card/hover
```

**Percentage Conversions**:
```
[FigmaSyncService] Converted 50% to 8px (base: 16px)
[FigmaSyncService] Converted 150% to 24px (base: 16px)
```

#### Common Issues

**Issue**: All colors are black
- **Cause**: HSL colors without hex fallback OR unresolved references
- **Check**: Console for "Could not convert color value" warnings
- **Fix**: Ensure resolution step runs AND HSL tokens have hex property

**Issue**: Dimensions show fractional values (0.625 instead of 10)
- **Cause**: REM/EM not being converted to pixels
- **Check**: Console for "Converted X rem to Y px" messages
- **Fix**: Ensure unit property is present and recognized

**Issue**: Variables missing code syntax
- **Cause**: setVariableCodeSyntax() API not available
- **Check**: Console for "setVariableCodeSyntax method not available"
- **Fix**: Update Figma desktop app to latest version

**Issue**: Typography tokens not creating text styles
- **Cause**: createStyles option disabled OR font not available
- **Check**: Console for "Created text style" or "Could not load font" messages
- **Fix**: Ensure createStyles=true (default) AND font is installed in Figma

**Issue**: Text style has wrong font style (Regular instead of Bold)
- **Cause**: Font weight not mapped correctly OR font style not available
- **Check**: Verify font has the required style (Bold, SemiBold, etc.)
- **Fix**: Install all font weights, or adjust fontWeight value to available style

**Issue**: Shadow tokens not creating effect styles
- **Cause**: createStyles option disabled OR shadow value format invalid
- **Check**: Console for "Created effect style" or error messages
- **Fix**: Ensure createStyles=true AND shadow has required properties (offsetX, offsetY, blur, color)

**Issue**: Shadow has no transparency (fully opaque)
- **Cause**: Color value missing alpha channel
- **Check**: Verify shadow color includes alpha (rgba format or alpha property)
- **Fix**: Use rgba(r, g, b, 0.1) format or { r, g, b, a: 0.1, alpha: 0.1 } object

**Issue**: Percentage values showing as 0
- **Cause**: Percentage unit not recognized OR percentageBase not set
- **Check**: Console for "Converted X% to Y px" messages
- **Fix**: Ensure percentage values include "%" unit and percentageBase is configured

**Issue**: Text/Effect styles duplicated on each sync
- **Cause**: Style names don't match token paths
- **Check**: Compare style names in Figma with token paths
- **Fix**: Ensure token paths match existing style names, or rename styles to match

---

### Testing Checklist

Before releasing sync feature:

#### Variables
- [ ] Import tokens with HSL colors → verify correct RGB values (not black)
- [ ] Import tokens with rem units → verify pixel conversion (10px not 0.625)
- [ ] Import tokens with percentage units → verify conversion (50% = 8px with base 16)
- [ ] Import alias tokens → verify resolution (actual values not "{...}" strings)
- [ ] Check primitive collection → verify all primitive tokens present
- [ ] Check semantic collection → verify all semantic tokens present
- [ ] Verify variable types → COLOR for colors, FLOAT for dimensions
- [ ] Check code syntax → WEB, ANDROID, iOS formats present
- [ ] Test cross-collection references → semantic resolves to primitive

#### Text Styles
- [ ] Import typography tokens → verify text styles created (not variables)
- [ ] Check text style font family → correct font loaded
- [ ] Check text style font weight → correct style (Bold, Medium, etc.)
- [ ] Check text style font size → converted to pixels (40px not 2.5rem)
- [ ] Check text style line height → PIXELS unit (not AUTO)
- [ ] Check text style letter spacing → PIXELS unit
- [ ] Update existing text style → verify update (not duplicate)

#### Effect Styles
- [ ] Import shadow tokens → verify effect styles created (not variables)
- [ ] Check drop shadow type → DROP_SHADOW for inset=false
- [ ] Check inner shadow type → INNER_SHADOW for inset=true
- [ ] Check shadow color alpha → preserved (0.1 displays correctly)
- [ ] Check shadow offsets → converted to pixels
- [ ] Check shadow blur/spread → converted to pixels
- [ ] Update existing effect style → verify update (not duplicate)

#### Configuration
- [ ] Sync with createStyles=false → typography/shadow tokens skipped
- [ ] Sync with updateExisting=false → existing styles not updated
- [ ] Sync with percentageBase=20 → percentage conversion uses custom base
- [ ] Sync with default options → all features enabled

#### Console & Debugging
- [ ] Check console → no "Could not convert" warnings
- [ ] Check console → text/effect style creation logged
- [ ] Check console → unit conversion logged (rem, em, %)
- [ ] Reload plugin → variables and styles persist correctly

---

**Last Updated**: 2025-11-15
**Version**: 5.0
**Status**: Production Ready ✅

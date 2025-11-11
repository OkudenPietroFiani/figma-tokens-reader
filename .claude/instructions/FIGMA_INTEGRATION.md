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

**Last Updated**: 2025-11-11
**Version**: 3.0
**Status**: Production Ready ✅

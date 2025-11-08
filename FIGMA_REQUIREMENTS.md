# Figma Plugin Requirements

This document outlines critical requirements and constraints when developing Figma plugins.

## JavaScript Execution Requirements

### ❌ External Script Loading NOT Supported

Figma plugins **cannot load external JavaScript files** via `<script src="...">`.

**This will NOT work:**
```html
<script src="ui.js"></script>
```

**Why:** Figma's plugin sandbox does not support loading external resources for security reasons.

### ✅ Inline JavaScript Required

All JavaScript code must be **inlined directly** in the HTML file.

**This WILL work:**
```html
<script>
  // All your JavaScript code here, inlined
  console.log('Hello from Figma plugin!');
</script>
```

## Build Process Solution

To work around this limitation, we use a build process that:

1. **Bundles** the frontend TypeScript code into a single JavaScript file (`ui.js`)
2. **Inlines** the bundled JavaScript into the HTML template
3. **Generates** the final `ui.html` with embedded JavaScript

### Build Flow

```
src/frontend/index.ts
  ↓ (esbuild)
ui.js (bundled)
  ↓ (build-ui.js)
ui-template.html + ui.js
  ↓
ui.html (final, with inlined JavaScript)
```

### Build Scripts

**package.json:**
```json
{
  "scripts": {
    "build:frontend": "esbuild src/frontend/index.ts --bundle --outfile=ui.js --target=es2017 && node build-ui.js"
  }
}
```

**build-ui.js:**
- Reads the bundled `ui.js`
- Reads the `ui-template.html` template
- Replaces the `<!-- INLINE_BUNDLE_HERE -->` placeholder with the JavaScript
- Writes the final `ui.html` file

## Component Initialization Pattern

### ❌ Constructor Event Binding Issue

**This will cause errors:**
```typescript
class BaseComponent {
  constructor(state: AppState) {
    this.state = state;
    this.element = this.createElement();
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
    this.bridge.on('event', ...); // ❌ Error: this.bridge is undefined
  }
}
```

### ✅ Two-Phase Initialization Pattern

**Use this pattern instead:**
```typescript
class BaseComponent {
  constructor(state: AppState) {
    this.state = state;
    this.element = this.createElement();
    // Don't call bindEvents() here
  }

  init(): void {
    this.bindEvents(); // ✅ Call after all properties are set
  }
}

class ChildComponent extends BaseComponent {
  private bridge: PluginBridge;

  constructor(state: AppState, bridge: PluginBridge) {
    super(state);
    this.bridge = bridge; // ✅ Set properties first
  }

  bindEvents() {
    this.bridge.on('event', ...); // ✅ this.bridge is defined
  }
}

// Usage
const component = new ChildComponent(state, bridge);
component.init(); // ✅ Bind events after construction
```

## Plugin Structure

### Required Files

1. **manifest.json** - Plugin metadata and configuration
2. **code.js** - Backend code (runs in Figma sandbox)
3. **ui.html** - Frontend UI (runs in iframe)

### File Size Considerations

- **ui.html** with inlined JavaScript: ~56KB (acceptable)
- **code.js** backend bundle: ~68KB (acceptable)
- Figma has file size limits, but these are well within bounds

## CSS Requirements

### ✅ Inline Styles Recommended

While external CSS files *may* work, it's safer to inline all CSS in the HTML file to avoid any loading issues.

**Our approach:**
```html
<head>
  <style>
    /* All CSS inlined here */
    body { font-family: sans-serif; }
    /* ... */
  </style>
</head>
```

## Common Pitfalls

### 1. Blank Screen / UI Not Rendering

**Symptoms:** Plugin opens but shows nothing, no errors in console

**Cause:** External JavaScript file not executing because Figma blocks `<script src="...">`

**Solution:** Inline all JavaScript in ui.html

### 2. "Cannot read properties of undefined" Error

**Symptoms:** Error during component initialization

**Cause:** BaseComponent constructor calls bindEvents() before child class properties are set

**Solution:** Use two-phase initialization pattern (constructor + init())

### 3. Module Import Errors

**Symptoms:** "Cannot use import statement outside a module"

**Cause:** Not bundling the code, trying to use ES modules directly

**Solution:** Use esbuild or similar bundler to create a single JavaScript file

## Development Workflow

### Recommended Development Process

1. **Write code** in TypeScript with proper module structure
2. **Bundle** using esbuild to create single JavaScript files
3. **Inline** the frontend bundle into HTML template
4. **Test** in Figma by reloading the plugin
5. **Debug** using Chrome DevTools (right-click plugin UI → Inspect)

### Debugging Tips

- **Frontend console:** Right-click plugin UI → Inspect → Console tab
- **Backend console:** Open Figma Desktop → Help → Toggle Developer Tools
- **Two separate contexts:** Frontend (iframe) and Backend (sandbox) don't share console

## Best Practices

1. ✅ **Always inline JavaScript** in ui.html
2. ✅ **Use two-phase initialization** for components
3. ✅ **Bundle all code** into single files (code.js, ui.js)
4. ✅ **Test after every change** - reload plugin in Figma
5. ✅ **Keep builds automated** - use npm scripts

## References

- [Figma Plugin API Documentation](https://www.figma.com/plugin-docs/)
- [Creating UI in Figma Plugins](https://www.figma.com/plugin-docs/creating-ui/)
- [Plugin Manifest Reference](https://www.figma.com/plugin-docs/manifest/)

---

**Last Updated:** 2025-11-08
**Plugin:** W3C Design Tokens Importer

# Design System Documentation

Complete guide to the UI design system used in the Figma Tokens Reader plugin.

---

## Design Tokens

### Color System

**Location**: `src/frontend/styles/main.css`

```css
:root {
  /* Text Colors */
  --color-text-strong: #282828;
  --color-text-weak: #787878;
  
  /* Border Colors */
  --color-border-light: #F0F0F0;
  --color-border-medium: #D7D7D7;
  
  /* Background Colors */
  --color-background: #FFFFFF;
  
  /* Functional Colors */
  --color-success: #0ACF83;
  --color-error: #F24822;
  --color-info: #0066FF;
  --color-hover: #F5F5F5;
}
```

**Usage**:
```css
.error-message {
  color: var(--color-error);
}
```

---

### Spacing Scale

```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;
  --space-3xl: 40px;
}
```

**Usage**:
```css
.card {
  padding: var(--space-lg);
  gap: var(--space-md);
}
```

---

### Typography System

```css
:root {
  /* Font Sizes */
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 13px;
  --text-md: 14px;
  --text-lg: 16px;
  --text-xl: 20px;
  --text-2xl: 24px;
  
  /* Font Weights */
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

**Default Font**: Inter (fallback: system fonts)

---

### Border Radius

```css
:root {
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 20px;
  --radius-full: 9999px;
}
```

---

## Component Library

### Buttons

#### Primary Button
```html
<button class="btn btn-primary">Primary Action</button>
```

```css
.btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  cursor: pointer;
  transition: var(--transition-base);
}

.btn-primary {
  background: var(--color-info);
  color: white;
}
```

#### Secondary Button
```html
<button class="btn btn-secondary">Secondary Action</button>
```

#### Full Width Button
```html
<button class="btn btn-primary btn-full">Full Width</button>
```

---

### Input Fields

#### Text Input
```html
<div class="input-group">
  <label for="name">Label</label>
  <input type="text" id="name" class="text-input" placeholder="Enter text">
</div>
```

```css
.text-input {
  width: 100%;
  padding: var(--space-sm);
  border: 1px solid var(--color-border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
}
```

#### Select Dropdown
```html
<select class="select-input">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

---

### Screens

#### Screen Structure
```html
<div class="screen-content">
  <div class="screen-header">
    <h1 class="screen-title">Screen Title</h1>
    <p class="screen-subtitle">Description</p>
  </div>
  
  <div class="screen-body">
    <!-- Content here -->
  </div>
</div>
```

**Styles**:
```css
.screen-header {
  padding: var(--space-2xl) var(--space-2xl) var(--space-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.screen-title {
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-strong);
}

.screen-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2xl);
}
```

---

### Cards

```html
<div class="card">
  <h3 class="card-title">Card Title</h3>
  <p class="card-content">Card content goes here</p>
</div>
```

```css
.card {
  padding: var(--space-lg);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-background);
}
```

---

### Lists

#### File List
```html
<div class="file-list">
  <div class="file-list-header">Files</div>
  <div class="file-item">
    <input type="checkbox" class="file-checkbox">
    <span>file-name.json</span>
  </div>
</div>
```

---

## Layout Patterns

### Flexbox Utilities

```css
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flex-col {
  display: flex;
  flex-direction: column;
}
```

---

### Grid System

```css
.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}
```

---

## Transitions

```css
:root {
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;
}
```

**Usage**:
```css
.button {
  transition: background var(--transition-base);
}
```

---

## States

### Hover States
```css
.btn:hover {
  opacity: 0.9;
}

.file-item:hover {
  background: var(--color-hover);
}
```

### Disabled States
```css
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Loading States
```html
<div class="loading">
  <div class="spinner"></div>
  <p>Loading...</p>
</div>
```

---

## Accessibility

### Focus States
```css
input:focus,
select:focus {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}
```

### Semantic HTML
- Use `<button>` for clickable actions
- Use `<label>` with `for` attribute
- Use semantic elements (`<header>`, `<main>`, `<section>`)

---

## Documentation-Specific Styles

### Documentation Configuration
```typescript
export const DOCUMENTATION_LAYOUT_CONFIG = {
  table: {
    width: 1200,
    minColumnWidth: 80,
    rowHeight: 40,
    gap: 8,
  },
  cell: {
    padding: 12,
    fontSize: 13,
  },
  header: {
    fontSize: 14,
    backgroundColor: { r: 0.96, g: 0.96, b: 0.96 },
  },
};
```

---

## Best Practices

### DRY CSS
❌ **Don't**:
```css
.button-1 {
  padding: 8px;
  border-radius: 6px;
}
.button-2 {
  padding: 8px;
  border-radius: 6px;
}
```

✅ **Do**:
```css
.btn {
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
}
```

### Use Variables
❌ **Don't**:
```css
.text {
  color: #282828;
}
```

✅ **Do**:
```css
.text {
  color: var(--color-text-strong);
}
```

---

**Last Updated**: 2025-11-11
**Version**: 3.0

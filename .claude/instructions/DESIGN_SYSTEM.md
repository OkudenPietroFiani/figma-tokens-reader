# Design System

Complete UI design system for the Figma Tokens Reader plugin.

---

## Design Tokens

### Color System

```css
:root {
  /* Text */
  --color-text-strong: #282828;
  --color-text-weak: #787878;

  /* Borders */
  --color-border-light: #F0F0F0;
  --color-border-medium: #D7D7D7;

  /* Background */
  --color-background: #FFFFFF;

  /* Functional */
  --color-success: #0ACF83;
  --color-error: #F24822;
  --color-info: #0066FF;
  --color-hover: #F5F5F5;
}
```

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

### Typography

```css
:root {
  /* Sizes */
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 13px;
  --text-md: 14px;
  --text-lg: 16px;
  --text-xl: 20px;
  --text-2xl: 24px;

  /* Weights */
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

**Font**: Inter (fallback: system fonts)

### Border Radius

```css
:root {
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 20px;
  --radius-full: 9999px;
}
```

### Transitions

```css
:root {
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;
}
```

---

## Components

### Buttons

```html
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary">Secondary Action</button>
<button class="btn btn-primary btn-full">Full Width</button>
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

.btn:hover {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Input Fields

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

.text-input:focus {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}
```

### Screens

```html
<div class="screen-content">
  <div class="screen-header">
    <h1 class="screen-title">Screen Title</h1>
    <p class="screen-subtitle">Description</p>
  </div>

  <div class="screen-body">
    <!-- Content -->
  </div>
</div>
```

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

### Cards

```html
<div class="card">
  <h3 class="card-title">Card Title</h3>
  <p class="card-content">Card content</p>
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

## Layout Utilities

### Flexbox

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

### Grid

```css
.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}
```

---

## States

### Hover

```css
.btn:hover {
  opacity: 0.9;
}

.file-item:hover {
  background: var(--color-hover);
}
```

### Focus

```css
input:focus,
select:focus {
  outline: 2px solid var(--color-info);
  outline-offset: 2px;
}
```

### Loading

```html
<div class="loading">
  <div class="spinner"></div>
  <p>Loading...</p>
</div>
```

---

## Best Practices

### Use CSS Variables

❌ **Don't**:
```css
.text {
  color: #282828;
  padding: 16px;
}
```

✅ **Do**:
```css
.text {
  color: var(--color-text-strong);
  padding: var(--space-lg);
}
```

### DRY Principle

❌ **Don't**:
```css
.button-1 {
  display: flex;
  justify-content: center;
  align-items: center;
}
.button-2 {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

✅ **Do**:
```css
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

---

## Accessibility

- Use semantic HTML (`<button>`, `<label>`, `<header>`, etc.)
- Include focus states for keyboard navigation
- Use `for` attribute on labels
- Provide sufficient color contrast

---

**Version**: 1.0
**Last Updated**: 2025-11-15

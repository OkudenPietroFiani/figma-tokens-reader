# Figma Auto-Layout Principles

This document outlines the critical principles for working with Figma's auto-layout system, especially when creating dynamic frames that should adapt to their content.

## The "Hug Content" Pattern

### Core Principle

When using Figma's `counterAxisSizingMode = 'AUTO'` (hug contents), the timing of when you call `resize()` is **critical**.

### ❌ INCORRECT Pattern

```typescript
// BAD: Resizing BEFORE adding children locks the dimension
const frame = figma.createFrame();
frame.layoutMode = 'HORIZONTAL';
frame.counterAxisSizingMode = 'AUTO'; // Want to hug height
frame.resize(width, 1); // ⚠️ This locks height at 1px!

frame.appendChild(child); // Child is added, but height stays 1px
```

### ✅ CORRECT Pattern

```typescript
// GOOD: Add children FIRST, then resize to preserve calculated height
const frame = figma.createFrame();
frame.layoutMode = 'HORIZONTAL';
frame.primaryAxisSizingMode = 'FIXED';
frame.counterAxisSizingMode = 'AUTO'; // Want to hug height

frame.appendChild(child); // Add children first

// Now resize using the naturally calculated height
frame.resize(width, frame.height); // ✓ Preserves the auto-calculated height
```

## Why This Matters

When `counterAxisSizingMode = 'AUTO'`:
- Figma calculates the frame's height based on its children
- Calling `resize()` **before** adding children sets a fixed height that persists
- Even though the mode is AUTO, the early `resize()` call overrides it
- You must add children first, then call `resize(width, frame.height)` to set width while preserving the natural height

## Application Across the Codebase

This pattern applies to **all** levels of the hierarchy:

### 1. Visualization Containers

All visualizers (DefaultVisualizer, ColorVisualizer, BorderRadiusVisualizer, SpacingVisualizer, FontSizeVisualizer, FontWeightVisualizer) follow this pattern:

```typescript
renderVisualization(token: TokenMetadata, width: number, height: number): FrameNode {
  const container = figma.createFrame();
  container.layoutMode = 'HORIZONTAL';
  container.primaryAxisSizingMode = 'FIXED';
  container.counterAxisSizingMode = 'AUTO'; // Hug contents height

  // Add padding and children
  container.paddingLeft = padding;
  container.paddingRight = padding;
  container.paddingTop = padding;
  container.paddingBottom = padding;

  container.appendChild(visualElement);

  // Resize AFTER adding children
  container.resize(width, container.height);

  return container;
}
```

### 2. Cell Frames

All cell creation methods (`createHeaderCell()`, `createTextCell()`, `createVisualizationCell()`) follow the same pattern:

```typescript
private createTextCell(value: string, width: number): FrameNode {
  const cellFrame = figma.createFrame();
  cellFrame.layoutMode = 'HORIZONTAL';
  cellFrame.primaryAxisSizingMode = 'FIXED';
  cellFrame.counterAxisSizingMode = 'AUTO';

  cellFrame.paddingLeft = padding;
  cellFrame.paddingRight = padding;
  cellFrame.paddingTop = padding;
  cellFrame.paddingBottom = padding;

  const text = figma.createText();
  // ... configure text ...
  cellFrame.appendChild(text);

  // Resize AFTER adding children
  cellFrame.resize(width, cellFrame.height);

  return cellFrame;
}
```

### 3. Row Frames

Row creation methods (`createHeaderRow()`, `createDataRow()`) also follow this pattern:

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

## Text Width Filling

### Problem: Text Not Wrapping

When text doesn't fill its container width, it won't wrap and descriptions stay on one line.

### Solution: Fixed Width Text with Height Auto-Resize

```typescript
const text = figma.createText();
text.characters = value;

// Calculate available width (accounting for cell padding)
const availableWidth = cellWidth - (padding * 2);

// Set text to fill width, only auto-resize height
text.textAutoResize = 'HEIGHT'; // Not 'WIDTH_AND_HEIGHT'!
text.resize(availableWidth, text.height);

cellFrame.appendChild(text);
```

This ensures:
- Text fills the full width of its container
- Text wraps to multiple lines when needed
- Cell and row height adapt to text content

## Common Pitfalls

### 1. Using `resize()` Too Early
❌ `frame.resize(width, 1)` before `appendChild()`
✅ `appendChild()` first, then `frame.resize(width, frame.height)`

### 2. Wrong Text Auto-Resize Mode
❌ `text.textAutoResize = 'WIDTH_AND_HEIGHT'` (text won't fill width)
✅ `text.textAutoResize = 'HEIGHT'` + `text.resize(width, text.height)`

### 3. Forgetting to Set Both Axis Sizing Modes
❌ Only setting `counterAxisSizingMode = 'AUTO'`
✅ Set both `primaryAxisSizingMode = 'FIXED'` and `counterAxisSizingMode = 'AUTO'`

## Hierarchy of Hug Content

The pattern cascades from bottom to top:

1. **Visualization Elements** (lowest level) → hug their content (e.g., colored squares, text)
2. **Visualization Containers** → hug the visualization elements
3. **Cells** → hug the containers/text inside them
4. **Rows** → hug all the cells in the row
5. **Table** → hug all the rows

Each level adds children first, then resizes to preserve the calculated height.

## Testing Checklist

When implementing auto-layout frames:

- [ ] Set `counterAxisSizingMode = 'AUTO'` for the dimension that should hug
- [ ] Set `primaryAxisSizingMode = 'FIXED'` for the dimension that should stay fixed
- [ ] Add all children **before** calling `resize()`
- [ ] Call `resize(fixedDimension, frame.calculatedDimension)`
- [ ] For text that should wrap: use `textAutoResize = 'HEIGHT'` and set fixed width
- [ ] Verify in Figma that frames show "Hug contents" property, not fixed height values

## References

- Figma Plugin API: [`FrameNode.counterAxisSizingMode`](https://www.figma.com/plugin-docs/api/properties/nodes-counteraxissizingmode/)
- Figma Plugin API: [`TextNode.textAutoResize`](https://www.figma.com/plugin-docs/api/properties/nodes-textautoresize/)
- Related commits: `c440ab5`, `d77be82`, `985e14f`

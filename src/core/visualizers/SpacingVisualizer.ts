// ====================================================================================
// SPACING VISUALIZER
// Renders spacing/dimension tokens as rectangles with the correct width
// ====================================================================================

import { ITokenVisualizer } from '../interfaces/ITokenVisualizer';
import { TokenMetadata } from '../../shared/types';
import { DOCUMENTATION_LAYOUT_CONFIG, validateVisualizationDimensions, validateDimension } from '../../shared/documentation-config';

/**
 * SpacingVisualizer - Renders spacing tokens as rectangles
 *
 * Principles:
 * - Single Responsibility: Only handles spacing/dimension visualization
 * - Strategy Pattern: Implements ITokenVisualizer
 *
 * Visual output:
 * - Rectangle with width = token value (in pixels)
 * - Fixed height for consistency
 * - Centered in the cell
 */
export class SpacingVisualizer implements ITokenVisualizer {
  getType(): string {
    return 'spacing';
  }

  canVisualize(token: TokenMetadata): boolean {
    return token.type === 'spacing' || token.type === 'dimension';
  }

  renderVisualization(
    token: TokenMetadata,
    width: number,
    height: number
  ): FrameNode {
    // Validate dimensions before creating container
    const dims = validateVisualizationDimensions(width, height);

    const container = figma.createFrame();
    container.name = `viz-${token.name}`;
    container.fills = [];
    container.clipsContent = false;

    // Auto-layout for centering with AUTO height (hug contents)
    container.layoutMode = 'HORIZONTAL';
    container.primaryAxisSizingMode = 'FIXED';
    container.counterAxisSizingMode = 'AUTO'; // Hug contents height
    container.primaryAxisAlignItems = 'CENTER';
    container.counterAxisAlignItems = 'CENTER';

    const padding = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
    const availableWidth = Math.max(10, dims.width - (padding * 2)); // Ensure positive space

    container.paddingLeft = padding;
    container.paddingRight = padding;
    container.paddingTop = padding;
    container.paddingBottom = padding;

    // Create rectangle with width = spacing value
    const rectangle = figma.createRectangle();
    const spacingValue = this.parseSpacingValue(token.value);
    // Ensure rectangle width is valid (between 1px and available width)
    const rectWidth = validateDimension(Math.min(spacingValue, availableWidth), 1, availableWidth);
    const rectHeight = DOCUMENTATION_LAYOUT_CONFIG.visualization.spacingBarHeight;

    rectangle.resize(rectWidth, rectHeight);
    rectangle.cornerRadius = 2;

    // Use a visible color (blue)
    rectangle.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.6, b: 1 } }];

    container.appendChild(rectangle);

    // Set width AFTER adding children so height can auto-adjust
    container.resize(dims.width, container.height);

    return container;
  }

  /**
   * Parse spacing value to pixels
   */
  private parseSpacingValue(value: any): number {
    // If already a number, return it
    if (typeof value === 'number') {
      return value;
    }

    // If string, try to parse
    if (typeof value === 'string') {
      // Remove 'px' suffix if present
      const numStr = value.replace('px', '').trim();
      const parsed = parseFloat(numStr);
      return isNaN(parsed) ? 16 : parsed; // Default to 16px if parsing fails
    }

    // Default
    return 16;
  }
}

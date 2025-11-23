// ====================================================================================
// COLOR VISUALIZER
// Renders color tokens as colored squares
// ====================================================================================

import { ITokenVisualizer } from '../interfaces/ITokenVisualizer';
import { TokenMetadata } from '../../shared/types';
import { DOCUMENTATION_LAYOUT_CONFIG, validateVisualizationDimensions } from '../../shared/documentation-config';
import { converters } from '../converters';
import { debug } from '../../shared/logger';

/**
 * ColorVisualizer - Renders color tokens as colored squares
 *
 * Principles:
 * - Single Responsibility: Only handles color visualization
 * - Strategy Pattern: Implements ITokenVisualizer
 *
 * Visual output:
 * - Colored square with the token color
 * - Centered in the cell
 */
export class ColorVisualizer implements ITokenVisualizer {
  getType(): string {
    return 'color';
  }

  canVisualize(token: TokenMetadata): boolean {
    return token.type === 'color';
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
    container.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
    container.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
    container.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
    container.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;

    // Create colored square
    const square = figma.createRectangle();
    const size = DOCUMENTATION_LAYOUT_CONFIG.visualization.colorSquareSize;
    square.resize(size, size);
    square.cornerRadius = 4;

    // Apply color
    try {
      debug.log(`[ColorVisualizer] Rendering color for ${token.name}`);
      debug.log(`[ColorVisualizer] Token value type: ${typeof token.value}`);
      debug.log(`[ColorVisualizer] Token value:`, JSON.stringify(token.value));
      debug.log(`[ColorVisualizer] Token originalValue:`, JSON.stringify(token.originalValue));

      const color = this.parseColor(token.value);
      square.fills = [{ type: 'SOLID', color }];
    } catch (error) {
      // If color parsing fails, use gray placeholder
      square.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
      console.error(`[ColorVisualizer] Failed to parse color for ${token.name}`);
      console.error(`[ColorVisualizer] Error details:`, error);
      console.error(`[ColorVisualizer] Token value was:`, JSON.stringify(token.value));
    }

    container.appendChild(square);

    // Set width AFTER adding children so height can auto-adjust
    container.resize(dims.width, container.height);

    return container;
  }

  /**
   * Parse color value to RGB
   * Refactored to use ColorConverter for all color parsing
   */
  private parseColor(value: any): RGB {
    // Use ColorConverter for all color format parsing
    const colorResult = converters.color.toRGB(value);

    if (colorResult.success) {
      const { r, g, b } = colorResult.data;
      return { r, g, b };
    }

    // If conversion failed, throw error for better debugging
    throw new Error(`Unable to parse color value: ${colorResult.error}`);
  }
}

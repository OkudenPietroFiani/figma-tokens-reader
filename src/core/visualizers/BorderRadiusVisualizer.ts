// ====================================================================================
// BORDER RADIUS VISUALIZER
// Renders border radius tokens as squares with the radius applied
// ====================================================================================

import { ITokenVisualizer } from '../interfaces/ITokenVisualizer';
import { TokenMetadata } from '../../shared/types';
import { DOCUMENTATION_LAYOUT_CONFIG, validateVisualizationDimensions } from '../../shared/documentation-config';

/**
 * BorderRadiusVisualizer - Renders border radius tokens as squares
 *
 * Principles:
 * - Single Responsibility: Only handles border radius visualization
 * - Strategy Pattern: Implements ITokenVisualizer
 *
 * Visual output:
 * - 100x100 square with the token's border radius applied
 * - Centered in the cell
 * - Light border to show the shape clearly
 */
export class BorderRadiusVisualizer implements ITokenVisualizer {
  getType(): string {
    return 'borderRadius';
  }

  canVisualize(token: TokenMetadata): boolean {
    return token.type === 'borderRadius' || token.type === 'radius';
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

    // Create 100x100 square
    const square = figma.createRectangle();
    square.resize(100, 100);

    // Apply border radius
    const radius = this.parseBorderRadius(token.value);
    square.cornerRadius = radius;

    // Light fill and stroke to show the shape
    square.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
    square.strokes = [{ type: 'SOLID', color: { r: 0.7, g: 0.7, b: 0.7 } }];
    square.strokeWeight = 1;

    container.appendChild(square);

    // Set width AFTER adding children so height can auto-adjust
    container.resize(dims.width, container.height);

    return container;
  }

  /**
   * Parse border radius value to pixels
   */
  private parseBorderRadius(value: any): number {
    // If already a number, return it
    if (typeof value === 'number') {
      return value;
    }

    // If string, try to parse
    if (typeof value === 'string') {
      // Remove 'px' suffix if present
      const numStr = value.replace('px', '').trim();
      const parsed = parseFloat(numStr);
      return isNaN(parsed) ? 0 : parsed;
    }

    // Default to 0 (no radius)
    return 0;
  }
}

// ====================================================================================
// FONT SIZE VISUALIZER
// Renders font size tokens as text with the correct font size
// ====================================================================================

import { ITokenVisualizer } from '../interfaces/ITokenVisualizer';
import { TokenMetadata } from '../../shared/types';
import { DOCUMENTATION_LAYOUT_CONFIG, validateVisualizationDimensions } from '../../shared/documentation-config';

/**
 * FontSizeVisualizer - Renders font size tokens as text
 *
 * Principles:
 * - Single Responsibility: Only handles font size visualization
 * - Strategy Pattern: Implements ITokenVisualizer
 *
 * Visual output:
 * - Text "Aa" with the token's font size
 * - Centered in the cell
 */
export class FontSizeVisualizer implements ITokenVisualizer {
  getType(): string {
    return 'fontSize';
  }

  canVisualize(token: TokenMetadata): boolean {
    return token.type === 'fontSize' || token.type === 'fontSizes';
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
    container.resize(dims.width, dims.height);
    container.fills = [];
    container.clipsContent = false;

    // Auto-layout for centering
    container.layoutMode = 'HORIZONTAL';
    container.primaryAxisAlignItems = 'CENTER';
    container.counterAxisAlignItems = 'CENTER';
    container.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
    container.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
    container.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
    container.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;

    // Create text with font size
    const text = figma.createText();
    text.characters = 'Aa';
    const fontSize = this.parseFontSize(token.value);
    text.fontSize = fontSize;
    text.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];

    container.appendChild(text);
    return container;
  }

  /**
   * Parse font size value to pixels
   */
  private parseFontSize(value: any): number {
    // If already a number, return it
    if (typeof value === 'number') {
      return value;
    }

    // If string, try to parse
    if (typeof value === 'string') {
      // Remove 'px' or 'rem' suffix if present
      let numStr = value.trim();

      // Convert rem to px (assuming 16px base)
      if (numStr.endsWith('rem')) {
        const rem = parseFloat(numStr.replace('rem', ''));
        return isNaN(rem) ? 16 : rem * 16;
      }

      // Parse px
      numStr = numStr.replace('px', '');
      const parsed = parseFloat(numStr);
      return isNaN(parsed) ? 16 : parsed;
    }

    // Default
    return 16;
  }
}

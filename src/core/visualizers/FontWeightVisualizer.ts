// ====================================================================================
// FONT WEIGHT VISUALIZER
// Renders font weight tokens as text with the correct weight
// ====================================================================================

import { ITokenVisualizer } from '../interfaces/ITokenVisualizer';
import { TokenMetadata } from '../../shared/types';
import { DOCUMENTATION_LAYOUT_CONFIG, validateVisualizationDimensions } from '../../shared/documentation-config';

/**
 * FontWeightVisualizer - Renders font weight tokens as text
 *
 * Principles:
 * - Single Responsibility: Only handles font weight visualization
 * - Strategy Pattern: Implements ITokenVisualizer
 *
 * Visual output:
 * - Text "Aa" at 20px with the token's font weight
 * - Centered in the cell
 */
export class FontWeightVisualizer implements ITokenVisualizer {
  getType(): string {
    return 'fontWeight';
  }

  canVisualize(token: TokenMetadata): boolean {
    return token.type === 'fontWeight' || token.type === 'fontWeights';
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

    // Create text showing the weight value
    const text = figma.createText();
    const fontWeight = this.parseFontWeight(token.value);

    // Display weight number + "Aa" sample
    text.characters = `${fontWeight}`;
    text.fontSize = 14;
    text.fontName = { family: 'Inter', style: 'Regular' };
    text.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];

    // Create sample text "Aa" at 20px with the weight if possible
    const sample = figma.createText();
    sample.characters = 'Aa';
    sample.fontSize = 20; // Fixed 20px as requested

    // Use Bold for weights >= 600, Regular for < 600 (only use loaded fonts)
    const style = fontWeight >= 600 ? 'Bold' : 'Regular';
    sample.fontName = { family: 'Inter', style };
    sample.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];

    // Add spacing between weight number and sample
    container.itemSpacing = 8;

    container.appendChild(text);
    container.appendChild(sample);
    return container;
  }

  /**
   * Parse font weight value
   */
  private parseFontWeight(value: any): number {
    // If already a number, return it
    if (typeof value === 'number') {
      return value;
    }

    // If string, try to parse
    if (typeof value === 'string') {
      // Handle named weights
      const namedWeights: { [key: string]: number } = {
        'thin': 100,
        'extra-light': 200,
        'extralight': 200,
        'light': 300,
        'normal': 400,
        'regular': 400,
        'medium': 500,
        'semi-bold': 600,
        'semibold': 600,
        'bold': 700,
        'extra-bold': 800,
        'extrabold': 800,
        'black': 900,
      };

      const normalized = value.toLowerCase().trim();
      if (namedWeights[normalized]) {
        return namedWeights[normalized];
      }

      // Try to parse as number
      const parsed = parseInt(value);
      return isNaN(parsed) ? 400 : parsed;
    }

    // Default to regular
    return 400;
  }
}

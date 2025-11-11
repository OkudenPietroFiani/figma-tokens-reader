// ====================================================================================
// DEFAULT VISUALIZER
// Fallback visualizer for tokens without specific visualizers
// ====================================================================================

import { ITokenVisualizer } from '../interfaces/ITokenVisualizer';
import { TokenMetadata } from '../../shared/types';
import { validateVisualizationDimensions } from '../../shared/documentation-config';

/**
 * DefaultVisualizer - Fallback for tokens without specific visualizers
 *
 * Principles:
 * - Single Responsibility: Provides default visualization
 * - Strategy Pattern: Implements ITokenVisualizer
 * - Null Object Pattern: Provides safe default instead of errors
 *
 * Visual output:
 * - Simple placeholder dash (—)
 * - Can be extended in future to show type-specific icons
 */
export class DefaultVisualizer implements ITokenVisualizer {
  getType(): string {
    return 'default';
  }

  canVisualize(token: TokenMetadata): boolean {
    // Can visualize any token (fallback)
    return true;
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

    // Create placeholder text
    const text = figma.createText();
    text.characters = '—';
    text.fontSize = 16;
    text.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];

    container.appendChild(text);

    // Set width AFTER adding children so height can auto-adjust
    container.resize(dims.width, container.height);

    return container;
  }
}

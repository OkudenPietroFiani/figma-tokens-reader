// ====================================================================================
// DEFAULT VISUALIZER
// Fallback visualizer for tokens without specific visualizers
// ====================================================================================

import { ITokenVisualizer } from '../interfaces/ITokenVisualizer';
import { TokenMetadata } from '../../shared/types';

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
    const container = figma.createFrame();
    container.name = `viz-${token.name}`;
    container.resize(width, height);
    container.fills = [];
    container.clipsContent = false;

    // Auto-layout for centering
    container.layoutMode = 'HORIZONTAL';
    container.primaryAxisAlignItems = 'CENTER';
    container.counterAxisAlignItems = 'CENTER';

    // Create placeholder text
    const text = figma.createText();
    text.characters = '—';
    text.fontSize = 16;
    text.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];

    container.appendChild(text);
    return container;
  }
}

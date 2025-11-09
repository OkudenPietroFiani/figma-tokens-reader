// ====================================================================================
// TOKEN VISUALIZER INTERFACE
// Strategy pattern for rendering token visualizations in Figma
// ====================================================================================

import { TokenMetadata } from '../../shared/types';

/**
 * Interface for token visualization strategies
 *
 * Principles:
 * - Strategy Pattern: Different visualization strategies per token type
 * - Open/Closed: Easy to add new visualizers without modifying existing code
 * - Single Responsibility: Each visualizer handles one type
 *
 * Usage:
 * - Implement this interface for each token type (color, spacing, typography, etc.)
 * - Register implementations in TokenVisualizerRegistry
 * - Generator will automatically use the correct visualizer
 *
 * Example:
 * ```typescript
 * class ColorVisualizer implements ITokenVisualizer {
 *   getType() { return 'color'; }
 *   canVisualize(token) { return token.type === 'color'; }
 *   renderVisualization(token, width, height) {
 *     // Create colored square
 *   }
 * }
 * ```
 */
export interface ITokenVisualizer {
  /**
   * Get the token type this visualizer handles
   * Used for registry lookup
   *
   * @returns Token type (e.g., 'color', 'spacing', 'typography')
   */
  getType(): string;

  /**
   * Check if this visualizer can handle a specific token
   * Allows for more complex matching logic beyond just type
   *
   * @param token - Token metadata to check
   * @returns True if this visualizer can render the token
   */
  canVisualize(token: TokenMetadata): boolean;

  /**
   * Render the token visualization in Figma
   * Creates a visual representation of the token value
   *
   * @param token - Token metadata with value and type
   * @param width - Width of the visualization cell
   * @param height - Height of the visualization cell
   * @returns FrameNode containing the visualization
   */
  renderVisualization(
    token: TokenMetadata,
    width: number,
    height: number
  ): FrameNode;
}

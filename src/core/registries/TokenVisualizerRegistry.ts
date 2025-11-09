// ====================================================================================
// TOKEN VISUALIZER REGISTRY
// Registry pattern for token visualizers
// ====================================================================================

import { ITokenVisualizer } from '../interfaces/ITokenVisualizer';
import { TokenMetadata } from '../../shared/types';

/**
 * Registry for token visualizers
 *
 * Principles:
 * - Registry Pattern: Centralized registration and retrieval
 * - Open/Closed: Add new visualizers without modifying registry code
 * - Single Source of Truth: All visualizers registered here
 *
 * Usage:
 * ```typescript
 * // Register visualizers (in main.ts)
 * TokenVisualizerRegistry.register(new ColorVisualizer());
 * TokenVisualizerRegistry.register(new SpacingVisualizer());
 *
 * // Get visualizer for a token
 * const visualizer = TokenVisualizerRegistry.getForToken(token);
 * const frame = visualizer.renderVisualization(token, width, height);
 * ```
 */
export class TokenVisualizerRegistry {
  private static visualizers: Map<string, ITokenVisualizer> = new Map();

  /**
   * Register a token visualizer
   * Visualizers are indexed by their type
   *
   * @param visualizer - Visualizer implementation to register
   */
  static register(visualizer: ITokenVisualizer): void {
    const type = visualizer.getType();
    this.visualizers.set(type, visualizer);
    console.log(`[TokenVisualizerRegistry] Registered visualizer for type: ${type}`);
  }

  /**
   * Get visualizer by token type
   *
   * @param type - Token type (e.g., 'color', 'spacing')
   * @returns Visualizer for the type, or undefined if not found
   */
  static get(type: string): ITokenVisualizer | undefined {
    return this.visualizers.get(type);
  }

  /**
   * Get visualizer for a specific token
   * Uses canVisualize() to find the best match
   *
   * @param token - Token metadata
   * @returns Visualizer that can handle the token, or undefined
   */
  static getForToken(token: TokenMetadata): ITokenVisualizer | undefined {
    // First try exact type match
    const exactMatch = this.visualizers.get(token.type);
    if (exactMatch && exactMatch.canVisualize(token)) {
      return exactMatch;
    }

    // Fall back to checking all visualizers
    for (const visualizer of this.visualizers.values()) {
      if (visualizer.canVisualize(token)) {
        return visualizer;
      }
    }

    return undefined;
  }

  /**
   * Check if a visualizer is registered for a type
   *
   * @param type - Token type to check
   * @returns True if visualizer exists for the type
   */
  static has(type: string): boolean {
    return this.visualizers.has(type);
  }

  /**
   * Get all registered types
   *
   * @returns Array of all registered token types
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.visualizers.keys());
  }

  /**
   * Clear all registered visualizers
   * Useful for testing
   */
  static clear(): void {
    this.visualizers.clear();
  }
}

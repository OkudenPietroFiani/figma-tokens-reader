// ====================================================================================
// TOKEN FORMAT REGISTRY
// Central registry for token format strategies (W3C, Style Dictionary, etc.)
// ====================================================================================

import { ITokenFormatStrategy } from '../interfaces/ITokenFormatStrategy';
import { TokenData } from '../../shared/types';

/**
 * Singleton registry for token format strategy implementations
 *
 * SOLID Principles:
 * - Single Responsibility: Only manages format registration/retrieval/detection
 * - Open/Closed: New formats registered at runtime without modification
 * - Dependency Inversion: Processors get formats via abstraction
 *
 * Usage:
 * ```typescript
 * // Register formats
 * TokenFormatRegistry.register(new W3CTokenFormatStrategy());
 * TokenFormatRegistry.register(new StyleDictionaryFormatStrategy());
 *
 * // Auto-detect format
 * const strategy = TokenFormatRegistry.detectFormat(tokenData);
 * ```
 */
export class TokenFormatRegistry {
  private static strategies: Map<string, ITokenFormatStrategy> = new Map();

  /**
   * Register a token format strategy
   *
   * @param strategy - Token format strategy implementation
   * @throws Error if strategy with same format name already registered
   */
  static register(strategy: ITokenFormatStrategy): void {
    const formatName = strategy.getFormatInfo().name;

    if (this.strategies.has(formatName)) {
      console.error(`[TokenFormatRegistry] Format '${formatName}' is already registered`);
      throw new Error(`Token format '${formatName}' is already registered`);
    }

    this.strategies.set(formatName, strategy);
  }

  /**
   * Get a format strategy by name
   *
   * @param formatName - Format identifier
   * @returns Format strategy or undefined
   */
  static get(formatName: string): ITokenFormatStrategy | undefined {
    const strategy = this.strategies.get(formatName);

    if (!strategy) {
      console.error(`[TokenFormatRegistry] No strategy registered for format: ${formatName}`);
    }

    return strategy;
  }

  /**
   * Auto-detect which format strategy to use based on token data
   * Returns strategy with highest confidence score
   *
   * @param data - Raw token data to analyze
   * @returns Best matching strategy or undefined if no match
   */
  static detectFormat(data: TokenData): ITokenFormatStrategy | undefined {
    let bestStrategy: ITokenFormatStrategy | undefined;
    let bestScore = 0;

    for (const strategy of this.strategies.values()) {
      const score = strategy.detectFormat(data);

      if (score > bestScore) {
        bestScore = score;
        bestStrategy = strategy;
      }
    }

    if (!bestStrategy) {
      console.error('[TokenFormatRegistry] No format strategy could parse the provided data');
    }

    return bestStrategy;
  }

  /**
   * Check if a format is registered
   *
   * @param formatName - Format identifier
   * @returns True if registered
   */
  static has(formatName: string): boolean {
    return this.strategies.has(formatName);
  }

  /**
   * Get all registered format names
   *
   * @returns Array of format names
   */
  static getRegisteredFormats(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Clear all registered strategies
   * Useful for testing
   */
  static clear(): void {
    this.strategies.clear();
  }

  /**
   * Get count of registered strategies
   *
   * @returns Number of registered strategies
   */
  static count(): number {
    return this.strategies.size;
  }
}

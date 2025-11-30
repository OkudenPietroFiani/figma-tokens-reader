// ====================================================================================
// TOKEN PARSER REGISTRY (Infrastructure)
// Manages token parsers and auto-detects formats
// ====================================================================================

import { ITokenParser, ITokenParserRegistry } from '../../core/ports/ITokenParser';
import { TokenData } from '../../shared/types';

/**
 * Token Parser Registry
 *
 * Infrastructure component that manages multiple token parsers
 * and provides auto-detection of token formats.
 *
 * Usage:
 * ```typescript
 * const registry = new TokenParserRegistry();
 * registry.register(new W3CTokenParser());
 * registry.register(new StyleDictionaryParser());
 *
 * const parser = registry.detectParser(data);
 * const tokens = await parser.parse(data);
 * ```
 */
export class TokenParserRegistry implements ITokenParserRegistry {
  private parsers: ITokenParser[] = [];

  /**
   * Register a token parser
   */
  register(parser: ITokenParser): void {
    // Check for duplicates
    const existing = this.parsers.find(p => p.name === parser.name);
    if (existing) {
      console.warn(`[TokenParserRegistry] Parser '${parser.name}' already registered, replacing...`);
      this.parsers = this.parsers.filter(p => p.name !== parser.name);
    }

    this.parsers.push(parser);
    console.log(`[TokenParserRegistry] Registered parser: ${parser.name}`);
  }

  /**
   * Auto-detect the best parser for the given data
   *
   * Returns the parser with the highest confidence score.
   * Returns null if no parser can handle the data (all scores = 0).
   */
  detectParser(data: TokenData): ITokenParser | null {
    if (this.parsers.length === 0) {
      console.error('[TokenParserRegistry] No parsers registered');
      return null;
    }

    // Get confidence scores from all parsers
    const scores = this.parsers.map(parser => ({
      parser,
      score: parser.detectFormat(data)
    }));

    // Sort by score (descending)
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];

    if (best.score === 0) {
      console.warn('[TokenParserRegistry] No parser detected the format');
      return null;
    }

    console.log(
      `[TokenParserRegistry] Detected format: ${best.parser.name} (confidence: ${(best.score * 100).toFixed(0)}%)`
    );

    return best.parser;
  }

  /**
   * Get a parser by name
   */
  getParser(name: string): ITokenParser | undefined {
    return this.parsers.find(p => p.name === name);
  }

  /**
   * List all registered parsers
   */
  listParsers(): ITokenParser[] {
    return [...this.parsers];
  }

  /**
   * Get count of registered parsers
   */
  count(): number {
    return this.parsers.length;
  }

  /**
   * Clear all parsers (useful for testing)
   */
  clear(): void {
    this.parsers = [];
  }
}

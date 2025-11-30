// ====================================================================================
// W3C TOKEN PARSER (Infrastructure Adapter)
// Implements ITokenParser for W3C Design Tokens format
// ====================================================================================

import { ITokenParser } from '../../core/ports/ITokenParser';
import { Token } from '../../core/models/Token';
import { Result, Success, Failure, TokenData } from '../../shared/types';
import { ParseContext } from '../../core/interfaces/ITokenFormatStrategy';
import { W3CTokenFormatStrategy } from '../../core/adapters/W3CTokenFormatStrategy';
import { TokenProcessor } from '../../core/services/TokenProcessor';

/**
 * W3C Token Parser
 *
 * Infrastructure adapter that parses W3C Design Tokens format.
 * Wraps the existing W3CTokenFormatStrategy and TokenProcessor.
 *
 * This adapter implements the ITokenParser port defined by the domain layer,
 * allowing the application layer to be independent of the specific format.
 */
export class W3CTokenParser implements ITokenParser {
  readonly name = 'W3C Design Tokens';

  private strategy: W3CTokenFormatStrategy;
  private processor: TokenProcessor;

  constructor() {
    this.strategy = new W3CTokenFormatStrategy();
    this.processor = new TokenProcessor();
  }

  /**
   * Detect if data is W3C format
   */
  detectFormat(data: TokenData): number {
    return this.strategy.detectFormat(data);
  }

  /**
   * Parse W3C tokens into universal Token model
   */
  async parse(data: TokenData, context?: ParseContext): Promise<Result<Token[]>> {
    try {
      // Use TokenProcessor to convert from format-specific to Token model
      const result = await this.processor.processTokenData(data, {
        projectId: context?.collection || 'default',
        collection: context?.collection,
        filePath: context?.filePath,
        sourceType: 'local',
        sourceLocation: context?.filePath || 'unknown'
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[W3CTokenParser] Parse error: ${message}`);
      return Failure(`Failed to parse W3C tokens: ${message}`);
    }
  }
}

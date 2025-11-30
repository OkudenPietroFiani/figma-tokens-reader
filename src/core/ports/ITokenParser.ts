// ====================================================================================
// TOKEN PARSER PORT (Input Adapter Interface)
// Domain interface for parsing tokens from external formats
// ====================================================================================

import { Token } from '../models/Token';
import { Result, TokenData } from '../../shared/types';
import { ParseContext } from '../interfaces/ITokenFormatStrategy';

/**
 * Port interface for token parsers (input adapters)
 *
 * This is a domain-level abstraction that allows the core business logic
 * to remain independent of specific token formats (W3C, Style Dictionary, etc.)
 *
 * Infrastructure layer implements this interface with concrete parsers.
 *
 * Hexagonal Architecture Pattern:
 * - This is a "port" (interface defined by domain)
 * - Concrete parsers are "adapters" (implementations in infrastructure)
 *
 * Examples of implementations:
 * - W3CTokenParser
 * - StyleDictionaryParser
 * - FigmaTokenReader
 * - TokensStudioParser
 */
export interface ITokenParser {
  /**
   * Human-readable name of the parser
   * e.g., "W3C Design Tokens", "Style Dictionary"
   */
  readonly name: string;

  /**
   * Detect if this parser can handle the given data
   *
   * Returns a confidence score from 0 to 1:
   * - 0.0 = definitely not this format
   * - 0.5 = maybe this format
   * - 1.0 = definitely this format
   *
   * Used by parser registry to auto-detect format.
   *
   * @param data - Raw data to analyze
   * @returns Confidence score 0-1
   */
  detectFormat(data: TokenData): number;

  /**
   * Parse token data into universal Token model
   *
   * Converts format-specific structure into domain Token entities.
   * This is the core responsibility of the parser.
   *
   * @param data - Raw token data (JSON object)
   * @param context - Optional parsing context (file path, collection name)
   * @returns Result containing parsed Token[] or error
   */
  parse(data: TokenData, context?: ParseContext): Promise<Result<Token[]>>;
}

/**
 * Registry interface for managing multiple parsers
 *
 * Allows auto-detection and selection of appropriate parser.
 */
export interface ITokenParserRegistry {
  /**
   * Register a parser
   */
  register(parser: ITokenParser): void;

  /**
   * Auto-detect and return the most suitable parser for the data
   *
   * @param data - Raw token data
   * @returns Parser with highest confidence score
   */
  detectParser(data: TokenData): ITokenParser | null;

  /**
   * Get a parser by name
   */
  getParser(name: string): ITokenParser | undefined;

  /**
   * List all registered parsers
   */
  listParsers(): ITokenParser[];
}

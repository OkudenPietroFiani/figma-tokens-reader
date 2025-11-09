// ====================================================================================
// TOKEN FORMAT STRATEGY INTERFACE
// Abstraction for parsing different token format standards (W3C, Style Dictionary, etc.)
// ====================================================================================

import { Result, TokenData, ProcessedToken } from '../../shared/types';

/**
 * Metadata about a token format
 */
export interface TokenFormatInfo {
  name: string; // 'W3C Design Tokens', 'Style Dictionary', etc.
  version?: string; // Format version
  description?: string;
}

/**
 * Interface for token format parsing strategies
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles format-specific parsing
 * - Open/Closed: Add new formats without modifying existing code
 * - Liskov Substitution: All format strategies are interchangeable
 * - Interface Segregation: Focused on parsing operations only
 * - Dependency Inversion: TokenProcessor depends on this abstraction
 *
 * Implementations: W3CTokenFormatStrategy, StyleDictionaryFormatStrategy
 */
export interface ITokenFormatStrategy {
  /**
   * Detect if the given data matches this format
   *
   * @param data - Raw token data to analyze
   * @returns Confidence score 0-1 (1 = definitely this format)
   */
  detectFormat(data: TokenData): number;

  /**
   * Get information about this token format
   *
   * @returns Format metadata
   */
  getFormatInfo(): TokenFormatInfo;

  /**
   * Parse token data according to this format's rules
   * Extracts tokens from nested structure
   *
   * @param data - Raw token data
   * @returns Array of processed tokens
   */
  parseTokens(data: TokenData): Result<ProcessedToken[]>;

  /**
   * Normalize a token value according to this format's conventions
   * Handles format-specific value transformations
   *
   * @param value - Raw token value
   * @param type - Token type (color, dimension, etc.)
   * @returns Normalized value
   */
  normalizeValue(value: any, type: string): any;

  /**
   * Extract token type from data
   * Different formats may specify types differently
   *
   * @param tokenData - Single token object
   * @param path - Token path for context
   * @returns Token type string
   */
  extractType(tokenData: any, path: string[]): string | null;

  /**
   * Check if a value is a reference/alias in this format
   *
   * @param value - Value to check
   * @returns True if value is a reference
   */
  isReference(value: any): boolean;

  /**
   * Extract reference target from a value
   *
   * @param value - Reference value (e.g., "{color.primary}")
   * @returns Reference path or null
   */
  extractReference(value: any): string | null;
}

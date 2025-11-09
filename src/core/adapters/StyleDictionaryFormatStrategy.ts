// ====================================================================================
// STYLE DICTIONARY FORMAT STRATEGY
// Implements parsing for Style Dictionary format
// ====================================================================================

import { ITokenFormatStrategy, TokenFormatInfo } from '../interfaces/ITokenFormatStrategy';
import { Result, Success, Failure, TokenData, ProcessedToken } from '../../shared/types';

/**
 * Strategy for parsing Style Dictionary format
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles Style Dictionary format parsing
 * - Open/Closed: Implement interface without modifying existing code
 * - Liskov Substitution: Interchangeable with other format strategies
 * - Interface Segregation: Implements focused ITokenFormatStrategy interface
 *
 * Style Dictionary Format Characteristics:
 * - Uses "value" property (not $value)
 * - No $type property (inferred from context)
 * - References use {path.to.token} syntax (same as W3C)
 * - Hierarchical structure with category/type/item organization
 * - Examples: Salesforce Lightning Design System, Adobe Spectrum
 */
export class StyleDictionaryFormatStrategy implements ITokenFormatStrategy {
  /**
   * Detect if data matches Style Dictionary format
   * Looks for characteristic "value" properties (not "$value")
   *
   * @returns Confidence score 0-1
   */
  detectFormat(data: TokenData): number {
    let tokenCount = 0;
    let styleDictTokenCount = 0;

    // Recursively check for Style Dictionary markers
    const check = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        // Skip metadata properties
        if (key.startsWith('$')) continue;

        const value = obj[key];

        // Only check objects
        if (typeof value === 'object' && value !== null) {
          // Check if this is a token (has "value" but not "$value")
          if ('value' in value && !('$value' in value)) {
            tokenCount++;

            // Style Dictionary tokens have "value" property
            if ('value' in value) {
              styleDictTokenCount++;
            }
          } else if (!('value' in value) && !('$value' in value)) {
            // Otherwise, recurse into nested groups
            check(value);
          }
        }
      }
    };

    check(data);

    if (tokenCount === 0) return 0;

    // Calculate confidence based on percentage of Style Dictionary-style tokens
    const score = styleDictTokenCount / tokenCount;

    return Math.min(score, 1);
  }

  /**
   * Get format information
   */
  getFormatInfo(): TokenFormatInfo {
    return {
      name: 'Style Dictionary',
      version: '3.0',
      description: 'Amazon Style Dictionary format'
    };
  }

  /**
   * Parse tokens from Style Dictionary format
   * Traverses nested structure and extracts token definitions
   */
  parseTokens(data: TokenData): Result<ProcessedToken[]> {
    try {
      const tokens: ProcessedToken[] = [];

      const traverse = (obj: any, path: string[] = []) => {
        for (const key in obj) {
          const value = obj[key];
          const currentPath = [...path, key];

          // Skip metadata properties
          if (key.startsWith('$')) continue;

          // Check if this is a token (has "value")
          if (typeof value === 'object' && value !== null && 'value' in value) {
            const type = this.inferType(value.value, currentPath);

            tokens.push({
              path: currentPath,
              value: value.value,
              type: type,
              originalValue: value.value
            });
          }
          // Otherwise, recurse into nested groups
          else if (typeof value === 'object' && value !== null) {
            traverse(value, currentPath);
          }
        }
      };

      traverse(data);

      return Success(tokens);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[StyleDictionaryFormatStrategy] Failed to parse tokens: ${message}`);
      return Failure(message);
    }
  }

  /**
   * Normalize value according to Style Dictionary conventions
   */
  normalizeValue(value: any, type: string): any {
    // Style Dictionary values are typically already normalized
    return value;
  }

  /**
   * Extract token type from Style Dictionary token object
   */
  extractType(tokenData: any, path: string[]): string | null {
    // Style Dictionary doesn't have explicit type property
    // Infer from value and path
    if (tokenData.value !== undefined) {
      return this.inferType(tokenData.value, path);
    }

    return null;
  }

  /**
   * Check if value is a reference in Style Dictionary format
   * Style Dictionary uses {path.to.token} syntax (same as W3C)
   */
  isReference(value: any): boolean {
    if (typeof value !== 'string') return false;

    return /^\{[^}]+\}$/.test(value.trim());
  }

  /**
   * Extract reference path from Style Dictionary reference syntax
   */
  extractReference(value: any): string | null {
    if (!this.isReference(value)) return null;

    const match = value.trim().match(/^\{([^}]+)\}$/);
    return match ? match[1] : null;
  }

  /**
   * Infer token type from value and path
   * Style Dictionary organizes tokens as category/type/item
   *
   * @private
   */
  private inferType(value: any, path: string[]): string {
    const pathStr = path.join('.').toLowerCase();

    // Infer from path (Style Dictionary convention: category/type/item)
    if (path.length > 0) {
      const category = path[0].toLowerCase();

      // Common Style Dictionary categories
      if (category === 'color' || category === 'colors') return 'color';
      if (category === 'size' || category === 'sizing') return 'dimension';
      if (category === 'space' || category === 'spacing') return 'spacing';
      if (category === 'font') {
        if (pathStr.includes('size')) return 'fontSize';
        if (pathStr.includes('weight')) return 'fontWeight';
        if (pathStr.includes('family')) return 'fontFamily';
        return 'fontFamily';
      }
      if (category === 'time' || category === 'duration') return 'duration';
    }

    // Infer from path keywords
    if (pathStr.includes('color')) return 'color';
    if (pathStr.includes('size')) return 'fontSize';
    if (pathStr.includes('spacing') || pathStr.includes('space')) return 'spacing';
    if (pathStr.includes('radius')) return 'dimension';
    if (pathStr.includes('shadow')) return 'shadow';

    // Infer from value type
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      // Check for color patterns
      if (/^#[0-9a-f]{3,8}$/i.test(value)) return 'color';
      if (/^rgb/.test(value)) return 'color';
      if (/^hsl/.test(value)) return 'color';

      // Check for dimension units
      if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(value)) return 'dimension';

      return 'string';
    }

    // Check for object formats
    if (typeof value === 'object' && value !== null) {
      // Color space format
      if ('r' in value && 'g' in value && 'b' in value) return 'color';

      // Shadow format
      if ('x' in value || 'offsetX' in value) return 'shadow';

      // Typography format
      if ('fontFamily' in value || 'fontSize' in value) return 'typography';
    }

    return 'string';
  }
}

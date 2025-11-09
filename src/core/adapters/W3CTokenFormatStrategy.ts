// ====================================================================================
// W3C TOKEN FORMAT STRATEGY
// Implements parsing for W3C Design Tokens format
// ====================================================================================

import { ITokenFormatStrategy, TokenFormatInfo } from '../interfaces/ITokenFormatStrategy';
import { Result, Success, Failure, TokenData, ProcessedToken } from '../../shared/types';

/**
 * Strategy for parsing W3C Design Tokens format
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles W3C format parsing
 * - Open/Closed: Implement interface without modifying existing code
 * - Liskov Substitution: Interchangeable with other format strategies
 * - Interface Segregation: Implements focused ITokenFormatStrategy interface
 *
 * W3C Format Characteristics:
 * - Uses $value, $type, $description properties
 * - References use {path.to.token} syntax
 * - Hierarchical structure with nested groups
 */
export class W3CTokenFormatStrategy implements ITokenFormatStrategy {
  /**
   * Detect if data matches W3C format
   * Looks for characteristic $value, $type properties
   *
   * @returns Confidence score 0-1
   */
  detectFormat(data: TokenData): number {
    let tokenCount = 0;
    let w3cTokenCount = 0;

    // Recursively check for W3C markers
    const check = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key in obj) {
        // Skip metadata properties
        if (key.startsWith('$')) continue;

        const value = obj[key];

        // Only check objects
        if (typeof value === 'object' && value !== null) {
          // Check if this is a token (has $value)
          if ('$value' in value) {
            tokenCount++;

            // Check if it's W3C format (has $value or $type)
            if ('$value' in value || '$type' in value) {
              w3cTokenCount++;
            }
          } else {
            // Otherwise, recurse into nested groups
            check(value);
          }
        }
      }
    };

    check(data);

    if (tokenCount === 0) return 0;

    // Calculate confidence based on percentage of W3C-style tokens
    const score = w3cTokenCount / tokenCount;

    return Math.min(score, 1);
  }

  /**
   * Get format information
   */
  getFormatInfo(): TokenFormatInfo {
    return {
      name: 'W3C Design Tokens',
      version: '1.0',
      description: 'W3C Design Tokens Community Group format'
    };
  }

  /**
   * Parse tokens from W3C format
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

          // Check if this is a token (has $value)
          if (typeof value === 'object' && value !== null && '$value' in value) {
            const type = value.$type || this.inferType(value.$value, currentPath);

            tokens.push({
              path: currentPath,
              value: value.$value,
              type: type,
              originalValue: value.$value
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
      console.error(`[W3CTokenFormatStrategy] Failed to parse tokens: ${message}`);
      return Failure(message);
    }
  }

  /**
   * Normalize value according to W3C conventions
   * Currently passes through - format-specific transformations can be added
   */
  normalizeValue(value: any, type: string): any {
    return value;
  }

  /**
   * Extract token type from W3C token object
   */
  extractType(tokenData: any, path: string[]): string | null {
    // W3C uses $type property
    if (tokenData.$type) {
      return tokenData.$type;
    }

    // Infer from value if not specified
    if (tokenData.$value !== undefined) {
      return this.inferType(tokenData.$value, path);
    }

    return null;
  }

  /**
   * Check if value is a reference in W3C format
   * W3C references use {path.to.token} syntax
   */
  isReference(value: any): boolean {
    if (typeof value !== 'string') return false;

    return /^\{[^}]+\}$/.test(value.trim());
  }

  /**
   * Extract reference path from W3C reference syntax
   */
  extractReference(value: any): string | null {
    if (!this.isReference(value)) return null;

    const match = value.trim().match(/^\{([^}]+)\}$/);
    return match ? match[1] : null;
  }

  /**
   * Infer token type from value and path
   * Used when $type is not specified
   *
   * @private
   */
  private inferType(value: any, path: string[]): string {
    const pathStr = path.join('.').toLowerCase();

    // Infer from path
    if (pathStr.includes('color') || pathStr.includes('colour')) return 'color';
    if (pathStr.includes('spacing') || pathStr.includes('space')) return 'spacing';
    if (pathStr.includes('font-size') || pathStr.includes('fontsize')) return 'fontSize';
    if (pathStr.includes('font-weight') || pathStr.includes('fontweight')) return 'fontWeight';
    if (pathStr.includes('font-family') || pathStr.includes('fontfamily')) return 'fontFamily';
    if (pathStr.includes('line-height') || pathStr.includes('lineheight')) return 'lineHeight';
    if (pathStr.includes('dimension') || pathStr.includes('size')) return 'dimension';
    if (pathStr.includes('shadow')) return 'shadow';

    // Infer from value type
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      // Check for color patterns
      if (/^#[0-9a-f]{3,8}$/i.test(value)) return 'color';
      if (/^rgb/.test(value)) return 'color';
      if (/^hsl/.test(value)) return 'color';

      // Check for dimension units
      if (/^\d+(\.\d+)?(px|rem|em)$/.test(value)) return 'dimension';

      return 'string';
    }

    // Check for object formats
    if (typeof value === 'object' && value !== null) {
      // Color space format
      if ('colorSpace' in value || ('components' in value && 'alpha' in value)) return 'color';

      // Shadow format
      if ('blur' in value || 'offsetX' in value) return 'shadow';

      // Typography format
      if ('fontFamily' in value || 'fontSize' in value) return 'typography';
    }

    return 'string';
  }
}

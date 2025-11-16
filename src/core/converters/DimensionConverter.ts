// ====================================================================================
// DIMENSION CONVERTER
// Type-safe dimension conversions between units
// ====================================================================================

import { Result, Success, Failure } from '../../shared/types';
import { DimensionConverter as IDimensionConverter } from './types';
import { DimensionValue } from '../models/Token';

/**
 * Type-safe dimension converter
 * Handles conversions between px, rem, em, %, pt
 *
 * Features:
 * - Multiple unit support
 * - Configurable base font size
 * - Result pattern for error handling
 * - Type-safe conversions
 */
export class DimensionConverter implements IDimensionConverter {
  private readonly DEFAULT_BASE_FONT_SIZE = 16; // px

  /**
   * Convert any dimension format to pixels
   */
  toPixels(input: any, baseFontSize: number = this.DEFAULT_BASE_FONT_SIZE): Result<number> {
    try {
      // Handle DimensionValue object
      if (this.isDimensionValue(input)) {
        return this.dimensionValueToPixels(input, baseFontSize);
      }

      // Handle number (assumed to be pixels)
      if (typeof input === 'number') {
        return Success(input);
      }

      // Handle string
      if (typeof input === 'string') {
        const parseResult = this.parse(input);
        if (!parseResult.success) {
          return Failure(parseResult.error || 'Failed to parse dimension');
        }

        const { value, unit } = parseResult.data!;
        return this.convertToPixels(value, unit, baseFontSize);
      }

      // Handle object with value property
      if (typeof input === 'object' && input !== null && 'value' in input) {
        if ('unit' in input) {
          return this.convertToPixels(input.value, input.unit, baseFontSize);
        }
        return this.toPixels(input.value, baseFontSize);
      }

      return Failure(`Unsupported dimension format: ${JSON.stringify(input)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Dimension conversion failed: ${message}`);
    }
  }

  /**
   * Convert dimension to rem
   */
  toRem(input: any, baseFontSize: number = this.DEFAULT_BASE_FONT_SIZE): Result<number> {
    const pixelsResult = this.toPixels(input, baseFontSize);
    if (!pixelsResult.success) {
      return Failure(pixelsResult.error || 'Failed to convert to pixels');
    }

    const pixels = pixelsResult.data!;
    return Success(pixels / baseFontSize);
  }

  /**
   * Parse dimension string to value and unit
   */
  parse(input: string): Result<{ value: number; unit: string }> {
    // Trim whitespace
    const trimmed = input.trim();

    // Match number followed by optional unit
    const match = trimmed.match(/^(-?[\d.]+)\s*([a-z%]*)$/i);

    if (!match) {
      return Failure(`Invalid dimension format: ${input}`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2] || 'px'; // Default to px if no unit

    if (isNaN(value)) {
      return Failure(`Invalid dimension value: ${match[1]}`);
    }

    // Validate unit
    const validUnits = ['px', 'rem', 'em', '%', 'pt', ''];
    if (!validUnits.includes(unit)) {
      return Failure(`Unsupported unit: ${unit}`);
    }

    return Success({ value, unit: unit || 'px' });
  }

  /**
   * Validate dimension input
   */
  validate(input: any): Result<boolean> {
    const result = this.toPixels(input);
    return result.success ? Success(true) : Success(false);
  }

  // ==================== PRIVATE CONVERSION METHODS ====================

  /**
   * Convert DimensionValue to pixels
   */
  private dimensionValueToPixels(
    dimValue: DimensionValue,
    baseFontSize: number
  ): Result<number> {
    return this.convertToPixels(dimValue.value, dimValue.unit, baseFontSize);
  }

  /**
   * Convert value from specific unit to pixels
   */
  private convertToPixels(value: number, unit: string, baseFontSize: number): Result<number> {
    switch (unit.toLowerCase()) {
      case 'px':
        return Success(value);

      case 'rem':
        return Success(value * baseFontSize);

      case 'em':
        // Em is relative to parent font size
        // Without parent context, we use base font size
        return Success(value * baseFontSize);

      case 'pt':
        // 1pt = 1.333333px (CSS standard)
        return Success(value * 1.333333);

      case '%':
        // Percentage requires context (parent size)
        // Return percentage of base font size as fallback
        return Success((value / 100) * baseFontSize);

      case '':
        // No unit, assume pixels
        return Success(value);

      default:
        return Failure(`Unsupported unit: ${unit}`);
    }
  }

  // ==================== TYPE GUARDS ====================

  /**
   * Check if value is DimensionValue
   */
  private isDimensionValue(value: any): value is DimensionValue {
    return (
      typeof value === 'object' &&
      value !== null &&
      'value' in value &&
      'unit' in value &&
      typeof value.value === 'number' &&
      typeof value.unit === 'string'
    );
  }
}

/**
 * Singleton instance
 */
export const dimensionConverter = new DimensionConverter();

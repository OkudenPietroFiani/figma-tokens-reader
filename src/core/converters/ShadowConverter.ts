// ====================================================================================
// SHADOW CONVERTER
// Type-safe shadow conversions to Figma format
// ====================================================================================

import { Result, Success, Failure } from '../../shared/types';
import { ShadowConverter as IShadowConverter, FigmaShadow } from './types';
import { ShadowValue } from '../models/Token';
import { colorConverter } from './ColorConverter';
import { dimensionConverter } from './DimensionConverter';

/**
 * Type-safe shadow converter
 * Converts shadow values to Figma format
 *
 * Features:
 * - Handles W3C shadow format
 * - Converts shadow properties to Figma types
 * - Result pattern for error handling
 * - Type-safe conversions
 */
export class ShadowConverter implements IShadowConverter {
  /**
   * Convert shadow value to Figma format
   */
  toFigma(input: any): Result<FigmaShadow> {
    try {
      // Handle ShadowValue object
      if (this.isShadowValue(input)) {
        return this.shadowValueToFigma(input);
      }

      // Handle generic object
      if (typeof input === 'object' && input !== null) {
        return this.objectToFigma(input);
      }

      return Failure(`Unsupported shadow format: ${JSON.stringify(input)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Shadow conversion failed: ${message}`);
    }
  }

  /**
   * Validate shadow input
   */
  validate(input: any): Result<boolean> {
    const result = this.toFigma(input);
    return result.success ? Success(true) : Success(false);
  }

  // ==================== PRIVATE CONVERSION METHODS ====================

  /**
   * Convert ShadowValue to Figma format
   */
  private shadowValueToFigma(shadowValue: ShadowValue): Result<FigmaShadow> {
    // Convert offsetX
    const offsetXResult = this.convertDimension(shadowValue.offsetX);
    if (!offsetXResult.success) {
      return Failure(`Failed to convert offsetX: ${offsetXResult.error}`);
    }

    // Convert offsetY
    const offsetYResult = this.convertDimension(shadowValue.offsetY);
    if (!offsetYResult.success) {
      return Failure(`Failed to convert offsetY: ${offsetYResult.error}`);
    }

    // Convert blur
    const blurResult = this.convertDimension(shadowValue.blur);
    if (!blurResult.success) {
      return Failure(`Failed to convert blur: ${blurResult.error}`);
    }

    // Convert spread (optional)
    let spread = 0;
    if (shadowValue.spread !== undefined) {
      const spreadResult = this.convertDimension(shadowValue.spread);
      if (spreadResult.success) {
        spread = spreadResult.data!;
      }
    }

    // Convert color
    const colorResult = colorConverter.toRGB(shadowValue.color);
    if (!colorResult.success) {
      return Failure(`Failed to convert shadow color: ${colorResult.error}`);
    }

    // Get inset value
    const inset = shadowValue.inset !== undefined ? shadowValue.inset : false;

    return Success({
      offsetX: offsetXResult.data!,
      offsetY: offsetYResult.data!,
      blur: blurResult.data!,
      spread,
      color: colorResult.data!,
      inset,
    });
  }

  /**
   * Convert generic object to Figma shadow
   */
  private objectToFigma(obj: any): Result<FigmaShadow> {
    // Check for required shadow properties
    if (!this.hasRequiredProperties(obj)) {
      return Failure(
        'Shadow object missing required properties (offsetX, offsetY, blur, color)'
      );
    }

    return this.shadowValueToFigma(obj as ShadowValue);
  }

  /**
   * Convert dimension value (number or string) to pixels
   */
  private convertDimension(value: number | string): Result<number> {
    // Handle number (already in pixels)
    if (typeof value === 'number') {
      return Success(value);
    }

    // Handle string with unit
    if (typeof value === 'string') {
      return dimensionConverter.toPixels(value);
    }

    return Failure(`Invalid dimension value: ${JSON.stringify(value)}`);
  }

  /**
   * Check if object has required shadow properties
   */
  private hasRequiredProperties(obj: any): boolean {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'offsetX' in obj &&
      'offsetY' in obj &&
      'blur' in obj &&
      'color' in obj
    );
  }

  // ==================== TYPE GUARDS ====================

  /**
   * Check if value is ShadowValue
   */
  private isShadowValue(value: any): value is ShadowValue {
    return this.hasRequiredProperties(value);
  }
}

/**
 * Singleton instance
 */
export const shadowConverter = new ShadowConverter();

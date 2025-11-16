// ====================================================================================
// TYPOGRAPHY CONVERTER
// Type-safe typography conversions to Figma format
// ====================================================================================

import { Result, Success, Failure } from '../../shared/types';
import { TypographyConverter as ITypographyConverter, FigmaTypography } from './types';
import { TypographyValue } from '../models/Token';
import { dimensionConverter } from './DimensionConverter';

/**
 * Type-safe typography converter
 * Converts typography values to Figma format
 *
 * Features:
 * - Handles composite typography objects
 * - Converts individual typography properties
 * - Result pattern for error handling
 * - Type-safe conversions
 */
export class TypographyConverter implements ITypographyConverter {
  private readonly DEFAULT_BASE_FONT_SIZE = 16;
  private readonly DEFAULT_FONT_FAMILY = 'Inter';
  private readonly DEFAULT_FONT_SIZE = 16;
  private readonly DEFAULT_FONT_WEIGHT = 400;

  /**
   * Convert typography value to Figma format
   */
  toFigma(input: any, baseFontSize: number = this.DEFAULT_BASE_FONT_SIZE): Result<FigmaTypography> {
    try {
      // Handle TypographyValue object
      if (this.isTypographyValue(input)) {
        return this.typographyValueToFigma(input, baseFontSize);
      }

      // Handle object with typography properties
      if (typeof input === 'object' && input !== null) {
        return this.objectToFigma(input, baseFontSize);
      }

      return Failure(`Unsupported typography format: ${JSON.stringify(input)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Typography conversion failed: ${message}`);
    }
  }

  /**
   * Extract font family from typography value
   */
  getFontFamily(input: any): Result<string> {
    try {
      // Handle direct string
      if (typeof input === 'string') {
        return Success(this.parseFontFamily(input));
      }

      // Handle array (font stack)
      if (Array.isArray(input)) {
        return Success(input[0] ? String(input[0]) : this.DEFAULT_FONT_FAMILY);
      }

      // Handle object with fontFamily
      if (typeof input === 'object' && input !== null && input.fontFamily) {
        return this.getFontFamily(input.fontFamily);
      }

      // Handle object with value property
      if (typeof input === 'object' && input !== null && 'value' in input) {
        return this.getFontFamily(input.value);
      }

      return Failure(`Cannot extract font family from: ${JSON.stringify(input)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Font family extraction failed: ${message}`);
    }
  }

  /**
   * Extract font size from typography value
   */
  getFontSize(input: any, baseFontSize: number = this.DEFAULT_BASE_FONT_SIZE): Result<number> {
    try {
      // Handle number (pixels)
      if (typeof input === 'number') {
        return Success(input);
      }

      // Handle string (with unit)
      if (typeof input === 'string') {
        return dimensionConverter.toPixels(input, baseFontSize);
      }

      // Handle DimensionValue
      if (typeof input === 'object' && input !== null && 'value' in input && 'unit' in input) {
        return dimensionConverter.toPixels(input, baseFontSize);
      }

      // Handle object with fontSize
      if (typeof input === 'object' && input !== null && input.fontSize) {
        return this.getFontSize(input.fontSize, baseFontSize);
      }

      return Failure(`Cannot extract font size from: ${JSON.stringify(input)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Font size extraction failed: ${message}`);
    }
  }

  /**
   * Extract font weight from typography value
   */
  getFontWeight(input: any): Result<number> {
    try {
      // Handle number
      if (typeof input === 'number') {
        return this.normalizeFontWeight(input);
      }

      // Handle string (named weight or number)
      if (typeof input === 'string') {
        return this.parseFontWeight(input);
      }

      // Handle object with fontWeight
      if (typeof input === 'object' && input !== null && input.fontWeight) {
        return this.getFontWeight(input.fontWeight);
      }

      // Handle object with value property
      if (typeof input === 'object' && input !== null && 'value' in input) {
        return this.getFontWeight(input.value);
      }

      return Failure(`Cannot extract font weight from: ${JSON.stringify(input)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Font weight extraction failed: ${message}`);
    }
  }

  /**
   * Validate typography input
   */
  validate(input: any): Result<boolean> {
    const result = this.toFigma(input);
    return result.success ? Success(true) : Success(false);
  }

  // ==================== PRIVATE CONVERSION METHODS ====================

  /**
   * Convert TypographyValue to Figma format
   */
  private typographyValueToFigma(
    typoValue: TypographyValue,
    baseFontSize: number
  ): Result<FigmaTypography> {
    const figmaTypo: FigmaTypography = {
      fontFamily: this.DEFAULT_FONT_FAMILY,
      fontSize: this.DEFAULT_FONT_SIZE,
      fontWeight: this.DEFAULT_FONT_WEIGHT,
    };

    // Font family
    if (typoValue.fontFamily) {
      const familyResult = this.getFontFamily(typoValue.fontFamily);
      if (familyResult.success) {
        figmaTypo.fontFamily = familyResult.data!;
      }
    }

    // Font size
    if (typoValue.fontSize) {
      const sizeResult = this.getFontSize(typoValue.fontSize, baseFontSize);
      if (sizeResult.success) {
        figmaTypo.fontSize = sizeResult.data!;
      }
    }

    // Font weight
    if (typoValue.fontWeight) {
      const weightResult = this.getFontWeight(typoValue.fontWeight);
      if (weightResult.success) {
        figmaTypo.fontWeight = weightResult.data!;
      }
    }

    // Line height
    if (typoValue.lineHeight) {
      const lineHeightResult = this.convertLineHeight(typoValue.lineHeight, baseFontSize);
      if (lineHeightResult.success) {
        figmaTypo.lineHeight = lineHeightResult.data!;
      }
    }

    // Letter spacing
    if (typoValue.letterSpacing) {
      const letterSpacingResult = this.convertLetterSpacing(typoValue.letterSpacing, baseFontSize);
      if (letterSpacingResult.success) {
        figmaTypo.letterSpacing = letterSpacingResult.data!;
      }
    }

    return Success(figmaTypo);
  }

  /**
   * Convert generic object to Figma typography
   */
  private objectToFigma(obj: any, baseFontSize: number): Result<FigmaTypography> {
    return this.typographyValueToFigma(obj as TypographyValue, baseFontSize);
  }

  /**
   * Parse font family string
   * Handles comma-separated font stacks
   */
  private parseFontFamily(value: string): string {
    if (value.includes(',')) {
      return value.split(',')[0].trim().replace(/['"]/g, '');
    }
    return value.trim().replace(/['"]/g, '');
  }

  /**
   * Parse font weight string to number
   */
  private parseFontWeight(value: string): Result<number> {
    // Try parsing as number first
    const parsed = parseInt(value);
    if (!isNaN(parsed)) {
      return this.normalizeFontWeight(parsed);
    }

    // Map named weights
    const weightMap: Record<string, number> = {
      thin: 100,
      hairline: 100,
      extralight: 200,
      ultralight: 200,
      light: 300,
      normal: 400,
      regular: 400,
      medium: 500,
      semibold: 600,
      demibold: 600,
      bold: 700,
      extrabold: 800,
      ultrabold: 800,
      black: 900,
      heavy: 900,
    };

    const normalized = value.toLowerCase().trim();
    if (normalized in weightMap) {
      return Success(weightMap[normalized]);
    }

    return Failure(`Unknown font weight: ${value}`);
  }

  /**
   * Normalize font weight to valid range (100-900)
   */
  private normalizeFontWeight(weight: number): Result<number> {
    // Round to nearest 100
    const rounded = Math.round(weight / 100) * 100;

    // Clamp to valid range
    const clamped = Math.max(100, Math.min(900, rounded));

    return Success(clamped);
  }

  /**
   * Convert line height to Figma format
   */
  private convertLineHeight(
    value: any,
    baseFontSize: number
  ): Result<number | { value: number; unit: 'PIXELS' | 'PERCENT' | 'AUTO' }> {
    // Handle 'normal' or 'AUTO'
    if (typeof value === 'string' && (value.toLowerCase() === 'normal' || value.toLowerCase() === 'auto')) {
      return Success({ value: 0, unit: 'AUTO' });
    }

    // Handle number (unitless - multiplier)
    if (typeof value === 'number') {
      return Success({ value: value * 100, unit: 'PERCENT' });
    }

    // Handle string with unit
    if (typeof value === 'string') {
      const pixelsResult = dimensionConverter.toPixels(value, baseFontSize);
      if (pixelsResult.success) {
        return Success({ value: pixelsResult.data!, unit: 'PIXELS' });
      }
    }

    // Handle DimensionValue
    if (typeof value === 'object' && value !== null && 'value' in value && 'unit' in value) {
      const pixelsResult = dimensionConverter.toPixels(value, baseFontSize);
      if (pixelsResult.success) {
        return Success({ value: pixelsResult.data!, unit: 'PIXELS' });
      }
    }

    return Failure(`Cannot convert line height: ${JSON.stringify(value)}`);
  }

  /**
   * Convert letter spacing to Figma format
   */
  private convertLetterSpacing(
    value: any,
    baseFontSize: number
  ): Result<number | { value: number; unit: 'PIXELS' | 'PERCENT' }> {
    // Handle number (pixels)
    if (typeof value === 'number') {
      return Success({ value, unit: 'PIXELS' });
    }

    // Handle string with unit
    if (typeof value === 'string') {
      const pixelsResult = dimensionConverter.toPixels(value, baseFontSize);
      if (pixelsResult.success) {
        return Success({ value: pixelsResult.data!, unit: 'PIXELS' });
      }
    }

    // Handle DimensionValue
    if (typeof value === 'object' && value !== null && 'value' in value && 'unit' in value) {
      const pixelsResult = dimensionConverter.toPixels(value, baseFontSize);
      if (pixelsResult.success) {
        return Success({ value: pixelsResult.data!, unit: 'PIXELS' });
      }
    }

    return Failure(`Cannot convert letter spacing: ${JSON.stringify(value)}`);
  }

  // ==================== TYPE GUARDS ====================

  /**
   * Check if value is TypographyValue
   */
  private isTypographyValue(value: any): value is TypographyValue {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value.fontFamily !== undefined ||
        value.fontSize !== undefined ||
        value.fontWeight !== undefined ||
        value.lineHeight !== undefined ||
        value.letterSpacing !== undefined)
    );
  }
}

/**
 * Singleton instance
 */
export const typographyConverter = new TypographyConverter();

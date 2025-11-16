// ====================================================================================
// TYPE-SAFE CONVERTERS
// Convert token values with proper type safety and error handling
// ====================================================================================

import { Result } from '../../shared/types';

/**
 * RGB color representation (0-1 normalized)
 * Used for Figma API which expects normalized RGB values
 */
export interface RGB {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1
}

/**
 * RGBA color representation (0-255 for RGB, 0-1 for alpha)
 * Used for web standards (CSS rgba())
 */
export interface RGBA {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

/**
 * HSL color representation
 */
export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
  a?: number; // 0-1
}

/**
 * Pixel dimensions
 */
export interface Pixels {
  value: number;
  unit: 'px';
}

/**
 * Typography properties in Figma format
 */
export interface FigmaTypography {
  fontFamily: string;
  fontSize: number; // pixels
  fontWeight: number; // 100-900
  lineHeight?: number | { value: number; unit: 'PIXELS' | 'PERCENT' | 'AUTO' };
  letterSpacing?: number | { value: number; unit: 'PIXELS' | 'PERCENT' };
}

/**
 * Shadow properties in Figma format
 */
export interface FigmaShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: RGB;
  inset: boolean;
}

/**
 * Conversion error details
 */
export interface ConversionError {
  code: string;
  message: string;
  input: any;
  expectedType: string;
}

/**
 * Base converter interface
 * All converters follow this pattern for consistency
 */
export interface Converter<TInput, TOutput> {
  /**
   * Convert input to output
   * @param input - Input value
   * @returns Result with output or error
   */
  convert(input: TInput): Result<TOutput>;

  /**
   * Validate input without conversion
   * @param input - Input value
   * @returns Result with boolean
   */
  validate(input: TInput): Result<boolean>;
}

/**
 * Color converter interface
 * Converts between different color formats
 */
export interface ColorConverter {
  /**
   * Convert any color format to normalized RGB (0-1)
   * @param input - Color in any supported format
   * @returns Result<RGB>
   */
  toRGB(input: any): Result<RGB>;

  /**
   * Convert any color format to RGBA (0-255 for RGB)
   * @param input - Color in any supported format
   * @returns Result<RGBA>
   */
  toRGBA(input: any): Result<RGBA>;

  /**
   * Convert any color format to hex string
   * @param input - Color in any supported format
   * @returns Result<string> - Hex color (#RRGGBB or #RRGGBBAA)
   */
  toHex(input: any): Result<string>;

  /**
   * Convert any color format to HSL
   * @param input - Color in any supported format
   * @returns Result<HSL>
   */
  toHSL(input: any): Result<HSL>;

  /**
   * Validate color input
   * @param input - Color value
   * @returns Result<boolean>
   */
  validate(input: any): Result<boolean>;
}

/**
 * Dimension converter interface
 * Converts between different dimension units
 */
export interface DimensionConverter {
  /**
   * Convert any dimension format to pixels
   * @param input - Dimension in any supported format
   * @param baseFontSize - Base font size for rem/em conversion (default: 16)
   * @returns Result<number> - Value in pixels
   */
  toPixels(input: any, baseFontSize?: number): Result<number>;

  /**
   * Convert dimension to rem
   * @param input - Dimension value
   * @param baseFontSize - Base font size (default: 16)
   * @returns Result<number> - Value in rem
   */
  toRem(input: any, baseFontSize?: number): Result<number>;

  /**
   * Parse dimension string to value and unit
   * @param input - Dimension string (e.g., "16px", "1.5rem")
   * @returns Result<{ value: number; unit: string }>
   */
  parse(input: string): Result<{ value: number; unit: string }>;

  /**
   * Validate dimension input
   * @param input - Dimension value
   * @returns Result<boolean>
   */
  validate(input: any): Result<boolean>;
}

/**
 * Typography converter interface
 * Converts typography values to Figma format
 */
export interface TypographyConverter {
  /**
   * Convert typography value to Figma format
   * @param input - Typography value
   * @param baseFontSize - Base font size for conversions
   * @returns Result<FigmaTypography>
   */
  toFigma(input: any, baseFontSize?: number): Result<FigmaTypography>;

  /**
   * Extract font family from typography value
   * @param input - Typography or font family value
   * @returns Result<string>
   */
  getFontFamily(input: any): Result<string>;

  /**
   * Extract font size from typography value
   * @param input - Typography or font size value
   * @param baseFontSize - Base font size for conversions
   * @returns Result<number> - Font size in pixels
   */
  getFontSize(input: any, baseFontSize?: number): Result<number>;

  /**
   * Extract font weight from typography value
   * @param input - Typography or font weight value
   * @returns Result<number> - Font weight (100-900)
   */
  getFontWeight(input: any): Result<number>;

  /**
   * Validate typography input
   * @param input - Typography value
   * @returns Result<boolean>
   */
  validate(input: any): Result<boolean>;
}

/**
 * Shadow converter interface
 * Converts shadow values to Figma format
 */
export interface ShadowConverter {
  /**
   * Convert shadow value to Figma format
   * @param input - Shadow value
   * @returns Result<FigmaShadow>
   */
  toFigma(input: any): Result<FigmaShadow>;

  /**
   * Validate shadow input
   * @param input - Shadow value
   * @returns Result<boolean>
   */
  validate(input: any): Result<boolean>;
}

/**
 * Converter registry
 * Central registry for all converters
 */
export interface ConverterRegistry {
  color: ColorConverter;
  dimension: DimensionConverter;
  typography: TypographyConverter;
  shadow: ShadowConverter;
}

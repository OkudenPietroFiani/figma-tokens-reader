// ====================================================================================
// CONVERTERS INDEX
// Export all type-safe converters
// ====================================================================================

// Export types
export type {
  RGB,
  RGBA,
  HSL,
  Pixels,
  FigmaTypography,
  FigmaShadow,
  ConversionError,
  Converter,
  ColorConverter,
  DimensionConverter,
  TypographyConverter,
  ShadowConverter,
  ConverterRegistry,
} from './types';

// Export converter implementations (classes only, not interfaces)
export { ColorConverter as ColorConverterClass, colorConverter } from './ColorConverter';
export { DimensionConverter as DimensionConverterClass, dimensionConverter } from './DimensionConverter';
export { TypographyConverter as TypographyConverterClass, typographyConverter } from './TypographyConverter';
export { ShadowConverter as ShadowConverterClass, shadowConverter } from './ShadowConverter';

import { colorConverter } from './ColorConverter';
import { dimensionConverter } from './DimensionConverter';
import { typographyConverter } from './TypographyConverter';
import { shadowConverter } from './ShadowConverter';
import { ConverterRegistry } from './types';

/**
 * Converter registry with all converters
 * Single import point for all conversion needs
 *
 * Usage:
 * ```typescript
 * import { converters } from '@/core/converters';
 *
 * const rgbResult = converters.color.toRGB('#1e40af');
 * const pixelsResult = converters.dimension.toPixels('1.5rem');
 * ```
 */
export const converters: ConverterRegistry = {
  color: colorConverter,
  dimension: dimensionConverter,
  typography: typographyConverter,
  shadow: shadowConverter,
};

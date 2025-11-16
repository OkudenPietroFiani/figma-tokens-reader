// ====================================================================================
// COLOR CONVERTER
// Type-safe color conversions with comprehensive error handling
// ====================================================================================

import { Result, Success, Failure } from '../../shared/types';
import { ColorConverter as IColorConverter, RGB, RGBA, HSL, ConversionError } from './types';
import { ColorValue } from '../models/Token';

/**
 * Type-safe color converter
 * Handles all color formats: hex, rgb, rgba, hsl, hsla, colorSpace objects
 *
 * Features:
 * - Comprehensive format support
 * - Detailed error messages
 * - Result pattern for error handling
 * - Type-safe conversions
 */
export class ColorConverter implements IColorConverter {
  /**
   * Convert any color format to normalized RGB (0-1)
   * Used by Figma API
   */
  toRGB(input: any): Result<RGB> {
    try {
      // Handle ColorValue object
      if (this.isColorValue(input)) {
        return this.colorValueToRGB(input);
      }

      // Handle hex string
      if (typeof input === 'string' && input.startsWith('#')) {
        return this.hexToRGB(input);
      }

      // Handle rgb/rgba string
      if (typeof input === 'string' && input.startsWith('rgb')) {
        return this.rgbStringToRGB(input);
      }

      // Handle hsl/hsla string
      if (typeof input === 'string' && input.startsWith('hsl')) {
        return this.hslStringToRGB(input);
      }

      // Handle colorSpace object format
      if (this.isColorSpaceObject(input)) {
        return this.colorSpaceToRGB(input);
      }

      // Handle components array without colorSpace (W3C format)
      // Example: { components: [255, 128, 0], alpha: 1 }
      if ('components' in input && Array.isArray(input.components) && !('colorSpace' in input)) {
        const [r, g, b] = input.components;
        const a = typeof input.alpha === 'number' ? input.alpha : 1;
        return Success({
          r: r / 255,
          g: g / 255,
          b: b / 255,
          a,
        });
      }

      // Handle object with value property
      if (typeof input === 'object' && input !== null && 'value' in input) {
        return this.toRGB(input.value);
      }

      return Failure(`Unsupported color format: ${JSON.stringify(input)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Color conversion failed: ${message}`);
    }
  }

  /**
   * Convert any color format to RGBA (0-255)
   * Used for web standards
   */
  toRGBA(input: any): Result<RGBA> {
    const rgbResult = this.toRGB(input);
    if (!rgbResult.success) {
      return Failure(rgbResult.error || 'Failed to convert to RGB');
    }

    const rgb = rgbResult.data!;
    return Success({
      r: Math.round(rgb.r * 255),
      g: Math.round(rgb.g * 255),
      b: Math.round(rgb.b * 255),
      a: rgb.a,
    });
  }

  /**
   * Convert any color format to hex string
   */
  toHex(input: any): Result<string> {
    const rgbResult = this.toRGB(input);
    if (!rgbResult.success) {
      return Failure(rgbResult.error || 'Failed to convert to RGB');
    }

    const rgb = rgbResult.data!;
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    const a = Math.round(rgb.a * 255);

    // Include alpha if not fully opaque
    if (rgb.a < 1) {
      return Success(
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
          .toString(16)
          .padStart(2, '0')}${a.toString(16).padStart(2, '0')}`
      );
    }

    return Success(
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
        .toString(16)
        .padStart(2, '0')}`
    );
  }

  /**
   * Convert any color format to HSL
   */
  toHSL(input: any): Result<HSL> {
    const rgbResult = this.toRGB(input);
    if (!rgbResult.success) {
      return Failure(rgbResult.error || 'Failed to convert to RGB');
    }

    const rgb = rgbResult.data!;
    return Success(this.rgbToHsl(rgb));
  }

  /**
   * Validate color input
   */
  validate(input: any): Result<boolean> {
    const result = this.toRGB(input);
    return result.success ? Success(true) : Success(false);
  }

  // ==================== PRIVATE CONVERSION METHODS ====================

  /**
   * Convert ColorValue to RGB
   */
  private colorValueToRGB(colorValue: ColorValue): Result<RGB> {
    // Try hex first
    if (colorValue.hex) {
      return this.hexToRGB(colorValue.hex);
    }

    // Try RGB values
    if (
      colorValue.r !== undefined &&
      colorValue.g !== undefined &&
      colorValue.b !== undefined
    ) {
      return Success({
        r: colorValue.r / 255,
        g: colorValue.g / 255,
        b: colorValue.b / 255,
        a: colorValue.a !== undefined ? colorValue.a : 1,
      });
    }

    // Try HSL values
    if (
      colorValue.h !== undefined &&
      colorValue.s !== undefined &&
      colorValue.l !== undefined
    ) {
      const h = colorValue.h / 360;
      const s = colorValue.s / 100;
      const l = colorValue.l / 100;
      const a = colorValue.a !== undefined ? colorValue.a : 1;

      const rgb = this.hslToRgb(h, s, l);
      return Success({ ...rgb, a });
    }

    return Failure('ColorValue must have hex, rgb, or hsl values');
  }

  /**
   * Convert hex string to RGB
   * Supports: #RGB, #RRGGBB, #RGBA, #RRGGBBAA
   */
  private hexToRGB(hex: string): Result<RGB> {
    const cleaned = hex.replace('#', '');

    // Validate hex format
    if (!/^[0-9A-Fa-f]{3,8}$/.test(cleaned)) {
      return Failure(`Invalid hex color format: ${hex}`);
    }

    try {
      // 8-digit hex: #RRGGBBAA
      if (cleaned.length === 8) {
        const bigint = parseInt(cleaned.substring(0, 6), 16);
        const alpha = parseInt(cleaned.substring(6, 8), 16) / 255;

        return Success({
          r: ((bigint >> 16) & 255) / 255,
          g: ((bigint >> 8) & 255) / 255,
          b: (bigint & 255) / 255,
          a: alpha,
        });
      }

      // 4-digit hex: #RGBA
      if (cleaned.length === 4) {
        const r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
        const g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
        const b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
        const a = parseInt(cleaned[3] + cleaned[3], 16) / 255;
        return Success({ r, g, b, a });
      }

      // 6-digit hex: #RRGGBB
      if (cleaned.length === 6) {
        const bigint = parseInt(cleaned, 16);
        return Success({
          r: ((bigint >> 16) & 255) / 255,
          g: ((bigint >> 8) & 255) / 255,
          b: (bigint & 255) / 255,
          a: 1,
        });
      }

      // 3-digit hex: #RGB
      if (cleaned.length === 3) {
        const r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
        const g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
        const b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
        return Success({ r, g, b, a: 1 });
      }

      return Failure(`Unsupported hex length: ${cleaned.length}`);
    } catch (error) {
      return Failure(`Failed to parse hex color: ${hex}`);
    }
  }

  /**
   * Convert rgb/rgba string to RGB
   * Supports: rgb(255, 255, 255), rgba(255, 255, 255, 0.5)
   */
  private rgbStringToRGB(rgbString: string): Result<RGB> {
    const match = rgbString.match(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/
    );

    if (!match) {
      return Failure(`Invalid rgb/rgba format: ${rgbString}`);
    }

    const r = parseInt(match[1]) / 255;
    const g = parseInt(match[2]) / 255;
    const b = parseInt(match[3]) / 255;
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

    // Validate ranges
    if (r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1 || a < 0 || a > 1) {
      return Failure(`RGB values out of range: ${rgbString}`);
    }

    return Success({ r, g, b, a });
  }

  /**
   * Convert hsl/hsla string to RGB
   * Supports: hsl(120, 50%, 50%), hsla(120, 50%, 50%, 0.5)
   */
  private hslStringToRGB(hslString: string): Result<RGB> {
    const match = hslString.match(
      /hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([\d.]+)\s*)?\)/
    );

    if (!match) {
      return Failure(`Invalid hsl/hsla format: ${hslString}`);
    }

    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

    const rgb = this.hslToRgb(h, s, l);
    return Success({ ...rgb, a });
  }

  /**
   * Convert colorSpace object to RGB
   * Format: { colorSpace: "hsl", components: [h, s, l], alpha: 0.75 }
   * Also handles nested components: { components: { components: [...] } }
   */
  private colorSpaceToRGB(obj: any): Result<RGB> {
    const { colorSpace, components, alpha } = obj;
    const a = typeof alpha === 'number' ? alpha : 1;

    // Handle nested components object (components is an object, not an array)
    // Example: { colorSpace: 'hsl', components: { colorSpace: 'hsl', components: [60, 8, 33], alpha: 1, hex: '#54543F' }, alpha: 0.1 }
    if (typeof components === 'object' && components !== null && !Array.isArray(components)) {
      // Recursively convert the nested components object
      return this.toRGB(components);
    }

    if (colorSpace === 'hsl' && Array.isArray(components) && components.length === 3) {
      const h = components[0] / 360;
      const s = components[1] / 100;
      const l = components[2] / 100;
      const rgb = this.hslToRgb(h, s, l);
      return Success({ ...rgb, a });
    }

    if (colorSpace === 'rgb' && Array.isArray(components) && components.length === 3) {
      return Success({
        r: components[0] / 255,
        g: components[1] / 255,
        b: components[2] / 255,
        a,
      });
    }

    // Fallback to hex if available
    if (obj.hex) {
      const hexResult = this.hexToRGB(obj.hex);
      if (hexResult.success) {
        return Success({ ...hexResult.data!, a });
      }
    }

    return Failure(`Unsupported colorSpace format: ${colorSpace}`);
  }

  /**
   * Convert HSL to RGB (normalized 0-1)
   */
  private hslToRgb(h: number, s: number, l: number): Pick<RGB, 'r' | 'g' | 'b'> {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return { r, g, b };
  }

  /**
   * Convert RGB to HSL
   */
  private rgbToHsl(rgb: RGB): HSL {
    const { r, g, b, a } = rgb;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
      a,
    };
  }

  // ==================== TYPE GUARDS ====================

  /**
   * Check if value is ColorValue
   */
  private isColorValue(value: any): value is ColorValue {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value.hex !== undefined ||
        (value.r !== undefined && value.g !== undefined && value.b !== undefined) ||
        (value.h !== undefined && value.s !== undefined && value.l !== undefined))
    );
  }

  /**
   * Check if value is colorSpace object
   */
  private isColorSpaceObject(value: any): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      'colorSpace' in value &&
      'components' in value
    );
  }
}

/**
 * Singleton instance
 */
export const colorConverter = new ColorConverter();

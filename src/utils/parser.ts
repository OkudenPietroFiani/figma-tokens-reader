// Token parsing utilities

import { REM_TO_PX_RATIO } from '../shared/constants';

/**
 * Parse color value and extract RGB(A) components
 * Supports:
 * - hex (#RGB, #RRGGBB, #RGBA, #RRGGBBAA)
 * - rgb(a) strings
 * - hsl(a) strings
 * - colorSpace object format: { colorSpace: "hsl", components: [h,s,l], alpha: 0.5 }
 * Returns RGB object with optional alpha channel (0-1)
 */
export function parseColor(value: any): RGB {
  // Handle colorSpace object format
  // Format: { colorSpace: "hsl", components: [h, s, l], alpha: 0.75 }
  if (typeof value === 'object' && value !== null && 'colorSpace' in value && 'components' in value) {
    const { colorSpace, components, alpha } = value;
    const alphaValue = typeof alpha === 'number' ? alpha : 1;

    if (colorSpace === 'hsl' && Array.isArray(components) && components.length === 3) {
      // HSL format: components are [hue (0-360), saturation (0-100), lightness (0-100)]
      const h = components[0] / 360;
      const s = components[1] / 100;
      const l = components[2] / 100;
      const rgb = hslToRgb(h, s, l);
      return { ...rgb, a: alphaValue };
    }

    if (colorSpace === 'rgb' && Array.isArray(components) && components.length === 3) {
      // RGB format: components are [r (0-255), g (0-255), b (0-255)]
      return {
        r: components[0] / 255,
        g: components[1] / 255,
        b: components[2] / 255,
        a: alphaValue
      };
    }

    // If we have hex as fallback
    if (value.hex) {
      const rgb = hexToRgb(value.hex);
      return { ...rgb, a: alphaValue };
    }
  }

  // Handle object format: {value: "#ff0000"}
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return parseColor(value.value);
  }

  if (typeof value === 'string') {
    if (value.startsWith('#')) {
      return hexToRgb(value);
    }
    if (value.startsWith('rgb')) {
      return rgbStringToRgb(value);
    }
    if (value.startsWith('hsl')) {
      return hslStringToRgb(value);
    }
  }

  if (typeof value === 'object' && value.hex) {
    return hexToRgb(value.hex);
  }

  // Default to black with full opacity
  return { r: 0, g: 0, b: 0, a: 1 };
}

export function parseNumber(value: any): number {
  // Handle object format: {value: 0.5}
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return parseFloat(value.value) || 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return parseFloat(value) || 0;
  }

  return 0;
}

export function parseDimension(value: any): number {
  // Handle object format: {value: 4, unit: "px"}
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const numValue = parseFloat(value.value);
    const unit = value.unit || 'px';

    if (unit === 'rem') {
      return numValue * REM_TO_PX_RATIO;
    }

    return numValue;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.endsWith('px')) {
      return parseFloat(value.replace('px', ''));
    }
    if (value.endsWith('rem')) {
      return parseFloat(value.replace('rem', '')) * REM_TO_PX_RATIO;
    }
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export function parseTypography(value: any): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

export function parseFontFamily(value: any): string {
  // Handle object format: {value: "Inter"}
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return parseFontFamily(value.value);
  }

  if (Array.isArray(value)) {
    return value[0] ? String(value[0]) : 'Arial';
  }

  if (typeof value === 'string' && value.includes(',')) {
    return value.split(',')[0].trim();
  }

  return String(value);
}

// Helper functions for color parsing

/**
 * Convert hex color to RGB(A)
 * Supports: #RGB, #RRGGBB, #RGBA, #RRGGBBAA
 *
 * Examples:
 * - #F00 -> { r: 1, g: 0, b: 0, a: 1 }
 * - #FF0000 -> { r: 1, g: 0, b: 0, a: 1 }
 * - #F00F -> { r: 1, g: 0, b: 0, a: 1 }
 * - #FF000080 -> { r: 1, g: 0, b: 0, a: 0.5 }
 */
function hexToRgb(hex: string): RGB {
  const cleaned = hex.replace('#', '');

  // 8-digit hex: #RRGGBBAA
  if (cleaned.length === 8) {
    const bigint = parseInt(cleaned.substring(0, 6), 16);
    const alpha = parseInt(cleaned.substring(6, 8), 16) / 255;

    return {
      r: ((bigint >> 16) & 255) / 255,
      g: ((bigint >> 8) & 255) / 255,
      b: (bigint & 255) / 255,
      a: alpha
    };
  }
  // 4-digit hex: #RGBA
  else if (cleaned.length === 4) {
    const r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
    const g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
    const b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
    const a = parseInt(cleaned[3] + cleaned[3], 16) / 255;
    return { r, g, b, a };
  }
  // 6-digit hex: #RRGGBB
  else if (cleaned.length === 6) {
    const bigint = parseInt(cleaned, 16);
    return {
      r: ((bigint >> 16) & 255) / 255,
      g: ((bigint >> 8) & 255) / 255,
      b: (bigint & 255) / 255,
      a: 1 // Full opacity by default
    };
  }
  // 3-digit hex: #RGB
  else if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
    const g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
    const b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
    return { r, g, b, a: 1 };
  }

  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Convert rgb() or rgba() string to RGB(A)
 * Supports: rgb(255, 255, 255), rgba(255, 255, 255, 0.5)
 *
 * Examples:
 * - rgb(255, 0, 0) -> { r: 1, g: 0, b: 0, a: 1 }
 * - rgba(255, 0, 0, 0.5) -> { r: 1, g: 0, b: 0, a: 0.5 }
 */
function rgbStringToRgb(rgbString: string): RGB {
  // Try rgba format first (with alpha)
  const rgbaMatch = rgbString.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]) / 255;
    const g = parseInt(rgbaMatch[2]) / 255;
    const b = parseInt(rgbaMatch[3]) / 255;
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;

    return { r, g, b, a };
  }

  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Convert hsl() or hsla() string to RGB(A)
 * Supports: hsl(120, 50%, 50%), hsla(120, 50%, 50%, 0.5)
 *
 * Examples:
 * - hsl(0, 100%, 50%) -> { r: 1, g: 0, b: 0, a: 1 }
 * - hsla(0, 100%, 50%, 0.5) -> { r: 1, g: 0, b: 0, a: 0.5 }
 */
function hslStringToRgb(hslString: string): RGB {
  const match = hslString.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (match) {
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

    const rgb = hslToRgb(h, s, l);
    return { ...rgb, a };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Convert HSL to RGB (without alpha)
 * Alpha is handled in hslStringToRgb
 */
function hslToRgb(h: number, s: number, l: number): Pick<RGB, 'r' | 'g' | 'b'> {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return { r, g, b };
}

// Type inference

export function inferTokenType(value: any): string {
  if (typeof value === 'string') {
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
      return 'color';
    }
    if (value.endsWith('px') || value.endsWith('rem')) {
      return 'dimension';
    }
    if (value.includes('px')) {
      return 'spacing';
    }
    return 'string';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return 'typography';
    }
  }
  return 'string';
}

export function formatValue(value: any, type: string): string {
  if (typeof value === 'object' && value !== null) {
    if ('value' in value && 'unit' in value) {
      return `${value.value}${value.unit}`;
    }
    if ('value' in value) {
      return String(value.value);
    }
    return JSON.stringify(value);
  }
  return String(value);
}

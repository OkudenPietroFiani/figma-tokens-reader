// Token parsing utilities

import { REM_TO_PX_RATIO } from '../constants';

export function parseColor(value: any): RGB {
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

  // Default to black
  return { r: 0, g: 0, b: 0 };
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

function hexToRgb(hex: string): RGB {
  const cleaned = hex.replace('#', '');
  const bigint = parseInt(cleaned, 16);

  if (cleaned.length === 6) {
    return {
      r: ((bigint >> 16) & 255) / 255,
      g: ((bigint >> 8) & 255) / 255,
      b: (bigint & 255) / 255
    };
  } else if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
    const g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
    const b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
    return { r, g, b };
  }

  return { r: 0, g: 0, b: 0 };
}

function rgbStringToRgb(rgbString: string): RGB {
  const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return {
      r: parseInt(match[1]) / 255,
      g: parseInt(match[2]) / 255,
      b: parseInt(match[3]) / 255
    };
  }
  return { r: 0, g: 0, b: 0 };
}

function hslStringToRgb(hslString: string): RGB {
  const match = hslString.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
  if (match) {
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    return hslToRgb(h, s, l);
  }
  return { r: 0, g: 0, b: 0 };
}

function hslToRgb(h: number, s: number, l: number): RGB {
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

// ====================================================================================
// COLOR VISUALIZER
// Renders color tokens as colored squares
// ====================================================================================

import { ITokenVisualizer } from '../interfaces/ITokenVisualizer';
import { TokenMetadata } from '../../shared/types';
import { DOCUMENTATION_LAYOUT_CONFIG, validateVisualizationDimensions } from '../../shared/documentation-config';

/**
 * ColorVisualizer - Renders color tokens as colored squares
 *
 * Principles:
 * - Single Responsibility: Only handles color visualization
 * - Strategy Pattern: Implements ITokenVisualizer
 *
 * Visual output:
 * - Colored square with the token color
 * - Centered in the cell
 */
export class ColorVisualizer implements ITokenVisualizer {
  getType(): string {
    return 'color';
  }

  canVisualize(token: TokenMetadata): boolean {
    return token.type === 'color';
  }

  renderVisualization(
    token: TokenMetadata,
    width: number,
    height: number
  ): FrameNode {
    // Validate dimensions before creating container
    const dims = validateVisualizationDimensions(width, height);

    const container = figma.createFrame();
    container.name = `viz-${token.name}`;
    container.resize(dims.width, dims.height);
    container.fills = [];
    container.clipsContent = false;

    // Auto-layout for centering
    container.layoutMode = 'HORIZONTAL';
    container.primaryAxisAlignItems = 'CENTER';
    container.counterAxisAlignItems = 'CENTER';
    container.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
    container.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
    container.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
    container.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;

    // Create colored square
    const square = figma.createRectangle();
    const size = DOCUMENTATION_LAYOUT_CONFIG.visualization.colorSquareSize;
    square.resize(size, size);
    square.cornerRadius = 4;

    // Apply color
    try {
      const color = this.parseColor(token.value);
      square.fills = [{ type: 'SOLID', color }];
    } catch (error) {
      // If color parsing fails, use gray placeholder
      square.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
      console.warn(`[ColorVisualizer] Failed to parse color for ${token.name}:`, error);
    }

    container.appendChild(square);
    return container;
  }

  /**
   * Parse color value to RGB
   * Supports hex, rgb, hsl formats
   */
  private parseColor(value: any): RGB {
    // If already RGB object
    if (typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
      return value as RGB;
    }

    // If string, parse it
    if (typeof value === 'string') {
      const trimmed = value.trim();

      // Hex format
      if (trimmed.startsWith('#')) {
        return this.parseHex(trimmed);
      }

      // RGB format
      if (trimmed.startsWith('rgb')) {
        return this.parseRgb(trimmed);
      }

      // HSL format
      if (trimmed.startsWith('hsl')) {
        return this.parseHsl(trimmed);
      }
    }

    // Default to gray if can't parse
    return { r: 0.8, g: 0.8, b: 0.8 };
  }

  /**
   * Parse hex color to RGB
   */
  private parseHex(hex: string): RGB {
    const cleaned = hex.replace('#', '');
    let r: number, g: number, b: number;

    if (cleaned.length === 3) {
      r = parseInt(cleaned[0] + cleaned[0], 16);
      g = parseInt(cleaned[1] + cleaned[1], 16);
      b = parseInt(cleaned[2] + cleaned[2], 16);
    } else if (cleaned.length === 6) {
      r = parseInt(cleaned.substring(0, 2), 16);
      g = parseInt(cleaned.substring(2, 4), 16);
      b = parseInt(cleaned.substring(4, 6), 16);
    } else {
      throw new Error('Invalid hex format');
    }

    return {
      r: r / 255,
      g: g / 255,
      b: b / 255,
    };
  }

  /**
   * Parse rgb/rgba string to RGB
   */
  private parseRgb(rgb: string): RGB {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) {
      throw new Error('Invalid RGB format');
    }

    return {
      r: parseInt(match[1]) / 255,
      g: parseInt(match[2]) / 255,
      b: parseInt(match[3]) / 255,
    };
  }

  /**
   * Parse hsl/hsla string to RGB
   */
  private parseHsl(hsl: string): RGB {
    const match = hsl.match(/hsla?\((\d+),\s*(\d+)%?,\s*(\d+)%?/);
    if (!match) {
      throw new Error('Invalid HSL format');
    }

    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;

    return this.hslToRgb(h, s, l);
  }

  /**
   * Convert HSL to RGB
   */
  private hslToRgb(h: number, s: number, l: number): RGB {
    let r: number, g: number, b: number;

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
}

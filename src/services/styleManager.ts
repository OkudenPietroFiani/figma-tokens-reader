// Figma text style management service
// Handles creation of text styles from composite typography tokens

import { DesignToken, TokenData } from '../shared/types';
import { resolveReference } from '../utils/tokenProcessor';

interface TypographyToken {
  fontFamily?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string | number;
}

interface StyleStats {
  created: number;
  updated: number;
  skipped: number;
}

export class StyleManager {
  private variableMap: Map<string, Variable>;
  private styleStats: StyleStats;

  constructor(variableMap: Map<string, Variable>) {
    this.variableMap = variableMap;
    this.styleStats = { created: 0, updated: 0, skipped: 0 };
  }

  /**
   * Process tokens and create text styles for composite typography tokens
   * Clean code: Single responsibility - only handles text styles
   */
  async createTextStyles(tokens: TokenData, pathPrefix: string[] = []): Promise<StyleStats> {
    console.log('\n=== CREATING TEXT STYLES ===');
    this.styleStats = { created: 0, updated: 0, skipped: 0 };

    await this.processTokenGroup(tokens, pathPrefix, 'text');

    if (this.styleStats.created > 0 || this.styleStats.updated > 0) {
      figma.notify(
        `✓ Text styles: ${this.styleStats.created} created, ${this.styleStats.updated} updated`,
        { timeout: 3000 }
      );
    }

    return this.styleStats;
  }

  /**
   * Process tokens and create effect styles for drop shadow tokens
   */
  async createEffectStyles(tokens: TokenData, pathPrefix: string[] = []): Promise<StyleStats> {
    console.log('\n=== CREATING EFFECT STYLES ===');
    this.styleStats = { created: 0, updated: 0, skipped: 0 };

    await this.processTokenGroup(tokens, pathPrefix, 'effect');

    if (this.styleStats.created > 0 || this.styleStats.updated > 0) {
      figma.notify(
        `✓ Effect styles: ${this.styleStats.created} created, ${this.styleStats.updated} updated`,
        { timeout: 3000 }
      );
    }

    return this.styleStats;
  }

  /**
   * Recursively process token groups to find typography or effect tokens
   */
  private async processTokenGroup(tokens: TokenData, pathPrefix: string[], styleType: 'text' | 'effect'): Promise<void> {
    for (const [key, value] of Object.entries(tokens)) {
      const currentPath = [...pathPrefix, key];

      if (value && typeof value === 'object') {
        if (styleType === 'text') {
          // Check if it's a typography token (has $type and $value with object)
          if (this.isTypographyToken(value)) {
            await this.createTextStyle(value as DesignToken, currentPath);
          }
          // Otherwise recurse into nested groups
          else if (!('$value' in value)) {
            await this.processTokenGroup(value as TokenData, currentPath, styleType);
          }
        } else if (styleType === 'effect') {
          // Check if it's a shadow token
          if (this.isShadowToken(value)) {
            await this.createEffectStyle(value as DesignToken, currentPath);
          }
          // Otherwise recurse into nested groups
          else if (!('$value' in value)) {
            await this.processTokenGroup(value as TokenData, currentPath, styleType);
          } else {
            // Has $value but not a shadow - log why it was skipped
            const token = value as any;
            if (token.$type) {
              console.log(`[EFFECT SKIP] Token at ${currentPath.join('/')} has $type="${token.$type}" but not shadow type`);
            }
          }
        }
      }
    }
  }

  /**
   * Check if token is a composite typography token
   */
  private isTypographyToken(token: any): boolean {
    return (
      token.$type === 'typography' &&
      token.$value &&
      typeof token.$value === 'object' &&
      !Array.isArray(token.$value)
    );
  }

  /**
   * Check if token is a shadow token (boxShadow or dropShadow)
   */
  private isShadowToken(token: any): boolean {
    return (
      (token.$type === 'boxShadow' || token.$type === 'shadow') &&
      token.$value &&
      (typeof token.$value === 'object' || Array.isArray(token.$value))
    );
  }

  /**
   * Remove collection and category prefixes from style path
   * Example: ['semantic', 'typography', 'display'] -> ['display']
   * Removes first level (primitive/semantic) AND second level (typography/effect/etc)
   */
  private cleanStylePath(path: string[]): string[] {
    if (path.length === 0) return path;

    const firstLevel = path[0].toLowerCase();
    const secondLevel = path.length > 1 ? path[1].toLowerCase() : '';

    // Remove first level if it's a collection name (primitive/semantic)
    if (firstLevel === 'primitive' || firstLevel === 'semantic') {
      // Also remove second level if it's a category (typography, effect, shadow, etc)
      if (secondLevel === 'typography' || secondLevel === 'effect' || secondLevel === 'shadow' ||
          secondLevel === 'boxshadow' || secondLevel === 'dropshadow') {
        return path.slice(2); // Remove both first and second level
      }
      return path.slice(1); // Remove only first level
    }

    return path;
  }

  /**
   * Create or update Figma text style from typography token
   * Clean code: Single purpose, clear error handling
   */
  private async createTextStyle(token: DesignToken, path: string[]): Promise<void> {
    try {
      const cleanedPath = this.cleanStylePath(path);
      const styleName = cleanedPath.join('/');
      const typography = token.$value as TypographyToken;

      console.log(`[TEXT STYLE] Original path: ${path.join('/')} → Cleaned: ${styleName}`);

      // Find or create text style
      const existingStyles = await figma.getLocalTextStylesAsync();
      let textStyle = existingStyles.find(s => s.name === styleName);

      if (!textStyle) {
        textStyle = figma.createTextStyle();
        textStyle.name = styleName;
        this.styleStats.created++;
      } else {
        this.styleStats.updated++;
      }

      // Set description
      if (token.$description) {
        textStyle.description = token.$description;
      }

      // Apply typography properties
      await this.applyTypographyProperties(textStyle, typography);

    } catch (error) {
      console.error(`[TEXT STYLE ERROR] ${path.join('/')}: ${error}`);
      this.styleStats.skipped++;
    }
  }

  /**
   * Create or update Figma effect style from shadow token
   */
  private async createEffectStyle(token: DesignToken, path: string[]): Promise<void> {
    try {
      const cleanedPath = this.cleanStylePath(path);
      const styleName = cleanedPath.join('/');

      console.log(`[EFFECT STYLE] Original path: ${path.join('/')} → Cleaned: ${styleName}`);
      console.log(`[EFFECT STYLE] Token $type: ${(token as any).$type}, $value:`, token.$value);

      // Find or create effect style
      const existingStyles = await figma.getLocalEffectStylesAsync();
      let effectStyle = existingStyles.find(s => s.name === styleName);

      if (!effectStyle) {
        effectStyle = figma.createEffectStyle();
        effectStyle.name = styleName;
        this.styleStats.created++;
      } else {
        this.styleStats.updated++;
      }

      // Set description
      if (token.$description) {
        effectStyle.description = token.$description;
      }

      // Apply shadow effects
      await this.applyShadowEffects(effectStyle, token.$value);

    } catch (error) {
      console.error(`[EFFECT STYLE ERROR] ${path.join('/')}: ${error}`);
      this.styleStats.skipped++;
    }
  }

  /**
   * Apply typography properties to text style
   * Resolves token references to actual values
   */
  private async applyTypographyProperties(textStyle: TextStyle, typography: TypographyToken): Promise<void> {
    // Font family
    if (typography.fontFamily) {
      const fontFamily = this.resolveTokenReference(typography.fontFamily);
      if (fontFamily) {
        // Figma requires fontName object with family and style
        // For now, use Regular as default style
        try {
          await figma.loadFontAsync({ family: fontFamily, style: 'Regular' });
          textStyle.fontName = { family: fontFamily, style: 'Regular' };
        } catch (error) {
          console.warn(`[STYLE] Could not load font ${fontFamily}, using default`);
        }
      }
    }

    // Font size
    if (typography.fontSize) {
      const fontSize = this.resolveNumericValue(typography.fontSize);
      if (fontSize) {
        textStyle.fontSize = fontSize;
      }
    }

    // Font weight (affects font style)
    if (typography.fontWeight) {
      const fontWeight = this.resolveFontWeight(typography.fontWeight);
      if (fontWeight && textStyle.fontName) {
        try {
          await figma.loadFontAsync({ family: textStyle.fontName.family, style: fontWeight });
          textStyle.fontName = { family: textStyle.fontName.family, style: fontWeight };
        } catch (error) {
          console.warn(`[STYLE] Could not load font weight ${fontWeight}`);
        }
      }
    }

    // Line height
    if (typography.lineHeight) {
      const lineHeight = this.resolveLineHeight(typography.lineHeight);
      if (lineHeight) {
        textStyle.lineHeight = lineHeight;
      }
    }

    // Letter spacing
    if (typography.letterSpacing) {
      const letterSpacing = this.resolveNumericValue(typography.letterSpacing);
      if (letterSpacing !== null) {
        textStyle.letterSpacing = { value: letterSpacing, unit: 'PIXELS' };
      }
    }
  }

  /**
   * Resolve token reference like "{primitive.typography.font-family.primary}"
   * to actual value from variables
   */
  private resolveTokenReference(value: string | number): string | null {
    if (typeof value !== 'string') {
      return String(value);
    }

    // Check if it's a reference (wrapped in curly braces)
    const match = value.match(/^\{(.+)\}$/);
    if (!match) {
      return value; // Not a reference, return as-is
    }

    const reference = match[1];

    // Use the same resolution logic as tokenProcessor
    const variable = resolveReference(reference, this.variableMap);
    if (variable) {
      // Get the variable's actual value from the mode
      const modeId = Object.keys(variable.valuesByMode)[0];
      const value = variable.valuesByMode[modeId];
      return String(value);
    }

    // Reference couldn't be resolved - will be logged by resolveReference
    return null;
  }

  /**
   * Resolve numeric value (handles references and units)
   */
  private resolveNumericValue(value: string | number): number | null {
    if (typeof value === 'number') {
      return value;
    }

    // Try to resolve reference first
    const resolved = this.resolveTokenReference(value);
    if (!resolved) return null;

    // Parse numeric value (remove units like 'px', 'rem')
    const numMatch = resolved.match(/^([\d.]+)/);
    if (numMatch) {
      return parseFloat(numMatch[1]);
    }

    return null;
  }

  /**
   * Resolve font weight to Figma font style
   */
  private resolveFontWeight(weight: string | number): string | null {
    const resolved = this.resolveTokenReference(String(weight));
    if (!resolved) return null;

    // Map weights to Figma font styles
    const weightMap: { [key: string]: string } = {
      '100': 'Thin',
      '200': 'Extra Light',
      '300': 'Light',
      '400': 'Regular',
      '500': 'Medium',
      '600': 'Semi Bold',
      '700': 'Bold',
      '800': 'Extra Bold',
      '900': 'Black',
      'normal': 'Regular',
      'bold': 'Bold',
    };

    return weightMap[resolved.toLowerCase()] || 'Regular';
  }

  /**
   * Resolve line height (can be numeric or percentage)
   */
  private resolveLineHeight(value: string | number): LineHeight | null {
    if (typeof value === 'number') {
      return { value: value, unit: 'PIXELS' };
    }

    const resolved = this.resolveTokenReference(value);
    if (!resolved) return null;

    // Check if percentage
    if (resolved.includes('%')) {
      const percent = parseFloat(resolved);
      return { value: percent, unit: 'PERCENT' };
    }

    // Parse as pixels
    const pixels = this.resolveNumericValue(resolved);
    if (pixels) {
      return { value: pixels, unit: 'PIXELS' };
    }

    return null;
  }

  /**
   * Apply shadow effects to effect style
   * Handles both single shadow and array of shadows
   */
  private async applyShadowEffects(effectStyle: EffectStyle, value: any): Promise<void> {
    const effects: Effect[] = [];

    // Handle array of shadows
    if (Array.isArray(value)) {
      for (const shadow of value) {
        const effect = this.parseShadowEffect(shadow);
        if (effect) {
          effects.push(effect);
        }
      }
    }
    // Handle single shadow
    else if (typeof value === 'object' && value !== null) {
      const effect = this.parseShadowEffect(value);
      if (effect) {
        effects.push(effect);
      }
    }

    if (effects.length > 0) {
      effectStyle.effects = effects;
    } else {
      console.error(`[SHADOW] No valid effects parsed for shadow token`);
    }
  }

  /**
   * Parse a single shadow object into a Figma Effect
   * Format: { x, y, blur, spread, color, type }
   */
  private parseShadowEffect(shadow: any): Effect | null {
    try {
      // Extract shadow properties
      const x = this.resolveNumericValue(shadow.x || shadow.offsetX || 0);
      const y = this.resolveNumericValue(shadow.y || shadow.offsetY || 0);
      const blur = this.resolveNumericValue(shadow.blur || shadow.blurRadius || 0);
      const spread = this.resolveNumericValue(shadow.spread || shadow.spreadRadius || 0);

      // Parse color
      const colorValue = shadow.color || '#000000';
      const color = this.parseColorValue(colorValue);

      // Determine effect type (DROP_SHADOW or INNER_SHADOW)
      const type = shadow.type === 'innerShadow' ? 'INNER_SHADOW' : 'DROP_SHADOW';

      const effect: Effect = {
        type: type,
        color: color,
        offset: { x: x || 0, y: y || 0 },
        radius: blur || 0,
        spread: spread || 0,
        visible: true,
        blendMode: 'NORMAL'
      };

      return effect;
    } catch (error) {
      console.error(`[SHADOW PARSE ERROR]`, error);
      return null;
    }
  }

  /**
   * Parse color value to RGBA format
   * Handles hex, rgb/rgba strings, and references
   */
  private parseColorValue(value: any): RGBA {
    // If it's a reference, try to resolve it
    if (typeof value === 'string' && value.includes('{') && value.includes('}')) {
      const resolved = this.resolveTokenReference(value);
      if (resolved) {
        value = resolved;
      }
    }

    // Parse hex color
    if (typeof value === 'string' && value.startsWith('#')) {
      return this.hexToRgba(value);
    }

    // Parse rgba/rgb string
    if (typeof value === 'string' && (value.startsWith('rgb') || value.startsWith('hsl'))) {
      // For now, use a simple rgba parser
      const rgbaMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (rgbaMatch) {
        return {
          r: parseInt(rgbaMatch[1]) / 255,
          g: parseInt(rgbaMatch[2]) / 255,
          b: parseInt(rgbaMatch[3]) / 255,
          a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
        };
      }
    }

    // Default to black
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  /**
   * Convert hex color to RGBA
   * Supports #RGB, #RRGGBB, #RGBA, #RRGGBBAA
   */
  private hexToRgba(hex: string): RGBA {
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

    // 6-digit hex: #RRGGBB
    if (cleaned.length === 6) {
      const bigint = parseInt(cleaned, 16);
      return {
        r: ((bigint >> 16) & 255) / 255,
        g: ((bigint >> 8) & 255) / 255,
        b: (bigint & 255) / 255,
        a: 1
      };
    }

    // 4-digit hex: #RGBA
    if (cleaned.length === 4) {
      return {
        r: parseInt(cleaned[0] + cleaned[0], 16) / 255,
        g: parseInt(cleaned[1] + cleaned[1], 16) / 255,
        b: parseInt(cleaned[2] + cleaned[2], 16) / 255,
        a: parseInt(cleaned[3] + cleaned[3], 16) / 255
      };
    }

    // 3-digit hex: #RGB
    if (cleaned.length === 3) {
      return {
        r: parseInt(cleaned[0] + cleaned[0], 16) / 255,
        g: parseInt(cleaned[1] + cleaned[1], 16) / 255,
        b: parseInt(cleaned[2] + cleaned[2], 16) / 255,
        a: 1
      };
    }

    // Default to black
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  getStats(): StyleStats {
    return this.styleStats;
  }
}

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
   * Remove category prefixes from style path
   * Example: ['typography', 'display'] -> ['display']
   * Example: ['color', 'drop-shadow'] -> ['drop-shadow']
   * Removes first level if it's a category (typography, effect, shadow, color, etc)
   */
  private cleanStylePath(path: string[]): string[] {
    if (path.length === 0) return path;

    const firstLevel = path[0].toLowerCase();

    // Remove first level if it's a category
    if (firstLevel === 'typography' || firstLevel === 'effect' || firstLevel === 'shadow' ||
        firstLevel === 'boxshadow' || firstLevel === 'dropshadow' || firstLevel === 'font' ||
        firstLevel === 'color') {
      return path.slice(1);
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
   * Handles unitless values (1.5 -> 150%) and pixel values
   */
  private resolveLineHeight(value: string | number): LineHeight | null {
    if (typeof value === 'number') {
      // Unitless line-height (e.g., 1.5) should be converted to percentage
      // Assume values < 10 are unitless multipliers, values >= 10 are pixels
      if (value < 10) {
        return { value: value * 100, unit: 'PERCENT' };
      }
      return { value: value, unit: 'PIXELS' };
    }

    const resolved = this.resolveTokenReference(value);
    if (!resolved) return null;

    // Check if percentage
    if (resolved.includes('%')) {
      const percent = parseFloat(resolved);
      return { value: percent, unit: 'PERCENT' };
    }

    // Check for unitless number (e.g., "1.5")
    const numValue = parseFloat(resolved);
    if (!isNaN(numValue) && !resolved.includes('px') && !resolved.includes('rem')) {
      // Unitless values should be treated as relative (percentage)
      if (numValue < 10) {
        return { value: numValue * 100, unit: 'PERCENT' };
      }
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
   * Binds color variables instead of resolving to static colors
   */
  private async applyShadowEffects(effectStyle: EffectStyle, value: any): Promise<void> {
    const effectsData: Array<{ effect: Effect; colorVariable?: Variable }> = [];

    // Handle array of shadows
    if (Array.isArray(value)) {
      for (const shadow of value) {
        const effectData = this.parseShadowEffect(shadow);
        if (effectData) {
          effectsData.push(effectData);
        }
      }
    }
    // Handle single shadow
    else if (typeof value === 'object' && value !== null) {
      const effectData = this.parseShadowEffect(value);
      if (effectData) {
        effectsData.push(effectData);
      }
    }

    if (effectsData.length > 0) {
      // Set the effects on the style
      effectStyle.effects = effectsData.map(ed => ed.effect);

      // Bind color variables for each effect that has one
      effectsData.forEach((effectData, index) => {
        if (effectData.colorVariable) {
          try {
            // Bind the color property of this effect to the variable
            effectStyle.setBoundVariable(`effects[${index}].color`, effectData.colorVariable);
            console.log(`[SHADOW] Bound effect ${index} color to variable: ${effectData.colorVariable.name}`);
          } catch (error) {
            console.error(`[SHADOW] Failed to bind color variable for effect ${index}:`, error);
          }
        }
      });
    } else {
      console.error(`[SHADOW] No valid effects parsed for shadow token`);
    }
  }

  /**
   * Parse a single shadow object into a Figma Effect with optional color variable binding
   * Format: { x, y, blur, spread, color, type }
   * Returns: { effect, colorVariable? }
   */
  private parseShadowEffect(shadow: any): { effect: Effect; colorVariable?: Variable } | null {
    try {
      // Extract shadow properties
      const x = this.resolveNumericValue(shadow.x || shadow.offsetX || 0);
      const y = this.resolveNumericValue(shadow.y || shadow.offsetY || 0);
      const blur = this.resolveNumericValue(shadow.blur || shadow.blurRadius || 0);
      const spread = this.resolveNumericValue(shadow.spread || shadow.spreadRadius || 0);

      // Check if color is a variable reference
      const colorValue = shadow.color || '#000000';
      let colorVariable: Variable | undefined;
      let color: RGBA;

      // If color is a simple variable reference (e.g., "{semantic.color.drop-shadow.weak}")
      if (typeof colorValue === 'string' && colorValue.includes('{') && colorValue.includes('}')) {
        const match = colorValue.match(/^\{([^}]+)\}$/);
        if (match) {
          const reference = match[1];
          colorVariable = resolveReference(reference, this.variableMap);

          if (colorVariable) {
            // Get the variable's color value for the effect
            const modeId = Object.keys(colorVariable.valuesByMode)[0];
            const variableValue = colorVariable.valuesByMode[modeId];

            if (typeof variableValue === 'object' && 'r' in variableValue) {
              color = variableValue as RGBA;
              console.log(`[SHADOW] Found color variable: ${colorVariable.name}`);
            } else {
              console.error(`[SHADOW] Variable ${colorVariable.name} is not a color type`);
              color = this.parseColorValue(colorValue);
              colorVariable = undefined;
            }
          } else {
            console.error(`[SHADOW] Cannot resolve color reference: ${reference}`);
            color = this.parseColorValue(colorValue);
          }
        } else {
          // Not a pure reference, parse as color
          color = this.parseColorValue(colorValue);
        }
      } else {
        // Parse color normally (handles complex formats, hex, etc.)
        color = this.parseColorValue(colorValue);
      }

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

      return { effect, colorVariable };
    } catch (error) {
      console.error(`[SHADOW PARSE ERROR]`, error);
      return null;
    }
  }

  /**
   * Parse color value to RGBA format
   * Handles hex, rgb/rgba strings, references, and colorSpace object format
   */
  private parseColorValue(value: any): RGBA {
    // Handle colorSpace object format with references (components and/or alpha)
    if (typeof value === 'object' && value !== null && ('components' in value || 'alpha' in value)) {
      let resolvedValue = { ...value };
      let needsResolution = false;

      // Resolve components reference if present
      if (typeof value.components === 'string' && value.components.includes('{') && value.components.includes('}')) {
        const match = value.components.match(/\{([^}]+)\}/);
        if (match) {
          const reference = match[1];
          const componentsVariable = resolveReference(reference, this.variableMap);

          if (componentsVariable) {
            // Get the resolved color value from the variable
            const modeId = Object.keys(componentsVariable.valuesByMode)[0];
            const resolvedComponentsValue = componentsVariable.valuesByMode[modeId];

            // Extract RGB components from the resolved color
            if (typeof resolvedComponentsValue === 'object' && 'r' in resolvedComponentsValue) {
              // Already have the RGBA value from Figma, use it directly
              return {
                r: resolvedComponentsValue.r,
                g: resolvedComponentsValue.g,
                b: resolvedComponentsValue.b,
                a: typeof value.alpha === 'number' ? value.alpha : (resolvedComponentsValue.a || 1)
              };
            }
          } else {
            console.error(`[SHADOW COLOR COMPONENTS FAILED] Cannot resolve: ${value.components}`);
          }
        }
      }

      // Resolve alpha reference if present
      if (typeof value.alpha === 'string' && value.alpha.includes('{') && value.alpha.includes('}')) {
        const match = value.alpha.match(/\{([^}]+)\}/);
        if (match) {
          const reference = match[1];
          const alphaVariable = resolveReference(reference, this.variableMap);

          if (alphaVariable) {
            // Get the resolved numeric value from the variable
            const modeId = Object.keys(alphaVariable.valuesByMode)[0];
            const resolvedAlpha = alphaVariable.valuesByMode[modeId];

            resolvedValue.alpha = typeof resolvedAlpha === 'number' ? resolvedAlpha : 1;
            needsResolution = true;
          } else {
            console.error(`[SHADOW COLOR ALPHA FAILED] Cannot resolve: ${value.alpha}`);
            resolvedValue.alpha = 1;
          }
        }
      }

      // If we have colorSpace format with arrays, parse it
      if (value.colorSpace && Array.isArray(resolvedValue.components)) {
        const { colorSpace, components } = resolvedValue;
        const alpha = typeof resolvedValue.alpha === 'number' ? resolvedValue.alpha : 1;

        if (colorSpace === 'rgb' && components.length === 3) {
          return {
            r: components[0] / 255,
            g: components[1] / 255,
            b: components[2] / 255,
            a: alpha
          };
        }

        if (colorSpace === 'hsl' && components.length === 3) {
          // Convert HSL to RGB
          const h = components[0] / 360;
          const s = components[1] / 100;
          const l = components[2] / 100;
          const rgb = this.hslToRgb(h, s, l);
          return { ...rgb, a: alpha };
        }
      }
    }

    // If it's a simple string reference, try to resolve it
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
   * Convert HSL to RGB (without alpha)
   * Alpha is handled separately in parseColorValue
   */
  private hslToRgb(h: number, s: number, l: number): Pick<RGBA, 'r' | 'g' | 'b'> {
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

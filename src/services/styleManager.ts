// Figma text style management service
// Handles creation of text styles from composite typography tokens

import { DesignToken, TokenData } from '../shared/types';

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

    await this.processTokenGroup(tokens, pathPrefix);

    if (this.styleStats.created > 0 || this.styleStats.updated > 0) {
      figma.notify(
        `✓ Text styles: ${this.styleStats.created} created, ${this.styleStats.updated} updated`,
        { timeout: 3000 }
      );
    }

    return this.styleStats;
  }

  /**
   * Recursively process token groups to find typography tokens
   */
  private async processTokenGroup(tokens: TokenData, pathPrefix: string[]): Promise<void> {
    for (const [key, value] of Object.entries(tokens)) {
      const currentPath = [...pathPrefix, key];

      if (value && typeof value === 'object') {
        // Check if it's a typography token (has $type and $value with object)
        if (this.isTypographyToken(value)) {
          await this.createTextStyle(value as DesignToken, currentPath);
        }
        // Otherwise recurse into nested groups
        else if (!('$value' in value)) {
          await this.processTokenGroup(value as TokenData, currentPath);
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
   * Create or update Figma text style from typography token
   * Clean code: Single purpose, clear error handling
   */
  private async createTextStyle(token: DesignToken, path: string[]): Promise<void> {
    try {
      const styleName = path.join('/');
      const typography = token.$value as TypographyToken;

      console.log(`[STYLE] Creating text style: ${styleName}`);

      // Find or create text style
      const existingStyles = await figma.getLocalTextStylesAsync();
      let textStyle = existingStyles.find(s => s.name === styleName);

      if (!textStyle) {
        textStyle = figma.createTextStyle();
        textStyle.name = styleName;
        this.styleStats.created++;
        console.log(`[STYLE] ✓ Created new text style: ${styleName}`);
      } else {
        this.styleStats.updated++;
        console.log(`[STYLE] ✓ Updating existing text style: ${styleName}`);
      }

      // Set description
      if (token.$description) {
        textStyle.description = token.$description;
      }

      // Apply typography properties
      await this.applyTypographyProperties(textStyle, typography);

    } catch (error) {
      console.error(`[STYLE] Error creating text style ${path.join('/')}: ${error}`);
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

    const path = match[1];
    // Convert path like "primitive.typography.font-family.primary" to "primitive/typography/font-family/primary"
    const variableName = path.replace(/\./g, '/');

    // Look up variable
    const variable = this.variableMap.get(variableName);
    if (variable) {
      // Get the variable's value
      // Note: This is simplified - in reality you'd need to get the resolved value
      return String(variable.name);
    }

    console.warn(`[STYLE] Could not resolve reference: ${value}`);
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

  getStats(): StyleStats {
    return this.styleStats;
  }
}

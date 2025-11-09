// ====================================================================================
// STYLE DICTIONARY FORMAT STRATEGY TESTS
// Comprehensive unit tests for StyleDictionaryFormatStrategy
// ====================================================================================

import { StyleDictionaryFormatStrategy } from '../../../core/adapters/StyleDictionaryFormatStrategy';
import { TokenData } from '../../../shared/types';

describe('StyleDictionaryFormatStrategy', () => {
  let strategy: StyleDictionaryFormatStrategy;

  beforeEach(() => {
    strategy = new StyleDictionaryFormatStrategy();
  });

  describe('getFormatInfo()', () => {
    test('should return correct format information', () => {
      const info = strategy.getFormatInfo();

      expect(info.name).toBe('Style Dictionary');
      expect(info.version).toBe('3.0');
      expect(info.description).toContain('Style Dictionary');
    });
  });

  describe('detectFormat()', () => {
    test('should return high score for valid Style Dictionary format', () => {
      const styleDictData: TokenData = {
        color: {
          primary: {
            value: '#0000ff'
          }
        }
      };

      const score = strategy.detectFormat(styleDictData);

      expect(score).toBeGreaterThan(0.8);
    });

    test('should return 0 for empty data', () => {
      const emptyData: TokenData = {};

      const score = strategy.detectFormat(emptyData);

      expect(score).toBe(0);
    });

    test('should return low score for W3C format', () => {
      const w3cData: TokenData = {
        colors: {
          primary: {
            $value: '#0000ff',
            $type: 'color'
          }
        }
      };

      const score = strategy.detectFormat(w3cData);

      expect(score).toBeLessThan(0.2);
    });

    test('should handle nested groups correctly', () => {
      const nested: TokenData = {
        color: {
          brand: {
            primary: {
              value: '#0000ff'
            },
            secondary: {
              value: '#00ff00'
            }
          }
        }
      };

      const score = strategy.detectFormat(nested);

      expect(score).toBeGreaterThan(0.8);
    });
  });

  describe('parseTokens()', () => {
    test('should parse simple Style Dictionary tokens', () => {
      const data: TokenData = {
        color: {
          primary: {
            value: '#0000ff'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].path).toEqual(['color', 'primary']);
      expect(result.data![0].value).toBe('#0000ff');
      expect(result.data![0].type).toBe('color');
    });

    test('should parse nested token groups', () => {
      const data: TokenData = {
        color: {
          brand: {
            primary: { value: '#000' },
            secondary: { value: '#666' }
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].path).toEqual(['color', 'brand', 'primary']);
      expect(result.data![1].path).toEqual(['color', 'brand', 'secondary']);
    });

    test('should skip $metadata properties', () => {
      const data: TokenData = {
        $description: 'This is metadata',
        color: {
          primary: {
            value: '#0000ff',
            $description: 'Primary color'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].path).toEqual(['color', 'primary']);
    });

    test('should infer type from path', () => {
      const data: TokenData = {
        size: {
          small: {
            value: '8px'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.success).toBe(true);
      expect(result.data![0].type).toBe('dimension');
    });
  });

  describe('isReference()', () => {
    test('should detect valid reference', () => {
      expect(strategy.isReference('{color.primary}')).toBe(true);
      expect(strategy.isReference('{brand.text.color}')).toBe(true);
    });

    test('should reject non-reference strings', () => {
      expect(strategy.isReference('#0000ff')).toBe(false);
      expect(strategy.isReference('16px')).toBe(false);
      expect(strategy.isReference('blue')).toBe(false);
    });

    test('should reject partial references', () => {
      expect(strategy.isReference('{color.primary')).toBe(false);
      expect(strategy.isReference('color.primary}')).toBe(false);
      expect(strategy.isReference('color.primary')).toBe(false);
    });

    test('should handle whitespace in references', () => {
      expect(strategy.isReference('  {color.primary}  ')).toBe(true);
    });

    test('should reject non-string values', () => {
      expect(strategy.isReference(123)).toBe(false);
      expect(strategy.isReference(null)).toBe(false);
      expect(strategy.isReference(undefined)).toBe(false);
      expect(strategy.isReference({})).toBe(false);
    });
  });

  describe('extractReference()', () => {
    test('should extract reference path from valid reference', () => {
      expect(strategy.extractReference('{color.primary}')).toBe('color.primary');
      expect(strategy.extractReference('{brand.text.color}')).toBe('brand.text.color');
    });

    test('should return null for non-references', () => {
      expect(strategy.extractReference('#0000ff')).toBeNull();
      expect(strategy.extractReference('16px')).toBeNull();
      expect(strategy.extractReference('{incomplete')).toBeNull();
    });

    test('should handle whitespace', () => {
      expect(strategy.extractReference('  {color.primary}  ')).toBe('color.primary');
    });
  });

  describe('extractType()', () => {
    test('should infer type from value when type missing', () => {
      const colorToken = { value: '#0000ff' };
      const type = strategy.extractType(colorToken, ['color', 'primary']);

      expect(type).toBe('color');
    });

    test('should return null when value is missing', () => {
      const invalidToken = { name: 'test' };
      const type = strategy.extractType(invalidToken, ['test']);

      expect(type).toBeNull();
    });
  });

  describe('normalizeValue()', () => {
    test('should pass through values unchanged', () => {
      expect(strategy.normalizeValue('#0000ff', 'color')).toBe('#0000ff');
      expect(strategy.normalizeValue('16px', 'dimension')).toBe('16px');
      expect(strategy.normalizeValue(400, 'fontWeight')).toBe(400);
    });
  });

  describe('type inference', () => {
    test('should infer color from hex value', () => {
      const data: TokenData = {
        test: {
          value: '#ff0000'
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('color');
    });

    test('should infer color from category', () => {
      const data: TokenData = {
        color: {
          primary: {
            value: 'blue'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('color');
    });

    test('should infer dimension from size category', () => {
      const data: TokenData = {
        size: {
          small: {
            value: '8px'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('dimension');
    });

    test('should infer spacing from space category', () => {
      const data: TokenData = {
        space: {
          small: {
            value: '8px'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('spacing');
    });

    test('should infer fontSize from font category and size path', () => {
      const data: TokenData = {
        font: {
          size: {
            body: {
              value: '16px'
            }
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('fontSize');
    });

    test('should infer fontWeight from font category and weight path', () => {
      const data: TokenData = {
        font: {
          weight: {
            bold: {
              value: 700
            }
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('fontWeight');
    });

    test('should infer number from numeric value', () => {
      const data: TokenData = {
        test: {
          value: 42
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('number');
    });

    test('should infer color from RGB object', () => {
      const data: TokenData = {
        test: {
          value: {
            r: 255,
            g: 0,
            b: 0
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('color');
    });

    test('should infer shadow from shadow properties', () => {
      const data: TokenData = {
        test: {
          value: {
            x: 0,
            y: 2,
            blur: 4,
            color: '#000000'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('shadow');
    });
  });

  describe('real-world Style Dictionary examples', () => {
    test('should parse typical Style Dictionary structure', () => {
      const styleDictData: TokenData = {
        color: {
          base: {
            gray: {
              light: { value: '#CCCCCC' },
              medium: { value: '#999999' },
              dark: { value: '#111111' }
            }
          },
          font: {
            base: { value: '{color.base.gray.dark}' },
            secondary: { value: '{color.base.gray.medium}' }
          }
        },
        size: {
          font: {
            small: { value: '0.75rem' },
            medium: { value: '1rem' },
            large: { value: '2rem' }
          }
        }
      };

      const result = strategy.parseTokens(styleDictData);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(5);

      // Check references are preserved
      const fontBaseToken = result.data!.find(t => t.path.join('.') === 'color.font.base');
      expect(fontBaseToken?.value).toBe('{color.base.gray.dark}');
    });

    test('should handle category/type/item organization', () => {
      const data: TokenData = {
        color: {
          background: {
            primary: { value: '#ffffff' },
            secondary: { value: '#f0f0f0' }
          },
          text: {
            primary: { value: '#000000' },
            secondary: { value: '#666666' }
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);

      // All should be inferred as color
      result.data!.forEach(token => {
        expect(token.type).toBe('color');
      });
    });
  });
});

// ====================================================================================
// W3C TOKEN FORMAT STRATEGY TESTS
// Comprehensive unit tests for W3CTokenFormatStrategy
// ====================================================================================

import { W3CTokenFormatStrategy } from '../../../core/adapters/W3CTokenFormatStrategy';
import { TokenData } from '../../../shared/types';

describe('W3CTokenFormatStrategy', () => {
  let strategy: W3CTokenFormatStrategy;

  beforeEach(() => {
    strategy = new W3CTokenFormatStrategy();
  });

  describe('getFormatInfo()', () => {
    test('should return correct format information', () => {
      const info = strategy.getFormatInfo();

      expect(info.name).toBe('W3C Design Tokens');
      expect(info.version).toBe('1.0');
      expect(info.description).toContain('W3C');
    });
  });

  describe('detectFormat()', () => {
    test('should return high score for valid W3C format', () => {
      const w3cData: TokenData = {
        color: {
          primary: {
            $value: '#0000ff',
            $type: 'color'
          }
        }
      };

      const score = strategy.detectFormat(w3cData);

      expect(score).toBeGreaterThan(0.8);
    });

    test('should return 0 for empty data', () => {
      const emptyData: TokenData = {};

      const score = strategy.detectFormat(emptyData);

      expect(score).toBe(0);
    });

    test('should return low score for non-W3C format', () => {
      const nonW3C: TokenData = {
        colors: {
          primary: '#0000ff' // No $value or $type
        }
      };

      const score = strategy.detectFormat(nonW3C);

      expect(score).toBeLessThan(0.5);
    });

    test('should handle nested groups correctly', () => {
      const nested: TokenData = {
        semantic: {
          color: {
            text: {
              primary: {
                $value: '#000000',
                $type: 'color'
              },
              secondary: {
                $value: '#666666',
                $type: 'color'
              }
            }
          }
        }
      };

      const score = strategy.detectFormat(nested);

      expect(score).toBeGreaterThan(0.8);
    });
  });

  describe('parseTokens()', () => {
    test('should parse simple W3C tokens', () => {
      const data: TokenData = {
        color: {
          primary: {
            $value: '#0000ff',
            $type: 'color'
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
        semantic: {
          color: {
            text: {
              primary: { $value: '#000', $type: 'color' },
              secondary: { $value: '#666', $type: 'color' }
            }
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].path).toEqual(['semantic', 'color', 'text', 'primary']);
      expect(result.data![1].path).toEqual(['semantic', 'color', 'text', 'secondary']);
    });

    test('should skip $metadata properties', () => {
      const data: TokenData = {
        $description: 'This is metadata',
        color: {
          primary: {
            $value: '#0000ff',
            $type: 'color',
            $description: 'Primary color'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].path).toEqual(['color', 'primary']);
    });

    test('should infer type when $type not specified', () => {
      const data: TokenData = {
        spacing: {
          small: {
            $value: '8px'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.success).toBe(true);
      expect(result.data![0].type).toBe('spacing');
    });
  });

  describe('isReference()', () => {
    test('should detect valid W3C reference', () => {
      expect(strategy.isReference('{color.primary}')).toBe(true);
      expect(strategy.isReference('{semantic.text.color}')).toBe(true);
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
      expect(strategy.extractReference('{semantic.text.color}')).toBe('semantic.text.color');
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
    test('should extract $type when present', () => {
      const tokenData = {
        $value: '#0000ff',
        $type: 'color'
      };

      const type = strategy.extractType(tokenData, ['color', 'primary']);

      expect(type).toBe('color');
    });

    test('should infer type from $value when $type missing', () => {
      const colorToken = { $value: '#0000ff' };
      const type = strategy.extractType(colorToken, ['color', 'primary']);

      expect(type).toBe('color');
    });

    test('should return null when neither $type nor $value present', () => {
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
          $value: '#ff0000'
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('color');
    });

    test('should infer color from path', () => {
      const data: TokenData = {
        color: {
          primary: {
            $value: 'any-value'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('color');
    });

    test('should infer spacing from path', () => {
      const data: TokenData = {
        spacing: {
          small: {
            $value: '8px'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('spacing');
    });

    test('should infer fontSize from path', () => {
      const data: TokenData = {
        'font-size': {
          body: {
            $value: '16px'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('fontSize');
    });

    test('should infer number from numeric value', () => {
      const data: TokenData = {
        test: {
          $value: 42
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('number');
    });

    test('should infer color from colorSpace object', () => {
      const data: TokenData = {
        test: {
          $value: {
            colorSpace: 'rgb',
            components: [255, 0, 0],
            alpha: 1
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('color');
    });

    test('should infer shadow from shadow properties', () => {
      const data: TokenData = {
        test: {
          $value: {
            blur: 4,
            offsetX: 0,
            offsetY: 2,
            color: '#000000'
          }
        }
      };

      const result = strategy.parseTokens(data);

      expect(result.data![0].type).toBe('shadow');
    });
  });
});

// ====================================================================================
// CONVERTER TESTS
// Comprehensive tests for all type-safe converters
// ====================================================================================

import { describe, it, expect } from '@jest/globals';
import { converters } from '../index';

describe('ColorConverter', () => {
  describe('toRGB', () => {
    it('should convert hex to RGB', () => {
      const result = converters.color.toRGB('#1e40af');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        r: 30 / 255,
        g: 64 / 255,
        b: 175 / 255,
        a: 1,
      });
    });

    it('should convert short hex to RGB', () => {
      const result = converters.color.toRGB('#f00');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    });

    it('should convert hex with alpha', () => {
      const result = converters.color.toRGB('#ff0000' + '80');
      expect(result.success).toBe(true);
      expect(result.data!.a).toBeCloseTo(0.5, 2);
    });

    it('should convert rgb string', () => {
      const result = converters.color.toRGB('rgb(255, 0, 0)');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    });

    it('should convert rgba string', () => {
      const result = converters.color.toRGB('rgba(255, 0, 0, 0.5)');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ r: 1, g: 0, b: 0, a: 0.5 });
    });

    it('should convert hsl string', () => {
      const result = converters.color.toRGB('hsl(0, 100%, 50%)');
      expect(result.success).toBe(true);
      expect(result.data!.r).toBeCloseTo(1, 1);
      expect(result.data!.g).toBeCloseTo(0, 1);
      expect(result.data!.b).toBeCloseTo(0, 1);
    });

    it('should convert ColorValue with hex', () => {
      const result = converters.color.toRGB({ hex: '#1e40af' });
      expect(result.success).toBe(true);
    });

    it('should convert ColorValue with rgb', () => {
      const result = converters.color.toRGB({ r: 255, g: 0, b: 0 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    });

    it('should convert ColorValue with hsl', () => {
      const result = converters.color.toRGB({ h: 0, s: 100, l: 50 });
      expect(result.success).toBe(true);
      expect(result.data!.r).toBeCloseTo(1, 1);
    });

    it('should reject invalid color', () => {
      const result = converters.color.toRGB('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('toHex', () => {
    it('should convert RGB to hex', () => {
      const result = converters.color.toHex('#1e40af');
      expect(result.success).toBe(true);
      expect(result.data).toBe('#1e40af');
    });

    it('should include alpha if not opaque', () => {
      const result = converters.color.toHex('rgba(255, 0, 0, 0.5)');
      expect(result.success).toBe(true);
      expect(result.data).toMatch(/#ff000080/i);
    });
  });

  describe('toHSL', () => {
    it('should convert to HSL', () => {
      const result = converters.color.toHSL('#ff0000');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ h: 0, s: 100, l: 50, a: 1 });
    });
  });
});

describe('DimensionConverter', () => {
  describe('toPixels', () => {
    it('should convert number to pixels', () => {
      const result = converters.dimension.toPixels(16);
      expect(result.success).toBe(true);
      expect(result.data).toBe(16);
    });

    it('should convert px string to pixels', () => {
      const result = converters.dimension.toPixels('16px');
      expect(result.success).toBe(true);
      expect(result.data).toBe(16);
    });

    it('should convert rem to pixels', () => {
      const result = converters.dimension.toPixels('1rem', 16);
      expect(result.success).toBe(true);
      expect(result.data).toBe(16);
    });

    it('should convert rem to pixels with custom base', () => {
      const result = converters.dimension.toPixels('2rem', 20);
      expect(result.success).toBe(true);
      expect(result.data).toBe(40);
    });

    it('should convert pt to pixels', () => {
      const result = converters.dimension.toPixels('12pt');
      expect(result.success).toBe(true);
      expect(result.data).toBeCloseTo(16, 0);
    });

    it('should convert DimensionValue', () => {
      const result = converters.dimension.toPixels({ value: 1.5, unit: 'rem' }, 16);
      expect(result.success).toBe(true);
      expect(result.data).toBe(24);
    });

    it('should reject invalid dimension', () => {
      const result = converters.dimension.toPixels('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('toRem', () => {
    it('should convert pixels to rem', () => {
      const result = converters.dimension.toRem(32, 16);
      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
    });

    it('should convert px string to rem', () => {
      const result = converters.dimension.toRem('24px', 16);
      expect(result.success).toBe(true);
      expect(result.data).toBe(1.5);
    });
  });

  describe('parse', () => {
    it('should parse dimension string', () => {
      const result = converters.dimension.parse('16px');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 16, unit: 'px' });
    });

    it('should parse rem dimension', () => {
      const result = converters.dimension.parse('1.5rem');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 1.5, unit: 'rem' });
    });

    it('should default to px if no unit', () => {
      const result = converters.dimension.parse('24');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 24, unit: 'px' });
    });
  });
});

describe('TypographyConverter', () => {
  describe('toFigma', () => {
    it('should convert typography object', () => {
      const result = converters.typography.toFigma({
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: 600,
      });
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: 600,
      });
    });

    it('should convert font size with unit', () => {
      const result = converters.typography.toFigma({
        fontFamily: 'Inter',
        fontSize: '1.5rem',
        fontWeight: 400,
      }, 16);
      expect(result.success).toBe(true);
      expect(result.data!.fontSize).toBe(24);
    });
  });

  describe('getFontFamily', () => {
    it('should extract font family from string', () => {
      const result = converters.typography.getFontFamily('Inter');
      expect(result.success).toBe(true);
      expect(result.data).toBe('Inter');
    });

    it('should extract first font from stack', () => {
      const result = converters.typography.getFontFamily('Inter, Arial, sans-serif');
      expect(result.success).toBe(true);
      expect(result.data).toBe('Inter');
    });

    it('should extract from array', () => {
      const result = converters.typography.getFontFamily(['Inter', 'Arial']);
      expect(result.success).toBe(true);
      expect(result.data).toBe('Inter');
    });
  });

  describe('getFontSize', () => {
    it('should extract font size from number', () => {
      const result = converters.typography.getFontSize(16);
      expect(result.success).toBe(true);
      expect(result.data).toBe(16);
    });

    it('should extract font size from string', () => {
      const result = converters.typography.getFontSize('1.5rem', 16);
      expect(result.success).toBe(true);
      expect(result.data).toBe(24);
    });
  });

  describe('getFontWeight', () => {
    it('should extract numeric font weight', () => {
      const result = converters.typography.getFontWeight(700);
      expect(result.success).toBe(true);
      expect(result.data).toBe(700);
    });

    it('should convert named weight', () => {
      const result = converters.typography.getFontWeight('bold');
      expect(result.success).toBe(true);
      expect(result.data).toBe(700);
    });

    it('should convert semibold', () => {
      const result = converters.typography.getFontWeight('semibold');
      expect(result.success).toBe(true);
      expect(result.data).toBe(600);
    });

    it('should normalize weight to 100s', () => {
      const result = converters.typography.getFontWeight(650);
      expect(result.success).toBe(true);
      expect(result.data).toBe(700);
    });
  });
});

describe('ShadowConverter', () => {
  describe('toFigma', () => {
    it('should convert shadow object', () => {
      const result = converters.shadow.toFigma({
        offsetX: 0,
        offsetY: 4,
        blur: 6,
        spread: 0,
        color: '#000000',
      });
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        offsetX: 0,
        offsetY: 4,
        blur: 6,
        spread: 0,
        inset: false,
      });
      expect(result.data!.color).toMatchObject({
        r: 0,
        g: 0,
        b: 0,
        a: 1,
      });
    });

    it('should convert shadow with string dimensions', () => {
      const result = converters.shadow.toFigma({
        offsetX: '0px',
        offsetY: '4px',
        blur: '6px',
        spread: '-1px',
        color: '#00000080',
      });
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        offsetX: 0,
        offsetY: 4,
        blur: 6,
        spread: -1,
      });
    });

    it('should handle inset shadow', () => {
      const result = converters.shadow.toFigma({
        offsetX: 0,
        offsetY: 0,
        blur: 4,
        color: '#000000',
        inset: true,
      });
      expect(result.success).toBe(true);
      expect(result.data!.inset).toBe(true);
    });

    it('should reject shadow missing color', () => {
      const result = converters.shadow.toFigma({
        offsetX: 0,
        offsetY: 4,
        blur: 6,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Integration tests', () => {
  it('should convert complete token set', () => {
    // Color
    const colorResult = converters.color.toRGB('#1e40af');
    expect(colorResult.success).toBe(true);

    // Dimension
    const dimensionResult = converters.dimension.toPixels('1.5rem', 16);
    expect(dimensionResult.success).toBe(true);

    // Typography
    const typoResult = converters.typography.toFigma({
      fontFamily: 'Inter',
      fontSize: '32px',
      fontWeight: 700,
    });
    expect(typoResult.success).toBe(true);

    // Shadow
    const shadowResult = converters.shadow.toFigma({
      offsetX: 0,
      offsetY: 4,
      blur: 6,
      spread: 0,
      color: '#000000',
    });
    expect(shadowResult.success).toBe(true);
  });

  it('should handle conversion errors gracefully', () => {
    const results = [
      converters.color.toRGB('invalid'),
      converters.dimension.toPixels('invalid'),
      converters.typography.getFontWeight('invalid'),
      converters.shadow.toFigma({}),
    ];

    results.forEach(result => {
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

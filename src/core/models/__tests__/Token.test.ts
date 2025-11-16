// ====================================================================================
// TOKEN TYPE GUARD TESTS
// Tests discriminated union type guards and type narrowing
// ====================================================================================

import { describe, it, expect } from '@jest/globals';
import {
  Token,
  LegacyToken,
  TokenBase,
  ColorValue,
  DimensionValue,
  TypographyValue,
  ShadowValue,
  CubicBezierValue,
  isColorToken,
  isDimensionToken,
  isTypographyToken,
  isShadowToken,
  isFontSizeToken,
  isFontWeightToken,
  isFontFamilyToken,
  isLineHeightToken,
  isLetterSpacingToken,
  isSpacingToken,
  isNumberToken,
  isStringToken,
  isBooleanToken,
  isCubicBezierToken,
  isDurationToken,
} from '../Token';

// ====================================================================================
// TEST FIXTURES
// ====================================================================================

const baseTokenProps: Omit<TokenBase, 'id' | 'path' | 'name' | 'qualifiedName' | 'projectId' | 'collection' | 'sourceFormat' | 'source' | 'extensions' | 'tags' | 'status' | 'created' | 'lastModified'> = {};

function createBaseToken(type: string, name: string): TokenBase {
  return {
    id: `test-${type}-${name}`,
    path: [type, name],
    name,
    qualifiedName: `${type}.${name}`,
    projectId: 'test-project',
    collection: 'test-collection',
    sourceFormat: 'w3c',
    source: {
      type: 'local',
      location: 'test',
      imported: new Date().toISOString(),
    },
    extensions: {},
    tags: [],
    status: 'active',
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  };
}

// ====================================================================================
// COLOR TOKEN TESTS
// ====================================================================================

describe('isColorToken', () => {
  it('should return true for color token with ColorValue', () => {
    const colorValue: ColorValue = { hex: '#1e40af' };
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: colorValue,
    };

    expect(isColorToken(token)).toBe(true);
  });

  it('should narrow type to ColorToken', () => {
    const colorValue: ColorValue = { hex: '#1e40af', r: 30, g: 64, b: 175, a: 1 };
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: colorValue,
    };

    if (isColorToken(token)) {
      // TypeScript should know token.value is ColorValue
      const hex: string | undefined = token.value.hex;
      const r: number | undefined = token.value.r;
      expect(hex).toBe('#1e40af');
      expect(r).toBe(30);
    } else {
      fail('Should be color token');
    }
  });

  it('should return false for non-color token', () => {
    const token: Token = {
      ...createBaseToken('dimension', 'spacing'),
      type: 'dimension',
      rawValue: '16px',
      value: { value: 16, unit: 'px' },
    };

    expect(isColorToken(token)).toBe(false);
  });

  it('should work with legacy token', () => {
    const legacyToken: LegacyToken = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isColorToken(legacyToken)).toBe(true);
  });
});

// ====================================================================================
// DIMENSION TOKEN TESTS
// ====================================================================================

describe('isDimensionToken', () => {
  it('should return true for dimension token with DimensionValue', () => {
    const dimensionValue: DimensionValue = { value: 16, unit: 'px' };
    const token: Token = {
      ...createBaseToken('dimension', 'spacing'),
      type: 'dimension',
      rawValue: '16px',
      value: dimensionValue,
    };

    expect(isDimensionToken(token)).toBe(true);
  });

  it('should narrow type to DimensionToken', () => {
    const dimensionValue: DimensionValue = { value: 1.5, unit: 'rem' };
    const token: Token = {
      ...createBaseToken('dimension', 'spacing'),
      type: 'dimension',
      rawValue: '1.5rem',
      value: dimensionValue,
    };

    if (isDimensionToken(token)) {
      // TypeScript should know token.value is DimensionValue
      const value: number = token.value.value;
      const unit: string = token.value.unit;
      expect(value).toBe(1.5);
      expect(unit).toBe('rem');
    } else {
      fail('Should be dimension token');
    }
  });

  it('should return false for non-dimension token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isDimensionToken(token)).toBe(false);
  });
});

// ====================================================================================
// TYPOGRAPHY TOKEN TESTS
// ====================================================================================

describe('isTypographyToken', () => {
  it('should return true for typography token with TypographyValue', () => {
    const typographyValue: TypographyValue = {
      fontFamily: 'Inter',
      fontSize: { value: 16, unit: 'px' },
      fontWeight: 600,
      lineHeight: 1.5,
    };
    const token: Token = {
      ...createBaseToken('typography', 'heading'),
      type: 'typography',
      rawValue: typographyValue,
      value: typographyValue,
    };

    expect(isTypographyToken(token)).toBe(true);
  });

  it('should narrow type to TypographyToken', () => {
    const typographyValue: TypographyValue = {
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: 700,
    };
    const token: Token = {
      ...createBaseToken('typography', 'heading'),
      type: 'typography',
      rawValue: typographyValue,
      value: typographyValue,
    };

    if (isTypographyToken(token)) {
      // TypeScript should know token.value is TypographyValue
      const fontFamily: string | undefined = token.value.fontFamily;
      const fontSize: number | string | DimensionValue | undefined = token.value.fontSize;
      expect(fontFamily).toBe('Inter');
      expect(fontSize).toBe(16);
    } else {
      fail('Should be typography token');
    }
  });

  it('should return false for non-typography token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isTypographyToken(token)).toBe(false);
  });
});

// ====================================================================================
// SHADOW TOKEN TESTS
// ====================================================================================

describe('isShadowToken', () => {
  it('should return true for shadow token with ShadowValue', () => {
    const shadowValue: ShadowValue = {
      offsetX: 0,
      offsetY: 4,
      blur: 6,
      spread: 0,
      color: { hex: '#000000', a: 0.1 },
    };
    const token: Token = {
      ...createBaseToken('shadow', 'md'),
      type: 'shadow',
      rawValue: shadowValue,
      value: shadowValue,
    };

    expect(isShadowToken(token)).toBe(true);
  });

  it('should narrow type to ShadowToken', () => {
    const shadowValue: ShadowValue = {
      offsetX: '0px',
      offsetY: '4px',
      blur: '6px',
      spread: '-1px',
      color: '#000000',
      inset: false,
    };
    const token: Token = {
      ...createBaseToken('shadow', 'md'),
      type: 'shadow',
      rawValue: shadowValue,
      value: shadowValue,
    };

    if (isShadowToken(token)) {
      // TypeScript should know token.value is ShadowValue
      const offsetX: number | string = token.value.offsetX;
      const color: string | ColorValue = token.value.color;
      const inset: boolean | undefined = token.value.inset;
      expect(offsetX).toBe('0px');
      expect(color).toBe('#000000');
      expect(inset).toBe(false);
    } else {
      fail('Should be shadow token');
    }
  });

  it('should return false for non-shadow token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isShadowToken(token)).toBe(false);
  });
});

// ====================================================================================
// FONT SIZE TOKEN TESTS
// ====================================================================================

describe('isFontSizeToken', () => {
  it('should return true for fontSize token with DimensionValue', () => {
    const value: DimensionValue = { value: 16, unit: 'px' };
    const token: Token = {
      ...createBaseToken('fontSize', '16'),
      type: 'fontSize',
      rawValue: '16px',
      value,
    };

    expect(isFontSizeToken(token)).toBe(true);
  });

  it('should return true for fontSize token with number', () => {
    const token: Token = {
      ...createBaseToken('fontSize', '16'),
      type: 'fontSize',
      rawValue: 16,
      value: 16,
    };

    expect(isFontSizeToken(token)).toBe(true);
  });

  it('should narrow type to FontSizeToken', () => {
    const value: DimensionValue = { value: 1.5, unit: 'rem' };
    const token: Token = {
      ...createBaseToken('fontSize', '16'),
      type: 'fontSize',
      rawValue: '1.5rem',
      value,
    };

    if (isFontSizeToken(token)) {
      // TypeScript should know token.value is DimensionValue | number
      const tokenValue = token.value;
      if (typeof tokenValue === 'number') {
        fail('Should be DimensionValue');
      } else {
        expect(tokenValue.value).toBe(1.5);
        expect(tokenValue.unit).toBe('rem');
      }
    } else {
      fail('Should be fontSize token');
    }
  });

  it('should return false for non-fontSize token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isFontSizeToken(token)).toBe(false);
  });
});

// ====================================================================================
// FONT WEIGHT TOKEN TESTS
// ====================================================================================

describe('isFontWeightToken', () => {
  it('should return true for fontWeight token with number', () => {
    const token: Token = {
      ...createBaseToken('fontWeight', 'bold'),
      type: 'fontWeight',
      rawValue: 700,
      value: 700,
    };

    expect(isFontWeightToken(token)).toBe(true);
  });

  it('should return true for fontWeight token with string', () => {
    const token: Token = {
      ...createBaseToken('fontWeight', 'bold'),
      type: 'fontWeight',
      rawValue: 'bold',
      value: 'bold',
    };

    expect(isFontWeightToken(token)).toBe(true);
  });

  it('should narrow type to FontWeightToken', () => {
    const token: Token = {
      ...createBaseToken('fontWeight', 'semibold'),
      type: 'fontWeight',
      rawValue: 600,
      value: 600,
    };

    if (isFontWeightToken(token)) {
      // TypeScript should know token.value is number | string
      const value: number | string = token.value;
      expect(value).toBe(600);
    } else {
      fail('Should be fontWeight token');
    }
  });

  it('should return false for non-fontWeight token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isFontWeightToken(token)).toBe(false);
  });
});

// ====================================================================================
// FONT FAMILY TOKEN TESTS
// ====================================================================================

describe('isFontFamilyToken', () => {
  it('should return true for fontFamily token', () => {
    const token: Token = {
      ...createBaseToken('fontFamily', 'primary'),
      type: 'fontFamily',
      rawValue: 'Inter',
      value: 'Inter',
    };

    expect(isFontFamilyToken(token)).toBe(true);
  });

  it('should narrow type to FontFamilyToken', () => {
    const token: Token = {
      ...createBaseToken('fontFamily', 'mono'),
      type: 'fontFamily',
      rawValue: 'JetBrains Mono',
      value: 'JetBrains Mono',
    };

    if (isFontFamilyToken(token)) {
      // TypeScript should know token.value is string
      const value: string = token.value;
      expect(value).toBe('JetBrains Mono');
    } else {
      fail('Should be fontFamily token');
    }
  });

  it('should return false for non-fontFamily token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isFontFamilyToken(token)).toBe(false);
  });
});

// ====================================================================================
// LINE HEIGHT TOKEN TESTS
// ====================================================================================

describe('isLineHeightToken', () => {
  it('should return true for lineHeight token with DimensionValue', () => {
    const value: DimensionValue = { value: 24, unit: 'px' };
    const token: Token = {
      ...createBaseToken('lineHeight', 'normal'),
      type: 'lineHeight',
      rawValue: '24px',
      value,
    };

    expect(isLineHeightToken(token)).toBe(true);
  });

  it('should return true for lineHeight token with number', () => {
    const token: Token = {
      ...createBaseToken('lineHeight', 'normal'),
      type: 'lineHeight',
      rawValue: 1.5,
      value: 1.5,
    };

    expect(isLineHeightToken(token)).toBe(true);
  });

  it('should return true for lineHeight token with string', () => {
    const token: Token = {
      ...createBaseToken('lineHeight', 'normal'),
      type: 'lineHeight',
      rawValue: 'normal',
      value: 'normal',
    };

    expect(isLineHeightToken(token)).toBe(true);
  });

  it('should narrow type to LineHeightToken', () => {
    const token: Token = {
      ...createBaseToken('lineHeight', 'tight'),
      type: 'lineHeight',
      rawValue: 1.25,
      value: 1.25,
    };

    if (isLineHeightToken(token)) {
      // TypeScript should know token.value is DimensionValue | number | string
      const value: DimensionValue | number | string = token.value;
      expect(value).toBe(1.25);
    } else {
      fail('Should be lineHeight token');
    }
  });

  it('should return false for non-lineHeight token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isLineHeightToken(token)).toBe(false);
  });
});

// ====================================================================================
// LETTER SPACING TOKEN TESTS
// ====================================================================================

describe('isLetterSpacingToken', () => {
  it('should return true for letterSpacing token with DimensionValue', () => {
    const value: DimensionValue = { value: 0.05, unit: 'em' };
    const token: Token = {
      ...createBaseToken('letterSpacing', 'wide'),
      type: 'letterSpacing',
      rawValue: '0.05em',
      value,
    };

    expect(isLetterSpacingToken(token)).toBe(true);
  });

  it('should return true for letterSpacing token with number', () => {
    const token: Token = {
      ...createBaseToken('letterSpacing', 'normal'),
      type: 'letterSpacing',
      rawValue: 0,
      value: 0,
    };

    expect(isLetterSpacingToken(token)).toBe(true);
  });

  it('should return true for letterSpacing token with string', () => {
    const token: Token = {
      ...createBaseToken('letterSpacing', 'tight'),
      type: 'letterSpacing',
      rawValue: '-0.01em',
      value: '-0.01em',
    };

    expect(isLetterSpacingToken(token)).toBe(true);
  });

  it('should narrow type to LetterSpacingToken', () => {
    const value: DimensionValue = { value: -0.01, unit: 'em' };
    const token: Token = {
      ...createBaseToken('letterSpacing', 'tight'),
      type: 'letterSpacing',
      rawValue: '-0.01em',
      value,
    };

    if (isLetterSpacingToken(token)) {
      // TypeScript should know token.value is DimensionValue | number | string
      const tokenValue = token.value;
      if (typeof tokenValue === 'number' || typeof tokenValue === 'string') {
        fail('Should be DimensionValue');
      } else {
        expect(tokenValue.value).toBe(-0.01);
        expect(tokenValue.unit).toBe('em');
      }
    } else {
      fail('Should be letterSpacing token');
    }
  });

  it('should return false for non-letterSpacing token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isLetterSpacingToken(token)).toBe(false);
  });
});

// ====================================================================================
// SPACING TOKEN TESTS
// ====================================================================================

describe('isSpacingToken', () => {
  it('should return true for spacing token with DimensionValue', () => {
    const value: DimensionValue = { value: 16, unit: 'px' };
    const token: Token = {
      ...createBaseToken('spacing', '4'),
      type: 'spacing',
      rawValue: '16px',
      value,
    };

    expect(isSpacingToken(token)).toBe(true);
  });

  it('should narrow type to SpacingToken', () => {
    const value: DimensionValue = { value: 1, unit: 'rem' };
    const token: Token = {
      ...createBaseToken('spacing', '4'),
      type: 'spacing',
      rawValue: '1rem',
      value,
    };

    if (isSpacingToken(token)) {
      // TypeScript should know token.value is DimensionValue
      const tokenValue: DimensionValue = token.value;
      expect(tokenValue.value).toBe(1);
      expect(tokenValue.unit).toBe('rem');
    } else {
      fail('Should be spacing token');
    }
  });

  it('should return false for non-spacing token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isSpacingToken(token)).toBe(false);
  });
});

// ====================================================================================
// NUMBER TOKEN TESTS
// ====================================================================================

describe('isNumberToken', () => {
  it('should return true for number token', () => {
    const token: Token = {
      ...createBaseToken('number', 'opacity'),
      type: 'number',
      rawValue: 0.8,
      value: 0.8,
    };

    expect(isNumberToken(token)).toBe(true);
  });

  it('should narrow type to NumberToken', () => {
    const token: Token = {
      ...createBaseToken('number', 'scale'),
      type: 'number',
      rawValue: 1.5,
      value: 1.5,
    };

    if (isNumberToken(token)) {
      // TypeScript should know token.value is number
      const value: number = token.value;
      expect(value).toBe(1.5);
    } else {
      fail('Should be number token');
    }
  });

  it('should return false for non-number token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isNumberToken(token)).toBe(false);
  });
});

// ====================================================================================
// STRING TOKEN TESTS
// ====================================================================================

describe('isStringToken', () => {
  it('should return true for string token', () => {
    const token: Token = {
      ...createBaseToken('string', 'message'),
      type: 'string',
      rawValue: 'Hello World',
      value: 'Hello World',
    };

    expect(isStringToken(token)).toBe(true);
  });

  it('should narrow type to StringToken', () => {
    const token: Token = {
      ...createBaseToken('string', 'url'),
      type: 'string',
      rawValue: 'https://example.com',
      value: 'https://example.com',
    };

    if (isStringToken(token)) {
      // TypeScript should know token.value is string
      const value: string = token.value;
      expect(value).toBe('https://example.com');
    } else {
      fail('Should be string token');
    }
  });

  it('should return false for non-string token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isStringToken(token)).toBe(false);
  });
});

// ====================================================================================
// BOOLEAN TOKEN TESTS
// ====================================================================================

describe('isBooleanToken', () => {
  it('should return true for boolean token', () => {
    const token: Token = {
      ...createBaseToken('boolean', 'enabled'),
      type: 'boolean',
      rawValue: true,
      value: true,
    };

    expect(isBooleanToken(token)).toBe(true);
  });

  it('should narrow type to BooleanToken', () => {
    const token: Token = {
      ...createBaseToken('boolean', 'disabled'),
      type: 'boolean',
      rawValue: false,
      value: false,
    };

    if (isBooleanToken(token)) {
      // TypeScript should know token.value is boolean
      const value: boolean = token.value;
      expect(value).toBe(false);
    } else {
      fail('Should be boolean token');
    }
  });

  it('should return false for non-boolean token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isBooleanToken(token)).toBe(false);
  });
});

// ====================================================================================
// CUBIC BEZIER TOKEN TESTS
// ====================================================================================

describe('isCubicBezierToken', () => {
  it('should return true for cubicBezier token', () => {
    const value: CubicBezierValue = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
    const token: Token = {
      ...createBaseToken('cubicBezier', 'ease'),
      type: 'cubicBezier',
      rawValue: value,
      value,
    };

    expect(isCubicBezierToken(token)).toBe(true);
  });

  it('should narrow type to CubicBezierToken', () => {
    const value: CubicBezierValue = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
    const token: Token = {
      ...createBaseToken('cubicBezier', 'ease'),
      type: 'cubicBezier',
      rawValue: value,
      value,
    };

    if (isCubicBezierToken(token)) {
      // TypeScript should know token.value is CubicBezierValue
      const tokenValue: CubicBezierValue = token.value;
      expect(tokenValue.x1).toBe(0.42);
      expect(tokenValue.y1).toBe(0);
      expect(tokenValue.x2).toBe(0.58);
      expect(tokenValue.y2).toBe(1);
    } else {
      fail('Should be cubicBezier token');
    }
  });

  it('should return false for non-cubicBezier token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isCubicBezierToken(token)).toBe(false);
  });
});

// ====================================================================================
// DURATION TOKEN TESTS
// ====================================================================================

describe('isDurationToken', () => {
  it('should return true for duration token with number', () => {
    const token: Token = {
      ...createBaseToken('duration', 'fast'),
      type: 'duration',
      rawValue: 200,
      value: 200,
    };

    expect(isDurationToken(token)).toBe(true);
  });

  it('should return true for duration token with string', () => {
    const token: Token = {
      ...createBaseToken('duration', 'slow'),
      type: 'duration',
      rawValue: '500ms',
      value: '500ms',
    };

    expect(isDurationToken(token)).toBe(true);
  });

  it('should narrow type to DurationToken', () => {
    const token: Token = {
      ...createBaseToken('duration', 'medium'),
      type: 'duration',
      rawValue: '300ms',
      value: '300ms',
    };

    if (isDurationToken(token)) {
      // TypeScript should know token.value is number | string
      const value: number | string = token.value;
      expect(value).toBe('300ms');
    } else {
      fail('Should be duration token');
    }
  });

  it('should return false for non-duration token', () => {
    const token: Token = {
      ...createBaseToken('color', 'primary'),
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };

    expect(isDurationToken(token)).toBe(false);
  });
});

// ====================================================================================
// TYPE NARROWING INTEGRATION TESTS
// ====================================================================================

describe('Type narrowing integration', () => {
  it('should handle multiple type guards in sequence', () => {
    const tokens: Token[] = [
      {
        ...createBaseToken('color', 'primary'),
        type: 'color',
        rawValue: '#1e40af',
        value: { hex: '#1e40af' },
      },
      {
        ...createBaseToken('dimension', 'spacing'),
        type: 'dimension',
        rawValue: '16px',
        value: { value: 16, unit: 'px' },
      },
      {
        ...createBaseToken('typography', 'heading'),
        type: 'typography',
        rawValue: {},
        value: { fontFamily: 'Inter', fontSize: 32, fontWeight: 700 },
      },
    ];

    const colorTokens = tokens.filter(isColorToken);
    const dimensionTokens = tokens.filter(isDimensionToken);
    const typographyTokens = tokens.filter(isTypographyToken);

    expect(colorTokens).toHaveLength(1);
    expect(dimensionTokens).toHaveLength(1);
    expect(typographyTokens).toHaveLength(1);

    // TypeScript should know the exact type after filtering
    if (colorTokens.length > 0) {
      const hex = colorTokens[0].value.hex;
      expect(hex).toBe('#1e40af');
    }
  });

  it('should work with switch statement', () => {
    // Create token without explicit type annotation to allow switch on all cases
    const token = {
      ...createBaseToken('shadow', 'md'),
      type: 'shadow' as const,
      rawValue: {},
      value: {
        offsetX: 0,
        offsetY: 4,
        blur: 6,
        spread: 0,
        color: '#000000',
      },
    };

    // Function that accepts any Token and switches on type
    function processToken(t: Token): string {
      switch (t.type) {
        case 'color':
          return 'color';
        case 'shadow':
          // TypeScript knows t.value is ShadowValue here
          return `shadow: ${t.value.offsetX}, ${t.value.offsetY}`;
        default:
          return 'other';
      }
    }

    const result = processToken(token as Token);
    expect(result).toBe('shadow: 0, 4');
  });

  it('should work with complex type checking logic', () => {
    const tokens: Token[] = [
      {
        ...createBaseToken('fontSize', '16'),
        type: 'fontSize',
        rawValue: 16,
        value: 16,
      },
      {
        ...createBaseToken('fontWeight', 'bold'),
        type: 'fontWeight',
        rawValue: 700,
        value: 700,
      },
      {
        ...createBaseToken('fontFamily', 'primary'),
        type: 'fontFamily',
        rawValue: 'Inter',
        value: 'Inter',
      },
    ];

    // Find all font-related tokens
    const fontTokens = tokens.filter(
      (t) => isFontSizeToken(t) || isFontWeightToken(t) || isFontFamilyToken(t)
    );

    expect(fontTokens).toHaveLength(3);

    // Process each font token with proper type narrowing
    fontTokens.forEach((token) => {
      if (isFontSizeToken(token)) {
        expect(typeof token.value === 'number' || typeof token.value === 'object').toBe(true);
      } else if (isFontWeightToken(token)) {
        expect(typeof token.value === 'number' || typeof token.value === 'string').toBe(true);
      } else if (isFontFamilyToken(token)) {
        expect(typeof token.value).toBe('string');
      }
    });
  });
});

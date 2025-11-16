// ====================================================================================
// VALIDATION SCHEMA TESTS
// Tests Zod schemas for runtime type validation
// ====================================================================================

import { describe, it, expect } from '@jest/globals';
import {
  ColorValueSchema,
  DimensionValueSchema,
  ShadowValueSchema,
  TypographyValueSchema,
  CubicBezierValueSchema,
  TokenSourceSchema,
  TokenValidationSchema,
  FigmaExtensionsSchema,
  TokenExtensionsSchema,
  TokenBaseSchema,
  ColorTokenSchema,
  DimensionTokenSchema,
  TypographyTokenSchema,
  ShadowTokenSchema,
  FontSizeTokenSchema,
  FontWeightTokenSchema,
  FontFamilyTokenSchema,
  LineHeightTokenSchema,
  LetterSpacingTokenSchema,
  SpacingTokenSchema,
  NumberTokenSchema,
  StringTokenSchema,
  BooleanTokenSchema,
  CubicBezierTokenSchema,
  DurationTokenSchema,
  TokenSchema,
  LegacyTokenSchema,
  validateToken,
  validateTokens,
  validateTokenValue,
} from '../schemas';

// ====================================================================================
// VALUE TYPE SCHEMA TESTS
// ====================================================================================

describe('ColorValueSchema', () => {
  it('should validate hex color', () => {
    const result = ColorValueSchema.safeParse({ hex: '#1e40af' });
    expect(result.success).toBe(true);
  });

  it('should validate RGB color', () => {
    const result = ColorValueSchema.safeParse({ r: 30, g: 64, b: 175, a: 1 });
    expect(result.success).toBe(true);
  });

  it('should validate HSL color', () => {
    const result = ColorValueSchema.safeParse({ h: 220, s: 71, l: 40 });
    expect(result.success).toBe(true);
  });

  it('should reject invalid hex format', () => {
    const result = ColorValueSchema.safeParse({ hex: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject color with no values', () => {
    const result = ColorValueSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject RGB with out-of-range values', () => {
    const result = ColorValueSchema.safeParse({ r: 300, g: 64, b: 175 });
    expect(result.success).toBe(false);
  });
});

describe('DimensionValueSchema', () => {
  it('should validate dimension with px', () => {
    const result = DimensionValueSchema.safeParse({ value: 16, unit: 'px' });
    expect(result.success).toBe(true);
  });

  it('should validate dimension with rem', () => {
    const result = DimensionValueSchema.safeParse({ value: 1.5, unit: 'rem' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid unit', () => {
    const result = DimensionValueSchema.safeParse({ value: 16, unit: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject missing value', () => {
    const result = DimensionValueSchema.safeParse({ unit: 'px' });
    expect(result.success).toBe(false);
  });
});

describe('ShadowValueSchema', () => {
  it('should validate shadow with all properties', () => {
    const result = ShadowValueSchema.safeParse({
      offsetX: 0,
      offsetY: 4,
      blur: 6,
      spread: 0,
      color: '#000000',
      inset: false,
    });
    expect(result.success).toBe(true);
  });

  it('should validate shadow with string values', () => {
    const result = ShadowValueSchema.safeParse({
      offsetX: '0px',
      offsetY: '4px',
      blur: '6px',
      spread: '-1px',
      color: { hex: '#000000' },
    });
    expect(result.success).toBe(true);
  });

  it('should validate shadow without optional properties', () => {
    const result = ShadowValueSchema.safeParse({
      offsetX: 0,
      offsetY: 4,
      blur: 6,
      color: '#000000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject shadow missing required properties', () => {
    const result = ShadowValueSchema.safeParse({
      offsetX: 0,
      offsetY: 4,
      // Missing blur and color
    });
    expect(result.success).toBe(false);
  });
});

describe('TypographyValueSchema', () => {
  it('should validate complete typography value', () => {
    const result = TypographyValueSchema.safeParse({
      fontFamily: 'Inter',
      fontSize: 16,
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '0.01em',
    });
    expect(result.success).toBe(true);
  });

  it('should validate typography with dimension values', () => {
    const result = TypographyValueSchema.safeParse({
      fontFamily: 'Inter',
      fontSize: { value: 16, unit: 'px' },
      lineHeight: { value: 24, unit: 'px' },
    });
    expect(result.success).toBe(true);
  });

  it('should validate empty typography value', () => {
    const result = TypographyValueSchema.safeParse({});
    expect(result.success).toBe(true); // All fields optional
  });
});

describe('CubicBezierValueSchema', () => {
  it('should validate cubic bezier', () => {
    const result = CubicBezierValueSchema.safeParse({
      x1: 0.42,
      y1: 0,
      x2: 0.58,
      y2: 1,
    });
    expect(result.success).toBe(true);
  });

  it('should reject out-of-range x values', () => {
    const result = CubicBezierValueSchema.safeParse({
      x1: 1.5, // Out of range
      y1: 0,
      x2: 0.58,
      y2: 1,
    });
    expect(result.success).toBe(false);
  });

  it('should allow any y values', () => {
    const result = CubicBezierValueSchema.safeParse({
      x1: 0.42,
      y1: -10, // Can be negative
      x2: 0.58,
      y2: 10, // Can be > 1
    });
    expect(result.success).toBe(true);
  });
});

// ====================================================================================
// SOURCE AND METADATA SCHEMA TESTS
// ====================================================================================

describe('TokenSourceSchema', () => {
  it('should validate token source', () => {
    const result = TokenSourceSchema.safeParse({
      type: 'github',
      location: 'https://github.com/user/repo',
      imported: '2025-01-01T00:00:00Z',
      branch: 'main',
      commit: 'abc123',
    });
    expect(result.success).toBe(true);
  });

  it('should validate without optional fields', () => {
    const result = TokenSourceSchema.safeParse({
      type: 'local',
      location: '/path/to/file.json',
      imported: '2025-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid source type', () => {
    const result = TokenSourceSchema.safeParse({
      type: 'invalid',
      location: '/path/to/file.json',
      imported: '2025-01-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('TokenExtensionsSchema', () => {
  it('should validate with figma extensions', () => {
    const result = TokenExtensionsSchema.safeParse({
      figma: {
        variableId: 'var-123',
        collectionId: 'col-456',
        collectionName: 'My Collection',
      },
    });
    expect(result.success).toBe(true);
  });

  it('should validate with custom extensions', () => {
    const result = TokenExtensionsSchema.safeParse({
      customField: 'custom value',
      anotherField: 123,
    });
    expect(result.success).toBe(true);
  });

  it('should validate empty extensions', () => {
    const result = TokenExtensionsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ====================================================================================
// TOKEN SCHEMA TESTS
// ====================================================================================

function createBaseTokenData() {
  return {
    id: 'test-token-id',
    path: ['color', 'primary'],
    name: 'primary',
    qualifiedName: 'color.primary',
    projectId: 'test-project',
    collection: 'primitives',
    sourceFormat: 'w3c' as const,
    source: {
      type: 'local' as const,
      location: 'test.json',
      imported: '2025-01-01T00:00:00Z',
    },
    extensions: {},
    tags: [],
    status: 'active' as const,
    created: '2025-01-01T00:00:00Z',
    lastModified: '2025-01-01T00:00:00Z',
  };
}

describe('ColorTokenSchema', () => {
  it('should validate color token', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'color' as const,
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };
    const result = ColorTokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });

  it('should reject color token with invalid value', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'color' as const,
      rawValue: 'invalid',
      value: { hex: 'invalid' },
    };
    const result = ColorTokenSchema.safeParse(token);
    expect(result.success).toBe(false);
  });

  it('should reject color token with wrong type', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'dimension' as const, // Wrong type
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };
    const result = ColorTokenSchema.safeParse(token);
    expect(result.success).toBe(false);
  });
});

describe('DimensionTokenSchema', () => {
  it('should validate dimension token', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'dimension' as const,
      rawValue: '16px',
      value: { value: 16, unit: 'px' as const },
    };
    const result = DimensionTokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });
});

describe('TypographyTokenSchema', () => {
  it('should validate typography token', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'typography' as const,
      rawValue: {},
      value: {
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: 600,
      },
    };
    const result = TypographyTokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });

  it('should validate typography with empty value', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'typography' as const,
      rawValue: {},
      value: {},
    };
    const result = TypographyTokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });
});

describe('ShadowTokenSchema', () => {
  it('should validate shadow token', () => {
    const token = {
      ...createBaseTokenData(),
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
    const result = ShadowTokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });
});

describe('FontSizeTokenSchema', () => {
  it('should validate fontSize with number', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'fontSize' as const,
      rawValue: 16,
      value: 16,
    };
    const result = FontSizeTokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });

  it('should validate fontSize with dimension', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'fontSize' as const,
      rawValue: '1rem',
      value: { value: 1, unit: 'rem' as const },
    };
    const result = FontSizeTokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });
});

describe('TokenSchema (discriminated union)', () => {
  it('should validate color token via discriminated union', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'color' as const,
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };
    const result = TokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });

  it('should validate dimension token via discriminated union', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'dimension' as const,
      rawValue: '16px',
      value: { value: 16, unit: 'px' as const },
    };
    const result = TokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });

  it('should validate typography token via discriminated union', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'typography' as const,
      rawValue: {},
      value: { fontFamily: 'Inter' },
    };
    const result = TokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });

  it('should reject token with mismatched type and value', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'color' as const,
      rawValue: 16,
      value: 16, // Should be ColorValue
    };
    const result = TokenSchema.safeParse(token);
    expect(result.success).toBe(false);
  });

  it('should reject token missing required base fields', () => {
    const token = {
      type: 'color' as const,
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
      // Missing all base fields
    };
    const result = TokenSchema.safeParse(token);
    expect(result.success).toBe(false);
  });
});

describe('LegacyTokenSchema', () => {
  it('should validate legacy token', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'color' as const,
      rawValue: '#1e40af',
      value: { hex: '#1e40af' }, // Any value allowed
    };
    const result = LegacyTokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });

  it('should allow any value type in legacy token', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'color' as const,
      rawValue: 123,
      value: 123, // Wrong value type, but legacy allows it
    };
    const result = LegacyTokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });
});

// ====================================================================================
// VALIDATION HELPER TESTS
// ====================================================================================

describe('validateToken', () => {
  it('should validate valid token', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'color' as const,
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
    };
    const result = validateToken(token);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should return error for invalid token', () => {
    const token = {
      type: 'color',
      value: 'invalid',
      // Missing required fields
    };
    const result = validateToken(token);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('validateTokens', () => {
  it('should validate array of valid tokens', () => {
    const tokens = [
      {
        ...createBaseTokenData(),
        id: 'token-1',
        type: 'color' as const,
        rawValue: '#1e40af',
        value: { hex: '#1e40af' },
      },
      {
        ...createBaseTokenData(),
        id: 'token-2',
        type: 'dimension' as const,
        rawValue: '16px',
        value: { value: 16, unit: 'px' as const },
      },
    ];
    const result = validateTokens(tokens);
    expect(result.success).toBe(true);
    expect(result.validTokens).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should collect errors for invalid tokens', () => {
    const tokens = [
      {
        ...createBaseTokenData(),
        type: 'color' as const,
        rawValue: '#1e40af',
        value: { hex: '#1e40af' },
      },
      {
        type: 'invalid',
        // Missing required fields
      },
    ];
    const result = validateTokens(tokens);
    expect(result.success).toBe(false);
    expect(result.validTokens).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].index).toBe(1);
  });
});

describe('validateTokenValue', () => {
  it('should validate color value', () => {
    const result = validateTokenValue({ hex: '#1e40af' }, 'color');
    expect(result.success).toBe(true);
  });

  it('should validate dimension value', () => {
    const result = validateTokenValue({ value: 16, unit: 'px' }, 'dimension');
    expect(result.success).toBe(true);
  });

  it('should validate typography value', () => {
    const result = validateTokenValue({ fontFamily: 'Inter', fontSize: 16 }, 'typography');
    expect(result.success).toBe(true);
  });

  it('should reject invalid value for type', () => {
    const result = validateTokenValue('not a color', 'color');
    expect(result.success).toBe(false);
  });

  it('should validate any value for unknown type', () => {
    const result = validateTokenValue('anything', 'unknown-type');
    expect(result.success).toBe(true);
  });
});

// ====================================================================================
// EDGE CASES
// ====================================================================================

describe('Edge cases', () => {
  it('should handle token with all optional fields populated', () => {
    const token = {
      ...createBaseTokenData(),
      type: 'color' as const,
      rawValue: '#1e40af',
      value: { hex: '#1e40af', r: 30, g: 64, b: 175, a: 1 },
      resolvedValue: { hex: '#1e40af', r: 30, g: 64, b: 175, a: 1 },
      aliasTo: 'color.base.blue',
      referencedBy: ['color.button.primary', 'color.link.default'],
      theme: 'light',
      brand: 'acme',
      description: 'Primary brand color',
      tags: ['brand', 'primary'],
      version: '1.0.0',
      validation: {
        isValid: true,
        errors: [],
        warnings: [],
      },
    };
    const result = TokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });

  it('should handle token with minimal required fields', () => {
    const token = {
      id: 'test',
      path: ['color'],
      name: 'color',
      qualifiedName: 'color',
      projectId: 'test',
      collection: 'test',
      sourceFormat: 'w3c' as const,
      source: {
        type: 'local' as const,
        location: 'test',
        imported: '2025-01-01T00:00:00Z',
      },
      extensions: {},
      tags: [],
      status: 'active' as const,
      created: '2025-01-01T00:00:00Z',
      lastModified: '2025-01-01T00:00:00Z',
      type: 'color' as const,
      rawValue: '#000',
      value: { hex: '#000000' },
    };
    const result = TokenSchema.safeParse(token);
    expect(result.success).toBe(true);
  });

  it('should reject empty object', () => {
    const result = TokenSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject null', () => {
    const result = TokenSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('should reject undefined', () => {
    const result = TokenSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });
});

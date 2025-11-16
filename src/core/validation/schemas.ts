// ====================================================================================
// ZOD VALIDATION SCHEMAS
// Runtime type validation for Token types
// ====================================================================================

import { z } from 'zod';

// ====================================================================================
// VALUE TYPE SCHEMAS
// ====================================================================================

/**
 * Color value schema
 * Validates ColorValue with all supported color space formats
 */
export const ColorValueSchema = z.object({
  colorSpace: z.enum(['sRGB', 'display-p3', 'hsl', 'hsla', 'rgb', 'rgba']).optional(),
  hex: z.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/, 'Invalid hex color format').optional(),
  r: z.number().min(0).max(255).optional(),
  g: z.number().min(0).max(255).optional(),
  b: z.number().min(0).max(255).optional(),
  a: z.number().min(0).max(1).optional(),
  h: z.number().min(0).max(360).optional(),
  s: z.number().min(0).max(100).optional(),
  l: z.number().min(0).max(100).optional(),
}).refine(
  (data) => {
    // Must have either hex, or rgb, or hsl values
    const hasHex = data.hex !== undefined;
    const hasRgb = data.r !== undefined && data.g !== undefined && data.b !== undefined;
    const hasHsl = data.h !== undefined && data.s !== undefined && data.l !== undefined;
    return hasHex || hasRgb || hasHsl;
  },
  { message: 'ColorValue must have either hex, rgb, or hsl values' }
);

/**
 * Dimension value schema
 * Validates DimensionValue with unit
 */
export const DimensionValueSchema = z.object({
  value: z.number(),
  unit: z.enum(['px', 'rem', 'em', '%', 'pt']),
});

/**
 * Shadow value schema
 * Validates ShadowValue with all properties
 */
export const ShadowValueSchema = z.object({
  offsetX: z.union([z.number(), z.string()]),
  offsetY: z.union([z.number(), z.string()]),
  blur: z.union([z.number(), z.string()]),
  spread: z.union([z.number(), z.string()]).optional(),
  color: z.union([z.string(), ColorValueSchema]),
  inset: z.boolean().optional(),
});

/**
 * Typography value schema
 * Validates TypographyValue with all typography properties
 */
export const TypographyValueSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.union([z.number(), z.string(), DimensionValueSchema]).optional(),
  fontWeight: z.union([z.number(), z.string()]).optional(),
  lineHeight: z.union([z.number(), z.string(), DimensionValueSchema]).optional(),
  letterSpacing: z.union([z.number(), z.string(), DimensionValueSchema]).optional(),
});

/**
 * Cubic bezier value schema
 * Validates CubicBezierValue timing function
 */
export const CubicBezierValueSchema = z.object({
  x1: z.number().min(0).max(1),
  y1: z.number(),
  x2: z.number().min(0).max(1),
  y2: z.number(),
});

// ====================================================================================
// SOURCE AND METADATA SCHEMAS
// ====================================================================================

/**
 * Token source schema
 * Validates where the token came from
 */
export const TokenSourceSchema = z.object({
  type: z.enum(['github', 'gitlab', 'local', 'api', 'figma']),
  location: z.string(),
  imported: z.string(), // ISO 8601 timestamp
  branch: z.string().optional(),
  commit: z.string().optional(),
});

/**
 * Token validation result schema
 */
export const TokenValidationSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

/**
 * Figma extensions schema
 */
export const FigmaExtensionsSchema = z.object({
  variableId: z.string().optional(),
  collectionId: z.string().optional(),
  collectionName: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  modeId: z.string().optional(),
  modeName: z.string().optional(),
});

/**
 * Token extensions schema
 * Allows custom extensions
 */
export const TokenExtensionsSchema = z.object({
  figma: FigmaExtensionsSchema.optional(),
  w3c: z.record(z.string(), z.any()).optional(),
  styleDictionary: z.record(z.string(), z.any()).optional(),
}).catchall(z.any()); // Allow any additional keys

// ====================================================================================
// TOKEN BASE SCHEMA
// ====================================================================================

/**
 * Token base schema
 * Validates properties common to all tokens
 */
export const TokenBaseSchema = z.object({
  // ==================== IDENTITY ====================
  id: z.string().min(1),
  path: z.array(z.string()).min(1),
  name: z.string().min(1),
  qualifiedName: z.string().min(1),

  // ==================== RELATIONSHIPS ====================
  aliasTo: z.string().optional(),
  referencedBy: z.array(z.string()).optional(),

  // ==================== ORGANIZATION ====================
  projectId: z.string().min(1),
  collection: z.string().min(1),
  theme: z.string().optional(),
  brand: z.string().optional(),

  // ==================== METADATA ====================
  description: z.string().optional(),
  sourceFormat: z.enum(['w3c', 'style-dictionary', 'figma', 'custom']),
  source: TokenSourceSchema,
  extensions: TokenExtensionsSchema,
  tags: z.array(z.string()),
  status: z.enum(['active', 'deprecated', 'draft', 'archived']),
  version: z.string().optional(),

  // ==================== TIMESTAMPS ====================
  created: z.string(), // ISO 8601 timestamp
  lastModified: z.string(), // ISO 8601 timestamp

  // ==================== VALIDATION ====================
  validation: TokenValidationSchema.optional(),
});

// ====================================================================================
// DISCRIMINATED UNION TOKEN SCHEMAS
// ====================================================================================

/**
 * Color token schema
 */
export const ColorTokenSchema = TokenBaseSchema.extend({
  type: z.literal('color'),
  rawValue: z.any(),
  value: ColorValueSchema,
  resolvedValue: ColorValueSchema.optional(),
});

/**
 * Dimension token schema
 */
export const DimensionTokenSchema = TokenBaseSchema.extend({
  type: z.literal('dimension'),
  rawValue: z.any(),
  value: DimensionValueSchema,
  resolvedValue: DimensionValueSchema.optional(),
});

/**
 * Font size token schema
 */
export const FontSizeTokenSchema = TokenBaseSchema.extend({
  type: z.literal('fontSize'),
  rawValue: z.any(),
  value: z.union([DimensionValueSchema, z.number()]),
  resolvedValue: z.union([DimensionValueSchema, z.number()]).optional(),
});

/**
 * Font weight token schema
 */
export const FontWeightTokenSchema = TokenBaseSchema.extend({
  type: z.literal('fontWeight'),
  rawValue: z.any(),
  value: z.union([z.number(), z.string()]),
  resolvedValue: z.union([z.number(), z.string()]).optional(),
});

/**
 * Font family token schema
 */
export const FontFamilyTokenSchema = TokenBaseSchema.extend({
  type: z.literal('fontFamily'),
  rawValue: z.any(),
  value: z.string(),
  resolvedValue: z.string().optional(),
});

/**
 * Line height token schema
 */
export const LineHeightTokenSchema = TokenBaseSchema.extend({
  type: z.literal('lineHeight'),
  rawValue: z.any(),
  value: z.union([DimensionValueSchema, z.number(), z.string()]),
  resolvedValue: z.union([DimensionValueSchema, z.number(), z.string()]).optional(),
});

/**
 * Letter spacing token schema
 */
export const LetterSpacingTokenSchema = TokenBaseSchema.extend({
  type: z.literal('letterSpacing'),
  rawValue: z.any(),
  value: z.union([DimensionValueSchema, z.number(), z.string()]),
  resolvedValue: z.union([DimensionValueSchema, z.number(), z.string()]).optional(),
});

/**
 * Spacing token schema
 */
export const SpacingTokenSchema = TokenBaseSchema.extend({
  type: z.literal('spacing'),
  rawValue: z.any(),
  value: DimensionValueSchema,
  resolvedValue: DimensionValueSchema.optional(),
});

/**
 * Shadow token schema
 */
export const ShadowTokenSchema = TokenBaseSchema.extend({
  type: z.literal('shadow'),
  rawValue: z.any(),
  value: ShadowValueSchema,
  resolvedValue: ShadowValueSchema.optional(),
});

/**
 * Border token schema
 */
export const BorderTokenSchema = TokenBaseSchema.extend({
  type: z.literal('border'),
  rawValue: z.any(),
  value: z.any(), // TODO: Define BorderValue type
  resolvedValue: z.any().optional(),
});

/**
 * Duration token schema
 */
export const DurationTokenSchema = TokenBaseSchema.extend({
  type: z.literal('duration'),
  rawValue: z.any(),
  value: z.union([z.number(), z.string()]),
  resolvedValue: z.union([z.number(), z.string()]).optional(),
});

/**
 * Cubic bezier token schema
 */
export const CubicBezierTokenSchema = TokenBaseSchema.extend({
  type: z.literal('cubicBezier'),
  rawValue: z.any(),
  value: CubicBezierValueSchema,
  resolvedValue: CubicBezierValueSchema.optional(),
});

/**
 * Number token schema
 */
export const NumberTokenSchema = TokenBaseSchema.extend({
  type: z.literal('number'),
  rawValue: z.any(),
  value: z.number(),
  resolvedValue: z.number().optional(),
});

/**
 * String token schema
 */
export const StringTokenSchema = TokenBaseSchema.extend({
  type: z.literal('string'),
  rawValue: z.any(),
  value: z.string(),
  resolvedValue: z.string().optional(),
});

/**
 * Typography token schema
 */
export const TypographyTokenSchema = TokenBaseSchema.extend({
  type: z.literal('typography'),
  rawValue: z.any(),
  value: TypographyValueSchema,
  resolvedValue: TypographyValueSchema.optional(),
});

/**
 * Boolean token schema
 */
export const BooleanTokenSchema = TokenBaseSchema.extend({
  type: z.literal('boolean'),
  rawValue: z.any(),
  value: z.boolean(),
  resolvedValue: z.boolean().optional(),
});

/**
 * Other token schema (fallback)
 */
export const OtherTokenSchema = TokenBaseSchema.extend({
  type: z.literal('other'),
  rawValue: z.any(),
  value: z.any(),
  resolvedValue: z.any().optional(),
});

// ====================================================================================
// DISCRIMINATED UNION SCHEMA
// ====================================================================================

/**
 * Token schema (discriminated union)
 * Validates any token type
 */
export const TokenSchema = z.discriminatedUnion('type', [
  ColorTokenSchema,
  DimensionTokenSchema,
  FontSizeTokenSchema,
  FontWeightTokenSchema,
  FontFamilyTokenSchema,
  LineHeightTokenSchema,
  LetterSpacingTokenSchema,
  SpacingTokenSchema,
  ShadowTokenSchema,
  BorderTokenSchema,
  DurationTokenSchema,
  CubicBezierTokenSchema,
  NumberTokenSchema,
  StringTokenSchema,
  TypographyTokenSchema,
  BooleanTokenSchema,
  OtherTokenSchema,
]);

// ====================================================================================
// LEGACY TOKEN SCHEMA
// ====================================================================================

/**
 * Legacy token schema (before discriminated unions)
 * For backwards compatibility
 */
export const LegacyTokenSchema = TokenBaseSchema.extend({
  type: z.enum([
    'color',
    'dimension',
    'fontSize',
    'fontWeight',
    'fontFamily',
    'lineHeight',
    'letterSpacing',
    'spacing',
    'shadow',
    'border',
    'duration',
    'cubicBezier',
    'number',
    'string',
    'typography',
    'boolean',
    'other',
  ]),
  rawValue: z.any(),
  value: z.any(), // Weak typing - any value allowed
  resolvedValue: z.any().optional(),
});

// ====================================================================================
// VALIDATION HELPERS
// ====================================================================================

/**
 * Validate a single token
 * @param token - Token to validate
 * @returns Validation result
 */
export function validateToken(token: unknown): { success: boolean; data?: any; error?: z.ZodError } {
  const result = TokenSchema.safeParse(token);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate multiple tokens
 * @param tokens - Tokens to validate
 * @returns Validation results
 */
export function validateTokens(tokens: unknown[]): {
  success: boolean;
  validTokens: any[];
  errors: Array<{ index: number; error: z.ZodError }>;
} {
  const validTokens: any[] = [];
  const errors: Array<{ index: number; error: z.ZodError }> = [];

  tokens.forEach((token, index) => {
    const result = validateToken(token);
    if (result.success && result.data) {
      validTokens.push(result.data);
    } else if (result.error) {
      errors.push({ index, error: result.error });
    }
  });

  return {
    success: errors.length === 0,
    validTokens,
    errors,
  };
}

/**
 * Validate token value for specific type
 * @param value - Value to validate
 * @param type - Token type
 * @returns Validation result
 */
export function validateTokenValue(value: unknown, type: string): { success: boolean; data?: any; error?: z.ZodError } {
  let schema: z.ZodSchema;

  switch (type) {
    case 'color':
      schema = ColorValueSchema;
      break;
    case 'dimension':
    case 'spacing':
      schema = DimensionValueSchema;
      break;
    case 'fontSize':
      schema = z.union([DimensionValueSchema, z.number()]);
      break;
    case 'fontWeight':
      schema = z.union([z.number(), z.string()]);
      break;
    case 'fontFamily':
      schema = z.string();
      break;
    case 'lineHeight':
    case 'letterSpacing':
      schema = z.union([DimensionValueSchema, z.number(), z.string()]);
      break;
    case 'shadow':
      schema = ShadowValueSchema;
      break;
    case 'typography':
      schema = TypographyValueSchema;
      break;
    case 'cubicBezier':
      schema = CubicBezierValueSchema;
      break;
    case 'duration':
      schema = z.union([z.number(), z.string()]);
      break;
    case 'number':
      schema = z.number();
      break;
    case 'string':
      schema = z.string();
      break;
    case 'boolean':
      schema = z.boolean();
      break;
    default:
      schema = z.any();
  }

  const result = schema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ====================================================================================
// TYPE EXPORTS (Inferred from Schemas)
// ====================================================================================

export type ColorTokenType = z.infer<typeof ColorTokenSchema>;
export type DimensionTokenType = z.infer<typeof DimensionTokenSchema>;
export type TypographyTokenType = z.infer<typeof TypographyTokenSchema>;
export type ShadowTokenType = z.infer<typeof ShadowTokenSchema>;
export type TokenType = z.infer<typeof TokenSchema>;
export type LegacyTokenType = z.infer<typeof LegacyTokenSchema>;

// ====================================================================================
// CORE TOKEN MODEL
// Universal token representation - single source of truth
// ====================================================================================

import { FeatureFlags } from '../config/FeatureFlags';

/**
 * Token type enumeration
 * Supports W3C Design Token types and common extensions
 */
export type TokenType =
  | 'color'
  | 'dimension'
  | 'fontSize'
  | 'fontWeight'
  | 'fontFamily'
  | 'lineHeight'
  | 'letterSpacing'
  | 'spacing'
  | 'shadow'
  | 'border'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'string'
  | 'typography'
  | 'boolean'
  | 'other';

/**
 * Token value types (legacy - union of all possible types)
 * Normalized format-independent representation
 * @deprecated Use discriminated union Token type instead
 */
export type TokenValue =
  | string
  | number
  | boolean
  | ColorValue
  | DimensionValue
  | ShadowValue
  | TypographyValue
  | CubicBezierValue
  | null;

/**
 * Color value (supports multiple color space formats)
 */
export interface ColorValue {
  colorSpace?: 'sRGB' | 'display-p3' | 'hsl' | 'hsla' | 'rgb' | 'rgba';
  hex?: string; // #RRGGBB or #RRGGBBAA
  r?: number;   // 0-255 or 0-1
  g?: number;
  b?: number;
  a?: number;   // 0-1
  h?: number;   // 0-360
  s?: number;   // 0-100
  l?: number;   // 0-100
}

/**
 * Dimension value with unit
 */
export interface DimensionValue {
  value: number;
  unit: 'px' | 'rem' | 'em' | '%' | 'pt';
}

/**
 * Shadow value (box-shadow or text-shadow)
 */
export interface ShadowValue {
  offsetX: number | string;
  offsetY: number | string;
  blur: number | string;
  spread?: number | string;
  color: string | ColorValue;
  inset?: boolean;
}

/**
 * Typography composite value
 */
export interface TypographyValue {
  fontFamily?: string;
  fontSize?: number | string | DimensionValue;
  fontWeight?: number | string;
  lineHeight?: number | string | DimensionValue;
  letterSpacing?: number | string | DimensionValue;
}

/**
 * Cubic bezier timing function
 */
export interface CubicBezierValue {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Token source information
 * Tracks where the token came from
 */
export interface TokenSource {
  type: 'github' | 'gitlab' | 'local' | 'api' | 'figma';
  location: string; // File path, URL, or identifier
  imported: string; // ISO timestamp
  branch?: string;
  commit?: string;
}

/**
 * Token validation result
 */
export interface TokenValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Figma-specific extensions
 */
export interface FigmaExtensions {
  variableId?: string;
  collectionId?: string;
  collectionName?: string;
  scopes?: VariableScope[];
  modeId?: string;
  modeName?: string;
}

/**
 * Format-specific extensions container
 */
export interface TokenExtensions {
  figma?: FigmaExtensions;
  w3c?: Record<string, any>; // W3C $extensions
  styleDictionary?: Record<string, any>;
  [key: string]: any; // Allow custom extensions
}

/**
 * Token status for lifecycle management
 */
export type TokenStatus = 'active' | 'deprecated' | 'draft' | 'archived';

// ====================================================================================
// DISCRIMINATED UNION TOKEN (New - Type Safe)
// ====================================================================================

/**
 * Base properties shared by all tokens
 * These fields are common regardless of token type
 */
export interface TokenBase {
  // ==================== IDENTITY ====================
  /**
   * Stable unique identifier
   * Generated as: hash(projectId + path)
   * Immutable once created
   */
  id: string;

  /**
   * Hierarchical path components
   * Example: ['color', 'semantic', 'button', 'primary']
   */
  path: string[];

  /**
   * Simple name (last component of path)
   * Example: 'primary'
   */
  name: string;

  /**
   * Fully qualified dot-separated name
   * Example: 'color.semantic.button.primary'
   */
  qualifiedName: string;

  // ==================== RELATIONSHIPS ====================
  /**
   * Target token ID if this token is an alias
   */
  aliasTo?: string;

  /**
   * Array of token IDs that reference this token
   * Inverse of aliasTo - tracks dependencies
   */
  referencedBy?: string[];

  // ==================== ORGANIZATION ====================
  /**
   * Project identifier for multi-project isolation
   */
  projectId: string;

  /**
   * Collection/group name (not hardcoded to primitive/semantic)
   * Examples: 'primitives', 'semantic', 'brand-a', 'dark-theme'
   */
  collection: string;

  /**
   * Theme variant (optional)
   * Examples: 'light', 'dark', 'high-contrast'
   */
  theme?: string;

  /**
   * Brand variant (optional)
   * Examples: 'acme', 'widgets-inc', 'brand-a'
   */
  brand?: string;

  // ==================== METADATA ====================
  /**
   * Human-readable description
   */
  description?: string;

  /**
   * Source format identifier
   */
  sourceFormat: 'w3c' | 'style-dictionary' | 'figma' | 'custom';

  /**
   * Source tracking (where did this token come from)
   */
  source: TokenSource;

  /**
   * Format-specific extensions
   */
  extensions: TokenExtensions;

  /**
   * Categorization tags
   */
  tags: string[];

  /**
   * Lifecycle status
   */
  status: TokenStatus;

  /**
   * Semantic version (optional)
   */
  version?: string;

  // ==================== TIMESTAMPS ====================
  /**
   * Creation timestamp (ISO 8601)
   */
  created: string;

  /**
   * Last modification timestamp (ISO 8601)
   */
  lastModified: string;

  // ==================== VALIDATION ====================
  /**
   * Validation results
   */
  validation?: TokenValidation;
}

/**
 * Discriminated union Token type
 * TypeScript enforces that type matches value type
 *
 * Example:
 * ```typescript
 * const token: Token = {
 *   type: 'color',
 *   value: { hex: '#1e40af' },  // ✓ Type-safe!
 *   // ...other fields
 * };
 *
 * // This would be a compile error:
 * const bad: Token = {
 *   type: 'color',
 *   value: 123  // ✗ TypeScript error! Expected ColorValue
 * };
 * ```
 */
export type Token = TokenBase & (
  | {
      type: 'color';
      rawValue: any;
      value: ColorValue;
      resolvedValue?: ColorValue;
    }
  | {
      type: 'dimension';
      rawValue: any;
      value: DimensionValue;
      resolvedValue?: DimensionValue;
    }
  | {
      type: 'fontSize';
      rawValue: any;
      value: DimensionValue | number;
      resolvedValue?: DimensionValue | number;
    }
  | {
      type: 'fontWeight';
      rawValue: any;
      value: number | string;
      resolvedValue?: number | string;
    }
  | {
      type: 'fontFamily';
      rawValue: any;
      value: string;
      resolvedValue?: string;
    }
  | {
      type: 'lineHeight';
      rawValue: any;
      value: DimensionValue | number | string;
      resolvedValue?: DimensionValue | number | string;
    }
  | {
      type: 'letterSpacing';
      rawValue: any;
      value: DimensionValue | number | string;
      resolvedValue?: DimensionValue | number | string;
    }
  | {
      type: 'spacing';
      rawValue: any;
      value: DimensionValue;
      resolvedValue?: DimensionValue;
    }
  | {
      type: 'shadow';
      rawValue: any;
      value: ShadowValue;
      resolvedValue?: ShadowValue;
    }
  | {
      type: 'border';
      rawValue: any;
      value: any; // TODO: Define BorderValue type
      resolvedValue?: any;
    }
  | {
      type: 'duration';
      rawValue: any;
      value: number | string;
      resolvedValue?: number | string;
    }
  | {
      type: 'cubicBezier';
      rawValue: any;
      value: CubicBezierValue;
      resolvedValue?: CubicBezierValue;
    }
  | {
      type: 'number';
      rawValue: any;
      value: number;
      resolvedValue?: number;
    }
  | {
      type: 'string';
      rawValue: any;
      value: string;
      resolvedValue?: string;
    }
  | {
      type: 'typography';
      rawValue: any;
      value: TypographyValue;
      resolvedValue?: TypographyValue;
    }
  | {
      type: 'boolean';
      rawValue: any;
      value: boolean;
      resolvedValue?: boolean;
    }
  | {
      type: 'other';
      rawValue: any;
      value: any;
      resolvedValue?: any;
    }
);

// ====================================================================================
// TYPE GUARDS (Type-Safe Type Narrowing)
// ====================================================================================

/**
 * Type guard for color tokens
 * Narrows Token to ColorToken
 */
export function isColorToken(token: Token | LegacyToken): token is TokenBase & { type: 'color'; value: ColorValue } {
  return token.type === 'color';
}

/**
 * Type guard for dimension tokens
 */
export function isDimensionToken(token: Token | LegacyToken): token is TokenBase & { type: 'dimension'; value: DimensionValue } {
  return token.type === 'dimension';
}

/**
 * Type guard for typography tokens
 */
export function isTypographyToken(token: Token | LegacyToken): token is TokenBase & { type: 'typography'; value: TypographyValue } {
  return token.type === 'typography';
}

/**
 * Type guard for shadow tokens
 */
export function isShadowToken(token: Token | LegacyToken): token is TokenBase & { type: 'shadow'; value: ShadowValue } {
  return token.type === 'shadow';
}

/**
 * Type guard for fontSize tokens
 */
export function isFontSizeToken(token: Token | LegacyToken): token is TokenBase & { type: 'fontSize'; value: DimensionValue | number } {
  return token.type === 'fontSize';
}

/**
 * Type guard for fontWeight tokens
 */
export function isFontWeightToken(token: Token | LegacyToken): token is TokenBase & { type: 'fontWeight'; value: number | string } {
  return token.type === 'fontWeight';
}

/**
 * Type guard for fontFamily tokens
 */
export function isFontFamilyToken(token: Token | LegacyToken): token is TokenBase & { type: 'fontFamily'; value: string } {
  return token.type === 'fontFamily';
}

/**
 * Type guard for lineHeight tokens
 */
export function isLineHeightToken(token: Token | LegacyToken): token is TokenBase & { type: 'lineHeight'; value: DimensionValue | number | string } {
  return token.type === 'lineHeight';
}

/**
 * Type guard for letterSpacing tokens
 */
export function isLetterSpacingToken(token: Token | LegacyToken): token is TokenBase & { type: 'letterSpacing'; value: DimensionValue | number | string } {
  return token.type === 'letterSpacing';
}

/**
 * Type guard for spacing tokens
 */
export function isSpacingToken(token: Token | LegacyToken): token is TokenBase & { type: 'spacing'; value: DimensionValue } {
  return token.type === 'spacing';
}

/**
 * Type guard for number tokens
 */
export function isNumberToken(token: Token | LegacyToken): token is TokenBase & { type: 'number'; value: number } {
  return token.type === 'number';
}

/**
 * Type guard for string tokens
 */
export function isStringToken(token: Token | LegacyToken): token is TokenBase & { type: 'string'; value: string } {
  return token.type === 'string';
}

/**
 * Type guard for boolean tokens
 */
export function isBooleanToken(token: Token | LegacyToken): token is TokenBase & { type: 'boolean'; value: boolean } {
  return token.type === 'boolean';
}

/**
 * Type guard for cubicBezier tokens
 */
export function isCubicBezierToken(token: Token | LegacyToken): token is TokenBase & { type: 'cubicBezier'; value: CubicBezierValue } {
  return token.type === 'cubicBezier';
}

/**
 * Type guard for duration tokens
 */
export function isDurationToken(token: Token | LegacyToken): token is TokenBase & { type: 'duration'; value: number | string } {
  return token.type === 'duration';
}

// ====================================================================================
// LEGACY TOKEN (Backwards Compatibility)
// ====================================================================================

/**
 * Legacy Token Interface (before discriminated unions)
 *
 * @deprecated Use discriminated union Token type instead when DISCRIMINATED_UNION_TYPES feature flag is enabled
 *
 * This interface is kept for backwards compatibility and will be removed in a future version.
 * Migrate to the new Token type which provides compile-time type safety.
 */
export interface LegacyToken {
  // ==================== IDENTITY ====================
  id: string;
  path: string[];
  name: string;
  qualifiedName: string;

  // ==================== VALUE ====================
  type: TokenType;
  rawValue: any;
  value: TokenValue; // Weak typing - can be any value!
  resolvedValue?: TokenValue;

  // ==================== RELATIONSHIPS ====================
  aliasTo?: string;
  referencedBy?: string[];

  // ==================== ORGANIZATION ====================
  projectId: string;
  collection: string;
  theme?: string;
  brand?: string;

  // ==================== METADATA ====================
  description?: string;
  sourceFormat: 'w3c' | 'style-dictionary' | 'figma' | 'custom';
  source: TokenSource;
  extensions: TokenExtensions;
  tags: string[];
  status: TokenStatus;
  version?: string;

  // ==================== TIMESTAMPS ====================
  created: string;
  lastModified: string;

  // ==================== VALIDATION ====================
  validation?: TokenValidation;
}

// ====================================================================================
// MIGRATION HELPERS
// ====================================================================================

/**
 * Convert legacy token to discriminated union token
 *
 * @param legacyToken - Legacy token
 * @returns Discriminated union token
 */
export function legacyToDiscriminatedToken(legacyToken: LegacyToken): Token {
  // The types are structurally compatible, just need to cast
  // At runtime, the data is the same
  return legacyToken as Token;
}

/**
 * Convert discriminated union token to legacy token
 * (For backwards compatibility)
 *
 * @param token - Discriminated union token
 * @returns Legacy token
 */
export function discriminatedToLegacyToken(token: Token): LegacyToken {
  // The types are structurally compatible, just need to cast
  return token as LegacyToken;
}

// ====================================================================================
// UTILITY TYPES
// ====================================================================================

/**
 * Partial token for updates
 */
export type TokenUpdate = Partial<Omit<Token, 'id' | 'created'>>;

/**
 * Token creation data (without generated fields)
 */
export type TokenCreateData = Omit<Token, 'id' | 'created' | 'lastModified'>;

/**
 * Extract value type from token type
 *
 * Example:
 * ```typescript
 * type ColorValueType = ValueTypeForTokenType<'color'>;  // ColorValue
 * type NumberValueType = ValueTypeForTokenType<'number'>;  // number
 * ```
 */
export type ValueTypeForTokenType<T extends TokenType> =
  T extends 'color' ? ColorValue :
  T extends 'dimension' ? DimensionValue :
  T extends 'fontSize' ? DimensionValue | number :
  T extends 'fontWeight' ? number | string :
  T extends 'fontFamily' ? string :
  T extends 'lineHeight' ? DimensionValue | number | string :
  T extends 'letterSpacing' ? DimensionValue | number | string :
  T extends 'spacing' ? DimensionValue :
  T extends 'shadow' ? ShadowValue :
  T extends 'typography' ? TypographyValue :
  T extends 'number' ? number :
  T extends 'string' ? string :
  T extends 'boolean' ? boolean :
  T extends 'cubicBezier' ? CubicBezierValue :
  T extends 'duration' ? number | string :
  any;

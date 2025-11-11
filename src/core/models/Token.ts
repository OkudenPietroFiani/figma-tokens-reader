// ====================================================================================
// CORE TOKEN MODEL
// Universal token representation - single source of truth
// ====================================================================================

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
 * Token value types
 * Normalized format-independent representation
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
  fontSize?: number | string;
  fontWeight?: number | string;
  lineHeight?: number | string;
  letterSpacing?: number | string;
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

/**
 * Core Token Interface
 * Universal representation for all token formats
 *
 * SOLID Principles:
 * - Single Responsibility: Represents one token with all its metadata
 * - Open/Closed: Extensions allow format-specific data without modification
 * - Liskov Substitution: All tokens conform to this interface
 * - Interface Segregation: Focused on token data, not operations
 * - Dependency Inversion: Features depend on this abstraction
 */
export interface Token {
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

  // ==================== VALUE ====================
  /**
   * Token type (color, dimension, etc.)
   */
  type: TokenType;

  /**
   * Raw value from source (before normalization)
   */
  rawValue: any;

  /**
   * Normalized format-independent value
   */
  value: TokenValue;

  /**
   * Resolved value (after alias resolution)
   * Undefined if not yet resolved or if token is not an alias
   */
  resolvedValue?: TokenValue;

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
 * Partial token for updates
 */
export type TokenUpdate = Partial<Omit<Token, 'id' | 'created'>>;

/**
 * Token creation data (without generated fields)
 */
export type TokenCreateData = Omit<Token, 'id' | 'created' | 'lastModified'>;

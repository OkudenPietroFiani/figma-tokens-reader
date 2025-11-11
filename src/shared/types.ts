// ====================================================================================
// SHARED TYPE DEFINITIONS
// W3C Design Tokens Importer for Figma
// ====================================================================================

// ==================== RESULT PATTERN ====================
// Used throughout the app for consistent error handling
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Helper functions for Result pattern
export const Success = <T>(data: T): Result<T> => ({ success: true, data });
export const Failure = <T>(error: string): Result<T> => ({ success: false, error });

// ==================== TOKEN TYPES ====================
// W3C Design Token structure
export interface DesignToken {
  $value?: any;
  $type?: string;
  $description?: string;
  [key: string]: any;
}

export interface TokenData {
  [key: string]: DesignToken | any;
}

export interface ProcessedToken {
  path: string[];
  value: any;
  type: string;
  originalValue?: any;
}

export interface TokenMetadata {
  name: string;
  fullPath: string;
  type: string;
  value: any;
  originalValue: any;
  description?: string;
  aliasTo?: string;
  collection: string;
}

export interface ProcessedValue {
  value: any;
  isAlias: boolean;
  aliasVariable?: Variable;
}

// ==================== IMPORT/EXPORT TYPES ====================
export interface ImportStats {
  added: number;
  updated: number;
  skipped: number;
}

export interface TokenImportData {
  primitives: TokenData | null;
  semantics: TokenData | null;
  source: 'github' | 'local';
}

// ==================== GITHUB TYPES ====================
export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  files?: string[];
}

export interface GitHubFileObject {
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

// ==================== SCOPE TYPES ====================
export interface ScopeAssignments {
  [tokenPath: string]: string[]; // Maps token path to array of scope strings
}

export interface FigmaVariableData {
  id: string;
  name: string;
  scopes: VariableScope[];
  type: VariableResolvedDataType;
  collection: string;
  collectionId: string;
}

// ==================== STORAGE TYPES ====================

/**
 * Legacy storage format (v1.x)
 * @deprecated Will be auto-migrated to ProjectStorage
 */
export interface TokenState {
  tokenFiles: { [fileName: string]: TokenFile };
  tokenSource: 'github' | 'local' | null;
  githubConfig?: GitHubConfig;
  lastUpdated?: string; // ISO timestamp of last token update
}

/**
 * New storage format (v2.0+)
 * Uses Token[] model with full metadata
 */
export interface ProjectStorage {
  version: '2.0';
  projectId: string;
  tokens: import('../core/models/Token').Token[];
  metadata: {
    lastSync: string;
    source: FileSourceConfig;
    importStats: ImportStats;
  };
}

/**
 * File source configuration for storage
 */
export interface FileSourceConfig {
  type: 'github' | 'gitlab' | 'local' | 'api' | 'figma';
  location: string;
  branch?: string;
  commit?: string;
}

// ==================== PLUGIN MESSAGE TYPES ====================
// Messages sent from frontend to backend
export type PluginMessageType =
  | 'import-tokens'
  | 'github-fetch-files'
  | 'github-import-files'
  | 'load-github-config'
  | 'save-github-config'
  | 'save-tokens'
  | 'load-tokens'
  | 'get-figma-variables'
  | 'apply-variable-scopes'
  | 'generate-documentation'
  | 'cancel';

export interface PluginMessage {
  type: PluginMessageType;
  data?: any;
  scopeAssignments?: ScopeAssignments;
  requestId?: string;
}

// Messages sent from backend to frontend
export type UIMessageType =
  | 'import-success'
  | 'github-files-fetched'
  | 'github-files-imported'
  | 'github-config-loaded'
  | 'tokens-loaded'
  | 'figma-variables-loaded'
  | 'scopes-applied'
  | 'documentation-generated'
  | 'error';

export interface UIMessage {
  type: UIMessageType;
  data?: any;
  message?: string;
  requestId?: string;
}

// ==================== FRONTEND STATE TYPES ====================
export interface TokenFile {
  name: string;
  path: string;
  content: TokenData;
  source: 'github' | 'local';
}

export interface AppStateData {
  tokenFiles: Map<string, TokenFile>;
  selectedFile: string | null;
  selectedTokens: Set<string>;
  currentScreen: 'welcome' | 'import' | 'token' | 'documentation';
  currentTab: 'tokens' | 'scopes' | 'documentation';
  importMode: 'github' | 'local';
  tokenSource: 'github' | 'local' | null;
  githubConfig: GitHubConfig | null;
  figmaVariables: Map<string, FigmaVariableData>;
  tokenScopesMap: Map<string, string[]>;
}

// Event types for Observable pattern
export type AppStateEvent =
  | 'screen-changed'
  | 'tab-changed'
  | 'file-selected'
  | 'files-loaded'
  | 'tokens-selected'
  | 'variables-loaded'
  | 'scopes-updated'
  | 'import-mode-changed';

// ==================== COMPONENT TYPES ====================
export type ScreenType = 'welcome' | 'import' | 'token' | 'documentation';
export type TabType = 'tokens' | 'scopes' | 'documentation';
export type ImportMode = 'github' | 'local';

// ==================== NOTIFICATION TYPES ====================
export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationOptions {
  message: string;
  type: NotificationType;
  duration?: number;
}

// ==================== FIGMA SCOPE CONSTANTS ====================
// Comprehensive list of Figma variable scopes
export const FIGMA_SCOPES = {
  // All scopes category
  ALL_SCOPES: 'ALL_SCOPES',

  // Fill scopes
  FRAME_FILL: 'FRAME_FILL',
  SHAPE_FILL: 'SHAPE_FILL',
  TEXT_FILL: 'TEXT_FILL',

  // Stroke scopes
  STROKE_COLOR: 'STROKE_COLOR',

  // Effect scopes
  EFFECT_COLOR: 'EFFECT_COLOR',

  // Corner radius scopes
  CORNER_RADIUS: 'CORNER_RADIUS',

  // Size scopes
  WIDTH_HEIGHT: 'WIDTH_HEIGHT',

  // Gap scopes
  GAP: 'GAP',

  // Text content scopes
  TEXT_CONTENT: 'TEXT_CONTENT',

  // Font family scopes
  FONT_FAMILY: 'FONT_FAMILY',

  // Font style scopes
  FONT_STYLE: 'FONT_STYLE',

  // Font weight scopes
  FONT_WEIGHT: 'FONT_WEIGHT',

  // Font size scopes
  FONT_SIZE: 'FONT_SIZE',

  // Line height scopes
  LINE_HEIGHT: 'LINE_HEIGHT',

  // Letter spacing scopes
  LETTER_SPACING: 'LETTER_SPACING',

  // Paragraph spacing scopes
  PARAGRAPH_SPACING: 'PARAGRAPH_SPACING',

  // Paragraph indent scopes
  PARAGRAPH_INDENT: 'PARAGRAPH_INDENT',
} as const;

// Type-safe scope values
export type FigmaScopeValue = typeof FIGMA_SCOPES[keyof typeof FIGMA_SCOPES];

// ==================== DOCUMENTATION TYPES ====================
// Token row data for documentation table
export interface DocumentationTokenRow {
  name: string;
  value: string;
  resolvedValue: string;
  type: string;
  description?: string;
  category: string;
  path: string;
  originalToken: TokenMetadata;
}

// Documentation generation options
export interface DocumentationOptions {
  fileNames: string[];
  fontFamily?: string;
  includeDescriptions: boolean;
}

// Documentation generation result
export interface DocumentationResult {
  frameId: string;
  tokenCount: number;
  categoryCount: number;
}

// ====================================================================================
// SHARED CONSTANTS
// W3C Design Tokens Importer for Figma
// ====================================================================================

// ==================== UI CONFIGURATION ====================
export const UI_CONFIG = {
  width: 800,
  height: 600,
};

// ==================== COLLECTION NAMES ====================
// Lowercase to match Figma naming convention
export const COLLECTION_NAMES = {
  primitive: 'primitive',
  semantic: 'semantic',
} as const;

// ==================== TOKEN TYPE MAPPING ====================
// Maps W3C token types to Figma variable types
export const TYPE_MAPPING: { [key: string]: VariableResolvedDataType } = {
  'color': 'COLOR',
  'dimension': 'FLOAT',
  'spacing': 'FLOAT',
  'number': 'FLOAT',
  'fontFamily': 'STRING',
  'fontWeight': 'FLOAT',
  'fontSize': 'FLOAT',
  'lineHeight': 'STRING',
  'typography': 'STRING',
  'string': 'STRING',
};

// ==================== CONVERSION RATIOS ====================
export const REM_TO_PX_RATIO = 16;

// ==================== FEATURE FLAGS ====================
// Controls for new architecture features - toggle safely without breaking changes
export const FEATURE_FLAGS = {
  // Use new interface-based architecture (Phase 1)
  USE_NEW_ARCHITECTURE: false,

  // Use parallel file fetching (Phase 3)
  ENABLE_PARALLEL_FETCHING: false,

  // Maximum concurrent file fetches when parallel fetching enabled
  PARALLEL_BATCH_SIZE: 10,

  // Delay between batches (ms) to respect API rate limits
  BATCH_DELAY_MS: 100,

  // Auto-detect token format instead of assuming W3C (Phase 4)
  AUTO_DETECT_FORMAT: false,
} as const;

// ==================== STORAGE KEYS ====================
// Keys used in figma.clientStorage
export const STORAGE_KEYS = {
  TOKEN_STATE: 'tokenState',
  GITHUB_CONFIG: 'githubConfig',
} as const;

// ==================== SCREEN IDS ====================
// HTML element IDs for screens
export const SCREEN_IDS = {
  WELCOME: 'welcome-screen',
  IMPORT: 'import-screen',
  TOKEN: 'token-screen',
} as const;

// ==================== TAB IDS ====================
// HTML element IDs for tabs
export const TAB_IDS = {
  TOKENS: 'tokens-view',
  SCOPES: 'scopes-view',
} as const;

// ==================== FIGMA SCOPES ====================
// Comprehensive list of all Figma variable scopes with hierarchical organization
export const SCOPE_CATEGORIES = {
  // Fill scopes
  fill: {
    label: 'Fill',
    scopes: ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'] as VariableScope[],
  },

  // Stroke scopes
  stroke: {
    label: 'Stroke',
    scopes: ['STROKE_COLOR'] as VariableScope[],
  },

  // Effect scopes
  effect: {
    label: 'Effect',
    scopes: ['EFFECT_COLOR'] as VariableScope[],
  },

  // Size & spacing
  sizeSpacing: {
    label: 'Size & Spacing',
    scopes: ['CORNER_RADIUS', 'WIDTH_HEIGHT', 'GAP'] as VariableScope[],
  },

  // Text content
  textContent: {
    label: 'Text Content',
    scopes: ['TEXT_CONTENT'] as VariableScope[],
  },

  // Typography
  typography: {
    label: 'Typography',
    scopes: [
      'FONT_FAMILY',
      'FONT_STYLE',
      'FONT_WEIGHT',
      'FONT_SIZE',
      'LINE_HEIGHT',
      'LETTER_SPACING',
      'PARAGRAPH_SPACING',
      'PARAGRAPH_INDENT',
    ] as VariableScope[],
  },
} as const;

// Flattened list of all scopes for easy iteration
export const ALL_SCOPES: VariableScope[] = Object.values(SCOPE_CATEGORIES)
  .flatMap(category => category.scopes);

// Human-readable scope labels
export const SCOPE_LABELS: { [key: string]: string } = {
  // Fill
  FRAME_FILL: 'Frame fill',
  SHAPE_FILL: 'Shape fill',
  TEXT_FILL: 'Text fill',

  // Stroke
  STROKE_COLOR: 'Stroke',

  // Effect
  EFFECT_COLOR: 'Effect',

  // Size & spacing
  CORNER_RADIUS: 'Corner radius',
  WIDTH_HEIGHT: 'Width & height',
  GAP: 'Gap',

  // Text content
  TEXT_CONTENT: 'Text content',

  // Typography
  FONT_FAMILY: 'Font family',
  FONT_STYLE: 'Font style',
  FONT_WEIGHT: 'Font weight',
  FONT_SIZE: 'Font size',
  LINE_HEIGHT: 'Line height',
  LETTER_SPACING: 'Letter spacing',
  PARAGRAPH_SPACING: 'Paragraph spacing',
  PARAGRAPH_INDENT: 'Paragraph indent',
};

// ==================== NOTIFICATION DEFAULTS ====================
export const NOTIFICATION_DEFAULTS = {
  SUCCESS_DURATION: 3000,
  ERROR_DURATION: 5000,
  INFO_DURATION: 3000,
};

// ==================== FILE EXTENSIONS ====================
export const ALLOWED_FILE_EXTENSIONS = ['.json', '.zip'] as const;
export const JSON_FILE_PATTERN = /\.json$/i;
export const ZIP_FILE_PATTERN = /\.zip$/i;

// ==================== GITHUB DEFAULTS ====================
export const GITHUB_DEFAULTS = {
  BRANCH: 'main',
  API_BASE_URL: 'https://api.github.com',
};

// ==================== ERROR MESSAGES ====================
export const ERROR_MESSAGES = {
  // GitHub errors
  GITHUB_INVALID_URL: 'Invalid GitHub URL format',
  GITHUB_FETCH_FAILED: 'Failed to fetch repository files',
  GITHUB_NO_TOKEN: 'GitHub token is required for private repositories',

  // Import errors
  IMPORT_NO_FILES: 'No valid token files found',
  IMPORT_PARSE_FAILED: 'Failed to parse token file',
  IMPORT_NO_SELECTION: 'Please select at least one file',

  // Token errors
  TOKEN_INVALID_FORMAT: 'Invalid token format',
  TOKEN_SYNC_FAILED: 'Failed to sync tokens to Figma',

  // Scope errors
  SCOPE_APPLY_FAILED: 'Failed to apply scopes to variables',
  SCOPE_NO_VARIABLES: 'No Figma variables found',

  // Storage errors
  STORAGE_SAVE_FAILED: 'Failed to save data to storage',
  STORAGE_LOAD_FAILED: 'Failed to load data from storage',

  // Generic
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

// ==================== SUCCESS MESSAGES ====================
export const SUCCESS_MESSAGES = {
  IMPORT_SUCCESS: ' Tokens imported successfully',
  SYNC_SUCCESS: ' Tokens synced to Figma',
  SCOPE_APPLIED: ' Scopes updated successfully',
  CONFIG_SAVED: ' Configuration saved',
} as const;

// ==================== CSS CLASSES ====================
// Reusable CSS class names
export const CSS_CLASSES = {
  ACTIVE: 'active',
  HIDDEN: 'hidden',
  LOADING: 'loading',
  DISABLED: 'disabled',
  CHECKED: 'checked',
  ERROR: 'error',
  SUCCESS: 'success',
} as const;

// ==================== ANIMATION DURATIONS ====================
export const ANIMATION = {
  TRANSITION_FAST: 200,
  TRANSITION_NORMAL: 300,
  TRANSITION_SLOW: 500,
} as const;

// ==================== CODE SYNTAX PLATFORMS ====================
// Platforms for code syntax generation
export const CODE_PLATFORMS = {
  WEB: 'WEB',
  ANDROID: 'ANDROID',
  IOS: 'iOS',
} as const;

// Code syntax templates
export const CODE_SYNTAX_TEMPLATES = {
  WEB: (varName: string) => `var(--${varName})`,
  ANDROID: (varName: string) => `@dimen/${varName}`,
  IOS: (varName: string) => varName.replace(/-/g, '.'),
} as const;

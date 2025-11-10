// ====================================================================================
// DOCUMENTATION CONFIGURATION
// Configuration-driven system for token documentation generation
// ====================================================================================

// ==================== COLUMN CONFIGURATION ====================
/**
 * Table column configuration
 *
 * Extensibility: Add a new column by adding ONE line here!
 * Width is a flex ratio (all columns share width equally if ratio = 1)
 */
export interface ColumnConfig {
  key: string;
  label: string;
  widthRatio: number; // Flex ratio for width distribution
  enabled: boolean;
}

export const DOCUMENTATION_COLUMNS_CONFIG: readonly ColumnConfig[] = [
  { key: 'name', label: 'Name', widthRatio: 1, enabled: true },
  { key: 'value', label: 'Value', widthRatio: 1, enabled: true },
  { key: 'resolvedValue', label: 'Resolved Value', widthRatio: 1, enabled: true },
  { key: 'visualization', label: 'Visualization', widthRatio: 1, enabled: true },
  { key: 'description', label: 'Description', widthRatio: 1, enabled: true },
] as const;

// Get only enabled columns
export const getEnabledColumns = (): ColumnConfig[] => {
  return DOCUMENTATION_COLUMNS_CONFIG.filter(col => col.enabled);
};

// Calculate individual column widths based on total table width and ratios
export const calculateColumnWidths = (tableWidth: number, includeDescriptions: boolean): Map<string, number> => {
  let columns = getEnabledColumns();
  if (!includeDescriptions) {
    columns = columns.filter(col => col.key !== 'description');
  }

  const minWidth = DOCUMENTATION_LAYOUT_CONFIG.table.minColumnWidth;
  const totalRatio = columns.reduce((sum, col) => sum + col.widthRatio, 0);

  // Check if minimum widths would exceed table width
  const requiredMinWidth = columns.length * minWidth;
  if (requiredMinWidth > tableWidth) {
    console.warn(`[calculateColumnWidths] Required min width (${requiredMinWidth}px) exceeds table width (${tableWidth}px)`);
    // Distribute table width equally, clamped to minimum
    const equalWidth = Math.max(minWidth, Math.floor(tableWidth / columns.length));
    const widthMap = new Map<string, number>();
    columns.forEach(col => widthMap.set(col.key, equalWidth));
    return widthMap;
  }

  const widthMap = new Map<string, number>();
  let allocatedWidth = 0;

  // Calculate widths respecting minimum
  columns.forEach((col, index) => {
    if (index === columns.length - 1) {
      // Last column gets remaining width, but at least minimum
      const remaining = tableWidth - allocatedWidth;
      const width = Math.max(minWidth, remaining);
      widthMap.set(col.key, width);
    } else {
      const idealWidth = Math.floor((col.widthRatio / totalRatio) * tableWidth);
      const width = Math.max(minWidth, idealWidth);
      widthMap.set(col.key, width);
      allocatedWidth += width;
    }
  });

  return widthMap;
};

// ==================== LAYOUT CONFIGURATION ====================
/**
 * Layout dimensions and styling
 */
export const DOCUMENTATION_LAYOUT_CONFIG = {
  // Table layout
  table: {
    width: 1200, // Fixed table width - all columns will distribute this width
    minColumnWidth: 80, // Minimum width for any column
    rowHeight: 40,
    headerHeight: 48,
    padding: 16,
    gap: 8,
  },

  // Category sections
  category: {
    padding: 24,
    gap: 16,
    titleFontSize: 20,
    titleFontWeight: 600,
  },

  // Cell styling
  cell: {
    padding: 12,
    fontSize: 16,
    lineHeight: 24,
    cornerRadius: 4,
  },

  // Header styling
  header: {
    backgroundColor: { r: 0.95, g: 0.95, b: 0.95 }, // Light gray
    fontWeight: 600,
    fontSize: 14,
  },

  // Row styling
  row: {
    backgroundColor: { r: 1, g: 1, b: 1 }, // White
    alternateBackgroundColor: { r: 0.98, g: 0.98, b: 0.98 }, // Very light gray
    hoverBackgroundColor: { r: 0.96, g: 0.96, b: 0.98 }, // Light blue-gray
  },

  // Visualization cell
  visualization: {
    colorSquareSize: 32,
    typographyHeight: 24,
    spacingBarHeight: 20,
    padding: 8,
  },

  // Global frame
  global: {
    padding: 32,
    gap: 48,
    backgroundColor: { r: 1, g: 1, b: 1 },
  },
} as const;

// ==================== VISUALIZATION CONFIGURATION ====================
/**
 * Token type to visualization mapping
 */
export const VISUALIZATION_TYPE_MAP = {
  color: 'color-square',
  dimension: 'dimension-bar',
  spacing: 'spacing-bar',
  number: 'number-value',
  fontFamily: 'font-sample',
  fontWeight: 'weight-value',
  fontSize: 'size-value',
  lineHeight: 'line-value',
  typography: 'typography-sample',
  string: 'text-value',
  default: 'placeholder',
} as const;

// ==================== TYPOGRAPHY CONFIGURATION ====================
/**
 * Default font configuration for documentation
 */
export const DOCUMENTATION_TYPOGRAPHY = {
  defaultFontFamily: 'Inter',
  defaultFontSize: 14,
  defaultLineHeight: 20,
  fallbackFonts: ['Roboto', 'Arial', 'Helvetica'],
} as const;

// ==================== CATEGORY EXTRACTION ====================
/**
 * Extract category from token path
 * Example: "semantic.color.primary.700" → "color"
 */
export const extractCategoryFromPath = (path: string): string => {
  const parts = path.split('.');

  // Skip common prefixes (semantic, primitive, etc.)
  const skipPrefixes = ['semantic', 'primitive', 'base', 'core'];
  const filteredParts = parts.filter(p => !skipPrefixes.includes(p.toLowerCase()));

  // First meaningful part is the category
  return filteredParts[0] || 'other';
};

// ==================== VALUE FORMATTERS ====================
/**
 * Format number to remove floating point precision issues
 * e.g., 0.15000000596046448 => 0.15
 */
export const formatNumber = (value: number, maxDecimals: number = 4): string => {
  // Round to max decimals and remove trailing zeros
  const rounded = Number(value.toFixed(maxDecimals));
  return rounded.toString();
};

/**
 * Format values for display in table cells
 */
export const formatTokenValue = (value: any, type?: string): string => {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'object') {
    // For complex objects (like typography), show a formatted version
    try {
      return JSON.stringify(value, null, 0);
    } catch {
      return '[Object]';
    }
  }

  return String(value);
};

// ==================== DIMENSION VALIDATION ====================
/**
 * Validate and clamp dimensions to ensure they're valid for Figma
 *
 * Architecture principle: Defensive programming at boundaries
 * Single utility for consistent validation across all components
 */
export const validateDimension = (value: number, min: number = 0.01, max: number = 100000): number => {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    console.warn(`[validateDimension] Invalid dimension value: ${value}, using minimum: ${min}`);
    return min;
  }
  return Math.max(min, Math.min(max, value));
};

/**
 * Validate width specifically for table columns
 */
export const validateColumnWidth = (width: number): number => {
  return validateDimension(width, DOCUMENTATION_LAYOUT_CONFIG.table.minColumnWidth);
};

/**
 * Validate dimensions for visualization containers
 * Ensures containers have enough space for content with padding
 */
export const validateVisualizationDimensions = (
  width: number,
  height: number
): { width: number; height: number } => {
  const minWidth = 20; // Minimum for any visualization
  const minHeight = 20;

  return {
    width: validateDimension(width, minWidth),
    height: validateDimension(height, minHeight),
  };
};

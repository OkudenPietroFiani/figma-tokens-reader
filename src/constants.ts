// Constants for the plugin

export const UI_CONFIG = {
  width: 800,
  height: 600,
};

export const DOCUMENTATION = {
  columnWidths: [180, 90, 120, 130, 120, 260],
  tableWidth: 900,
  headerHeight: 40,
  rowHeight: 60,
  previewSize: 40,
  spacing: 12,
  padding: 32,
  titleSpacing: 24,
};

export const FONT_CONFIG = {
  defaultFamily: 'Inter',
  defaultStyle: 'Regular',
  boldStyle: 'Bold',
  titleSize: 24,
  headerSize: 12,
  cellSize: 11,
  previewSize: 9,
  fontPreviewSize: 18,
};

export const COLORS = {
  white: { r: 1, g: 1, b: 1 },
  black: { r: 0, g: 0, b: 0 },
  gray: { r: 0.2, g: 0.2, b: 0.2 },
  lightGray: { r: 0.8, g: 0.8, b: 0.8 },
  backgroundGray: { r: 0.95, g: 0.95, b: 0.95 },
  borderGray: { r: 0.9, g: 0.9, b: 0.9 },
  spacingBlue: { r: 0.5, g: 0.7, b: 1 },
  textGray: { r: 0.4, g: 0.4, b: 0.4 },
};

export const COLLECTION_NAMES = {
  primitive: 'Primitive',
  semantic: 'Semantic',
};

export const TYPE_MAPPING: { [key: string]: VariableResolvedDataType } = {
  'color': 'COLOR',
  'dimension': 'FLOAT',
  'spacing': 'FLOAT',
  'number': 'FLOAT',
  'fontFamily': 'STRING',
  'fontWeight': 'STRING',
  'fontSize': 'FLOAT',
  'lineHeight': 'STRING',
  'typography': 'STRING',
  'string': 'STRING',
};

export const REM_TO_PX_RATIO = 16;

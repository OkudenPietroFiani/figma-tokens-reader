// Constants for the plugin

export const UI_CONFIG = {
  width: 800,
  height: 600,
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

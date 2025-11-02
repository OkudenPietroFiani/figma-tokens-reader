// Token processing utilities

import { TYPE_MAPPING } from '../constants';
import { ProcessedValue } from '../types';
import {
  parseColor,
  parseNumber,
  parseDimension,
  parseTypography,
  parseFontFamily,
} from './parser';

export function mapTokenTypeToFigma(tokenType: string): VariableResolvedDataType {
  return TYPE_MAPPING[tokenType] || 'STRING';
}

/**
 * Get appropriate scopes for a variable based on its token type
 * Primitives (non-aliases) have no scopes, semantics have type-appropriate scopes
 */
export function getScopesForTokenType(tokenType: string, isAlias: boolean): VariableScope[] {
  // Primitives/raw values should not be accessible in Figma properties (no scopes)
  if (!isAlias) {
    return [];
  }

  // Semantic variables (that consume other variables) get appropriate scopes
  switch (tokenType) {
    case 'color':
      return ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'];

    case 'dimension':
    case 'spacing':
      return ['GAP', 'WIDTH_HEIGHT', 'CORNER_RADIUS'];

    case 'fontSize':
      return ['FONT_SIZE'];

    case 'fontFamily':
      return ['FONT_FAMILY'];

    case 'fontWeight':
      return ['FONT_WEIGHT'];

    case 'lineHeight':
      return ['LINE_HEIGHT'];

    default:
      return ['ALL_SCOPES'];
  }
}

export async function processTokenValue(
  value: any,
  tokenType: string,
  variableMap: Map<string, Variable>
): Promise<ProcessedValue> {
  // Check if it's a reference
  if (typeof value === 'string' && value.includes('{') && value.includes('}')) {
    const reference = extractReference(value);
    if (reference) {
      const referencedVariable = resolveReference(reference, variableMap);
      if (referencedVariable) {
        return { value: null, isAlias: true, aliasVariable: referencedVariable };
      }
    }
  }

  // Process based on type
  switch (tokenType) {
    case 'color':
      return { value: parseColor(value), isAlias: false };

    case 'dimension':
    case 'spacing':
    case 'fontSize':
      return { value: parseDimension(value), isAlias: false };

    case 'number':
      return { value: parseNumber(value), isAlias: false };

    case 'typography':
      return { value: parseTypography(value), isAlias: false };

    case 'fontFamily':
      return { value: parseFontFamily(value), isAlias: false };

    case 'fontWeight':
      return { value: parseNumber(value), isAlias: false };

    case 'lineHeight':
    case 'string':
    default:
      return { value: String(value), isAlias: false };
  }
}

export function extractReference(value: string): string | null {
  const match = value.match(/\{([^}]+)\}/);
  return match ? match[1] : null;
}

export function resolveReference(
  reference: string,
  variableMap: Map<string, Variable>
): Variable | null {
  // Clean up the reference (remove "primitive." or "semantic." prefix if present)
  let cleanRef = reference.replace(/^(primitive|semantic)\./, '');

  // Try direct lookup
  let variable = variableMap.get(cleanRef);
  if (variable) return variable;

  // Try with different path separators
  cleanRef = cleanRef.replace(/\./g, '/');
  variable = variableMap.get(cleanRef);
  if (variable) return variable;

  // Try all variables
  for (const [key, val] of variableMap.entries()) {
    if (key.endsWith(cleanRef) || key.includes(cleanRef)) {
      return val;
    }
  }

  console.warn(`Could not resolve reference: ${reference}`);
  return null;
}

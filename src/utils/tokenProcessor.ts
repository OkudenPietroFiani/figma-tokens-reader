// Token processing utilities

import { TYPE_MAPPING } from '../shared/constants';
import { ProcessedValue } from '../shared/types';
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

export async function processTokenValue(
  value: any,
  tokenType: string,
  variableMap: Map<string, Variable>
): Promise<ProcessedValue> {
  // Check if it's a reference (simple string reference)
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
      // Handle color object format with alpha reference
      if (typeof value === 'object' && value !== null && 'alpha' in value) {
        const alphaValue = value.alpha;

        // If alpha is a reference, resolve it
        if (typeof alphaValue === 'string' && alphaValue.includes('{') && alphaValue.includes('}')) {
          const alphaRef = extractReference(alphaValue);
          if (alphaRef) {
            const alphaVariable = resolveReference(alphaRef, variableMap);

            if (alphaVariable) {
              // Get the resolved numeric value from the variable
              const modeId = Object.keys(alphaVariable.valuesByMode)[0];
              const resolvedAlpha = alphaVariable.valuesByMode[modeId];

              // Create a new value object with resolved alpha
              const resolvedValue = {
                ...value,
                alpha: typeof resolvedAlpha === 'number' ? resolvedAlpha : 1
              };

              return { value: parseColor(resolvedValue), isAlias: false };
            }
          }

          // Resolution failed - log error and default to full opacity
          console.error(`[ALPHA FAILED] Cannot resolve: ${alphaValue}`);
          return { value: parseColor({ ...value, alpha: 1 }), isAlias: false };
        }
      }

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
  const cleanRef = reference.replace(/^(primitive|semantic)\./, '');

  // Strategy 1: Direct lookup
  let variable = variableMap.get(cleanRef);
  if (variable) return variable;

  // Strategy 2: Replace dots with slashes
  const slashRef = cleanRef.replace(/\./g, '/');
  variable = variableMap.get(slashRef);
  if (variable) return variable;

  // Strategy 3: Handle dotted token names (e.g., "transparency.75")
  // Try progressively: "color.transparency.75" -> "color/transparency-75"
  const parts = cleanRef.split('.');
  if (parts.length >= 2) {
    for (let i = parts.length - 1; i >= 1; i--) {
      const pathPart = parts.slice(0, i).join('/');
      const namePart = parts.slice(i).join('-');
      const dottedRef = pathPart ? `${pathPart}/${namePart}` : namePart;

      variable = variableMap.get(dottedRef);
      if (variable) return variable;
    }
  }

  // Strategy 4: Fuzzy match
  for (const [key, val] of variableMap.entries()) {
    if (key.endsWith(cleanRef) || key.includes(cleanRef)) {
      return val;
    }
  }

  // Only log if resolution fails
  console.error(`[RESOLVE FAILED] Cannot find variable: "${reference}"`);
  console.error(`  Tried: ${cleanRef}, ${slashRef}, and ${parts.length - 1} dotted variations`);
  console.error(`  Map has ${variableMap.size} variables`);
  return null;
}

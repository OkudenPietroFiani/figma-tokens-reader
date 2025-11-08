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
      // Format: { colorSpace: "hsl", components: [0,0,0], alpha: "{primitive.color.transparency.75}" }
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

          // If reference couldn't be resolved, default to full opacity
          console.warn(`Could not resolve alpha reference: ${alphaValue}`);
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

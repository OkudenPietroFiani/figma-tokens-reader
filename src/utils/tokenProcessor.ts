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
          console.log(`[Color Alpha] Resolving alpha reference: ${alphaValue}`);
          console.log(`[Color Alpha] VariableMap size: ${variableMap.size}`);

          const alphaRef = extractReference(alphaValue);
          if (alphaRef) {
            console.log(`[Color Alpha] Extracted reference: ${alphaRef}`);
            const alphaVariable = resolveReference(alphaRef, variableMap);

            if (alphaVariable) {
              // Get the resolved numeric value from the variable
              const modeId = Object.keys(alphaVariable.valuesByMode)[0];
              const resolvedAlpha = alphaVariable.valuesByMode[modeId];

              console.log(`[Color Alpha] Resolved to value: ${resolvedAlpha} (type: ${typeof resolvedAlpha})`);

              // Create a new value object with resolved alpha
              const resolvedValue = {
                ...value,
                alpha: typeof resolvedAlpha === 'number' ? resolvedAlpha : 1
              };

              const finalColor = parseColor(resolvedValue);
              console.log(`[Color Alpha] Final color with alpha:`, finalColor);
              return { value: finalColor, isAlias: false };
            } else {
              console.warn(`[Color Alpha] Could not find variable for reference: ${alphaRef}`);
            }
          }

          // If reference couldn't be resolved, default to full opacity
          console.warn(`[Color Alpha] Failed to resolve alpha reference: ${alphaValue}, using alpha=1`);
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
  console.log(`[Resolve] Attempting to resolve: "${reference}"`);
  console.log(`[Resolve] Available variables in map:`, Array.from(variableMap.keys()).slice(0, 10));

  // Clean up the reference (remove "primitive." or "semantic." prefix if present)
  let cleanRef = reference.replace(/^(primitive|semantic)\./, '');
  console.log(`[Resolve] After removing prefix: "${cleanRef}"`);

  // Try direct lookup
  let variable = variableMap.get(cleanRef);
  if (variable) {
    console.log(`[Resolve] ✓ Found via direct lookup: "${cleanRef}"`);
    return variable;
  }

  // Try with different path separators
  cleanRef = cleanRef.replace(/\./g, '/');
  console.log(`[Resolve] Trying with slashes: "${cleanRef}"`);
  variable = variableMap.get(cleanRef);
  if (variable) {
    console.log(`[Resolve] ✓ Found via slash conversion: "${cleanRef}"`);
    return variable;
  }

  // Try all variables
  console.log(`[Resolve] Trying fuzzy match...`);
  for (const [key, val] of variableMap.entries()) {
    if (key.endsWith(cleanRef) || key.includes(cleanRef)) {
      console.log(`[Resolve] ✓ Found via fuzzy match: "${key}" matches "${cleanRef}"`);
      return val;
    }
  }

  console.warn(`[Resolve] ✗ Could not resolve reference: "${reference}"`);
  return null;
}

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
  console.log(`[Resolve] Available variables (first 10):`, Array.from(variableMap.keys()).slice(0, 10));

  // Clean up the reference (remove "primitive." or "semantic." prefix if present)
  let cleanRef = reference.replace(/^(primitive|semantic)\./, '');
  console.log(`[Resolve] After removing prefix: "${cleanRef}"`);

  // Strategy 1: Try direct lookup
  let variable = variableMap.get(cleanRef);
  if (variable) {
    console.log(`[Resolve] ✓ Found via direct lookup: "${cleanRef}"`);
    return variable;
  }

  // Strategy 2: Replace ALL dots with slashes (assumes dots = hierarchy)
  // Example: "color.transparency.75" -> "color/transparency/75"
  let slashRef = cleanRef.replace(/\./g, '/');
  console.log(`[Resolve] Trying with slashes: "${slashRef}"`);
  variable = variableMap.get(slashRef);
  if (variable) {
    console.log(`[Resolve] ✓ Found via slash conversion: "${slashRef}"`);
    return variable;
  }

  // Strategy 3: Try treating last segment as having dots in the name
  // Example: "color.transparency.75" -> "color/transparency-75"
  // This handles cases where "transparency.75" is a single token name
  const parts = cleanRef.split('.');
  if (parts.length >= 2) {
    // Try progressively: last 2 segments joined, last 3 segments joined, etc.
    for (let i = parts.length - 1; i >= 1; i--) {
      const pathPart = parts.slice(0, i).join('/');
      const namePart = parts.slice(i).join('-'); // Join with dash (sanitized)
      const dottedRef = pathPart ? `${pathPart}/${namePart}` : namePart;

      console.log(`[Resolve] Trying with dotted name: "${dottedRef}"`);
      variable = variableMap.get(dottedRef);
      if (variable) {
        console.log(`[Resolve] ✓ Found via dotted name: "${dottedRef}"`);
        return variable;
      }
    }
  }

  // Strategy 4: Fuzzy match (last resort)
  console.log(`[Resolve] Trying fuzzy match...`);
  for (const [key, val] of variableMap.entries()) {
    if (key.endsWith(cleanRef) || key.includes(cleanRef)) {
      console.log(`[Resolve] ✓ Found via fuzzy match: "${key}" matches "${cleanRef}"`);
      return val;
    }
  }

  console.warn(`[Resolve] ✗ Could not resolve reference: "${reference}"`);
  console.warn(`[Resolve] ✗ Tried:`, {
    direct: cleanRef,
    slashes: slashRef,
    variations: 'multiple dotted name variations'
  });
  return null;
}

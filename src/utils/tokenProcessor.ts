// ====================================================================================
// DEPRECATED: This file is part of the legacy architecture (v1.x)
// ====================================================================================
//
// Status: DEPRECATED - To be removed in deployment Phase 4
// Replaced by: src/core/services/TokenProcessor.ts
//
// Why still present:
// - Used by legacy VariableManager (also deprecated)
// - Required for dual-run validation strategy
// - Will be removed after production stability confirmed
//
// New architecture:
// - Format-agnostic processing via TokenFormatRegistry
// - Automatic format detection (W3C, Style Dictionary)
// - Better reference resolution via TokenResolver
// - See: src/core/services/TokenProcessor.ts
// ====================================================================================

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
      // Handle color object format with references (components and/or alpha)
      if (typeof value === 'object' && value !== null && ('alpha' in value || 'components' in value)) {
        let resolvedValue = { ...value };
        let needsResolution = false;

        // Resolve components reference if present
        if (typeof value.components === 'string' && value.components.includes('{') && value.components.includes('}')) {
          const componentsRef = extractReference(value.components);
          if (componentsRef) {
            const componentsVariable = resolveReference(componentsRef, variableMap);

            if (componentsVariable) {
              // Get the resolved color value from the variable
              const modeId = Object.keys(componentsVariable.valuesByMode)[0];
              const resolvedComponentsValue = componentsVariable.valuesByMode[modeId];

              // Extract RGB components from the resolved color
              if (typeof resolvedComponentsValue === 'object' && 'r' in resolvedComponentsValue) {
                // Convert Figma RGB (0-1) to the format expected by parseColor
                const colorSpace = value.colorSpace || 'rgb';
                if (colorSpace === 'rgb') {
                  resolvedValue.components = [
                    Math.round(resolvedComponentsValue.r * 255),
                    Math.round(resolvedComponentsValue.g * 255),
                    Math.round(resolvedComponentsValue.b * 255)
                  ];
                } else if (colorSpace === 'hsl') {
                  // Convert RGB to HSL for HSL color space
                  const hsl = rgbToHsl(resolvedComponentsValue.r, resolvedComponentsValue.g, resolvedComponentsValue.b);
                  resolvedValue.components = [
                    Math.round(hsl.h * 360),
                    Math.round(hsl.s * 100),
                    Math.round(hsl.l * 100)
                  ];
                }
                needsResolution = true;
              }
            } else {
              console.error(`[COMPONENTS FAILED] Cannot resolve: ${value.components}`);
            }
          }
        }

        // Resolve alpha reference if present
        if (typeof value.alpha === 'string' && value.alpha.includes('{') && value.alpha.includes('}')) {
          const alphaRef = extractReference(value.alpha);
          if (alphaRef) {
            const alphaVariable = resolveReference(alphaRef, variableMap);

            if (alphaVariable) {
              // Get the resolved numeric value from the variable
              const modeId = Object.keys(alphaVariable.valuesByMode)[0];
              const resolvedAlpha = alphaVariable.valuesByMode[modeId];

              resolvedValue.alpha = typeof resolvedAlpha === 'number' ? resolvedAlpha : 1;
              needsResolution = true;
            } else {
              console.error(`[ALPHA FAILED] Cannot resolve: ${value.alpha}`);
              resolvedValue.alpha = 1;
            }
          }
        }

        if (needsResolution) {
          return { value: parseColor(resolvedValue), isAlias: false };
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

/**
 * Convert RGB (0-1) to HSL (h: 0-1, s: 0-1, l: 0-1)
 * Used for resolving color components references
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h, s, l };
}

"use strict";
// W3C Design Tokens Importer for Figma
// This plugin imports W3C Design Tokens from JSON files and creates Figma variables
figma.showUI(__html__, { width: 800, height: 600 });
// Store created variables for reference resolution
const variableMap = new Map();
const collectionMap = new Map();
let importStats = { added: 0, updated: 0, skipped: 0 };
figma.ui.onmessage = async (msg) => {
    try {
        if (msg.type === 'import-tokens') {
            const { primitives, semantics } = msg.data;
            const stats = await importTokens(primitives, semantics);
            figma.ui.postMessage({
                type: 'import-success',
                message: `✓ Tokens imported: ${stats.added} added, ${stats.updated} updated, ${stats.skipped} skipped`
            });
        }
        else if (msg.type === 'cancel') {
            figma.closePlugin();
        }
    }
    catch (error) {
        console.error('Error in plugin:', error);
        figma.ui.postMessage({
            type: 'import-error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};
async function importTokens(primitives, semantics) {
    try {
        // Reset stats
        importStats = { added: 0, updated: 0, skipped: 0 };
        // Clear existing collections or get them
        const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
        // Create or get collections
        let primitiveCollection = existingCollections.find(c => c.name === 'Primitive');
        let semanticCollection = existingCollections.find(c => c.name === 'Semantic');
        if (!primitiveCollection) {
            primitiveCollection = figma.variables.createVariableCollection('Primitive');
        }
        if (!semanticCollection) {
            semanticCollection = figma.variables.createVariableCollection('Semantic');
        }
        collectionMap.set('Primitive', primitiveCollection);
        collectionMap.set('Semantic', semanticCollection);
        // Process primitives first (they have no dependencies)
        if (primitives) {
            await processTokenGroup(primitives, 'Primitive', primitiveCollection, []);
        }
        // Process semantics (they may reference primitives)
        if (semantics) {
            await processTokenGroup(semantics, 'Semantic', semanticCollection, []);
        }
        const message = `✓ Tokens imported: ${importStats.added} added, ${importStats.updated} updated`;
        figma.notify(message, { timeout: 3000 });
        return importStats;
    }
    catch (error) {
        throw new Error(`Failed to import tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function processTokenGroup(tokens, collectionName, collection, pathPrefix) {
    for (const [key, value] of Object.entries(tokens)) {
        const currentPath = [...pathPrefix, key];
        // Check if this is a token (has $value) or a group
        if (value && typeof value === 'object') {
            if ('$value' in value) {
                // This is a token
                await createVariable(value, currentPath, collection);
            }
            else {
                // This is a group, recurse
                await processTokenGroup(value, collectionName, collection, currentPath);
            }
        }
    }
}
async function createVariable(token, path, collection) {
    try {
        const variableName = path.join('/');
        const tokenType = token.$type || inferTokenType(token.$value);
        const figmaType = mapTokenTypeToFigma(tokenType);
        // Check if variable already exists
        let variable = await findVariableByName(variableName, collection);
        let isNewVariable = false;
        if (!variable) {
            variable = figma.variables.createVariable(variableName, collection, figmaType);
            isNewVariable = true;
            importStats.added++;
        }
        else {
            // Update existing variable type if needed
            if (variable.resolvedType !== figmaType) {
                variable = figma.variables.createVariable(variableName + '_new', collection, figmaType);
                isNewVariable = true;
                importStats.added++;
            }
            else {
                importStats.updated++;
            }
        }
        // Process and set the value
        const processedValue = await processTokenValue(token.$value, tokenType, collection);
        // Debug logging
        console.log(`Setting variable ${variableName}:`, {
            originalValue: token.$value,
            tokenType,
            processedValue: processedValue.value,
            isAlias: processedValue.isAlias
        });
        // Get the default mode
        const modeId = collection.modes[0].modeId;
        // Set the value
        if (processedValue.isAlias && processedValue.aliasVariable) {
            variable.setValueForMode(modeId, { type: 'VARIABLE_ALIAS', id: processedValue.aliasVariable.id });
        }
        else {
            variable.setValueForMode(modeId, processedValue.value);
        }
        // Store variable for reference resolution
        variableMap.set(variableName, variable);
        // Set description if available
        if (token.$description) {
            variable.description = token.$description;
        }
    }
    catch (error) {
        console.error(`Error creating variable ${path.join('/')}: ${error}`);
        importStats.skipped++;
        // Don't throw - continue with other tokens
    }
}
async function findVariableByName(name, collection) {
    const variablePromises = collection.variableIds.map(id => figma.variables.getVariableByIdAsync(id));
    const allVariables = await Promise.all(variablePromises);
    return allVariables.find(v => v && v.name === name) || null;
}
function inferTokenType(value) {
    if (typeof value === 'string') {
        if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
            return 'color';
        }
        if (value.endsWith('px') || value.endsWith('rem')) {
            return 'dimension';
        }
        if (value.includes('px')) {
            return 'spacing';
        }
        return 'string';
    }
    if (typeof value === 'number') {
        return 'number';
    }
    if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
            return 'typography';
        }
    }
    return 'string';
}
function mapTokenTypeToFigma(tokenType) {
    const typeMap = {
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
    return typeMap[tokenType] || 'STRING';
}
async function processTokenValue(value, tokenType, collection) {
    // Check if it's a reference
    if (typeof value === 'string' && value.includes('{') && value.includes('}')) {
        const reference = extractReference(value);
        if (reference) {
            const referencedVariable = resolveReference(reference);
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
        case 'lineHeight':
        case 'string':
        default:
            return { value: String(value), isAlias: false };
    }
}
function extractReference(value) {
    const match = value.match(/\{([^}]+)\}/);
    return match ? match[1] : null;
}
function resolveReference(reference) {
    // Clean up the reference (remove "primitive." or "semantic." prefix if present)
    let cleanRef = reference.replace(/^(primitive|semantic)\./, '');
    // Try direct lookup
    let variable = variableMap.get(cleanRef);
    if (variable)
        return variable;
    // Try with different path separators
    cleanRef = cleanRef.replace(/\./g, '/');
    variable = variableMap.get(cleanRef);
    if (variable)
        return variable;
    // Try all variables
    for (const [key, val] of variableMap.entries()) {
        if (key.endsWith(cleanRef) || key.includes(cleanRef)) {
            return val;
        }
    }
    console.warn(`Could not resolve reference: ${reference}`);
    return null;
}
function parseColor(value) {
    console.log('parseColor input:', value, 'type:', typeof value);
    // Handle object format: {value: "#ff0000"}
    if (typeof value === 'object' && value !== null && 'value' in value) {
        console.log('parseColor using object.value:', value.value);
        return parseColor(value.value); // Recursively parse the value property
    }
    if (typeof value === 'string') {
        // Handle hex colors
        if (value.startsWith('#')) {
            return hexToRgb(value);
        }
        // Handle rgb/rgba
        if (value.startsWith('rgb')) {
            return rgbStringToRgb(value);
        }
        // Handle hsl/hsla
        if (value.startsWith('hsl')) {
            return hslStringToRgb(value);
        }
    }
    // Handle object with hex property
    if (typeof value === 'object' && value.hex) {
        return hexToRgb(value.hex);
    }
    console.log('parseColor returning black for:', value);
    // Default to black
    return { r: 0, g: 0, b: 0 };
}
function hexToRgb(hex) {
    const cleaned = hex.replace('#', '');
    const bigint = parseInt(cleaned, 16);
    if (cleaned.length === 6) {
        return {
            r: ((bigint >> 16) & 255) / 255,
            g: ((bigint >> 8) & 255) / 255,
            b: (bigint & 255) / 255
        };
    }
    else if (cleaned.length === 3) {
        const r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
        const g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
        const b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
        return { r, g, b };
    }
    return { r: 0, g: 0, b: 0 };
}
function rgbStringToRgb(rgbString) {
    const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        return {
            r: parseInt(match[1]) / 255,
            g: parseInt(match[2]) / 255,
            b: parseInt(match[3]) / 255
        };
    }
    return { r: 0, g: 0, b: 0 };
}
function hslStringToRgb(hslString) {
    const match = hslString.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
    if (match) {
        const h = parseInt(match[1]) / 360;
        const s = parseInt(match[2]) / 100;
        const l = parseInt(match[3]) / 100;
        return hslToRgb(h, s, l);
    }
    return { r: 0, g: 0, b: 0 };
}
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    }
    else {
        const hue2rgb = (p, q, t) => {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r, g, b };
}
function parseNumber(value) {
    console.log('parseNumber input:', value, 'type:', typeof value);
    // Handle object format: {value: 0.5}
    if (typeof value === 'object' && value !== null && 'value' in value) {
        const result = parseFloat(value.value);
        console.log('parseNumber parsed object:', value, '→', result);
        return result || 0;
    }
    if (typeof value === 'number') {
        console.log('parseNumber returning number:', value);
        return value;
    }
    if (typeof value === 'string') {
        const result = parseFloat(value);
        console.log('parseNumber parsed string:', value, '→', result);
        return result || 0;
    }
    console.log('parseNumber returning 0 for:', value);
    return 0;
}
function parseDimension(value) {
    console.log('parseDimension input:', value, 'type:', typeof value);
    // Handle object format: {value: 4, unit: "px"}
    if (typeof value === 'object' && value !== null && 'value' in value) {
        const numValue = parseFloat(value.value);
        const unit = value.unit || 'px';
        if (unit === 'rem') {
            const result = numValue * 16; // Convert rem to px
            console.log('parseDimension parsed object rem:', value, '→', result);
            return result;
        }
        console.log('parseDimension parsed object:', value, '→', numValue);
        return numValue;
    }
    if (typeof value === 'number') {
        console.log('parseDimension returning number:', value);
        return value;
    }
    if (typeof value === 'string') {
        // Remove 'px' suffix
        if (value.endsWith('px')) {
            const result = parseFloat(value.replace('px', ''));
            console.log('parseDimension parsed px:', value, '→', result);
            return result;
        }
        // Convert rem to px (assuming 16px base)
        if (value.endsWith('rem')) {
            const result = parseFloat(value.replace('rem', '')) * 16;
            console.log('parseDimension parsed rem:', value, '→', result);
            return result;
        }
        // Try to parse as number
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
            console.log('parseDimension parsed number:', value, '→', parsed);
            return parsed;
        }
    }
    console.log('parseDimension returning 0 for:', value);
    return 0;
}
function parseTypography(value) {
    if (Array.isArray(value)) {
        // Convert array to string representation
        return value.join(', ');
    }
    if (typeof value === 'object') {
        // Convert object to string representation
        return JSON.stringify(value);
    }
    return String(value);
}
function parseFontFamily(value) {
    console.log('parseFontFamily input:', value, 'type:', typeof value);
    // Handle object format: {value: "Inter"}
    if (typeof value === 'object' && value !== null && 'value' in value) {
        console.log('parseFontFamily using object.value:', value.value);
        return parseFontFamily(value.value); // Recursively parse the value property
    }
    // If it's an array, extract only the first font family
    if (Array.isArray(value)) {
        const result = value[0] ? String(value[0]) : 'Arial';
        console.log('parseFontFamily from array:', value, '→', result);
        return result;
    }
    // If it's a comma-separated string, extract the first one
    if (typeof value === 'string' && value.includes(',')) {
        const result = value.split(',')[0].trim();
        console.log('parseFontFamily from comma-separated:', value, '→', result);
        return result;
    }
    console.log('parseFontFamily returning:', String(value));
    return String(value);
}

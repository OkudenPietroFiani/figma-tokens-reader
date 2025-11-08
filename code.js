"use strict";
(() => {
  // src/constants.ts
  var UI_CONFIG = {
    width: 800,
    height: 600
  };
  var COLLECTION_NAMES = {
    primitive: "primitive",
    semantic: "semantic"
  };
  var TYPE_MAPPING = {
    "color": "COLOR",
    "dimension": "FLOAT",
    "spacing": "FLOAT",
    "number": "FLOAT",
    "fontFamily": "STRING",
    "fontWeight": "FLOAT",
    "fontSize": "FLOAT",
    "lineHeight": "STRING",
    "typography": "STRING",
    "string": "STRING"
  };
  var REM_TO_PX_RATIO = 16;

  // src/utils/parser.ts
  function parseColor(value) {
    if (typeof value === "object" && value !== null && "value" in value) {
      return parseColor(value.value);
    }
    if (typeof value === "string") {
      if (value.startsWith("#")) {
        return hexToRgb(value);
      }
      if (value.startsWith("rgb")) {
        return rgbStringToRgb(value);
      }
      if (value.startsWith("hsl")) {
        return hslStringToRgb(value);
      }
    }
    if (typeof value === "object" && value.hex) {
      return hexToRgb(value.hex);
    }
    return { r: 0, g: 0, b: 0 };
  }
  function parseNumber(value) {
    if (typeof value === "object" && value !== null && "value" in value) {
      return parseFloat(value.value) || 0;
    }
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      return parseFloat(value) || 0;
    }
    return 0;
  }
  function parseDimension(value) {
    if (typeof value === "object" && value !== null && "value" in value) {
      const numValue = parseFloat(value.value);
      const unit = value.unit || "px";
      if (unit === "rem") {
        return numValue * REM_TO_PX_RATIO;
      }
      return numValue;
    }
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      if (value.endsWith("px")) {
        return parseFloat(value.replace("px", ""));
      }
      if (value.endsWith("rem")) {
        return parseFloat(value.replace("rem", "")) * REM_TO_PX_RATIO;
      }
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return 0;
  }
  function parseTypography(value) {
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }
  function parseFontFamily(value) {
    if (typeof value === "object" && value !== null && "value" in value) {
      return parseFontFamily(value.value);
    }
    if (Array.isArray(value)) {
      return value[0] ? String(value[0]) : "Arial";
    }
    if (typeof value === "string" && value.includes(",")) {
      return value.split(",")[0].trim();
    }
    return String(value);
  }
  function hexToRgb(hex) {
    const cleaned = hex.replace("#", "");
    const bigint = parseInt(cleaned, 16);
    if (cleaned.length === 6) {
      return {
        r: (bigint >> 16 & 255) / 255,
        g: (bigint >> 8 & 255) / 255,
        b: (bigint & 255) / 255
      };
    } else if (cleaned.length === 3) {
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
    } else {
      const hue2rgb = (p2, q2, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
        if (t < 1 / 2) return q2;
        if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
        return p2;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r, g, b };
  }
  function inferTokenType(value) {
    if (typeof value === "string") {
      if (value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl")) {
        return "color";
      }
      if (value.endsWith("px") || value.endsWith("rem")) {
        return "dimension";
      }
      if (value.includes("px")) {
        return "spacing";
      }
      return "string";
    }
    if (typeof value === "number") {
      return "number";
    }
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        return "typography";
      }
    }
    return "string";
  }

  // src/utils/tokenProcessor.ts
  function mapTokenTypeToFigma(tokenType) {
    return TYPE_MAPPING[tokenType] || "STRING";
  }
  async function processTokenValue(value, tokenType, variableMap) {
    if (typeof value === "string" && value.includes("{") && value.includes("}")) {
      const reference = extractReference(value);
      if (reference) {
        const referencedVariable = resolveReference(reference, variableMap);
        if (referencedVariable) {
          return { value: null, isAlias: true, aliasVariable: referencedVariable };
        }
      }
    }
    switch (tokenType) {
      case "color":
        return { value: parseColor(value), isAlias: false };
      case "dimension":
      case "spacing":
      case "fontSize":
        return { value: parseDimension(value), isAlias: false };
      case "number":
        return { value: parseNumber(value), isAlias: false };
      case "typography":
        return { value: parseTypography(value), isAlias: false };
      case "fontFamily":
        return { value: parseFontFamily(value), isAlias: false };
      case "fontWeight":
        return { value: parseNumber(value), isAlias: false };
      case "lineHeight":
      case "string":
      default:
        return { value: String(value), isAlias: false };
    }
  }
  function extractReference(value) {
    const match = value.match(/\{([^}]+)\}/);
    return match ? match[1] : null;
  }
  function resolveReference(reference, variableMap) {
    let cleanRef = reference.replace(/^(primitive|semantic)\./, "");
    let variable = variableMap.get(cleanRef);
    if (variable) return variable;
    cleanRef = cleanRef.replace(/\./g, "/");
    variable = variableMap.get(cleanRef);
    if (variable) return variable;
    for (const [key, val] of variableMap.entries()) {
      if (key.endsWith(cleanRef) || key.includes(cleanRef)) {
        return val;
      }
    }
    console.warn(`Could not resolve reference: ${reference}`);
    return null;
  }

  // src/services/styleManager.ts
  var StyleManager = class {
    constructor(variableMap) {
      this.variableMap = variableMap;
      this.styleStats = { created: 0, updated: 0, skipped: 0 };
    }
    /**
     * Process tokens and create text styles for composite typography tokens
     * Clean code: Single responsibility - only handles text styles
     */
    async createTextStyles(tokens, pathPrefix = []) {
      console.log("\n=== CREATING TEXT STYLES ===");
      this.styleStats = { created: 0, updated: 0, skipped: 0 };
      await this.processTokenGroup(tokens, pathPrefix);
      if (this.styleStats.created > 0 || this.styleStats.updated > 0) {
        figma.notify(
          `\u2713 Text styles: ${this.styleStats.created} created, ${this.styleStats.updated} updated`,
          { timeout: 3e3 }
        );
      }
      return this.styleStats;
    }
    /**
     * Recursively process token groups to find typography tokens
     */
    async processTokenGroup(tokens, pathPrefix) {
      for (const [key, value] of Object.entries(tokens)) {
        const currentPath = [...pathPrefix, key];
        if (value && typeof value === "object") {
          if (this.isTypographyToken(value)) {
            await this.createTextStyle(value, currentPath);
          } else if (!("$value" in value)) {
            await this.processTokenGroup(value, currentPath);
          }
        }
      }
    }
    /**
     * Check if token is a composite typography token
     */
    isTypographyToken(token) {
      return token.$type === "typography" && token.$value && typeof token.$value === "object" && !Array.isArray(token.$value);
    }
    /**
     * Create or update Figma text style from typography token
     * Clean code: Single purpose, clear error handling
     */
    async createTextStyle(token, path) {
      try {
        const styleName = path.join("/");
        const typography = token.$value;
        console.log(`[STYLE] Creating text style: ${styleName}`);
        const existingStyles = await figma.getLocalTextStylesAsync();
        let textStyle = existingStyles.find((s) => s.name === styleName);
        if (!textStyle) {
          textStyle = figma.createTextStyle();
          textStyle.name = styleName;
          this.styleStats.created++;
          console.log(`[STYLE] \u2713 Created new text style: ${styleName}`);
        } else {
          this.styleStats.updated++;
          console.log(`[STYLE] \u2713 Updating existing text style: ${styleName}`);
        }
        if (token.$description) {
          textStyle.description = token.$description;
        }
        await this.applyTypographyProperties(textStyle, typography);
      } catch (error) {
        console.error(`[STYLE] Error creating text style ${path.join("/")}: ${error}`);
        this.styleStats.skipped++;
      }
    }
    /**
     * Apply typography properties to text style
     * Resolves token references to actual values
     */
    async applyTypographyProperties(textStyle, typography) {
      if (typography.fontFamily) {
        const fontFamily = this.resolveTokenReference(typography.fontFamily);
        if (fontFamily) {
          try {
            await figma.loadFontAsync({ family: fontFamily, style: "Regular" });
            textStyle.fontName = { family: fontFamily, style: "Regular" };
          } catch (error) {
            console.warn(`[STYLE] Could not load font ${fontFamily}, using default`);
          }
        }
      }
      if (typography.fontSize) {
        const fontSize = this.resolveNumericValue(typography.fontSize);
        if (fontSize) {
          textStyle.fontSize = fontSize;
        }
      }
      if (typography.fontWeight) {
        const fontWeight = this.resolveFontWeight(typography.fontWeight);
        if (fontWeight && textStyle.fontName) {
          try {
            await figma.loadFontAsync({ family: textStyle.fontName.family, style: fontWeight });
            textStyle.fontName = { family: textStyle.fontName.family, style: fontWeight };
          } catch (error) {
            console.warn(`[STYLE] Could not load font weight ${fontWeight}`);
          }
        }
      }
      if (typography.lineHeight) {
        const lineHeight = this.resolveLineHeight(typography.lineHeight);
        if (lineHeight) {
          textStyle.lineHeight = lineHeight;
        }
      }
      if (typography.letterSpacing) {
        const letterSpacing = this.resolveNumericValue(typography.letterSpacing);
        if (letterSpacing !== null) {
          textStyle.letterSpacing = { value: letterSpacing, unit: "PIXELS" };
        }
      }
    }
    /**
     * Resolve token reference like "{primitive.typography.font-family.primary}"
     * to actual value from variables
     */
    resolveTokenReference(value) {
      if (typeof value !== "string") {
        return String(value);
      }
      const match = value.match(/^\{(.+)\}$/);
      if (!match) {
        return value;
      }
      const path = match[1];
      const variableName = path.replace(/\./g, "/");
      const variable = this.variableMap.get(variableName);
      if (variable) {
        return String(variable.name);
      }
      console.warn(`[STYLE] Could not resolve reference: ${value}`);
      return null;
    }
    /**
     * Resolve numeric value (handles references and units)
     */
    resolveNumericValue(value) {
      if (typeof value === "number") {
        return value;
      }
      const resolved = this.resolveTokenReference(value);
      if (!resolved) return null;
      const numMatch = resolved.match(/^([\d.]+)/);
      if (numMatch) {
        return parseFloat(numMatch[1]);
      }
      return null;
    }
    /**
     * Resolve font weight to Figma font style
     */
    resolveFontWeight(weight) {
      const resolved = this.resolveTokenReference(String(weight));
      if (!resolved) return null;
      const weightMap = {
        "100": "Thin",
        "200": "Extra Light",
        "300": "Light",
        "400": "Regular",
        "500": "Medium",
        "600": "Semi Bold",
        "700": "Bold",
        "800": "Extra Bold",
        "900": "Black",
        "normal": "Regular",
        "bold": "Bold"
      };
      return weightMap[resolved.toLowerCase()] || "Regular";
    }
    /**
     * Resolve line height (can be numeric or percentage)
     */
    resolveLineHeight(value) {
      if (typeof value === "number") {
        return { value, unit: "PIXELS" };
      }
      const resolved = this.resolveTokenReference(value);
      if (!resolved) return null;
      if (resolved.includes("%")) {
        const percent = parseFloat(resolved);
        return { value: percent, unit: "PERCENT" };
      }
      const pixels = this.resolveNumericValue(resolved);
      if (pixels) {
        return { value: pixels, unit: "PIXELS" };
      }
      return null;
    }
    getStats() {
      return this.styleStats;
    }
  };

  // src/services/variableManager.ts
  var VariableManager = class {
    constructor() {
      this.variableMap = /* @__PURE__ */ new Map();
      this.collectionMap = /* @__PURE__ */ new Map();
      this.tokenMetadata = [];
      this.importStats = { added: 0, updated: 0, skipped: 0 };
    }
    async importTokens(primitives, semantics) {
      try {
        this.importStats = { added: 0, updated: 0, skipped: 0 };
        this.tokenMetadata = [];
        const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
        const primitiveCollection = this.getOrCreateCollection(existingCollections, COLLECTION_NAMES.primitive);
        const semanticCollection = this.getOrCreateCollection(existingCollections, COLLECTION_NAMES.semantic);
        this.collectionMap.set(COLLECTION_NAMES.primitive, primitiveCollection);
        this.collectionMap.set(COLLECTION_NAMES.semantic, semanticCollection);
        if (primitives) {
          console.log("\n=== PROCESSING PRIMITIVES ===");
          const cleanedPrimitives = this.prepareAndValidateTokens(primitives, "primitive");
          await this.processTokenGroup(cleanedPrimitives, COLLECTION_NAMES.primitive, primitiveCollection, []);
        }
        if (semantics) {
          console.log("\n=== PROCESSING SEMANTICS ===");
          const cleanedSemantics = this.prepareAndValidateTokens(semantics, "semantic");
          await this.processTokenGroup(cleanedSemantics, COLLECTION_NAMES.semantic, semanticCollection, []);
        }
        const styleManager = new StyleManager(this.variableMap);
        if (primitives) {
          const cleanedPrimitives = this.prepareAndValidateTokens(primitives, "primitive");
          await styleManager.createTextStyles(cleanedPrimitives, [COLLECTION_NAMES.primitive]);
        }
        if (semantics) {
          const cleanedSemantics = this.prepareAndValidateTokens(semantics, "semantic");
          await styleManager.createTextStyles(cleanedSemantics, [COLLECTION_NAMES.semantic]);
        }
        figma.notify(
          `\u2713 Tokens imported: ${this.importStats.added} added, ${this.importStats.updated} updated`,
          { timeout: 3e3 }
        );
        return this.importStats;
      } catch (error) {
        throw new Error(`Failed to import tokens: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    /**
     * Get existing collection or create a new one
     * Handles renaming old uppercase collections to lowercase
     */
    getOrCreateCollection(existingCollections, name) {
      let collection = existingCollections.find((c) => c.name === name);
      if (!collection) {
        const uppercaseName = name.charAt(0).toUpperCase() + name.slice(1);
        const oldCollection = existingCollections.find((c) => c.name === uppercaseName);
        if (oldCollection) {
          console.log(`Renaming collection from '${uppercaseName}' to '${name}'`);
          oldCollection.name = name;
          collection = oldCollection;
        } else {
          console.log(`Creating new collection: '${name}'`);
          collection = figma.variables.createVariableCollection(name);
        }
      }
      return collection;
    }
    /**
     * Prepare and validate token structure before import
     * Ensures no redundant collection-name wrappers exist
     *
     * Clean code principle: Single responsibility - only prepares tokens
     */
    prepareAndValidateTokens(data, collectionType) {
      console.log(`
[PREPARE] Input structure for ${collectionType}:`, this.getStructureSummary(data));
      const isFileKeyed = this.isFileKeyedStructure(data);
      console.log(`[PREPARE] Is file-keyed: ${isFileKeyed}`);
      let processed;
      if (isFileKeyed) {
        processed = this.processMultipleFiles(data, collectionType);
      } else {
        processed = this.removeAllCollectionWrappers(data, collectionType);
      }
      this.validateNoCollectionWrappers(processed, collectionType);
      console.log(`[PREPARE] Final structure for ${collectionType}:`, this.getStructureSummary(processed));
      return processed;
    }
    /**
     * Check if data structure has file names as keys
     */
    isFileKeyedStructure(data) {
      const keys = Object.keys(data);
      return keys.some(
        (key) => key.endsWith(".json") || key.includes("-json") || key.includes("_json")
      );
    }
    /**
     * Process multiple token files and merge them
     * Clean code: Separated concerns - file processing vs merging
     */
    processMultipleFiles(filesData, collectionType) {
      console.log(`[MULTI-FILE] Processing ${Object.keys(filesData).length} files`);
      const cleanedFiles = [];
      for (const [fileName, fileContent] of Object.entries(filesData)) {
        if (!fileContent || typeof fileContent !== "object") continue;
        console.log(`
[FILE] Processing: ${fileName}`);
        console.log(`[FILE] Before clean:`, this.getStructureSummary(fileContent));
        const cleaned = this.removeAllCollectionWrappers(fileContent, collectionType);
        console.log(`[FILE] After clean:`, this.getStructureSummary(cleaned));
        cleanedFiles.push(cleaned);
      }
      const merged = this.deepMergeAll(cleanedFiles);
      console.log(`[MULTI-FILE] After merge:`, this.getStructureSummary(merged));
      return merged;
    }
    /**
     * Remove ALL collection-name wrappers recursively
     * Handles cases where collection-name key exists alongside other keys
     *
     * Example:
     * Input:  { "primitive": { "spacing": {...} }, "metadata": {...} }
     * Output: { "spacing": {...}, "metadata": {...} }
     */
    removeAllCollectionWrappers(data, collectionType) {
      let current = data;
      let iterations = 0;
      const maxIterations = 10;
      while (iterations < maxIterations) {
        const keys = Object.keys(current);
        let didUnwrap = false;
        for (const key of keys) {
          if (this.isCollectionNameKey(key, collectionType)) {
            const value = current[key];
            if (value && typeof value === "object" && !("$value" in value)) {
              console.log(`[UNWRAP] Found collection wrapper '${key}' with ${Object.keys(value).length} children`);
              if (keys.length === 1) {
                console.log(`[UNWRAP] Single key - replacing entire structure`);
                current = value;
                didUnwrap = true;
                break;
              } else {
                console.log(`[UNWRAP] Multiple keys - extracting wrapper contents`);
                const newStructure = {};
                for (const k of keys) {
                  if (k !== key) {
                    newStructure[k] = current[k];
                  }
                }
                for (const [childKey, childValue] of Object.entries(value)) {
                  newStructure[childKey] = childValue;
                }
                current = newStructure;
                didUnwrap = true;
                break;
              }
            }
          }
        }
        if (!didUnwrap) {
          break;
        }
        iterations++;
      }
      if (iterations >= maxIterations) {
        console.warn(`[UNWRAP] Warning: Max iterations reached. Possible circular structure.`);
      }
      console.log(`[UNWRAP] Completed after ${iterations} iteration(s)`);
      return current;
    }
    /**
     * Check if a key matches the collection name
     * Handles: "primitive", "primitives", "semantic", "semantics"
     */
    isCollectionNameKey(key, collectionType) {
      const normalized = key.toLowerCase();
      return normalized === collectionType || normalized === collectionType + "s" || normalized === collectionType.slice(0, -1);
    }
    /**
     * Validate that no collection-name keys remain in structure
     * Throws error if found - fail fast principle
     */
    validateNoCollectionWrappers(data, collectionType) {
      const keys = Object.keys(data);
      for (const key of keys) {
        if (this.isCollectionNameKey(key, collectionType)) {
          const value = data[key];
          if (value && typeof value === "object" && !("$value" in value)) {
            console.error(`[VALIDATION] Found collection wrapper that should have been removed: '${key}'`);
            console.error(`[VALIDATION] This will create duplicate levels in Figma!`);
            throw new Error(`Validation failed: Collection wrapper '${key}' still exists in ${collectionType} data`);
          }
        }
      }
      console.log(`[VALIDATION] \u2713 No collection wrappers found in ${collectionType}`);
    }
    /**
     * Get structure summary for logging
     * Clean code: Helper for debugging
     */
    getStructureSummary(data) {
      const keys = Object.keys(data);
      if (keys.length === 0) return "{}";
      if (keys.length <= 3) return `{ ${keys.join(", ")} }`;
      return `{ ${keys.slice(0, 3).join(", ")}, ... (${keys.length} keys) }`;
    }
    /**
     * Deep merge multiple token objects
     * Clean code: Pure function, no side effects
     */
    deepMergeAll(sources) {
      const result = {};
      for (const source of sources) {
        this.deepMerge(result, source);
      }
      return result;
    }
    /**
     * Deep merge source into target (handles nested objects correctly)
     */
    deepMerge(target, source) {
      for (const [key, value] of Object.entries(source)) {
        if (value && typeof value === "object" && !Array.isArray(value) && !("$value" in value)) {
          if (!target[key] || typeof target[key] !== "object") {
            target[key] = {};
          }
          this.deepMerge(target[key], value);
        } else {
          target[key] = value;
        }
      }
    }
    async processTokenGroup(tokens, collectionName, collection, pathPrefix) {
      for (const [key, value] of Object.entries(tokens)) {
        const currentPath = [...pathPrefix, key];
        if (value && typeof value === "object") {
          if ("$value" in value) {
            if (this.isCompositeTypographyToken(value)) {
              console.log(`[SKIP] Skipping typography token ${currentPath.join("/")} - will be created as text style`);
              continue;
            }
            await this.createVariable(value, currentPath, collection, collectionName);
          } else {
            await this.processTokenGroup(value, collectionName, collection, currentPath);
          }
        }
      }
    }
    /**
     * Check if token is a composite typography token
     * These will be created as text styles instead of variables
     */
    isCompositeTypographyToken(token) {
      return token.$type === "typography" && token.$value && typeof token.$value === "object" && !Array.isArray(token.$value);
    }
    async createVariable(token, path, collection, collectionName) {
      try {
        const variableName = path.map(
          (segment) => segment.replace(/[^a-zA-Z0-9-_]/g, "-")
        ).join("/");
        const tokenType = token.$type || inferTokenType(token.$value);
        const figmaType = mapTokenTypeToFigma(tokenType);
        let variable = await this.findVariableByName(variableName, collection);
        if (!variable) {
          variable = figma.variables.createVariable(variableName, collection, figmaType);
          this.importStats.added++;
        } else {
          if (variable.resolvedType !== figmaType) {
            variable = figma.variables.createVariable(variableName + "_new", collection, figmaType);
            this.importStats.added++;
          } else {
            this.importStats.updated++;
          }
        }
        const processedValue = await processTokenValue(token.$value, tokenType, this.variableMap);
        const modeId = collection.modes[0].modeId;
        if (processedValue.isAlias && processedValue.aliasVariable) {
          variable.setValueForMode(modeId, { type: "VARIABLE_ALIAS", id: processedValue.aliasVariable.id });
        } else {
          variable.setValueForMode(modeId, processedValue.value);
        }
        this.setCodeSyntax(variable, path, collectionName);
        this.variableMap.set(variableName, variable);
        if (token.$description) {
          variable.description = token.$description;
        }
        const fullPath = `${collectionName.toLowerCase()}.${path.join(".")}`;
        const metadata = {
          name: path[path.length - 1],
          fullPath,
          type: tokenType,
          value: processedValue.value,
          originalValue: token.$value,
          description: token.$description,
          aliasTo: processedValue.isAlias && processedValue.aliasVariable ? processedValue.aliasVariable.name : void 0,
          collection: collectionName
        };
        this.tokenMetadata.push(metadata);
      } catch (error) {
        console.error(`Error creating variable ${path.join("/")}: ${error}`);
        this.importStats.skipped++;
      }
    }
    /**
     * Set code syntax using Figma's official API
     * Uses setVariableCodeSyntax() method as documented
     */
    setCodeSyntax(variable, path, collectionName) {
      try {
        const collection = collectionName.toLowerCase();
        const tokenPath = path.join("-").toLowerCase().replace(/[^a-z0-9-]/g, "-");
        const cssVarName = `--${collection}-${tokenPath}`;
        variable.setVariableCodeSyntax("WEB", `var(${cssVarName})`);
        variable.setVariableCodeSyntax("ANDROID", `@dimen/${collection}_${path.join("_").replace(/[^a-z0-9_]/g, "_")}`);
        variable.setVariableCodeSyntax("iOS", `${collection}.${path.join(".")}`);
        console.log(`\u2713 Code syntax set for ${variable.name}: var(${cssVarName})`);
      } catch (error) {
        console.warn(`Could not set code syntax for ${path.join("/")}: ${error}`);
      }
    }
    async findVariableByName(name, collection) {
      const variablePromises = collection.variableIds.map((id) => figma.variables.getVariableByIdAsync(id));
      const allVariables = await Promise.all(variablePromises);
      return allVariables.find((v) => v && v.name === name) || null;
    }
    getTokenMetadata() {
      return this.tokenMetadata;
    }
  };

  // src/services/githubService.ts
  var GitHubService = class {
    async fetchRepositoryFiles(config) {
      try {
        const url = `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${config.branch}?recursive=1`;
        const response = await fetch(url, {
          headers: {
            "Authorization": `token ${config.token}`,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Figma-W3C-Tokens-Plugin"
          }
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`GitHub API error (${response.status}): ${errorText || response.statusText}`);
        }
        const data = await response.json();
        const jsonFiles = data.tree.filter(
          (item) => item.type === "blob" && item.path.endsWith(".json")
        );
        return jsonFiles.map((file) => ({
          path: file.path,
          type: file.type,
          sha: file.sha
        }));
      } catch (error) {
        console.error("GitHub fetch error:", error);
        throw new Error(`Failed to fetch repository files: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    async fetchFileContent(config, filePath) {
      try {
        const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}?ref=${config.branch}`;
        console.log(`Fetching file: ${filePath}`);
        const response = await fetch(url, {
          headers: {
            "Authorization": `token ${config.token}`,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Figma-W3C-Tokens-Plugin"
          }
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`GitHub API error for ${filePath}:`, response.status, errorText);
          throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`File fetched successfully: ${filePath}, encoding: ${data.encoding}, size: ${data.size}`);
        if (!data.content) {
          throw new Error(`No content field in GitHub response for ${filePath}`);
        }
        const content = this.decodeBase64(data.content);
        console.log(`Content decoded, length: ${content.length} chars`);
        return JSON.parse(content);
      } catch (error) {
        console.error(`Error fetching file ${filePath}:`, error);
        throw error;
      }
    }
    async fetchMultipleFiles(config, filePaths) {
      const primitivesData = {};
      const semanticsData = {};
      for (const filePath of filePaths) {
        const jsonData = await this.fetchFileContent(config, filePath);
        const fileName = filePath.split("/").pop() || filePath;
        if (filePath.toLowerCase().includes("primitive")) {
          primitivesData[fileName] = jsonData;
        } else if (filePath.toLowerCase().includes("semantic")) {
          semanticsData[fileName] = jsonData;
        } else {
          primitivesData[fileName] = jsonData;
        }
      }
      return { primitives: primitivesData, semantics: semanticsData };
    }
    decodeBase64(base64) {
      const cleanBase64 = base64.replace(/\s/g, "");
      try {
        const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        const base64Lookup = /* @__PURE__ */ new Map();
        for (let i2 = 0; i2 < base64Chars.length; i2++) {
          base64Lookup.set(base64Chars[i2], i2);
        }
        const bytes = [];
        for (let i2 = 0; i2 < cleanBase64.length; i2 += 4) {
          const encoded1 = base64Lookup.get(cleanBase64[i2]) || 0;
          const encoded2 = base64Lookup.get(cleanBase64[i2 + 1]) || 0;
          const encoded3 = base64Lookup.get(cleanBase64[i2 + 2]) || 0;
          const encoded4 = base64Lookup.get(cleanBase64[i2 + 3]) || 0;
          const byte1 = encoded1 << 2 | encoded2 >> 4;
          const byte2 = (encoded2 & 15) << 4 | encoded3 >> 2;
          const byte3 = (encoded3 & 3) << 6 | encoded4;
          bytes.push(byte1);
          if (cleanBase64[i2 + 2] !== "=") bytes.push(byte2);
          if (cleanBase64[i2 + 3] !== "=") bytes.push(byte3);
        }
        let result = "";
        let i = 0;
        while (i < bytes.length) {
          const byte1 = bytes[i++];
          if (byte1 < 128) {
            result += String.fromCharCode(byte1);
          } else if (byte1 >= 192 && byte1 < 224) {
            const byte2 = bytes[i++];
            result += String.fromCharCode((byte1 & 31) << 6 | byte2 & 63);
          } else if (byte1 >= 224 && byte1 < 240) {
            const byte2 = bytes[i++];
            const byte3 = bytes[i++];
            result += String.fromCharCode((byte1 & 15) << 12 | (byte2 & 63) << 6 | byte3 & 63);
          } else {
            i += 3;
          }
        }
        return result;
      } catch (error) {
        console.error("Error decoding base64:", error);
        console.error("Base64 content (first 100 chars):", base64.substring(0, 100));
        throw new Error(`Failed to decode file content from GitHub: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    parseRepoUrl(url) {
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        return null;
      }
      return {
        owner: match[1],
        repo: match[2].replace(".git", "")
      };
    }
  };

  // src/main.ts
  var variableManager = new VariableManager();
  var githubService = new GitHubService();
  figma.showUI(__html__, { width: UI_CONFIG.width, height: UI_CONFIG.height });
  figma.ui.onmessage = async (msg) => {
    try {
      switch (msg.type) {
        case "import-tokens":
          await handleImportTokens(msg);
          break;
        case "github-fetch-files":
          await handleGitHubFetchFiles(msg.data);
          break;
        case "github-import-files":
          await handleGitHubImportFiles(msg.data);
          break;
        case "load-github-config":
          await handleLoadGithubConfig();
          break;
        case "save-github-config":
          await handleSaveGithubConfig(msg.data);
          break;
        case "save-tokens":
          await handleSaveTokens(msg.data);
          break;
        case "load-tokens":
          await handleLoadTokens();
          break;
        case "get-figma-variables":
          await handleGetFigmaVariables();
          break;
        case "apply-variable-scopes":
          await handleApplyVariableScopes(msg.data);
          break;
        case "cancel":
          figma.closePlugin();
          break;
        default:
          console.warn("Unknown message type:", msg.type);
      }
    } catch (error) {
      console.error("Error in plugin:", error);
      figma.ui.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  };
  async function handleImportTokens(msg) {
    const { primitives, semantics } = msg.data;
    const stats = await variableManager.importTokens(primitives, semantics);
    figma.ui.postMessage({
      type: "import-success",
      message: `\u2713 Tokens imported: ${stats.added} added, ${stats.updated} updated, ${stats.skipped} skipped`
    });
  }
  async function handleGitHubFetchFiles(data) {
    try {
      const { token, owner, repo, branch } = data;
      const fileObjects = await githubService.fetchRepositoryFiles({ token, owner, repo, branch });
      const files = fileObjects.map((file) => file.path);
      figma.ui.postMessage({
        type: "github-files-fetched",
        data: { files }
      });
    } catch (error) {
      console.error("Error fetching GitHub files:", error);
      figma.ui.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to fetch repository files"
      });
    }
  }
  async function handleGitHubImportFiles(data) {
    try {
      console.log("handleGitHubImportFiles called with data:", data);
      const { token, owner, repo, branch, files } = data;
      console.log("Fetching files from GitHub:", { owner, repo, branch, fileCount: files.length });
      const { primitives, semantics } = await githubService.fetchMultipleFiles(
        { token, owner, repo, branch },
        files
      );
      console.log("Files fetched successfully, sending to preview screen...");
      figma.ui.postMessage({
        type: "github-files-imported",
        data: { primitives, semantics }
      });
    } catch (error) {
      console.error("Error in handleGitHubImportFiles:", error);
      figma.ui.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to import files from GitHub"
      });
    }
  }
  async function handleLoadGithubConfig() {
    try {
      const configString = await figma.clientStorage.getAsync("githubConfig");
      if (configString) {
        const config = JSON.parse(configString);
        figma.ui.postMessage({
          type: "github-config-loaded",
          data: config
        });
      }
    } catch (error) {
      console.error("Error loading GitHub config:", error);
    }
  }
  async function handleSaveGithubConfig(data) {
    try {
      await figma.clientStorage.setAsync("githubConfig", JSON.stringify(data));
      figma.notify("GitHub sync configuration saved!", { timeout: 3e3 });
    } catch (error) {
      console.error("Error saving GitHub config:", error);
      throw new Error("Failed to save GitHub configuration");
    }
  }
  async function handleSaveTokens(data) {
    try {
      await figma.clientStorage.setAsync("tokenState", JSON.stringify(data));
      console.log("Token state saved successfully");
    } catch (error) {
      console.error("Error saving token state:", error);
    }
  }
  async function handleLoadTokens() {
    try {
      const tokenStateString = await figma.clientStorage.getAsync("tokenState");
      if (tokenStateString) {
        const tokenState = JSON.parse(tokenStateString);
        figma.ui.postMessage({
          type: "tokens-loaded",
          data: tokenState
        });
        console.log("Token state loaded successfully");
      }
    } catch (error) {
      console.error("Error loading token state:", error);
    }
  }
  async function handleGetFigmaVariables() {
    try {
      console.log("Fetching all Figma variables...");
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const variables = {};
      for (const collection of collections) {
        console.log(`Processing collection: ${collection.name}`);
        const variablePromises = collection.variableIds.map(
          (id) => figma.variables.getVariableByIdAsync(id)
        );
        const collectionVariables = await Promise.all(variablePromises);
        for (const variable of collectionVariables) {
          if (variable) {
            variables[variable.name] = {
              id: variable.id,
              name: variable.name,
              scopes: variable.scopes,
              type: variable.resolvedType,
              collection: collection.name,
              collectionId: collection.id
            };
          }
        }
      }
      console.log(`Found ${Object.keys(variables).length} variables`);
      figma.ui.postMessage({
        type: "figma-variables-loaded",
        data: { variables }
      });
    } catch (error) {
      console.error("Error fetching Figma variables:", error);
      figma.ui.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to fetch Figma variables"
      });
    }
  }
  async function handleApplyVariableScopes(data) {
    try {
      console.log("Applying scopes to variables:", data);
      const { variableScopes } = data;
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      let updatedCount = 0;
      for (const collection of collections) {
        const variablePromises = collection.variableIds.map(
          (id) => figma.variables.getVariableByIdAsync(id)
        );
        const collectionVariables = await Promise.all(variablePromises);
        for (const variable of collectionVariables) {
          if (variable && variableScopes[variable.name] !== void 0) {
            const newScopes = variableScopes[variable.name];
            variable.scopes = newScopes;
            updatedCount++;
            console.log(`Updated scopes for ${variable.name}:`, newScopes);
          }
        }
      }
      figma.notify(`\u2713 Scopes updated for ${updatedCount} variable(s)`, { timeout: 3e3 });
      figma.ui.postMessage({
        type: "scopes-applied",
        message: `Scopes updated for ${updatedCount} variable(s)`
      });
    } catch (error) {
      console.error("Error applying variable scopes:", error);
      figma.ui.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to apply variable scopes"
      });
    }
  }
})();

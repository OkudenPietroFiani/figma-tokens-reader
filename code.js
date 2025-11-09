"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // src/shared/constants.ts
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
  var STORAGE_KEYS = {
    TOKEN_STATE: "tokenState",
    GITHUB_CONFIG: "githubConfig"
  };
  var SCOPE_CATEGORIES = {
    // Fill scopes
    fill: {
      label: "Fill",
      scopes: ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"]
    },
    // Stroke scopes
    stroke: {
      label: "Stroke",
      scopes: ["STROKE_COLOR"]
    },
    // Effect scopes
    effect: {
      label: "Effect",
      scopes: ["EFFECT_COLOR"]
    },
    // Size & spacing
    sizeSpacing: {
      label: "Size & Spacing",
      scopes: ["CORNER_RADIUS", "WIDTH_HEIGHT", "GAP"]
    },
    // Text content
    textContent: {
      label: "Text Content",
      scopes: ["TEXT_CONTENT"]
    },
    // Typography
    typography: {
      label: "Typography",
      scopes: [
        "FONT_FAMILY",
        "FONT_STYLE",
        "FONT_WEIGHT",
        "FONT_SIZE",
        "LINE_HEIGHT",
        "LETTER_SPACING",
        "PARAGRAPH_SPACING",
        "PARAGRAPH_INDENT"
      ]
    }
  };
  var ALL_SCOPES = Object.values(SCOPE_CATEGORIES).flatMap((category) => category.scopes);
  var ERROR_MESSAGES = {
    // GitHub errors
    GITHUB_INVALID_URL: "Invalid GitHub URL format",
    GITHUB_FETCH_FAILED: "Failed to fetch repository files",
    GITHUB_NO_TOKEN: "GitHub token is required for private repositories",
    // Import errors
    IMPORT_NO_FILES: "No valid token files found",
    IMPORT_PARSE_FAILED: "Failed to parse token file",
    IMPORT_NO_SELECTION: "Please select at least one file",
    // Token errors
    TOKEN_INVALID_FORMAT: "Invalid token format",
    TOKEN_SYNC_FAILED: "Failed to sync tokens to Figma",
    // Scope errors
    SCOPE_APPLY_FAILED: "Failed to apply scopes to variables",
    SCOPE_NO_VARIABLES: "No Figma variables found",
    // Storage errors
    STORAGE_SAVE_FAILED: "Failed to save data to storage",
    STORAGE_LOAD_FAILED: "Failed to load data from storage",
    // Generic
    UNKNOWN_ERROR: "An unknown error occurred"
  };
  var SUCCESS_MESSAGES = {
    IMPORT_SUCCESS: " Tokens imported successfully",
    SYNC_SUCCESS: " Tokens synced to Figma",
    SCOPE_APPLIED: " Scopes updated successfully",
    CONFIG_SAVED: " Configuration saved"
  };

  // src/shared/types.ts
  var Success = (data) => ({ success: true, data });
  var Failure = (error) => ({ success: false, error });

  // src/backend/utils/ErrorHandler.ts
  var ErrorHandler = class {
    /**
     * Wrap an async operation with error handling
     * Catches exceptions and converts to Result type
     *
     * @param operation - Async function to execute
     * @param context - Context description for logging
     * @returns Result<T> with success/failure
     */
    static async handle(operation, context) {
      try {
        console.log(`[${context}] Starting operation...`);
        const data = await operation();
        console.log(`[${context}]  Operation completed successfully`);
        return Success(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${context}]  Error:`, errorMessage);
        console.error(`[${context}] Stack trace:`, error instanceof Error ? error.stack : "N/A");
        return Failure(errorMessage);
      }
    }
    /**
     * Wrap a synchronous operation with error handling
     */
    static handleSync(operation, context) {
      try {
        console.log(`[${context}] Starting operation...`);
        const data = operation();
        console.log(`[${context}]  Operation completed successfully`);
        return Success(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${context}]  Error:`, errorMessage);
        return Failure(errorMessage);
      }
    }
    /**
     * Send error notification to UI
     * Does not throw - just notifies user
     */
    static notifyUser(message, type = "error") {
      try {
        if (type === "error") {
          console.error("[User Notification]", message);
          figma.notify(`L ${message}`, { error: true });
        } else if (type === "success") {
          console.log("[User Notification]", message);
          figma.notify(message, { timeout: 3e3 });
        } else {
          console.info("[User Notification]", message);
          figma.notify(message, { timeout: 3e3 });
        }
        figma.ui.postMessage({
          type: type === "error" ? "error" : "info",
          message
        });
      } catch (err) {
        console.error("[ErrorHandler] Failed to send notification:", err);
      }
    }
    /**
     * Get user-friendly error message from error code
     */
    static getErrorMessage(errorCode) {
      return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
    }
    /**
     * Validate required fields
     * Throws error if validation fails (fail-fast principle)
     */
    static validateRequired(data, requiredFields, context) {
      const missingFields = requiredFields.filter((field) => {
        const value = data[field];
        return value === void 0 || value === null || value === "";
      });
      if (missingFields.length > 0) {
        const error = `Missing required fields: ${missingFields.join(", ")}`;
        console.error(`[${context}] Validation failed:`, error);
        throw new Error(error);
      }
    }
    /**
     * Assert condition is true
     * Throws error if condition is false (fail-fast principle)
     */
    static assert(condition, message, context) {
      if (!condition) {
        console.error(`[${context}] Assertion failed:`, message);
        throw new Error(message);
      }
    }
    /**
     * Log warning without throwing
     */
    static warn(message, context) {
      console.warn(`[${context}] Warning:`, message);
    }
    /**
     * Log info message
     */
    static info(message, context) {
      console.log(`[${context}]`, message);
    }
    /**
     * Format error for display
     * Extracts meaningful message from various error types
     */
    static formatError(error) {
      if (error instanceof Error) {
        return error.message;
      }
      if (typeof error === "string") {
        return error;
      }
      if (typeof error === "object" && error !== null) {
        const errorObj = error;
        if (errorObj.message) return String(errorObj.message);
        if (errorObj.error) return String(errorObj.error);
        try {
          return JSON.stringify(error);
        } catch (e) {
          return String(error);
        }
      }
      return ERROR_MESSAGES.UNKNOWN_ERROR;
    }
    /**
     * Create a Result from a thrown error
     * Useful in catch blocks
     */
    static fromError(error, context) {
      const message = this.formatError(error);
      if (context) {
        console.error(`[${context}] Error:`, message);
      }
      return Failure(message);
    }
    /**
     * Retry an operation with exponential backoff
     * Useful for network operations
     */
    static async retry(operation, maxRetries = 3, context = "Retry Operation") {
      let lastError;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[${context}] Attempt ${attempt}/${maxRetries}...`);
          const result = await operation();
          console.log(`[${context}]  Success on attempt ${attempt}`);
          return Success(result);
        } catch (error) {
          lastError = error;
          const message = this.formatError(error);
          console.warn(`[${context}] Attempt ${attempt}/${maxRetries} failed:`, message);
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1e3;
            console.log(`[${context}] Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
          }
        }
      }
      const errorMessage = this.formatError(lastError);
      console.error(`[${context}] All ${maxRetries} attempts failed. Last error:`, errorMessage);
      return Failure(`Operation failed after ${maxRetries} attempts: ${errorMessage}`);
    }
    /**
     * Helper: Sleep for specified milliseconds
     */
    static sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  };

  // src/utils/parser.ts
  function parseColor(value) {
    if (typeof value === "object" && value !== null && "colorSpace" in value && "components" in value) {
      const { colorSpace, components, alpha } = value;
      const alphaValue = typeof alpha === "number" ? alpha : 1;
      if (colorSpace === "hsl" && Array.isArray(components) && components.length === 3) {
        const h = components[0] / 360;
        const s = components[1] / 100;
        const l = components[2] / 100;
        const rgb = hslToRgb(h, s, l);
        return __spreadProps(__spreadValues({}, rgb), { a: alphaValue });
      }
      if (colorSpace === "rgb" && Array.isArray(components) && components.length === 3) {
        return {
          r: components[0] / 255,
          g: components[1] / 255,
          b: components[2] / 255,
          a: alphaValue
        };
      }
      if (value.hex) {
        const rgb = hexToRgb(value.hex);
        return __spreadProps(__spreadValues({}, rgb), { a: alphaValue });
      }
    }
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
    return { r: 0, g: 0, b: 0, a: 1 };
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
    if (cleaned.length === 8) {
      const bigint = parseInt(cleaned.substring(0, 6), 16);
      const alpha = parseInt(cleaned.substring(6, 8), 16) / 255;
      return {
        r: (bigint >> 16 & 255) / 255,
        g: (bigint >> 8 & 255) / 255,
        b: (bigint & 255) / 255,
        a: alpha
      };
    } else if (cleaned.length === 4) {
      const r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
      const g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
      const b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
      const a = parseInt(cleaned[3] + cleaned[3], 16) / 255;
      return { r, g, b, a };
    } else if (cleaned.length === 6) {
      const bigint = parseInt(cleaned, 16);
      return {
        r: (bigint >> 16 & 255) / 255,
        g: (bigint >> 8 & 255) / 255,
        b: (bigint & 255) / 255,
        a: 1
        // Full opacity by default
      };
    } else if (cleaned.length === 3) {
      const r = parseInt(cleaned[0] + cleaned[0], 16) / 255;
      const g = parseInt(cleaned[1] + cleaned[1], 16) / 255;
      const b = parseInt(cleaned[2] + cleaned[2], 16) / 255;
      return { r, g, b, a: 1 };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  function rgbStringToRgb(rgbString) {
    const rgbaMatch = rgbString.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1]) / 255;
      const g = parseInt(rgbaMatch[2]) / 255;
      const b = parseInt(rgbaMatch[3]) / 255;
      const a = rgbaMatch[4] !== void 0 ? parseFloat(rgbaMatch[4]) : 1;
      return { r, g, b, a };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  function hslStringToRgb(hslString) {
    const match = hslString.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([\d.]+)\s*)?\)/);
    if (match) {
      const h = parseInt(match[1]) / 360;
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;
      const a = match[4] !== void 0 ? parseFloat(match[4]) : 1;
      const rgb = hslToRgb(h, s, l);
      return __spreadProps(__spreadValues({}, rgb), { a });
    }
    return { r: 0, g: 0, b: 0, a: 1 };
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
        if (typeof value === "object" && value !== null && "alpha" in value) {
          const alphaValue = value.alpha;
          if (typeof alphaValue === "string" && alphaValue.includes("{") && alphaValue.includes("}")) {
            const alphaRef = extractReference(alphaValue);
            if (alphaRef) {
              const alphaVariable = resolveReference(alphaRef, variableMap);
              if (alphaVariable) {
                const modeId = Object.keys(alphaVariable.valuesByMode)[0];
                const resolvedAlpha = alphaVariable.valuesByMode[modeId];
                const resolvedValue = __spreadProps(__spreadValues({}, value), {
                  alpha: typeof resolvedAlpha === "number" ? resolvedAlpha : 1
                });
                return { value: parseColor(resolvedValue), isAlias: false };
              }
            }
            console.error(`[ALPHA FAILED] Cannot resolve: ${alphaValue}`);
            return { value: parseColor(__spreadProps(__spreadValues({}, value), { alpha: 1 })), isAlias: false };
          }
        }
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
    const cleanRef = reference.replace(/^(primitive|semantic)\./, "");
    let variable = variableMap.get(cleanRef);
    if (variable) return variable;
    const slashRef = cleanRef.replace(/\./g, "/");
    variable = variableMap.get(slashRef);
    if (variable) return variable;
    const parts = cleanRef.split(".");
    if (parts.length >= 2) {
      for (let i = parts.length - 1; i >= 1; i--) {
        const pathPart = parts.slice(0, i).join("/");
        const namePart = parts.slice(i).join("-");
        const dottedRef = pathPart ? `${pathPart}/${namePart}` : namePart;
        variable = variableMap.get(dottedRef);
        if (variable) return variable;
      }
    }
    for (const [key, val] of variableMap.entries()) {
      if (key.endsWith(cleanRef) || key.includes(cleanRef)) {
        return val;
      }
    }
    console.error(`[RESOLVE FAILED] Cannot find variable: "${reference}"`);
    console.error(`  Tried: ${cleanRef}, ${slashRef}, and ${parts.length - 1} dotted variations`);
    console.error(`  Map has ${variableMap.size} variables`);
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
      await this.processTokenGroup(tokens, pathPrefix, "text");
      if (this.styleStats.created > 0 || this.styleStats.updated > 0) {
        figma.notify(
          `\u2713 Text styles: ${this.styleStats.created} created, ${this.styleStats.updated} updated`,
          { timeout: 3e3 }
        );
      }
      return this.styleStats;
    }
    /**
     * Process tokens and create effect styles for drop shadow tokens
     */
    async createEffectStyles(tokens, pathPrefix = []) {
      console.log("\n=== CREATING EFFECT STYLES ===");
      this.styleStats = { created: 0, updated: 0, skipped: 0 };
      await this.processTokenGroup(tokens, pathPrefix, "effect");
      if (this.styleStats.created > 0 || this.styleStats.updated > 0) {
        figma.notify(
          `\u2713 Effect styles: ${this.styleStats.created} created, ${this.styleStats.updated} updated`,
          { timeout: 3e3 }
        );
      }
      return this.styleStats;
    }
    /**
     * Recursively process token groups to find typography or effect tokens
     */
    async processTokenGroup(tokens, pathPrefix, styleType) {
      for (const [key, value] of Object.entries(tokens)) {
        const currentPath = [...pathPrefix, key];
        if (value && typeof value === "object") {
          if (styleType === "text") {
            if (this.isTypographyToken(value)) {
              await this.createTextStyle(value, currentPath);
            } else if (!("$value" in value)) {
              await this.processTokenGroup(value, currentPath, styleType);
            }
          } else if (styleType === "effect") {
            if (this.isShadowToken(value)) {
              await this.createEffectStyle(value, currentPath);
            } else if (!("$value" in value)) {
              await this.processTokenGroup(value, currentPath, styleType);
            }
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
     * Check if token is a shadow token (boxShadow or dropShadow)
     */
    isShadowToken(token) {
      return (token.$type === "boxShadow" || token.$type === "shadow") && token.$value && (typeof token.$value === "object" || Array.isArray(token.$value));
    }
    /**
     * Remove collection and category prefixes from style path
     * Example: ['semantic', 'typography', 'display'] -> ['display']
     * Removes first level (primitive/semantic) AND second level (typography/effect/etc)
     */
    cleanStylePath(path) {
      if (path.length === 0) return path;
      const firstLevel = path[0].toLowerCase();
      const secondLevel = path.length > 1 ? path[1].toLowerCase() : "";
      if (firstLevel === "primitive" || firstLevel === "semantic") {
        if (secondLevel === "typography" || secondLevel === "effect" || secondLevel === "shadow" || secondLevel === "boxshadow" || secondLevel === "dropshadow") {
          return path.slice(2);
        }
        return path.slice(1);
      }
      return path;
    }
    /**
     * Create or update Figma text style from typography token
     * Clean code: Single purpose, clear error handling
     */
    async createTextStyle(token, path) {
      try {
        const cleanedPath = this.cleanStylePath(path);
        const styleName = cleanedPath.join("/");
        const typography = token.$value;
        const existingStyles = await figma.getLocalTextStylesAsync();
        let textStyle = existingStyles.find((s) => s.name === styleName);
        if (!textStyle) {
          textStyle = figma.createTextStyle();
          textStyle.name = styleName;
          this.styleStats.created++;
        } else {
          this.styleStats.updated++;
        }
        if (token.$description) {
          textStyle.description = token.$description;
        }
        await this.applyTypographyProperties(textStyle, typography);
      } catch (error) {
        console.error(`[TEXT STYLE ERROR] ${path.join("/")}: ${error}`);
        this.styleStats.skipped++;
      }
    }
    /**
     * Create or update Figma effect style from shadow token
     */
    async createEffectStyle(token, path) {
      try {
        const cleanedPath = this.cleanStylePath(path);
        const styleName = cleanedPath.join("/");
        const existingStyles = await figma.getLocalEffectStylesAsync();
        let effectStyle = existingStyles.find((s) => s.name === styleName);
        if (!effectStyle) {
          effectStyle = figma.createEffectStyle();
          effectStyle.name = styleName;
          this.styleStats.created++;
        } else {
          this.styleStats.updated++;
        }
        if (token.$description) {
          effectStyle.description = token.$description;
        }
        await this.applyShadowEffects(effectStyle, token.$value);
      } catch (error) {
        console.error(`[EFFECT STYLE ERROR] ${path.join("/")}: ${error}`);
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
    /**
     * Apply shadow effects to effect style
     * Handles both single shadow and array of shadows
     */
    async applyShadowEffects(effectStyle, value) {
      const effects = [];
      if (Array.isArray(value)) {
        for (const shadow of value) {
          const effect = this.parseShadowEffect(shadow);
          if (effect) {
            effects.push(effect);
          }
        }
      } else if (typeof value === "object" && value !== null) {
        const effect = this.parseShadowEffect(value);
        if (effect) {
          effects.push(effect);
        }
      }
      if (effects.length > 0) {
        effectStyle.effects = effects;
      } else {
        console.error(`[SHADOW] No valid effects parsed for shadow token`);
      }
    }
    /**
     * Parse a single shadow object into a Figma Effect
     * Format: { x, y, blur, spread, color, type }
     */
    parseShadowEffect(shadow) {
      try {
        const x = this.resolveNumericValue(shadow.x || shadow.offsetX || 0);
        const y = this.resolveNumericValue(shadow.y || shadow.offsetY || 0);
        const blur = this.resolveNumericValue(shadow.blur || shadow.blurRadius || 0);
        const spread = this.resolveNumericValue(shadow.spread || shadow.spreadRadius || 0);
        const colorValue = shadow.color || "#000000";
        const color = this.parseColorValue(colorValue);
        const type = shadow.type === "innerShadow" ? "INNER_SHADOW" : "DROP_SHADOW";
        const effect = {
          type,
          color,
          offset: { x: x || 0, y: y || 0 },
          radius: blur || 0,
          spread: spread || 0,
          visible: true,
          blendMode: "NORMAL"
        };
        return effect;
      } catch (error) {
        console.error(`[SHADOW PARSE ERROR]`, error);
        return null;
      }
    }
    /**
     * Parse color value to RGBA format
     * Handles hex, rgb/rgba strings, and references
     */
    parseColorValue(value) {
      if (typeof value === "string" && value.includes("{") && value.includes("}")) {
        const resolved = this.resolveTokenReference(value);
        if (resolved) {
          value = resolved;
        }
      }
      if (typeof value === "string" && value.startsWith("#")) {
        return this.hexToRgba(value);
      }
      if (typeof value === "string" && (value.startsWith("rgb") || value.startsWith("hsl"))) {
        const rgbaMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
          return {
            r: parseInt(rgbaMatch[1]) / 255,
            g: parseInt(rgbaMatch[2]) / 255,
            b: parseInt(rgbaMatch[3]) / 255,
            a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
          };
        }
      }
      return { r: 0, g: 0, b: 0, a: 1 };
    }
    /**
     * Convert hex color to RGBA
     * Supports #RGB, #RRGGBB, #RGBA, #RRGGBBAA
     */
    hexToRgba(hex) {
      const cleaned = hex.replace("#", "");
      if (cleaned.length === 8) {
        const bigint = parseInt(cleaned.substring(0, 6), 16);
        const alpha = parseInt(cleaned.substring(6, 8), 16) / 255;
        return {
          r: (bigint >> 16 & 255) / 255,
          g: (bigint >> 8 & 255) / 255,
          b: (bigint & 255) / 255,
          a: alpha
        };
      }
      if (cleaned.length === 6) {
        const bigint = parseInt(cleaned, 16);
        return {
          r: (bigint >> 16 & 255) / 255,
          g: (bigint >> 8 & 255) / 255,
          b: (bigint & 255) / 255,
          a: 1
        };
      }
      if (cleaned.length === 4) {
        return {
          r: parseInt(cleaned[0] + cleaned[0], 16) / 255,
          g: parseInt(cleaned[1] + cleaned[1], 16) / 255,
          b: parseInt(cleaned[2] + cleaned[2], 16) / 255,
          a: parseInt(cleaned[3] + cleaned[3], 16) / 255
        };
      }
      if (cleaned.length === 3) {
        return {
          r: parseInt(cleaned[0] + cleaned[0], 16) / 255,
          g: parseInt(cleaned[1] + cleaned[1], 16) / 255,
          b: parseInt(cleaned[2] + cleaned[2], 16) / 255,
          a: 1
        };
      }
      return { r: 0, g: 0, b: 0, a: 1 };
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
          await styleManager.createEffectStyles(cleanedPrimitives, [COLLECTION_NAMES.primitive]);
        }
        if (semantics) {
          const cleanedSemantics = this.prepareAndValidateTokens(semantics, "semantic");
          await styleManager.createTextStyles(cleanedSemantics, [COLLECTION_NAMES.semantic]);
          await styleManager.createEffectStyles(cleanedSemantics, [COLLECTION_NAMES.semantic]);
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
      const isFileKeyed = this.isFileKeyedStructure(data);
      let processed;
      if (isFileKeyed) {
        processed = this.processMultipleFiles(data, collectionType);
      } else {
        processed = this.removeAllCollectionWrappers(data, collectionType);
      }
      this.validateNoCollectionWrappers(processed, collectionType);
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
      const cleanedFiles = [];
      for (const [fileName, fileContent] of Object.entries(filesData)) {
        if (!fileContent || typeof fileContent !== "object") continue;
        const cleaned = this.removeAllCollectionWrappers(fileContent, collectionType);
        cleanedFiles.push(cleaned);
      }
      return this.deepMergeAll(cleanedFiles);
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
              if (keys.length === 1) {
                current = value;
                didUnwrap = true;
                break;
              } else {
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
        if (!didUnwrap) break;
        iterations++;
      }
      if (iterations >= maxIterations) {
        console.error(`[UNWRAP] Max iterations reached - circular structure in ${collectionType}`);
      }
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
            throw new Error(`Validation failed: Collection wrapper '${key}' still exists in ${collectionType} data`);
          }
        }
      }
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
            if (this.isCompositeTypographyToken(value)) continue;
            if (this.isShadowToken(value)) continue;
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
    /**
     * Check if token is a shadow token (boxShadow or shadow)
     * These will be created as effect styles instead of variables
     */
    isShadowToken(token) {
      return (token.$type === "boxShadow" || token.$type === "shadow") && token.$value && (typeof token.$value === "object" || Array.isArray(token.$value));
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
      } catch (error) {
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

  // src/backend/services/StorageService.ts
  var StorageService = class {
    /**
     * Save token state to storage
     * Preserves user's current token files and source
     */
    async saveTokenState(state) {
      return ErrorHandler.handle(async () => {
        const serialized = JSON.stringify(state);
        await figma.clientStorage.setAsync(STORAGE_KEYS.TOKEN_STATE, serialized);
        ErrorHandler.info(`Token state saved (${Object.keys(state.tokenFiles).length} files)`, "StorageService");
      }, "Save Token State");
    }
    /**
     * Load token state from storage
     * Returns null if no state exists
     */
    async getTokenState() {
      return ErrorHandler.handle(async () => {
        const serialized = await figma.clientStorage.getAsync(STORAGE_KEYS.TOKEN_STATE);
        if (!serialized) {
          ErrorHandler.info("No token state found in storage", "StorageService");
          return null;
        }
        const state = JSON.parse(serialized);
        ErrorHandler.info(`Token state loaded (${Object.keys(state.tokenFiles).length} files)`, "StorageService");
        return state;
      }, "Load Token State");
    }
    /**
     * Clear token state from storage
     */
    async clearTokenState() {
      return ErrorHandler.handle(async () => {
        await figma.clientStorage.deleteAsync(STORAGE_KEYS.TOKEN_STATE);
        ErrorHandler.info("Token state cleared", "StorageService");
      }, "Clear Token State");
    }
    /**
     * Save GitHub configuration to storage
     * Allows resuming GitHub sync without re-entering credentials
     *
     * SECURITY WARNING: GitHub Personal Access Tokens are stored in plain text
     * in Figma's clientStorage. This is a known limitation. Users should:
     * - Use tokens with minimal required scopes (read-only repository access)
     * - Be aware tokens persist until explicitly cleared
     * - Consider using the "Clear Credentials" feature when done
     */
    async saveGitHubConfig(config) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.validateRequired(
          config,
          ["owner", "repo", "branch"],
          "Save GitHub Config"
        );
        const serialized = JSON.stringify(config);
        await figma.clientStorage.setAsync(STORAGE_KEYS.GITHUB_CONFIG, serialized);
        ErrorHandler.info(`GitHub config saved (${config.owner}/${config.repo}@${config.branch})`, "StorageService");
      }, "Save GitHub Config");
    }
    /**
     * Load GitHub configuration from storage
     * Returns null if no config exists
     *
     * SECURITY NOTE: Retrieved tokens are in plain text and should be handled
     * securely. Do not log or expose tokens in error messages.
     */
    async getGitHubConfig() {
      return ErrorHandler.handle(async () => {
        const serialized = await figma.clientStorage.getAsync(STORAGE_KEYS.GITHUB_CONFIG);
        if (!serialized) {
          ErrorHandler.info("No GitHub config found in storage", "StorageService");
          return null;
        }
        const config = JSON.parse(serialized);
        ErrorHandler.info(`GitHub config loaded (${config.owner}/${config.repo}@${config.branch})`, "StorageService");
        return config;
      }, "Load GitHub Config");
    }
    /**
     * Clear GitHub configuration from storage
     */
    async clearGitHubConfig() {
      return ErrorHandler.handle(async () => {
        await figma.clientStorage.deleteAsync(STORAGE_KEYS.GITHUB_CONFIG);
        ErrorHandler.info("GitHub config cleared", "StorageService");
      }, "Clear GitHub Config");
    }
    /**
     * Clear all storage data
     * Useful for plugin reset or debugging
     */
    async clearAll() {
      return ErrorHandler.handle(async () => {
        await figma.clientStorage.deleteAsync(STORAGE_KEYS.TOKEN_STATE);
        await figma.clientStorage.deleteAsync(STORAGE_KEYS.GITHUB_CONFIG);
        ErrorHandler.info("All storage cleared", "StorageService");
      }, "Clear All Storage");
    }
    /**
     * Get storage usage statistics
     * Useful for debugging
     */
    async getStorageStats() {
      return ErrorHandler.handle(async () => {
        const tokenState = await figma.clientStorage.getAsync(STORAGE_KEYS.TOKEN_STATE);
        const githubConfig = await figma.clientStorage.getAsync(STORAGE_KEYS.GITHUB_CONFIG);
        const stats = {
          tokenStateSize: tokenState ? tokenState.length : 0,
          githubConfigSize: githubConfig ? githubConfig.length : 0
        };
        ErrorHandler.info(`Storage stats: tokenState=${stats.tokenStateSize} bytes, githubConfig=${stats.githubConfigSize} bytes`, "StorageService");
        return stats;
      }, "Get Storage Stats");
    }
  };

  // src/backend/controllers/TokenController.ts
  var TokenController = class {
    constructor(variableManager, storage) {
      this.variableManager = variableManager;
      this.storage = storage;
    }
    /**
     * Import tokens to Figma variables
     * Creates/updates variables and text styles
     *
     * @param data - Token import data with primitives and semantics
     * @returns Import statistics
     */
    async importTokens(data) {
      return ErrorHandler.handle(async () => {
        const { primitives, semantics } = data;
        if (!primitives && !semantics) {
          throw new Error("No token data provided. Expected primitives or semantics.");
        }
        ErrorHandler.info(
          `Importing tokens (primitives: ${primitives ? "yes" : "no"}, semantics: ${semantics ? "yes" : "no"})`,
          "TokenController"
        );
        const stats = await this.variableManager.importTokens(
          primitives || {},
          semantics || {}
        );
        ErrorHandler.info(
          `Import completed: ${stats.added} added, ${stats.updated} updated, ${stats.skipped} skipped`,
          "TokenController"
        );
        ErrorHandler.notifyUser(
          `${SUCCESS_MESSAGES.IMPORT_SUCCESS}: ${stats.added} added, ${stats.updated} updated`,
          "success"
        );
        return stats;
      }, "Import Tokens");
    }
    /**
     * Save token state to persistent storage
     * Allows resuming work without re-importing
     *
     * @param state - Token state to save
     */
    async saveTokens(state) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.validateRequired(
          state,
          ["tokenFiles"],
          "Save Tokens"
        );
        const result = await this.storage.saveTokenState(state);
        if (!result.success) {
          throw new Error(result.error || "Failed to save token state");
        }
        ErrorHandler.info("Token state saved successfully", "TokenController");
      }, "Save Token State");
    }
    /**
     * Load token state from persistent storage
     * Restores previously imported tokens
     *
     * @returns Token state or null if not found
     */
    async loadTokens() {
      return ErrorHandler.handle(async () => {
        const result = await this.storage.getTokenState();
        if (!result.success) {
          throw new Error(result.error || "Failed to load token state");
        }
        if (!result.data) {
          ErrorHandler.info("No saved token state found", "TokenController");
          return null;
        }
        ErrorHandler.info(
          `Token state loaded: ${Object.keys(result.data.tokenFiles).length} files`,
          "TokenController"
        );
        return result.data;
      }, "Load Token State");
    }
    /**
     * Clear all saved token state
     * Useful for plugin reset
     */
    async clearTokens() {
      return ErrorHandler.handle(async () => {
        const result = await this.storage.clearTokenState();
        if (!result.success) {
          throw new Error(result.error || "Failed to clear token state");
        }
        ErrorHandler.info("Token state cleared", "TokenController");
        ErrorHandler.notifyUser("Token state cleared", "success");
      }, "Clear Token State");
    }
    /**
     * Get token metadata from last import
     * Useful for debugging and UI display
     */
    getTokenMetadata() {
      return this.variableManager.getTokenMetadata();
    }
  };

  // src/backend/controllers/GitHubController.ts
  var GitHubController = class {
    constructor(githubService, storage) {
      this.githubService = githubService;
      this.storage = storage;
    }
    /**
     * Fetch list of files from GitHub repository
     * Returns only .json files suitable for token import
     *
     * @param config - GitHub repository configuration
     * @returns Array of file paths
     */
    async fetchFiles(config) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.validateRequired(
          config,
          ["owner", "repo", "branch"],
          "Fetch GitHub Files"
        );
        ErrorHandler.info(
          `Fetching files from ${config.owner}/${config.repo}@${config.branch}`,
          "GitHubController"
        );
        const fileObjects = await this.githubService.fetchRepositoryFiles(config);
        const filePaths = fileObjects.map((file) => file.path);
        ErrorHandler.info(
          `Found ${filePaths.length} JSON files in repository`,
          "GitHubController"
        );
        return filePaths;
      }, "Fetch GitHub Files");
    }
    /**
     * Import multiple token files from GitHub
     * Fetches and parses selected files
     *
     * @param config - GitHub configuration with selected files
     * @returns Token data organized by primitives/semantics
     */
    async importFiles(config) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.validateRequired(
          config,
          ["owner", "repo", "branch", "files"],
          "Import GitHub Files"
        );
        ErrorHandler.assert(
          config.files && config.files.length > 0,
          "No files selected for import",
          "Import GitHub Files"
        );
        ErrorHandler.info(
          `Importing ${config.files.length} files from ${config.owner}/${config.repo}@${config.branch}`,
          "GitHubController"
        );
        const result = await this.githubService.fetchMultipleFiles(
          config,
          config.files
        );
        ErrorHandler.info(
          `Files imported successfully (primitives: ${result.primitives ? "yes" : "no"}, semantics: ${result.semantics ? "yes" : "no"})`,
          "GitHubController"
        );
        return result;
      }, "Import GitHub Files");
    }
    /**
     * Save GitHub configuration to storage
     * Allows resuming GitHub sync without re-entering credentials
     *
     * @param config - GitHub configuration to save
     */
    async saveConfig(config) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.validateRequired(
          config,
          ["owner", "repo", "branch"],
          "Save GitHub Config"
        );
        const result = await this.storage.saveGitHubConfig(config);
        if (!result.success) {
          throw new Error(result.error || "Failed to save GitHub configuration");
        }
        ErrorHandler.info("GitHub configuration saved", "GitHubController");
        ErrorHandler.notifyUser(SUCCESS_MESSAGES.CONFIG_SAVED, "success");
      }, "Save GitHub Config");
    }
    /**
     * Load GitHub configuration from storage
     * Restores previously saved credentials and repo info
     *
     * @returns GitHub config or null if not found
     */
    async loadConfig() {
      return ErrorHandler.handle(async () => {
        const result = await this.storage.getGitHubConfig();
        if (!result.success) {
          throw new Error(result.error || "Failed to load GitHub configuration");
        }
        if (!result.data) {
          ErrorHandler.info("No saved GitHub config found", "GitHubController");
          return null;
        }
        ErrorHandler.info(
          `GitHub config loaded: ${result.data.owner}/${result.data.repo}@${result.data.branch}`,
          "GitHubController"
        );
        return result.data;
      }, "Load GitHub Config");
    }
    /**
     * Clear saved GitHub configuration
     * Useful for disconnecting from repository
     */
    async clearConfig() {
      return ErrorHandler.handle(async () => {
        const result = await this.storage.clearGitHubConfig();
        if (!result.success) {
          throw new Error(result.error || "Failed to clear GitHub configuration");
        }
        ErrorHandler.info("GitHub configuration cleared", "GitHubController");
        ErrorHandler.notifyUser("GitHub configuration cleared", "success");
      }, "Clear GitHub Config");
    }
    /**
     * Validate GitHub configuration
     * Tests connection to repository without fetching files
     *
     * @param config - GitHub configuration to validate
     * @returns True if valid, false otherwise
     */
    async validateConfig(config) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.validateRequired(
          config,
          ["owner", "repo", "branch"],
          "Validate GitHub Config"
        );
        try {
          await this.githubService.fetchRepositoryFiles(config);
          ErrorHandler.info("GitHub configuration is valid", "GitHubController");
          return true;
        } catch (error) {
          ErrorHandler.warn(
            `GitHub configuration validation failed: ${ErrorHandler.formatError(error)}`,
            "GitHubController"
          );
          return false;
        }
      }, "Validate GitHub Config");
    }
  };

  // src/backend/controllers/ScopeController.ts
  var ScopeController = class {
    /**
     * Get all Figma variables with their current scopes
     * Useful for UI display and scope management
     *
     * @returns Map of variable names to variable data
     */
    async getFigmaVariables() {
      return ErrorHandler.handle(async () => {
        ErrorHandler.info("Fetching all Figma variables...", "ScopeController");
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        console.log("[ScopeController] Found collections:", collections.length);
        console.log("[ScopeController] Collection details:", collections.map((c) => ({
          name: c.name,
          id: c.id,
          variableCount: c.variableIds.length
        })));
        const variables = {};
        for (const collection of collections) {
          ErrorHandler.info(`Processing collection: ${collection.name}`, "ScopeController");
          console.log(`[ScopeController] Collection "${collection.name}" has ${collection.variableIds.length} variables`);
          const variablePromises = collection.variableIds.map(
            (id) => figma.variables.getVariableByIdAsync(id)
          );
          const collectionVariables = await Promise.all(variablePromises);
          console.log(`[ScopeController] Loaded ${collectionVariables.length} variables for collection "${collection.name}"`);
          for (const variable of collectionVariables) {
            if (variable) {
              console.log(`[ScopeController] Variable: ${variable.name}, type: ${variable.resolvedType}, scopes: ${variable.scopes.length}`);
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
        const count = Object.keys(variables).length;
        console.log("[ScopeController] Total variables collected:", count);
        console.log("[ScopeController] Variable names:", Object.keys(variables));
        ErrorHandler.info(`Found ${count} variables across ${collections.length} collections`, "ScopeController");
        if (count === 0) {
          ErrorHandler.warn("No Figma variables found. Import tokens first.", "ScopeController");
        }
        return variables;
      }, "Get Figma Variables");
    }
    /**
     * Apply scope assignments to variables
     * Updates the scopes property of selected variables
     *
     * @param scopeAssignments - Map of variable names to scope arrays
     * @returns Number of variables updated
     */
    async applyScopes(scopeAssignments) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.assert(
          scopeAssignments && Object.keys(scopeAssignments).length > 0,
          "No scope assignments provided",
          "Apply Scopes"
        );
        const variableNames = Object.keys(scopeAssignments);
        ErrorHandler.info(
          `Applying scopes to ${variableNames.length} variable(s)`,
          "ScopeController"
        );
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        let updatedCount = 0;
        for (const collection of collections) {
          const variablePromises = collection.variableIds.map(
            (id) => figma.variables.getVariableByIdAsync(id)
          );
          const collectionVariables = await Promise.all(variablePromises);
          for (const variable of collectionVariables) {
            if (variable && scopeAssignments[variable.name] !== void 0) {
              const newScopes = scopeAssignments[variable.name];
              this.validateScopes(newScopes, variable.name);
              variable.scopes = newScopes;
              updatedCount++;
              ErrorHandler.info(
                `Updated scopes for ${variable.name}: ${newScopes.join(", ")}`,
                "ScopeController"
              );
            }
          }
        }
        ErrorHandler.info(`Scopes updated for ${updatedCount} variable(s)`, "ScopeController");
        if (updatedCount === 0) {
          ErrorHandler.warn("No variables were updated. Check variable names.", "ScopeController");
        }
        ErrorHandler.notifyUser(
          `${SUCCESS_MESSAGES.SCOPE_APPLIED}: ${updatedCount} variable(s)`,
          "success"
        );
        return updatedCount;
      }, "Apply Scopes");
    }
    /**
     * Get variable by name across all collections
     * Useful for finding a specific variable
     *
     * @param variableName - Name of the variable to find
     * @returns Variable or null if not found
     */
    async getVariableByName(variableName) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.info(`Searching for variable: ${variableName}`, "ScopeController");
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        for (const collection of collections) {
          const variablePromises = collection.variableIds.map(
            (id) => figma.variables.getVariableByIdAsync(id)
          );
          const collectionVariables = await Promise.all(variablePromises);
          const variable = collectionVariables.find((v) => v && v.name === variableName);
          if (variable) {
            ErrorHandler.info(`Found variable: ${variableName}`, "ScopeController");
            return variable;
          }
        }
        ErrorHandler.info(`Variable not found: ${variableName}`, "ScopeController");
        return null;
      }, "Get Variable By Name");
    }
    /**
     * Get variables by collection name
     * Useful for filtering variables
     *
     * @param collectionName - Name of the collection
     * @returns Array of variables in the collection
     */
    async getVariablesByCollection(collectionName) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.info(`Fetching variables from collection: ${collectionName}`, "ScopeController");
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        const targetCollection = collections.find((c) => c.name === collectionName);
        if (!targetCollection) {
          ErrorHandler.warn(`Collection not found: ${collectionName}`, "ScopeController");
          return [];
        }
        const variablePromises = targetCollection.variableIds.map(
          (id) => figma.variables.getVariableByIdAsync(id)
        );
        const variables = await Promise.all(variablePromises);
        const validVariables = variables.filter((v) => v !== null);
        ErrorHandler.info(
          `Found ${validVariables.length} variables in collection: ${collectionName}`,
          "ScopeController"
        );
        return validVariables;
      }, "Get Variables By Collection");
    }
    /**
     * Validate scope array
     * Ensures scopes are valid Figma VariableScope values
     *
     * @param scopes - Array of scope strings
     * @param variableName - Variable name for error messages
     */
    validateScopes(scopes, variableName) {
      ErrorHandler.assert(
        Array.isArray(scopes),
        `Scopes for ${variableName} must be an array`,
        "Validate Scopes"
      );
    }
    /**
     * Reset all scopes for a variable (set to empty)
     * Useful for clearing scope assignments
     *
     * @param variableName - Name of the variable to reset
     */
    async resetScopes(variableName) {
      return ErrorHandler.handle(async () => {
        const result = await this.getVariableByName(variableName);
        if (!result.success) {
          throw new Error(result.error || "Failed to find variable");
        }
        if (!result.data) {
          throw new Error(`Variable not found: ${variableName}`);
        }
        const variable = result.data;
        variable.scopes = [];
        ErrorHandler.info(`Scopes reset for ${variableName}`, "ScopeController");
        ErrorHandler.notifyUser(`Scopes reset for ${variableName}`, "success");
      }, "Reset Scopes");
    }
    /**
     * Get scope statistics
     * Useful for debugging and UI display
     *
     * @returns Statistics about scope usage
     */
    async getScopeStats() {
      return ErrorHandler.handle(async () => {
        const result = await this.getFigmaVariables();
        if (!result.success) {
          throw new Error(result.error || "Failed to fetch variables");
        }
        const variables = Object.values(result.data);
        const totalVariables = variables.length;
        const variablesWithScopes = variables.filter((v) => v.scopes.length > 0).length;
        const variablesWithoutScopes = totalVariables - variablesWithScopes;
        const stats = {
          totalVariables,
          variablesWithScopes,
          variablesWithoutScopes
        };
        ErrorHandler.info(
          `Scope stats: ${totalVariables} total, ${variablesWithScopes} with scopes, ${variablesWithoutScopes} without scopes`,
          "ScopeController"
        );
        return stats;
      }, "Get Scope Stats");
    }
  };

  // src/backend/main.ts
  var PluginBackend = class {
    constructor() {
      this.variableManager = new VariableManager();
      this.githubService = new GitHubService();
      this.storage = new StorageService();
      this.tokenController = new TokenController(this.variableManager, this.storage);
      this.githubController = new GitHubController(this.githubService, this.storage);
      this.scopeController = new ScopeController();
      ErrorHandler.info("Plugin backend initialized", "PluginBackend");
    }
    /**
     * Initialize the plugin
     * Shows UI and sets up message handler
     */
    init() {
      figma.showUI(__html__, {
        width: UI_CONFIG.width,
        height: UI_CONFIG.height
      });
      figma.ui.onmessage = this.handleMessage.bind(this);
      ErrorHandler.info("Plugin UI shown", "PluginBackend");
    }
    /**
     * Handle messages from UI
     * Routes messages to appropriate controllers
     */
    async handleMessage(msg) {
      const requestId = msg.requestId;
      try {
        ErrorHandler.info(`Received message: ${msg.type}`, "PluginBackend");
        switch (msg.type) {
          // ==================== TOKEN OPERATIONS ====================
          case "import-tokens":
            await this.handleImportTokens(msg);
            break;
          case "save-tokens":
            await this.handleSaveTokens(msg);
            break;
          case "load-tokens":
            await this.handleLoadTokens(msg);
            break;
          // ==================== GITHUB OPERATIONS ====================
          case "github-fetch-files":
            await this.handleGitHubFetchFiles(msg);
            break;
          case "github-import-files":
            await this.handleGitHubImportFiles(msg);
            break;
          case "load-github-config":
            await this.handleLoadGitHubConfig(msg);
            break;
          case "save-github-config":
            await this.handleSaveGitHubConfig(msg);
            break;
          // ==================== SCOPE OPERATIONS ====================
          case "get-figma-variables":
            await this.handleGetFigmaVariables(msg);
            break;
          case "apply-variable-scopes":
            await this.handleApplyVariableScopes(msg);
            break;
          // ==================== PLUGIN CONTROL ====================
          case "cancel":
            figma.closePlugin();
            break;
          default:
            ErrorHandler.warn(`Unknown message type: ${msg.type}`, "PluginBackend");
        }
      } catch (error) {
        const errorMessage = ErrorHandler.formatError(error);
        console.error("[PluginBackend] Unhandled error:", errorMessage);
        figma.ui.postMessage({
          type: "error",
          message: errorMessage,
          requestId
        });
      }
    }
    // ==================== TOKEN HANDLERS ====================
    async handleImportTokens(msg) {
      const result = await this.tokenController.importTokens({
        primitives: msg.data.primitives,
        semantics: msg.data.semantics,
        source: msg.data.source || "local"
      });
      if (result.success) {
        figma.ui.postMessage({
          type: "import-success",
          message: ` Tokens imported: ${result.data.added} added, ${result.data.updated} updated, ${result.data.skipped} skipped`,
          requestId: msg.requestId
        });
      } else {
        throw new Error(result.error);
      }
    }
    async handleSaveTokens(msg) {
      const result = await this.tokenController.saveTokens(msg.data);
      if (!result.success) {
        throw new Error(result.error);
      }
    }
    async handleLoadTokens(msg) {
      const result = await this.tokenController.loadTokens();
      if (result.success && result.data) {
        figma.ui.postMessage({
          type: "tokens-loaded",
          data: result.data,
          requestId: msg.requestId
        });
      } else if (!result.success) {
        throw new Error(result.error);
      }
    }
    // ==================== GITHUB HANDLERS ====================
    async handleGitHubFetchFiles(msg) {
      const result = await this.githubController.fetchFiles(msg.data);
      if (result.success) {
        figma.ui.postMessage({
          type: "github-files-fetched",
          data: { files: result.data },
          requestId: msg.requestId
        });
      } else {
        throw new Error(result.error);
      }
    }
    async handleGitHubImportFiles(msg) {
      const result = await this.githubController.importFiles(msg.data);
      if (result.success) {
        figma.ui.postMessage({
          type: "github-files-imported",
          data: result.data,
          requestId: msg.requestId
        });
      } else {
        throw new Error(result.error);
      }
    }
    async handleLoadGitHubConfig(msg) {
      const result = await this.githubController.loadConfig();
      if (result.success && result.data) {
        figma.ui.postMessage({
          type: "github-config-loaded",
          data: result.data,
          requestId: msg.requestId
        });
      } else if (!result.success) {
        throw new Error(result.error);
      }
    }
    async handleSaveGitHubConfig(msg) {
      const result = await this.githubController.saveConfig(msg.data);
      if (!result.success) {
        throw new Error(result.error);
      }
    }
    // ==================== SCOPE HANDLERS ====================
    async handleGetFigmaVariables(msg) {
      const result = await this.scopeController.getFigmaVariables();
      if (result.success) {
        figma.ui.postMessage({
          type: "figma-variables-loaded",
          data: { variables: result.data },
          requestId: msg.requestId
        });
      } else {
        throw new Error(result.error);
      }
    }
    async handleApplyVariableScopes(msg) {
      const result = await this.scopeController.applyScopes(msg.data.variableScopes);
      if (result.success) {
        figma.ui.postMessage({
          type: "scopes-applied",
          message: `Scopes updated for ${result.data} variable(s)`,
          requestId: msg.requestId
        });
      } else {
        throw new Error(result.error);
      }
    }
  };
  var backend = new PluginBackend();
  backend.init();
})();

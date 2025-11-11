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
  var FEATURE_FLAGS = {
    // Use new interface-based architecture (Phase 1)
    USE_NEW_ARCHITECTURE: true,
    // Use parallel file fetching (Phase 3)
    ENABLE_PARALLEL_FETCHING: true,
    // Maximum concurrent file fetches when parallel fetching enabled
    PARALLEL_BATCH_SIZE: 10,
    // Delay between batches (ms) to respect API rate limits
    BATCH_DELAY_MS: 100,
    // Auto-detect token format instead of assuming W3C (Phase 4)
    AUTO_DETECT_FORMAT: true
  };
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
        if (typeof value === "object" && value !== null && ("alpha" in value || "components" in value)) {
          let resolvedValue = __spreadValues({}, value);
          let needsResolution = false;
          if (typeof value.components === "string" && value.components.includes("{") && value.components.includes("}")) {
            const componentsRef = extractReference(value.components);
            if (componentsRef) {
              const componentsVariable = resolveReference(componentsRef, variableMap);
              if (componentsVariable) {
                const modeId = Object.keys(componentsVariable.valuesByMode)[0];
                const resolvedComponentsValue = componentsVariable.valuesByMode[modeId];
                if (typeof resolvedComponentsValue === "object" && "r" in resolvedComponentsValue) {
                  const colorSpace = value.colorSpace || "rgb";
                  if (colorSpace === "rgb") {
                    resolvedValue.components = [
                      Math.round(resolvedComponentsValue.r * 255),
                      Math.round(resolvedComponentsValue.g * 255),
                      Math.round(resolvedComponentsValue.b * 255)
                    ];
                  } else if (colorSpace === "hsl") {
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
          if (typeof value.alpha === "string" && value.alpha.includes("{") && value.alpha.includes("}")) {
            const alphaRef = extractReference(value.alpha);
            if (alphaRef) {
              const alphaVariable = resolveReference(alphaRef, variableMap);
              if (alphaVariable) {
                const modeId = Object.keys(alphaVariable.valuesByMode)[0];
                const resolvedAlpha = alphaVariable.valuesByMode[modeId];
                resolvedValue.alpha = typeof resolvedAlpha === "number" ? resolvedAlpha : 1;
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
  function rgbToHsl(r, g, b) {
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
     * Remove category prefixes from style path
     * Example: ['typography', 'display'] -> ['display']
     * Example: ['color', 'drop-shadow'] -> ['drop-shadow']
     * Removes first level if it's a category (typography, effect, shadow, color, etc)
     */
    cleanStylePath(path) {
      if (path.length === 0) return path;
      const firstLevel = path[0].toLowerCase();
      if (firstLevel === "typography" || firstLevel === "effect" || firstLevel === "shadow" || firstLevel === "boxshadow" || firstLevel === "dropshadow" || firstLevel === "font" || firstLevel === "color") {
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
      const reference = match[1];
      const variable = resolveReference(reference, this.variableMap);
      if (variable) {
        const modeId = Object.keys(variable.valuesByMode)[0];
        const value2 = variable.valuesByMode[modeId];
        return String(value2);
      }
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
     * Handles unitless values (1.5 -> 150%) and pixel values
     */
    resolveLineHeight(value) {
      if (typeof value === "number") {
        if (value < 10) {
          return { value: value * 100, unit: "PERCENT" };
        }
        return { value, unit: "PIXELS" };
      }
      const resolved = this.resolveTokenReference(value);
      if (!resolved) return null;
      if (resolved.includes("%")) {
        const percent = parseFloat(resolved);
        return { value: percent, unit: "PERCENT" };
      }
      const numValue = parseFloat(resolved);
      if (!isNaN(numValue) && !resolved.includes("px") && !resolved.includes("rem")) {
        if (numValue < 10) {
          return { value: numValue * 100, unit: "PERCENT" };
        }
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
     * Binds color variables instead of resolving to static colors
     */
    async applyShadowEffects(effectStyle, value) {
      const effectsData = [];
      if (Array.isArray(value)) {
        for (const shadow of value) {
          const effectData = this.parseShadowEffect(shadow);
          if (effectData) {
            effectsData.push(effectData);
          }
        }
      } else if (typeof value === "object" && value !== null) {
        const effectData = this.parseShadowEffect(value);
        if (effectData) {
          effectsData.push(effectData);
        }
      }
      if (effectsData.length > 0) {
        effectStyle.effects = effectsData.map((ed) => ed.effect);
        console.log(`[SHADOW] Created effect style with ${effectsData.length} effects`);
        effectsData.forEach((effectData, index) => {
          if (effectData.colorVariable) {
            const fieldPaths = [
              `effects/${index}/color`,
              `effects[${index}].color`,
              `effects.${index}.color`
            ];
            let bound = false;
            for (const fieldPath of fieldPaths) {
              try {
                effectStyle.setBoundVariable(fieldPath, effectData.colorVariable);
                console.log(`[SHADOW] \u2713 Successfully bound effect ${index} color to variable: ${effectData.colorVariable.name} (path: ${fieldPath})`);
                bound = true;
                break;
              } catch (error) {
              }
            }
            if (!bound) {
              console.error(`[SHADOW] \u2717 Failed to bind color variable for effect ${index}`);
              console.error(`[SHADOW]   Variable: ${effectData.colorVariable.name}`);
              console.error(`[SHADOW]   Tried paths: ${fieldPaths.join(", ")}`);
              console.error(`[SHADOW]   Note: Figma may not support variable binding for effect style colors`);
            }
          }
        });
      } else {
        console.error(`[SHADOW] No valid effects parsed for shadow token`);
      }
    }
    /**
     * Parse a single shadow object into a Figma Effect with optional color variable binding
     * Format: { x, y, blur, spread, color, type }
     * Returns: { effect, colorVariable? }
     */
    parseShadowEffect(shadow) {
      try {
        const x = this.resolveNumericValue(shadow.x || shadow.offsetX || 0);
        const y = this.resolveNumericValue(shadow.y || shadow.offsetY || 0);
        const blur = this.resolveNumericValue(shadow.blur || shadow.blurRadius || 0);
        const spread = this.resolveNumericValue(shadow.spread || shadow.spreadRadius || 0);
        const colorValue = shadow.color || "#000000";
        let colorVariable;
        let color;
        if (typeof colorValue === "string" && colorValue.includes("{") && colorValue.includes("}")) {
          const match = colorValue.match(/^\{([^}]+)\}$/);
          if (match) {
            const reference = match[1];
            colorVariable = resolveReference(reference, this.variableMap);
            if (colorVariable) {
              const modeId = Object.keys(colorVariable.valuesByMode)[0];
              const variableValue = colorVariable.valuesByMode[modeId];
              if (typeof variableValue === "object" && "r" in variableValue) {
                color = variableValue;
                console.log(`[SHADOW] Found color variable: ${colorVariable.name}`);
              } else {
                console.error(`[SHADOW] Variable ${colorVariable.name} is not a color type`);
                color = this.parseColorValue(colorValue);
                colorVariable = void 0;
              }
            } else {
              console.error(`[SHADOW] Cannot resolve color reference: ${reference}`);
              color = this.parseColorValue(colorValue);
            }
          } else {
            color = this.parseColorValue(colorValue);
          }
        } else {
          color = this.parseColorValue(colorValue);
        }
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
        return { effect, colorVariable };
      } catch (error) {
        console.error(`[SHADOW PARSE ERROR]`, error);
        return null;
      }
    }
    /**
     * Parse color value to RGBA format
     * Handles hex, rgb/rgba strings, references, and colorSpace object format
     */
    parseColorValue(value) {
      if (typeof value === "object" && value !== null && ("components" in value || "alpha" in value)) {
        let resolvedValue = __spreadValues({}, value);
        let needsResolution = false;
        if (typeof value.components === "string" && value.components.includes("{") && value.components.includes("}")) {
          const match = value.components.match(/\{([^}]+)\}/);
          if (match) {
            const reference = match[1];
            const componentsVariable = resolveReference(reference, this.variableMap);
            if (componentsVariable) {
              const modeId = Object.keys(componentsVariable.valuesByMode)[0];
              const resolvedComponentsValue = componentsVariable.valuesByMode[modeId];
              if (typeof resolvedComponentsValue === "object" && "r" in resolvedComponentsValue) {
                return {
                  r: resolvedComponentsValue.r,
                  g: resolvedComponentsValue.g,
                  b: resolvedComponentsValue.b,
                  a: typeof value.alpha === "number" ? value.alpha : resolvedComponentsValue.a || 1
                };
              }
            } else {
              console.error(`[SHADOW COLOR COMPONENTS FAILED] Cannot resolve: ${value.components}`);
            }
          }
        }
        if (typeof value.alpha === "string" && value.alpha.includes("{") && value.alpha.includes("}")) {
          const match = value.alpha.match(/\{([^}]+)\}/);
          if (match) {
            const reference = match[1];
            const alphaVariable = resolveReference(reference, this.variableMap);
            if (alphaVariable) {
              const modeId = Object.keys(alphaVariable.valuesByMode)[0];
              const resolvedAlpha = alphaVariable.valuesByMode[modeId];
              resolvedValue.alpha = typeof resolvedAlpha === "number" ? resolvedAlpha : 1;
              needsResolution = true;
            } else {
              console.error(`[SHADOW COLOR ALPHA FAILED] Cannot resolve: ${value.alpha}`);
              resolvedValue.alpha = 1;
            }
          }
        }
        if (value.colorSpace && Array.isArray(resolvedValue.components)) {
          const { colorSpace, components } = resolvedValue;
          const alpha = typeof resolvedValue.alpha === "number" ? resolvedValue.alpha : 1;
          if (colorSpace === "rgb" && components.length === 3) {
            return {
              r: components[0] / 255,
              g: components[1] / 255,
              b: components[2] / 255,
              a: alpha
            };
          }
          if (colorSpace === "hsl" && components.length === 3) {
            const h = components[0] / 360;
            const s = components[1] / 100;
            const l = components[2] / 100;
            const rgb = this.hslToRgb(h, s, l);
            return __spreadProps(__spreadValues({}, rgb), { a: alpha });
          }
        }
      }
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
     * Convert HSL to RGB (without alpha)
     * Alpha is handled separately in parseColorValue
     */
    hslToRgb(h, s, l) {
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
          await styleManager.createTextStyles(cleanedPrimitives, []);
          await styleManager.createEffectStyles(cleanedPrimitives, []);
        }
        if (semantics) {
          const cleanedSemantics = this.prepareAndValidateTokens(semantics, "semantic");
          await styleManager.createTextStyles(cleanedSemantics, []);
          await styleManager.createEffectStyles(cleanedSemantics, []);
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
        let resolvedValue = processedValue.value;
        if (processedValue.isAlias && processedValue.aliasVariable) {
          console.log(`[VariableManager] Token ${path.join(".")} is an alias to ${processedValue.aliasVariable.name}`);
          resolvedValue = await this.resolveVariableValueForMetadata(processedValue.aliasVariable);
          console.log(`[VariableManager] Final resolved value type: ${typeof resolvedValue}`);
          console.log(`[VariableManager] Final resolved value:`, JSON.stringify(resolvedValue));
        }
        const metadata = {
          name: path[path.length - 1],
          fullPath,
          type: tokenType,
          value: resolvedValue,
          // Now contains the actual resolved value, not null
          originalValue: token.$value,
          // Original token value (can be a reference)
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
    /**
     * Resolve a variable's value recursively, handling aliases across different collections
     * Each variable uses its own collection's default mode for lookup
     */
    async resolveVariableValueForMetadata(variable) {
      var _a;
      const maxIterations = 10;
      let currentVar = variable;
      let iterations = 0;
      console.log(`[resolveVariableValueForMetadata] Starting resolution for ${variable.name}`);
      while (iterations < maxIterations) {
        iterations++;
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        const varCollection = collections.find((c) => c.variableIds.includes(currentVar.id));
        if (!varCollection) {
          console.warn(`[resolveVariableValueForMetadata] Could not find collection for ${currentVar.name}`);
          return void 0;
        }
        const varModeId = (_a = varCollection.modes[0]) == null ? void 0 : _a.modeId;
        if (!varModeId) {
          console.warn(`[resolveVariableValueForMetadata] No mode found for ${currentVar.name}`);
          return void 0;
        }
        console.log(`[resolveVariableValueForMetadata] Iteration ${iterations}: ${currentVar.name} in collection ${varCollection.name}, mode ${varModeId}`);
        const value = currentVar.valuesByMode[varModeId];
        console.log(`[resolveVariableValueForMetadata] Value type: ${typeof value}`);
        console.log(`[resolveVariableValueForMetadata] Value:`, JSON.stringify(value));
        if (typeof value !== "object" || value === null || !("type" in value) || value.type !== "VARIABLE_ALIAS") {
          console.log(`[resolveVariableValueForMetadata] Found final value:`, JSON.stringify(value));
          return value;
        }
        const nextVar = await figma.variables.getVariableByIdAsync(value.id);
        if (!nextVar) {
          console.warn(`[resolveVariableValueForMetadata] Could not resolve alias at iteration ${iterations}`);
          return void 0;
        }
        console.log(`[resolveVariableValueForMetadata] Following alias to ${nextVar.name}`);
        currentVar = nextVar;
      }
      console.warn(`[resolveVariableValueForMetadata] Max iterations reached for ${variable.name}`);
      return void 0;
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

  // src/utils/Base64Decoder.ts
  var Base64Decoder = class {
    /**
     * Decode base64 string to UTF-8 text
     *
     * @param base64 - Base64 encoded string
     * @returns Decoded UTF-8 string
     * @throws Error if decoding fails
     */
    static decode(base64) {
      const cleanBase64 = base64.replace(/\s/g, "");
      if (cleanBase64.length === 0) {
        throw new Error("Empty base64 string");
      }
      try {
        if (!this.base64Lookup) {
          this.initializeLookup();
        }
        const bytes = this.decodeToBytes(cleanBase64);
        return this.bytesToUtf8(bytes);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Base64Decoder] Decoding failed: ${message}`);
        throw new Error(`Failed to decode base64: ${message}`);
      }
    }
    /**
     * Initialize base64 character lookup table
     * @private
     */
    static initializeLookup() {
      this.base64Lookup = /* @__PURE__ */ new Map();
      for (let i = 0; i < this.BASE64_CHARS.length; i++) {
        this.base64Lookup.set(this.BASE64_CHARS[i], i);
      }
    }
    /**
     * Decode base64 string to byte array
     * @private
     */
    static decodeToBytes(base64) {
      const bytes = [];
      for (let i = 0; i < base64.length; i += 4) {
        const encoded1 = this.base64Lookup.get(base64[i]) || 0;
        const encoded2 = this.base64Lookup.get(base64[i + 1]) || 0;
        const encoded3 = this.base64Lookup.get(base64[i + 2]) || 0;
        const encoded4 = this.base64Lookup.get(base64[i + 3]) || 0;
        const byte1 = encoded1 << 2 | encoded2 >> 4;
        const byte2 = (encoded2 & 15) << 4 | encoded3 >> 2;
        const byte3 = (encoded3 & 3) << 6 | encoded4;
        bytes.push(byte1);
        if (base64[i + 2] !== "=") bytes.push(byte2);
        if (base64[i + 3] !== "=") bytes.push(byte3);
      }
      return bytes;
    }
    /**
     * Convert byte array to UTF-8 string
     * Handles multi-byte characters
     * @private
     */
    static bytesToUtf8(bytes) {
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
    }
  };
  Base64Decoder.BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  Base64Decoder.base64Lookup = null;

  // src/utils/FileClassifier.ts
  var FileClassifier = class {
    /**
     * Classify a file path or filename
     *
     * @param filePath - Full path or filename
     * @returns Classification with confidence score
     */
    static classify(filePath) {
      const filename = this.extractFilename(filePath);
      for (const pattern of this.SEMANTIC_PATTERNS) {
        if (pattern.test(filename)) {
          return {
            category: "semantic",
            confidence: 0.9
          };
        }
      }
      for (const pattern of this.PRIMITIVE_PATTERNS) {
        if (pattern.test(filename)) {
          return {
            category: "primitive",
            confidence: 0.9
          };
        }
      }
      return {
        category: "primitive",
        confidence: 0.5
      };
    }
    /**
     * Check if file is primitive
     *
     * @param filePath - Full path or filename
     * @returns True if file is classified as primitive
     */
    static isPrimitive(filePath) {
      return this.classify(filePath).category === "primitive";
    }
    /**
     * Check if file is semantic
     *
     * @param filePath - Full path or filename
     * @returns True if file is classified as semantic
     */
    static isSemantic(filePath) {
      return this.classify(filePath).category === "semantic";
    }
    /**
     * Extract filename from full path
     * @private
     */
    static extractFilename(filePath) {
      const parts = filePath.split("/");
      return parts[parts.length - 1] || filePath;
    }
    /**
     * Classify multiple files into primitives and semantics
     *
     * @param filePaths - Array of file paths
     * @returns Object with primitive and semantic arrays
     */
    static classifyBatch(filePaths) {
      const primitives = [];
      const semantics = [];
      for (const path of filePaths) {
        const classification = this.classify(path);
        if (classification.category === "semantic") {
          semantics.push(path);
        } else {
          primitives.push(path);
        }
      }
      return { primitives, semantics };
    }
  };
  FileClassifier.PRIMITIVE_PATTERNS = [
    /primitive/i,
    /base/i,
    /core/i,
    /foundation/i,
    /tokens/i
    // Generic token files default to primitives
  ];
  FileClassifier.SEMANTIC_PATTERNS = [
    /semantic/i,
    /theme/i,
    /component/i,
    /alias/i
  ];

  // src/utils/BatchProcessor.ts
  var BatchProcessor = class {
    /**
     * Process items in parallel batches
     *
     * @param items - Array of items to process
     * @param processor - Async function to process each item
     * @param options - Batch processing configuration
     * @returns Promise with results and error information
     *
     * @example
     * ```typescript
     * const files = ['file1.json', 'file2.json', ...]; // 50 files
     *
     * const result = await BatchProcessor.processBatch(
     *   files,
     *   async (file) => await fetchFileContent(file),
     *   {
     *     batchSize: 10,  // Process 10 files at a time
     *     delayMs: 100,   // Wait 100ms between batches
     *     onProgress: (completed, total) => {
     *       console.log(`Progress: ${completed}/${total}`);
     *     }
     *   }
     * );
     *
     * console.log(`Success: ${result.successCount}, Failed: ${result.failureCount}`);
     * ```
     */
    static async processBatch(items, processor, options = {}) {
      const {
        batchSize = 10,
        delayMs = 100,
        onProgress,
        onError
      } = options;
      const successes = [];
      const failures = [];
      let completed = 0;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchStartIndex = i;
        const batchResults = await Promise.allSettled(
          batch.map((item, batchIndex) => {
            const globalIndex = batchStartIndex + batchIndex;
            return processor(item, globalIndex);
          })
        );
        batchResults.forEach((result, batchIndex) => {
          const globalIndex = batchStartIndex + batchIndex;
          const item = batch[batchIndex];
          if (result.status === "fulfilled") {
            successes.push(result.value);
          } else {
            const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
            failures.push({
              index: globalIndex,
              error,
              item
            });
            if (onError) {
              onError(error, item, globalIndex);
            } else {
              console.error(`[BatchProcessor] Item ${globalIndex} failed:`, error.message);
            }
          }
          completed++;
        });
        if (onProgress) {
          onProgress(completed, items.length);
        }
        if (i + batchSize < items.length && delayMs > 0) {
          await this.delay(delayMs);
        }
      }
      return {
        successes,
        failures,
        total: items.length,
        successCount: successes.length,
        failureCount: failures.length
      };
    }
    /**
     * Process items with automatic retry on failure
     *
     * @param items - Array of items to process
     * @param processor - Async function to process each item
     * @param options - Batch processing configuration
     * @param maxRetries - Maximum number of retries per item (default: 2)
     * @returns Promise with results and error information
     */
    static async processBatchWithRetry(items, processor, options = {}, maxRetries = 2) {
      const processorWithRetry = async (item, index) => {
        let lastError = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await processor(item, index);
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxRetries) {
              const backoffMs = Math.pow(2, attempt) * 1e3;
              await this.delay(backoffMs);
            }
          }
        }
        throw lastError || new Error("Unknown error");
      };
      return this.processBatch(items, processorWithRetry, options);
    }
    /**
     * Simple delay utility
     * @private
     */
    static delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  };

  // src/services/githubService.ts
  var GitHubService = class {
    /**
     * Fetch list of JSON files from repository
     */
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
    /**
     * Fetch content of a single file
     */
    async fetchFileContent(config, filePath) {
      try {
        const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}?ref=${config.branch}`;
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
        if (!data.content) {
          throw new Error(`No content field in GitHub response for ${filePath}`);
        }
        const content = Base64Decoder.decode(data.content);
        return JSON.parse(content);
      } catch (error) {
        console.error(`Error fetching file ${filePath}:`, error);
        throw error;
      }
    }
    /**
     * Fetch multiple files and organize by primitives/semantics
     */
    async fetchMultipleFiles(config, filePaths) {
      if (FEATURE_FLAGS.ENABLE_PARALLEL_FETCHING) {
        return this.fetchMultipleFilesParallel(config, filePaths);
      } else {
        return this.fetchMultipleFilesSequential(config, filePaths);
      }
    }
    /**
     * Fetch multiple files in parallel using BatchProcessor (Phase 3)
     * 5-10x faster than sequential for large file sets
     * @private
     */
    async fetchMultipleFilesParallel(config, filePaths) {
      const primitivesData = {};
      const semanticsData = {};
      const result = await BatchProcessor.processBatch(
        filePaths,
        async (filePath) => {
          const jsonData = await this.fetchFileContent(config, filePath);
          const fileName = filePath.split("/").pop() || filePath;
          return { filePath, fileName, jsonData };
        },
        {
          batchSize: FEATURE_FLAGS.PARALLEL_BATCH_SIZE,
          delayMs: FEATURE_FLAGS.BATCH_DELAY_MS,
          onProgress: (completed, total) => {
            if (completed % 10 === 0 || completed === total) {
              console.log(`[GitHubService] Fetching files: ${completed}/${total}`);
            }
          }
        }
      );
      for (const { filePath, fileName, jsonData } of result.successes) {
        if (FileClassifier.isSemantic(filePath)) {
          semanticsData[fileName] = jsonData;
        } else {
          primitivesData[fileName] = jsonData;
        }
      }
      if (result.failureCount > 0) {
        console.error(`[GitHubService] Failed to fetch ${result.failureCount} file(s):`);
        result.failures.forEach((failure) => {
          console.error(`  - ${failure.item}: ${failure.error.message}`);
        });
      }
      return { primitives: primitivesData, semantics: semanticsData };
    }
    /**
     * Fetch multiple files sequentially (legacy method)
     * @private
     */
    async fetchMultipleFilesSequential(config, filePaths) {
      const primitivesData = {};
      const semanticsData = {};
      for (const filePath of filePaths) {
        const jsonData = await this.fetchFileContent(config, filePath);
        const fileName = filePath.split("/").pop() || filePath;
        if (FileClassifier.isSemantic(filePath)) {
          semanticsData[fileName] = jsonData;
        } else {
          primitivesData[fileName] = jsonData;
        }
      }
      return { primitives: primitivesData, semantics: semanticsData };
    }
    /**
     * Parse GitHub repository URL
     */
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

  // src/backend/controllers/DocumentationController.ts
  var DocumentationController = class {
    constructor(generator, storage, variableManager) {
      this.generator = generator;
      this.storage = storage;
      this.variableManager = variableManager;
    }
    /**
     * Generate documentation for selected token files
     *
     * @param options - Documentation generation options
     * @returns Result with generation statistics
     */
    async generateDocumentation(options) {
      return ErrorHandler.handle(async () => {
        var _a;
        const fileCount = ((_a = options.fileNames) == null ? void 0 : _a.length) || 0;
        ErrorHandler.info(
          fileCount > 0 ? `Generating documentation for ${fileCount} file(s)` : "Generating documentation for all Figma variable collections",
          "DocumentationController"
        );
        const tokenStateResult = await this.storage.getTokenState();
        let tokenFilesMap = /* @__PURE__ */ new Map();
        if (tokenStateResult.success && tokenStateResult.data) {
          const tokenState = tokenStateResult.data;
          for (const [fileName, file] of Object.entries(tokenState.tokenFiles)) {
            tokenFilesMap.set(fileName, file);
          }
          ErrorHandler.info(
            `Loaded ${tokenFilesMap.size} token files from storage`,
            "DocumentationController"
          );
        } else {
          ErrorHandler.info(
            "No token state found in storage, will use Figma variables directly",
            "DocumentationController"
          );
        }
        const tokenMetadata = this.variableManager.getTokenMetadata();
        if (tokenMetadata && tokenMetadata.length > 0) {
          ErrorHandler.info(
            `Found ${tokenMetadata.length} tokens in metadata`,
            "DocumentationController"
          );
        } else {
          ErrorHandler.info(
            "No metadata in memory, generator will read from Figma variables",
            "DocumentationController"
          );
        }
        const result = await this.generator.generate(
          tokenFilesMap,
          tokenMetadata,
          options
        );
        if (!result.success) {
          throw new Error(result.error || "Documentation generation failed");
        }
        ErrorHandler.info(
          `Documentation generated: ${result.data.tokenCount} tokens in ${result.data.categoryCount} categories`,
          "DocumentationController"
        );
        ErrorHandler.notifyUser(
          `\u2713 Documentation generated: ${result.data.tokenCount} tokens`,
          "success"
        );
        return result.data;
      }, "Generate Documentation");
    }
  };

  // src/core/registries/FileSourceRegistry.ts
  var FileSourceRegistry = class {
    /**
     * Register a file source implementation
     *
     * @param source - File source implementation
     * @throws Error if source with same type already registered
     */
    static register(source) {
      const sourceType = source.getSourceType();
      if (this.sources.has(sourceType)) {
        console.error(`[FileSourceRegistry] Source '${sourceType}' is already registered`);
        throw new Error(`File source '${sourceType}' is already registered`);
      }
      this.sources.set(sourceType, source);
    }
    /**
     * Get a file source by type
     *
     * @param sourceType - Source identifier (e.g., 'github', 'gitlab')
     * @returns File source implementation or undefined
     */
    static get(sourceType) {
      const source = this.sources.get(sourceType);
      if (!source) {
        console.error(`[FileSourceRegistry] No source registered for type: ${sourceType}`);
      }
      return source;
    }
    /**
     * Check if a source type is registered
     *
     * @param sourceType - Source identifier
     * @returns True if registered
     */
    static has(sourceType) {
      return this.sources.has(sourceType);
    }
    /**
     * Get all registered source types
     *
     * @returns Array of source type identifiers
     */
    static getRegisteredTypes() {
      return Array.from(this.sources.keys());
    }
    /**
     * Clear all registered sources
     * Useful for testing
     */
    static clear() {
      this.sources.clear();
    }
    /**
     * Get count of registered sources
     *
     * @returns Number of registered sources
     */
    static count() {
      return this.sources.size;
    }
  };
  FileSourceRegistry.sources = /* @__PURE__ */ new Map();

  // src/core/registries/TokenFormatRegistry.ts
  var TokenFormatRegistry = class {
    /**
     * Register a token format strategy
     *
     * @param strategy - Token format strategy implementation
     * @throws Error if strategy with same format name already registered
     */
    static register(strategy) {
      const formatName = strategy.getFormatInfo().name;
      if (this.strategies.has(formatName)) {
        console.error(`[TokenFormatRegistry] Format '${formatName}' is already registered`);
        throw new Error(`Token format '${formatName}' is already registered`);
      }
      this.strategies.set(formatName, strategy);
    }
    /**
     * Get a format strategy by name
     *
     * @param formatName - Format identifier
     * @returns Format strategy or undefined
     */
    static get(formatName) {
      const strategy = this.strategies.get(formatName);
      if (!strategy) {
        console.error(`[TokenFormatRegistry] No strategy registered for format: ${formatName}`);
      }
      return strategy;
    }
    /**
     * Auto-detect which format strategy to use based on token data
     * Returns strategy with highest confidence score
     *
     * @param data - Raw token data to analyze
     * @returns Best matching strategy or undefined if no match
     */
    static detectFormat(data) {
      let bestStrategy;
      let bestScore = 0;
      for (const strategy of this.strategies.values()) {
        const score = strategy.detectFormat(data);
        if (score > bestScore) {
          bestScore = score;
          bestStrategy = strategy;
        }
      }
      if (!bestStrategy) {
        console.error("[TokenFormatRegistry] No format strategy could parse the provided data");
      }
      return bestStrategy;
    }
    /**
     * Check if a format is registered
     *
     * @param formatName - Format identifier
     * @returns True if registered
     */
    static has(formatName) {
      return this.strategies.has(formatName);
    }
    /**
     * Get all registered format names
     *
     * @returns Array of format names
     */
    static getRegisteredFormats() {
      return Array.from(this.strategies.keys());
    }
    /**
     * Clear all registered strategies
     * Useful for testing
     */
    static clear() {
      this.strategies.clear();
    }
    /**
     * Get count of registered strategies
     *
     * @returns Number of registered strategies
     */
    static count() {
      return this.strategies.size;
    }
  };
  TokenFormatRegistry.strategies = /* @__PURE__ */ new Map();

  // src/core/adapters/GitHubFileSource.ts
  var GitHubFileSource = class {
    constructor(githubService) {
      this.githubService = githubService || new GitHubService();
    }
    /**
     * Fetch list of JSON files from GitHub repository
     */
    async fetchFileList(config) {
      try {
        const ghConfig = this.toGitHubConfig(config);
        const files = await this.githubService.fetchRepositoryFiles(ghConfig);
        const metadata = files.map((file) => ({
          path: file.path,
          type: file.type,
          sha: file.sha
        }));
        return Success(metadata);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[GitHubFileSource] Failed to fetch file list: ${message}`);
        return Failure(message);
      }
    }
    /**
     * Fetch content of a single file from GitHub
     */
    async fetchFileContent(config, filePath) {
      try {
        const ghConfig = this.toGitHubConfig(config);
        const content = await this.githubService.fetchFileContent(ghConfig, filePath);
        return Success(content);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[GitHubFileSource] Failed to fetch file '${filePath}': ${message}`);
        return Failure(message);
      }
    }
    /**
     * Fetch content of multiple files from GitHub
     */
    async fetchMultipleFiles(config, filePaths) {
      try {
        const ghConfig = this.toGitHubConfig(config);
        const result = await this.githubService.fetchMultipleFiles(ghConfig, filePaths);
        const files = [];
        if (result.primitives) {
          for (const [fileName, content] of Object.entries(result.primitives)) {
            files.push(content);
          }
        }
        if (result.semantics) {
          for (const [fileName, content] of Object.entries(result.semantics)) {
            files.push(content);
          }
        }
        return Success(files);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[GitHubFileSource] Failed to fetch multiple files: ${message}`);
        return Failure(message);
      }
    }
    /**
     * Validate GitHub configuration
     */
    async validateConfig(config) {
      try {
        const ghConfig = this.toGitHubConfig(config);
        await this.githubService.fetchRepositoryFiles(ghConfig);
        return Success(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[GitHubFileSource] Config validation failed: ${message}`);
        return Success(false);
      }
    }
    /**
     * Get source type identifier
     */
    getSourceType() {
      return "github";
    }
    /**
     * Convert FileSourceConfig to GitHubConfig
     * Private helper to maintain type safety
     */
    toGitHubConfig(config) {
      const ghConfig = config;
      return {
        token: ghConfig.token,
        owner: ghConfig.owner,
        repo: ghConfig.repo,
        branch: ghConfig.branch,
        files: ghConfig.files
      };
    }
  };

  // src/core/adapters/W3CTokenFormatStrategy.ts
  var W3CTokenFormatStrategy = class {
    /**
     * Detect if data matches W3C format
     * Looks for characteristic $value, $type properties
     *
     * @returns Confidence score 0-1
     */
    detectFormat(data) {
      let tokenCount = 0;
      let w3cTokenCount = 0;
      const check = (obj) => {
        if (typeof obj !== "object" || obj === null) return;
        for (const key in obj) {
          if (key.startsWith("$")) continue;
          const value = obj[key];
          if (typeof value === "object" && value !== null) {
            if ("$value" in value) {
              tokenCount++;
              if ("$value" in value || "$type" in value) {
                w3cTokenCount++;
              }
            } else {
              check(value);
            }
          }
        }
      };
      check(data);
      if (tokenCount === 0) return 0;
      const score = w3cTokenCount / tokenCount;
      return Math.min(score, 1);
    }
    /**
     * Get format information
     */
    getFormatInfo() {
      return {
        name: "W3C Design Tokens",
        version: "1.0",
        description: "W3C Design Tokens Community Group format"
      };
    }
    /**
     * Parse tokens from W3C format
     * Traverses nested structure and extracts token definitions
     */
    parseTokens(data) {
      try {
        const tokens = [];
        const traverse = (obj, path = []) => {
          for (const key in obj) {
            const value = obj[key];
            const currentPath = [...path, key];
            if (key.startsWith("$")) continue;
            if (typeof value === "object" && value !== null && "$value" in value) {
              const type = value.$type || this.inferType(value.$value, currentPath);
              tokens.push({
                path: currentPath,
                value: value.$value,
                type,
                originalValue: value.$value
              });
            } else if (typeof value === "object" && value !== null) {
              traverse(value, currentPath);
            }
          }
        };
        traverse(data);
        return Success(tokens);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[W3CTokenFormatStrategy] Failed to parse tokens: ${message}`);
        return Failure(message);
      }
    }
    /**
     * Normalize value according to W3C conventions
     * Currently passes through - format-specific transformations can be added
     */
    normalizeValue(value, type) {
      return value;
    }
    /**
     * Extract token type from W3C token object
     */
    extractType(tokenData, path) {
      if (tokenData.$type) {
        return tokenData.$type;
      }
      if (tokenData.$value !== void 0) {
        return this.inferType(tokenData.$value, path);
      }
      return null;
    }
    /**
     * Check if value is a reference in W3C format
     * W3C references use {path.to.token} syntax
     */
    isReference(value) {
      if (typeof value !== "string") return false;
      return /^\{[^}]+\}$/.test(value.trim());
    }
    /**
     * Extract reference path from W3C reference syntax
     */
    extractReference(value) {
      if (!this.isReference(value)) return null;
      const match = value.trim().match(/^\{([^}]+)\}$/);
      return match ? match[1] : null;
    }
    /**
     * Infer token type from value and path
     * Used when $type is not specified
     *
     * @private
     */
    inferType(value, path) {
      const pathStr = path.join(".").toLowerCase();
      if (pathStr.includes("color") || pathStr.includes("colour")) return "color";
      if (pathStr.includes("spacing") || pathStr.includes("space")) return "spacing";
      if (pathStr.includes("font-size") || pathStr.includes("fontsize")) return "fontSize";
      if (pathStr.includes("font-weight") || pathStr.includes("fontweight")) return "fontWeight";
      if (pathStr.includes("font-family") || pathStr.includes("fontfamily")) return "fontFamily";
      if (pathStr.includes("line-height") || pathStr.includes("lineheight")) return "lineHeight";
      if (pathStr.includes("dimension") || pathStr.includes("size")) return "dimension";
      if (pathStr.includes("shadow")) return "shadow";
      if (typeof value === "number") return "number";
      if (typeof value === "string") {
        if (/^#[0-9a-f]{3,8}$/i.test(value)) return "color";
        if (/^rgb/.test(value)) return "color";
        if (/^hsl/.test(value)) return "color";
        if (/^\d+(\.\d+)?(px|rem|em)$/.test(value)) return "dimension";
        return "string";
      }
      if (typeof value === "object" && value !== null) {
        if ("colorSpace" in value || "components" in value && "alpha" in value) return "color";
        if ("blur" in value || "offsetX" in value) return "shadow";
        if ("fontFamily" in value || "fontSize" in value) return "typography";
      }
      return "string";
    }
  };

  // src/core/adapters/StyleDictionaryFormatStrategy.ts
  var StyleDictionaryFormatStrategy = class {
    /**
     * Detect if data matches Style Dictionary format
     * Looks for characteristic "value" properties (not "$value")
     *
     * @returns Confidence score 0-1
     */
    detectFormat(data) {
      let tokenCount = 0;
      let styleDictTokenCount = 0;
      const check = (obj) => {
        if (typeof obj !== "object" || obj === null) return;
        for (const key in obj) {
          if (key.startsWith("$")) continue;
          const value = obj[key];
          if (typeof value === "object" && value !== null) {
            if ("value" in value && !("$value" in value)) {
              tokenCount++;
              if ("value" in value) {
                styleDictTokenCount++;
              }
            } else if (!("value" in value) && !("$value" in value)) {
              check(value);
            }
          }
        }
      };
      check(data);
      if (tokenCount === 0) return 0;
      const score = styleDictTokenCount / tokenCount;
      return Math.min(score, 1);
    }
    /**
     * Get format information
     */
    getFormatInfo() {
      return {
        name: "Style Dictionary",
        version: "3.0",
        description: "Amazon Style Dictionary format"
      };
    }
    /**
     * Parse tokens from Style Dictionary format
     * Traverses nested structure and extracts token definitions
     */
    parseTokens(data) {
      try {
        const tokens = [];
        const traverse = (obj, path = []) => {
          for (const key in obj) {
            const value = obj[key];
            const currentPath = [...path, key];
            if (key.startsWith("$")) continue;
            if (typeof value === "object" && value !== null && "value" in value) {
              const type = this.inferType(value.value, currentPath);
              tokens.push({
                path: currentPath,
                value: value.value,
                type,
                originalValue: value.value
              });
            } else if (typeof value === "object" && value !== null) {
              traverse(value, currentPath);
            }
          }
        };
        traverse(data);
        return Success(tokens);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`[StyleDictionaryFormatStrategy] Failed to parse tokens: ${message}`);
        return Failure(message);
      }
    }
    /**
     * Normalize value according to Style Dictionary conventions
     */
    normalizeValue(value, type) {
      return value;
    }
    /**
     * Extract token type from Style Dictionary token object
     */
    extractType(tokenData, path) {
      if (tokenData.value !== void 0) {
        return this.inferType(tokenData.value, path);
      }
      return null;
    }
    /**
     * Check if value is a reference in Style Dictionary format
     * Style Dictionary uses {path.to.token} syntax (same as W3C)
     */
    isReference(value) {
      if (typeof value !== "string") return false;
      return /^\{[^}]+\}$/.test(value.trim());
    }
    /**
     * Extract reference path from Style Dictionary reference syntax
     */
    extractReference(value) {
      if (!this.isReference(value)) return null;
      const match = value.trim().match(/^\{([^}]+)\}$/);
      return match ? match[1] : null;
    }
    /**
     * Infer token type from value and path
     * Style Dictionary organizes tokens as category/type/item
     *
     * @private
     */
    inferType(value, path) {
      const pathStr = path.join(".").toLowerCase();
      if (path.length > 0) {
        const category = path[0].toLowerCase();
        if (category === "color" || category === "colors") return "color";
        if (category === "size" || category === "sizing") return "dimension";
        if (category === "space" || category === "spacing") return "spacing";
        if (category === "font") {
          if (pathStr.includes("size")) return "fontSize";
          if (pathStr.includes("weight")) return "fontWeight";
          if (pathStr.includes("family")) return "fontFamily";
          return "fontFamily";
        }
        if (category === "time" || category === "duration") return "duration";
      }
      if (pathStr.includes("color")) return "color";
      if (pathStr.includes("size")) return "fontSize";
      if (pathStr.includes("spacing") || pathStr.includes("space")) return "spacing";
      if (pathStr.includes("radius")) return "dimension";
      if (pathStr.includes("shadow")) return "shadow";
      if (typeof value === "number") return "number";
      if (typeof value === "string") {
        if (/^#[0-9a-f]{3,8}$/i.test(value)) return "color";
        if (/^rgb/.test(value)) return "color";
        if (/^hsl/.test(value)) return "color";
        if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(value)) return "dimension";
        return "string";
      }
      if (typeof value === "object" && value !== null) {
        if ("r" in value && "g" in value && "b" in value) return "color";
        if ("x" in value || "offsetX" in value) return "shadow";
        if ("fontFamily" in value || "fontSize" in value) return "typography";
      }
      return "string";
    }
  };

  // src/core/registries/TokenVisualizerRegistry.ts
  var TokenVisualizerRegistry = class {
    /**
     * Register a token visualizer
     * Visualizers are indexed by their type
     *
     * @param visualizer - Visualizer implementation to register
     */
    static register(visualizer) {
      const type = visualizer.getType();
      this.visualizers.set(type, visualizer);
      console.log(`[TokenVisualizerRegistry] Registered visualizer for type: ${type}`);
    }
    /**
     * Get visualizer by token type
     *
     * @param type - Token type (e.g., 'color', 'spacing')
     * @returns Visualizer for the type, or undefined if not found
     */
    static get(type) {
      return this.visualizers.get(type);
    }
    /**
     * Get visualizer for a specific token
     * Uses canVisualize() to find the best match
     *
     * @param token - Token metadata
     * @returns Visualizer that can handle the token, or undefined
     */
    static getForToken(token) {
      const exactMatch = this.visualizers.get(token.type);
      if (exactMatch && exactMatch.canVisualize(token)) {
        return exactMatch;
      }
      for (const visualizer of this.visualizers.values()) {
        if (visualizer.canVisualize(token)) {
          return visualizer;
        }
      }
      return void 0;
    }
    /**
     * Check if a visualizer is registered for a type
     *
     * @param type - Token type to check
     * @returns True if visualizer exists for the type
     */
    static has(type) {
      return this.visualizers.has(type);
    }
    /**
     * Get all registered types
     *
     * @returns Array of all registered token types
     */
    static getRegisteredTypes() {
      return Array.from(this.visualizers.keys());
    }
    /**
     * Clear all registered visualizers
     * Useful for testing
     */
    static clear() {
      this.visualizers.clear();
    }
  };
  TokenVisualizerRegistry.visualizers = /* @__PURE__ */ new Map();

  // src/shared/documentation-config.ts
  var DOCUMENTATION_COLUMNS_CONFIG = [
    { key: "name", label: "Name", widthRatio: 1, enabled: true },
    { key: "value", label: "Value", widthRatio: 1, enabled: true },
    { key: "resolvedValue", label: "Resolved Value", widthRatio: 1, enabled: true },
    { key: "visualization", label: "Visualization", widthRatio: 1, enabled: true },
    { key: "description", label: "Description", widthRatio: 1, enabled: true }
  ];
  var getEnabledColumns = () => {
    return DOCUMENTATION_COLUMNS_CONFIG.filter((col) => col.enabled);
  };
  var calculateColumnWidths = (tableWidth, includeDescriptions) => {
    let columns = getEnabledColumns();
    if (!includeDescriptions) {
      columns = columns.filter((col) => col.key !== "description");
    }
    const minWidth = DOCUMENTATION_LAYOUT_CONFIG.table.minColumnWidth;
    const totalRatio = columns.reduce((sum, col) => sum + col.widthRatio, 0);
    const requiredMinWidth = columns.length * minWidth;
    if (requiredMinWidth > tableWidth) {
      console.warn(`[calculateColumnWidths] Required min width (${requiredMinWidth}px) exceeds table width (${tableWidth}px)`);
      const equalWidth = Math.max(minWidth, Math.floor(tableWidth / columns.length));
      const widthMap2 = /* @__PURE__ */ new Map();
      columns.forEach((col) => widthMap2.set(col.key, equalWidth));
      return widthMap2;
    }
    const widthMap = /* @__PURE__ */ new Map();
    let allocatedWidth = 0;
    columns.forEach((col, index) => {
      if (index === columns.length - 1) {
        const remaining = tableWidth - allocatedWidth;
        const width = Math.max(minWidth, remaining);
        widthMap.set(col.key, width);
      } else {
        const idealWidth = Math.floor(col.widthRatio / totalRatio * tableWidth);
        const width = Math.max(minWidth, idealWidth);
        widthMap.set(col.key, width);
        allocatedWidth += width;
      }
    });
    return widthMap;
  };
  var DOCUMENTATION_LAYOUT_CONFIG = {
    // Table layout
    table: {
      width: 1200,
      // Fixed table width - all columns will distribute this width
      minColumnWidth: 80,
      // Minimum width for any column
      rowHeight: 40,
      headerHeight: 48,
      padding: 16,
      gap: 8
    },
    // Category sections
    category: {
      padding: 24,
      gap: 16,
      titleFontSize: 20,
      titleFontWeight: 600
    },
    // Cell styling
    cell: {
      padding: 12,
      fontSize: 16,
      lineHeight: 24,
      cornerRadius: 4
    },
    // Header styling
    header: {
      backgroundColor: { r: 0.95, g: 0.95, b: 0.95 },
      // Light gray
      fontWeight: 600,
      fontSize: 14
    },
    // Row styling
    row: {
      backgroundColor: { r: 1, g: 1, b: 1 },
      // White
      alternateBackgroundColor: { r: 0.98, g: 0.98, b: 0.98 },
      // Very light gray
      hoverBackgroundColor: { r: 0.96, g: 0.96, b: 0.98 }
      // Light blue-gray
    },
    // Visualization cell
    visualization: {
      colorSquareSize: 32,
      typographyHeight: 24,
      spacingBarHeight: 20,
      padding: 8
    },
    // Global frame
    global: {
      padding: 32,
      gap: 48,
      backgroundColor: { r: 1, g: 1, b: 1 }
    }
  };
  var DOCUMENTATION_TYPOGRAPHY = {
    defaultFontFamily: "Inter",
    defaultFontSize: 14,
    defaultLineHeight: 20,
    fallbackFonts: ["Roboto", "Arial", "Helvetica"]
  };
  var extractCategoryFromPath = (path) => {
    const parts = path.split(".");
    const skipPrefixes = ["semantic", "primitive", "base", "core"];
    const filteredParts = parts.filter((p) => !skipPrefixes.includes(p.toLowerCase()));
    return filteredParts[0] || "other";
  };
  var formatNumber = (value, maxDecimals = 4) => {
    const rounded = Number(value.toFixed(maxDecimals));
    return rounded.toString();
  };
  var formatTokenValue = (value, type) => {
    if (value === null || value === void 0) {
      return "\u2014";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number") {
      return formatNumber(value);
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 0);
      } catch (e) {
        return "[Object]";
      }
    }
    return String(value);
  };
  var validateDimension = (value, min = 0.01, max = 1e5) => {
    if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
      console.warn(`[validateDimension] Invalid dimension value: ${value}, using minimum: ${min}`);
      return min;
    }
    return Math.max(min, Math.min(max, value));
  };
  var validateVisualizationDimensions = (width, height) => {
    const minWidth = 20;
    const minHeight = 20;
    return {
      width: validateDimension(width, minWidth),
      height: validateDimension(height, minHeight)
    };
  };

  // src/core/visualizers/ColorVisualizer.ts
  var ColorVisualizer = class {
    getType() {
      return "color";
    }
    canVisualize(token) {
      return token.type === "color";
    }
    renderVisualization(token, width, height) {
      const dims = validateVisualizationDimensions(width, height);
      const container = figma.createFrame();
      container.name = `viz-${token.name}`;
      container.fills = [];
      container.clipsContent = false;
      container.layoutMode = "HORIZONTAL";
      container.primaryAxisSizingMode = "FIXED";
      container.counterAxisSizingMode = "AUTO";
      container.primaryAxisAlignItems = "CENTER";
      container.counterAxisAlignItems = "CENTER";
      container.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      container.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      container.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      container.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      const square = figma.createRectangle();
      const size = DOCUMENTATION_LAYOUT_CONFIG.visualization.colorSquareSize;
      square.resize(size, size);
      square.cornerRadius = 4;
      try {
        console.log(`[ColorVisualizer] Rendering color for ${token.name}`);
        console.log(`[ColorVisualizer] Token value type: ${typeof token.value}`);
        console.log(`[ColorVisualizer] Token value:`, JSON.stringify(token.value));
        console.log(`[ColorVisualizer] Token originalValue:`, JSON.stringify(token.originalValue));
        const color = this.parseColor(token.value);
        square.fills = [{ type: "SOLID", color }];
      } catch (error) {
        square.fills = [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8 } }];
        console.error(`[ColorVisualizer] Failed to parse color for ${token.name}`);
        console.error(`[ColorVisualizer] Error details:`, error);
        console.error(`[ColorVisualizer] Token value was:`, JSON.stringify(token.value));
      }
      container.appendChild(square);
      container.resize(dims.width, container.height);
      return container;
    }
    /**
     * Parse color value to RGB
     * Supports Figma RGB objects, hex, rgb, hsl formats
     */
    parseColor(value) {
      if (typeof value === "object" && value !== null && "r" in value && "g" in value && "b" in value) {
        if (typeof value.r === "number" && typeof value.g === "number" && typeof value.b === "number") {
          return {
            r: value.r,
            g: value.g,
            b: value.b
          };
        }
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.startsWith("#")) {
          return this.parseHex(trimmed);
        }
        if (trimmed.startsWith("rgb")) {
          return this.parseRgb(trimmed);
        }
        if (trimmed.startsWith("hsl")) {
          return this.parseHsl(trimmed);
        }
      }
      throw new Error(`Unable to parse color value: ${JSON.stringify(value)}`);
    }
    /**
     * Parse hex color to RGB
     */
    parseHex(hex) {
      const cleaned = hex.replace("#", "");
      let r, g, b;
      if (cleaned.length === 3) {
        r = parseInt(cleaned[0] + cleaned[0], 16);
        g = parseInt(cleaned[1] + cleaned[1], 16);
        b = parseInt(cleaned[2] + cleaned[2], 16);
      } else if (cleaned.length === 6) {
        r = parseInt(cleaned.substring(0, 2), 16);
        g = parseInt(cleaned.substring(2, 4), 16);
        b = parseInt(cleaned.substring(4, 6), 16);
      } else {
        throw new Error("Invalid hex format");
      }
      return {
        r: r / 255,
        g: g / 255,
        b: b / 255
      };
    }
    /**
     * Parse rgb/rgba string to RGB
     */
    parseRgb(rgb) {
      const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) {
        throw new Error("Invalid RGB format");
      }
      return {
        r: parseInt(match[1]) / 255,
        g: parseInt(match[2]) / 255,
        b: parseInt(match[3]) / 255
      };
    }
    /**
     * Parse hsl/hsla string to RGB
     */
    parseHsl(hsl) {
      const match = hsl.match(/hsla?\((\d+),\s*(\d+)%?,\s*(\d+)%?/);
      if (!match) {
        throw new Error("Invalid HSL format");
      }
      const h = parseInt(match[1]) / 360;
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;
      return this.hslToRgb(h, s, l);
    }
    /**
     * Convert HSL to RGB
     */
    hslToRgb(h, s, l) {
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
  };

  // src/core/visualizers/SpacingVisualizer.ts
  var SpacingVisualizer = class {
    getType() {
      return "spacing";
    }
    canVisualize(token) {
      return token.type === "spacing" || token.type === "dimension";
    }
    renderVisualization(token, width, height) {
      const dims = validateVisualizationDimensions(width, height);
      const container = figma.createFrame();
      container.name = `viz-${token.name}`;
      container.fills = [];
      container.clipsContent = false;
      container.layoutMode = "HORIZONTAL";
      container.primaryAxisSizingMode = "FIXED";
      container.counterAxisSizingMode = "AUTO";
      container.primaryAxisAlignItems = "CENTER";
      container.counterAxisAlignItems = "CENTER";
      const padding = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      const availableWidth = Math.max(10, dims.width - padding * 2);
      container.paddingLeft = padding;
      container.paddingRight = padding;
      container.paddingTop = padding;
      container.paddingBottom = padding;
      const rectangle = figma.createRectangle();
      const spacingValue = this.parseSpacingValue(token.value);
      const rectWidth = validateDimension(Math.min(spacingValue, availableWidth), 1, availableWidth);
      const rectHeight = DOCUMENTATION_LAYOUT_CONFIG.visualization.spacingBarHeight;
      rectangle.resize(rectWidth, rectHeight);
      rectangle.cornerRadius = 2;
      rectangle.fills = [{ type: "SOLID", color: { r: 0.4, g: 0.6, b: 1 } }];
      container.appendChild(rectangle);
      container.resize(dims.width, container.height);
      return container;
    }
    /**
     * Parse spacing value to pixels
     */
    parseSpacingValue(value) {
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string") {
        const numStr = value.replace("px", "").trim();
        const parsed = parseFloat(numStr);
        return isNaN(parsed) ? 16 : parsed;
      }
      return 16;
    }
  };

  // src/core/visualizers/FontSizeVisualizer.ts
  var FontSizeVisualizer = class {
    getType() {
      return "fontSize";
    }
    canVisualize(token) {
      return token.type === "fontSize" || token.type === "fontSizes";
    }
    renderVisualization(token, width, height) {
      const dims = validateVisualizationDimensions(width, height);
      const container = figma.createFrame();
      container.name = `viz-${token.name}`;
      container.fills = [];
      container.clipsContent = false;
      container.layoutMode = "HORIZONTAL";
      container.primaryAxisSizingMode = "FIXED";
      container.counterAxisSizingMode = "AUTO";
      container.primaryAxisAlignItems = "CENTER";
      container.counterAxisAlignItems = "CENTER";
      container.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      container.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      container.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      container.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      const text = figma.createText();
      text.characters = "Aa";
      const fontSize = this.parseFontSize(token.value);
      text.fontSize = fontSize;
      text.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
      container.appendChild(text);
      container.resize(dims.width, container.height);
      return container;
    }
    /**
     * Parse font size value to pixels
     */
    parseFontSize(value) {
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string") {
        let numStr = value.trim();
        if (numStr.endsWith("rem")) {
          const rem = parseFloat(numStr.replace("rem", ""));
          return isNaN(rem) ? 16 : rem * 16;
        }
        numStr = numStr.replace("px", "");
        const parsed = parseFloat(numStr);
        return isNaN(parsed) ? 16 : parsed;
      }
      return 16;
    }
  };

  // src/core/visualizers/FontWeightVisualizer.ts
  var FontWeightVisualizer = class {
    getType() {
      return "fontWeight";
    }
    canVisualize(token) {
      return token.type === "fontWeight" || token.type === "fontWeights";
    }
    renderVisualization(token, width, height) {
      const dims = validateVisualizationDimensions(width, height);
      const container = figma.createFrame();
      container.name = `viz-${token.name}`;
      container.fills = [];
      container.clipsContent = false;
      container.layoutMode = "HORIZONTAL";
      container.primaryAxisSizingMode = "FIXED";
      container.counterAxisSizingMode = "AUTO";
      container.primaryAxisAlignItems = "CENTER";
      container.counterAxisAlignItems = "CENTER";
      container.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      container.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      container.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      container.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      const text = figma.createText();
      const fontWeight = this.parseFontWeight(token.value);
      text.characters = `${fontWeight}`;
      text.fontSize = 14;
      text.fontName = { family: "Inter", style: "Regular" };
      text.fills = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }];
      const sample = figma.createText();
      sample.characters = "Aa";
      sample.fontSize = 20;
      const style = fontWeight >= 600 ? "Bold" : "Regular";
      sample.fontName = { family: "Inter", style };
      sample.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
      container.itemSpacing = 8;
      container.appendChild(text);
      container.appendChild(sample);
      container.resize(dims.width, container.height);
      return container;
    }
    /**
     * Parse font weight value
     */
    parseFontWeight(value) {
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string") {
        const namedWeights = {
          "thin": 100,
          "extra-light": 200,
          "extralight": 200,
          "light": 300,
          "normal": 400,
          "regular": 400,
          "medium": 500,
          "semi-bold": 600,
          "semibold": 600,
          "bold": 700,
          "extra-bold": 800,
          "extrabold": 800,
          "black": 900
        };
        const normalized = value.toLowerCase().trim();
        if (namedWeights[normalized]) {
          return namedWeights[normalized];
        }
        const parsed = parseInt(value);
        return isNaN(parsed) ? 400 : parsed;
      }
      return 400;
    }
  };

  // src/core/visualizers/BorderRadiusVisualizer.ts
  var BorderRadiusVisualizer = class {
    getType() {
      return "borderRadius";
    }
    canVisualize(token) {
      return token.type === "borderRadius" || token.type === "radius";
    }
    renderVisualization(token, width, height) {
      const dims = validateVisualizationDimensions(width, height);
      const container = figma.createFrame();
      container.name = `viz-${token.name}`;
      container.fills = [];
      container.clipsContent = false;
      container.layoutMode = "HORIZONTAL";
      container.primaryAxisSizingMode = "FIXED";
      container.counterAxisSizingMode = "AUTO";
      container.primaryAxisAlignItems = "CENTER";
      container.counterAxisAlignItems = "CENTER";
      container.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      container.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      container.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      container.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.visualization.padding;
      const square = figma.createRectangle();
      square.resize(100, 100);
      const radius = this.parseBorderRadius(token.value);
      square.cornerRadius = radius;
      square.fills = [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.95 } }];
      square.strokes = [{ type: "SOLID", color: { r: 0.7, g: 0.7, b: 0.7 } }];
      square.strokeWeight = 1;
      container.appendChild(square);
      container.resize(dims.width, container.height);
      return container;
    }
    /**
     * Parse border radius value to pixels
     */
    parseBorderRadius(value) {
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string") {
        const numStr = value.replace("px", "").trim();
        const parsed = parseFloat(numStr);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    }
  };

  // src/core/visualizers/DefaultVisualizer.ts
  var DefaultVisualizer = class {
    getType() {
      return "default";
    }
    canVisualize(token) {
      return true;
    }
    renderVisualization(token, width, height) {
      const dims = validateVisualizationDimensions(width, height);
      const container = figma.createFrame();
      container.name = `viz-${token.name}`;
      container.fills = [];
      container.clipsContent = false;
      container.layoutMode = "HORIZONTAL";
      container.primaryAxisSizingMode = "FIXED";
      container.counterAxisSizingMode = "AUTO";
      container.primaryAxisAlignItems = "CENTER";
      container.counterAxisAlignItems = "CENTER";
      const text = figma.createText();
      text.characters = "\u2014";
      text.fontSize = 16;
      text.fills = [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.6 } }];
      container.appendChild(text);
      container.resize(dims.width, container.height);
      return container;
    }
  };

  // src/backend/services/DocumentationGenerator.ts
  var DocumentationGenerator = class {
    constructor() {
      this.fontFamily = DOCUMENTATION_TYPOGRAPHY.defaultFontFamily;
      this.defaultVisualizer = new DefaultVisualizer();
    }
    /**
     * Generate documentation table in Figma
     *
     * @param tokenFiles - Map of token files to document
     * @param tokenMetadata - Array of token metadata from VariableManager (can be empty)
     * @param options - Generation options
     * @returns Result with generation statistics
     */
    async generate(tokenFiles, tokenMetadata, options) {
      try {
        if (options.fontFamily) {
          this.fontFamily = options.fontFamily;
        }
        await this.loadFont();
        let metadata = tokenMetadata;
        if (!metadata || metadata.length === 0) {
          console.log("[DocumentationGenerator] No metadata provided, building from Figma variables...");
          const buildResult = await this.buildMetadataFromFigmaVariables();
          if (!buildResult.success) {
            return Failure(buildResult.error || "Failed to build metadata from Figma variables");
          }
          metadata = buildResult.data;
        }
        const filteredMetadata = this.filterTokensByFiles(
          metadata,
          options.fileNames
        );
        if (filteredMetadata.length === 0) {
          return Failure("No tokens found in selected files or Figma variables");
        }
        const rows = this.convertToRows(filteredMetadata);
        const groupedRows = this.groupByCategory(rows);
        const docFrame = await this.createDocumentationFrame(
          groupedRows,
          options.includeDescriptions
        );
        figma.currentPage.selection = [docFrame];
        figma.viewport.scrollAndZoomIntoView([docFrame]);
        return Success({
          frameId: docFrame.id,
          tokenCount: rows.length,
          categoryCount: Object.keys(groupedRows).length
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[DocumentationGenerator] Generation failed:", message);
        return Failure(`Documentation generation failed: ${message}`);
      }
    }
    /**
     * Load font for documentation
     * Loads Regular and Bold styles for selected font + Inter (for visualizers)
     */
    async loadFont() {
      try {
        await figma.loadFontAsync({ family: this.fontFamily, style: "Regular" });
        await figma.loadFontAsync({ family: this.fontFamily, style: "Bold" });
        if (this.fontFamily !== "Inter") {
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          await figma.loadFontAsync({ family: "Inter", style: "Bold" });
        }
      } catch (error) {
        for (const fallback of DOCUMENTATION_TYPOGRAPHY.fallbackFonts) {
          try {
            await figma.loadFontAsync({ family: fallback, style: "Regular" });
            await figma.loadFontAsync({ family: fallback, style: "Bold" });
            this.fontFamily = fallback;
            console.log(`[DocumentationGenerator] Using fallback font: ${fallback}`);
            if (fallback !== "Inter") {
              try {
                await figma.loadFontAsync({ family: "Inter", style: "Regular" });
                await figma.loadFontAsync({ family: "Inter", style: "Bold" });
              } catch (e) {
              }
            }
            return;
          } catch (e) {
            continue;
          }
        }
        throw new Error("Failed to load any font");
      }
    }
    /**
     * Recursively resolve a variable value until we get a non-alias value
     * Each variable uses its own collection's default mode for lookup
     */
    async resolveVariableValue(variable) {
      var _a;
      const maxIterations = 10;
      let currentVar = variable;
      let iterations = 0;
      console.log(`[DocumentationGenerator.resolveVariableValue] Starting resolution for ${variable.name}`);
      while (iterations < maxIterations) {
        iterations++;
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        const varCollection = collections.find((c) => c.variableIds.includes(currentVar.id));
        if (!varCollection) {
          console.warn(`[DocumentationGenerator.resolveVariableValue] Could not find collection for ${currentVar.name}`);
          return void 0;
        }
        const varModeId = (_a = varCollection.modes[0]) == null ? void 0 : _a.modeId;
        if (!varModeId) {
          console.warn(`[DocumentationGenerator.resolveVariableValue] No mode found for ${currentVar.name}`);
          return void 0;
        }
        console.log(`[DocumentationGenerator.resolveVariableValue] Iteration ${iterations}: ${currentVar.name} in collection ${varCollection.name}, mode ${varModeId}`);
        const value = currentVar.valuesByMode[varModeId];
        console.log(`[DocumentationGenerator.resolveVariableValue] Value type: ${typeof value}`);
        if (typeof value !== "object" || value === null || !("type" in value) || value.type !== "VARIABLE_ALIAS") {
          console.log(`[DocumentationGenerator.resolveVariableValue] Found final value for ${variable.name}`);
          return value;
        }
        const nextVar = await figma.variables.getVariableByIdAsync(value.id);
        if (!nextVar) {
          console.warn(`[DocumentationGenerator.resolveVariableValue] Could not resolve alias at iteration ${iterations}`);
          return void 0;
        }
        console.log(`[DocumentationGenerator.resolveVariableValue] Following alias to ${nextVar.name}`);
        currentVar = nextVar;
      }
      console.warn(`[DocumentationGenerator.resolveVariableValue] Max iterations reached for ${variable.name}`);
      return void 0;
    }
    /**
     * Build metadata from Figma variables
     * Used when no metadata is provided from VariableManager
     */
    async buildMetadataFromFigmaVariables() {
      try {
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        const metadata = [];
        for (const collection of collections) {
          for (const variableId of collection.variableIds) {
            const variable = await figma.variables.getVariableByIdAsync(variableId);
            if (!variable) continue;
            const defaultModeId = collection.modes[0].modeId;
            let value = variable.valuesByMode[defaultModeId];
            let originalValue = value;
            let resolvedValue = value;
            if (typeof value === "object" && value !== null && "type" in value && value.type === "VARIABLE_ALIAS") {
              const aliasedVariable = await figma.variables.getVariableByIdAsync(value.id);
              if (aliasedVariable) {
                const referenceName = aliasedVariable.name.replace(/\//g, ".");
                originalValue = `{${referenceName}}`;
                resolvedValue = await this.resolveVariableValue(aliasedVariable);
                value = resolvedValue;
              }
            }
            const tokenName = variable.name.replace(/\//g, ".");
            const tokenType = this.mapVariableTypeToTokenType(variable.resolvedType, variable.name, value);
            metadata.push({
              name: tokenName,
              fullPath: tokenName,
              type: tokenType,
              value: resolvedValue,
              // Use resolved value for visualization
              originalValue,
              // Keep original (reference or actual value)
              description: variable.description || "",
              collection: collection.name
            });
          }
        }
        console.log(`[DocumentationGenerator] Built metadata for ${metadata.length} variables`);
        return Success(metadata);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[DocumentationGenerator] Failed to build metadata:", message);
        return Failure(`Failed to build metadata from Figma variables: ${message}`);
      }
    }
    /**
     * Map Figma variable type to token type with intelligent detection
     */
    mapVariableTypeToTokenType(variableType, variableName, value) {
      if (variableType === "COLOR") {
        return "color";
      }
      if (variableType === "FLOAT") {
        const nameLower = variableName.toLowerCase();
        if (nameLower.includes("fontweight") || nameLower.includes("font-weight") || nameLower.includes("weight") && (nameLower.includes("font") || nameLower.includes("text"))) {
          return "fontWeight";
        }
        if (nameLower.includes("borderradius") || nameLower.includes("border-radius") || nameLower.includes("radius") || nameLower.includes("corner")) {
          return "borderRadius";
        }
        if (nameLower.includes("spacing") || nameLower.includes("space") || nameLower.includes("gap") || nameLower.includes("margin") || nameLower.includes("padding") || nameLower.includes("dimension")) {
          return "spacing";
        }
        if (nameLower.includes("fontsize") || nameLower.includes("font-size") || nameLower.includes("size") && (nameLower.includes("text") || nameLower.includes("font"))) {
          return "fontSize";
        }
        return "number";
      }
      if (variableType === "STRING") {
        return "string";
      }
      if (variableType === "BOOLEAN") {
        return "boolean";
      }
      return "string";
    }
    /**
     * Filter tokens by selected file names
     */
    filterTokensByFiles(metadata, fileNames) {
      if (fileNames.length === 0) {
        return metadata;
      }
      return metadata.filter((token) => {
        const collectionLower = token.collection.toLowerCase();
        return fileNames.some((fileName) => {
          const fileNameLower = fileName.toLowerCase();
          return collectionLower.includes(fileNameLower) || fileNameLower.includes(collectionLower);
        });
      });
    }
    /**
     * Convert token metadata to documentation rows
     */
    convertToRows(metadata) {
      return metadata.map((token) => ({
        name: token.name,
        value: this.formatValue(token.originalValue || token.value, token.type),
        resolvedValue: this.formatResolvedValue(token.value, token.type),
        type: token.type,
        description: token.description || "",
        category: extractCategoryFromPath(token.fullPath),
        path: token.fullPath,
        originalToken: token
      }));
    }
    /**
     * Group rows by collection (primitive, semantic, etc.)
     */
    groupByCategory(rows) {
      const grouped = {};
      for (const row of rows) {
        const collection = row.originalToken.collection;
        if (!grouped[collection]) {
          grouped[collection] = [];
        }
        grouped[collection].push(row);
      }
      return grouped;
    }
    /**
     * Format token value for display
     * Shows token reference if it's a reference, otherwise formatted value
     */
    formatValue(value, type) {
      if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
        return value;
      }
      return this.formatResolvedValue(value, type);
    }
    /**
     * Format resolved value for display
     * Always shows the final computed value, never a reference
     */
    formatResolvedValue(value, type) {
      if (value === null || value === void 0) {
        return "\u2014";
      }
      if (type === "color") {
        return this.formatColorValue(value);
      }
      if (typeof value === "number") {
        if (type === "fontSize" || type === "lineHeight") {
          const remValue = value / 16;
          return `${formatNumber(remValue)}rem`;
        }
        if (type === "dimension" || type === "spacing") {
          return `${formatNumber(value)}px`;
        }
        return formatNumber(value);
      }
      if (typeof value === "string") {
        return value;
      }
      if (typeof value === "boolean") {
        return value ? "true" : "false";
      }
      if (typeof value === "object") {
        if ("r" in value && "g" in value && "b" in value) {
          return this.rgbToHex(value);
        }
        return JSON.stringify(value);
      }
      return String(value);
    }
    /**
     * Format color value to hex or other format
     */
    formatColorValue(value) {
      if (typeof value === "string") {
        return value;
      }
      if (typeof value === "object" && "r" in value && "g" in value && "b" in value) {
        return this.rgbToHex(value);
      }
      return formatTokenValue(value, "color");
    }
    /**
     * Convert RGB object to hex string
     * Handles both Figma format (0-1 floats) and standard format (0-255 integers)
     */
    rgbToHex(rgb) {
      const isFigmaFormat = rgb.r <= 1 && rgb.g <= 1 && rgb.b <= 1;
      const r = Math.round(isFigmaFormat ? rgb.r * 255 : rgb.r);
      const g = Math.round(isFigmaFormat ? rgb.g * 255 : rgb.g);
      const b = Math.round(isFigmaFormat ? rgb.b * 255 : rgb.b);
      const toHex = (n) => {
        const clamped = Math.max(0, Math.min(255, n));
        const hex = clamped.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }
    /**
     * Create the main documentation frame
     */
    async createDocumentationFrame(groupedRows, includeDescriptions) {
      const mainFrame = figma.createFrame();
      mainFrame.name = "Token Documentation";
      mainFrame.fills = [{ type: "SOLID", color: DOCUMENTATION_LAYOUT_CONFIG.global.backgroundColor }];
      mainFrame.layoutMode = "VERTICAL";
      mainFrame.primaryAxisSizingMode = "AUTO";
      mainFrame.counterAxisSizingMode = "AUTO";
      mainFrame.itemSpacing = DOCUMENTATION_LAYOUT_CONFIG.global.gap;
      mainFrame.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.global.padding;
      mainFrame.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.global.padding;
      mainFrame.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.global.padding;
      mainFrame.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.global.padding;
      for (const [collection, rows] of Object.entries(groupedRows)) {
        const collectionFrame = await this.createCollectionSection(
          collection,
          rows,
          includeDescriptions
        );
        mainFrame.appendChild(collectionFrame);
      }
      return mainFrame;
    }
    /**
     * Create a collection section with table
     */
    async createCollectionSection(collection, rows, includeDescriptions) {
      const sectionFrame = figma.createFrame();
      sectionFrame.name = `Collection: ${collection}`;
      sectionFrame.fills = [];
      sectionFrame.layoutMode = "VERTICAL";
      sectionFrame.primaryAxisSizingMode = "AUTO";
      sectionFrame.counterAxisSizingMode = "AUTO";
      sectionFrame.itemSpacing = DOCUMENTATION_LAYOUT_CONFIG.category.gap;
      const title = figma.createText();
      title.name = "Title";
      title.characters = collection.charAt(0).toUpperCase() + collection.slice(1);
      title.fontSize = DOCUMENTATION_LAYOUT_CONFIG.category.titleFontSize;
      title.fontName = { family: this.fontFamily, style: "Bold" };
      title.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }];
      sectionFrame.appendChild(title);
      const table = await this.createTable(rows, includeDescriptions);
      sectionFrame.appendChild(table);
      return sectionFrame;
    }
    /**
     * Create table with header and rows
     */
    async createTable(rows, includeDescriptions) {
      const tableFrame = figma.createFrame();
      tableFrame.name = "Table";
      tableFrame.fills = [];
      let columns = getEnabledColumns();
      if (!includeDescriptions) {
        columns = columns.filter((col) => col.key !== "description");
      }
      const tableWidth = DOCUMENTATION_LAYOUT_CONFIG.table.width;
      const columnWidths = calculateColumnWidths(tableWidth, includeDescriptions);
      tableFrame.layoutMode = "VERTICAL";
      tableFrame.primaryAxisSizingMode = "AUTO";
      tableFrame.counterAxisSizingMode = "FIXED";
      tableFrame.resize(tableWidth, 100);
      tableFrame.itemSpacing = DOCUMENTATION_LAYOUT_CONFIG.table.gap;
      const headerRow = this.createHeaderRow(columns, columnWidths, tableWidth);
      tableFrame.appendChild(headerRow);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const isAlternate = i % 2 === 1;
        const dataRow = await this.createDataRow(row, columns, columnWidths, isAlternate, tableWidth);
        tableFrame.appendChild(dataRow);
      }
      return tableFrame;
    }
    /**
     * Create header row
     */
    createHeaderRow(columns, columnWidths, tableWidth) {
      const rowFrame = figma.createFrame();
      rowFrame.name = "Header Row";
      rowFrame.fills = [{ type: "SOLID", color: DOCUMENTATION_LAYOUT_CONFIG.header.backgroundColor }];
      rowFrame.layoutMode = "HORIZONTAL";
      rowFrame.primaryAxisSizingMode = "FIXED";
      rowFrame.counterAxisSizingMode = "AUTO";
      for (const column of columns) {
        const width = columnWidths.get(column.key) || 200;
        const cell = this.createHeaderCell(column.label, width);
        rowFrame.appendChild(cell);
      }
      rowFrame.resize(tableWidth, rowFrame.height);
      return rowFrame;
    }
    /**
     * Create header cell
     */
    createHeaderCell(label, width) {
      const cellFrame = figma.createFrame();
      cellFrame.name = `Header: ${label}`;
      cellFrame.fills = [];
      cellFrame.layoutMode = "HORIZONTAL";
      cellFrame.primaryAxisSizingMode = "FIXED";
      cellFrame.counterAxisSizingMode = "AUTO";
      cellFrame.primaryAxisAlignItems = "CENTER";
      cellFrame.counterAxisAlignItems = "CENTER";
      cellFrame.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
      cellFrame.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
      cellFrame.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
      cellFrame.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
      const text = figma.createText();
      text.characters = label;
      text.fontSize = DOCUMENTATION_LAYOUT_CONFIG.header.fontSize;
      text.fontName = { family: this.fontFamily, style: "Bold" };
      text.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.2, b: 0.2 } }];
      text.textAutoResize = "WIDTH_AND_HEIGHT";
      cellFrame.appendChild(text);
      cellFrame.resize(width, cellFrame.height);
      return cellFrame;
    }
    /**
     * Create data row
     */
    async createDataRow(row, columns, columnWidths, isAlternate, tableWidth) {
      const rowFrame = figma.createFrame();
      rowFrame.name = `Row: ${row.name}`;
      const bgColor = isAlternate ? DOCUMENTATION_LAYOUT_CONFIG.row.alternateBackgroundColor : DOCUMENTATION_LAYOUT_CONFIG.row.backgroundColor;
      rowFrame.fills = [{ type: "SOLID", color: bgColor }];
      rowFrame.layoutMode = "HORIZONTAL";
      rowFrame.primaryAxisSizingMode = "FIXED";
      rowFrame.counterAxisSizingMode = "AUTO";
      for (const column of columns) {
        const cellWidth = columnWidths.get(column.key) || DOCUMENTATION_LAYOUT_CONFIG.table.minColumnWidth;
        let cell;
        if (column.key === "visualization") {
          cell = await this.createVisualizationCell(row, cellWidth);
        } else {
          const value = this.getCellValue(row, column.key);
          cell = this.createTextCell(value, cellWidth);
        }
        rowFrame.appendChild(cell);
      }
      rowFrame.resize(tableWidth, rowFrame.height);
      return rowFrame;
    }
    /**
     * Get cell value from row
     */
    getCellValue(row, key) {
      switch (key) {
        case "name":
          return row.name;
        case "value":
          return row.value;
        case "resolvedValue":
          return row.resolvedValue;
        case "description":
          return row.description || "\u2014";
        default:
          return "\u2014";
      }
    }
    /**
     * Create text cell
     */
    createTextCell(value, width) {
      const cellFrame = figma.createFrame();
      cellFrame.name = "Cell";
      cellFrame.fills = [];
      cellFrame.layoutMode = "HORIZONTAL";
      cellFrame.primaryAxisSizingMode = "FIXED";
      cellFrame.counterAxisSizingMode = "AUTO";
      cellFrame.primaryAxisAlignItems = "CENTER";
      cellFrame.counterAxisAlignItems = "CENTER";
      cellFrame.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
      cellFrame.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
      cellFrame.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
      cellFrame.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
      const text = figma.createText();
      text.characters = value;
      text.fontSize = DOCUMENTATION_LAYOUT_CONFIG.cell.fontSize;
      text.fontName = { family: this.fontFamily, style: "Regular" };
      text.fills = [{ type: "SOLID", color: { r: 0.3, g: 0.3, b: 0.3 } }];
      const availableWidth = width - DOCUMENTATION_LAYOUT_CONFIG.cell.padding * 2;
      text.textAutoResize = "HEIGHT";
      text.resize(availableWidth, text.height);
      cellFrame.appendChild(text);
      cellFrame.resize(width, cellFrame.height);
      return cellFrame;
    }
    /**
     * Create visualization cell
     */
    async createVisualizationCell(row, width) {
      const cellFrame = figma.createFrame();
      cellFrame.name = "Visualization Cell";
      cellFrame.fills = [];
      cellFrame.layoutMode = "HORIZONTAL";
      cellFrame.primaryAxisSizingMode = "FIXED";
      cellFrame.counterAxisSizingMode = "AUTO";
      cellFrame.primaryAxisAlignItems = "CENTER";
      cellFrame.counterAxisAlignItems = "CENTER";
      cellFrame.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
      cellFrame.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
      const visualizer = TokenVisualizerRegistry.getForToken(row.originalToken) || this.defaultVisualizer;
      const visualization = visualizer.renderVisualization(
        row.originalToken,
        width,
        DOCUMENTATION_LAYOUT_CONFIG.table.rowHeight
      );
      cellFrame.appendChild(visualization);
      cellFrame.resize(width, cellFrame.height);
      return cellFrame;
    }
  };

  // src/backend/main.ts
  var PluginBackend = class {
    constructor() {
      this.registerArchitectureComponents();
      this.variableManager = new VariableManager();
      this.githubService = new GitHubService();
      this.storage = new StorageService();
      this.tokenController = new TokenController(this.variableManager, this.storage);
      this.githubController = new GitHubController(this.githubService, this.storage);
      this.scopeController = new ScopeController();
      const documentationGenerator = new DocumentationGenerator();
      this.documentationController = new DocumentationController(
        documentationGenerator,
        this.storage,
        this.variableManager
      );
      ErrorHandler.info("Plugin backend initialized", "PluginBackend");
    }
    /**
     * Register new architecture components
     * Phase 1: File sources and token formats
     * Phase 3: Parallel processing (enabled via FEATURE_FLAGS)
     * Phase 4: Format auto-detection (enabled via FEATURE_FLAGS)
     * Phase 5: Documentation system with visualizers
     * @private
     */
    registerArchitectureComponents() {
      FileSourceRegistry.register(new GitHubFileSource());
      TokenFormatRegistry.register(new W3CTokenFormatStrategy());
      TokenFormatRegistry.register(new StyleDictionaryFormatStrategy());
      TokenVisualizerRegistry.register(new ColorVisualizer());
      TokenVisualizerRegistry.register(new SpacingVisualizer());
      TokenVisualizerRegistry.register(new FontSizeVisualizer());
      TokenVisualizerRegistry.register(new FontWeightVisualizer());
      TokenVisualizerRegistry.register(new BorderRadiusVisualizer());
      TokenVisualizerRegistry.register(new DefaultVisualizer());
      ErrorHandler.info("Architecture components registered", "PluginBackend");
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
          // ==================== DOCUMENTATION OPERATIONS ====================
          case "generate-documentation":
            await this.handleGenerateDocumentation(msg);
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
    // ==================== DOCUMENTATION HANDLERS ====================
    async handleGenerateDocumentation(msg) {
      const result = await this.documentationController.generateDocumentation(msg.data);
      if (result.success) {
        figma.ui.postMessage({
          type: "documentation-generated",
          data: result.data,
          message: `Documentation generated: ${result.data.tokenCount} tokens in ${result.data.categoryCount} categories`,
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

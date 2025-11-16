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
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/shared/constants.ts
  var UI_CONFIG = {
    width: 800,
    height: 600
  };
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
  var Failure = (error46) => ({ success: false, error: error46 });

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
      } catch (error46) {
        const errorMessage = error46 instanceof Error ? error46.message : String(error46);
        console.error(`[${context}]  Error:`, errorMessage);
        console.error(`[${context}] Stack trace:`, error46 instanceof Error ? error46.stack : "N/A");
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
      } catch (error46) {
        const errorMessage = error46 instanceof Error ? error46.message : String(error46);
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
        const error46 = `Missing required fields: ${missingFields.join(", ")}`;
        console.error(`[${context}] Validation failed:`, error46);
        throw new Error(error46);
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
    static formatError(error46) {
      if (error46 instanceof Error) {
        return error46.message;
      }
      if (typeof error46 === "string") {
        return error46;
      }
      if (typeof error46 === "object" && error46 !== null) {
        const errorObj = error46;
        if (errorObj.message) return String(errorObj.message);
        if (errorObj.error) return String(errorObj.error);
        try {
          return JSON.stringify(error46);
        } catch (e) {
          return String(error46);
        }
      }
      return ERROR_MESSAGES.UNKNOWN_ERROR;
    }
    /**
     * Create a Result from a thrown error
     * Useful in catch blocks
     */
    static fromError(error46, context) {
      const message = this.formatError(error46);
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
        } catch (error46) {
          lastError = error46;
          const message = this.formatError(error46);
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

  // src/utils/Base64Decoder.ts
  var Base64Decoder = class {
    /**
     * Decode base64 string to UTF-8 text
     *
     * @param base64 - Base64 encoded string
     * @returns Decoded UTF-8 string
     * @throws Error if decoding fails
     */
    static decode(base643) {
      const cleanBase64 = base643.replace(/\s/g, "");
      if (cleanBase64.length === 0) {
        throw new Error("Empty base64 string");
      }
      try {
        if (!this.base64Lookup) {
          this.initializeLookup();
        }
        const bytes = this.decodeToBytes(cleanBase64);
        return this.bytesToUtf8(bytes);
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
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
    static decodeToBytes(base643) {
      const bytes = [];
      for (let i = 0; i < base643.length; i += 4) {
        const encoded1 = this.base64Lookup.get(base643[i]) || 0;
        const encoded2 = this.base64Lookup.get(base643[i + 1]) || 0;
        const encoded3 = this.base64Lookup.get(base643[i + 2]) || 0;
        const encoded4 = this.base64Lookup.get(base643[i + 3]) || 0;
        const byte1 = encoded1 << 2 | encoded2 >> 4;
        const byte2 = (encoded2 & 15) << 4 | encoded3 >> 2;
        const byte3 = (encoded3 & 3) << 6 | encoded4;
        bytes.push(byte1);
        if (base643[i + 2] !== "=") bytes.push(byte2);
        if (base643[i + 3] !== "=") bytes.push(byte3);
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
            const error46 = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
            failures.push({
              index: globalIndex,
              error: error46,
              item
            });
            if (onError) {
              onError(error46, item, globalIndex);
            } else {
              console.error(`[BatchProcessor] Item ${globalIndex} failed:`, error46.message);
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
          } catch (error46) {
            lastError = error46 instanceof Error ? error46 : new Error(String(error46));
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
    async fetchRepositoryFiles(config2) {
      try {
        const url2 = `https://api.github.com/repos/${config2.owner}/${config2.repo}/git/trees/${config2.branch}?recursive=1`;
        const response = await fetch(url2, {
          headers: {
            "Authorization": `token ${config2.token}`,
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
        return jsonFiles.map((file2) => ({
          path: file2.path,
          type: file2.type,
          sha: file2.sha
        }));
      } catch (error46) {
        console.error("GitHub fetch error:", error46);
        throw new Error(`Failed to fetch repository files: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
      }
    }
    /**
     * Fetch content of a single file
     */
    async fetchFileContent(config2, filePath) {
      try {
        const url2 = `https://api.github.com/repos/${config2.owner}/${config2.repo}/contents/${filePath}?ref=${config2.branch}`;
        const response = await fetch(url2, {
          headers: {
            "Authorization": `token ${config2.token}`,
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
      } catch (error46) {
        console.error(`Error fetching file ${filePath}:`, error46);
        throw error46;
      }
    }
    /**
     * Fetch multiple files and organize by primitives/semantics
     */
    async fetchMultipleFiles(config2, filePaths) {
      if (FEATURE_FLAGS.ENABLE_PARALLEL_FETCHING) {
        return this.fetchMultipleFilesParallel(config2, filePaths);
      } else {
        return this.fetchMultipleFilesSequential(config2, filePaths);
      }
    }
    /**
     * Fetch multiple files in parallel using BatchProcessor (Phase 3)
     * 5-10x faster than sequential for large file sets
     * @private
     */
    async fetchMultipleFilesParallel(config2, filePaths) {
      const primitivesData = {};
      const semanticsData = {};
      const result = await BatchProcessor.processBatch(
        filePaths,
        async (filePath) => {
          const jsonData = await this.fetchFileContent(config2, filePath);
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
    async fetchMultipleFilesSequential(config2, filePaths) {
      const primitivesData = {};
      const semanticsData = {};
      for (const filePath of filePaths) {
        const jsonData = await this.fetchFileContent(config2, filePath);
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
    parseRepoUrl(url2) {
      const match = url2.match(/github\.com\/([^\/]+)\/([^\/]+)/);
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
    async saveGitHubConfig(config2) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.validateRequired(
          config2,
          ["owner", "repo", "branch"],
          "Save GitHub Config"
        );
        const serialized = JSON.stringify(config2);
        await figma.clientStorage.setAsync(STORAGE_KEYS.GITHUB_CONFIG, serialized);
        ErrorHandler.info(`GitHub config saved (${config2.owner}/${config2.repo}@${config2.branch})`, "StorageService");
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
        const config2 = JSON.parse(serialized);
        ErrorHandler.info(`GitHub config loaded (${config2.owner}/${config2.repo}@${config2.branch})`, "StorageService");
        return config2;
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

  // src/core/config/FeatureFlags.ts
  var FeatureFlags = {
    /**
     * Phase 1.1: Use discriminated union types for Token
     * - Compile-time type safety (type determines value type)
     * - Type guards for type narrowing
     *
     * Default: false (use legacy Token interface)
     */
    DISCRIMINATED_UNION_TYPES: false,
    /**
     * Phase 1.2: Runtime validation with Zod schemas
     * - Validate tokens at parse time
     * - Validate tokens at repository add time
     * - Structured validation errors
     *
     * Default: false (no runtime validation)
     */
    ZOD_VALIDATION: false,
    /**
     * Phase 1.3: Use type-safe converters
     * - Type-safe value conversions (ColorValue → RGB, etc.)
     * - Structured error handling with Result pattern
     * - Detailed conversion errors
     *
     * Default: false (use legacy conversion functions)
     */
    TYPE_SAFE_CONVERTERS: false,
    /**
     * Phase 2.1: Unified project ID system
     * - All files import with single project ID
     * - User configures project in UI
     * - Auto-migration for existing tokens
     *
     * Default: false (each file gets separate project ID)
     */
    UNIFIED_PROJECT_ID: false,
    /**
     * Phase 2.2: Cross-project reference support
     * - Allow references across project boundaries
     * - Project registry for lookups
     * - Requires UNIFIED_PROJECT_ID to be enabled
     *
     * Default: false (references only within same project)
     */
    CROSS_PROJECT_REFS: false,
    /**
     * Phase 2.3: Pre-sync validation
     * - Validate all tokens before creating Figma objects
     * - Detect cross-project refs, circular deps, missing values
     * - Report all errors with actionable fixes
     *
     * Default: false (validation happens during sync)
     */
    PRE_SYNC_VALIDATION: false,
    /**
     * Phase 4.1: Structured logging
     * - Consistent log format with context
     * - Log levels (DEBUG, INFO, WARN, ERROR)
     * - Collapsible console groups
     *
     * Default: false (use console.log directly)
     */
    STRUCTURED_LOGGING: false,
    /**
     * Phase 4.2: Sync state tracking
     * - Track synced/modified/pending/error status
     * - Maintain sync history
     * - Queryable sync state
     *
     * Default: false (no state tracking)
     */
    SYNC_STATE_TRACKING: false,
    /**
     * Phase 5.1: Transactional sync
     * - Atomic sync operations (all or nothing)
     * - Automatic rollback on failure
     * - No partial syncs
     *
     * Default: false (no transactions)
     */
    TRANSACTION_SYNC: false,
    /**
     * Development/testing flags
     */
    /**
     * Enable verbose debug logging
     * Outputs detailed information about token processing
     *
     * Default: false
     */
    DEBUG_MODE: false,
    /**
     * Dry run mode - validate without syncing to Figma
     * Useful for testing validation without modifying Figma
     *
     * Default: false
     */
    DRY_RUN: false
  };
  function isFeatureEnabled(flag) {
    return FeatureFlags[flag] === true;
  }

  // node_modules/zod/v4/classic/external.js
  var external_exports = {};
  __export(external_exports, {
    $brand: () => $brand,
    $input: () => $input,
    $output: () => $output,
    NEVER: () => NEVER,
    TimePrecision: () => TimePrecision,
    ZodAny: () => ZodAny,
    ZodArray: () => ZodArray,
    ZodBase64: () => ZodBase64,
    ZodBase64URL: () => ZodBase64URL,
    ZodBigInt: () => ZodBigInt,
    ZodBigIntFormat: () => ZodBigIntFormat,
    ZodBoolean: () => ZodBoolean,
    ZodCIDRv4: () => ZodCIDRv4,
    ZodCIDRv6: () => ZodCIDRv6,
    ZodCUID: () => ZodCUID,
    ZodCUID2: () => ZodCUID2,
    ZodCatch: () => ZodCatch,
    ZodCodec: () => ZodCodec,
    ZodCustom: () => ZodCustom,
    ZodCustomStringFormat: () => ZodCustomStringFormat,
    ZodDate: () => ZodDate,
    ZodDefault: () => ZodDefault,
    ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
    ZodE164: () => ZodE164,
    ZodEmail: () => ZodEmail,
    ZodEmoji: () => ZodEmoji,
    ZodEnum: () => ZodEnum,
    ZodError: () => ZodError,
    ZodFile: () => ZodFile,
    ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
    ZodFunction: () => ZodFunction,
    ZodGUID: () => ZodGUID,
    ZodIPv4: () => ZodIPv4,
    ZodIPv6: () => ZodIPv6,
    ZodISODate: () => ZodISODate,
    ZodISODateTime: () => ZodISODateTime,
    ZodISODuration: () => ZodISODuration,
    ZodISOTime: () => ZodISOTime,
    ZodIntersection: () => ZodIntersection,
    ZodIssueCode: () => ZodIssueCode,
    ZodJWT: () => ZodJWT,
    ZodKSUID: () => ZodKSUID,
    ZodLazy: () => ZodLazy,
    ZodLiteral: () => ZodLiteral,
    ZodMap: () => ZodMap,
    ZodNaN: () => ZodNaN,
    ZodNanoID: () => ZodNanoID,
    ZodNever: () => ZodNever,
    ZodNonOptional: () => ZodNonOptional,
    ZodNull: () => ZodNull,
    ZodNullable: () => ZodNullable,
    ZodNumber: () => ZodNumber,
    ZodNumberFormat: () => ZodNumberFormat,
    ZodObject: () => ZodObject,
    ZodOptional: () => ZodOptional,
    ZodPipe: () => ZodPipe,
    ZodPrefault: () => ZodPrefault,
    ZodPromise: () => ZodPromise,
    ZodReadonly: () => ZodReadonly,
    ZodRealError: () => ZodRealError,
    ZodRecord: () => ZodRecord,
    ZodSet: () => ZodSet,
    ZodString: () => ZodString,
    ZodStringFormat: () => ZodStringFormat,
    ZodSuccess: () => ZodSuccess,
    ZodSymbol: () => ZodSymbol,
    ZodTemplateLiteral: () => ZodTemplateLiteral,
    ZodTransform: () => ZodTransform,
    ZodTuple: () => ZodTuple,
    ZodType: () => ZodType,
    ZodULID: () => ZodULID,
    ZodURL: () => ZodURL,
    ZodUUID: () => ZodUUID,
    ZodUndefined: () => ZodUndefined,
    ZodUnion: () => ZodUnion,
    ZodUnknown: () => ZodUnknown,
    ZodVoid: () => ZodVoid,
    ZodXID: () => ZodXID,
    _ZodString: () => _ZodString,
    _default: () => _default2,
    _function: () => _function,
    any: () => any,
    array: () => array,
    base64: () => base642,
    base64url: () => base64url2,
    bigint: () => bigint2,
    boolean: () => boolean2,
    catch: () => _catch2,
    check: () => check,
    cidrv4: () => cidrv42,
    cidrv6: () => cidrv62,
    clone: () => clone,
    codec: () => codec,
    coerce: () => coerce_exports,
    config: () => config,
    core: () => core_exports2,
    cuid: () => cuid3,
    cuid2: () => cuid22,
    custom: () => custom,
    date: () => date3,
    decode: () => decode2,
    decodeAsync: () => decodeAsync2,
    discriminatedUnion: () => discriminatedUnion,
    e164: () => e1642,
    email: () => email2,
    emoji: () => emoji2,
    encode: () => encode2,
    encodeAsync: () => encodeAsync2,
    endsWith: () => _endsWith,
    enum: () => _enum2,
    file: () => file,
    flattenError: () => flattenError,
    float32: () => float32,
    float64: () => float64,
    formatError: () => formatError,
    function: () => _function,
    getErrorMap: () => getErrorMap,
    globalRegistry: () => globalRegistry,
    gt: () => _gt,
    gte: () => _gte,
    guid: () => guid2,
    hash: () => hash,
    hex: () => hex2,
    hostname: () => hostname2,
    httpUrl: () => httpUrl,
    includes: () => _includes,
    instanceof: () => _instanceof,
    int: () => int,
    int32: () => int32,
    int64: () => int64,
    intersection: () => intersection,
    ipv4: () => ipv42,
    ipv6: () => ipv62,
    iso: () => iso_exports,
    json: () => json,
    jwt: () => jwt,
    keyof: () => keyof,
    ksuid: () => ksuid2,
    lazy: () => lazy,
    length: () => _length,
    literal: () => literal,
    locales: () => locales_exports,
    looseObject: () => looseObject,
    lowercase: () => _lowercase,
    lt: () => _lt,
    lte: () => _lte,
    map: () => map,
    maxLength: () => _maxLength,
    maxSize: () => _maxSize,
    mime: () => _mime,
    minLength: () => _minLength,
    minSize: () => _minSize,
    multipleOf: () => _multipleOf,
    nan: () => nan,
    nanoid: () => nanoid2,
    nativeEnum: () => nativeEnum,
    negative: () => _negative,
    never: () => never,
    nonnegative: () => _nonnegative,
    nonoptional: () => nonoptional,
    nonpositive: () => _nonpositive,
    normalize: () => _normalize,
    null: () => _null3,
    nullable: () => nullable,
    nullish: () => nullish2,
    number: () => number2,
    object: () => object,
    optional: () => optional,
    overwrite: () => _overwrite,
    parse: () => parse2,
    parseAsync: () => parseAsync2,
    partialRecord: () => partialRecord,
    pipe: () => pipe,
    positive: () => _positive,
    prefault: () => prefault,
    preprocess: () => preprocess,
    prettifyError: () => prettifyError,
    promise: () => promise,
    property: () => _property,
    readonly: () => readonly,
    record: () => record,
    refine: () => refine,
    regex: () => _regex,
    regexes: () => regexes_exports,
    registry: () => registry,
    safeDecode: () => safeDecode2,
    safeDecodeAsync: () => safeDecodeAsync2,
    safeEncode: () => safeEncode2,
    safeEncodeAsync: () => safeEncodeAsync2,
    safeParse: () => safeParse2,
    safeParseAsync: () => safeParseAsync2,
    set: () => set,
    setErrorMap: () => setErrorMap,
    size: () => _size,
    startsWith: () => _startsWith,
    strictObject: () => strictObject,
    string: () => string2,
    stringFormat: () => stringFormat,
    stringbool: () => stringbool,
    success: () => success,
    superRefine: () => superRefine,
    symbol: () => symbol,
    templateLiteral: () => templateLiteral,
    toJSONSchema: () => toJSONSchema,
    toLowerCase: () => _toLowerCase,
    toUpperCase: () => _toUpperCase,
    transform: () => transform,
    treeifyError: () => treeifyError,
    trim: () => _trim,
    tuple: () => tuple,
    uint32: () => uint32,
    uint64: () => uint64,
    ulid: () => ulid2,
    undefined: () => _undefined3,
    union: () => union,
    unknown: () => unknown,
    uppercase: () => _uppercase,
    url: () => url,
    util: () => util_exports,
    uuid: () => uuid2,
    uuidv4: () => uuidv4,
    uuidv6: () => uuidv6,
    uuidv7: () => uuidv7,
    void: () => _void2,
    xid: () => xid2
  });

  // node_modules/zod/v4/core/index.js
  var core_exports2 = {};
  __export(core_exports2, {
    $ZodAny: () => $ZodAny,
    $ZodArray: () => $ZodArray,
    $ZodAsyncError: () => $ZodAsyncError,
    $ZodBase64: () => $ZodBase64,
    $ZodBase64URL: () => $ZodBase64URL,
    $ZodBigInt: () => $ZodBigInt,
    $ZodBigIntFormat: () => $ZodBigIntFormat,
    $ZodBoolean: () => $ZodBoolean,
    $ZodCIDRv4: () => $ZodCIDRv4,
    $ZodCIDRv6: () => $ZodCIDRv6,
    $ZodCUID: () => $ZodCUID,
    $ZodCUID2: () => $ZodCUID2,
    $ZodCatch: () => $ZodCatch,
    $ZodCheck: () => $ZodCheck,
    $ZodCheckBigIntFormat: () => $ZodCheckBigIntFormat,
    $ZodCheckEndsWith: () => $ZodCheckEndsWith,
    $ZodCheckGreaterThan: () => $ZodCheckGreaterThan,
    $ZodCheckIncludes: () => $ZodCheckIncludes,
    $ZodCheckLengthEquals: () => $ZodCheckLengthEquals,
    $ZodCheckLessThan: () => $ZodCheckLessThan,
    $ZodCheckLowerCase: () => $ZodCheckLowerCase,
    $ZodCheckMaxLength: () => $ZodCheckMaxLength,
    $ZodCheckMaxSize: () => $ZodCheckMaxSize,
    $ZodCheckMimeType: () => $ZodCheckMimeType,
    $ZodCheckMinLength: () => $ZodCheckMinLength,
    $ZodCheckMinSize: () => $ZodCheckMinSize,
    $ZodCheckMultipleOf: () => $ZodCheckMultipleOf,
    $ZodCheckNumberFormat: () => $ZodCheckNumberFormat,
    $ZodCheckOverwrite: () => $ZodCheckOverwrite,
    $ZodCheckProperty: () => $ZodCheckProperty,
    $ZodCheckRegex: () => $ZodCheckRegex,
    $ZodCheckSizeEquals: () => $ZodCheckSizeEquals,
    $ZodCheckStartsWith: () => $ZodCheckStartsWith,
    $ZodCheckStringFormat: () => $ZodCheckStringFormat,
    $ZodCheckUpperCase: () => $ZodCheckUpperCase,
    $ZodCodec: () => $ZodCodec,
    $ZodCustom: () => $ZodCustom,
    $ZodCustomStringFormat: () => $ZodCustomStringFormat,
    $ZodDate: () => $ZodDate,
    $ZodDefault: () => $ZodDefault,
    $ZodDiscriminatedUnion: () => $ZodDiscriminatedUnion,
    $ZodE164: () => $ZodE164,
    $ZodEmail: () => $ZodEmail,
    $ZodEmoji: () => $ZodEmoji,
    $ZodEncodeError: () => $ZodEncodeError,
    $ZodEnum: () => $ZodEnum,
    $ZodError: () => $ZodError,
    $ZodFile: () => $ZodFile,
    $ZodFunction: () => $ZodFunction,
    $ZodGUID: () => $ZodGUID,
    $ZodIPv4: () => $ZodIPv4,
    $ZodIPv6: () => $ZodIPv6,
    $ZodISODate: () => $ZodISODate,
    $ZodISODateTime: () => $ZodISODateTime,
    $ZodISODuration: () => $ZodISODuration,
    $ZodISOTime: () => $ZodISOTime,
    $ZodIntersection: () => $ZodIntersection,
    $ZodJWT: () => $ZodJWT,
    $ZodKSUID: () => $ZodKSUID,
    $ZodLazy: () => $ZodLazy,
    $ZodLiteral: () => $ZodLiteral,
    $ZodMap: () => $ZodMap,
    $ZodNaN: () => $ZodNaN,
    $ZodNanoID: () => $ZodNanoID,
    $ZodNever: () => $ZodNever,
    $ZodNonOptional: () => $ZodNonOptional,
    $ZodNull: () => $ZodNull,
    $ZodNullable: () => $ZodNullable,
    $ZodNumber: () => $ZodNumber,
    $ZodNumberFormat: () => $ZodNumberFormat,
    $ZodObject: () => $ZodObject,
    $ZodObjectJIT: () => $ZodObjectJIT,
    $ZodOptional: () => $ZodOptional,
    $ZodPipe: () => $ZodPipe,
    $ZodPrefault: () => $ZodPrefault,
    $ZodPromise: () => $ZodPromise,
    $ZodReadonly: () => $ZodReadonly,
    $ZodRealError: () => $ZodRealError,
    $ZodRecord: () => $ZodRecord,
    $ZodRegistry: () => $ZodRegistry,
    $ZodSet: () => $ZodSet,
    $ZodString: () => $ZodString,
    $ZodStringFormat: () => $ZodStringFormat,
    $ZodSuccess: () => $ZodSuccess,
    $ZodSymbol: () => $ZodSymbol,
    $ZodTemplateLiteral: () => $ZodTemplateLiteral,
    $ZodTransform: () => $ZodTransform,
    $ZodTuple: () => $ZodTuple,
    $ZodType: () => $ZodType,
    $ZodULID: () => $ZodULID,
    $ZodURL: () => $ZodURL,
    $ZodUUID: () => $ZodUUID,
    $ZodUndefined: () => $ZodUndefined,
    $ZodUnion: () => $ZodUnion,
    $ZodUnknown: () => $ZodUnknown,
    $ZodVoid: () => $ZodVoid,
    $ZodXID: () => $ZodXID,
    $brand: () => $brand,
    $constructor: () => $constructor,
    $input: () => $input,
    $output: () => $output,
    Doc: () => Doc,
    JSONSchema: () => json_schema_exports,
    JSONSchemaGenerator: () => JSONSchemaGenerator,
    NEVER: () => NEVER,
    TimePrecision: () => TimePrecision,
    _any: () => _any,
    _array: () => _array,
    _base64: () => _base64,
    _base64url: () => _base64url,
    _bigint: () => _bigint,
    _boolean: () => _boolean,
    _catch: () => _catch,
    _check: () => _check,
    _cidrv4: () => _cidrv4,
    _cidrv6: () => _cidrv6,
    _coercedBigint: () => _coercedBigint,
    _coercedBoolean: () => _coercedBoolean,
    _coercedDate: () => _coercedDate,
    _coercedNumber: () => _coercedNumber,
    _coercedString: () => _coercedString,
    _cuid: () => _cuid,
    _cuid2: () => _cuid2,
    _custom: () => _custom,
    _date: () => _date,
    _decode: () => _decode,
    _decodeAsync: () => _decodeAsync,
    _default: () => _default,
    _discriminatedUnion: () => _discriminatedUnion,
    _e164: () => _e164,
    _email: () => _email,
    _emoji: () => _emoji2,
    _encode: () => _encode,
    _encodeAsync: () => _encodeAsync,
    _endsWith: () => _endsWith,
    _enum: () => _enum,
    _file: () => _file,
    _float32: () => _float32,
    _float64: () => _float64,
    _gt: () => _gt,
    _gte: () => _gte,
    _guid: () => _guid,
    _includes: () => _includes,
    _int: () => _int,
    _int32: () => _int32,
    _int64: () => _int64,
    _intersection: () => _intersection,
    _ipv4: () => _ipv4,
    _ipv6: () => _ipv6,
    _isoDate: () => _isoDate,
    _isoDateTime: () => _isoDateTime,
    _isoDuration: () => _isoDuration,
    _isoTime: () => _isoTime,
    _jwt: () => _jwt,
    _ksuid: () => _ksuid,
    _lazy: () => _lazy,
    _length: () => _length,
    _literal: () => _literal,
    _lowercase: () => _lowercase,
    _lt: () => _lt,
    _lte: () => _lte,
    _map: () => _map,
    _max: () => _lte,
    _maxLength: () => _maxLength,
    _maxSize: () => _maxSize,
    _mime: () => _mime,
    _min: () => _gte,
    _minLength: () => _minLength,
    _minSize: () => _minSize,
    _multipleOf: () => _multipleOf,
    _nan: () => _nan,
    _nanoid: () => _nanoid,
    _nativeEnum: () => _nativeEnum,
    _negative: () => _negative,
    _never: () => _never,
    _nonnegative: () => _nonnegative,
    _nonoptional: () => _nonoptional,
    _nonpositive: () => _nonpositive,
    _normalize: () => _normalize,
    _null: () => _null2,
    _nullable: () => _nullable,
    _number: () => _number,
    _optional: () => _optional,
    _overwrite: () => _overwrite,
    _parse: () => _parse,
    _parseAsync: () => _parseAsync,
    _pipe: () => _pipe,
    _positive: () => _positive,
    _promise: () => _promise,
    _property: () => _property,
    _readonly: () => _readonly,
    _record: () => _record,
    _refine: () => _refine,
    _regex: () => _regex,
    _safeDecode: () => _safeDecode,
    _safeDecodeAsync: () => _safeDecodeAsync,
    _safeEncode: () => _safeEncode,
    _safeEncodeAsync: () => _safeEncodeAsync,
    _safeParse: () => _safeParse,
    _safeParseAsync: () => _safeParseAsync,
    _set: () => _set,
    _size: () => _size,
    _startsWith: () => _startsWith,
    _string: () => _string,
    _stringFormat: () => _stringFormat,
    _stringbool: () => _stringbool,
    _success: () => _success,
    _superRefine: () => _superRefine,
    _symbol: () => _symbol,
    _templateLiteral: () => _templateLiteral,
    _toLowerCase: () => _toLowerCase,
    _toUpperCase: () => _toUpperCase,
    _transform: () => _transform,
    _trim: () => _trim,
    _tuple: () => _tuple,
    _uint32: () => _uint32,
    _uint64: () => _uint64,
    _ulid: () => _ulid,
    _undefined: () => _undefined2,
    _union: () => _union,
    _unknown: () => _unknown,
    _uppercase: () => _uppercase,
    _url: () => _url,
    _uuid: () => _uuid,
    _uuidv4: () => _uuidv4,
    _uuidv6: () => _uuidv6,
    _uuidv7: () => _uuidv7,
    _void: () => _void,
    _xid: () => _xid,
    clone: () => clone,
    config: () => config,
    decode: () => decode,
    decodeAsync: () => decodeAsync,
    encode: () => encode,
    encodeAsync: () => encodeAsync,
    flattenError: () => flattenError,
    formatError: () => formatError,
    globalConfig: () => globalConfig,
    globalRegistry: () => globalRegistry,
    isValidBase64: () => isValidBase64,
    isValidBase64URL: () => isValidBase64URL,
    isValidJWT: () => isValidJWT,
    locales: () => locales_exports,
    parse: () => parse,
    parseAsync: () => parseAsync,
    prettifyError: () => prettifyError,
    regexes: () => regexes_exports,
    registry: () => registry,
    safeDecode: () => safeDecode,
    safeDecodeAsync: () => safeDecodeAsync,
    safeEncode: () => safeEncode,
    safeEncodeAsync: () => safeEncodeAsync,
    safeParse: () => safeParse,
    safeParseAsync: () => safeParseAsync,
    toDotPath: () => toDotPath,
    toJSONSchema: () => toJSONSchema,
    treeifyError: () => treeifyError,
    util: () => util_exports,
    version: () => version
  });

  // node_modules/zod/v4/core/core.js
  var NEVER = Object.freeze({
    status: "aborted"
  });
  // @__NO_SIDE_EFFECTS__
  function $constructor(name, initializer3, params) {
    var _a;
    function init(inst, def) {
      var _a3, _b;
      var _a2;
      Object.defineProperty(inst, "_zod", {
        value: (_a3 = inst._zod) != null ? _a3 : {},
        enumerable: false
      });
      (_b = (_a2 = inst._zod).traits) != null ? _b : _a2.traits = /* @__PURE__ */ new Set();
      inst._zod.traits.add(name);
      initializer3(inst, def);
      for (const k in _.prototype) {
        if (!(k in inst))
          Object.defineProperty(inst, k, { value: _.prototype[k].bind(inst) });
      }
      inst._zod.constr = _;
      inst._zod.def = def;
    }
    const Parent = (_a = params == null ? void 0 : params.Parent) != null ? _a : Object;
    class Definition extends Parent {
    }
    Object.defineProperty(Definition, "name", { value: name });
    function _(def) {
      var _a3;
      var _a2;
      const inst = (params == null ? void 0 : params.Parent) ? new Definition() : this;
      init(inst, def);
      (_a3 = (_a2 = inst._zod).deferred) != null ? _a3 : _a2.deferred = [];
      for (const fn of inst._zod.deferred) {
        fn();
      }
      return inst;
    }
    Object.defineProperty(_, "init", { value: init });
    Object.defineProperty(_, Symbol.hasInstance, {
      value: (inst) => {
        var _a2, _b;
        if ((params == null ? void 0 : params.Parent) && inst instanceof params.Parent)
          return true;
        return (_b = (_a2 = inst == null ? void 0 : inst._zod) == null ? void 0 : _a2.traits) == null ? void 0 : _b.has(name);
      }
    });
    Object.defineProperty(_, "name", { value: name });
    return _;
  }
  var $brand = Symbol("zod_brand");
  var $ZodAsyncError = class extends Error {
    constructor() {
      super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
  };
  var $ZodEncodeError = class extends Error {
    constructor(name) {
      super(`Encountered unidirectional transform during encode: ${name}`);
      this.name = "ZodEncodeError";
    }
  };
  var globalConfig = {};
  function config(newConfig) {
    if (newConfig)
      Object.assign(globalConfig, newConfig);
    return globalConfig;
  }

  // node_modules/zod/v4/core/util.js
  var util_exports = {};
  __export(util_exports, {
    BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES,
    Class: () => Class,
    NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
    aborted: () => aborted,
    allowsEval: () => allowsEval,
    assert: () => assert,
    assertEqual: () => assertEqual,
    assertIs: () => assertIs,
    assertNever: () => assertNever,
    assertNotEqual: () => assertNotEqual,
    assignProp: () => assignProp,
    base64ToUint8Array: () => base64ToUint8Array,
    base64urlToUint8Array: () => base64urlToUint8Array,
    cached: () => cached,
    captureStackTrace: () => captureStackTrace,
    cleanEnum: () => cleanEnum,
    cleanRegex: () => cleanRegex,
    clone: () => clone,
    cloneDef: () => cloneDef,
    createTransparentProxy: () => createTransparentProxy,
    defineLazy: () => defineLazy,
    esc: () => esc,
    escapeRegex: () => escapeRegex,
    extend: () => extend,
    finalizeIssue: () => finalizeIssue,
    floatSafeRemainder: () => floatSafeRemainder,
    getElementAtPath: () => getElementAtPath,
    getEnumValues: () => getEnumValues,
    getLengthableOrigin: () => getLengthableOrigin,
    getParsedType: () => getParsedType,
    getSizableOrigin: () => getSizableOrigin,
    hexToUint8Array: () => hexToUint8Array,
    isObject: () => isObject,
    isPlainObject: () => isPlainObject,
    issue: () => issue,
    joinValues: () => joinValues,
    jsonStringifyReplacer: () => jsonStringifyReplacer,
    merge: () => merge,
    mergeDefs: () => mergeDefs,
    normalizeParams: () => normalizeParams,
    nullish: () => nullish,
    numKeys: () => numKeys,
    objectClone: () => objectClone,
    omit: () => omit,
    optionalKeys: () => optionalKeys,
    partial: () => partial,
    pick: () => pick,
    prefixIssues: () => prefixIssues,
    primitiveTypes: () => primitiveTypes,
    promiseAllObject: () => promiseAllObject,
    propertyKeyTypes: () => propertyKeyTypes,
    randomString: () => randomString,
    required: () => required,
    safeExtend: () => safeExtend,
    shallowClone: () => shallowClone,
    stringifyPrimitive: () => stringifyPrimitive,
    uint8ArrayToBase64: () => uint8ArrayToBase64,
    uint8ArrayToBase64url: () => uint8ArrayToBase64url,
    uint8ArrayToHex: () => uint8ArrayToHex,
    unwrapMessage: () => unwrapMessage
  });
  function assertEqual(val) {
    return val;
  }
  function assertNotEqual(val) {
    return val;
  }
  function assertIs(_arg) {
  }
  function assertNever(_x) {
    throw new Error();
  }
  function assert(_) {
  }
  function getEnumValues(entries) {
    const numericValues = Object.values(entries).filter((v) => typeof v === "number");
    const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
    return values;
  }
  function joinValues(array2, separator = "|") {
    return array2.map((val) => stringifyPrimitive(val)).join(separator);
  }
  function jsonStringifyReplacer(_, value) {
    if (typeof value === "bigint")
      return value.toString();
    return value;
  }
  function cached(getter) {
    const set2 = false;
    return {
      get value() {
        if (!set2) {
          const value = getter();
          Object.defineProperty(this, "value", { value });
          return value;
        }
        throw new Error("cached value already set");
      }
    };
  }
  function nullish(input) {
    return input === null || input === void 0;
  }
  function cleanRegex(source) {
    const start = source.startsWith("^") ? 1 : 0;
    const end = source.endsWith("$") ? source.length - 1 : source.length;
    return source.slice(start, end);
  }
  function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepString = step.toString();
    let stepDecCount = (stepString.split(".")[1] || "").length;
    if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
      const match = stepString.match(/\d?e-(\d?)/);
      if (match == null ? void 0 : match[1]) {
        stepDecCount = Number.parseInt(match[1]);
      }
    }
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return valInt % stepInt / 10 ** decCount;
  }
  var EVALUATING = Symbol("evaluating");
  function defineLazy(object2, key, getter) {
    let value = void 0;
    Object.defineProperty(object2, key, {
      get() {
        if (value === EVALUATING) {
          return void 0;
        }
        if (value === void 0) {
          value = EVALUATING;
          value = getter();
        }
        return value;
      },
      set(v) {
        Object.defineProperty(object2, key, {
          value: v
          // configurable: true,
        });
      },
      configurable: true
    });
  }
  function objectClone(obj) {
    return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
  }
  function assignProp(target, prop, value) {
    Object.defineProperty(target, prop, {
      value,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
  function mergeDefs(...defs) {
    const mergedDescriptors = {};
    for (const def of defs) {
      const descriptors = Object.getOwnPropertyDescriptors(def);
      Object.assign(mergedDescriptors, descriptors);
    }
    return Object.defineProperties({}, mergedDescriptors);
  }
  function cloneDef(schema) {
    return mergeDefs(schema._zod.def);
  }
  function getElementAtPath(obj, path) {
    if (!path)
      return obj;
    return path.reduce((acc, key) => acc == null ? void 0 : acc[key], obj);
  }
  function promiseAllObject(promisesObj) {
    const keys = Object.keys(promisesObj);
    const promises = keys.map((key) => promisesObj[key]);
    return Promise.all(promises).then((results) => {
      const resolvedObj = {};
      for (let i = 0; i < keys.length; i++) {
        resolvedObj[keys[i]] = results[i];
      }
      return resolvedObj;
    });
  }
  function randomString(length = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let str = "";
    for (let i = 0; i < length; i++) {
      str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
  }
  function esc(str) {
    return JSON.stringify(str);
  }
  var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
  };
  function isObject(data) {
    return typeof data === "object" && data !== null && !Array.isArray(data);
  }
  var allowsEval = cached(() => {
    var _a;
    if (typeof navigator !== "undefined" && ((_a = navigator == null ? void 0 : navigator.userAgent) == null ? void 0 : _a.includes("Cloudflare"))) {
      return false;
    }
    try {
      const F = Function;
      new F("");
      return true;
    } catch (_) {
      return false;
    }
  });
  function isPlainObject(o) {
    if (isObject(o) === false)
      return false;
    const ctor = o.constructor;
    if (ctor === void 0)
      return true;
    const prot = ctor.prototype;
    if (isObject(prot) === false)
      return false;
    if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
      return false;
    }
    return true;
  }
  function shallowClone(o) {
    if (isPlainObject(o))
      return __spreadValues({}, o);
    if (Array.isArray(o))
      return [...o];
    return o;
  }
  function numKeys(data) {
    let keyCount = 0;
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        keyCount++;
      }
    }
    return keyCount;
  }
  var getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "undefined":
        return "undefined";
      case "string":
        return "string";
      case "number":
        return Number.isNaN(data) ? "nan" : "number";
      case "boolean":
        return "boolean";
      case "function":
        return "function";
      case "bigint":
        return "bigint";
      case "symbol":
        return "symbol";
      case "object":
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
          return "promise";
        }
        if (typeof Map !== "undefined" && data instanceof Map) {
          return "map";
        }
        if (typeof Set !== "undefined" && data instanceof Set) {
          return "set";
        }
        if (typeof Date !== "undefined" && data instanceof Date) {
          return "date";
        }
        if (typeof File !== "undefined" && data instanceof File) {
          return "file";
        }
        return "object";
      default:
        throw new Error(`Unknown data type: ${t}`);
    }
  };
  var propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
  var primitiveTypes = /* @__PURE__ */ new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function clone(inst, def, params) {
    const cl = new inst._zod.constr(def != null ? def : inst._zod.def);
    if (!def || (params == null ? void 0 : params.parent))
      cl._zod.parent = inst;
    return cl;
  }
  function normalizeParams(_params) {
    const params = _params;
    if (!params)
      return {};
    if (typeof params === "string")
      return { error: () => params };
    if ((params == null ? void 0 : params.message) !== void 0) {
      if ((params == null ? void 0 : params.error) !== void 0)
        throw new Error("Cannot specify both `message` and `error` params");
      params.error = params.message;
    }
    delete params.message;
    if (typeof params.error === "string")
      return __spreadProps(__spreadValues({}, params), { error: () => params.error });
    return params;
  }
  function createTransparentProxy(getter) {
    let target;
    return new Proxy({}, {
      get(_, prop, receiver) {
        target != null ? target : target = getter();
        return Reflect.get(target, prop, receiver);
      },
      set(_, prop, value, receiver) {
        target != null ? target : target = getter();
        return Reflect.set(target, prop, value, receiver);
      },
      has(_, prop) {
        target != null ? target : target = getter();
        return Reflect.has(target, prop);
      },
      deleteProperty(_, prop) {
        target != null ? target : target = getter();
        return Reflect.deleteProperty(target, prop);
      },
      ownKeys(_) {
        target != null ? target : target = getter();
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(_, prop) {
        target != null ? target : target = getter();
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
      defineProperty(_, prop, descriptor) {
        target != null ? target : target = getter();
        return Reflect.defineProperty(target, prop, descriptor);
      }
    });
  }
  function stringifyPrimitive(value) {
    if (typeof value === "bigint")
      return value.toString() + "n";
    if (typeof value === "string")
      return `"${value}"`;
    return `${value}`;
  }
  function optionalKeys(shape) {
    return Object.keys(shape).filter((k) => {
      return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
    });
  }
  var NUMBER_FORMAT_RANGES = {
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-34028234663852886e22, 34028234663852886e22],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
  };
  var BIGINT_FORMAT_RANGES = {
    int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
    uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
  };
  function pick(schema, mask) {
    const currDef = schema._zod.def;
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const newShape = {};
        for (const key in mask) {
          if (!(key in currDef.shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          newShape[key] = currDef.shape[key];
        }
        assignProp(this, "shape", newShape);
        return newShape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function omit(schema, mask) {
    const currDef = schema._zod.def;
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const newShape = __spreadValues({}, schema._zod.def.shape);
        for (const key in mask) {
          if (!(key in currDef.shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          delete newShape[key];
        }
        assignProp(this, "shape", newShape);
        return newShape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function extend(schema, shape) {
    if (!isPlainObject(shape)) {
      throw new Error("Invalid input to extend: expected a plain object");
    }
    const checks = schema._zod.def.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      throw new Error("Object schemas containing refinements cannot be extended. Use `.safeExtend()` instead.");
    }
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const _shape = __spreadValues(__spreadValues({}, schema._zod.def.shape), shape);
        assignProp(this, "shape", _shape);
        return _shape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function safeExtend(schema, shape) {
    if (!isPlainObject(shape)) {
      throw new Error("Invalid input to safeExtend: expected a plain object");
    }
    const def = __spreadProps(__spreadValues({}, schema._zod.def), {
      get shape() {
        const _shape = __spreadValues(__spreadValues({}, schema._zod.def.shape), shape);
        assignProp(this, "shape", _shape);
        return _shape;
      },
      checks: schema._zod.def.checks
    });
    return clone(schema, def);
  }
  function merge(a, b) {
    const def = mergeDefs(a._zod.def, {
      get shape() {
        const _shape = __spreadValues(__spreadValues({}, a._zod.def.shape), b._zod.def.shape);
        assignProp(this, "shape", _shape);
        return _shape;
      },
      get catchall() {
        return b._zod.def.catchall;
      },
      checks: []
      // delete existing checks
    });
    return clone(a, def);
  }
  function partial(Class2, schema, mask) {
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const oldShape = schema._zod.def.shape;
        const shape = __spreadValues({}, oldShape);
        if (mask) {
          for (const key in mask) {
            if (!(key in oldShape)) {
              throw new Error(`Unrecognized key: "${key}"`);
            }
            if (!mask[key])
              continue;
            shape[key] = Class2 ? new Class2({
              type: "optional",
              innerType: oldShape[key]
            }) : oldShape[key];
          }
        } else {
          for (const key in oldShape) {
            shape[key] = Class2 ? new Class2({
              type: "optional",
              innerType: oldShape[key]
            }) : oldShape[key];
          }
        }
        assignProp(this, "shape", shape);
        return shape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function required(Class2, schema, mask) {
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const oldShape = schema._zod.def.shape;
        const shape = __spreadValues({}, oldShape);
        if (mask) {
          for (const key in mask) {
            if (!(key in shape)) {
              throw new Error(`Unrecognized key: "${key}"`);
            }
            if (!mask[key])
              continue;
            shape[key] = new Class2({
              type: "nonoptional",
              innerType: oldShape[key]
            });
          }
        } else {
          for (const key in oldShape) {
            shape[key] = new Class2({
              type: "nonoptional",
              innerType: oldShape[key]
            });
          }
        }
        assignProp(this, "shape", shape);
        return shape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function aborted(x, startIndex = 0) {
    var _a;
    if (x.aborted === true)
      return true;
    for (let i = startIndex; i < x.issues.length; i++) {
      if (((_a = x.issues[i]) == null ? void 0 : _a.continue) !== true) {
        return true;
      }
    }
    return false;
  }
  function prefixIssues(path, issues) {
    return issues.map((iss) => {
      var _a2;
      var _a;
      (_a2 = (_a = iss).path) != null ? _a2 : _a.path = [];
      iss.path.unshift(path);
      return iss;
    });
  }
  function unwrapMessage(message) {
    return typeof message === "string" ? message : message == null ? void 0 : message.message;
  }
  function finalizeIssue(iss, ctx, config2) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const full = __spreadProps(__spreadValues({}, iss), { path: (_a = iss.path) != null ? _a : [] });
    if (!iss.message) {
      const message = (_k = (_j = (_h = (_f = unwrapMessage((_d = (_c = (_b = iss.inst) == null ? void 0 : _b._zod.def) == null ? void 0 : _c.error) == null ? void 0 : _d.call(_c, iss))) != null ? _f : unwrapMessage((_e = ctx == null ? void 0 : ctx.error) == null ? void 0 : _e.call(ctx, iss))) != null ? _h : unwrapMessage((_g = config2.customError) == null ? void 0 : _g.call(config2, iss))) != null ? _j : unwrapMessage((_i = config2.localeError) == null ? void 0 : _i.call(config2, iss))) != null ? _k : "Invalid input";
      full.message = message;
    }
    delete full.inst;
    delete full.continue;
    if (!(ctx == null ? void 0 : ctx.reportInput)) {
      delete full.input;
    }
    return full;
  }
  function getSizableOrigin(input) {
    if (input instanceof Set)
      return "set";
    if (input instanceof Map)
      return "map";
    if (input instanceof File)
      return "file";
    return "unknown";
  }
  function getLengthableOrigin(input) {
    if (Array.isArray(input))
      return "array";
    if (typeof input === "string")
      return "string";
    return "unknown";
  }
  function issue(...args) {
    const [iss, input, inst] = args;
    if (typeof iss === "string") {
      return {
        message: iss,
        code: "custom",
        input,
        inst
      };
    }
    return __spreadValues({}, iss);
  }
  function cleanEnum(obj) {
    return Object.entries(obj).filter(([k, _]) => {
      return Number.isNaN(Number.parseInt(k, 10));
    }).map((el) => el[1]);
  }
  function base64ToUint8Array(base643) {
    const binaryString = atob(base643);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  function uint8ArrayToBase64(bytes) {
    let binaryString = "";
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString);
  }
  function base64urlToUint8Array(base64url3) {
    const base643 = base64url3.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - base643.length % 4) % 4);
    return base64ToUint8Array(base643 + padding);
  }
  function uint8ArrayToBase64url(bytes) {
    return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  function hexToUint8Array(hex3) {
    const cleanHex = hex3.replace(/^0x/, "");
    if (cleanHex.length % 2 !== 0) {
      throw new Error("Invalid hex string length");
    }
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
    }
    return bytes;
  }
  function uint8ArrayToHex(bytes) {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  var Class = class {
    constructor(..._args) {
    }
  };

  // node_modules/zod/v4/core/errors.js
  var initializer = (inst, def) => {
    inst.name = "$ZodError";
    Object.defineProperty(inst, "_zod", {
      value: inst._zod,
      enumerable: false
    });
    Object.defineProperty(inst, "issues", {
      value: def,
      enumerable: false
    });
    inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
    Object.defineProperty(inst, "toString", {
      value: () => inst.message,
      enumerable: false
    });
  };
  var $ZodError = $constructor("$ZodError", initializer);
  var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
  function flattenError(error46, mapper = (issue2) => issue2.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of error46.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  function formatError(error46, mapper = (issue2) => issue2.message) {
    const fieldErrors = { _errors: [] };
    const processError = (error47) => {
      for (const issue2 of error47.issues) {
        if (issue2.code === "invalid_union" && issue2.errors.length) {
          issue2.errors.map((issues) => processError({ issues }));
        } else if (issue2.code === "invalid_key") {
          processError({ issues: issue2.issues });
        } else if (issue2.code === "invalid_element") {
          processError({ issues: issue2.issues });
        } else if (issue2.path.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue2.path.length) {
            const el = issue2.path[i];
            const terminal = i === issue2.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue2));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(error46);
    return fieldErrors;
  }
  function treeifyError(error46, mapper = (issue2) => issue2.message) {
    const result = { errors: [] };
    const processError = (error47, path = []) => {
      var _a2, _b2, _c, _d;
      var _a, _b;
      for (const issue2 of error47.issues) {
        if (issue2.code === "invalid_union" && issue2.errors.length) {
          issue2.errors.map((issues) => processError({ issues }, issue2.path));
        } else if (issue2.code === "invalid_key") {
          processError({ issues: issue2.issues }, issue2.path);
        } else if (issue2.code === "invalid_element") {
          processError({ issues: issue2.issues }, issue2.path);
        } else {
          const fullpath = [...path, ...issue2.path];
          if (fullpath.length === 0) {
            result.errors.push(mapper(issue2));
            continue;
          }
          let curr = result;
          let i = 0;
          while (i < fullpath.length) {
            const el = fullpath[i];
            const terminal = i === fullpath.length - 1;
            if (typeof el === "string") {
              (_a2 = curr.properties) != null ? _a2 : curr.properties = {};
              (_b2 = (_a = curr.properties)[el]) != null ? _b2 : _a[el] = { errors: [] };
              curr = curr.properties[el];
            } else {
              (_c = curr.items) != null ? _c : curr.items = [];
              (_d = (_b = curr.items)[el]) != null ? _d : _b[el] = { errors: [] };
              curr = curr.items[el];
            }
            if (terminal) {
              curr.errors.push(mapper(issue2));
            }
            i++;
          }
        }
      }
    };
    processError(error46);
    return result;
  }
  function toDotPath(_path) {
    const segs = [];
    const path = _path.map((seg) => typeof seg === "object" ? seg.key : seg);
    for (const seg of path) {
      if (typeof seg === "number")
        segs.push(`[${seg}]`);
      else if (typeof seg === "symbol")
        segs.push(`[${JSON.stringify(String(seg))}]`);
      else if (/[^\w$]/.test(seg))
        segs.push(`[${JSON.stringify(seg)}]`);
      else {
        if (segs.length)
          segs.push(".");
        segs.push(seg);
      }
    }
    return segs.join("");
  }
  function prettifyError(error46) {
    var _a;
    const lines = [];
    const issues = [...error46.issues].sort((a, b) => {
      var _a2, _b;
      return ((_a2 = a.path) != null ? _a2 : []).length - ((_b = b.path) != null ? _b : []).length;
    });
    for (const issue2 of issues) {
      lines.push(`\u2716 ${issue2.message}`);
      if ((_a = issue2.path) == null ? void 0 : _a.length)
        lines.push(`  \u2192 at ${toDotPath(issue2.path)}`);
    }
    return lines.join("\n");
  }

  // node_modules/zod/v4/core/parse.js
  var _parse = (_Err) => (schema, value, _ctx, _params) => {
    var _a;
    const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    if (result.issues.length) {
      const e = new ((_a = _params == null ? void 0 : _params.Err) != null ? _a : _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, _params == null ? void 0 : _params.callee);
      throw e;
    }
    return result.value;
  };
  var parse = /* @__PURE__ */ _parse($ZodRealError);
  var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
    var _a;
    const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    if (result.issues.length) {
      const e = new ((_a = params == null ? void 0 : params.Err) != null ? _a : _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, params == null ? void 0 : params.callee);
      throw e;
    }
    return result.value;
  };
  var parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
  var _safeParse = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? __spreadProps(__spreadValues({}, _ctx), { async: false }) : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    return result.issues.length ? {
      success: false,
      error: new (_Err != null ? _Err : $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    } : { success: true, data: result.value };
  };
  var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
  var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    return result.issues.length ? {
      success: false,
      error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    } : { success: true, data: result.value };
  };
  var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
  var _encode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _parse(_Err)(schema, value, ctx);
  };
  var encode = /* @__PURE__ */ _encode($ZodRealError);
  var _decode = (_Err) => (schema, value, _ctx) => {
    return _parse(_Err)(schema, value, _ctx);
  };
  var decode = /* @__PURE__ */ _decode($ZodRealError);
  var _encodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _parseAsync(_Err)(schema, value, ctx);
  };
  var encodeAsync = /* @__PURE__ */ _encodeAsync($ZodRealError);
  var _decodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _parseAsync(_Err)(schema, value, _ctx);
  };
  var decodeAsync = /* @__PURE__ */ _decodeAsync($ZodRealError);
  var _safeEncode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _safeParse(_Err)(schema, value, ctx);
  };
  var safeEncode = /* @__PURE__ */ _safeEncode($ZodRealError);
  var _safeDecode = (_Err) => (schema, value, _ctx) => {
    return _safeParse(_Err)(schema, value, _ctx);
  };
  var safeDecode = /* @__PURE__ */ _safeDecode($ZodRealError);
  var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _safeParseAsync(_Err)(schema, value, ctx);
  };
  var safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync($ZodRealError);
  var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _safeParseAsync(_Err)(schema, value, _ctx);
  };
  var safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync($ZodRealError);

  // node_modules/zod/v4/core/regexes.js
  var regexes_exports = {};
  __export(regexes_exports, {
    base64: () => base64,
    base64url: () => base64url,
    bigint: () => bigint,
    boolean: () => boolean,
    browserEmail: () => browserEmail,
    cidrv4: () => cidrv4,
    cidrv6: () => cidrv6,
    cuid: () => cuid,
    cuid2: () => cuid2,
    date: () => date,
    datetime: () => datetime,
    domain: () => domain,
    duration: () => duration,
    e164: () => e164,
    email: () => email,
    emoji: () => emoji,
    extendedDuration: () => extendedDuration,
    guid: () => guid,
    hex: () => hex,
    hostname: () => hostname,
    html5Email: () => html5Email,
    idnEmail: () => idnEmail,
    integer: () => integer,
    ipv4: () => ipv4,
    ipv6: () => ipv6,
    ksuid: () => ksuid,
    lowercase: () => lowercase,
    md5_base64: () => md5_base64,
    md5_base64url: () => md5_base64url,
    md5_hex: () => md5_hex,
    nanoid: () => nanoid,
    null: () => _null,
    number: () => number,
    rfc5322Email: () => rfc5322Email,
    sha1_base64: () => sha1_base64,
    sha1_base64url: () => sha1_base64url,
    sha1_hex: () => sha1_hex,
    sha256_base64: () => sha256_base64,
    sha256_base64url: () => sha256_base64url,
    sha256_hex: () => sha256_hex,
    sha384_base64: () => sha384_base64,
    sha384_base64url: () => sha384_base64url,
    sha384_hex: () => sha384_hex,
    sha512_base64: () => sha512_base64,
    sha512_base64url: () => sha512_base64url,
    sha512_hex: () => sha512_hex,
    string: () => string,
    time: () => time,
    ulid: () => ulid,
    undefined: () => _undefined,
    unicodeEmail: () => unicodeEmail,
    uppercase: () => uppercase,
    uuid: () => uuid,
    uuid4: () => uuid4,
    uuid6: () => uuid6,
    uuid7: () => uuid7,
    xid: () => xid
  });
  var cuid = /^[cC][^\s-]{8,}$/;
  var cuid2 = /^[0-9a-z]+$/;
  var ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
  var xid = /^[0-9a-vA-V]{20}$/;
  var ksuid = /^[A-Za-z0-9]{27}$/;
  var nanoid = /^[a-zA-Z0-9_-]{21}$/;
  var duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  var extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  var uuid = (version2) => {
    if (!version2)
      return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
    return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
  };
  var uuid4 = /* @__PURE__ */ uuid(4);
  var uuid6 = /* @__PURE__ */ uuid(6);
  var uuid7 = /* @__PURE__ */ uuid(7);
  var email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  var html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  var rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  var unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
  var idnEmail = unicodeEmail;
  var browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  var _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
  function emoji() {
    return new RegExp(_emoji, "u");
  }
  var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  var ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  var cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  var cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  var base64url = /^[A-Za-z0-9_-]*$/;
  var hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
  var domain = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  var e164 = /^\+(?:[0-9]){6,14}[0-9]$/;
  var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
  var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
  function timeSource(args) {
    const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
    const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
    return regex;
  }
  function time(args) {
    return new RegExp(`^${timeSource(args)}$`);
  }
  function datetime(args) {
    const time3 = timeSource({ precision: args.precision });
    const opts = ["Z"];
    if (args.local)
      opts.push("");
    if (args.offset)
      opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
    const timeRegex = `${time3}(?:${opts.join("|")})`;
    return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
  }
  var string = (params) => {
    var _a, _b;
    const regex = params ? `[\\s\\S]{${(_a = params == null ? void 0 : params.minimum) != null ? _a : 0},${(_b = params == null ? void 0 : params.maximum) != null ? _b : ""}}` : `[\\s\\S]*`;
    return new RegExp(`^${regex}$`);
  };
  var bigint = /^-?\d+n?$/;
  var integer = /^-?\d+$/;
  var number = /^-?\d+(?:\.\d+)?/;
  var boolean = /^(?:true|false)$/i;
  var _null = /^null$/i;
  var _undefined = /^undefined$/i;
  var lowercase = /^[^A-Z]*$/;
  var uppercase = /^[^a-z]*$/;
  var hex = /^[0-9a-fA-F]*$/;
  function fixedBase64(bodyLength, padding) {
    return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
  }
  function fixedBase64url(length) {
    return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
  }
  var md5_hex = /^[0-9a-fA-F]{32}$/;
  var md5_base64 = /* @__PURE__ */ fixedBase64(22, "==");
  var md5_base64url = /* @__PURE__ */ fixedBase64url(22);
  var sha1_hex = /^[0-9a-fA-F]{40}$/;
  var sha1_base64 = /* @__PURE__ */ fixedBase64(27, "=");
  var sha1_base64url = /* @__PURE__ */ fixedBase64url(27);
  var sha256_hex = /^[0-9a-fA-F]{64}$/;
  var sha256_base64 = /* @__PURE__ */ fixedBase64(43, "=");
  var sha256_base64url = /* @__PURE__ */ fixedBase64url(43);
  var sha384_hex = /^[0-9a-fA-F]{96}$/;
  var sha384_base64 = /* @__PURE__ */ fixedBase64(64, "");
  var sha384_base64url = /* @__PURE__ */ fixedBase64url(64);
  var sha512_hex = /^[0-9a-fA-F]{128}$/;
  var sha512_base64 = /* @__PURE__ */ fixedBase64(86, "==");
  var sha512_base64url = /* @__PURE__ */ fixedBase64url(86);

  // node_modules/zod/v4/core/checks.js
  var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
    var _a2, _b;
    var _a;
    (_a2 = inst._zod) != null ? _a2 : inst._zod = {};
    inst._zod.def = def;
    (_b = (_a = inst._zod).onattach) != null ? _b : _a.onattach = [];
  });
  var numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date"
  };
  var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      var _a;
      const bag = inst2._zod.bag;
      const curr = (_a = def.inclusive ? bag.maximum : bag.exclusiveMaximum) != null ? _a : Number.POSITIVE_INFINITY;
      if (def.value < curr) {
        if (def.inclusive)
          bag.maximum = def.value;
        else
          bag.exclusiveMaximum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      var _a;
      const bag = inst2._zod.bag;
      const curr = (_a = def.inclusive ? bag.minimum : bag.exclusiveMinimum) != null ? _a : Number.NEGATIVE_INFINITY;
      if (def.value > curr) {
        if (def.inclusive)
          bag.minimum = def.value;
        else
          bag.exclusiveMinimum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      var _a2;
      var _a;
      (_a2 = (_a = inst2._zod.bag).multipleOf) != null ? _a2 : _a.multipleOf = def.value;
    });
    inst._zod.check = (payload) => {
      if (typeof payload.value !== typeof def.value)
        throw new Error("Cannot mix number and bigint in multiple_of check.");
      const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
      if (isMultiple)
        return;
      payload.issues.push({
        origin: typeof payload.value,
        code: "not_multiple_of",
        divisor: def.value,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    def.format = def.format || "float64";
    const isInt = (_a = def.format) == null ? void 0 : _a.includes("int");
    const origin = isInt ? "int" : "number";
    const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      bag.minimum = minimum;
      bag.maximum = maximum;
      if (isInt)
        bag.pattern = integer;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (isInt) {
        if (!Number.isInteger(input)) {
          payload.issues.push({
            expected: origin,
            format: def.format,
            code: "invalid_type",
            continue: false,
            input,
            inst
          });
          return;
        }
        if (!Number.isSafeInteger(input)) {
          if (input > 0) {
            payload.issues.push({
              input,
              code: "too_big",
              maximum: Number.MAX_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              continue: !def.abort
            });
          } else {
            payload.issues.push({
              input,
              code: "too_small",
              minimum: Number.MIN_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              continue: !def.abort
            });
          }
          return;
        }
      }
      if (input < minimum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_big",
          maximum,
          inst
        });
      }
    };
  });
  var $ZodCheckBigIntFormat = /* @__PURE__ */ $constructor("$ZodCheckBigIntFormat", (inst, def) => {
    $ZodCheck.init(inst, def);
    const [minimum, maximum] = BIGINT_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      bag.minimum = minimum;
      bag.maximum = maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (input < minimum) {
        payload.issues.push({
          origin: "bigint",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "bigint",
          input,
          code: "too_big",
          maximum,
          inst
        });
      }
    };
  });
  var $ZodCheckMaxSize = /* @__PURE__ */ $constructor("$ZodCheckMaxSize", (inst, def) => {
    var _a2;
    var _a;
    $ZodCheck.init(inst, def);
    (_a2 = (_a = inst._zod.def).when) != null ? _a2 : _a.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.size !== void 0;
    };
    inst._zod.onattach.push((inst2) => {
      var _a3;
      const curr = (_a3 = inst2._zod.bag.maximum) != null ? _a3 : Number.POSITIVE_INFINITY;
      if (def.maximum < curr)
        inst2._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const size = input.size;
      if (size <= def.maximum)
        return;
      payload.issues.push({
        origin: getSizableOrigin(input),
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckMinSize = /* @__PURE__ */ $constructor("$ZodCheckMinSize", (inst, def) => {
    var _a2;
    var _a;
    $ZodCheck.init(inst, def);
    (_a2 = (_a = inst._zod.def).when) != null ? _a2 : _a.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.size !== void 0;
    };
    inst._zod.onattach.push((inst2) => {
      var _a3;
      const curr = (_a3 = inst2._zod.bag.minimum) != null ? _a3 : Number.NEGATIVE_INFINITY;
      if (def.minimum > curr)
        inst2._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const size = input.size;
      if (size >= def.minimum)
        return;
      payload.issues.push({
        origin: getSizableOrigin(input),
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckSizeEquals = /* @__PURE__ */ $constructor("$ZodCheckSizeEquals", (inst, def) => {
    var _a2;
    var _a;
    $ZodCheck.init(inst, def);
    (_a2 = (_a = inst._zod.def).when) != null ? _a2 : _a.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.size !== void 0;
    };
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.minimum = def.size;
      bag.maximum = def.size;
      bag.size = def.size;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const size = input.size;
      if (size === def.size)
        return;
      const tooBig = size > def.size;
      payload.issues.push(__spreadProps(__spreadValues({
        origin: getSizableOrigin(input)
      }, tooBig ? { code: "too_big", maximum: def.size } : { code: "too_small", minimum: def.size }), {
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      }));
    };
  });
  var $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
    var _a2;
    var _a;
    $ZodCheck.init(inst, def);
    (_a2 = (_a = inst._zod.def).when) != null ? _a2 : _a.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    };
    inst._zod.onattach.push((inst2) => {
      var _a3;
      const curr = (_a3 = inst2._zod.bag.maximum) != null ? _a3 : Number.POSITIVE_INFINITY;
      if (def.maximum < curr)
        inst2._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length <= def.maximum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
    var _a2;
    var _a;
    $ZodCheck.init(inst, def);
    (_a2 = (_a = inst._zod.def).when) != null ? _a2 : _a.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    };
    inst._zod.onattach.push((inst2) => {
      var _a3;
      const curr = (_a3 = inst2._zod.bag.minimum) != null ? _a3 : Number.NEGATIVE_INFINITY;
      if (def.minimum > curr)
        inst2._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length >= def.minimum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
    var _a2;
    var _a;
    $ZodCheck.init(inst, def);
    (_a2 = (_a = inst._zod.def).when) != null ? _a2 : _a.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    };
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.minimum = def.length;
      bag.maximum = def.length;
      bag.length = def.length;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length === def.length)
        return;
      const origin = getLengthableOrigin(input);
      const tooBig = length > def.length;
      payload.issues.push(__spreadProps(__spreadValues({
        origin
      }, tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length }), {
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      }));
    };
  });
  var $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
    var _a2, _b2;
    var _a, _b;
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      var _a3;
      const bag = inst2._zod.bag;
      bag.format = def.format;
      if (def.pattern) {
        (_a3 = bag.patterns) != null ? _a3 : bag.patterns = /* @__PURE__ */ new Set();
        bag.patterns.add(def.pattern);
      }
    });
    if (def.pattern)
      (_a2 = (_a = inst._zod).check) != null ? _a2 : _a.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
          return;
        payload.issues.push(__spreadProps(__spreadValues({
          origin: "string",
          code: "invalid_format",
          format: def.format,
          input: payload.value
        }, def.pattern ? { pattern: def.pattern.toString() } : {}), {
          inst,
          continue: !def.abort
        }));
      };
    else
      (_b2 = (_b = inst._zod).check) != null ? _b2 : _b.check = () => {
      };
  });
  var $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "regex",
        input: payload.value,
        pattern: def.pattern.toString(),
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = lowercase;
    $ZodCheckStringFormat.init(inst, def);
  });
  var $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = uppercase;
    $ZodCheckStringFormat.init(inst, def);
  });
  var $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
    $ZodCheck.init(inst, def);
    const escapedRegex = escapeRegex(def.includes);
    const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
    def.pattern = pattern;
    inst._zod.onattach.push((inst2) => {
      var _a;
      const bag = inst2._zod.bag;
      (_a = bag.patterns) != null ? _a : bag.patterns = /* @__PURE__ */ new Set();
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.includes(def.includes, def.position))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "includes",
        includes: def.includes,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
    (_a = def.pattern) != null ? _a : def.pattern = pattern;
    inst._zod.onattach.push((inst2) => {
      var _a2;
      const bag = inst2._zod.bag;
      (_a2 = bag.patterns) != null ? _a2 : bag.patterns = /* @__PURE__ */ new Set();
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.startsWith(def.prefix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "starts_with",
        prefix: def.prefix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
    var _a;
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
    (_a = def.pattern) != null ? _a : def.pattern = pattern;
    inst._zod.onattach.push((inst2) => {
      var _a2;
      const bag = inst2._zod.bag;
      (_a2 = bag.patterns) != null ? _a2 : bag.patterns = /* @__PURE__ */ new Set();
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.endsWith(def.suffix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "ends_with",
        suffix: def.suffix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  function handleCheckPropertyResult(result, payload, property) {
    if (result.issues.length) {
      payload.issues.push(...prefixIssues(property, result.issues));
    }
  }
  var $ZodCheckProperty = /* @__PURE__ */ $constructor("$ZodCheckProperty", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      const result = def.schema._zod.run({
        value: payload.value[def.property],
        issues: []
      }, {});
      if (result instanceof Promise) {
        return result.then((result2) => handleCheckPropertyResult(result2, payload, def.property));
      }
      handleCheckPropertyResult(result, payload, def.property);
      return;
    };
  });
  var $ZodCheckMimeType = /* @__PURE__ */ $constructor("$ZodCheckMimeType", (inst, def) => {
    $ZodCheck.init(inst, def);
    const mimeSet = new Set(def.mime);
    inst._zod.onattach.push((inst2) => {
      inst2._zod.bag.mime = def.mime;
    });
    inst._zod.check = (payload) => {
      if (mimeSet.has(payload.value.type))
        return;
      payload.issues.push({
        code: "invalid_value",
        values: def.mime,
        input: payload.value.type,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      payload.value = def.tx(payload.value);
    };
  });

  // node_modules/zod/v4/core/doc.js
  var Doc = class {
    constructor(args = []) {
      this.content = [];
      this.indent = 0;
      if (this)
        this.args = args;
    }
    indented(fn) {
      this.indent += 1;
      fn(this);
      this.indent -= 1;
    }
    write(arg) {
      if (typeof arg === "function") {
        arg(this, { execution: "sync" });
        arg(this, { execution: "async" });
        return;
      }
      const content = arg;
      const lines = content.split("\n").filter((x) => x);
      const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
      const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
      for (const line of dedented) {
        this.content.push(line);
      }
    }
    compile() {
      var _a;
      const F = Function;
      const args = this == null ? void 0 : this.args;
      const content = (_a = this == null ? void 0 : this.content) != null ? _a : [``];
      const lines = [...content.map((x) => `  ${x}`)];
      return new F(...args, lines.join("\n"));
    }
  };

  // node_modules/zod/v4/core/versions.js
  var version = {
    major: 4,
    minor: 1,
    patch: 12
  };

  // node_modules/zod/v4/core/schemas.js
  var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
    var _a2, _b, _c;
    var _a;
    inst != null ? inst : inst = {};
    inst._zod.def = def;
    inst._zod.bag = inst._zod.bag || {};
    inst._zod.version = version;
    const checks = [...(_a2 = inst._zod.def.checks) != null ? _a2 : []];
    if (inst._zod.traits.has("$ZodCheck")) {
      checks.unshift(inst);
    }
    for (const ch of checks) {
      for (const fn of ch._zod.onattach) {
        fn(inst);
      }
    }
    if (checks.length === 0) {
      (_b = (_a = inst._zod).deferred) != null ? _b : _a.deferred = [];
      (_c = inst._zod.deferred) == null ? void 0 : _c.push(() => {
        inst._zod.run = inst._zod.parse;
      });
    } else {
      const runChecks = (payload, checks2, ctx) => {
        let isAborted = aborted(payload);
        let asyncResult;
        for (const ch of checks2) {
          if (ch._zod.def.when) {
            const shouldRun = ch._zod.def.when(payload);
            if (!shouldRun)
              continue;
          } else if (isAborted) {
            continue;
          }
          const currLen = payload.issues.length;
          const _ = ch._zod.check(payload);
          if (_ instanceof Promise && (ctx == null ? void 0 : ctx.async) === false) {
            throw new $ZodAsyncError();
          }
          if (asyncResult || _ instanceof Promise) {
            asyncResult = (asyncResult != null ? asyncResult : Promise.resolve()).then(async () => {
              await _;
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                return;
              if (!isAborted)
                isAborted = aborted(payload, currLen);
            });
          } else {
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              continue;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          }
        }
        if (asyncResult) {
          return asyncResult.then(() => {
            return payload;
          });
        }
        return payload;
      };
      const handleCanaryResult = (canary, payload, ctx) => {
        if (aborted(canary)) {
          canary.aborted = true;
          return canary;
        }
        const checkResult = runChecks(payload, checks, ctx);
        if (checkResult instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError();
          return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
        }
        return inst._zod.parse(checkResult, ctx);
      };
      inst._zod.run = (payload, ctx) => {
        if (ctx.skipChecks) {
          return inst._zod.parse(payload, ctx);
        }
        if (ctx.direction === "backward") {
          const canary = inst._zod.parse({ value: payload.value, issues: [] }, __spreadProps(__spreadValues({}, ctx), { skipChecks: true }));
          if (canary instanceof Promise) {
            return canary.then((canary2) => {
              return handleCanaryResult(canary2, payload, ctx);
            });
          }
          return handleCanaryResult(canary, payload, ctx);
        }
        const result = inst._zod.parse(payload, ctx);
        if (result instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError();
          return result.then((result2) => runChecks(result2, checks, ctx));
        }
        return runChecks(result, checks, ctx);
      };
    }
    inst["~standard"] = {
      validate: (value) => {
        var _a3;
        try {
          const r = safeParse(inst, value);
          return r.success ? { value: r.data } : { issues: (_a3 = r.error) == null ? void 0 : _a3.issues };
        } catch (_) {
          return safeParseAsync(inst, value).then((r) => {
            var _a4;
            return r.success ? { value: r.data } : { issues: (_a4 = r.error) == null ? void 0 : _a4.issues };
          });
        }
      },
      vendor: "zod",
      version: 1
    };
  });
  var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
    var _a, _b, _c;
    $ZodType.init(inst, def);
    inst._zod.pattern = (_c = [...(_b = (_a = inst == null ? void 0 : inst._zod.bag) == null ? void 0 : _a.patterns) != null ? _b : []].pop()) != null ? _c : string(inst._zod.bag);
    inst._zod.parse = (payload, _) => {
      if (def.coerce)
        try {
          payload.value = String(payload.value);
        } catch (_2) {
        }
      if (typeof payload.value === "string")
        return payload;
      payload.issues.push({
        expected: "string",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  var $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    $ZodString.init(inst, def);
  });
  var $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = guid;
    $ZodStringFormat.init(inst, def);
  });
  var $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
    var _a, _b;
    if (def.version) {
      const versionMap = {
        v1: 1,
        v2: 2,
        v3: 3,
        v4: 4,
        v5: 5,
        v6: 6,
        v7: 7,
        v8: 8
      };
      const v = versionMap[def.version];
      if (v === void 0)
        throw new Error(`Invalid UUID version: "${def.version}"`);
      (_a = def.pattern) != null ? _a : def.pattern = uuid(v);
    } else
      (_b = def.pattern) != null ? _b : def.pattern = uuid();
    $ZodStringFormat.init(inst, def);
  });
  var $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = email;
    $ZodStringFormat.init(inst, def);
  });
  var $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      try {
        const trimmed = payload.value.trim();
        const url2 = new URL(trimmed);
        if (def.hostname) {
          def.hostname.lastIndex = 0;
          if (!def.hostname.test(url2.hostname)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid hostname",
              pattern: hostname.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.protocol) {
          def.protocol.lastIndex = 0;
          if (!def.protocol.test(url2.protocol.endsWith(":") ? url2.protocol.slice(0, -1) : url2.protocol)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid protocol",
              pattern: def.protocol.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.normalize) {
          payload.value = url2.href;
        } else {
          payload.value = trimmed;
        }
        return;
      } catch (_) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  var $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = emoji();
    $ZodStringFormat.init(inst, def);
  });
  var $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = nanoid;
    $ZodStringFormat.init(inst, def);
  });
  var $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = cuid;
    $ZodStringFormat.init(inst, def);
  });
  var $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = cuid2;
    $ZodStringFormat.init(inst, def);
  });
  var $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = ulid;
    $ZodStringFormat.init(inst, def);
  });
  var $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = xid;
    $ZodStringFormat.init(inst, def);
  });
  var $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = ksuid;
    $ZodStringFormat.init(inst, def);
  });
  var $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = datetime(def);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = date;
    $ZodStringFormat.init(inst, def);
  });
  var $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = time(def);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = duration;
    $ZodStringFormat.init(inst, def);
  });
  var $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = ipv4;
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = `ipv4`;
    });
  });
  var $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = ipv6;
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = `ipv6`;
    });
    inst._zod.check = (payload) => {
      try {
        new URL(`http://[${payload.value}]`);
      } catch (e) {
        payload.issues.push({
          code: "invalid_format",
          format: "ipv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  var $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = cidrv4;
    $ZodStringFormat.init(inst, def);
  });
  var $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = cidrv6;
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      const parts = payload.value.split("/");
      try {
        if (parts.length !== 2)
          throw new Error();
        const [address, prefix] = parts;
        if (!prefix)
          throw new Error();
        const prefixNum = Number(prefix);
        if (`${prefixNum}` !== prefix)
          throw new Error();
        if (prefixNum < 0 || prefixNum > 128)
          throw new Error();
        new URL(`http://[${address}]`);
      } catch (e) {
        payload.issues.push({
          code: "invalid_format",
          format: "cidrv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  function isValidBase64(data) {
    if (data === "")
      return true;
    if (data.length % 4 !== 0)
      return false;
    try {
      atob(data);
      return true;
    } catch (e) {
      return false;
    }
  }
  var $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = base64;
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      inst2._zod.bag.contentEncoding = "base64";
    });
    inst._zod.check = (payload) => {
      if (isValidBase64(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  function isValidBase64URL(data) {
    if (!base64url.test(data))
      return false;
    const base643 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
    const padded = base643.padEnd(Math.ceil(base643.length / 4) * 4, "=");
    return isValidBase64(padded);
  }
  var $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = base64url;
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      inst2._zod.bag.contentEncoding = "base64url";
    });
    inst._zod.check = (payload) => {
      if (isValidBase64URL(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
    var _a;
    (_a = def.pattern) != null ? _a : def.pattern = e164;
    $ZodStringFormat.init(inst, def);
  });
  function isValidJWT(token, algorithm = null) {
    try {
      const tokensParts = token.split(".");
      if (tokensParts.length !== 3)
        return false;
      const [header] = tokensParts;
      if (!header)
        return false;
      const parsedHeader = JSON.parse(atob(header));
      if ("typ" in parsedHeader && (parsedHeader == null ? void 0 : parsedHeader.typ) !== "JWT")
        return false;
      if (!parsedHeader.alg)
        return false;
      if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
        return false;
      return true;
    } catch (e) {
      return false;
    }
  }
  var $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidJWT(payload.value, def.alg))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "jwt",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCustomStringFormat = /* @__PURE__ */ $constructor("$ZodCustomStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (def.fn(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    var _a;
    $ZodType.init(inst, def);
    inst._zod.pattern = (_a = inst._zod.bag.pattern) != null ? _a : number;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Number(payload.value);
        } catch (_) {
        }
      const input = payload.value;
      if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
        return payload;
      }
      const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
      payload.issues.push(__spreadValues({
        expected: "number",
        code: "invalid_type",
        input,
        inst
      }, received ? { received } : {}));
      return payload;
    };
  });
  var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodCheckNumberFormat.init(inst, def);
    $ZodNumber.init(inst, def);
  });
  var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = boolean;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Boolean(payload.value);
        } catch (_) {
        }
      const input = payload.value;
      if (typeof input === "boolean")
        return payload;
      payload.issues.push({
        expected: "boolean",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = bigint;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = BigInt(payload.value);
        } catch (_) {
        }
      if (typeof payload.value === "bigint")
        return payload;
      payload.issues.push({
        expected: "bigint",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  var $ZodBigIntFormat = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
    $ZodCheckBigIntFormat.init(inst, def);
    $ZodBigInt.init(inst, def);
  });
  var $ZodSymbol = /* @__PURE__ */ $constructor("$ZodSymbol", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (typeof input === "symbol")
        return payload;
      payload.issues.push({
        expected: "symbol",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodUndefined = /* @__PURE__ */ $constructor("$ZodUndefined", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = _undefined;
    inst._zod.values = /* @__PURE__ */ new Set([void 0]);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (typeof input === "undefined")
        return payload;
      payload.issues.push({
        expected: "undefined",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = _null;
    inst._zod.values = /* @__PURE__ */ new Set([null]);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (input === null)
        return payload;
      payload.issues.push({
        expected: "null",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  var $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      payload.issues.push({
        expected: "never",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  var $ZodVoid = /* @__PURE__ */ $constructor("$ZodVoid", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (typeof input === "undefined")
        return payload;
      payload.issues.push({
        expected: "void",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodDate = /* @__PURE__ */ $constructor("$ZodDate", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce) {
        try {
          payload.value = new Date(payload.value);
        } catch (_err) {
        }
      }
      const input = payload.value;
      const isDate = input instanceof Date;
      const isValidDate = isDate && !Number.isNaN(input.getTime());
      if (isValidDate)
        return payload;
      payload.issues.push(__spreadProps(__spreadValues({
        expected: "date",
        code: "invalid_type",
        input
      }, isDate ? { received: "Invalid Date" } : {}), {
        inst
      }));
      return payload;
    };
  });
  function handleArrayResult(result, final, index) {
    if (result.issues.length) {
      final.issues.push(...prefixIssues(index, result.issues));
    }
    final.value[index] = result.value;
  }
  var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          expected: "array",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = Array(input.length);
      const proms = [];
      for (let i = 0; i < input.length; i++) {
        const item = input[i];
        const result = def.element._zod.run({
          value: item,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
        } else {
          handleArrayResult(result, payload, i);
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  function handlePropertyResult(result, final, key, input) {
    if (result.issues.length) {
      final.issues.push(...prefixIssues(key, result.issues));
    }
    if (result.value === void 0) {
      if (key in input) {
        final.value[key] = void 0;
      }
    } else {
      final.value[key] = result.value;
    }
  }
  function normalizeDef(def) {
    var _a, _b, _c, _d;
    const keys = Object.keys(def.shape);
    for (const k of keys) {
      if (!((_d = (_c = (_b = (_a = def.shape) == null ? void 0 : _a[k]) == null ? void 0 : _b._zod) == null ? void 0 : _c.traits) == null ? void 0 : _d.has("$ZodType"))) {
        throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
      }
    }
    const okeys = optionalKeys(def.shape);
    return __spreadProps(__spreadValues({}, def), {
      keys,
      keySet: new Set(keys),
      numKeys: keys.length,
      optionalKeys: new Set(okeys)
    });
  }
  function handleCatchall(proms, input, payload, ctx, def, inst) {
    const unrecognized = [];
    const keySet = def.keySet;
    const _catchall = def.catchall._zod;
    const t = _catchall.def.type;
    for (const key of Object.keys(input)) {
      if (keySet.has(key))
        continue;
      if (t === "never") {
        unrecognized.push(key);
        continue;
      }
      const r = _catchall.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input)));
      } else {
        handlePropertyResult(r, payload, key, input);
      }
    }
    if (unrecognized.length) {
      payload.issues.push({
        code: "unrecognized_keys",
        keys: unrecognized,
        input,
        inst
      });
    }
    if (!proms.length)
      return payload;
    return Promise.all(proms).then(() => {
      return payload;
    });
  }
  var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
    $ZodType.init(inst, def);
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    if (!(desc == null ? void 0 : desc.get)) {
      const sh = def.shape;
      Object.defineProperty(def, "shape", {
        get: () => {
          const newSh = __spreadValues({}, sh);
          Object.defineProperty(def, "shape", {
            value: newSh
          });
          return newSh;
        }
      });
    }
    const _normalized = cached(() => normalizeDef(def));
    defineLazy(inst._zod, "propValues", () => {
      var _a;
      const shape = def.shape;
      const propValues = {};
      for (const key in shape) {
        const field = shape[key]._zod;
        if (field.values) {
          (_a = propValues[key]) != null ? _a : propValues[key] = /* @__PURE__ */ new Set();
          for (const v of field.values)
            propValues[key].add(v);
        }
      }
      return propValues;
    });
    const isObject2 = isObject;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value != null ? value : value = _normalized.value;
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = {};
      const proms = [];
      const shape = value.shape;
      for (const key of value.keys) {
        const el = shape[key];
        const r = el._zod.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
          proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input)));
        } else {
          handlePropertyResult(r, payload, key, input);
        }
      }
      if (!catchall) {
        return proms.length ? Promise.all(proms).then(() => payload) : payload;
      }
      return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
    };
  });
  var $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
    $ZodObject.init(inst, def);
    const superParse = inst._zod.parse;
    const _normalized = cached(() => normalizeDef(def));
    const generateFastpass = (shape) => {
      const doc = new Doc(["shape", "payload", "ctx"]);
      const normalized = _normalized.value;
      const parseStr = (key) => {
        const k = esc(key);
        return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
      };
      doc.write(`const input = payload.value;`);
      const ids = /* @__PURE__ */ Object.create(null);
      let counter = 0;
      for (const key of normalized.keys) {
        ids[key] = `key_${counter++}`;
      }
      doc.write(`const newResult = {};`);
      for (const key of normalized.keys) {
        const id = ids[key];
        const k = esc(key);
        doc.write(`const ${id} = ${parseStr(key)};`);
        doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      }
      doc.write(`payload.value = newResult;`);
      doc.write(`return payload;`);
      const fn = doc.compile();
      return (payload, ctx) => fn(shape, payload, ctx);
    };
    let fastpass;
    const isObject2 = isObject;
    const jit = !globalConfig.jitless;
    const allowsEval2 = allowsEval;
    const fastEnabled = jit && allowsEval2.value;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value != null ? value : value = _normalized.value;
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      if (jit && fastEnabled && (ctx == null ? void 0 : ctx.async) === false && ctx.jitless !== true) {
        if (!fastpass)
          fastpass = generateFastpass(def.shape);
        payload = fastpass(payload, ctx);
        if (!catchall)
          return payload;
        return handleCatchall([], input, payload, ctx, value, inst);
      }
      return superParse(payload, ctx);
    };
  });
  function handleUnionResults(results, final, inst, ctx) {
    for (const result of results) {
      if (result.issues.length === 0) {
        final.value = result.value;
        return final;
      }
    }
    const nonaborted = results.filter((r) => !aborted(r));
    if (nonaborted.length === 1) {
      final.value = nonaborted[0].value;
      return nonaborted[0];
    }
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    });
    return final;
  }
  var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
    defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
    defineLazy(inst._zod, "values", () => {
      if (def.options.every((o) => o._zod.values)) {
        return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
      }
      return void 0;
    });
    defineLazy(inst._zod, "pattern", () => {
      if (def.options.every((o) => o._zod.pattern)) {
        const patterns = def.options.map((o) => o._zod.pattern);
        return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
      }
      return void 0;
    });
    const single = def.options.length === 1;
    const first = def.options[0]._zod.run;
    inst._zod.parse = (payload, ctx) => {
      if (single) {
        return first(payload, ctx);
      }
      let async = false;
      const results = [];
      for (const option of def.options) {
        const result = option._zod.run({
          value: payload.value,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else {
          if (result.issues.length === 0)
            return result;
          results.push(result);
        }
      }
      if (!async)
        return handleUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results2) => {
        return handleUnionResults(results2, payload, inst, ctx);
      });
    };
  });
  var $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    const _super = inst._zod.parse;
    defineLazy(inst._zod, "propValues", () => {
      const propValues = {};
      for (const option of def.options) {
        const pv = option._zod.propValues;
        if (!pv || Object.keys(pv).length === 0)
          throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
        for (const [k, v] of Object.entries(pv)) {
          if (!propValues[k])
            propValues[k] = /* @__PURE__ */ new Set();
          for (const val of v) {
            propValues[k].add(val);
          }
        }
      }
      return propValues;
    });
    const disc = cached(() => {
      var _a;
      const opts = def.options;
      const map2 = /* @__PURE__ */ new Map();
      for (const o of opts) {
        const values = (_a = o._zod.propValues) == null ? void 0 : _a[def.discriminator];
        if (!values || values.size === 0)
          throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
        for (const v of values) {
          if (map2.has(v)) {
            throw new Error(`Duplicate discriminator value "${String(v)}"`);
          }
          map2.set(v, o);
        }
      }
      return map2;
    });
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isObject(input)) {
        payload.issues.push({
          code: "invalid_type",
          expected: "object",
          input,
          inst
        });
        return payload;
      }
      const opt = disc.value.get(input == null ? void 0 : input[def.discriminator]);
      if (opt) {
        return opt._zod.run(payload, ctx);
      }
      if (def.unionFallback) {
        return _super(payload, ctx);
      }
      payload.issues.push({
        code: "invalid_union",
        errors: [],
        note: "No matching discriminator",
        discriminator: def.discriminator,
        input,
        path: [def.discriminator],
        inst
      });
      return payload;
    };
  });
  var $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      const left = def.left._zod.run({ value: input, issues: [] }, ctx);
      const right = def.right._zod.run({ value: input, issues: [] }, ctx);
      const async = left instanceof Promise || right instanceof Promise;
      if (async) {
        return Promise.all([left, right]).then(([left2, right2]) => {
          return handleIntersectionResults(payload, left2, right2);
        });
      }
      return handleIntersectionResults(payload, left, right);
    };
  });
  function mergeValues(a, b) {
    if (a === b) {
      return { valid: true, data: a };
    }
    if (a instanceof Date && b instanceof Date && +a === +b) {
      return { valid: true, data: a };
    }
    if (isPlainObject(a) && isPlainObject(b)) {
      const bKeys = Object.keys(b);
      const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
      const newObj = __spreadValues(__spreadValues({}, a), b);
      for (const key of sharedKeys) {
        const sharedValue = mergeValues(a[key], b[key]);
        if (!sharedValue.valid) {
          return {
            valid: false,
            mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
          };
        }
        newObj[key] = sharedValue.data;
      }
      return { valid: true, data: newObj };
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return { valid: false, mergeErrorPath: [] };
      }
      const newArray = [];
      for (let index = 0; index < a.length; index++) {
        const itemA = a[index];
        const itemB = b[index];
        const sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid) {
          return {
            valid: false,
            mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
          };
        }
        newArray.push(sharedValue.data);
      }
      return { valid: true, data: newArray };
    }
    return { valid: false, mergeErrorPath: [] };
  }
  function handleIntersectionResults(result, left, right) {
    if (left.issues.length) {
      result.issues.push(...left.issues);
    }
    if (right.issues.length) {
      result.issues.push(...right.issues);
    }
    if (aborted(result))
      return result;
    const merged = mergeValues(left.value, right.value);
    if (!merged.valid) {
      throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
    }
    result.value = merged.data;
    return result;
  }
  var $ZodTuple = /* @__PURE__ */ $constructor("$ZodTuple", (inst, def) => {
    $ZodType.init(inst, def);
    const items = def.items;
    const optStart = items.length - [...items].reverse().findIndex((item) => item._zod.optin !== "optional");
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          input,
          inst,
          expected: "tuple",
          code: "invalid_type"
        });
        return payload;
      }
      payload.value = [];
      const proms = [];
      if (!def.rest) {
        const tooBig = input.length > items.length;
        const tooSmall = input.length < optStart - 1;
        if (tooBig || tooSmall) {
          payload.issues.push(__spreadProps(__spreadValues({}, tooBig ? { code: "too_big", maximum: items.length } : { code: "too_small", minimum: items.length }), {
            input,
            inst,
            origin: "array"
          }));
          return payload;
        }
      }
      let i = -1;
      for (const item of items) {
        i++;
        if (i >= input.length) {
          if (i >= optStart)
            continue;
        }
        const result = item._zod.run({
          value: input[i],
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleTupleResult(result2, payload, i)));
        } else {
          handleTupleResult(result, payload, i);
        }
      }
      if (def.rest) {
        const rest = input.slice(items.length);
        for (const el of rest) {
          i++;
          const result = def.rest._zod.run({
            value: el,
            issues: []
          }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => handleTupleResult(result2, payload, i)));
          } else {
            handleTupleResult(result, payload, i);
          }
        }
      }
      if (proms.length)
        return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  function handleTupleResult(result, final, index) {
    if (result.issues.length) {
      final.issues.push(...prefixIssues(index, result.issues));
    }
    final.value[index] = result.value;
  }
  var $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isPlainObject(input)) {
        payload.issues.push({
          expected: "record",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      if (def.keyType._zod.values) {
        const values = def.keyType._zod.values;
        payload.value = {};
        for (const key of values) {
          if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
            const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
            if (result instanceof Promise) {
              proms.push(result.then((result2) => {
                if (result2.issues.length) {
                  payload.issues.push(...prefixIssues(key, result2.issues));
                }
                payload.value[key] = result2.value;
              }));
            } else {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[key] = result.value;
            }
          }
        }
        let unrecognized;
        for (const key in input) {
          if (!values.has(key)) {
            unrecognized = unrecognized != null ? unrecognized : [];
            unrecognized.push(key);
          }
        }
        if (unrecognized && unrecognized.length > 0) {
          payload.issues.push({
            code: "unrecognized_keys",
            input,
            inst,
            keys: unrecognized
          });
        }
      } else {
        payload.value = {};
        for (const key of Reflect.ownKeys(input)) {
          if (key === "__proto__")
            continue;
          const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (keyResult.issues.length) {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key,
              path: [key],
              inst
            });
            payload.value[keyResult.value] = keyResult.value;
            continue;
          }
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[keyResult.value] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[keyResult.value] = result.value;
          }
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  var $ZodMap = /* @__PURE__ */ $constructor("$ZodMap", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!(input instanceof Map)) {
        payload.issues.push({
          expected: "map",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      payload.value = /* @__PURE__ */ new Map();
      for (const [key, value] of input) {
        const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        const valueResult = def.valueType._zod.run({ value, issues: [] }, ctx);
        if (keyResult instanceof Promise || valueResult instanceof Promise) {
          proms.push(Promise.all([keyResult, valueResult]).then(([keyResult2, valueResult2]) => {
            handleMapResult(keyResult2, valueResult2, payload, key, input, inst, ctx);
          }));
        } else {
          handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
        }
      }
      if (proms.length)
        return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
    if (keyResult.issues.length) {
      if (propertyKeyTypes.has(typeof key)) {
        final.issues.push(...prefixIssues(key, keyResult.issues));
      } else {
        final.issues.push({
          code: "invalid_key",
          origin: "map",
          input,
          inst,
          issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        });
      }
    }
    if (valueResult.issues.length) {
      if (propertyKeyTypes.has(typeof key)) {
        final.issues.push(...prefixIssues(key, valueResult.issues));
      } else {
        final.issues.push({
          origin: "map",
          code: "invalid_element",
          input,
          inst,
          key,
          issues: valueResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        });
      }
    }
    final.value.set(keyResult.value, valueResult.value);
  }
  var $ZodSet = /* @__PURE__ */ $constructor("$ZodSet", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!(input instanceof Set)) {
        payload.issues.push({
          input,
          inst,
          expected: "set",
          code: "invalid_type"
        });
        return payload;
      }
      const proms = [];
      payload.value = /* @__PURE__ */ new Set();
      for (const item of input) {
        const result = def.valueType._zod.run({ value: item, issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleSetResult(result2, payload)));
        } else
          handleSetResult(result, payload);
      }
      if (proms.length)
        return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  function handleSetResult(result, final) {
    if (result.issues.length) {
      final.issues.push(...result.issues);
    }
    final.value.add(result.value);
  }
  var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
    $ZodType.init(inst, def);
    const values = getEnumValues(def.entries);
    const valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (valuesSet.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values,
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    if (def.values.length === 0) {
      throw new Error("Cannot create literal schema with no valid values");
    }
    inst._zod.values = new Set(def.values);
    inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (inst._zod.values.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values: def.values,
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodFile = /* @__PURE__ */ $constructor("$ZodFile", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (input instanceof File)
        return payload;
      payload.issues.push({
        expected: "file",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      const _out = def.transform(payload.value, payload);
      if (ctx.async) {
        const output = _out instanceof Promise ? _out : Promise.resolve(_out);
        return output.then((output2) => {
          payload.value = output2;
          return payload;
        });
      }
      if (_out instanceof Promise) {
        throw new $ZodAsyncError();
      }
      payload.value = _out;
      return payload;
    };
  });
  function handleOptionalResult(result, input) {
    if (result.issues.length && input === void 0) {
      return { issues: [], value: void 0 };
    }
    return result;
  }
  var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
    });
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      if (def.innerType._zod.optin === "optional") {
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise)
          return result.then((r) => handleOptionalResult(r, payload.value));
        return handleOptionalResult(result, payload.value);
      }
      if (payload.value === void 0) {
        return payload;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  var $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
    });
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === null)
        return payload;
      return def.innerType._zod.run(payload, ctx);
    };
  });
  var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === void 0) {
        payload.value = def.defaultValue;
        return payload;
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleDefaultResult(result2, def));
      }
      return handleDefaultResult(result, def);
    };
  });
  function handleDefaultResult(payload, def) {
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return payload;
  }
  var $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === void 0) {
        payload.value = def.defaultValue;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  var $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => {
      const v = def.innerType._zod.values;
      return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleNonOptionalResult(result2, inst));
      }
      return handleNonOptionalResult(result, inst);
    };
  });
  function handleNonOptionalResult(payload, inst) {
    if (!payload.issues.length && payload.value === void 0) {
      payload.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: payload.value,
        inst
      });
    }
    return payload;
  }
  var $ZodSuccess = /* @__PURE__ */ $constructor("$ZodSuccess", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError("ZodSuccess");
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => {
          payload.value = result2.issues.length === 0;
          return payload;
        });
      }
      payload.value = result.issues.length === 0;
      return payload;
    };
  });
  var $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => {
          payload.value = result2.value;
          if (result2.issues.length) {
            payload.value = def.catchValue(__spreadProps(__spreadValues({}, payload), {
              error: {
                issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
              },
              input: payload.value
            }));
            payload.issues = [];
          }
          return payload;
        });
      }
      payload.value = result.value;
      if (result.issues.length) {
        payload.value = def.catchValue(__spreadProps(__spreadValues({}, payload), {
          error: {
            issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
          },
          input: payload.value
        }));
        payload.issues = [];
      }
      return payload;
    };
  });
  var $ZodNaN = /* @__PURE__ */ $constructor("$ZodNaN", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
        payload.issues.push({
          input: payload.value,
          inst,
          expected: "nan",
          code: "invalid_type"
        });
        return payload;
      }
      return payload;
    };
  });
  var $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right2) => handlePipeResult(right2, def.in, ctx));
        }
        return handlePipeResult(right, def.in, ctx);
      }
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left2) => handlePipeResult(left2, def.out, ctx));
      }
      return handlePipeResult(left, def.out, ctx);
    };
  });
  function handlePipeResult(left, next, ctx) {
    if (left.issues.length) {
      left.aborted = true;
      return left;
    }
    return next._zod.run({ value: left.value, issues: left.issues }, ctx);
  }
  var $ZodCodec = /* @__PURE__ */ $constructor("$ZodCodec", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      const direction = ctx.direction || "forward";
      if (direction === "forward") {
        const left = def.in._zod.run(payload, ctx);
        if (left instanceof Promise) {
          return left.then((left2) => handleCodecAResult(left2, def, ctx));
        }
        return handleCodecAResult(left, def, ctx);
      } else {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right2) => handleCodecAResult(right2, def, ctx));
        }
        return handleCodecAResult(right, def, ctx);
      }
    };
  });
  function handleCodecAResult(result, def, ctx) {
    if (result.issues.length) {
      result.aborted = true;
      return result;
    }
    const direction = ctx.direction || "forward";
    if (direction === "forward") {
      const transformed = def.transform(result.value, result);
      if (transformed instanceof Promise) {
        return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
      }
      return handleCodecTxResult(result, transformed, def.out, ctx);
    } else {
      const transformed = def.reverseTransform(result.value, result);
      if (transformed instanceof Promise) {
        return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
      }
      return handleCodecTxResult(result, transformed, def.in, ctx);
    }
  }
  function handleCodecTxResult(left, value, nextSchema, ctx) {
    if (left.issues.length) {
      left.aborted = true;
      return left;
    }
    return nextSchema._zod.run({ value, issues: left.issues }, ctx);
  }
  var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then(handleReadonlyResult);
      }
      return handleReadonlyResult(result);
    };
  });
  function handleReadonlyResult(payload) {
    payload.value = Object.freeze(payload.value);
    return payload;
  }
  var $ZodTemplateLiteral = /* @__PURE__ */ $constructor("$ZodTemplateLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    const regexParts = [];
    for (const part of def.parts) {
      if (typeof part === "object" && part !== null) {
        if (!part._zod.pattern) {
          throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
        }
        const source = part._zod.pattern instanceof RegExp ? part._zod.pattern.source : part._zod.pattern;
        if (!source)
          throw new Error(`Invalid template literal part: ${part._zod.traits}`);
        const start = source.startsWith("^") ? 1 : 0;
        const end = source.endsWith("$") ? source.length - 1 : source.length;
        regexParts.push(source.slice(start, end));
      } else if (part === null || primitiveTypes.has(typeof part)) {
        regexParts.push(escapeRegex(`${part}`));
      } else {
        throw new Error(`Invalid template literal part: ${part}`);
      }
    }
    inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
    inst._zod.parse = (payload, _ctx) => {
      var _a;
      if (typeof payload.value !== "string") {
        payload.issues.push({
          input: payload.value,
          inst,
          expected: "template_literal",
          code: "invalid_type"
        });
        return payload;
      }
      inst._zod.pattern.lastIndex = 0;
      if (!inst._zod.pattern.test(payload.value)) {
        payload.issues.push({
          input: payload.value,
          inst,
          code: "invalid_format",
          format: (_a = def.format) != null ? _a : "template_literal",
          pattern: inst._zod.pattern.source
        });
        return payload;
      }
      return payload;
    };
  });
  var $ZodFunction = /* @__PURE__ */ $constructor("$ZodFunction", (inst, def) => {
    $ZodType.init(inst, def);
    inst._def = def;
    inst._zod.def = def;
    inst.implement = (func) => {
      if (typeof func !== "function") {
        throw new Error("implement() must be called with a function");
      }
      return function(...args) {
        const parsedArgs = inst._def.input ? parse(inst._def.input, args) : args;
        const result = Reflect.apply(func, this, parsedArgs);
        if (inst._def.output) {
          return parse(inst._def.output, result);
        }
        return result;
      };
    };
    inst.implementAsync = (func) => {
      if (typeof func !== "function") {
        throw new Error("implementAsync() must be called with a function");
      }
      return async function(...args) {
        const parsedArgs = inst._def.input ? await parseAsync(inst._def.input, args) : args;
        const result = await Reflect.apply(func, this, parsedArgs);
        if (inst._def.output) {
          return await parseAsync(inst._def.output, result);
        }
        return result;
      };
    };
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "function") {
        payload.issues.push({
          code: "invalid_type",
          expected: "function",
          input: payload.value,
          inst
        });
        return payload;
      }
      const hasPromiseOutput = inst._def.output && inst._def.output._zod.def.type === "promise";
      if (hasPromiseOutput) {
        payload.value = inst.implementAsync(payload.value);
      } else {
        payload.value = inst.implement(payload.value);
      }
      return payload;
    };
    inst.input = (...args) => {
      const F = inst.constructor;
      if (Array.isArray(args[0])) {
        return new F({
          type: "function",
          input: new $ZodTuple({
            type: "tuple",
            items: args[0],
            rest: args[1]
          }),
          output: inst._def.output
        });
      }
      return new F({
        type: "function",
        input: args[0],
        output: inst._def.output
      });
    };
    inst.output = (output) => {
      const F = inst.constructor;
      return new F({
        type: "function",
        input: inst._def.input,
        output
      });
    };
    return inst;
  });
  var $ZodPromise = /* @__PURE__ */ $constructor("$ZodPromise", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({ value: inner, issues: [] }, ctx));
    };
  });
  var $ZodLazy = /* @__PURE__ */ $constructor("$ZodLazy", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "innerType", () => def.getter());
    defineLazy(inst._zod, "pattern", () => inst._zod.innerType._zod.pattern);
    defineLazy(inst._zod, "propValues", () => inst._zod.innerType._zod.propValues);
    defineLazy(inst._zod, "optin", () => {
      var _a;
      return (_a = inst._zod.innerType._zod.optin) != null ? _a : void 0;
    });
    defineLazy(inst._zod, "optout", () => {
      var _a;
      return (_a = inst._zod.innerType._zod.optout) != null ? _a : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      const inner = inst._zod.innerType;
      return inner._zod.run(payload, ctx);
    };
  });
  var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
    $ZodCheck.init(inst, def);
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => {
      return payload;
    };
    inst._zod.check = (payload) => {
      const input = payload.value;
      const r = def.fn(input);
      if (r instanceof Promise) {
        return r.then((r2) => handleRefineResult(r2, payload, input, inst));
      }
      handleRefineResult(r, payload, input, inst);
      return;
    };
  });
  function handleRefineResult(result, payload, input, inst) {
    var _a;
    if (!result) {
      const _iss = {
        code: "custom",
        input,
        inst,
        // incorporates params.error into issue reporting
        path: [...(_a = inst._zod.def.path) != null ? _a : []],
        // incorporates params.error into issue reporting
        continue: !inst._zod.def.abort
        // params: inst._zod.def.params,
      };
      if (inst._zod.def.params)
        _iss.params = inst._zod.def.params;
      payload.issues.push(issue(_iss));
    }
  }

  // node_modules/zod/v4/locales/index.js
  var locales_exports = {};
  __export(locales_exports, {
    ar: () => ar_default,
    az: () => az_default,
    be: () => be_default,
    bg: () => bg_default,
    ca: () => ca_default,
    cs: () => cs_default,
    da: () => da_default,
    de: () => de_default,
    en: () => en_default,
    eo: () => eo_default,
    es: () => es_default,
    fa: () => fa_default,
    fi: () => fi_default,
    fr: () => fr_default,
    frCA: () => fr_CA_default,
    he: () => he_default,
    hu: () => hu_default,
    id: () => id_default,
    is: () => is_default,
    it: () => it_default,
    ja: () => ja_default,
    ka: () => ka_default,
    kh: () => kh_default,
    km: () => km_default,
    ko: () => ko_default,
    lt: () => lt_default,
    mk: () => mk_default,
    ms: () => ms_default,
    nl: () => nl_default,
    no: () => no_default,
    ota: () => ota_default,
    pl: () => pl_default,
    ps: () => ps_default,
    pt: () => pt_default,
    ru: () => ru_default,
    sl: () => sl_default,
    sv: () => sv_default,
    ta: () => ta_default,
    th: () => th_default,
    tr: () => tr_default,
    ua: () => ua_default,
    uk: () => uk_default,
    ur: () => ur_default,
    vi: () => vi_default,
    yo: () => yo_default,
    zhCN: () => zh_CN_default,
    zhTW: () => zh_TW_default
  });

  // node_modules/zod/v4/locales/ar.js
  var error = () => {
    const Sizable = {
      string: { unit: "\u062D\u0631\u0641", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
      file: { unit: "\u0628\u0627\u064A\u062A", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
      array: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
      set: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u0645\u062F\u062E\u0644",
      email: "\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
      url: "\u0631\u0627\u0628\u0637",
      emoji: "\u0625\u064A\u0645\u0648\u062C\u064A",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u062A\u0627\u0631\u064A\u062E \u0648\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
      date: "\u062A\u0627\u0631\u064A\u062E \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
      time: "\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
      duration: "\u0645\u062F\u0629 \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
      ipv4: "\u0639\u0646\u0648\u0627\u0646 IPv4",
      ipv6: "\u0639\u0646\u0648\u0627\u0646 IPv6",
      cidrv4: "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv4",
      cidrv6: "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv6",
      base64: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64-encoded",
      base64url: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64url-encoded",
      json_string: "\u0646\u064E\u0635 \u0639\u0644\u0649 \u0647\u064A\u0626\u0629 JSON",
      e164: "\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0628\u0645\u0639\u064A\u0627\u0631 E.164",
      jwt: "JWT",
      template_literal: "\u0645\u062F\u062E\u0644"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${issue2.expected}\u060C \u0648\u0644\u0643\u0646 \u062A\u0645 \u0625\u062F\u062E\u0627\u0644 ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${stringifyPrimitive(issue2.values[0])}`;
          return `\u0627\u062E\u062A\u064A\u0627\u0631 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062A\u0648\u0642\u0639 \u0627\u0646\u062A\u0642\u0627\u0621 \u0623\u062D\u062F \u0647\u0630\u0647 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A: ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return ` \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${(_a = issue2.origin) != null ? _a : "\u0627\u0644\u0642\u064A\u0645\u0629"} ${adj} ${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\u0639\u0646\u0635\u0631"}`;
          return `\u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${(_c = issue2.origin) != null ? _c : "\u0627\u0644\u0642\u064A\u0645\u0629"} ${adj} ${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${issue2.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${issue2.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${adj} ${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0628\u062F\u0623 \u0628\u0640 "${issue2.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0646\u062A\u0647\u064A \u0628\u0640 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u062A\u0636\u0645\u0651\u064E\u0646 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u0646\u0645\u0637 ${_issue.pattern}`;
          return `${(_d = Nouns[_issue.format]) != null ? _d : issue2.format} \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644`;
        }
        case "not_multiple_of":
          return `\u0631\u0642\u0645 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0646 \u0645\u0636\u0627\u0639\u0641\u0627\u062A ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u0645\u0639\u0631\u0641${issue2.keys.length > 1 ? "\u0627\u062A" : ""} \u063A\u0631\u064A\u0628${issue2.keys.length > 1 ? "\u0629" : ""}: ${joinValues(issue2.keys, "\u060C ")}`;
        case "invalid_key":
          return `\u0645\u0639\u0631\u0641 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${issue2.origin}`;
        case "invalid_union":
          return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
        case "invalid_element":
          return `\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${issue2.origin}`;
        default:
          return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
      }
    };
  };
  function ar_default() {
    return {
      localeError: error()
    };
  }

  // node_modules/zod/v4/locales/az.js
  var error2 = () => {
    const Sizable = {
      string: { unit: "simvol", verb: "olmal\u0131d\u0131r" },
      file: { unit: "bayt", verb: "olmal\u0131d\u0131r" },
      array: { unit: "element", verb: "olmal\u0131d\u0131r" },
      set: { unit: "element", verb: "olmal\u0131d\u0131r" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "input",
      email: "email address",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO datetime",
      date: "ISO date",
      time: "ISO time",
      duration: "ISO duration",
      ipv4: "IPv4 address",
      ipv6: "IPv6 address",
      cidrv4: "IPv4 range",
      cidrv6: "IPv6 range",
      base64: "base64-encoded string",
      base64url: "base64url-encoded string",
      json_string: "JSON string",
      e164: "E.164 number",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${issue2.expected}, daxil olan ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${stringifyPrimitive(issue2.values[0])}`;
          return `Yanl\u0131\u015F se\xE7im: a\u015Fa\u011F\u0131dak\u0131lardan biri olmal\u0131d\u0131r: ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${(_a = issue2.origin) != null ? _a : "d\u0259y\u0259r"} ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "element"}`;
          return `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${(_c = issue2.origin) != null ? _c : "d\u0259y\u0259r"} ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          return `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Yanl\u0131\u015F m\u0259tn: "${_issue.prefix}" il\u0259 ba\u015Flamal\u0131d\u0131r`;
          if (_issue.format === "ends_with")
            return `Yanl\u0131\u015F m\u0259tn: "${_issue.suffix}" il\u0259 bitm\u0259lidir`;
          if (_issue.format === "includes")
            return `Yanl\u0131\u015F m\u0259tn: "${_issue.includes}" daxil olmal\u0131d\u0131r`;
          if (_issue.format === "regex")
            return `Yanl\u0131\u015F m\u0259tn: ${_issue.pattern} \u015Fablonuna uy\u011Fun olmal\u0131d\u0131r`;
          return `Yanl\u0131\u015F ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `Yanl\u0131\u015F \u0259d\u0259d: ${issue2.divisor} il\u0259 b\xF6l\xFCn\u0259 bil\u0259n olmal\u0131d\u0131r`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan a\xE7ar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `${issue2.origin} daxilind\u0259 yanl\u0131\u015F a\xE7ar`;
        case "invalid_union":
          return "Yanl\u0131\u015F d\u0259y\u0259r";
        case "invalid_element":
          return `${issue2.origin} daxilind\u0259 yanl\u0131\u015F d\u0259y\u0259r`;
        default:
          return `Yanl\u0131\u015F d\u0259y\u0259r`;
      }
    };
  };
  function az_default() {
    return {
      localeError: error2()
    };
  }

  // node_modules/zod/v4/locales/be.js
  function getBelarusianPlural(count, one, few, many) {
    const absCount = Math.abs(count);
    const lastDigit = absCount % 10;
    const lastTwoDigits = absCount % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return many;
    }
    if (lastDigit === 1) {
      return one;
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
      return few;
    }
    return many;
  }
  var error3 = () => {
    const Sizable = {
      string: {
        unit: {
          one: "\u0441\u0456\u043C\u0432\u0430\u043B",
          few: "\u0441\u0456\u043C\u0432\u0430\u043B\u044B",
          many: "\u0441\u0456\u043C\u0432\u0430\u043B\u0430\u045E"
        },
        verb: "\u043C\u0435\u0446\u044C"
      },
      array: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E"
        },
        verb: "\u043C\u0435\u0446\u044C"
      },
      set: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E"
        },
        verb: "\u043C\u0435\u0446\u044C"
      },
      file: {
        unit: {
          one: "\u0431\u0430\u0439\u0442",
          few: "\u0431\u0430\u0439\u0442\u044B",
          many: "\u0431\u0430\u0439\u0442\u0430\u045E"
        },
        verb: "\u043C\u0435\u0446\u044C"
      }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u043B\u0456\u043A";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u043C\u0430\u0441\u0456\u045E";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u0443\u0432\u043E\u0434",
      email: "email \u0430\u0434\u0440\u0430\u0441",
      url: "URL",
      emoji: "\u044D\u043C\u043E\u0434\u0437\u0456",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \u0434\u0430\u0442\u0430 \u0456 \u0447\u0430\u0441",
      date: "ISO \u0434\u0430\u0442\u0430",
      time: "ISO \u0447\u0430\u0441",
      duration: "ISO \u043F\u0440\u0430\u0446\u044F\u0433\u043B\u0430\u0441\u0446\u044C",
      ipv4: "IPv4 \u0430\u0434\u0440\u0430\u0441",
      ipv6: "IPv6 \u0430\u0434\u0440\u0430\u0441",
      cidrv4: "IPv4 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D",
      cidrv6: "IPv6 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D",
      base64: "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64",
      base64url: "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64url",
      json_string: "JSON \u0440\u0430\u0434\u043E\u043A",
      e164: "\u043D\u0443\u043C\u0430\u0440 E.164",
      jwt: "JWT",
      template_literal: "\u0443\u0432\u043E\u0434"
    };
    return (issue2) => {
      var _a, _b, _c;
      switch (issue2.code) {
        case "invalid_type":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u045E\u0441\u044F ${issue2.expected}, \u0430\u0442\u0440\u044B\u043C\u0430\u043D\u0430 ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F ${stringifyPrimitive(issue2.values[0])}`;
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0432\u0430\u0440\u044B\u044F\u043D\u0442: \u0447\u0430\u043A\u0430\u045E\u0441\u044F \u0430\u0434\u0437\u0456\u043D \u0437 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            const maxValue = Number(issue2.maximum);
            const unit = getBelarusianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${(_a = issue2.origin) != null ? _a : "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${sizing.verb} ${adj}${issue2.maximum.toString()} ${unit}`;
          }
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${(_b = issue2.origin) != null ? _b : "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            const minValue = Number(issue2.minimum);
            const unit = getBelarusianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${issue2.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${sizing.verb} ${adj}${issue2.minimum.toString()} ${unit}`;
          }
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${issue2.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u043F\u0430\u0447\u044B\u043D\u0430\u0446\u0446\u0430 \u0437 "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u0430\u043A\u0430\u043D\u0447\u0432\u0430\u0446\u0446\u0430 \u043D\u0430 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u043C\u044F\u0448\u0447\u0430\u0446\u044C "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0430\u0434\u043F\u0430\u0432\u044F\u0434\u0430\u0446\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${_issue.pattern}`;
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B ${(_c = Nouns[_issue.format]) != null ? _c : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043B\u0456\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0431\u044B\u0446\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u0430\u0441\u043F\u0430\u0437\u043D\u0430\u043D\u044B ${issue2.keys.length > 1 ? "\u043A\u043B\u044E\u0447\u044B" : "\u043A\u043B\u044E\u0447"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043A\u043B\u044E\u0447 \u0443 ${issue2.origin}`;
        case "invalid_union":
          return "\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434";
        case "invalid_element":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u0430\u0435 \u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435 \u045E ${issue2.origin}`;
        default:
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434`;
      }
    };
  };
  function be_default() {
    return {
      localeError: error3()
    };
  }

  // node_modules/zod/v4/locales/bg.js
  var parsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "\u043C\u0430\u0441\u0438\u0432";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  var error4 = () => {
    const Sizable = {
      string: { unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" },
      file: { unit: "\u0431\u0430\u0439\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" },
      array: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" },
      set: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const Nouns = {
      regex: "\u0432\u0445\u043E\u0434",
      email: "\u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441",
      url: "URL",
      emoji: "\u0435\u043C\u043E\u0434\u0436\u0438",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \u0432\u0440\u0435\u043C\u0435",
      date: "ISO \u0434\u0430\u0442\u0430",
      time: "ISO \u0432\u0440\u0435\u043C\u0435",
      duration: "ISO \u043F\u0440\u043E\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E\u0441\u0442",
      ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441",
      ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441",
      cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
      cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
      base64: "base64-\u043A\u043E\u0434\u0438\u0440\u0430\u043D \u043D\u0438\u0437",
      base64url: "base64url-\u043A\u043E\u0434\u0438\u0440\u0430\u043D \u043D\u0438\u0437",
      json_string: "JSON \u043D\u0438\u0437",
      e164: "E.164 \u043D\u043E\u043C\u0435\u0440",
      jwt: "JWT",
      template_literal: "\u0432\u0445\u043E\u0434"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D ${issue2.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D ${parsedType(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D ${stringifyPrimitive(issue2.values[0])}`;
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u043E\u043F\u0446\u0438\u044F: \u043E\u0447\u0430\u043A\u0432\u0430\u043D\u043E \u0435\u0434\u043D\u043E \u043E\u0442 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u0422\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${(_a = issue2.origin) != null ? _a : "\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442"} \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430"}`;
          return `\u0422\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${(_c = issue2.origin) != null ? _c : "\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442"} \u0434\u0430 \u0431\u044A\u0434\u0435 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u0430\u043B\u043A\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${issue2.origin} \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u0430\u043B\u043A\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${issue2.origin} \u0434\u0430 \u0431\u044A\u0434\u0435 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u0432\u0430 \u0441 "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0437\u0430\u0432\u044A\u0440\u0448\u0432\u0430 \u0441 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0432\u043A\u043B\u044E\u0447\u0432\u0430 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0441\u044A\u0432\u043F\u0430\u0434\u0430 \u0441 ${_issue.pattern}`;
          let invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D";
          if (_issue.format === "emoji")
            invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E";
          if (_issue.format === "datetime")
            invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E";
          if (_issue.format === "date")
            invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430";
          if (_issue.format === "time")
            invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E";
          if (_issue.format === "duration")
            invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430";
          return `${invalid_adj} ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E \u0447\u0438\u0441\u043B\u043E: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0431\u044A\u0434\u0435 \u043A\u0440\u0430\u0442\u043D\u043E \u043D\u0430 ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u0430\u0437\u043F\u043E\u0437\u043D\u0430\u0442${issue2.keys.length > 1 ? "\u0438" : ""} \u043A\u043B\u044E\u0447${issue2.keys.length > 1 ? "\u043E\u0432\u0435" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043A\u043B\u044E\u0447 \u0432 ${issue2.origin}`;
        case "invalid_union":
          return "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434";
        case "invalid_element":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442 \u0432 ${issue2.origin}`;
        default:
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434`;
      }
    };
  };
  function bg_default() {
    return {
      localeError: error4()
    };
  }

  // node_modules/zod/v4/locales/ca.js
  var error5 = () => {
    const Sizable = {
      string: { unit: "car\xE0cters", verb: "contenir" },
      file: { unit: "bytes", verb: "contenir" },
      array: { unit: "elements", verb: "contenir" },
      set: { unit: "elements", verb: "contenir" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "entrada",
      email: "adre\xE7a electr\xF2nica",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "data i hora ISO",
      date: "data ISO",
      time: "hora ISO",
      duration: "durada ISO",
      ipv4: "adre\xE7a IPv4",
      ipv6: "adre\xE7a IPv6",
      cidrv4: "rang IPv4",
      cidrv6: "rang IPv6",
      base64: "cadena codificada en base64",
      base64url: "cadena codificada en base64url",
      json_string: "cadena JSON",
      e164: "n\xFAmero E.164",
      jwt: "JWT",
      template_literal: "entrada"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Tipus inv\xE0lid: s'esperava ${issue2.expected}, s'ha rebut ${parsedType8(issue2.input)}`;
        // return `Tipus invàlid: s'esperava ${issue.expected}, s'ha rebut ${util.getParsedType(issue.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Valor inv\xE0lid: s'esperava ${stringifyPrimitive(issue2.values[0])}`;
          return `Opci\xF3 inv\xE0lida: s'esperava una de ${joinValues(issue2.values, " o ")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "com a m\xE0xim" : "menys de";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Massa gran: s'esperava que ${(_a = issue2.origin) != null ? _a : "el valor"} contingu\xE9s ${adj} ${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elements"}`;
          return `Massa gran: s'esperava que ${(_c = issue2.origin) != null ? _c : "el valor"} fos ${adj} ${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? "com a m\xEDnim" : "m\xE9s de";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Massa petit: s'esperava que ${issue2.origin} contingu\xE9s ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Massa petit: s'esperava que ${issue2.origin} fos ${adj} ${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Format inv\xE0lid: ha de comen\xE7ar amb "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Format inv\xE0lid: ha d'acabar amb "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Format inv\xE0lid: ha d'incloure "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Format inv\xE0lid: ha de coincidir amb el patr\xF3 ${_issue.pattern}`;
          return `Format inv\xE0lid per a ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE0lid: ha de ser m\xFAltiple de ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Clau${issue2.keys.length > 1 ? "s" : ""} no reconeguda${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Clau inv\xE0lida a ${issue2.origin}`;
        case "invalid_union":
          return "Entrada inv\xE0lida";
        // Could also be "Tipus d'unió invàlid" but "Entrada invàlida" is more general
        case "invalid_element":
          return `Element inv\xE0lid a ${issue2.origin}`;
        default:
          return `Entrada inv\xE0lida`;
      }
    };
  };
  function ca_default() {
    return {
      localeError: error5()
    };
  }

  // node_modules/zod/v4/locales/cs.js
  var error6 = () => {
    const Sizable = {
      string: { unit: "znak\u016F", verb: "m\xEDt" },
      file: { unit: "bajt\u016F", verb: "m\xEDt" },
      array: { unit: "prvk\u016F", verb: "m\xEDt" },
      set: { unit: "prvk\u016F", verb: "m\xEDt" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u010D\xEDslo";
        }
        case "string": {
          return "\u0159et\u011Bzec";
        }
        case "boolean": {
          return "boolean";
        }
        case "bigint": {
          return "bigint";
        }
        case "function": {
          return "funkce";
        }
        case "symbol": {
          return "symbol";
        }
        case "undefined": {
          return "undefined";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "pole";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "regul\xE1rn\xED v\xFDraz",
      email: "e-mailov\xE1 adresa",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "datum a \u010Das ve form\xE1tu ISO",
      date: "datum ve form\xE1tu ISO",
      time: "\u010Das ve form\xE1tu ISO",
      duration: "doba trv\xE1n\xED ISO",
      ipv4: "IPv4 adresa",
      ipv6: "IPv6 adresa",
      cidrv4: "rozsah IPv4",
      cidrv6: "rozsah IPv6",
      base64: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64",
      base64url: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64url",
      json_string: "\u0159et\u011Bzec ve form\xE1tu JSON",
      e164: "\u010D\xEDslo E.164",
      jwt: "JWT",
      template_literal: "vstup"
    };
    return (issue2) => {
      var _a, _b, _c, _d, _e, _f, _g;
      switch (issue2.code) {
        case "invalid_type":
          return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${issue2.expected}, obdr\u017Eeno ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${stringifyPrimitive(issue2.values[0])}`;
          return `Neplatn\xE1 mo\u017Enost: o\u010Dek\xE1v\xE1na jedna z hodnot ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${(_a = issue2.origin) != null ? _a : "hodnota"} mus\xED m\xEDt ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "prvk\u016F"}`;
          }
          return `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${(_c = issue2.origin) != null ? _c : "hodnota"} mus\xED b\xFDt ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${(_d = issue2.origin) != null ? _d : "hodnota"} mus\xED m\xEDt ${adj}${issue2.minimum.toString()} ${(_e = sizing.unit) != null ? _e : "prvk\u016F"}`;
          }
          return `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${(_f = issue2.origin) != null ? _f : "hodnota"} mus\xED b\xFDt ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Neplatn\xFD \u0159et\u011Bzec: mus\xED za\u010D\xEDnat na "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Neplatn\xFD \u0159et\u011Bzec: mus\xED kon\u010Dit na "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Neplatn\xFD \u0159et\u011Bzec: mus\xED obsahovat "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Neplatn\xFD \u0159et\u011Bzec: mus\xED odpov\xEDdat vzoru ${_issue.pattern}`;
          return `Neplatn\xFD form\xE1t ${(_g = Nouns[_issue.format]) != null ? _g : issue2.format}`;
        }
        case "not_multiple_of":
          return `Neplatn\xE9 \u010D\xEDslo: mus\xED b\xFDt n\xE1sobkem ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Nezn\xE1m\xE9 kl\xED\u010De: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Neplatn\xFD kl\xED\u010D v ${issue2.origin}`;
        case "invalid_union":
          return "Neplatn\xFD vstup";
        case "invalid_element":
          return `Neplatn\xE1 hodnota v ${issue2.origin}`;
        default:
          return `Neplatn\xFD vstup`;
      }
    };
  };
  function cs_default() {
    return {
      localeError: error6()
    };
  }

  // node_modules/zod/v4/locales/da.js
  var error7 = () => {
    const Sizable = {
      string: { unit: "tegn", verb: "havde" },
      file: { unit: "bytes", verb: "havde" },
      array: { unit: "elementer", verb: "indeholdt" },
      set: { unit: "elementer", verb: "indeholdt" }
    };
    const TypeNames = {
      string: "streng",
      number: "tal",
      boolean: "boolean",
      array: "liste",
      object: "objekt",
      set: "s\xE6t",
      file: "fil"
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    function getTypeName(type) {
      var _a;
      return (_a = TypeNames[type]) != null ? _a : type;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "tal";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "liste";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
          return "objekt";
        }
      }
      return t;
    };
    const Nouns = {
      regex: "input",
      email: "e-mailadresse",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO dato- og klokkesl\xE6t",
      date: "ISO-dato",
      time: "ISO-klokkesl\xE6t",
      duration: "ISO-varighed",
      ipv4: "IPv4-omr\xE5de",
      ipv6: "IPv6-omr\xE5de",
      cidrv4: "IPv4-spektrum",
      cidrv6: "IPv6-spektrum",
      base64: "base64-kodet streng",
      base64url: "base64url-kodet streng",
      json_string: "JSON-streng",
      e164: "E.164-nummer",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      var _a, _b;
      switch (issue2.code) {
        case "invalid_type":
          return `Ugyldigt input: forventede ${getTypeName(issue2.expected)}, fik ${getTypeName(parsedType8(issue2.input))}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Ugyldig v\xE6rdi: forventede ${stringifyPrimitive(issue2.values[0])}`;
          return `Ugyldigt valg: forventede en af f\xF8lgende ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          const origin = getTypeName(issue2.origin);
          if (sizing)
            return `For stor: forventede ${origin != null ? origin : "value"} ${sizing.verb} ${adj} ${issue2.maximum.toString()} ${(_a = sizing.unit) != null ? _a : "elementer"}`;
          return `For stor: forventede ${origin != null ? origin : "value"} havde ${adj} ${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          const origin = getTypeName(issue2.origin);
          if (sizing) {
            return `For lille: forventede ${origin} ${sizing.verb} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `For lille: forventede ${origin} havde ${adj} ${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Ugyldig streng: skal starte med "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Ugyldig streng: skal ende med "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Ugyldig streng: skal indeholde "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Ugyldig streng: skal matche m\xF8nsteret ${_issue.pattern}`;
          return `Ugyldig ${(_b = Nouns[_issue.format]) != null ? _b : issue2.format}`;
        }
        case "not_multiple_of":
          return `Ugyldigt tal: skal v\xE6re deleligt med ${issue2.divisor}`;
        case "unrecognized_keys":
          return `${issue2.keys.length > 1 ? "Ukendte n\xF8gler" : "Ukendt n\xF8gle"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Ugyldig n\xF8gle i ${issue2.origin}`;
        case "invalid_union":
          return "Ugyldigt input: matcher ingen af de tilladte typer";
        case "invalid_element":
          return `Ugyldig v\xE6rdi i ${issue2.origin}`;
        default:
          return `Ugyldigt input`;
      }
    };
  };
  function da_default() {
    return {
      localeError: error7()
    };
  }

  // node_modules/zod/v4/locales/de.js
  var error8 = () => {
    const Sizable = {
      string: { unit: "Zeichen", verb: "zu haben" },
      file: { unit: "Bytes", verb: "zu haben" },
      array: { unit: "Elemente", verb: "zu haben" },
      set: { unit: "Elemente", verb: "zu haben" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "Zahl";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "Array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "Eingabe",
      email: "E-Mail-Adresse",
      url: "URL",
      emoji: "Emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO-Datum und -Uhrzeit",
      date: "ISO-Datum",
      time: "ISO-Uhrzeit",
      duration: "ISO-Dauer",
      ipv4: "IPv4-Adresse",
      ipv6: "IPv6-Adresse",
      cidrv4: "IPv4-Bereich",
      cidrv6: "IPv6-Bereich",
      base64: "Base64-codierter String",
      base64url: "Base64-URL-codierter String",
      json_string: "JSON-String",
      e164: "E.164-Nummer",
      jwt: "JWT",
      template_literal: "Eingabe"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Ung\xFCltige Eingabe: erwartet ${issue2.expected}, erhalten ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Ung\xFCltige Eingabe: erwartet ${stringifyPrimitive(issue2.values[0])}`;
          return `Ung\xFCltige Option: erwartet eine von ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Zu gro\xDF: erwartet, dass ${(_a = issue2.origin) != null ? _a : "Wert"} ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "Elemente"} hat`;
          return `Zu gro\xDF: erwartet, dass ${(_c = issue2.origin) != null ? _c : "Wert"} ${adj}${issue2.maximum.toString()} ist`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} hat`;
          }
          return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ist`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Ung\xFCltiger String: muss mit "${_issue.prefix}" beginnen`;
          if (_issue.format === "ends_with")
            return `Ung\xFCltiger String: muss mit "${_issue.suffix}" enden`;
          if (_issue.format === "includes")
            return `Ung\xFCltiger String: muss "${_issue.includes}" enthalten`;
          if (_issue.format === "regex")
            return `Ung\xFCltiger String: muss dem Muster ${_issue.pattern} entsprechen`;
          return `Ung\xFCltig: ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `Ung\xFCltige Zahl: muss ein Vielfaches von ${issue2.divisor} sein`;
        case "unrecognized_keys":
          return `${issue2.keys.length > 1 ? "Unbekannte Schl\xFCssel" : "Unbekannter Schl\xFCssel"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Ung\xFCltiger Schl\xFCssel in ${issue2.origin}`;
        case "invalid_union":
          return "Ung\xFCltige Eingabe";
        case "invalid_element":
          return `Ung\xFCltiger Wert in ${issue2.origin}`;
        default:
          return `Ung\xFCltige Eingabe`;
      }
    };
  };
  function de_default() {
    return {
      localeError: error8()
    };
  }

  // node_modules/zod/v4/locales/en.js
  var parsedType2 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  var error9 = () => {
    const Sizable = {
      string: { unit: "characters", verb: "to have" },
      file: { unit: "bytes", verb: "to have" },
      array: { unit: "items", verb: "to have" },
      set: { unit: "items", verb: "to have" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const Nouns = {
      regex: "input",
      email: "email address",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO datetime",
      date: "ISO date",
      time: "ISO time",
      duration: "ISO duration",
      ipv4: "IPv4 address",
      ipv6: "IPv6 address",
      cidrv4: "IPv4 range",
      cidrv6: "IPv6 range",
      base64: "base64-encoded string",
      base64url: "base64url-encoded string",
      json_string: "JSON string",
      e164: "E.164 number",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Invalid input: expected ${issue2.expected}, received ${parsedType2(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
          return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Too big: expected ${(_a = issue2.origin) != null ? _a : "value"} to have ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elements"}`;
          return `Too big: expected ${(_c = issue2.origin) != null ? _c : "value"} to be ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Invalid string: must start with "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Invalid string: must end with "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Invalid string: must include "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Invalid string: must match pattern ${_issue.pattern}`;
          return `Invalid ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `Invalid number: must be a multiple of ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Invalid key in ${issue2.origin}`;
        case "invalid_union":
          return "Invalid input";
        case "invalid_element":
          return `Invalid value in ${issue2.origin}`;
        default:
          return `Invalid input`;
      }
    };
  };
  function en_default() {
    return {
      localeError: error9()
    };
  }

  // node_modules/zod/v4/locales/eo.js
  var parsedType3 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "nombro";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "tabelo";
        }
        if (data === null) {
          return "senvalora";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  var error10 = () => {
    const Sizable = {
      string: { unit: "karaktrojn", verb: "havi" },
      file: { unit: "bajtojn", verb: "havi" },
      array: { unit: "elementojn", verb: "havi" },
      set: { unit: "elementojn", verb: "havi" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const Nouns = {
      regex: "enigo",
      email: "retadreso",
      url: "URL",
      emoji: "emo\u011Dio",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO-datotempo",
      date: "ISO-dato",
      time: "ISO-tempo",
      duration: "ISO-da\u016Dro",
      ipv4: "IPv4-adreso",
      ipv6: "IPv6-adreso",
      cidrv4: "IPv4-rango",
      cidrv6: "IPv6-rango",
      base64: "64-ume kodita karaktraro",
      base64url: "URL-64-ume kodita karaktraro",
      json_string: "JSON-karaktraro",
      e164: "E.164-nombro",
      jwt: "JWT",
      template_literal: "enigo"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Nevalida enigo: atendi\u011Dis ${issue2.expected}, ricevi\u011Dis ${parsedType3(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Nevalida enigo: atendi\u011Dis ${stringifyPrimitive(issue2.values[0])}`;
          return `Nevalida opcio: atendi\u011Dis unu el ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Tro granda: atendi\u011Dis ke ${(_a = issue2.origin) != null ? _a : "valoro"} havu ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elementojn"}`;
          return `Tro granda: atendi\u011Dis ke ${(_c = issue2.origin) != null ? _c : "valoro"} havu ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Tro malgranda: atendi\u011Dis ke ${issue2.origin} havu ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Tro malgranda: atendi\u011Dis ke ${issue2.origin} estu ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Nevalida karaktraro: devas komenci\u011Di per "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Nevalida karaktraro: devas fini\u011Di per "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Nevalida karaktraro: devas inkluzivi "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Nevalida karaktraro: devas kongrui kun la modelo ${_issue.pattern}`;
          return `Nevalida ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `Nevalida nombro: devas esti oblo de ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Nekonata${issue2.keys.length > 1 ? "j" : ""} \u015Dlosilo${issue2.keys.length > 1 ? "j" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Nevalida \u015Dlosilo en ${issue2.origin}`;
        case "invalid_union":
          return "Nevalida enigo";
        case "invalid_element":
          return `Nevalida valoro en ${issue2.origin}`;
        default:
          return `Nevalida enigo`;
      }
    };
  };
  function eo_default() {
    return {
      localeError: error10()
    };
  }

  // node_modules/zod/v4/locales/es.js
  var error11 = () => {
    const Sizable = {
      string: { unit: "caracteres", verb: "tener" },
      file: { unit: "bytes", verb: "tener" },
      array: { unit: "elementos", verb: "tener" },
      set: { unit: "elementos", verb: "tener" }
    };
    const TypeNames = {
      string: "texto",
      number: "n\xFAmero",
      boolean: "booleano",
      array: "arreglo",
      object: "objeto",
      set: "conjunto",
      file: "archivo",
      date: "fecha",
      bigint: "n\xFAmero grande",
      symbol: "s\xEDmbolo",
      undefined: "indefinido",
      null: "nulo",
      function: "funci\xF3n",
      map: "mapa",
      record: "registro",
      tuple: "tupla",
      enum: "enumeraci\xF3n",
      union: "uni\xF3n",
      literal: "literal",
      promise: "promesa",
      void: "vac\xEDo",
      never: "nunca",
      unknown: "desconocido",
      any: "cualquiera"
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    function getTypeName(type) {
      var _a;
      return (_a = TypeNames[type]) != null ? _a : type;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype) {
            return data.constructor.name;
          }
          return "object";
        }
      }
      return t;
    };
    const Nouns = {
      regex: "entrada",
      email: "direcci\xF3n de correo electr\xF3nico",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "fecha y hora ISO",
      date: "fecha ISO",
      time: "hora ISO",
      duration: "duraci\xF3n ISO",
      ipv4: "direcci\xF3n IPv4",
      ipv6: "direcci\xF3n IPv6",
      cidrv4: "rango IPv4",
      cidrv6: "rango IPv6",
      base64: "cadena codificada en base64",
      base64url: "URL codificada en base64",
      json_string: "cadena JSON",
      e164: "n\xFAmero E.164",
      jwt: "JWT",
      template_literal: "entrada"
    };
    return (issue2) => {
      var _a, _b;
      switch (issue2.code) {
        case "invalid_type":
          return `Entrada inv\xE1lida: se esperaba ${getTypeName(issue2.expected)}, recibido ${getTypeName(parsedType8(issue2.input))}`;
        // return `Entrada inválida: se esperaba ${issue.expected}, recibido ${util.getParsedType(issue.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Entrada inv\xE1lida: se esperaba ${stringifyPrimitive(issue2.values[0])}`;
          return `Opci\xF3n inv\xE1lida: se esperaba una de ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          const origin = getTypeName(issue2.origin);
          if (sizing)
            return `Demasiado grande: se esperaba que ${origin != null ? origin : "valor"} tuviera ${adj}${issue2.maximum.toString()} ${(_a = sizing.unit) != null ? _a : "elementos"}`;
          return `Demasiado grande: se esperaba que ${origin != null ? origin : "valor"} fuera ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          const origin = getTypeName(issue2.origin);
          if (sizing) {
            return `Demasiado peque\xF1o: se esperaba que ${origin} tuviera ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Demasiado peque\xF1o: se esperaba que ${origin} fuera ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Cadena inv\xE1lida: debe comenzar con "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Cadena inv\xE1lida: debe terminar en "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Cadena inv\xE1lida: debe incluir "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Cadena inv\xE1lida: debe coincidir con el patr\xF3n ${_issue.pattern}`;
          return `Inv\xE1lido ${(_b = Nouns[_issue.format]) != null ? _b : issue2.format}`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE1lido: debe ser m\xFAltiplo de ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Llave${issue2.keys.length > 1 ? "s" : ""} desconocida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Llave inv\xE1lida en ${getTypeName(issue2.origin)}`;
        case "invalid_union":
          return "Entrada inv\xE1lida";
        case "invalid_element":
          return `Valor inv\xE1lido en ${getTypeName(issue2.origin)}`;
        default:
          return `Entrada inv\xE1lida`;
      }
    };
  };
  function es_default() {
    return {
      localeError: error11()
    };
  }

  // node_modules/zod/v4/locales/fa.js
  var error12 = () => {
    const Sizable = {
      string: { unit: "\u06A9\u0627\u0631\u0627\u06A9\u062A\u0631", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" },
      file: { unit: "\u0628\u0627\u06CC\u062A", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" },
      array: { unit: "\u0622\u06CC\u062A\u0645", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" },
      set: { unit: "\u0622\u06CC\u062A\u0645", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0639\u062F\u062F";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u0622\u0631\u0627\u06CC\u0647";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u0648\u0631\u0648\u062F\u06CC",
      email: "\u0622\u062F\u0631\u0633 \u0627\u06CC\u0645\u06CC\u0644",
      url: "URL",
      emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u062A\u0627\u0631\u06CC\u062E \u0648 \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
      date: "\u062A\u0627\u0631\u06CC\u062E \u0627\u06CC\u0632\u0648",
      time: "\u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
      duration: "\u0645\u062F\u062A \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
      ipv4: "IPv4 \u0622\u062F\u0631\u0633",
      ipv6: "IPv6 \u0622\u062F\u0631\u0633",
      cidrv4: "IPv4 \u062F\u0627\u0645\u0646\u0647",
      cidrv6: "IPv6 \u062F\u0627\u0645\u0646\u0647",
      base64: "base64-encoded \u0631\u0634\u062A\u0647",
      base64url: "base64url-encoded \u0631\u0634\u062A\u0647",
      json_string: "JSON \u0631\u0634\u062A\u0647",
      e164: "E.164 \u0639\u062F\u062F",
      jwt: "JWT",
      template_literal: "\u0648\u0631\u0648\u062F\u06CC"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${issue2.expected} \u0645\u06CC\u200C\u0628\u0648\u062F\u060C ${parsedType8(issue2.input)} \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F`;
        case "invalid_value":
          if (issue2.values.length === 1) {
            return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${stringifyPrimitive(issue2.values[0])} \u0645\u06CC\u200C\u0628\u0648\u062F`;
          }
          return `\u06AF\u0632\u06CC\u0646\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A \u06CC\u06A9\u06CC \u0627\u0632 ${joinValues(issue2.values, "|")} \u0645\u06CC\u200C\u0628\u0648\u062F`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${(_a = issue2.origin) != null ? _a : "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\u0639\u0646\u0635\u0631"} \u0628\u0627\u0634\u062F`;
          }
          return `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${(_c = issue2.origin) != null ? _c : "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} \u0628\u0627\u0634\u062F`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} ${sizing.unit} \u0628\u0627\u0634\u062F`;
          }
          return `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} \u0628\u0627\u0634\u062F`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${_issue.prefix}" \u0634\u0631\u0648\u0639 \u0634\u0648\u062F`;
          }
          if (_issue.format === "ends_with") {
            return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${_issue.suffix}" \u062A\u0645\u0627\u0645 \u0634\u0648\u062F`;
          }
          if (_issue.format === "includes") {
            return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0634\u0627\u0645\u0644 "${_issue.includes}" \u0628\u0627\u0634\u062F`;
          }
          if (_issue.format === "regex") {
            return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 \u0627\u0644\u06AF\u0648\u06CC ${_issue.pattern} \u0645\u0637\u0627\u0628\u0642\u062A \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F`;
          }
          return `${(_d = Nouns[_issue.format]) != null ? _d : issue2.format} \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
        }
        case "not_multiple_of":
          return `\u0639\u062F\u062F \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0645\u0636\u0631\u0628 ${issue2.divisor} \u0628\u0627\u0634\u062F`;
        case "unrecognized_keys":
          return `\u06A9\u0644\u06CC\u062F${issue2.keys.length > 1 ? "\u0647\u0627\u06CC" : ""} \u0646\u0627\u0634\u0646\u0627\u0633: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u06A9\u0644\u06CC\u062F \u0646\u0627\u0634\u0646\u0627\u0633 \u062F\u0631 ${issue2.origin}`;
        case "invalid_union":
          return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
        case "invalid_element":
          return `\u0645\u0642\u062F\u0627\u0631 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u062F\u0631 ${issue2.origin}`;
        default:
          return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
      }
    };
  };
  function fa_default() {
    return {
      localeError: error12()
    };
  }

  // node_modules/zod/v4/locales/fi.js
  var error13 = () => {
    const Sizable = {
      string: { unit: "merkki\xE4", subject: "merkkijonon" },
      file: { unit: "tavua", subject: "tiedoston" },
      array: { unit: "alkiota", subject: "listan" },
      set: { unit: "alkiota", subject: "joukon" },
      number: { unit: "", subject: "luvun" },
      bigint: { unit: "", subject: "suuren kokonaisluvun" },
      int: { unit: "", subject: "kokonaisluvun" },
      date: { unit: "", subject: "p\xE4iv\xE4m\xE4\xE4r\xE4n" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "s\xE4\xE4nn\xF6llinen lauseke",
      email: "s\xE4hk\xF6postiosoite",
      url: "URL-osoite",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO-aikaleima",
      date: "ISO-p\xE4iv\xE4m\xE4\xE4r\xE4",
      time: "ISO-aika",
      duration: "ISO-kesto",
      ipv4: "IPv4-osoite",
      ipv6: "IPv6-osoite",
      cidrv4: "IPv4-alue",
      cidrv6: "IPv6-alue",
      base64: "base64-koodattu merkkijono",
      base64url: "base64url-koodattu merkkijono",
      json_string: "JSON-merkkijono",
      e164: "E.164-luku",
      jwt: "JWT",
      template_literal: "templaattimerkkijono"
    };
    return (issue2) => {
      var _a;
      switch (issue2.code) {
        case "invalid_type":
          return `Virheellinen tyyppi: odotettiin ${issue2.expected}, oli ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Virheellinen sy\xF6te: t\xE4ytyy olla ${stringifyPrimitive(issue2.values[0])}`;
          return `Virheellinen valinta: t\xE4ytyy olla yksi seuraavista: ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Liian suuri: ${sizing.subject} t\xE4ytyy olla ${adj}${issue2.maximum.toString()} ${sizing.unit}`.trim();
          }
          return `Liian suuri: arvon t\xE4ytyy olla ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Liian pieni: ${sizing.subject} t\xE4ytyy olla ${adj}${issue2.minimum.toString()} ${sizing.unit}`.trim();
          }
          return `Liian pieni: arvon t\xE4ytyy olla ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Virheellinen sy\xF6te: t\xE4ytyy alkaa "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Virheellinen sy\xF6te: t\xE4ytyy loppua "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Virheellinen sy\xF6te: t\xE4ytyy sis\xE4lt\xE4\xE4 "${_issue.includes}"`;
          if (_issue.format === "regex") {
            return `Virheellinen sy\xF6te: t\xE4ytyy vastata s\xE4\xE4nn\xF6llist\xE4 lauseketta ${_issue.pattern}`;
          }
          return `Virheellinen ${(_a = Nouns[_issue.format]) != null ? _a : issue2.format}`;
        }
        case "not_multiple_of":
          return `Virheellinen luku: t\xE4ytyy olla luvun ${issue2.divisor} monikerta`;
        case "unrecognized_keys":
          return `${issue2.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return "Virheellinen avain tietueessa";
        case "invalid_union":
          return "Virheellinen unioni";
        case "invalid_element":
          return "Virheellinen arvo joukossa";
        default:
          return `Virheellinen sy\xF6te`;
      }
    };
  };
  function fi_default() {
    return {
      localeError: error13()
    };
  }

  // node_modules/zod/v4/locales/fr.js
  var error14 = () => {
    const Sizable = {
      string: { unit: "caract\xE8res", verb: "avoir" },
      file: { unit: "octets", verb: "avoir" },
      array: { unit: "\xE9l\xE9ments", verb: "avoir" },
      set: { unit: "\xE9l\xE9ments", verb: "avoir" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "nombre";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "tableau";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "entr\xE9e",
      email: "adresse e-mail",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "date et heure ISO",
      date: "date ISO",
      time: "heure ISO",
      duration: "dur\xE9e ISO",
      ipv4: "adresse IPv4",
      ipv6: "adresse IPv6",
      cidrv4: "plage IPv4",
      cidrv6: "plage IPv6",
      base64: "cha\xEEne encod\xE9e en base64",
      base64url: "cha\xEEne encod\xE9e en base64url",
      json_string: "cha\xEEne JSON",
      e164: "num\xE9ro E.164",
      jwt: "JWT",
      template_literal: "entr\xE9e"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Entr\xE9e invalide : ${issue2.expected} attendu, ${parsedType8(issue2.input)} re\xE7u`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Entr\xE9e invalide : ${stringifyPrimitive(issue2.values[0])} attendu`;
          return `Option invalide : une valeur parmi ${joinValues(issue2.values, "|")} attendue`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Trop grand : ${(_a = issue2.origin) != null ? _a : "valeur"} doit ${sizing.verb} ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\xE9l\xE9ment(s)"}`;
          return `Trop grand : ${(_c = issue2.origin) != null ? _c : "valeur"} doit \xEAtre ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Trop petit : ${issue2.origin} doit ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Trop petit : ${issue2.origin} doit \xEAtre ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Cha\xEEne invalide : doit commencer par "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Cha\xEEne invalide : doit se terminer par "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Cha\xEEne invalide : doit inclure "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Cha\xEEne invalide : doit correspondre au mod\xE8le ${_issue.pattern}`;
          return `${(_d = Nouns[_issue.format]) != null ? _d : issue2.format} invalide`;
        }
        case "not_multiple_of":
          return `Nombre invalide : doit \xEAtre un multiple de ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Cl\xE9${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Cl\xE9 invalide dans ${issue2.origin}`;
        case "invalid_union":
          return "Entr\xE9e invalide";
        case "invalid_element":
          return `Valeur invalide dans ${issue2.origin}`;
        default:
          return `Entr\xE9e invalide`;
      }
    };
  };
  function fr_default() {
    return {
      localeError: error14()
    };
  }

  // node_modules/zod/v4/locales/fr-CA.js
  var error15 = () => {
    const Sizable = {
      string: { unit: "caract\xE8res", verb: "avoir" },
      file: { unit: "octets", verb: "avoir" },
      array: { unit: "\xE9l\xE9ments", verb: "avoir" },
      set: { unit: "\xE9l\xE9ments", verb: "avoir" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "entr\xE9e",
      email: "adresse courriel",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "date-heure ISO",
      date: "date ISO",
      time: "heure ISO",
      duration: "dur\xE9e ISO",
      ipv4: "adresse IPv4",
      ipv6: "adresse IPv6",
      cidrv4: "plage IPv4",
      cidrv6: "plage IPv6",
      base64: "cha\xEEne encod\xE9e en base64",
      base64url: "cha\xEEne encod\xE9e en base64url",
      json_string: "cha\xEEne JSON",
      e164: "num\xE9ro E.164",
      jwt: "JWT",
      template_literal: "entr\xE9e"
    };
    return (issue2) => {
      var _a, _b, _c;
      switch (issue2.code) {
        case "invalid_type":
          return `Entr\xE9e invalide : attendu ${issue2.expected}, re\xE7u ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Entr\xE9e invalide : attendu ${stringifyPrimitive(issue2.values[0])}`;
          return `Option invalide : attendu l'une des valeurs suivantes ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "\u2264" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Trop grand : attendu que ${(_a = issue2.origin) != null ? _a : "la valeur"} ait ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
          return `Trop grand : attendu que ${(_b = issue2.origin) != null ? _b : "la valeur"} soit ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? "\u2265" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Trop petit : attendu que ${issue2.origin} ait ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Trop petit : attendu que ${issue2.origin} soit ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Cha\xEEne invalide : doit commencer par "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Cha\xEEne invalide : doit se terminer par "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Cha\xEEne invalide : doit inclure "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Cha\xEEne invalide : doit correspondre au motif ${_issue.pattern}`;
          return `${(_c = Nouns[_issue.format]) != null ? _c : issue2.format} invalide`;
        }
        case "not_multiple_of":
          return `Nombre invalide : doit \xEAtre un multiple de ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Cl\xE9${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Cl\xE9 invalide dans ${issue2.origin}`;
        case "invalid_union":
          return "Entr\xE9e invalide";
        case "invalid_element":
          return `Valeur invalide dans ${issue2.origin}`;
        default:
          return `Entr\xE9e invalide`;
      }
    };
  };
  function fr_CA_default() {
    return {
      localeError: error15()
    };
  }

  // node_modules/zod/v4/locales/he.js
  var error16 = () => {
    const Sizable = {
      string: { unit: "\u05D0\u05D5\u05EA\u05D9\u05D5\u05EA", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" },
      file: { unit: "\u05D1\u05D9\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" },
      array: { unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" },
      set: { unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u05E7\u05DC\u05D8",
      email: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
      url: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05E8\u05E9\u05EA",
      emoji: "\u05D0\u05D9\u05DE\u05D5\u05D2'\u05D9",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05D6\u05DE\u05DF ISO",
      date: "\u05EA\u05D0\u05E8\u05D9\u05DA ISO",
      time: "\u05D6\u05DE\u05DF ISO",
      duration: "\u05DE\u05E9\u05DA \u05D6\u05DE\u05DF ISO",
      ipv4: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv4",
      ipv6: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv6",
      cidrv4: "\u05D8\u05D5\u05D5\u05D7 IPv4",
      cidrv6: "\u05D8\u05D5\u05D5\u05D7 IPv6",
      base64: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64",
      base64url: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64 \u05DC\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA \u05E8\u05E9\u05EA",
      json_string: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA JSON",
      e164: "\u05DE\u05E1\u05E4\u05E8 E.164",
      jwt: "JWT",
      template_literal: "\u05E7\u05DC\u05D8"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA ${issue2.expected}, \u05D4\u05EA\u05E7\u05D1\u05DC ${parsedType8(issue2.input)}`;
        // return `Invalid input: expected ${issue.expected}, received ${util.getParsedType(issue.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA ${stringifyPrimitive(issue2.values[0])}`;
          return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05D0\u05D7\u05EA \u05DE\u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA  ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${(_a = issue2.origin) != null ? _a : "value"} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elements"}`;
          return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${(_c = issue2.origin) != null ? _c : "value"} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${issue2.origin} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${issue2.origin} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D1"${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05E1\u05EA\u05D9\u05D9\u05DD \u05D1 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05DB\u05DC\u05D5\u05DC "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05DC\u05EA\u05D1\u05E0\u05D9\u05EA ${_issue.pattern}`;
          return `${(_d = Nouns[_issue.format]) != null ? _d : issue2.format} \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF`;
        }
        case "not_multiple_of":
          return `\u05DE\u05E1\u05E4\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05DB\u05E4\u05DC\u05D4 \u05E9\u05DC ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u05DE\u05E4\u05EA\u05D7${issue2.keys.length > 1 ? "\u05D5\u05EA" : ""} \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4${issue2.keys.length > 1 ? "\u05D9\u05DD" : "\u05D4"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u05DE\u05E4\u05EA\u05D7 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${issue2.origin}`;
        case "invalid_union":
          return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
        case "invalid_element":
          return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${issue2.origin}`;
        default:
          return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF`;
      }
    };
  };
  function he_default() {
    return {
      localeError: error16()
    };
  }

  // node_modules/zod/v4/locales/hu.js
  var error17 = () => {
    const Sizable = {
      string: { unit: "karakter", verb: "legyen" },
      file: { unit: "byte", verb: "legyen" },
      array: { unit: "elem", verb: "legyen" },
      set: { unit: "elem", verb: "legyen" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "sz\xE1m";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "t\xF6mb";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "bemenet",
      email: "email c\xEDm",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO id\u0151b\xE9lyeg",
      date: "ISO d\xE1tum",
      time: "ISO id\u0151",
      duration: "ISO id\u0151intervallum",
      ipv4: "IPv4 c\xEDm",
      ipv6: "IPv6 c\xEDm",
      cidrv4: "IPv4 tartom\xE1ny",
      cidrv6: "IPv6 tartom\xE1ny",
      base64: "base64-k\xF3dolt string",
      base64url: "base64url-k\xF3dolt string",
      json_string: "JSON string",
      e164: "E.164 sz\xE1m",
      jwt: "JWT",
      template_literal: "bemenet"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${issue2.expected}, a kapott \xE9rt\xE9k ${parsedType8(issue2.input)}`;
        // return `Invalid input: expected ${issue.expected}, received ${util.getParsedType(issue.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${stringifyPrimitive(issue2.values[0])}`;
          return `\xC9rv\xE9nytelen opci\xF3: valamelyik \xE9rt\xE9k v\xE1rt ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `T\xFAl nagy: ${(_a = issue2.origin) != null ? _a : "\xE9rt\xE9k"} m\xE9rete t\xFAl nagy ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elem"}`;
          return `T\xFAl nagy: a bemeneti \xE9rt\xE9k ${(_c = issue2.origin) != null ? _c : "\xE9rt\xE9k"} t\xFAl nagy: ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${issue2.origin} m\xE9rete t\xFAl kicsi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${issue2.origin} t\xFAl kicsi ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\xC9rv\xE9nytelen string: "${_issue.prefix}" \xE9rt\xE9kkel kell kezd\u0151dnie`;
          if (_issue.format === "ends_with")
            return `\xC9rv\xE9nytelen string: "${_issue.suffix}" \xE9rt\xE9kkel kell v\xE9gz\u0151dnie`;
          if (_issue.format === "includes")
            return `\xC9rv\xE9nytelen string: "${_issue.includes}" \xE9rt\xE9ket kell tartalmaznia`;
          if (_issue.format === "regex")
            return `\xC9rv\xE9nytelen string: ${_issue.pattern} mint\xE1nak kell megfelelnie`;
          return `\xC9rv\xE9nytelen ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `\xC9rv\xE9nytelen sz\xE1m: ${issue2.divisor} t\xF6bbsz\xF6r\xF6s\xE9nek kell lennie`;
        case "unrecognized_keys":
          return `Ismeretlen kulcs${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\xC9rv\xE9nytelen kulcs ${issue2.origin}`;
        case "invalid_union":
          return "\xC9rv\xE9nytelen bemenet";
        case "invalid_element":
          return `\xC9rv\xE9nytelen \xE9rt\xE9k: ${issue2.origin}`;
        default:
          return `\xC9rv\xE9nytelen bemenet`;
      }
    };
  };
  function hu_default() {
    return {
      localeError: error17()
    };
  }

  // node_modules/zod/v4/locales/id.js
  var error18 = () => {
    const Sizable = {
      string: { unit: "karakter", verb: "memiliki" },
      file: { unit: "byte", verb: "memiliki" },
      array: { unit: "item", verb: "memiliki" },
      set: { unit: "item", verb: "memiliki" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "input",
      email: "alamat email",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "tanggal dan waktu format ISO",
      date: "tanggal format ISO",
      time: "jam format ISO",
      duration: "durasi format ISO",
      ipv4: "alamat IPv4",
      ipv6: "alamat IPv6",
      cidrv4: "rentang alamat IPv4",
      cidrv6: "rentang alamat IPv6",
      base64: "string dengan enkode base64",
      base64url: "string dengan enkode base64url",
      json_string: "string JSON",
      e164: "angka E.164",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Input tidak valid: diharapkan ${issue2.expected}, diterima ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Input tidak valid: diharapkan ${stringifyPrimitive(issue2.values[0])}`;
          return `Pilihan tidak valid: diharapkan salah satu dari ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Terlalu besar: diharapkan ${(_a = issue2.origin) != null ? _a : "value"} memiliki ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elemen"}`;
          return `Terlalu besar: diharapkan ${(_c = issue2.origin) != null ? _c : "value"} menjadi ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Terlalu kecil: diharapkan ${issue2.origin} memiliki ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Terlalu kecil: diharapkan ${issue2.origin} menjadi ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `String tidak valid: harus dimulai dengan "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `String tidak valid: harus berakhir dengan "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `String tidak valid: harus menyertakan "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `String tidak valid: harus sesuai pola ${_issue.pattern}`;
          return `${(_d = Nouns[_issue.format]) != null ? _d : issue2.format} tidak valid`;
        }
        case "not_multiple_of":
          return `Angka tidak valid: harus kelipatan dari ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Kunci tidak dikenali ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Kunci tidak valid di ${issue2.origin}`;
        case "invalid_union":
          return "Input tidak valid";
        case "invalid_element":
          return `Nilai tidak valid di ${issue2.origin}`;
        default:
          return `Input tidak valid`;
      }
    };
  };
  function id_default() {
    return {
      localeError: error18()
    };
  }

  // node_modules/zod/v4/locales/is.js
  var parsedType4 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "n\xFAmer";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "fylki";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  var error19 = () => {
    const Sizable = {
      string: { unit: "stafi", verb: "a\xF0 hafa" },
      file: { unit: "b\xE6ti", verb: "a\xF0 hafa" },
      array: { unit: "hluti", verb: "a\xF0 hafa" },
      set: { unit: "hluti", verb: "a\xF0 hafa" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const Nouns = {
      regex: "gildi",
      email: "netfang",
      url: "vefsl\xF3\xF0",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO dagsetning og t\xEDmi",
      date: "ISO dagsetning",
      time: "ISO t\xEDmi",
      duration: "ISO t\xEDmalengd",
      ipv4: "IPv4 address",
      ipv6: "IPv6 address",
      cidrv4: "IPv4 range",
      cidrv6: "IPv6 range",
      base64: "base64-encoded strengur",
      base64url: "base64url-encoded strengur",
      json_string: "JSON strengur",
      e164: "E.164 t\xF6lugildi",
      jwt: "JWT",
      template_literal: "gildi"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Rangt gildi: \xDE\xFA sl\xF3st inn ${parsedType4(issue2.input)} \xFEar sem \xE1 a\xF0 vera ${issue2.expected}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Rangt gildi: gert r\xE1\xF0 fyrir ${stringifyPrimitive(issue2.values[0])}`;
          return `\xD3gilt val: m\xE1 vera eitt af eftirfarandi ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${(_a = issue2.origin) != null ? _a : "gildi"} hafi ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "hluti"}`;
          return `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${(_c = issue2.origin) != null ? _c : "gildi"} s\xE9 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${issue2.origin} hafi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${issue2.origin} s\xE9 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\xD3gildur strengur: ver\xF0ur a\xF0 byrja \xE1 "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `\xD3gildur strengur: ver\xF0ur a\xF0 enda \xE1 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\xD3gildur strengur: ver\xF0ur a\xF0 innihalda "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\xD3gildur strengur: ver\xF0ur a\xF0 fylgja mynstri ${_issue.pattern}`;
          return `Rangt ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `R\xF6ng tala: ver\xF0ur a\xF0 vera margfeldi af ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\xD3\xFEekkt ${issue2.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Rangur lykill \xED ${issue2.origin}`;
        case "invalid_union":
          return "Rangt gildi";
        case "invalid_element":
          return `Rangt gildi \xED ${issue2.origin}`;
        default:
          return `Rangt gildi`;
      }
    };
  };
  function is_default() {
    return {
      localeError: error19()
    };
  }

  // node_modules/zod/v4/locales/it.js
  var error20 = () => {
    const Sizable = {
      string: { unit: "caratteri", verb: "avere" },
      file: { unit: "byte", verb: "avere" },
      array: { unit: "elementi", verb: "avere" },
      set: { unit: "elementi", verb: "avere" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "numero";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "vettore";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "input",
      email: "indirizzo email",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "data e ora ISO",
      date: "data ISO",
      time: "ora ISO",
      duration: "durata ISO",
      ipv4: "indirizzo IPv4",
      ipv6: "indirizzo IPv6",
      cidrv4: "intervallo IPv4",
      cidrv6: "intervallo IPv6",
      base64: "stringa codificata in base64",
      base64url: "URL codificata in base64",
      json_string: "stringa JSON",
      e164: "numero E.164",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Input non valido: atteso ${issue2.expected}, ricevuto ${parsedType8(issue2.input)}`;
        // return `Input non valido: atteso ${issue.expected}, ricevuto ${util.getParsedType(issue.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Input non valido: atteso ${stringifyPrimitive(issue2.values[0])}`;
          return `Opzione non valida: atteso uno tra ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Troppo grande: ${(_a = issue2.origin) != null ? _a : "valore"} deve avere ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elementi"}`;
          return `Troppo grande: ${(_c = issue2.origin) != null ? _c : "valore"} deve essere ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Troppo piccolo: ${issue2.origin} deve avere ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Troppo piccolo: ${issue2.origin} deve essere ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Stringa non valida: deve iniziare con "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Stringa non valida: deve terminare con "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Stringa non valida: deve includere "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Stringa non valida: deve corrispondere al pattern ${_issue.pattern}`;
          return `Invalid ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `Numero non valido: deve essere un multiplo di ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Chiav${issue2.keys.length > 1 ? "i" : "e"} non riconosciut${issue2.keys.length > 1 ? "e" : "a"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Chiave non valida in ${issue2.origin}`;
        case "invalid_union":
          return "Input non valido";
        case "invalid_element":
          return `Valore non valido in ${issue2.origin}`;
        default:
          return `Input non valido`;
      }
    };
  };
  function it_default() {
    return {
      localeError: error20()
    };
  }

  // node_modules/zod/v4/locales/ja.js
  var error21 = () => {
    const Sizable = {
      string: { unit: "\u6587\u5B57", verb: "\u3067\u3042\u308B" },
      file: { unit: "\u30D0\u30A4\u30C8", verb: "\u3067\u3042\u308B" },
      array: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" },
      set: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u6570\u5024";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u914D\u5217";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u5165\u529B\u5024",
      email: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9",
      url: "URL",
      emoji: "\u7D75\u6587\u5B57",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO\u65E5\u6642",
      date: "ISO\u65E5\u4ED8",
      time: "ISO\u6642\u523B",
      duration: "ISO\u671F\u9593",
      ipv4: "IPv4\u30A2\u30C9\u30EC\u30B9",
      ipv6: "IPv6\u30A2\u30C9\u30EC\u30B9",
      cidrv4: "IPv4\u7BC4\u56F2",
      cidrv6: "IPv6\u7BC4\u56F2",
      base64: "base64\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217",
      base64url: "base64url\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217",
      json_string: "JSON\u6587\u5B57\u5217",
      e164: "E.164\u756A\u53F7",
      jwt: "JWT",
      template_literal: "\u5165\u529B\u5024"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u7121\u52B9\u306A\u5165\u529B: ${issue2.expected}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F\u304C\u3001${parsedType8(issue2.input)}\u304C\u5165\u529B\u3055\u308C\u307E\u3057\u305F`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u7121\u52B9\u306A\u5165\u529B: ${stringifyPrimitive(issue2.values[0])}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F`;
          return `\u7121\u52B9\u306A\u9078\u629E: ${joinValues(issue2.values, "\u3001")}\u306E\u3044\u305A\u308C\u304B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        case "too_big": {
          const adj = issue2.inclusive ? "\u4EE5\u4E0B\u3067\u3042\u308B" : "\u3088\u308A\u5C0F\u3055\u3044";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u5927\u304D\u3059\u304E\u308B\u5024: ${(_a = issue2.origin) != null ? _a : "\u5024"}\u306F${issue2.maximum.toString()}${(_b = sizing.unit) != null ? _b : "\u8981\u7D20"}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          return `\u5927\u304D\u3059\u304E\u308B\u5024: ${(_c = issue2.origin) != null ? _c : "\u5024"}\u306F${issue2.maximum.toString()}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? "\u4EE5\u4E0A\u3067\u3042\u308B" : "\u3088\u308A\u5927\u304D\u3044";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${issue2.origin}\u306F${issue2.minimum.toString()}${sizing.unit}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          return `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${issue2.origin}\u306F${issue2.minimum.toString()}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${_issue.prefix}"\u3067\u59CB\u307E\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          if (_issue.format === "ends_with")
            return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${_issue.suffix}"\u3067\u7D42\u308F\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          if (_issue.format === "includes")
            return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${_issue.includes}"\u3092\u542B\u3080\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          if (_issue.format === "regex")
            return `\u7121\u52B9\u306A\u6587\u5B57\u5217: \u30D1\u30BF\u30FC\u30F3${_issue.pattern}\u306B\u4E00\u81F4\u3059\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          return `\u7121\u52B9\u306A${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u7121\u52B9\u306A\u6570\u5024: ${issue2.divisor}\u306E\u500D\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        case "unrecognized_keys":
          return `\u8A8D\u8B58\u3055\u308C\u3066\u3044\u306A\u3044\u30AD\u30FC${issue2.keys.length > 1 ? "\u7FA4" : ""}: ${joinValues(issue2.keys, "\u3001")}`;
        case "invalid_key":
          return `${issue2.origin}\u5185\u306E\u7121\u52B9\u306A\u30AD\u30FC`;
        case "invalid_union":
          return "\u7121\u52B9\u306A\u5165\u529B";
        case "invalid_element":
          return `${issue2.origin}\u5185\u306E\u7121\u52B9\u306A\u5024`;
        default:
          return `\u7121\u52B9\u306A\u5165\u529B`;
      }
    };
  };
  function ja_default() {
    return {
      localeError: error21()
    };
  }

  // node_modules/zod/v4/locales/ka.js
  var parsedType5 = (data) => {
    var _a;
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "\u10E0\u10D8\u10EA\u10EE\u10D5\u10D8";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "\u10DB\u10D0\u10E1\u10D8\u10D5\u10D8";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    const typeMap = {
      string: "\u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8",
      boolean: "\u10D1\u10E3\u10DA\u10D4\u10D0\u10DC\u10D8",
      undefined: "undefined",
      bigint: "bigint",
      symbol: "symbol",
      function: "\u10E4\u10E3\u10DC\u10E5\u10EA\u10D8\u10D0"
    };
    return (_a = typeMap[t]) != null ? _a : t;
  };
  var error22 = () => {
    const Sizable = {
      string: { unit: "\u10E1\u10D8\u10DB\u10D1\u10DD\u10DA\u10DD", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" },
      file: { unit: "\u10D1\u10D0\u10D8\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" },
      array: { unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" },
      set: { unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const Nouns = {
      regex: "\u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0",
      email: "\u10D4\u10DA-\u10E4\u10DD\u10E1\u10E2\u10D8\u10E1 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
      url: "URL",
      emoji: "\u10D4\u10DB\u10DD\u10EF\u10D8",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u10D7\u10D0\u10E0\u10D8\u10E6\u10D8-\u10D3\u10E0\u10DD",
      date: "\u10D7\u10D0\u10E0\u10D8\u10E6\u10D8",
      time: "\u10D3\u10E0\u10DD",
      duration: "\u10EE\u10D0\u10DC\u10D2\u10E0\u10EB\u10DA\u10D8\u10D5\u10DD\u10D1\u10D0",
      ipv4: "IPv4 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
      ipv6: "IPv6 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
      cidrv4: "IPv4 \u10D3\u10D8\u10D0\u10DE\u10D0\u10D6\u10DD\u10DC\u10D8",
      cidrv6: "IPv6 \u10D3\u10D8\u10D0\u10DE\u10D0\u10D6\u10DD\u10DC\u10D8",
      base64: "base64-\u10D9\u10DD\u10D3\u10D8\u10E0\u10D4\u10D1\u10E3\u10DA\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8",
      base64url: "base64url-\u10D9\u10DD\u10D3\u10D8\u10E0\u10D4\u10D1\u10E3\u10DA\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8",
      json_string: "JSON \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8",
      e164: "E.164 \u10DC\u10DD\u10DB\u10D4\u10E0\u10D8",
      jwt: "JWT",
      template_literal: "\u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0"
    };
    return (issue2) => {
      var _a, _b, _c;
      switch (issue2.code) {
        case "invalid_type":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.expected}, \u10DB\u10D8\u10E6\u10D4\u10D1\u10E3\u10DA\u10D8 ${parsedType5(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${stringifyPrimitive(issue2.values[0])}`;
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D0\u10E0\u10D8\u10D0\u10DC\u10E2\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8\u10D0 \u10D4\u10E0\u10D7-\u10D4\u10E0\u10D7\u10D8 ${joinValues(issue2.values, "|")}-\u10D3\u10D0\u10DC`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10D3\u10D8\u10D3\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${(_a = issue2.origin) != null ? _a : "\u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
          return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10D3\u10D8\u10D3\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${(_b = issue2.origin) != null ? _b : "\u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0"} \u10D8\u10E7\u10DD\u10E1 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10DE\u10D0\u10E2\u10D0\u10E0\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10DE\u10D0\u10E2\u10D0\u10E0\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.origin} \u10D8\u10E7\u10DD\u10E1 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10D8\u10EC\u10E7\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 "${_issue.prefix}"-\u10D8\u10D7`;
          }
          if (_issue.format === "ends_with")
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10DB\u10D7\u10D0\u10D5\u10E0\u10D3\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 "${_issue.suffix}"-\u10D8\u10D7`;
          if (_issue.format === "includes")
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1 "${_issue.includes}"-\u10E1`;
          if (_issue.format === "regex")
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D4\u10E1\u10D0\u10D1\u10D0\u10DB\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 \u10E8\u10D0\u10D1\u10DA\u10DD\u10DC\u10E1 ${_issue.pattern}`;
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 ${(_c = Nouns[_issue.format]) != null ? _c : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E0\u10D8\u10EA\u10EE\u10D5\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10D8\u10E7\u10DD\u10E1 ${issue2.divisor}-\u10D8\u10E1 \u10EF\u10D4\u10E0\u10D0\u10D3\u10D8`;
        case "unrecognized_keys":
          return `\u10E3\u10EA\u10DC\u10DD\u10D1\u10D8 \u10D2\u10D0\u10E1\u10D0\u10E6\u10D4\u10D1${issue2.keys.length > 1 ? "\u10D4\u10D1\u10D8" : "\u10D8"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D2\u10D0\u10E1\u10D0\u10E6\u10D4\u10D1\u10D8 ${issue2.origin}-\u10E8\u10D8`;
        case "invalid_union":
          return "\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0";
        case "invalid_element":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0 ${issue2.origin}-\u10E8\u10D8`;
        default:
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0`;
      }
    };
  };
  function ka_default() {
    return {
      localeError: error22()
    };
  }

  // node_modules/zod/v4/locales/km.js
  var error23 = () => {
    const Sizable = {
      string: { unit: "\u178F\u17BD\u17A2\u1780\u17D2\u179F\u179A", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
      file: { unit: "\u1794\u17C3", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
      array: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
      set: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "\u1798\u17B7\u1793\u1798\u17C2\u1793\u1787\u17B6\u179B\u17C1\u1781 (NaN)" : "\u179B\u17C1\u1781";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u17A2\u17B6\u179A\u17C1 (Array)";
          }
          if (data === null) {
            return "\u1782\u17D2\u1798\u17B6\u1793\u178F\u1798\u17D2\u179B\u17C3 (null)";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B",
      email: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793\u17A2\u17CA\u17B8\u1798\u17C2\u179B",
      url: "URL",
      emoji: "\u179F\u1789\u17D2\u1789\u17B6\u17A2\u17B6\u179A\u1798\u17D2\u1798\u178E\u17CD",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 \u1793\u17B7\u1784\u1798\u17C9\u17C4\u1784 ISO",
      date: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 ISO",
      time: "\u1798\u17C9\u17C4\u1784 ISO",
      duration: "\u179A\u1799\u17C8\u1796\u17C1\u179B ISO",
      ipv4: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4",
      ipv6: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6",
      cidrv4: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4",
      cidrv6: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6",
      base64: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64",
      base64url: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64url",
      json_string: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A JSON",
      e164: "\u179B\u17C1\u1781 E.164",
      jwt: "JWT",
      template_literal: "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.expected} \u1794\u17C9\u17BB\u1793\u17D2\u178F\u17C2\u1791\u1791\u17BD\u179B\u1794\u17B6\u1793 ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${stringifyPrimitive(issue2.values[0])}`;
          return `\u1787\u1798\u17D2\u179A\u17BE\u179F\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1787\u17B6\u1798\u17BD\u1799\u1780\u17D2\u1793\u17BB\u1784\u1785\u17C6\u178E\u17C4\u1798 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${(_a = issue2.origin) != null ? _a : "\u178F\u1798\u17D2\u179B\u17C3"} ${adj} ${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\u1792\u17B6\u178F\u17BB"}`;
          return `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${(_c = issue2.origin) != null ? _c : "\u178F\u1798\u17D2\u179B\u17C3"} ${adj} ${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.origin} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.origin} ${adj} ${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1785\u17B6\u1794\u17CB\u1795\u17D2\u178F\u17BE\u1798\u178A\u17C4\u1799 "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1794\u1789\u17D2\u1785\u1794\u17CB\u178A\u17C4\u1799 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1798\u17B6\u1793 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1795\u17D2\u1782\u17BC\u1795\u17D2\u1782\u1784\u1793\u17B9\u1784\u1791\u1798\u17D2\u179A\u1784\u17CB\u178A\u17C2\u179B\u1794\u17B6\u1793\u1780\u17C6\u178E\u178F\u17CB ${_issue.pattern}`;
          return `\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u179B\u17C1\u1781\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1787\u17B6\u1796\u17A0\u17BB\u1782\u17BB\u178E\u1793\u17C3 ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u179A\u1780\u1783\u17BE\u1789\u179F\u17C4\u1798\u17B7\u1793\u179F\u17D2\u1782\u17B6\u179B\u17CB\u17D6 ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u179F\u17C4\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${issue2.origin}`;
        case "invalid_union":
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C`;
        case "invalid_element":
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${issue2.origin}`;
        default:
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C`;
      }
    };
  };
  function km_default() {
    return {
      localeError: error23()
    };
  }

  // node_modules/zod/v4/locales/kh.js
  function kh_default() {
    return km_default();
  }

  // node_modules/zod/v4/locales/ko.js
  var error24 = () => {
    const Sizable = {
      string: { unit: "\uBB38\uC790", verb: "to have" },
      file: { unit: "\uBC14\uC774\uD2B8", verb: "to have" },
      array: { unit: "\uAC1C", verb: "to have" },
      set: { unit: "\uAC1C", verb: "to have" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\uC785\uB825",
      email: "\uC774\uBA54\uC77C \uC8FC\uC18C",
      url: "URL",
      emoji: "\uC774\uBAA8\uC9C0",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \uB0A0\uC9DC\uC2DC\uAC04",
      date: "ISO \uB0A0\uC9DC",
      time: "ISO \uC2DC\uAC04",
      duration: "ISO \uAE30\uAC04",
      ipv4: "IPv4 \uC8FC\uC18C",
      ipv6: "IPv6 \uC8FC\uC18C",
      cidrv4: "IPv4 \uBC94\uC704",
      cidrv6: "IPv6 \uBC94\uC704",
      base64: "base64 \uC778\uCF54\uB529 \uBB38\uC790\uC5F4",
      base64url: "base64url \uC778\uCF54\uB529 \uBB38\uC790\uC5F4",
      json_string: "JSON \uBB38\uC790\uC5F4",
      e164: "E.164 \uBC88\uD638",
      jwt: "JWT",
      template_literal: "\uC785\uB825"
    };
    return (issue2) => {
      var _a, _b, _c, _d, _e, _f, _g;
      switch (issue2.code) {
        case "invalid_type":
          return `\uC798\uBABB\uB41C \uC785\uB825: \uC608\uC0C1 \uD0C0\uC785\uC740 ${issue2.expected}, \uBC1B\uC740 \uD0C0\uC785\uC740 ${parsedType8(issue2.input)}\uC785\uB2C8\uB2E4`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\uC798\uBABB\uB41C \uC785\uB825: \uAC12\uC740 ${stringifyPrimitive(issue2.values[0])} \uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`;
          return `\uC798\uBABB\uB41C \uC635\uC158: ${joinValues(issue2.values, "\uB610\uB294 ")} \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
        case "too_big": {
          const adj = issue2.inclusive ? "\uC774\uD558" : "\uBBF8\uB9CC";
          const suffix = adj === "\uBBF8\uB9CC" ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" : "\uC5EC\uC57C \uD569\uB2C8\uB2E4";
          const sizing = getSizing(issue2.origin);
          const unit = (_a = sizing == null ? void 0 : sizing.unit) != null ? _a : "\uC694\uC18C";
          if (sizing)
            return `${(_b = issue2.origin) != null ? _b : "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${issue2.maximum.toString()}${unit} ${adj}${suffix}`;
          return `${(_c = issue2.origin) != null ? _c : "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${issue2.maximum.toString()} ${adj}${suffix}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? "\uC774\uC0C1" : "\uCD08\uACFC";
          const suffix = adj === "\uC774\uC0C1" ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" : "\uC5EC\uC57C \uD569\uB2C8\uB2E4";
          const sizing = getSizing(issue2.origin);
          const unit = (_d = sizing == null ? void 0 : sizing.unit) != null ? _d : "\uC694\uC18C";
          if (sizing) {
            return `${(_e = issue2.origin) != null ? _e : "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${issue2.minimum.toString()}${unit} ${adj}${suffix}`;
          }
          return `${(_f = issue2.origin) != null ? _f : "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${issue2.minimum.toString()} ${adj}${suffix}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${_issue.prefix}"(\uC73C)\uB85C \uC2DC\uC791\uD574\uC57C \uD569\uB2C8\uB2E4`;
          }
          if (_issue.format === "ends_with")
            return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${_issue.suffix}"(\uC73C)\uB85C \uB05D\uB098\uC57C \uD569\uB2C8\uB2E4`;
          if (_issue.format === "includes")
            return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${_issue.includes}"\uC744(\uB97C) \uD3EC\uD568\uD574\uC57C \uD569\uB2C8\uB2E4`;
          if (_issue.format === "regex")
            return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: \uC815\uADDC\uC2DD ${_issue.pattern} \uD328\uD134\uACFC \uC77C\uCE58\uD574\uC57C \uD569\uB2C8\uB2E4`;
          return `\uC798\uBABB\uB41C ${(_g = Nouns[_issue.format]) != null ? _g : issue2.format}`;
        }
        case "not_multiple_of":
          return `\uC798\uBABB\uB41C \uC22B\uC790: ${issue2.divisor}\uC758 \uBC30\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
        case "unrecognized_keys":
          return `\uC778\uC2DD\uD560 \uC218 \uC5C6\uB294 \uD0A4: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\uC798\uBABB\uB41C \uD0A4: ${issue2.origin}`;
        case "invalid_union":
          return `\uC798\uBABB\uB41C \uC785\uB825`;
        case "invalid_element":
          return `\uC798\uBABB\uB41C \uAC12: ${issue2.origin}`;
        default:
          return `\uC798\uBABB\uB41C \uC785\uB825`;
      }
    };
  };
  function ko_default() {
    return {
      localeError: error24()
    };
  }

  // node_modules/zod/v4/locales/lt.js
  var parsedType6 = (data) => {
    const t = typeof data;
    return parsedTypeFromType(t, data);
  };
  var parsedTypeFromType = (t, data = void 0) => {
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "skai\u010Dius";
      }
      case "bigint": {
        return "sveikasis skai\u010Dius";
      }
      case "string": {
        return "eilut\u0117";
      }
      case "boolean": {
        return "login\u0117 reik\u0161m\u0117";
      }
      case "undefined":
      case "void": {
        return "neapibr\u0117\u017Eta reik\u0161m\u0117";
      }
      case "function": {
        return "funkcija";
      }
      case "symbol": {
        return "simbolis";
      }
      case "object": {
        if (data === void 0)
          return "ne\u017Einomas objektas";
        if (data === null)
          return "nulin\u0117 reik\u0161m\u0117";
        if (Array.isArray(data))
          return "masyvas";
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
        return "objektas";
      }
      //Zod types below
      case "null": {
        return "nulin\u0117 reik\u0161m\u0117";
      }
    }
    return t;
  };
  var capitalizeFirstCharacter = (text) => {
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  function getUnitTypeFromNumber(number4) {
    const abs = Math.abs(number4);
    const last = abs % 10;
    const last2 = abs % 100;
    if (last2 >= 11 && last2 <= 19 || last === 0)
      return "many";
    if (last === 1)
      return "one";
    return "few";
  }
  var error25 = () => {
    const Sizable = {
      string: {
        unit: {
          one: "simbolis",
          few: "simboliai",
          many: "simboli\u0173"
        },
        verb: {
          smaller: {
            inclusive: "turi b\u016Bti ne ilgesn\u0117 kaip",
            notInclusive: "turi b\u016Bti trumpesn\u0117 kaip"
          },
          bigger: {
            inclusive: "turi b\u016Bti ne trumpesn\u0117 kaip",
            notInclusive: "turi b\u016Bti ilgesn\u0117 kaip"
          }
        }
      },
      file: {
        unit: {
          one: "baitas",
          few: "baitai",
          many: "bait\u0173"
        },
        verb: {
          smaller: {
            inclusive: "turi b\u016Bti ne didesnis kaip",
            notInclusive: "turi b\u016Bti ma\u017Eesnis kaip"
          },
          bigger: {
            inclusive: "turi b\u016Bti ne ma\u017Eesnis kaip",
            notInclusive: "turi b\u016Bti didesnis kaip"
          }
        }
      },
      array: {
        unit: {
          one: "element\u0105",
          few: "elementus",
          many: "element\u0173"
        },
        verb: {
          smaller: {
            inclusive: "turi tur\u0117ti ne daugiau kaip",
            notInclusive: "turi tur\u0117ti ma\u017Eiau kaip"
          },
          bigger: {
            inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip",
            notInclusive: "turi tur\u0117ti daugiau kaip"
          }
        }
      },
      set: {
        unit: {
          one: "element\u0105",
          few: "elementus",
          many: "element\u0173"
        },
        verb: {
          smaller: {
            inclusive: "turi tur\u0117ti ne daugiau kaip",
            notInclusive: "turi tur\u0117ti ma\u017Eiau kaip"
          },
          bigger: {
            inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip",
            notInclusive: "turi tur\u0117ti daugiau kaip"
          }
        }
      }
    };
    function getSizing(origin, unitType, inclusive, targetShouldBe) {
      var _a;
      const result = (_a = Sizable[origin]) != null ? _a : null;
      if (result === null)
        return result;
      return {
        unit: result.unit[unitType],
        verb: result.verb[targetShouldBe][inclusive ? "inclusive" : "notInclusive"]
      };
    }
    const Nouns = {
      regex: "\u012Fvestis",
      email: "el. pa\u0161to adresas",
      url: "URL",
      emoji: "jaustukas",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO data ir laikas",
      date: "ISO data",
      time: "ISO laikas",
      duration: "ISO trukm\u0117",
      ipv4: "IPv4 adresas",
      ipv6: "IPv6 adresas",
      cidrv4: "IPv4 tinklo prefiksas (CIDR)",
      cidrv6: "IPv6 tinklo prefiksas (CIDR)",
      base64: "base64 u\u017Ekoduota eilut\u0117",
      base64url: "base64url u\u017Ekoduota eilut\u0117",
      json_string: "JSON eilut\u0117",
      e164: "E.164 numeris",
      jwt: "JWT",
      template_literal: "\u012Fvestis"
    };
    return (issue2) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
      switch (issue2.code) {
        case "invalid_type":
          return `Gautas tipas ${parsedType6(issue2.input)}, o tik\u0117tasi - ${parsedTypeFromType(issue2.expected)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Privalo b\u016Bti ${stringifyPrimitive(issue2.values[0])}`;
          return `Privalo b\u016Bti vienas i\u0161 ${joinValues(issue2.values, "|")} pasirinkim\u0173`;
        case "too_big": {
          const origin = parsedTypeFromType(issue2.origin);
          const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.maximum)), (_a = issue2.inclusive) != null ? _a : false, "smaller");
          if (sizing == null ? void 0 : sizing.verb)
            return `${capitalizeFirstCharacter((_b = origin != null ? origin : issue2.origin) != null ? _b : "reik\u0161m\u0117")} ${sizing.verb} ${issue2.maximum.toString()} ${(_c = sizing.unit) != null ? _c : "element\u0173"}`;
          const adj = issue2.inclusive ? "ne didesnis kaip" : "ma\u017Eesnis kaip";
          return `${capitalizeFirstCharacter((_d = origin != null ? origin : issue2.origin) != null ? _d : "reik\u0161m\u0117")} turi b\u016Bti ${adj} ${issue2.maximum.toString()} ${sizing == null ? void 0 : sizing.unit}`;
        }
        case "too_small": {
          const origin = parsedTypeFromType(issue2.origin);
          const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.minimum)), (_e = issue2.inclusive) != null ? _e : false, "bigger");
          if (sizing == null ? void 0 : sizing.verb)
            return `${capitalizeFirstCharacter((_f = origin != null ? origin : issue2.origin) != null ? _f : "reik\u0161m\u0117")} ${sizing.verb} ${issue2.minimum.toString()} ${(_g = sizing.unit) != null ? _g : "element\u0173"}`;
          const adj = issue2.inclusive ? "ne ma\u017Eesnis kaip" : "didesnis kaip";
          return `${capitalizeFirstCharacter((_h = origin != null ? origin : issue2.origin) != null ? _h : "reik\u0161m\u0117")} turi b\u016Bti ${adj} ${issue2.minimum.toString()} ${sizing == null ? void 0 : sizing.unit}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Eilut\u0117 privalo prasid\u0117ti "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Eilut\u0117 privalo pasibaigti "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Eilut\u0117 privalo \u012Ftraukti "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Eilut\u0117 privalo atitikti ${_issue.pattern}`;
          return `Neteisingas ${(_i = Nouns[_issue.format]) != null ? _i : issue2.format}`;
        }
        case "not_multiple_of":
          return `Skai\u010Dius privalo b\u016Bti ${issue2.divisor} kartotinis.`;
        case "unrecognized_keys":
          return `Neatpa\u017Eint${issue2.keys.length > 1 ? "i" : "as"} rakt${issue2.keys.length > 1 ? "ai" : "as"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return "Rastas klaidingas raktas";
        case "invalid_union":
          return "Klaidinga \u012Fvestis";
        case "invalid_element": {
          const origin = parsedTypeFromType(issue2.origin);
          return `${capitalizeFirstCharacter((_j = origin != null ? origin : issue2.origin) != null ? _j : "reik\u0161m\u0117")} turi klaiding\u0105 \u012Fvest\u012F`;
        }
        default:
          return "Klaidinga \u012Fvestis";
      }
    };
  };
  function lt_default() {
    return {
      localeError: error25()
    };
  }

  // node_modules/zod/v4/locales/mk.js
  var error26 = () => {
    const Sizable = {
      string: { unit: "\u0437\u043D\u0430\u0446\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" },
      file: { unit: "\u0431\u0430\u0458\u0442\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" },
      array: { unit: "\u0441\u0442\u0430\u0432\u043A\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" },
      set: { unit: "\u0441\u0442\u0430\u0432\u043A\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0431\u0440\u043E\u0458";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u043D\u0438\u0437\u0430";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u0432\u043D\u0435\u0441",
      email: "\u0430\u0434\u0440\u0435\u0441\u0430 \u043D\u0430 \u0435-\u043F\u043E\u0448\u0442\u0430",
      url: "URL",
      emoji: "\u0435\u043C\u043E\u045F\u0438",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \u0434\u0430\u0442\u0443\u043C \u0438 \u0432\u0440\u0435\u043C\u0435",
      date: "ISO \u0434\u0430\u0442\u0443\u043C",
      time: "ISO \u0432\u0440\u0435\u043C\u0435",
      duration: "ISO \u0432\u0440\u0435\u043C\u0435\u0442\u0440\u0430\u0435\u045A\u0435",
      ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441\u0430",
      ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441\u0430",
      cidrv4: "IPv4 \u043E\u043F\u0441\u0435\u0433",
      cidrv6: "IPv6 \u043E\u043F\u0441\u0435\u0433",
      base64: "base64-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430",
      base64url: "base64url-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430",
      json_string: "JSON \u043D\u0438\u0437\u0430",
      e164: "E.164 \u0431\u0440\u043E\u0458",
      jwt: "JWT",
      template_literal: "\u0432\u043D\u0435\u0441"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.expected}, \u043F\u0440\u0438\u043C\u0435\u043D\u043E ${parsedType8(issue2.input)}`;
        // return `Invalid input: expected ${issue.expected}, received ${util.getParsedType(issue.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
          return `\u0413\u0440\u0435\u0448\u0430\u043D\u0430 \u043E\u043F\u0446\u0438\u0458\u0430: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 \u0435\u0434\u043D\u0430 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${(_a = issue2.origin) != null ? _a : "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0438\u043C\u0430 ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438"}`;
          return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${(_c = issue2.origin) != null ? _c : "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0431\u0438\u0434\u0435 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.origin} \u0434\u0430 \u0438\u043C\u0430 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.origin} \u0434\u0430 \u0431\u0438\u0434\u0435 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u043D\u0443\u0432\u0430 \u0441\u043E "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u0432\u0440\u0448\u0443\u0432\u0430 \u0441\u043E "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0432\u043A\u043B\u0443\u0447\u0443\u0432\u0430 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u043E\u0434\u0433\u043E\u0430\u0440\u0430 \u043D\u0430 \u043F\u0430\u0442\u0435\u0440\u043D\u043E\u0442 ${_issue.pattern}`;
          return `Invalid ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u0431\u0440\u043E\u0458: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0431\u0438\u0434\u0435 \u0434\u0435\u043B\u0438\u0432 \u0441\u043E ${issue2.divisor}`;
        case "unrecognized_keys":
          return `${issue2.keys.length > 1 ? "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D\u0438 \u043A\u043B\u0443\u0447\u0435\u0432\u0438" : "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D \u043A\u043B\u0443\u0447"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u043A\u043B\u0443\u0447 \u0432\u043E ${issue2.origin}`;
        case "invalid_union":
          return "\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441";
        case "invalid_element":
          return `\u0413\u0440\u0435\u0448\u043D\u0430 \u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442 \u0432\u043E ${issue2.origin}`;
        default:
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441`;
      }
    };
  };
  function mk_default() {
    return {
      localeError: error26()
    };
  }

  // node_modules/zod/v4/locales/ms.js
  var error27 = () => {
    const Sizable = {
      string: { unit: "aksara", verb: "mempunyai" },
      file: { unit: "bait", verb: "mempunyai" },
      array: { unit: "elemen", verb: "mempunyai" },
      set: { unit: "elemen", verb: "mempunyai" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "nombor";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "input",
      email: "alamat e-mel",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "tarikh masa ISO",
      date: "tarikh ISO",
      time: "masa ISO",
      duration: "tempoh ISO",
      ipv4: "alamat IPv4",
      ipv6: "alamat IPv6",
      cidrv4: "julat IPv4",
      cidrv6: "julat IPv6",
      base64: "string dikodkan base64",
      base64url: "string dikodkan base64url",
      json_string: "string JSON",
      e164: "nombor E.164",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Input tidak sah: dijangka ${issue2.expected}, diterima ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Input tidak sah: dijangka ${stringifyPrimitive(issue2.values[0])}`;
          return `Pilihan tidak sah: dijangka salah satu daripada ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Terlalu besar: dijangka ${(_a = issue2.origin) != null ? _a : "nilai"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elemen"}`;
          return `Terlalu besar: dijangka ${(_c = issue2.origin) != null ? _c : "nilai"} adalah ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Terlalu kecil: dijangka ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Terlalu kecil: dijangka ${issue2.origin} adalah ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `String tidak sah: mesti bermula dengan "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `String tidak sah: mesti berakhir dengan "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `String tidak sah: mesti mengandungi "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `String tidak sah: mesti sepadan dengan corak ${_issue.pattern}`;
          return `${(_d = Nouns[_issue.format]) != null ? _d : issue2.format} tidak sah`;
        }
        case "not_multiple_of":
          return `Nombor tidak sah: perlu gandaan ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Kunci tidak dikenali: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Kunci tidak sah dalam ${issue2.origin}`;
        case "invalid_union":
          return "Input tidak sah";
        case "invalid_element":
          return `Nilai tidak sah dalam ${issue2.origin}`;
        default:
          return `Input tidak sah`;
      }
    };
  };
  function ms_default() {
    return {
      localeError: error27()
    };
  }

  // node_modules/zod/v4/locales/nl.js
  var error28 = () => {
    const Sizable = {
      string: { unit: "tekens" },
      file: { unit: "bytes" },
      array: { unit: "elementen" },
      set: { unit: "elementen" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "getal";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "invoer",
      email: "emailadres",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO datum en tijd",
      date: "ISO datum",
      time: "ISO tijd",
      duration: "ISO duur",
      ipv4: "IPv4-adres",
      ipv6: "IPv6-adres",
      cidrv4: "IPv4-bereik",
      cidrv6: "IPv6-bereik",
      base64: "base64-gecodeerde tekst",
      base64url: "base64 URL-gecodeerde tekst",
      json_string: "JSON string",
      e164: "E.164-nummer",
      jwt: "JWT",
      template_literal: "invoer"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Ongeldige invoer: verwacht ${issue2.expected}, ontving ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Ongeldige invoer: verwacht ${stringifyPrimitive(issue2.values[0])}`;
          return `Ongeldige optie: verwacht \xE9\xE9n van ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Te lang: verwacht dat ${(_a = issue2.origin) != null ? _a : "waarde"} ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elementen"} bevat`;
          return `Te lang: verwacht dat ${(_c = issue2.origin) != null ? _c : "waarde"} ${adj}${issue2.maximum.toString()} is`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Te kort: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} bevat`;
          }
          return `Te kort: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} is`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Ongeldige tekst: moet met "${_issue.prefix}" beginnen`;
          }
          if (_issue.format === "ends_with")
            return `Ongeldige tekst: moet op "${_issue.suffix}" eindigen`;
          if (_issue.format === "includes")
            return `Ongeldige tekst: moet "${_issue.includes}" bevatten`;
          if (_issue.format === "regex")
            return `Ongeldige tekst: moet overeenkomen met patroon ${_issue.pattern}`;
          return `Ongeldig: ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `Ongeldig getal: moet een veelvoud van ${issue2.divisor} zijn`;
        case "unrecognized_keys":
          return `Onbekende key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Ongeldige key in ${issue2.origin}`;
        case "invalid_union":
          return "Ongeldige invoer";
        case "invalid_element":
          return `Ongeldige waarde in ${issue2.origin}`;
        default:
          return `Ongeldige invoer`;
      }
    };
  };
  function nl_default() {
    return {
      localeError: error28()
    };
  }

  // node_modules/zod/v4/locales/no.js
  var error29 = () => {
    const Sizable = {
      string: { unit: "tegn", verb: "\xE5 ha" },
      file: { unit: "bytes", verb: "\xE5 ha" },
      array: { unit: "elementer", verb: "\xE5 inneholde" },
      set: { unit: "elementer", verb: "\xE5 inneholde" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "tall";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "liste";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "input",
      email: "e-postadresse",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO dato- og klokkeslett",
      date: "ISO-dato",
      time: "ISO-klokkeslett",
      duration: "ISO-varighet",
      ipv4: "IPv4-omr\xE5de",
      ipv6: "IPv6-omr\xE5de",
      cidrv4: "IPv4-spekter",
      cidrv6: "IPv6-spekter",
      base64: "base64-enkodet streng",
      base64url: "base64url-enkodet streng",
      json_string: "JSON-streng",
      e164: "E.164-nummer",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Ugyldig input: forventet ${issue2.expected}, fikk ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Ugyldig verdi: forventet ${stringifyPrimitive(issue2.values[0])}`;
          return `Ugyldig valg: forventet en av ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `For stor(t): forventet ${(_a = issue2.origin) != null ? _a : "value"} til \xE5 ha ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elementer"}`;
          return `For stor(t): forventet ${(_c = issue2.origin) != null ? _c : "value"} til \xE5 ha ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `For lite(n): forventet ${issue2.origin} til \xE5 ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `For lite(n): forventet ${issue2.origin} til \xE5 ha ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Ugyldig streng: m\xE5 starte med "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Ugyldig streng: m\xE5 ende med "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Ugyldig streng: m\xE5 inneholde "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Ugyldig streng: m\xE5 matche m\xF8nsteret ${_issue.pattern}`;
          return `Ugyldig ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `Ugyldig tall: m\xE5 v\xE6re et multiplum av ${issue2.divisor}`;
        case "unrecognized_keys":
          return `${issue2.keys.length > 1 ? "Ukjente n\xF8kler" : "Ukjent n\xF8kkel"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Ugyldig n\xF8kkel i ${issue2.origin}`;
        case "invalid_union":
          return "Ugyldig input";
        case "invalid_element":
          return `Ugyldig verdi i ${issue2.origin}`;
        default:
          return `Ugyldig input`;
      }
    };
  };
  function no_default() {
    return {
      localeError: error29()
    };
  }

  // node_modules/zod/v4/locales/ota.js
  var error30 = () => {
    const Sizable = {
      string: { unit: "harf", verb: "olmal\u0131d\u0131r" },
      file: { unit: "bayt", verb: "olmal\u0131d\u0131r" },
      array: { unit: "unsur", verb: "olmal\u0131d\u0131r" },
      set: { unit: "unsur", verb: "olmal\u0131d\u0131r" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "numara";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "saf";
          }
          if (data === null) {
            return "gayb";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "giren",
      email: "epostag\xE2h",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO heng\xE2m\u0131",
      date: "ISO tarihi",
      time: "ISO zaman\u0131",
      duration: "ISO m\xFCddeti",
      ipv4: "IPv4 ni\u015F\xE2n\u0131",
      ipv6: "IPv6 ni\u015F\xE2n\u0131",
      cidrv4: "IPv4 menzili",
      cidrv6: "IPv6 menzili",
      base64: "base64-\u015Fifreli metin",
      base64url: "base64url-\u015Fifreli metin",
      json_string: "JSON metin",
      e164: "E.164 say\u0131s\u0131",
      jwt: "JWT",
      template_literal: "giren"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `F\xE2sit giren: umulan ${issue2.expected}, al\u0131nan ${parsedType8(issue2.input)}`;
        // return `Fâsit giren: umulan ${issue.expected}, alınan ${util.getParsedType(issue.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `F\xE2sit giren: umulan ${stringifyPrimitive(issue2.values[0])}`;
          return `F\xE2sit tercih: m\xFBteberler ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Fazla b\xFCy\xFCk: ${(_a = issue2.origin) != null ? _a : "value"}, ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elements"} sahip olmal\u0131yd\u0131.`;
          return `Fazla b\xFCy\xFCk: ${(_c = issue2.origin) != null ? _c : "value"}, ${adj}${issue2.maximum.toString()} olmal\u0131yd\u0131.`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Fazla k\xFC\xE7\xFCk: ${issue2.origin}, ${adj}${issue2.minimum.toString()} ${sizing.unit} sahip olmal\u0131yd\u0131.`;
          }
          return `Fazla k\xFC\xE7\xFCk: ${issue2.origin}, ${adj}${issue2.minimum.toString()} olmal\u0131yd\u0131.`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `F\xE2sit metin: "${_issue.prefix}" ile ba\u015Flamal\u0131.`;
          if (_issue.format === "ends_with")
            return `F\xE2sit metin: "${_issue.suffix}" ile bitmeli.`;
          if (_issue.format === "includes")
            return `F\xE2sit metin: "${_issue.includes}" ihtiv\xE2 etmeli.`;
          if (_issue.format === "regex")
            return `F\xE2sit metin: ${_issue.pattern} nak\u015F\u0131na uymal\u0131.`;
          return `F\xE2sit ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `F\xE2sit say\u0131: ${issue2.divisor} kat\u0131 olmal\u0131yd\u0131.`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan anahtar ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `${issue2.origin} i\xE7in tan\u0131nmayan anahtar var.`;
        case "invalid_union":
          return "Giren tan\u0131namad\u0131.";
        case "invalid_element":
          return `${issue2.origin} i\xE7in tan\u0131nmayan k\u0131ymet var.`;
        default:
          return `K\u0131ymet tan\u0131namad\u0131.`;
      }
    };
  };
  function ota_default() {
    return {
      localeError: error30()
    };
  }

  // node_modules/zod/v4/locales/ps.js
  var error31 = () => {
    const Sizable = {
      string: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" },
      file: { unit: "\u0628\u0627\u06CC\u067C\u0633", verb: "\u0648\u0644\u0631\u064A" },
      array: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" },
      set: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0639\u062F\u062F";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u0627\u0631\u06D0";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u0648\u0631\u0648\u062F\u064A",
      email: "\u0628\u0631\u06CC\u069A\u0646\u0627\u0644\u06CC\u06A9",
      url: "\u06CC\u0648 \u0622\u0631 \u0627\u0644",
      emoji: "\u0627\u06CC\u0645\u0648\u062C\u064A",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u0646\u06CC\u067C\u0647 \u0627\u0648 \u0648\u062E\u062A",
      date: "\u0646\u06D0\u067C\u0647",
      time: "\u0648\u062E\u062A",
      duration: "\u0645\u0648\u062F\u0647",
      ipv4: "\u062F IPv4 \u067E\u062A\u0647",
      ipv6: "\u062F IPv6 \u067E\u062A\u0647",
      cidrv4: "\u062F IPv4 \u0633\u0627\u062D\u0647",
      cidrv6: "\u062F IPv6 \u0633\u0627\u062D\u0647",
      base64: "base64-encoded \u0645\u062A\u0646",
      base64url: "base64url-encoded \u0645\u062A\u0646",
      json_string: "JSON \u0645\u062A\u0646",
      e164: "\u062F E.164 \u0634\u0645\u06D0\u0631\u0647",
      jwt: "JWT",
      template_literal: "\u0648\u0631\u0648\u062F\u064A"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${issue2.expected} \u0648\u0627\u06CC, \u0645\u06AB\u0631 ${parsedType8(issue2.input)} \u062A\u0631\u0644\u0627\u0633\u0647 \u0634\u0648`;
        case "invalid_value":
          if (issue2.values.length === 1) {
            return `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${stringifyPrimitive(issue2.values[0])} \u0648\u0627\u06CC`;
          }
          return `\u0646\u0627\u0633\u0645 \u0627\u0646\u062A\u062E\u0627\u0628: \u0628\u0627\u06CC\u062F \u06CC\u0648 \u0644\u0647 ${joinValues(issue2.values, "|")} \u0685\u062E\u0647 \u0648\u0627\u06CC`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${(_a = issue2.origin) != null ? _a : "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\u0639\u0646\u0635\u0631\u0648\u0646\u0647"} \u0648\u0644\u0631\u064A`;
          }
          return `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${(_c = issue2.origin) != null ? _c : "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} \u0648\u064A`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} ${sizing.unit} \u0648\u0644\u0631\u064A`;
          }
          return `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} \u0648\u064A`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${_issue.prefix}" \u0633\u0631\u0647 \u067E\u06CC\u0644 \u0634\u064A`;
          }
          if (_issue.format === "ends_with") {
            return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${_issue.suffix}" \u0633\u0631\u0647 \u067E\u0627\u06CC \u062A\u0647 \u0648\u0631\u0633\u064A\u0696\u064A`;
          }
          if (_issue.format === "includes") {
            return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F "${_issue.includes}" \u0648\u0644\u0631\u064A`;
          }
          if (_issue.format === "regex") {
            return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F ${_issue.pattern} \u0633\u0631\u0647 \u0645\u0637\u0627\u0628\u0642\u062A \u0648\u0644\u0631\u064A`;
          }
          return `${(_d = Nouns[_issue.format]) != null ? _d : issue2.format} \u0646\u0627\u0633\u0645 \u062F\u06CC`;
        }
        case "not_multiple_of":
          return `\u0646\u0627\u0633\u0645 \u0639\u062F\u062F: \u0628\u0627\u06CC\u062F \u062F ${issue2.divisor} \u0645\u0636\u0631\u0628 \u0648\u064A`;
        case "unrecognized_keys":
          return `\u0646\u0627\u0633\u0645 ${issue2.keys.length > 1 ? "\u06A9\u0644\u06CC\u0689\u0648\u0646\u0647" : "\u06A9\u0644\u06CC\u0689"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u0646\u0627\u0633\u0645 \u06A9\u0644\u06CC\u0689 \u067E\u0647 ${issue2.origin} \u06A9\u06D0`;
        case "invalid_union":
          return `\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A`;
        case "invalid_element":
          return `\u0646\u0627\u0633\u0645 \u0639\u0646\u0635\u0631 \u067E\u0647 ${issue2.origin} \u06A9\u06D0`;
        default:
          return `\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A`;
      }
    };
  };
  function ps_default() {
    return {
      localeError: error31()
    };
  }

  // node_modules/zod/v4/locales/pl.js
  var error32 = () => {
    const Sizable = {
      string: { unit: "znak\xF3w", verb: "mie\u0107" },
      file: { unit: "bajt\xF3w", verb: "mie\u0107" },
      array: { unit: "element\xF3w", verb: "mie\u0107" },
      set: { unit: "element\xF3w", verb: "mie\u0107" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "liczba";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "tablica";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "wyra\u017Cenie",
      email: "adres email",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "data i godzina w formacie ISO",
      date: "data w formacie ISO",
      time: "godzina w formacie ISO",
      duration: "czas trwania ISO",
      ipv4: "adres IPv4",
      ipv6: "adres IPv6",
      cidrv4: "zakres IPv4",
      cidrv6: "zakres IPv6",
      base64: "ci\u0105g znak\xF3w zakodowany w formacie base64",
      base64url: "ci\u0105g znak\xF3w zakodowany w formacie base64url",
      json_string: "ci\u0105g znak\xF3w w formacie JSON",
      e164: "liczba E.164",
      jwt: "JWT",
      template_literal: "wej\u015Bcie"
    };
    return (issue2) => {
      var _a, _b, _c, _d, _e, _f, _g;
      switch (issue2.code) {
        case "invalid_type":
          return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${issue2.expected}, otrzymano ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${stringifyPrimitive(issue2.values[0])}`;
          return `Nieprawid\u0142owa opcja: oczekiwano jednej z warto\u015Bci ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Za du\u017Ca warto\u015B\u0107: oczekiwano, \u017Ce ${(_a = issue2.origin) != null ? _a : "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "element\xF3w"}`;
          }
          return `Zbyt du\u017C(y/a/e): oczekiwano, \u017Ce ${(_c = issue2.origin) != null ? _c : "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Za ma\u0142a warto\u015B\u0107: oczekiwano, \u017Ce ${(_d = issue2.origin) != null ? _d : "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${adj}${issue2.minimum.toString()} ${(_e = sizing.unit) != null ? _e : "element\xF3w"}`;
          }
          return `Zbyt ma\u0142(y/a/e): oczekiwano, \u017Ce ${(_f = issue2.origin) != null ? _f : "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zaczyna\u0107 si\u0119 od "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi ko\u0144czy\u0107 si\u0119 na "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zawiera\u0107 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi odpowiada\u0107 wzorcowi ${_issue.pattern}`;
          return `Nieprawid\u0142ow(y/a/e) ${(_g = Nouns[_issue.format]) != null ? _g : issue2.format}`;
        }
        case "not_multiple_of":
          return `Nieprawid\u0142owa liczba: musi by\u0107 wielokrotno\u015Bci\u0105 ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Nierozpoznane klucze${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Nieprawid\u0142owy klucz w ${issue2.origin}`;
        case "invalid_union":
          return "Nieprawid\u0142owe dane wej\u015Bciowe";
        case "invalid_element":
          return `Nieprawid\u0142owa warto\u015B\u0107 w ${issue2.origin}`;
        default:
          return `Nieprawid\u0142owe dane wej\u015Bciowe`;
      }
    };
  };
  function pl_default() {
    return {
      localeError: error32()
    };
  }

  // node_modules/zod/v4/locales/pt.js
  var error33 = () => {
    const Sizable = {
      string: { unit: "caracteres", verb: "ter" },
      file: { unit: "bytes", verb: "ter" },
      array: { unit: "itens", verb: "ter" },
      set: { unit: "itens", verb: "ter" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "n\xFAmero";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "nulo";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "padr\xE3o",
      email: "endere\xE7o de e-mail",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "data e hora ISO",
      date: "data ISO",
      time: "hora ISO",
      duration: "dura\xE7\xE3o ISO",
      ipv4: "endere\xE7o IPv4",
      ipv6: "endere\xE7o IPv6",
      cidrv4: "faixa de IPv4",
      cidrv6: "faixa de IPv6",
      base64: "texto codificado em base64",
      base64url: "URL codificada em base64",
      json_string: "texto JSON",
      e164: "n\xFAmero E.164",
      jwt: "JWT",
      template_literal: "entrada"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Tipo inv\xE1lido: esperado ${issue2.expected}, recebido ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Entrada inv\xE1lida: esperado ${stringifyPrimitive(issue2.values[0])}`;
          return `Op\xE7\xE3o inv\xE1lida: esperada uma das ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Muito grande: esperado que ${(_a = issue2.origin) != null ? _a : "valor"} tivesse ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elementos"}`;
          return `Muito grande: esperado que ${(_c = issue2.origin) != null ? _c : "valor"} fosse ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Muito pequeno: esperado que ${issue2.origin} tivesse ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Muito pequeno: esperado que ${issue2.origin} fosse ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Texto inv\xE1lido: deve come\xE7ar com "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Texto inv\xE1lido: deve terminar com "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Texto inv\xE1lido: deve incluir "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Texto inv\xE1lido: deve corresponder ao padr\xE3o ${_issue.pattern}`;
          return `${(_d = Nouns[_issue.format]) != null ? _d : issue2.format} inv\xE1lido`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE1lido: deve ser m\xFAltiplo de ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Chave${issue2.keys.length > 1 ? "s" : ""} desconhecida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Chave inv\xE1lida em ${issue2.origin}`;
        case "invalid_union":
          return "Entrada inv\xE1lida";
        case "invalid_element":
          return `Valor inv\xE1lido em ${issue2.origin}`;
        default:
          return `Campo inv\xE1lido`;
      }
    };
  };
  function pt_default() {
    return {
      localeError: error33()
    };
  }

  // node_modules/zod/v4/locales/ru.js
  function getRussianPlural(count, one, few, many) {
    const absCount = Math.abs(count);
    const lastDigit = absCount % 10;
    const lastTwoDigits = absCount % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return many;
    }
    if (lastDigit === 1) {
      return one;
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
      return few;
    }
    return many;
  }
  var error34 = () => {
    const Sizable = {
      string: {
        unit: {
          one: "\u0441\u0438\u043C\u0432\u043E\u043B",
          few: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430",
          many: "\u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"
        },
        verb: "\u0438\u043C\u0435\u0442\u044C"
      },
      file: {
        unit: {
          one: "\u0431\u0430\u0439\u0442",
          few: "\u0431\u0430\u0439\u0442\u0430",
          many: "\u0431\u0430\u0439\u0442"
        },
        verb: "\u0438\u043C\u0435\u0442\u044C"
      },
      array: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432"
        },
        verb: "\u0438\u043C\u0435\u0442\u044C"
      },
      set: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432"
        },
        verb: "\u0438\u043C\u0435\u0442\u044C"
      }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u043C\u0430\u0441\u0441\u0438\u0432";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u0432\u0432\u043E\u0434",
      email: "email \u0430\u0434\u0440\u0435\u0441",
      url: "URL",
      emoji: "\u044D\u043C\u043E\u0434\u0437\u0438",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \u0434\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F",
      date: "ISO \u0434\u0430\u0442\u0430",
      time: "ISO \u0432\u0440\u0435\u043C\u044F",
      duration: "ISO \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C",
      ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441",
      ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441",
      cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
      cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
      base64: "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64",
      base64url: "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64url",
      json_string: "JSON \u0441\u0442\u0440\u043E\u043A\u0430",
      e164: "\u043D\u043E\u043C\u0435\u0440 E.164",
      jwt: "JWT",
      template_literal: "\u0432\u0432\u043E\u0434"
    };
    return (issue2) => {
      var _a, _b, _c;
      switch (issue2.code) {
        case "invalid_type":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${issue2.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${stringifyPrimitive(issue2.values[0])}`;
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0434\u043D\u043E \u0438\u0437 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            const maxValue = Number(issue2.maximum);
            const unit = getRussianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
            return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${(_a = issue2.origin) != null ? _a : "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${adj}${issue2.maximum.toString()} ${unit}`;
          }
          return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${(_b = issue2.origin) != null ? _b : "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            const minValue = Number(issue2.minimum);
            const unit = getRussianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
            return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${issue2.origin} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${adj}${issue2.minimum.toString()} ${unit}`;
          }
          return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${issue2.origin} \u0431\u0443\u0434\u0435\u0442 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C\u0441\u044F \u0441 "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0430 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${_issue.pattern}`;
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 ${(_c = Nouns[_issue.format]) != null ? _c : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E: \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D${issue2.keys.length > 1 ? "\u044B\u0435" : "\u044B\u0439"} \u043A\u043B\u044E\u0447${issue2.keys.length > 1 ? "\u0438" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u0432 ${issue2.origin}`;
        case "invalid_union":
          return "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435";
        case "invalid_element":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432 ${issue2.origin}`;
        default:
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435`;
      }
    };
  };
  function ru_default() {
    return {
      localeError: error34()
    };
  }

  // node_modules/zod/v4/locales/sl.js
  var error35 = () => {
    const Sizable = {
      string: { unit: "znakov", verb: "imeti" },
      file: { unit: "bajtov", verb: "imeti" },
      array: { unit: "elementov", verb: "imeti" },
      set: { unit: "elementov", verb: "imeti" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0161tevilo";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "tabela";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "vnos",
      email: "e-po\u0161tni naslov",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO datum in \u010Das",
      date: "ISO datum",
      time: "ISO \u010Das",
      duration: "ISO trajanje",
      ipv4: "IPv4 naslov",
      ipv6: "IPv6 naslov",
      cidrv4: "obseg IPv4",
      cidrv6: "obseg IPv6",
      base64: "base64 kodiran niz",
      base64url: "base64url kodiran niz",
      json_string: "JSON niz",
      e164: "E.164 \u0161tevilka",
      jwt: "JWT",
      template_literal: "vnos"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Neveljaven vnos: pri\u010Dakovano ${issue2.expected}, prejeto ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Neveljaven vnos: pri\u010Dakovano ${stringifyPrimitive(issue2.values[0])}`;
          return `Neveljavna mo\u017Enost: pri\u010Dakovano eno izmed ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Preveliko: pri\u010Dakovano, da bo ${(_a = issue2.origin) != null ? _a : "vrednost"} imelo ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "elementov"}`;
          return `Preveliko: pri\u010Dakovano, da bo ${(_c = issue2.origin) != null ? _c : "vrednost"} ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Premajhno: pri\u010Dakovano, da bo ${issue2.origin} imelo ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Premajhno: pri\u010Dakovano, da bo ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Neveljaven niz: mora se za\u010Deti z "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Neveljaven niz: mora se kon\u010Dati z "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Neveljaven niz: mora vsebovati "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Neveljaven niz: mora ustrezati vzorcu ${_issue.pattern}`;
          return `Neveljaven ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `Neveljavno \u0161tevilo: mora biti ve\u010Dkratnik ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Neprepoznan${issue2.keys.length > 1 ? "i klju\u010Di" : " klju\u010D"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Neveljaven klju\u010D v ${issue2.origin}`;
        case "invalid_union":
          return "Neveljaven vnos";
        case "invalid_element":
          return `Neveljavna vrednost v ${issue2.origin}`;
        default:
          return "Neveljaven vnos";
      }
    };
  };
  function sl_default() {
    return {
      localeError: error35()
    };
  }

  // node_modules/zod/v4/locales/sv.js
  var error36 = () => {
    const Sizable = {
      string: { unit: "tecken", verb: "att ha" },
      file: { unit: "bytes", verb: "att ha" },
      array: { unit: "objekt", verb: "att inneh\xE5lla" },
      set: { unit: "objekt", verb: "att inneh\xE5lla" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "antal";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "lista";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "regulj\xE4rt uttryck",
      email: "e-postadress",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO-datum och tid",
      date: "ISO-datum",
      time: "ISO-tid",
      duration: "ISO-varaktighet",
      ipv4: "IPv4-intervall",
      ipv6: "IPv6-intervall",
      cidrv4: "IPv4-spektrum",
      cidrv6: "IPv6-spektrum",
      base64: "base64-kodad str\xE4ng",
      base64url: "base64url-kodad str\xE4ng",
      json_string: "JSON-str\xE4ng",
      e164: "E.164-nummer",
      jwt: "JWT",
      template_literal: "mall-literal"
    };
    return (issue2) => {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      switch (issue2.code) {
        case "invalid_type":
          return `Ogiltig inmatning: f\xF6rv\xE4ntat ${issue2.expected}, fick ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Ogiltig inmatning: f\xF6rv\xE4ntat ${stringifyPrimitive(issue2.values[0])}`;
          return `Ogiltigt val: f\xF6rv\xE4ntade en av ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `F\xF6r stor(t): f\xF6rv\xE4ntade ${(_a = issue2.origin) != null ? _a : "v\xE4rdet"} att ha ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "element"}`;
          }
          return `F\xF6r stor(t): f\xF6rv\xE4ntat ${(_c = issue2.origin) != null ? _c : "v\xE4rdet"} att ha ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `F\xF6r lite(t): f\xF6rv\xE4ntade ${(_d = issue2.origin) != null ? _d : "v\xE4rdet"} att ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `F\xF6r lite(t): f\xF6rv\xE4ntade ${(_e = issue2.origin) != null ? _e : "v\xE4rdet"} att ha ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Ogiltig str\xE4ng: m\xE5ste b\xF6rja med "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Ogiltig str\xE4ng: m\xE5ste sluta med "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Ogiltig str\xE4ng: m\xE5ste inneh\xE5lla "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Ogiltig str\xE4ng: m\xE5ste matcha m\xF6nstret "${_issue.pattern}"`;
          return `Ogiltig(t) ${(_f = Nouns[_issue.format]) != null ? _f : issue2.format}`;
        }
        case "not_multiple_of":
          return `Ogiltigt tal: m\xE5ste vara en multipel av ${issue2.divisor}`;
        case "unrecognized_keys":
          return `${issue2.keys.length > 1 ? "Ok\xE4nda nycklar" : "Ok\xE4nd nyckel"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Ogiltig nyckel i ${(_g = issue2.origin) != null ? _g : "v\xE4rdet"}`;
        case "invalid_union":
          return "Ogiltig input";
        case "invalid_element":
          return `Ogiltigt v\xE4rde i ${(_h = issue2.origin) != null ? _h : "v\xE4rdet"}`;
        default:
          return `Ogiltig input`;
      }
    };
  };
  function sv_default() {
    return {
      localeError: error36()
    };
  }

  // node_modules/zod/v4/locales/ta.js
  var error37 = () => {
    const Sizable = {
      string: { unit: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BCD\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" },
      file: { unit: "\u0BAA\u0BC8\u0B9F\u0BCD\u0B9F\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" },
      array: { unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" },
      set: { unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "\u0B8E\u0BA3\u0BCD \u0B85\u0BB2\u0BCD\u0BB2\u0BBE\u0BA4\u0BA4\u0BC1" : "\u0B8E\u0BA3\u0BCD";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u0B85\u0BA3\u0BBF";
          }
          if (data === null) {
            return "\u0BB5\u0BC6\u0BB1\u0BC1\u0BAE\u0BC8";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1",
      email: "\u0BAE\u0BBF\u0BA9\u0BCD\u0BA9\u0B9E\u0BCD\u0B9A\u0BB2\u0BCD \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \u0BA4\u0BC7\u0BA4\u0BBF \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD",
      date: "ISO \u0BA4\u0BC7\u0BA4\u0BBF",
      time: "ISO \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD",
      duration: "ISO \u0B95\u0BBE\u0BB2 \u0B85\u0BB3\u0BB5\u0BC1",
      ipv4: "IPv4 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
      ipv6: "IPv6 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
      cidrv4: "IPv4 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1",
      cidrv6: "IPv6 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1",
      base64: "base64-encoded \u0B9A\u0BB0\u0BAE\u0BCD",
      base64url: "base64url-encoded \u0B9A\u0BB0\u0BAE\u0BCD",
      json_string: "JSON \u0B9A\u0BB0\u0BAE\u0BCD",
      e164: "E.164 \u0B8E\u0BA3\u0BCD",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.expected}, \u0BAA\u0BC6\u0BB1\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${stringifyPrimitive(issue2.values[0])}`;
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BAE\u0BCD: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${joinValues(issue2.values, "|")} \u0B87\u0BB2\u0BCD \u0B92\u0BA9\u0BCD\u0BB1\u0BC1`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${(_a = issue2.origin) != null ? _a : "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD"} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          }
          return `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${(_c = issue2.origin) != null ? _c : "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${adj}${issue2.maximum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          }
          return `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.origin} ${adj}${issue2.minimum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${_issue.prefix}" \u0B87\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          if (_issue.format === "ends_with")
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${_issue.suffix}" \u0B87\u0BB2\u0BCD \u0BAE\u0BC1\u0B9F\u0BBF\u0BB5\u0B9F\u0BC8\u0BAF \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          if (_issue.format === "includes")
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${_issue.includes}" \u0B90 \u0B89\u0BB3\u0BCD\u0BB3\u0B9F\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          if (_issue.format === "regex")
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: ${_issue.pattern} \u0BAE\u0BC1\u0BB1\u0BC8\u0BAA\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1\u0B9F\u0BA9\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B8E\u0BA3\u0BCD: ${issue2.divisor} \u0B87\u0BA9\u0BCD \u0BAA\u0BB2\u0BAE\u0BBE\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        case "unrecognized_keys":
          return `\u0B85\u0B9F\u0BC8\u0BAF\u0BBE\u0BB3\u0BAE\u0BCD \u0BA4\u0BC6\u0BB0\u0BBF\u0BAF\u0BBE\u0BA4 \u0BB5\u0BBF\u0B9A\u0BC8${issue2.keys.length > 1 ? "\u0B95\u0BB3\u0BCD" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `${issue2.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0B9A\u0BC8`;
        case "invalid_union":
          return "\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1";
        case "invalid_element":
          return `${issue2.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1`;
        default:
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1`;
      }
    };
  };
  function ta_default() {
    return {
      localeError: error37()
    };
  }

  // node_modules/zod/v4/locales/th.js
  var error38 = () => {
    const Sizable = {
      string: { unit: "\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
      file: { unit: "\u0E44\u0E1A\u0E15\u0E4C", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
      array: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
      set: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 (NaN)" : "\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u0E2D\u0E32\u0E23\u0E4C\u0E40\u0E23\u0E22\u0E4C (Array)";
          }
          if (data === null) {
            return "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E48\u0E32 (null)";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19",
      email: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E2D\u0E35\u0E40\u0E21\u0E25",
      url: "URL",
      emoji: "\u0E2D\u0E34\u0E42\u0E21\u0E08\u0E34",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
      date: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E1A\u0E1A ISO",
      time: "\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
      duration: "\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
      ipv4: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv4",
      ipv6: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv6",
      cidrv4: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv4",
      cidrv6: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv6",
      base64: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64",
      base64url: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A URL",
      json_string: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A JSON",
      e164: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28 (E.164)",
      jwt: "\u0E42\u0E17\u0E40\u0E04\u0E19 JWT",
      template_literal: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${issue2.expected} \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u0E04\u0E48\u0E32\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${stringifyPrimitive(issue2.values[0])}`;
          return `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E43\u0E19 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19" : "\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${(_a = issue2.origin) != null ? _a : "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"}`;
          return `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${(_c = issue2.origin) != null ? _c : "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? "\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22" : "\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${issue2.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${issue2.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E17\u0E49\u0E32\u0E22\u0E14\u0E49\u0E27\u0E22 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 "${_issue.includes}" \u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21`;
          if (_issue.format === "regex")
            return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14 ${_issue.pattern}`;
          return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E32\u0E23\u0E14\u0E49\u0E27\u0E22 ${issue2.divisor} \u0E44\u0E14\u0E49\u0E25\u0E07\u0E15\u0E31\u0E27`;
        case "unrecognized_keys":
          return `\u0E1E\u0E1A\u0E04\u0E35\u0E22\u0E4C\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u0E04\u0E35\u0E22\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${issue2.origin}`;
        case "invalid_union":
          return "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E22\u0E39\u0E40\u0E19\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E44\u0E27\u0E49";
        case "invalid_element":
          return `\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${issue2.origin}`;
        default:
          return `\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07`;
      }
    };
  };
  function th_default() {
    return {
      localeError: error38()
    };
  }

  // node_modules/zod/v4/locales/tr.js
  var parsedType7 = (data) => {
    const t = typeof data;
    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t;
  };
  var error39 = () => {
    const Sizable = {
      string: { unit: "karakter", verb: "olmal\u0131" },
      file: { unit: "bayt", verb: "olmal\u0131" },
      array: { unit: "\xF6\u011Fe", verb: "olmal\u0131" },
      set: { unit: "\xF6\u011Fe", verb: "olmal\u0131" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const Nouns = {
      regex: "girdi",
      email: "e-posta adresi",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO tarih ve saat",
      date: "ISO tarih",
      time: "ISO saat",
      duration: "ISO s\xFCre",
      ipv4: "IPv4 adresi",
      ipv6: "IPv6 adresi",
      cidrv4: "IPv4 aral\u0131\u011F\u0131",
      cidrv6: "IPv6 aral\u0131\u011F\u0131",
      base64: "base64 ile \u015Fifrelenmi\u015F metin",
      base64url: "base64url ile \u015Fifrelenmi\u015F metin",
      json_string: "JSON dizesi",
      e164: "E.164 say\u0131s\u0131",
      jwt: "JWT",
      template_literal: "\u015Eablon dizesi"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `Ge\xE7ersiz de\u011Fer: beklenen ${issue2.expected}, al\u0131nan ${parsedType7(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Ge\xE7ersiz de\u011Fer: beklenen ${stringifyPrimitive(issue2.values[0])}`;
          return `Ge\xE7ersiz se\xE7enek: a\u015Fa\u011F\u0131dakilerden biri olmal\u0131: ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\xC7ok b\xFCy\xFCk: beklenen ${(_a = issue2.origin) != null ? _a : "de\u011Fer"} ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\xF6\u011Fe"}`;
          return `\xC7ok b\xFCy\xFCk: beklenen ${(_c = issue2.origin) != null ? _c : "de\u011Fer"} ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\xC7ok k\xFC\xE7\xFCk: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          return `\xC7ok k\xFC\xE7\xFCk: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Ge\xE7ersiz metin: "${_issue.prefix}" ile ba\u015Flamal\u0131`;
          if (_issue.format === "ends_with")
            return `Ge\xE7ersiz metin: "${_issue.suffix}" ile bitmeli`;
          if (_issue.format === "includes")
            return `Ge\xE7ersiz metin: "${_issue.includes}" i\xE7ermeli`;
          if (_issue.format === "regex")
            return `Ge\xE7ersiz metin: ${_issue.pattern} desenine uymal\u0131`;
          return `Ge\xE7ersiz ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `Ge\xE7ersiz say\u0131: ${issue2.divisor} ile tam b\xF6l\xFCnebilmeli`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan anahtar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `${issue2.origin} i\xE7inde ge\xE7ersiz anahtar`;
        case "invalid_union":
          return "Ge\xE7ersiz de\u011Fer";
        case "invalid_element":
          return `${issue2.origin} i\xE7inde ge\xE7ersiz de\u011Fer`;
        default:
          return `Ge\xE7ersiz de\u011Fer`;
      }
    };
  };
  function tr_default() {
    return {
      localeError: error39()
    };
  }

  // node_modules/zod/v4/locales/uk.js
  var error40 = () => {
    const Sizable = {
      string: { unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" },
      file: { unit: "\u0431\u0430\u0439\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" },
      array: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" },
      set: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u043C\u0430\u0441\u0438\u0432";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456",
      email: "\u0430\u0434\u0440\u0435\u0441\u0430 \u0435\u043B\u0435\u043A\u0442\u0440\u043E\u043D\u043D\u043E\u0457 \u043F\u043E\u0448\u0442\u0438",
      url: "URL",
      emoji: "\u0435\u043C\u043E\u0434\u0437\u0456",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u0434\u0430\u0442\u0430 \u0442\u0430 \u0447\u0430\u0441 ISO",
      date: "\u0434\u0430\u0442\u0430 ISO",
      time: "\u0447\u0430\u0441 ISO",
      duration: "\u0442\u0440\u0438\u0432\u0430\u043B\u0456\u0441\u0442\u044C ISO",
      ipv4: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv4",
      ipv6: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv6",
      cidrv4: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv4",
      cidrv6: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv6",
      base64: "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64",
      base64url: "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64url",
      json_string: "\u0440\u044F\u0434\u043E\u043A JSON",
      e164: "\u043D\u043E\u043C\u0435\u0440 E.164",
      jwt: "JWT",
      template_literal: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${issue2.expected}, \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E ${parsedType8(issue2.input)}`;
        // return `Неправильні вхідні дані: очікується ${issue.expected}, отримано ${util.getParsedType(issue.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${stringifyPrimitive(issue2.values[0])}`;
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0430 \u043E\u043F\u0446\u0456\u044F: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F \u043E\u0434\u043D\u0435 \u0437 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${(_a = issue2.origin) != null ? _a : "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432"}`;
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${(_c = issue2.origin) != null ? _c : "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} \u0431\u0443\u0434\u0435 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${issue2.origin} \u0431\u0443\u0434\u0435 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043F\u043E\u0447\u0438\u043D\u0430\u0442\u0438\u0441\u044F \u0437 "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0432\u0430\u0442\u0438\u0441\u044F \u043D\u0430 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043C\u0456\u0441\u0442\u0438\u0442\u0438 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0442\u0438 \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${_issue.pattern}`;
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0447\u0438\u0441\u043B\u043E: \u043F\u043E\u0432\u0438\u043D\u043D\u043E \u0431\u0443\u0442\u0438 \u043A\u0440\u0430\u0442\u043D\u0438\u043C ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u043D\u0438\u0439 \u043A\u043B\u044E\u0447${issue2.keys.length > 1 ? "\u0456" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u043A\u043B\u044E\u0447 \u0443 ${issue2.origin}`;
        case "invalid_union":
          return "\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456";
        case "invalid_element":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F \u0443 ${issue2.origin}`;
        default:
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456`;
      }
    };
  };
  function uk_default() {
    return {
      localeError: error40()
    };
  }

  // node_modules/zod/v4/locales/ua.js
  function ua_default() {
    return uk_default();
  }

  // node_modules/zod/v4/locales/ur.js
  var error41 = () => {
    const Sizable = {
      string: { unit: "\u062D\u0631\u0648\u0641", verb: "\u06C1\u0648\u0646\u0627" },
      file: { unit: "\u0628\u0627\u0626\u0679\u0633", verb: "\u06C1\u0648\u0646\u0627" },
      array: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" },
      set: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0646\u0645\u0628\u0631";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u0622\u0631\u06D2";
          }
          if (data === null) {
            return "\u0646\u0644";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u0627\u0646 \u067E\u0679",
      email: "\u0627\u06CC \u0645\u06CC\u0644 \u0627\u06CC\u0688\u0631\u06CC\u0633",
      url: "\u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644",
      emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC",
      uuid: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
      uuidv4: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 4",
      uuidv6: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 6",
      nanoid: "\u0646\u06CC\u0646\u0648 \u0622\u0626\u06CC \u0688\u06CC",
      guid: "\u062C\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
      cuid: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
      cuid2: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC 2",
      ulid: "\u06CC\u0648 \u0627\u06CC\u0644 \u0622\u0626\u06CC \u0688\u06CC",
      xid: "\u0627\u06CC\u06A9\u0633 \u0622\u0626\u06CC \u0688\u06CC",
      ksuid: "\u06A9\u06D2 \u0627\u06CC\u0633 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
      datetime: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0688\u06CC\u0679 \u0679\u0627\u0626\u0645",
      date: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u062A\u0627\u0631\u06CC\u062E",
      time: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0648\u0642\u062A",
      duration: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0645\u062F\u062A",
      ipv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0627\u06CC\u0688\u0631\u06CC\u0633",
      ipv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0627\u06CC\u0688\u0631\u06CC\u0633",
      cidrv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0631\u06CC\u0646\u062C",
      cidrv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0631\u06CC\u0646\u062C",
      base64: "\u0628\u06CC\u0633 64 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF",
      base64url: "\u0628\u06CC\u0633 64 \u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF",
      json_string: "\u062C\u06D2 \u0627\u06CC\u0633 \u0627\u0648 \u0627\u06CC\u0646 \u0633\u0679\u0631\u0646\u06AF",
      e164: "\u0627\u06CC 164 \u0646\u0645\u0628\u0631",
      jwt: "\u062C\u06D2 \u0688\u0628\u0644\u06CC\u0648 \u0679\u06CC",
      template_literal: "\u0627\u0646 \u067E\u0679"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${issue2.expected} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627\u060C ${parsedType8(issue2.input)} \u0645\u0648\u0635\u0648\u0644 \u06C1\u0648\u0627`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${stringifyPrimitive(issue2.values[0])} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
          return `\u063A\u0644\u0637 \u0622\u067E\u0634\u0646: ${joinValues(issue2.values, "|")} \u0645\u06CC\u06BA \u0633\u06D2 \u0627\u06CC\u06A9 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u0628\u06C1\u062A \u0628\u0691\u0627: ${(_a = issue2.origin) != null ? _a : "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u06D2 ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\u0639\u0646\u0627\u0635\u0631"} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2`;
          return `\u0628\u06C1\u062A \u0628\u0691\u0627: ${(_c = issue2.origin) != null ? _c : "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u0627 ${adj}${issue2.maximum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${issue2.origin} \u06A9\u06D2 ${adj}${issue2.minimum.toString()} ${sizing.unit} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2`;
          }
          return `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${issue2.origin} \u06A9\u0627 ${adj}${issue2.minimum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${_issue.prefix}" \u0633\u06D2 \u0634\u0631\u0648\u0639 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
          }
          if (_issue.format === "ends_with")
            return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${_issue.suffix}" \u067E\u0631 \u062E\u062A\u0645 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
          if (_issue.format === "includes")
            return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${_issue.includes}" \u0634\u0627\u0645\u0644 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
          if (_issue.format === "regex")
            return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: \u067E\u06CC\u0679\u0631\u0646 ${_issue.pattern} \u0633\u06D2 \u0645\u06CC\u0686 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
          return `\u063A\u0644\u0637 ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u063A\u0644\u0637 \u0646\u0645\u0628\u0631: ${issue2.divisor} \u06A9\u0627 \u0645\u0636\u0627\u0639\u0641 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
        case "unrecognized_keys":
          return `\u063A\u06CC\u0631 \u062A\u0633\u0644\u06CC\u0645 \u0634\u062F\u06C1 \u06A9\u06CC${issue2.keys.length > 1 ? "\u0632" : ""}: ${joinValues(issue2.keys, "\u060C ")}`;
        case "invalid_key":
          return `${issue2.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u06A9\u06CC`;
        case "invalid_union":
          return "\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679";
        case "invalid_element":
          return `${issue2.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u0648\u06CC\u0644\u06CC\u0648`;
        default:
          return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679`;
      }
    };
  };
  function ur_default() {
    return {
      localeError: error41()
    };
  }

  // node_modules/zod/v4/locales/vi.js
  var error42 = () => {
    const Sizable = {
      string: { unit: "k\xFD t\u1EF1", verb: "c\xF3" },
      file: { unit: "byte", verb: "c\xF3" },
      array: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" },
      set: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "s\u1ED1";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "m\u1EA3ng";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u0111\u1EA7u v\xE0o",
      email: "\u0111\u1ECBa ch\u1EC9 email",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ng\xE0y gi\u1EDD ISO",
      date: "ng\xE0y ISO",
      time: "gi\u1EDD ISO",
      duration: "kho\u1EA3ng th\u1EDDi gian ISO",
      ipv4: "\u0111\u1ECBa ch\u1EC9 IPv4",
      ipv6: "\u0111\u1ECBa ch\u1EC9 IPv6",
      cidrv4: "d\u1EA3i IPv4",
      cidrv6: "d\u1EA3i IPv6",
      base64: "chu\u1ED7i m\xE3 h\xF3a base64",
      base64url: "chu\u1ED7i m\xE3 h\xF3a base64url",
      json_string: "chu\u1ED7i JSON",
      e164: "s\u1ED1 E.164",
      jwt: "JWT",
      template_literal: "\u0111\u1EA7u v\xE0o"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${issue2.expected}, nh\u1EADn \u0111\u01B0\u1EE3c ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${stringifyPrimitive(issue2.values[0])}`;
          return `T\xF9y ch\u1ECDn kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i m\u1ED9t trong c\xE1c gi\xE1 tr\u1ECB ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${(_a = issue2.origin) != null ? _a : "gi\xE1 tr\u1ECB"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "ph\u1EA7n t\u1EED"}`;
          return `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${(_c = issue2.origin) != null ? _c : "gi\xE1 tr\u1ECB"} ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i b\u1EAFt \u0111\u1EA7u b\u1EB1ng "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i k\u1EBFt th\xFAc b\u1EB1ng "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i bao g\u1ED3m "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i kh\u1EDBp v\u1EDBi m\u1EABu ${_issue.pattern}`;
          return `${(_d = Nouns[_issue.format]) != null ? _d : issue2.format} kh\xF4ng h\u1EE3p l\u1EC7`;
        }
        case "not_multiple_of":
          return `S\u1ED1 kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i l\xE0 b\u1ED9i s\u1ED1 c\u1EE7a ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Kh\xF3a kh\xF4ng \u0111\u01B0\u1EE3c nh\u1EADn d\u1EA1ng: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Kh\xF3a kh\xF4ng h\u1EE3p l\u1EC7 trong ${issue2.origin}`;
        case "invalid_union":
          return "\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7";
        case "invalid_element":
          return `Gi\xE1 tr\u1ECB kh\xF4ng h\u1EE3p l\u1EC7 trong ${issue2.origin}`;
        default:
          return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7`;
      }
    };
  };
  function vi_default() {
    return {
      localeError: error42()
    };
  }

  // node_modules/zod/v4/locales/zh-CN.js
  var error43 = () => {
    const Sizable = {
      string: { unit: "\u5B57\u7B26", verb: "\u5305\u542B" },
      file: { unit: "\u5B57\u8282", verb: "\u5305\u542B" },
      array: { unit: "\u9879", verb: "\u5305\u542B" },
      set: { unit: "\u9879", verb: "\u5305\u542B" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "\u975E\u6570\u5B57(NaN)" : "\u6570\u5B57";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u6570\u7EC4";
          }
          if (data === null) {
            return "\u7A7A\u503C(null)";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u8F93\u5165",
      email: "\u7535\u5B50\u90AE\u4EF6",
      url: "URL",
      emoji: "\u8868\u60C5\u7B26\u53F7",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO\u65E5\u671F\u65F6\u95F4",
      date: "ISO\u65E5\u671F",
      time: "ISO\u65F6\u95F4",
      duration: "ISO\u65F6\u957F",
      ipv4: "IPv4\u5730\u5740",
      ipv6: "IPv6\u5730\u5740",
      cidrv4: "IPv4\u7F51\u6BB5",
      cidrv6: "IPv6\u7F51\u6BB5",
      base64: "base64\u7F16\u7801\u5B57\u7B26\u4E32",
      base64url: "base64url\u7F16\u7801\u5B57\u7B26\u4E32",
      json_string: "JSON\u5B57\u7B26\u4E32",
      e164: "E.164\u53F7\u7801",
      jwt: "JWT",
      template_literal: "\u8F93\u5165"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${issue2.expected}\uFF0C\u5B9E\u9645\u63A5\u6536 ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${stringifyPrimitive(issue2.values[0])}`;
          return `\u65E0\u6548\u9009\u9879\uFF1A\u671F\u671B\u4EE5\u4E0B\u4E4B\u4E00 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${(_a = issue2.origin) != null ? _a : "\u503C"} ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\u4E2A\u5143\u7D20"}`;
          return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${(_c = issue2.origin) != null ? _c : "\u503C"} ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${_issue.prefix}" \u5F00\u5934`;
          if (_issue.format === "ends_with")
            return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${_issue.suffix}" \u7ED3\u5C3E`;
          if (_issue.format === "includes")
            return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u5305\u542B "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u6EE1\u8DB3\u6B63\u5219\u8868\u8FBE\u5F0F ${_issue.pattern}`;
          return `\u65E0\u6548${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u65E0\u6548\u6570\u5B57\uFF1A\u5FC5\u987B\u662F ${issue2.divisor} \u7684\u500D\u6570`;
        case "unrecognized_keys":
          return `\u51FA\u73B0\u672A\u77E5\u7684\u952E(key): ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `${issue2.origin} \u4E2D\u7684\u952E(key)\u65E0\u6548`;
        case "invalid_union":
          return "\u65E0\u6548\u8F93\u5165";
        case "invalid_element":
          return `${issue2.origin} \u4E2D\u5305\u542B\u65E0\u6548\u503C(value)`;
        default:
          return `\u65E0\u6548\u8F93\u5165`;
      }
    };
  };
  function zh_CN_default() {
    return {
      localeError: error43()
    };
  }

  // node_modules/zod/v4/locales/zh-TW.js
  var error44 = () => {
    const Sizable = {
      string: { unit: "\u5B57\u5143", verb: "\u64C1\u6709" },
      file: { unit: "\u4F4D\u5143\u7D44", verb: "\u64C1\u6709" },
      array: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" },
      set: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u8F38\u5165",
      email: "\u90F5\u4EF6\u5730\u5740",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \u65E5\u671F\u6642\u9593",
      date: "ISO \u65E5\u671F",
      time: "ISO \u6642\u9593",
      duration: "ISO \u671F\u9593",
      ipv4: "IPv4 \u4F4D\u5740",
      ipv6: "IPv6 \u4F4D\u5740",
      cidrv4: "IPv4 \u7BC4\u570D",
      cidrv6: "IPv6 \u7BC4\u570D",
      base64: "base64 \u7DE8\u78BC\u5B57\u4E32",
      base64url: "base64url \u7DE8\u78BC\u5B57\u4E32",
      json_string: "JSON \u5B57\u4E32",
      e164: "E.164 \u6578\u503C",
      jwt: "JWT",
      template_literal: "\u8F38\u5165"
    };
    return (issue2) => {
      var _a, _b, _c, _d;
      switch (issue2.code) {
        case "invalid_type":
          return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${issue2.expected}\uFF0C\u4F46\u6536\u5230 ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${stringifyPrimitive(issue2.values[0])}`;
          return `\u7121\u6548\u7684\u9078\u9805\uFF1A\u9810\u671F\u70BA\u4EE5\u4E0B\u5176\u4E2D\u4E4B\u4E00 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${(_a = issue2.origin) != null ? _a : "\u503C"} \u61C9\u70BA ${adj}${issue2.maximum.toString()} ${(_b = sizing.unit) != null ? _b : "\u500B\u5143\u7D20"}`;
          return `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${(_c = issue2.origin) != null ? _c : "\u503C"} \u61C9\u70BA ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${issue2.origin} \u61C9\u70BA ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${issue2.origin} \u61C9\u70BA ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${_issue.prefix}" \u958B\u982D`;
          }
          if (_issue.format === "ends_with")
            return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${_issue.suffix}" \u7D50\u5C3E`;
          if (_issue.format === "includes")
            return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u5305\u542B "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u7B26\u5408\u683C\u5F0F ${_issue.pattern}`;
          return `\u7121\u6548\u7684 ${(_d = Nouns[_issue.format]) != null ? _d : issue2.format}`;
        }
        case "not_multiple_of":
          return `\u7121\u6548\u7684\u6578\u5B57\uFF1A\u5FC5\u9808\u70BA ${issue2.divisor} \u7684\u500D\u6578`;
        case "unrecognized_keys":
          return `\u7121\u6CD5\u8B58\u5225\u7684\u9375\u503C${issue2.keys.length > 1 ? "\u5011" : ""}\uFF1A${joinValues(issue2.keys, "\u3001")}`;
        case "invalid_key":
          return `${issue2.origin} \u4E2D\u6709\u7121\u6548\u7684\u9375\u503C`;
        case "invalid_union":
          return "\u7121\u6548\u7684\u8F38\u5165\u503C";
        case "invalid_element":
          return `${issue2.origin} \u4E2D\u6709\u7121\u6548\u7684\u503C`;
        default:
          return `\u7121\u6548\u7684\u8F38\u5165\u503C`;
      }
    };
  };
  function zh_TW_default() {
    return {
      localeError: error44()
    };
  }

  // node_modules/zod/v4/locales/yo.js
  var error45 = () => {
    const Sizable = {
      string: { unit: "\xE0mi", verb: "n\xED" },
      file: { unit: "bytes", verb: "n\xED" },
      array: { unit: "nkan", verb: "n\xED" },
      set: { unit: "nkan", verb: "n\xED" }
    };
    function getSizing(origin) {
      var _a;
      return (_a = Sizable[origin]) != null ? _a : null;
    }
    const parsedType8 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "n\u1ECD\u0301mb\xE0";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "akop\u1ECD";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    const Nouns = {
      regex: "\u1EB9\u0300r\u1ECD \xECb\xE1w\u1ECDl\xE9",
      email: "\xE0d\xEDr\u1EB9\u0301s\xEC \xECm\u1EB9\u0301l\xEC",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\xE0k\xF3k\xF2 ISO",
      date: "\u1ECDj\u1ECD\u0301 ISO",
      time: "\xE0k\xF3k\xF2 ISO",
      duration: "\xE0k\xF3k\xF2 t\xF3 p\xE9 ISO",
      ipv4: "\xE0d\xEDr\u1EB9\u0301s\xEC IPv4",
      ipv6: "\xE0d\xEDr\u1EB9\u0301s\xEC IPv6",
      cidrv4: "\xE0gb\xE8gb\xE8 IPv4",
      cidrv6: "\xE0gb\xE8gb\xE8 IPv6",
      base64: "\u1ECD\u0300r\u1ECD\u0300 t\xED a k\u1ECD\u0301 n\xED base64",
      base64url: "\u1ECD\u0300r\u1ECD\u0300 base64url",
      json_string: "\u1ECD\u0300r\u1ECD\u0300 JSON",
      e164: "n\u1ECD\u0301mb\xE0 E.164",
      jwt: "JWT",
      template_literal: "\u1EB9\u0300r\u1ECD \xECb\xE1w\u1ECDl\xE9"
    };
    return (issue2) => {
      var _a, _b;
      switch (issue2.code) {
        case "invalid_type":
          return `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi ${issue2.expected}, \xE0m\u1ECD\u0300 a r\xED ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi ${stringifyPrimitive(issue2.values[0])}`;
          return `\xC0\u1E63\xE0y\xE0n a\u1E63\xEC\u1E63e: yan \u1ECD\u0300kan l\xE1ra ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `T\xF3 p\u1ECD\u0300 j\xF9: a n\xED l\xE1ti j\u1EB9\u0301 p\xE9 ${(_a = issue2.origin) != null ? _a : "iye"} ${sizing.verb} ${adj}${issue2.maximum} ${sizing.unit}`;
          return `T\xF3 p\u1ECD\u0300 j\xF9: a n\xED l\xE1ti j\u1EB9\u0301 ${adj}${issue2.maximum}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `K\xE9r\xE9 ju: a n\xED l\xE1ti j\u1EB9\u0301 p\xE9 ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum} ${sizing.unit}`;
          return `K\xE9r\xE9 ju: a n\xED l\xE1ti j\u1EB9\u0301 ${adj}${issue2.minimum}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 b\u1EB9\u0300r\u1EB9\u0300 p\u1EB9\u0300l\xFA "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 par\xED p\u1EB9\u0300l\xFA "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 n\xED "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 b\xE1 \xE0p\u1EB9\u1EB9r\u1EB9 mu ${_issue.pattern}`;
          return `A\u1E63\xEC\u1E63e: ${(_b = Nouns[_issue.format]) != null ? _b : issue2.format}`;
        }
        case "not_multiple_of":
          return `N\u1ECD\u0301mb\xE0 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 j\u1EB9\u0301 \xE8y\xE0 p\xEDp\xEDn ti ${issue2.divisor}`;
        case "unrecognized_keys":
          return `B\u1ECDt\xECn\xEC \xE0\xECm\u1ECD\u0300: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `B\u1ECDt\xECn\xEC a\u1E63\xEC\u1E63e n\xEDn\xFA ${issue2.origin}`;
        case "invalid_union":
          return "\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e";
        case "invalid_element":
          return `Iye a\u1E63\xEC\u1E63e n\xEDn\xFA ${issue2.origin}`;
        default:
          return "\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e";
      }
    };
  };
  function yo_default() {
    return {
      localeError: error45()
    };
  }

  // node_modules/zod/v4/core/registries.js
  var $output = Symbol("ZodOutput");
  var $input = Symbol("ZodInput");
  var $ZodRegistry = class {
    constructor() {
      this._map = /* @__PURE__ */ new WeakMap();
      this._idmap = /* @__PURE__ */ new Map();
    }
    add(schema, ..._meta) {
      const meta = _meta[0];
      this._map.set(schema, meta);
      if (meta && typeof meta === "object" && "id" in meta) {
        if (this._idmap.has(meta.id)) {
          throw new Error(`ID ${meta.id} already exists in the registry`);
        }
        this._idmap.set(meta.id, schema);
      }
      return this;
    }
    clear() {
      this._map = /* @__PURE__ */ new WeakMap();
      this._idmap = /* @__PURE__ */ new Map();
      return this;
    }
    remove(schema) {
      const meta = this._map.get(schema);
      if (meta && typeof meta === "object" && "id" in meta) {
        this._idmap.delete(meta.id);
      }
      this._map.delete(schema);
      return this;
    }
    get(schema) {
      var _a;
      const p = schema._zod.parent;
      if (p) {
        const pm = __spreadValues({}, (_a = this.get(p)) != null ? _a : {});
        delete pm.id;
        const f = __spreadValues(__spreadValues({}, pm), this._map.get(schema));
        return Object.keys(f).length ? f : void 0;
      }
      return this._map.get(schema);
    }
    has(schema) {
      return this._map.has(schema);
    }
  };
  function registry() {
    return new $ZodRegistry();
  }
  var globalRegistry = /* @__PURE__ */ registry();

  // node_modules/zod/v4/core/api.js
  function _string(Class2, params) {
    return new Class2(__spreadValues({
      type: "string"
    }, normalizeParams(params)));
  }
  function _coercedString(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      coerce: true
    }, normalizeParams(params)));
  }
  function _email(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "email",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _guid(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "guid",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _uuid(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _uuidv4(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v4"
    }, normalizeParams(params)));
  }
  function _uuidv6(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v6"
    }, normalizeParams(params)));
  }
  function _uuidv7(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v7"
    }, normalizeParams(params)));
  }
  function _url(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "url",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _emoji2(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "emoji",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _nanoid(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "nanoid",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _cuid(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "cuid",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _cuid2(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "cuid2",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _ulid(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "ulid",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _xid(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "xid",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _ksuid(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "ksuid",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _ipv4(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "ipv4",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _ipv6(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "ipv6",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _cidrv4(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "cidrv4",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _cidrv6(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "cidrv6",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _base64(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "base64",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _base64url(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "base64url",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _e164(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "e164",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  function _jwt(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "jwt",
      check: "string_format",
      abort: false
    }, normalizeParams(params)));
  }
  var TimePrecision = {
    Any: null,
    Minute: -1,
    Second: 0,
    Millisecond: 3,
    Microsecond: 6
  };
  function _isoDateTime(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "datetime",
      check: "string_format",
      offset: false,
      local: false,
      precision: null
    }, normalizeParams(params)));
  }
  function _isoDate(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "date",
      check: "string_format"
    }, normalizeParams(params)));
  }
  function _isoTime(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "time",
      check: "string_format",
      precision: null
    }, normalizeParams(params)));
  }
  function _isoDuration(Class2, params) {
    return new Class2(__spreadValues({
      type: "string",
      format: "duration",
      check: "string_format"
    }, normalizeParams(params)));
  }
  function _number(Class2, params) {
    return new Class2(__spreadValues({
      type: "number",
      checks: []
    }, normalizeParams(params)));
  }
  function _coercedNumber(Class2, params) {
    return new Class2(__spreadValues({
      type: "number",
      coerce: true,
      checks: []
    }, normalizeParams(params)));
  }
  function _int(Class2, params) {
    return new Class2(__spreadValues({
      type: "number",
      check: "number_format",
      abort: false,
      format: "safeint"
    }, normalizeParams(params)));
  }
  function _float32(Class2, params) {
    return new Class2(__spreadValues({
      type: "number",
      check: "number_format",
      abort: false,
      format: "float32"
    }, normalizeParams(params)));
  }
  function _float64(Class2, params) {
    return new Class2(__spreadValues({
      type: "number",
      check: "number_format",
      abort: false,
      format: "float64"
    }, normalizeParams(params)));
  }
  function _int32(Class2, params) {
    return new Class2(__spreadValues({
      type: "number",
      check: "number_format",
      abort: false,
      format: "int32"
    }, normalizeParams(params)));
  }
  function _uint32(Class2, params) {
    return new Class2(__spreadValues({
      type: "number",
      check: "number_format",
      abort: false,
      format: "uint32"
    }, normalizeParams(params)));
  }
  function _boolean(Class2, params) {
    return new Class2(__spreadValues({
      type: "boolean"
    }, normalizeParams(params)));
  }
  function _coercedBoolean(Class2, params) {
    return new Class2(__spreadValues({
      type: "boolean",
      coerce: true
    }, normalizeParams(params)));
  }
  function _bigint(Class2, params) {
    return new Class2(__spreadValues({
      type: "bigint"
    }, normalizeParams(params)));
  }
  function _coercedBigint(Class2, params) {
    return new Class2(__spreadValues({
      type: "bigint",
      coerce: true
    }, normalizeParams(params)));
  }
  function _int64(Class2, params) {
    return new Class2(__spreadValues({
      type: "bigint",
      check: "bigint_format",
      abort: false,
      format: "int64"
    }, normalizeParams(params)));
  }
  function _uint64(Class2, params) {
    return new Class2(__spreadValues({
      type: "bigint",
      check: "bigint_format",
      abort: false,
      format: "uint64"
    }, normalizeParams(params)));
  }
  function _symbol(Class2, params) {
    return new Class2(__spreadValues({
      type: "symbol"
    }, normalizeParams(params)));
  }
  function _undefined2(Class2, params) {
    return new Class2(__spreadValues({
      type: "undefined"
    }, normalizeParams(params)));
  }
  function _null2(Class2, params) {
    return new Class2(__spreadValues({
      type: "null"
    }, normalizeParams(params)));
  }
  function _any(Class2) {
    return new Class2({
      type: "any"
    });
  }
  function _unknown(Class2) {
    return new Class2({
      type: "unknown"
    });
  }
  function _never(Class2, params) {
    return new Class2(__spreadValues({
      type: "never"
    }, normalizeParams(params)));
  }
  function _void(Class2, params) {
    return new Class2(__spreadValues({
      type: "void"
    }, normalizeParams(params)));
  }
  function _date(Class2, params) {
    return new Class2(__spreadValues({
      type: "date"
    }, normalizeParams(params)));
  }
  function _coercedDate(Class2, params) {
    return new Class2(__spreadValues({
      type: "date",
      coerce: true
    }, normalizeParams(params)));
  }
  function _nan(Class2, params) {
    return new Class2(__spreadValues({
      type: "nan"
    }, normalizeParams(params)));
  }
  function _lt(value, params) {
    return new $ZodCheckLessThan(__spreadProps(__spreadValues({
      check: "less_than"
    }, normalizeParams(params)), {
      value,
      inclusive: false
    }));
  }
  function _lte(value, params) {
    return new $ZodCheckLessThan(__spreadProps(__spreadValues({
      check: "less_than"
    }, normalizeParams(params)), {
      value,
      inclusive: true
    }));
  }
  function _gt(value, params) {
    return new $ZodCheckGreaterThan(__spreadProps(__spreadValues({
      check: "greater_than"
    }, normalizeParams(params)), {
      value,
      inclusive: false
    }));
  }
  function _gte(value, params) {
    return new $ZodCheckGreaterThan(__spreadProps(__spreadValues({
      check: "greater_than"
    }, normalizeParams(params)), {
      value,
      inclusive: true
    }));
  }
  function _positive(params) {
    return _gt(0, params);
  }
  function _negative(params) {
    return _lt(0, params);
  }
  function _nonpositive(params) {
    return _lte(0, params);
  }
  function _nonnegative(params) {
    return _gte(0, params);
  }
  function _multipleOf(value, params) {
    return new $ZodCheckMultipleOf(__spreadProps(__spreadValues({
      check: "multiple_of"
    }, normalizeParams(params)), {
      value
    }));
  }
  function _maxSize(maximum, params) {
    return new $ZodCheckMaxSize(__spreadProps(__spreadValues({
      check: "max_size"
    }, normalizeParams(params)), {
      maximum
    }));
  }
  function _minSize(minimum, params) {
    return new $ZodCheckMinSize(__spreadProps(__spreadValues({
      check: "min_size"
    }, normalizeParams(params)), {
      minimum
    }));
  }
  function _size(size, params) {
    return new $ZodCheckSizeEquals(__spreadProps(__spreadValues({
      check: "size_equals"
    }, normalizeParams(params)), {
      size
    }));
  }
  function _maxLength(maximum, params) {
    const ch = new $ZodCheckMaxLength(__spreadProps(__spreadValues({
      check: "max_length"
    }, normalizeParams(params)), {
      maximum
    }));
    return ch;
  }
  function _minLength(minimum, params) {
    return new $ZodCheckMinLength(__spreadProps(__spreadValues({
      check: "min_length"
    }, normalizeParams(params)), {
      minimum
    }));
  }
  function _length(length, params) {
    return new $ZodCheckLengthEquals(__spreadProps(__spreadValues({
      check: "length_equals"
    }, normalizeParams(params)), {
      length
    }));
  }
  function _regex(pattern, params) {
    return new $ZodCheckRegex(__spreadProps(__spreadValues({
      check: "string_format",
      format: "regex"
    }, normalizeParams(params)), {
      pattern
    }));
  }
  function _lowercase(params) {
    return new $ZodCheckLowerCase(__spreadValues({
      check: "string_format",
      format: "lowercase"
    }, normalizeParams(params)));
  }
  function _uppercase(params) {
    return new $ZodCheckUpperCase(__spreadValues({
      check: "string_format",
      format: "uppercase"
    }, normalizeParams(params)));
  }
  function _includes(includes, params) {
    return new $ZodCheckIncludes(__spreadProps(__spreadValues({
      check: "string_format",
      format: "includes"
    }, normalizeParams(params)), {
      includes
    }));
  }
  function _startsWith(prefix, params) {
    return new $ZodCheckStartsWith(__spreadProps(__spreadValues({
      check: "string_format",
      format: "starts_with"
    }, normalizeParams(params)), {
      prefix
    }));
  }
  function _endsWith(suffix, params) {
    return new $ZodCheckEndsWith(__spreadProps(__spreadValues({
      check: "string_format",
      format: "ends_with"
    }, normalizeParams(params)), {
      suffix
    }));
  }
  function _property(property, schema, params) {
    return new $ZodCheckProperty(__spreadValues({
      check: "property",
      property,
      schema
    }, normalizeParams(params)));
  }
  function _mime(types, params) {
    return new $ZodCheckMimeType(__spreadValues({
      check: "mime_type",
      mime: types
    }, normalizeParams(params)));
  }
  function _overwrite(tx) {
    return new $ZodCheckOverwrite({
      check: "overwrite",
      tx
    });
  }
  function _normalize(form) {
    return _overwrite((input) => input.normalize(form));
  }
  function _trim() {
    return _overwrite((input) => input.trim());
  }
  function _toLowerCase() {
    return _overwrite((input) => input.toLowerCase());
  }
  function _toUpperCase() {
    return _overwrite((input) => input.toUpperCase());
  }
  function _array(Class2, element, params) {
    return new Class2(__spreadValues({
      type: "array",
      element
    }, normalizeParams(params)));
  }
  function _union(Class2, options, params) {
    return new Class2(__spreadValues({
      type: "union",
      options
    }, normalizeParams(params)));
  }
  function _discriminatedUnion(Class2, discriminator, options, params) {
    return new Class2(__spreadValues({
      type: "union",
      options,
      discriminator
    }, normalizeParams(params)));
  }
  function _intersection(Class2, left, right) {
    return new Class2({
      type: "intersection",
      left,
      right
    });
  }
  function _tuple(Class2, items, _paramsOrRest, _params) {
    const hasRest = _paramsOrRest instanceof $ZodType;
    const params = hasRest ? _params : _paramsOrRest;
    const rest = hasRest ? _paramsOrRest : null;
    return new Class2(__spreadValues({
      type: "tuple",
      items,
      rest
    }, normalizeParams(params)));
  }
  function _record(Class2, keyType, valueType, params) {
    return new Class2(__spreadValues({
      type: "record",
      keyType,
      valueType
    }, normalizeParams(params)));
  }
  function _map(Class2, keyType, valueType, params) {
    return new Class2(__spreadValues({
      type: "map",
      keyType,
      valueType
    }, normalizeParams(params)));
  }
  function _set(Class2, valueType, params) {
    return new Class2(__spreadValues({
      type: "set",
      valueType
    }, normalizeParams(params)));
  }
  function _enum(Class2, values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    return new Class2(__spreadValues({
      type: "enum",
      entries
    }, normalizeParams(params)));
  }
  function _nativeEnum(Class2, entries, params) {
    return new Class2(__spreadValues({
      type: "enum",
      entries
    }, normalizeParams(params)));
  }
  function _literal(Class2, value, params) {
    return new Class2(__spreadValues({
      type: "literal",
      values: Array.isArray(value) ? value : [value]
    }, normalizeParams(params)));
  }
  function _file(Class2, params) {
    return new Class2(__spreadValues({
      type: "file"
    }, normalizeParams(params)));
  }
  function _transform(Class2, fn) {
    return new Class2({
      type: "transform",
      transform: fn
    });
  }
  function _optional(Class2, innerType) {
    return new Class2({
      type: "optional",
      innerType
    });
  }
  function _nullable(Class2, innerType) {
    return new Class2({
      type: "nullable",
      innerType
    });
  }
  function _default(Class2, innerType, defaultValue) {
    return new Class2({
      type: "default",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
      }
    });
  }
  function _nonoptional(Class2, innerType, params) {
    return new Class2(__spreadValues({
      type: "nonoptional",
      innerType
    }, normalizeParams(params)));
  }
  function _success(Class2, innerType) {
    return new Class2({
      type: "success",
      innerType
    });
  }
  function _catch(Class2, innerType, catchValue) {
    return new Class2({
      type: "catch",
      innerType,
      catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
    });
  }
  function _pipe(Class2, in_, out) {
    return new Class2({
      type: "pipe",
      in: in_,
      out
    });
  }
  function _readonly(Class2, innerType) {
    return new Class2({
      type: "readonly",
      innerType
    });
  }
  function _templateLiteral(Class2, parts, params) {
    return new Class2(__spreadValues({
      type: "template_literal",
      parts
    }, normalizeParams(params)));
  }
  function _lazy(Class2, getter) {
    return new Class2({
      type: "lazy",
      getter
    });
  }
  function _promise(Class2, innerType) {
    return new Class2({
      type: "promise",
      innerType
    });
  }
  function _custom(Class2, fn, _params) {
    var _a;
    const norm = normalizeParams(_params);
    (_a = norm.abort) != null ? _a : norm.abort = true;
    const schema = new Class2(__spreadValues({
      type: "custom",
      check: "custom",
      fn
    }, norm));
    return schema;
  }
  function _refine(Class2, fn, _params) {
    const schema = new Class2(__spreadValues({
      type: "custom",
      check: "custom",
      fn
    }, normalizeParams(_params)));
    return schema;
  }
  function _superRefine(fn) {
    const ch = _check((payload) => {
      payload.addIssue = (issue2) => {
        var _a, _b, _c, _d;
        if (typeof issue2 === "string") {
          payload.issues.push(issue(issue2, payload.value, ch._zod.def));
        } else {
          const _issue = issue2;
          if (_issue.fatal)
            _issue.continue = false;
          (_a = _issue.code) != null ? _a : _issue.code = "custom";
          (_b = _issue.input) != null ? _b : _issue.input = payload.value;
          (_c = _issue.inst) != null ? _c : _issue.inst = ch;
          (_d = _issue.continue) != null ? _d : _issue.continue = !ch._zod.def.abort;
          payload.issues.push(issue(_issue));
        }
      };
      return fn(payload.value, payload);
    });
    return ch;
  }
  function _check(fn, params) {
    const ch = new $ZodCheck(__spreadValues({
      check: "custom"
    }, normalizeParams(params)));
    ch._zod.check = fn;
    return ch;
  }
  function _stringbool(Classes, _params) {
    var _a, _b, _c, _d, _e;
    const params = normalizeParams(_params);
    let truthyArray = (_a = params.truthy) != null ? _a : ["true", "1", "yes", "on", "y", "enabled"];
    let falsyArray = (_b = params.falsy) != null ? _b : ["false", "0", "no", "off", "n", "disabled"];
    if (params.case !== "sensitive") {
      truthyArray = truthyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
      falsyArray = falsyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
    }
    const truthySet = new Set(truthyArray);
    const falsySet = new Set(falsyArray);
    const _Codec = (_c = Classes.Codec) != null ? _c : $ZodCodec;
    const _Boolean = (_d = Classes.Boolean) != null ? _d : $ZodBoolean;
    const _String = (_e = Classes.String) != null ? _e : $ZodString;
    const stringSchema = new _String({ type: "string", error: params.error });
    const booleanSchema = new _Boolean({ type: "boolean", error: params.error });
    const codec2 = new _Codec({
      type: "pipe",
      in: stringSchema,
      out: booleanSchema,
      transform: ((input, payload) => {
        let data = input;
        if (params.case !== "sensitive")
          data = data.toLowerCase();
        if (truthySet.has(data)) {
          return true;
        } else if (falsySet.has(data)) {
          return false;
        } else {
          payload.issues.push({
            code: "invalid_value",
            expected: "stringbool",
            values: [...truthySet, ...falsySet],
            input: payload.value,
            inst: codec2,
            continue: false
          });
          return {};
        }
      }),
      reverseTransform: ((input, _payload) => {
        if (input === true) {
          return truthyArray[0] || "true";
        } else {
          return falsyArray[0] || "false";
        }
      }),
      error: params.error
    });
    return codec2;
  }
  function _stringFormat(Class2, format, fnOrRegex, _params = {}) {
    const params = normalizeParams(_params);
    const def = __spreadValues(__spreadProps(__spreadValues({}, normalizeParams(_params)), {
      check: "string_format",
      type: "string",
      format,
      fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val)
    }), params);
    if (fnOrRegex instanceof RegExp) {
      def.pattern = fnOrRegex;
    }
    const inst = new Class2(def);
    return inst;
  }

  // node_modules/zod/v4/core/to-json-schema.js
  var JSONSchemaGenerator = class {
    constructor(params) {
      var _a, _b, _c, _d, _e;
      this.counter = 0;
      this.metadataRegistry = (_a = params == null ? void 0 : params.metadata) != null ? _a : globalRegistry;
      this.target = (_b = params == null ? void 0 : params.target) != null ? _b : "draft-2020-12";
      this.unrepresentable = (_c = params == null ? void 0 : params.unrepresentable) != null ? _c : "throw";
      this.override = (_d = params == null ? void 0 : params.override) != null ? _d : (() => {
      });
      this.io = (_e = params == null ? void 0 : params.io) != null ? _e : "output";
      this.seen = /* @__PURE__ */ new Map();
    }
    process(schema, _params = { path: [], schemaPath: [] }) {
      var _a2, _b, _c, _d, _e;
      var _a;
      const def = schema._zod.def;
      const formatMap = {
        guid: "uuid",
        url: "uri",
        datetime: "date-time",
        json_string: "json-string",
        regex: ""
        // do not set
      };
      const seen = this.seen.get(schema);
      if (seen) {
        seen.count++;
        const isCycle = _params.schemaPath.includes(schema);
        if (isCycle) {
          seen.cycle = _params.path;
        }
        return seen.schema;
      }
      const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
      this.seen.set(schema, result);
      const overrideSchema = (_b = (_a2 = schema._zod).toJSONSchema) == null ? void 0 : _b.call(_a2);
      if (overrideSchema) {
        result.schema = overrideSchema;
      } else {
        const params = __spreadProps(__spreadValues({}, _params), {
          schemaPath: [..._params.schemaPath, schema],
          path: _params.path
        });
        const parent = schema._zod.parent;
        if (parent) {
          result.ref = parent;
          this.process(parent, params);
          this.seen.get(parent).isParent = true;
        } else {
          const _json = result.schema;
          switch (def.type) {
            case "string": {
              const json2 = _json;
              json2.type = "string";
              const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
              if (typeof minimum === "number")
                json2.minLength = minimum;
              if (typeof maximum === "number")
                json2.maxLength = maximum;
              if (format) {
                json2.format = (_c = formatMap[format]) != null ? _c : format;
                if (json2.format === "")
                  delete json2.format;
              }
              if (contentEncoding)
                json2.contentEncoding = contentEncoding;
              if (patterns && patterns.size > 0) {
                const regexes = [...patterns];
                if (regexes.length === 1)
                  json2.pattern = regexes[0].source;
                else if (regexes.length > 1) {
                  result.schema.allOf = [
                    ...regexes.map((regex) => __spreadProps(__spreadValues({}, this.target === "draft-7" || this.target === "draft-4" || this.target === "openapi-3.0" ? { type: "string" } : {}), {
                      pattern: regex.source
                    }))
                  ];
                }
              }
              break;
            }
            case "number": {
              const json2 = _json;
              const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
              if (typeof format === "string" && format.includes("int"))
                json2.type = "integer";
              else
                json2.type = "number";
              if (typeof exclusiveMinimum === "number") {
                if (this.target === "draft-4" || this.target === "openapi-3.0") {
                  json2.minimum = exclusiveMinimum;
                  json2.exclusiveMinimum = true;
                } else {
                  json2.exclusiveMinimum = exclusiveMinimum;
                }
              }
              if (typeof minimum === "number") {
                json2.minimum = minimum;
                if (typeof exclusiveMinimum === "number" && this.target !== "draft-4") {
                  if (exclusiveMinimum >= minimum)
                    delete json2.minimum;
                  else
                    delete json2.exclusiveMinimum;
                }
              }
              if (typeof exclusiveMaximum === "number") {
                if (this.target === "draft-4" || this.target === "openapi-3.0") {
                  json2.maximum = exclusiveMaximum;
                  json2.exclusiveMaximum = true;
                } else {
                  json2.exclusiveMaximum = exclusiveMaximum;
                }
              }
              if (typeof maximum === "number") {
                json2.maximum = maximum;
                if (typeof exclusiveMaximum === "number" && this.target !== "draft-4") {
                  if (exclusiveMaximum <= maximum)
                    delete json2.maximum;
                  else
                    delete json2.exclusiveMaximum;
                }
              }
              if (typeof multipleOf === "number")
                json2.multipleOf = multipleOf;
              break;
            }
            case "boolean": {
              const json2 = _json;
              json2.type = "boolean";
              break;
            }
            case "bigint": {
              if (this.unrepresentable === "throw") {
                throw new Error("BigInt cannot be represented in JSON Schema");
              }
              break;
            }
            case "symbol": {
              if (this.unrepresentable === "throw") {
                throw new Error("Symbols cannot be represented in JSON Schema");
              }
              break;
            }
            case "null": {
              if (this.target === "openapi-3.0") {
                _json.type = "string";
                _json.nullable = true;
                _json.enum = [null];
              } else
                _json.type = "null";
              break;
            }
            case "any": {
              break;
            }
            case "unknown": {
              break;
            }
            case "undefined": {
              if (this.unrepresentable === "throw") {
                throw new Error("Undefined cannot be represented in JSON Schema");
              }
              break;
            }
            case "void": {
              if (this.unrepresentable === "throw") {
                throw new Error("Void cannot be represented in JSON Schema");
              }
              break;
            }
            case "never": {
              _json.not = {};
              break;
            }
            case "date": {
              if (this.unrepresentable === "throw") {
                throw new Error("Date cannot be represented in JSON Schema");
              }
              break;
            }
            case "array": {
              const json2 = _json;
              const { minimum, maximum } = schema._zod.bag;
              if (typeof minimum === "number")
                json2.minItems = minimum;
              if (typeof maximum === "number")
                json2.maxItems = maximum;
              json2.type = "array";
              json2.items = this.process(def.element, __spreadProps(__spreadValues({}, params), { path: [...params.path, "items"] }));
              break;
            }
            case "object": {
              const json2 = _json;
              json2.type = "object";
              json2.properties = {};
              const shape = def.shape;
              for (const key in shape) {
                json2.properties[key] = this.process(shape[key], __spreadProps(__spreadValues({}, params), {
                  path: [...params.path, "properties", key]
                }));
              }
              const allKeys = new Set(Object.keys(shape));
              const requiredKeys = new Set([...allKeys].filter((key) => {
                const v = def.shape[key]._zod;
                if (this.io === "input") {
                  return v.optin === void 0;
                } else {
                  return v.optout === void 0;
                }
              }));
              if (requiredKeys.size > 0) {
                json2.required = Array.from(requiredKeys);
              }
              if (((_d = def.catchall) == null ? void 0 : _d._zod.def.type) === "never") {
                json2.additionalProperties = false;
              } else if (!def.catchall) {
                if (this.io === "output")
                  json2.additionalProperties = false;
              } else if (def.catchall) {
                json2.additionalProperties = this.process(def.catchall, __spreadProps(__spreadValues({}, params), {
                  path: [...params.path, "additionalProperties"]
                }));
              }
              break;
            }
            case "union": {
              const json2 = _json;
              const options = def.options.map((x, i) => this.process(x, __spreadProps(__spreadValues({}, params), {
                path: [...params.path, "anyOf", i]
              })));
              json2.anyOf = options;
              break;
            }
            case "intersection": {
              const json2 = _json;
              const a = this.process(def.left, __spreadProps(__spreadValues({}, params), {
                path: [...params.path, "allOf", 0]
              }));
              const b = this.process(def.right, __spreadProps(__spreadValues({}, params), {
                path: [...params.path, "allOf", 1]
              }));
              const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
              const allOf = [
                ...isSimpleIntersection(a) ? a.allOf : [a],
                ...isSimpleIntersection(b) ? b.allOf : [b]
              ];
              json2.allOf = allOf;
              break;
            }
            case "tuple": {
              const json2 = _json;
              json2.type = "array";
              const prefixPath = this.target === "draft-2020-12" ? "prefixItems" : "items";
              const restPath = this.target === "draft-2020-12" ? "items" : this.target === "openapi-3.0" ? "items" : "additionalItems";
              const prefixItems = def.items.map((x, i) => this.process(x, __spreadProps(__spreadValues({}, params), {
                path: [...params.path, prefixPath, i]
              })));
              const rest = def.rest ? this.process(def.rest, __spreadProps(__spreadValues({}, params), {
                path: [...params.path, restPath, ...this.target === "openapi-3.0" ? [def.items.length] : []]
              })) : null;
              if (this.target === "draft-2020-12") {
                json2.prefixItems = prefixItems;
                if (rest) {
                  json2.items = rest;
                }
              } else if (this.target === "openapi-3.0") {
                json2.items = {
                  anyOf: prefixItems
                };
                if (rest) {
                  json2.items.anyOf.push(rest);
                }
                json2.minItems = prefixItems.length;
                if (!rest) {
                  json2.maxItems = prefixItems.length;
                }
              } else {
                json2.items = prefixItems;
                if (rest) {
                  json2.additionalItems = rest;
                }
              }
              const { minimum, maximum } = schema._zod.bag;
              if (typeof minimum === "number")
                json2.minItems = minimum;
              if (typeof maximum === "number")
                json2.maxItems = maximum;
              break;
            }
            case "record": {
              const json2 = _json;
              json2.type = "object";
              if (this.target === "draft-7" || this.target === "draft-2020-12") {
                json2.propertyNames = this.process(def.keyType, __spreadProps(__spreadValues({}, params), {
                  path: [...params.path, "propertyNames"]
                }));
              }
              json2.additionalProperties = this.process(def.valueType, __spreadProps(__spreadValues({}, params), {
                path: [...params.path, "additionalProperties"]
              }));
              break;
            }
            case "map": {
              if (this.unrepresentable === "throw") {
                throw new Error("Map cannot be represented in JSON Schema");
              }
              break;
            }
            case "set": {
              if (this.unrepresentable === "throw") {
                throw new Error("Set cannot be represented in JSON Schema");
              }
              break;
            }
            case "enum": {
              const json2 = _json;
              const values = getEnumValues(def.entries);
              if (values.every((v) => typeof v === "number"))
                json2.type = "number";
              if (values.every((v) => typeof v === "string"))
                json2.type = "string";
              json2.enum = values;
              break;
            }
            case "literal": {
              const json2 = _json;
              const vals = [];
              for (const val of def.values) {
                if (val === void 0) {
                  if (this.unrepresentable === "throw") {
                    throw new Error("Literal `undefined` cannot be represented in JSON Schema");
                  } else {
                  }
                } else if (typeof val === "bigint") {
                  if (this.unrepresentable === "throw") {
                    throw new Error("BigInt literals cannot be represented in JSON Schema");
                  } else {
                    vals.push(Number(val));
                  }
                } else {
                  vals.push(val);
                }
              }
              if (vals.length === 0) {
              } else if (vals.length === 1) {
                const val = vals[0];
                json2.type = val === null ? "null" : typeof val;
                if (this.target === "draft-4" || this.target === "openapi-3.0") {
                  json2.enum = [val];
                } else {
                  json2.const = val;
                }
              } else {
                if (vals.every((v) => typeof v === "number"))
                  json2.type = "number";
                if (vals.every((v) => typeof v === "string"))
                  json2.type = "string";
                if (vals.every((v) => typeof v === "boolean"))
                  json2.type = "string";
                if (vals.every((v) => v === null))
                  json2.type = "null";
                json2.enum = vals;
              }
              break;
            }
            case "file": {
              const json2 = _json;
              const file2 = {
                type: "string",
                format: "binary",
                contentEncoding: "binary"
              };
              const { minimum, maximum, mime } = schema._zod.bag;
              if (minimum !== void 0)
                file2.minLength = minimum;
              if (maximum !== void 0)
                file2.maxLength = maximum;
              if (mime) {
                if (mime.length === 1) {
                  file2.contentMediaType = mime[0];
                  Object.assign(json2, file2);
                } else {
                  json2.anyOf = mime.map((m) => {
                    const mFile = __spreadProps(__spreadValues({}, file2), { contentMediaType: m });
                    return mFile;
                  });
                }
              } else {
                Object.assign(json2, file2);
              }
              break;
            }
            case "transform": {
              if (this.unrepresentable === "throw") {
                throw new Error("Transforms cannot be represented in JSON Schema");
              }
              break;
            }
            case "nullable": {
              const inner = this.process(def.innerType, params);
              if (this.target === "openapi-3.0") {
                result.ref = def.innerType;
                _json.nullable = true;
              } else {
                _json.anyOf = [inner, { type: "null" }];
              }
              break;
            }
            case "nonoptional": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              break;
            }
            case "success": {
              const json2 = _json;
              json2.type = "boolean";
              break;
            }
            case "default": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              _json.default = JSON.parse(JSON.stringify(def.defaultValue));
              break;
            }
            case "prefault": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              if (this.io === "input")
                _json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
              break;
            }
            case "catch": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              let catchValue;
              try {
                catchValue = def.catchValue(void 0);
              } catch (e) {
                throw new Error("Dynamic catch values are not supported in JSON Schema");
              }
              _json.default = catchValue;
              break;
            }
            case "nan": {
              if (this.unrepresentable === "throw") {
                throw new Error("NaN cannot be represented in JSON Schema");
              }
              break;
            }
            case "template_literal": {
              const json2 = _json;
              const pattern = schema._zod.pattern;
              if (!pattern)
                throw new Error("Pattern not found in template literal");
              json2.type = "string";
              json2.pattern = pattern.source;
              break;
            }
            case "pipe": {
              const innerType = this.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
              this.process(innerType, params);
              result.ref = innerType;
              break;
            }
            case "readonly": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              _json.readOnly = true;
              break;
            }
            // passthrough types
            case "promise": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              break;
            }
            case "optional": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              break;
            }
            case "lazy": {
              const innerType = schema._zod.innerType;
              this.process(innerType, params);
              result.ref = innerType;
              break;
            }
            case "custom": {
              if (this.unrepresentable === "throw") {
                throw new Error("Custom types cannot be represented in JSON Schema");
              }
              break;
            }
            case "function": {
              if (this.unrepresentable === "throw") {
                throw new Error("Function types cannot be represented in JSON Schema");
              }
              break;
            }
            default: {
              def;
            }
          }
        }
      }
      const meta = this.metadataRegistry.get(schema);
      if (meta)
        Object.assign(result.schema, meta);
      if (this.io === "input" && isTransforming(schema)) {
        delete result.schema.examples;
        delete result.schema.default;
      }
      if (this.io === "input" && result.schema._prefault)
        (_e = (_a = result.schema).default) != null ? _e : _a.default = result.schema._prefault;
      delete result.schema._prefault;
      const _result = this.seen.get(schema);
      return _result.schema;
    }
    emit(schema, _params) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
      const params = {
        cycles: (_a = _params == null ? void 0 : _params.cycles) != null ? _a : "ref",
        reused: (_b = _params == null ? void 0 : _params.reused) != null ? _b : "inline",
        // unrepresentable: _params?.unrepresentable ?? "throw",
        // uri: _params?.uri ?? ((id) => `${id}`),
        external: (_c = _params == null ? void 0 : _params.external) != null ? _c : void 0
      };
      const root = this.seen.get(schema);
      if (!root)
        throw new Error("Unprocessed schema. This is a bug in Zod.");
      const makeURI = (entry) => {
        var _a2, _b2, _c2, _d2, _e2;
        const defsSegment = this.target === "draft-2020-12" ? "$defs" : "definitions";
        if (params.external) {
          const externalId = (_a2 = params.external.registry.get(entry[0])) == null ? void 0 : _a2.id;
          const uriGenerator = (_b2 = params.external.uri) != null ? _b2 : ((id2) => id2);
          if (externalId) {
            return { ref: uriGenerator(externalId) };
          }
          const id = (_d2 = (_c2 = entry[1].defId) != null ? _c2 : entry[1].schema.id) != null ? _d2 : `schema${this.counter++}`;
          entry[1].defId = id;
          return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
        }
        if (entry[1] === root) {
          return { ref: "#" };
        }
        const uriPrefix = `#`;
        const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
        const defId = (_e2 = entry[1].schema.id) != null ? _e2 : `__schema${this.counter++}`;
        return { defId, ref: defUriPrefix + defId };
      };
      const extractToDef = (entry) => {
        if (entry[1].schema.$ref) {
          return;
        }
        const seen = entry[1];
        const { ref, defId } = makeURI(entry);
        seen.def = __spreadValues({}, seen.schema);
        if (defId)
          seen.defId = defId;
        const schema2 = seen.schema;
        for (const key in schema2) {
          delete schema2[key];
        }
        schema2.$ref = ref;
      };
      if (params.cycles === "throw") {
        for (const entry of this.seen.entries()) {
          const seen = entry[1];
          if (seen.cycle) {
            throw new Error(`Cycle detected: #/${(_d = seen.cycle) == null ? void 0 : _d.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
          }
        }
      }
      for (const entry of this.seen.entries()) {
        const seen = entry[1];
        if (schema === entry[0]) {
          extractToDef(entry);
          continue;
        }
        if (params.external) {
          const ext = (_e = params.external.registry.get(entry[0])) == null ? void 0 : _e.id;
          if (schema !== entry[0] && ext) {
            extractToDef(entry);
            continue;
          }
        }
        const id = (_f = this.metadataRegistry.get(entry[0])) == null ? void 0 : _f.id;
        if (id) {
          extractToDef(entry);
          continue;
        }
        if (seen.cycle) {
          extractToDef(entry);
          continue;
        }
        if (seen.count > 1) {
          if (params.reused === "ref") {
            extractToDef(entry);
            continue;
          }
        }
      }
      const flattenRef = (zodSchema, params2) => {
        var _a2, _b2, _c2;
        const seen = this.seen.get(zodSchema);
        const schema2 = (_a2 = seen.def) != null ? _a2 : seen.schema;
        const _cached = __spreadValues({}, schema2);
        if (seen.ref === null) {
          return;
        }
        const ref = seen.ref;
        seen.ref = null;
        if (ref) {
          flattenRef(ref, params2);
          const refSchema = this.seen.get(ref).schema;
          if (refSchema.$ref && (params2.target === "draft-7" || params2.target === "draft-4" || params2.target === "openapi-3.0")) {
            schema2.allOf = (_b2 = schema2.allOf) != null ? _b2 : [];
            schema2.allOf.push(refSchema);
          } else {
            Object.assign(schema2, refSchema);
            Object.assign(schema2, _cached);
          }
        }
        if (!seen.isParent)
          this.override({
            zodSchema,
            jsonSchema: schema2,
            path: (_c2 = seen.path) != null ? _c2 : []
          });
      };
      for (const entry of [...this.seen.entries()].reverse()) {
        flattenRef(entry[0], { target: this.target });
      }
      const result = {};
      if (this.target === "draft-2020-12") {
        result.$schema = "https://json-schema.org/draft/2020-12/schema";
      } else if (this.target === "draft-7") {
        result.$schema = "http://json-schema.org/draft-07/schema#";
      } else if (this.target === "draft-4") {
        result.$schema = "http://json-schema.org/draft-04/schema#";
      } else if (this.target === "openapi-3.0") {
      } else {
        console.warn(`Invalid target: ${this.target}`);
      }
      if ((_g = params.external) == null ? void 0 : _g.uri) {
        const id = (_h = params.external.registry.get(schema)) == null ? void 0 : _h.id;
        if (!id)
          throw new Error("Schema is missing an `id` property");
        result.$id = params.external.uri(id);
      }
      Object.assign(result, root.def);
      const defs = (_j = (_i = params.external) == null ? void 0 : _i.defs) != null ? _j : {};
      for (const entry of this.seen.entries()) {
        const seen = entry[1];
        if (seen.def && seen.defId) {
          defs[seen.defId] = seen.def;
        }
      }
      if (params.external) {
      } else {
        if (Object.keys(defs).length > 0) {
          if (this.target === "draft-2020-12") {
            result.$defs = defs;
          } else {
            result.definitions = defs;
          }
        }
      }
      try {
        return JSON.parse(JSON.stringify(result));
      } catch (_err) {
        throw new Error("Error converting schema to JSON.");
      }
    }
  };
  function toJSONSchema(input, _params) {
    if (input instanceof $ZodRegistry) {
      const gen2 = new JSONSchemaGenerator(_params);
      const defs = {};
      for (const entry of input._idmap.entries()) {
        const [_, schema] = entry;
        gen2.process(schema);
      }
      const schemas = {};
      const external = {
        registry: input,
        uri: _params == null ? void 0 : _params.uri,
        defs
      };
      for (const entry of input._idmap.entries()) {
        const [key, schema] = entry;
        schemas[key] = gen2.emit(schema, __spreadProps(__spreadValues({}, _params), {
          external
        }));
      }
      if (Object.keys(defs).length > 0) {
        const defsSegment = gen2.target === "draft-2020-12" ? "$defs" : "definitions";
        schemas.__shared = {
          [defsSegment]: defs
        };
      }
      return { schemas };
    }
    const gen = new JSONSchemaGenerator(_params);
    gen.process(input);
    return gen.emit(input, _params);
  }
  function isTransforming(_schema, _ctx) {
    const ctx = _ctx != null ? _ctx : { seen: /* @__PURE__ */ new Set() };
    if (ctx.seen.has(_schema))
      return false;
    ctx.seen.add(_schema);
    const schema = _schema;
    const def = schema._zod.def;
    switch (def.type) {
      case "string":
      case "number":
      case "bigint":
      case "boolean":
      case "date":
      case "symbol":
      case "undefined":
      case "null":
      case "any":
      case "unknown":
      case "never":
      case "void":
      case "literal":
      case "enum":
      case "nan":
      case "file":
      case "template_literal":
        return false;
      case "array": {
        return isTransforming(def.element, ctx);
      }
      case "object": {
        for (const key in def.shape) {
          if (isTransforming(def.shape[key], ctx))
            return true;
        }
        return false;
      }
      case "union": {
        for (const option of def.options) {
          if (isTransforming(option, ctx))
            return true;
        }
        return false;
      }
      case "intersection": {
        return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
      }
      case "tuple": {
        for (const item of def.items) {
          if (isTransforming(item, ctx))
            return true;
        }
        if (def.rest && isTransforming(def.rest, ctx))
          return true;
        return false;
      }
      case "record": {
        return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
      }
      case "map": {
        return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
      }
      case "set": {
        return isTransforming(def.valueType, ctx);
      }
      // inner types
      case "promise":
      case "optional":
      case "nonoptional":
      case "nullable":
      case "readonly":
        return isTransforming(def.innerType, ctx);
      case "lazy":
        return isTransforming(def.getter(), ctx);
      case "default": {
        return isTransforming(def.innerType, ctx);
      }
      case "prefault": {
        return isTransforming(def.innerType, ctx);
      }
      case "custom": {
        return false;
      }
      case "transform": {
        return true;
      }
      case "pipe": {
        return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
      }
      case "success": {
        return false;
      }
      case "catch": {
        return false;
      }
      case "function": {
        return false;
      }
      default:
        def;
    }
    throw new Error(`Unknown schema type: ${def.type}`);
  }

  // node_modules/zod/v4/core/json-schema.js
  var json_schema_exports = {};

  // node_modules/zod/v4/classic/iso.js
  var iso_exports = {};
  __export(iso_exports, {
    ZodISODate: () => ZodISODate,
    ZodISODateTime: () => ZodISODateTime,
    ZodISODuration: () => ZodISODuration,
    ZodISOTime: () => ZodISOTime,
    date: () => date2,
    datetime: () => datetime2,
    duration: () => duration2,
    time: () => time2
  });
  var ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
    $ZodISODateTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function datetime2(params) {
    return _isoDateTime(ZodISODateTime, params);
  }
  var ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
    $ZodISODate.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function date2(params) {
    return _isoDate(ZodISODate, params);
  }
  var ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
    $ZodISOTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function time2(params) {
    return _isoTime(ZodISOTime, params);
  }
  var ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
    $ZodISODuration.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function duration2(params) {
    return _isoDuration(ZodISODuration, params);
  }

  // node_modules/zod/v4/classic/errors.js
  var initializer2 = (inst, issues) => {
    $ZodError.init(inst, issues);
    inst.name = "ZodError";
    Object.defineProperties(inst, {
      format: {
        value: (mapper) => formatError(inst, mapper)
        // enumerable: false,
      },
      flatten: {
        value: (mapper) => flattenError(inst, mapper)
        // enumerable: false,
      },
      addIssue: {
        value: (issue2) => {
          inst.issues.push(issue2);
          inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
        }
        // enumerable: false,
      },
      addIssues: {
        value: (issues2) => {
          inst.issues.push(...issues2);
          inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
        }
        // enumerable: false,
      },
      isEmpty: {
        get() {
          return inst.issues.length === 0;
        }
        // enumerable: false,
      }
    });
  };
  var ZodError = $constructor("ZodError", initializer2);
  var ZodRealError = $constructor("ZodError", initializer2, {
    Parent: Error
  });

  // node_modules/zod/v4/classic/parse.js
  var parse2 = /* @__PURE__ */ _parse(ZodRealError);
  var parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
  var safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
  var safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
  var encode2 = /* @__PURE__ */ _encode(ZodRealError);
  var decode2 = /* @__PURE__ */ _decode(ZodRealError);
  var encodeAsync2 = /* @__PURE__ */ _encodeAsync(ZodRealError);
  var decodeAsync2 = /* @__PURE__ */ _decodeAsync(ZodRealError);
  var safeEncode2 = /* @__PURE__ */ _safeEncode(ZodRealError);
  var safeDecode2 = /* @__PURE__ */ _safeDecode(ZodRealError);
  var safeEncodeAsync2 = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
  var safeDecodeAsync2 = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

  // node_modules/zod/v4/classic/schemas.js
  var ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
    $ZodType.init(inst, def);
    inst.def = def;
    inst.type = def.type;
    Object.defineProperty(inst, "_def", { value: def });
    inst.check = (...checks) => {
      var _a;
      return inst.clone(util_exports.mergeDefs(def, {
        checks: [
          ...(_a = def.checks) != null ? _a : [],
          ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      }));
    };
    inst.clone = (def2, params) => clone(inst, def2, params);
    inst.brand = () => inst;
    inst.register = ((reg, meta) => {
      reg.add(inst, meta);
      return inst;
    });
    inst.parse = (data, params) => parse2(inst, data, params, { callee: inst.parse });
    inst.safeParse = (data, params) => safeParse2(inst, data, params);
    inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
    inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
    inst.spa = inst.safeParseAsync;
    inst.encode = (data, params) => encode2(inst, data, params);
    inst.decode = (data, params) => decode2(inst, data, params);
    inst.encodeAsync = async (data, params) => encodeAsync2(inst, data, params);
    inst.decodeAsync = async (data, params) => decodeAsync2(inst, data, params);
    inst.safeEncode = (data, params) => safeEncode2(inst, data, params);
    inst.safeDecode = (data, params) => safeDecode2(inst, data, params);
    inst.safeEncodeAsync = async (data, params) => safeEncodeAsync2(inst, data, params);
    inst.safeDecodeAsync = async (data, params) => safeDecodeAsync2(inst, data, params);
    inst.refine = (check2, params) => inst.check(refine(check2, params));
    inst.superRefine = (refinement) => inst.check(superRefine(refinement));
    inst.overwrite = (fn) => inst.check(_overwrite(fn));
    inst.optional = () => optional(inst);
    inst.nullable = () => nullable(inst);
    inst.nullish = () => optional(nullable(inst));
    inst.nonoptional = (params) => nonoptional(inst, params);
    inst.array = () => array(inst);
    inst.or = (arg) => union([inst, arg]);
    inst.and = (arg) => intersection(inst, arg);
    inst.transform = (tx) => pipe(inst, transform(tx));
    inst.default = (def2) => _default2(inst, def2);
    inst.prefault = (def2) => prefault(inst, def2);
    inst.catch = (params) => _catch2(inst, params);
    inst.pipe = (target) => pipe(inst, target);
    inst.readonly = () => readonly(inst);
    inst.describe = (description) => {
      const cl = inst.clone();
      globalRegistry.add(cl, { description });
      return cl;
    };
    Object.defineProperty(inst, "description", {
      get() {
        var _a;
        return (_a = globalRegistry.get(inst)) == null ? void 0 : _a.description;
      },
      configurable: true
    });
    inst.meta = (...args) => {
      if (args.length === 0) {
        return globalRegistry.get(inst);
      }
      const cl = inst.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    };
    inst.isOptional = () => inst.safeParse(void 0).success;
    inst.isNullable = () => inst.safeParse(null).success;
    return inst;
  });
  var _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
    var _a, _b, _c;
    $ZodString.init(inst, def);
    ZodType.init(inst, def);
    const bag = inst._zod.bag;
    inst.format = (_a = bag.format) != null ? _a : null;
    inst.minLength = (_b = bag.minimum) != null ? _b : null;
    inst.maxLength = (_c = bag.maximum) != null ? _c : null;
    inst.regex = (...args) => inst.check(_regex(...args));
    inst.includes = (...args) => inst.check(_includes(...args));
    inst.startsWith = (...args) => inst.check(_startsWith(...args));
    inst.endsWith = (...args) => inst.check(_endsWith(...args));
    inst.min = (...args) => inst.check(_minLength(...args));
    inst.max = (...args) => inst.check(_maxLength(...args));
    inst.length = (...args) => inst.check(_length(...args));
    inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
    inst.lowercase = (params) => inst.check(_lowercase(params));
    inst.uppercase = (params) => inst.check(_uppercase(params));
    inst.trim = () => inst.check(_trim());
    inst.normalize = (...args) => inst.check(_normalize(...args));
    inst.toLowerCase = () => inst.check(_toLowerCase());
    inst.toUpperCase = () => inst.check(_toUpperCase());
  });
  var ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    _ZodString.init(inst, def);
    inst.email = (params) => inst.check(_email(ZodEmail, params));
    inst.url = (params) => inst.check(_url(ZodURL, params));
    inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
    inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
    inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
    inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
    inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
    inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
    inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
    inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
    inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
    inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
    inst.xid = (params) => inst.check(_xid(ZodXID, params));
    inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
    inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
    inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
    inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
    inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
    inst.e164 = (params) => inst.check(_e164(ZodE164, params));
    inst.datetime = (params) => inst.check(datetime2(params));
    inst.date = (params) => inst.check(date2(params));
    inst.time = (params) => inst.check(time2(params));
    inst.duration = (params) => inst.check(duration2(params));
  });
  function string2(params) {
    return _string(ZodString, params);
  }
  var ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    _ZodString.init(inst, def);
  });
  var ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
    $ZodEmail.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function email2(params) {
    return _email(ZodEmail, params);
  }
  var ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
    $ZodGUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function guid2(params) {
    return _guid(ZodGUID, params);
  }
  var ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
    $ZodUUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function uuid2(params) {
    return _uuid(ZodUUID, params);
  }
  function uuidv4(params) {
    return _uuidv4(ZodUUID, params);
  }
  function uuidv6(params) {
    return _uuidv6(ZodUUID, params);
  }
  function uuidv7(params) {
    return _uuidv7(ZodUUID, params);
  }
  var ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
    $ZodURL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function url(params) {
    return _url(ZodURL, params);
  }
  function httpUrl(params) {
    return _url(ZodURL, __spreadValues({
      protocol: /^https?$/,
      hostname: regexes_exports.domain
    }, util_exports.normalizeParams(params)));
  }
  var ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
    $ZodEmoji.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function emoji2(params) {
    return _emoji2(ZodEmoji, params);
  }
  var ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
    $ZodNanoID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function nanoid2(params) {
    return _nanoid(ZodNanoID, params);
  }
  var ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
    $ZodCUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function cuid3(params) {
    return _cuid(ZodCUID, params);
  }
  var ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
    $ZodCUID2.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function cuid22(params) {
    return _cuid2(ZodCUID2, params);
  }
  var ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
    $ZodULID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function ulid2(params) {
    return _ulid(ZodULID, params);
  }
  var ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
    $ZodXID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function xid2(params) {
    return _xid(ZodXID, params);
  }
  var ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
    $ZodKSUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function ksuid2(params) {
    return _ksuid(ZodKSUID, params);
  }
  var ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
    $ZodIPv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function ipv42(params) {
    return _ipv4(ZodIPv4, params);
  }
  var ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
    $ZodIPv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function ipv62(params) {
    return _ipv6(ZodIPv6, params);
  }
  var ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
    $ZodCIDRv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function cidrv42(params) {
    return _cidrv4(ZodCIDRv4, params);
  }
  var ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
    $ZodCIDRv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function cidrv62(params) {
    return _cidrv6(ZodCIDRv6, params);
  }
  var ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
    $ZodBase64.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function base642(params) {
    return _base64(ZodBase64, params);
  }
  var ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
    $ZodBase64URL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function base64url2(params) {
    return _base64url(ZodBase64URL, params);
  }
  var ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
    $ZodE164.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function e1642(params) {
    return _e164(ZodE164, params);
  }
  var ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
    $ZodJWT.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function jwt(params) {
    return _jwt(ZodJWT, params);
  }
  var ZodCustomStringFormat = /* @__PURE__ */ $constructor("ZodCustomStringFormat", (inst, def) => {
    $ZodCustomStringFormat.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function stringFormat(format, fnOrRegex, _params = {}) {
    return _stringFormat(ZodCustomStringFormat, format, fnOrRegex, _params);
  }
  function hostname2(_params) {
    return _stringFormat(ZodCustomStringFormat, "hostname", regexes_exports.hostname, _params);
  }
  function hex2(_params) {
    return _stringFormat(ZodCustomStringFormat, "hex", regexes_exports.hex, _params);
  }
  function hash(alg, params) {
    var _a;
    const enc = (_a = params == null ? void 0 : params.enc) != null ? _a : "hex";
    const format = `${alg}_${enc}`;
    const regex = regexes_exports[format];
    if (!regex)
      throw new Error(`Unrecognized hash format: ${format}`);
    return _stringFormat(ZodCustomStringFormat, format, regex, params);
  }
  var ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    $ZodNumber.init(inst, def);
    ZodType.init(inst, def);
    inst.gt = (value, params) => inst.check(_gt(value, params));
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.lt = (value, params) => inst.check(_lt(value, params));
    inst.lte = (value, params) => inst.check(_lte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    inst.int = (params) => inst.check(int(params));
    inst.safe = (params) => inst.check(int(params));
    inst.positive = (params) => inst.check(_gt(0, params));
    inst.nonnegative = (params) => inst.check(_gte(0, params));
    inst.negative = (params) => inst.check(_lt(0, params));
    inst.nonpositive = (params) => inst.check(_lte(0, params));
    inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
    inst.step = (value, params) => inst.check(_multipleOf(value, params));
    inst.finite = () => inst;
    const bag = inst._zod.bag;
    inst.minValue = (_c = Math.max((_a = bag.minimum) != null ? _a : Number.NEGATIVE_INFINITY, (_b = bag.exclusiveMinimum) != null ? _b : Number.NEGATIVE_INFINITY)) != null ? _c : null;
    inst.maxValue = (_f = Math.min((_d = bag.maximum) != null ? _d : Number.POSITIVE_INFINITY, (_e = bag.exclusiveMaximum) != null ? _e : Number.POSITIVE_INFINITY)) != null ? _f : null;
    inst.isInt = ((_g = bag.format) != null ? _g : "").includes("int") || Number.isSafeInteger((_h = bag.multipleOf) != null ? _h : 0.5);
    inst.isFinite = true;
    inst.format = (_i = bag.format) != null ? _i : null;
  });
  function number2(params) {
    return _number(ZodNumber, params);
  }
  var ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
    $ZodNumberFormat.init(inst, def);
    ZodNumber.init(inst, def);
  });
  function int(params) {
    return _int(ZodNumberFormat, params);
  }
  function float32(params) {
    return _float32(ZodNumberFormat, params);
  }
  function float64(params) {
    return _float64(ZodNumberFormat, params);
  }
  function int32(params) {
    return _int32(ZodNumberFormat, params);
  }
  function uint32(params) {
    return _uint32(ZodNumberFormat, params);
  }
  var ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
    $ZodBoolean.init(inst, def);
    ZodType.init(inst, def);
  });
  function boolean2(params) {
    return _boolean(ZodBoolean, params);
  }
  var ZodBigInt = /* @__PURE__ */ $constructor("ZodBigInt", (inst, def) => {
    var _a, _b, _c;
    $ZodBigInt.init(inst, def);
    ZodType.init(inst, def);
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.gt = (value, params) => inst.check(_gt(value, params));
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.lt = (value, params) => inst.check(_lt(value, params));
    inst.lte = (value, params) => inst.check(_lte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    inst.positive = (params) => inst.check(_gt(BigInt(0), params));
    inst.negative = (params) => inst.check(_lt(BigInt(0), params));
    inst.nonpositive = (params) => inst.check(_lte(BigInt(0), params));
    inst.nonnegative = (params) => inst.check(_gte(BigInt(0), params));
    inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
    const bag = inst._zod.bag;
    inst.minValue = (_a = bag.minimum) != null ? _a : null;
    inst.maxValue = (_b = bag.maximum) != null ? _b : null;
    inst.format = (_c = bag.format) != null ? _c : null;
  });
  function bigint2(params) {
    return _bigint(ZodBigInt, params);
  }
  var ZodBigIntFormat = /* @__PURE__ */ $constructor("ZodBigIntFormat", (inst, def) => {
    $ZodBigIntFormat.init(inst, def);
    ZodBigInt.init(inst, def);
  });
  function int64(params) {
    return _int64(ZodBigIntFormat, params);
  }
  function uint64(params) {
    return _uint64(ZodBigIntFormat, params);
  }
  var ZodSymbol = /* @__PURE__ */ $constructor("ZodSymbol", (inst, def) => {
    $ZodSymbol.init(inst, def);
    ZodType.init(inst, def);
  });
  function symbol(params) {
    return _symbol(ZodSymbol, params);
  }
  var ZodUndefined = /* @__PURE__ */ $constructor("ZodUndefined", (inst, def) => {
    $ZodUndefined.init(inst, def);
    ZodType.init(inst, def);
  });
  function _undefined3(params) {
    return _undefined2(ZodUndefined, params);
  }
  var ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
    $ZodNull.init(inst, def);
    ZodType.init(inst, def);
  });
  function _null3(params) {
    return _null2(ZodNull, params);
  }
  var ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
    $ZodAny.init(inst, def);
    ZodType.init(inst, def);
  });
  function any() {
    return _any(ZodAny);
  }
  var ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
    $ZodUnknown.init(inst, def);
    ZodType.init(inst, def);
  });
  function unknown() {
    return _unknown(ZodUnknown);
  }
  var ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
    $ZodNever.init(inst, def);
    ZodType.init(inst, def);
  });
  function never(params) {
    return _never(ZodNever, params);
  }
  var ZodVoid = /* @__PURE__ */ $constructor("ZodVoid", (inst, def) => {
    $ZodVoid.init(inst, def);
    ZodType.init(inst, def);
  });
  function _void2(params) {
    return _void(ZodVoid, params);
  }
  var ZodDate = /* @__PURE__ */ $constructor("ZodDate", (inst, def) => {
    $ZodDate.init(inst, def);
    ZodType.init(inst, def);
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    const c = inst._zod.bag;
    inst.minDate = c.minimum ? new Date(c.minimum) : null;
    inst.maxDate = c.maximum ? new Date(c.maximum) : null;
  });
  function date3(params) {
    return _date(ZodDate, params);
  }
  var ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
    $ZodArray.init(inst, def);
    ZodType.init(inst, def);
    inst.element = def.element;
    inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
    inst.nonempty = (params) => inst.check(_minLength(1, params));
    inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
    inst.length = (len, params) => inst.check(_length(len, params));
    inst.unwrap = () => inst.element;
  });
  function array(element, params) {
    return _array(ZodArray, element, params);
  }
  function keyof(schema) {
    const shape = schema._zod.def.shape;
    return _enum2(Object.keys(shape));
  }
  var ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
    $ZodObjectJIT.init(inst, def);
    ZodType.init(inst, def);
    util_exports.defineLazy(inst, "shape", () => {
      return def.shape;
    });
    inst.keyof = () => _enum2(Object.keys(inst._zod.def.shape));
    inst.catchall = (catchall) => inst.clone(__spreadProps(__spreadValues({}, inst._zod.def), { catchall }));
    inst.passthrough = () => inst.clone(__spreadProps(__spreadValues({}, inst._zod.def), { catchall: unknown() }));
    inst.loose = () => inst.clone(__spreadProps(__spreadValues({}, inst._zod.def), { catchall: unknown() }));
    inst.strict = () => inst.clone(__spreadProps(__spreadValues({}, inst._zod.def), { catchall: never() }));
    inst.strip = () => inst.clone(__spreadProps(__spreadValues({}, inst._zod.def), { catchall: void 0 }));
    inst.extend = (incoming) => {
      return util_exports.extend(inst, incoming);
    };
    inst.safeExtend = (incoming) => {
      return util_exports.safeExtend(inst, incoming);
    };
    inst.merge = (other) => util_exports.merge(inst, other);
    inst.pick = (mask) => util_exports.pick(inst, mask);
    inst.omit = (mask) => util_exports.omit(inst, mask);
    inst.partial = (...args) => util_exports.partial(ZodOptional, inst, args[0]);
    inst.required = (...args) => util_exports.required(ZodNonOptional, inst, args[0]);
  });
  function object(shape, params) {
    const def = __spreadValues({
      type: "object",
      shape: shape != null ? shape : {}
    }, util_exports.normalizeParams(params));
    return new ZodObject(def);
  }
  function strictObject(shape, params) {
    return new ZodObject(__spreadValues({
      type: "object",
      shape,
      catchall: never()
    }, util_exports.normalizeParams(params)));
  }
  function looseObject(shape, params) {
    return new ZodObject(__spreadValues({
      type: "object",
      shape,
      catchall: unknown()
    }, util_exports.normalizeParams(params)));
  }
  var ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    ZodType.init(inst, def);
    inst.options = def.options;
  });
  function union(options, params) {
    return new ZodUnion(__spreadValues({
      type: "union",
      options
    }, util_exports.normalizeParams(params)));
  }
  var ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
    ZodUnion.init(inst, def);
    $ZodDiscriminatedUnion.init(inst, def);
  });
  function discriminatedUnion(discriminator, options, params) {
    return new ZodDiscriminatedUnion(__spreadValues({
      type: "union",
      options,
      discriminator
    }, util_exports.normalizeParams(params)));
  }
  var ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
    $ZodIntersection.init(inst, def);
    ZodType.init(inst, def);
  });
  function intersection(left, right) {
    return new ZodIntersection({
      type: "intersection",
      left,
      right
    });
  }
  var ZodTuple = /* @__PURE__ */ $constructor("ZodTuple", (inst, def) => {
    $ZodTuple.init(inst, def);
    ZodType.init(inst, def);
    inst.rest = (rest) => inst.clone(__spreadProps(__spreadValues({}, inst._zod.def), {
      rest
    }));
  });
  function tuple(items, _paramsOrRest, _params) {
    const hasRest = _paramsOrRest instanceof $ZodType;
    const params = hasRest ? _params : _paramsOrRest;
    const rest = hasRest ? _paramsOrRest : null;
    return new ZodTuple(__spreadValues({
      type: "tuple",
      items,
      rest
    }, util_exports.normalizeParams(params)));
  }
  var ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
    $ZodRecord.init(inst, def);
    ZodType.init(inst, def);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
  });
  function record(keyType, valueType, params) {
    return new ZodRecord(__spreadValues({
      type: "record",
      keyType,
      valueType
    }, util_exports.normalizeParams(params)));
  }
  function partialRecord(keyType, valueType, params) {
    const k = clone(keyType);
    k._zod.values = void 0;
    return new ZodRecord(__spreadValues({
      type: "record",
      keyType: k,
      valueType
    }, util_exports.normalizeParams(params)));
  }
  var ZodMap = /* @__PURE__ */ $constructor("ZodMap", (inst, def) => {
    $ZodMap.init(inst, def);
    ZodType.init(inst, def);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
  });
  function map(keyType, valueType, params) {
    return new ZodMap(__spreadValues({
      type: "map",
      keyType,
      valueType
    }, util_exports.normalizeParams(params)));
  }
  var ZodSet = /* @__PURE__ */ $constructor("ZodSet", (inst, def) => {
    $ZodSet.init(inst, def);
    ZodType.init(inst, def);
    inst.min = (...args) => inst.check(_minSize(...args));
    inst.nonempty = (params) => inst.check(_minSize(1, params));
    inst.max = (...args) => inst.check(_maxSize(...args));
    inst.size = (...args) => inst.check(_size(...args));
  });
  function set(valueType, params) {
    return new ZodSet(__spreadValues({
      type: "set",
      valueType
    }, util_exports.normalizeParams(params)));
  }
  var ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
    $ZodEnum.init(inst, def);
    ZodType.init(inst, def);
    inst.enum = def.entries;
    inst.options = Object.values(def.entries);
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
      const newEntries = {};
      for (const value of values) {
        if (keys.has(value)) {
          newEntries[value] = def.entries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum(__spreadProps(__spreadValues(__spreadProps(__spreadValues({}, def), {
        checks: []
      }), util_exports.normalizeParams(params)), {
        entries: newEntries
      }));
    };
    inst.exclude = (values, params) => {
      const newEntries = __spreadValues({}, def.entries);
      for (const value of values) {
        if (keys.has(value)) {
          delete newEntries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum(__spreadProps(__spreadValues(__spreadProps(__spreadValues({}, def), {
        checks: []
      }), util_exports.normalizeParams(params)), {
        entries: newEntries
      }));
    };
  });
  function _enum2(values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    return new ZodEnum(__spreadValues({
      type: "enum",
      entries
    }, util_exports.normalizeParams(params)));
  }
  function nativeEnum(entries, params) {
    return new ZodEnum(__spreadValues({
      type: "enum",
      entries
    }, util_exports.normalizeParams(params)));
  }
  var ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
    $ZodLiteral.init(inst, def);
    ZodType.init(inst, def);
    inst.values = new Set(def.values);
    Object.defineProperty(inst, "value", {
      get() {
        if (def.values.length > 1) {
          throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
        }
        return def.values[0];
      }
    });
  });
  function literal(value, params) {
    return new ZodLiteral(__spreadValues({
      type: "literal",
      values: Array.isArray(value) ? value : [value]
    }, util_exports.normalizeParams(params)));
  }
  var ZodFile = /* @__PURE__ */ $constructor("ZodFile", (inst, def) => {
    $ZodFile.init(inst, def);
    ZodType.init(inst, def);
    inst.min = (size, params) => inst.check(_minSize(size, params));
    inst.max = (size, params) => inst.check(_maxSize(size, params));
    inst.mime = (types, params) => inst.check(_mime(Array.isArray(types) ? types : [types], params));
  });
  function file(params) {
    return _file(ZodFile, params);
  }
  var ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
    $ZodTransform.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (_ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      payload.addIssue = (issue2) => {
        var _a, _b, _c;
        if (typeof issue2 === "string") {
          payload.issues.push(util_exports.issue(issue2, payload.value, def));
        } else {
          const _issue = issue2;
          if (_issue.fatal)
            _issue.continue = false;
          (_a = _issue.code) != null ? _a : _issue.code = "custom";
          (_b = _issue.input) != null ? _b : _issue.input = payload.value;
          (_c = _issue.inst) != null ? _c : _issue.inst = inst;
          payload.issues.push(util_exports.issue(_issue));
        }
      };
      const output = def.transform(payload.value, payload);
      if (output instanceof Promise) {
        return output.then((output2) => {
          payload.value = output2;
          return payload;
        });
      }
      payload.value = output;
      return payload;
    };
  });
  function transform(fn) {
    return new ZodTransform({
      type: "transform",
      transform: fn
    });
  }
  var ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function optional(innerType) {
    return new ZodOptional({
      type: "optional",
      innerType
    });
  }
  var ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
    $ZodNullable.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nullable(innerType) {
    return new ZodNullable({
      type: "nullable",
      innerType
    });
  }
  function nullish2(innerType) {
    return optional(nullable(innerType));
  }
  var ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
    $ZodDefault.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
  });
  function _default2(innerType, defaultValue) {
    return new ZodDefault({
      type: "default",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
      }
    });
  }
  var ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
    $ZodPrefault.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function prefault(innerType, defaultValue) {
    return new ZodPrefault({
      type: "prefault",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
      }
    });
  }
  var ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
    $ZodNonOptional.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nonoptional(innerType, params) {
    return new ZodNonOptional(__spreadValues({
      type: "nonoptional",
      innerType
    }, util_exports.normalizeParams(params)));
  }
  var ZodSuccess = /* @__PURE__ */ $constructor("ZodSuccess", (inst, def) => {
    $ZodSuccess.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function success(innerType) {
    return new ZodSuccess({
      type: "success",
      innerType
    });
  }
  var ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
    $ZodCatch.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
  });
  function _catch2(innerType, catchValue) {
    return new ZodCatch({
      type: "catch",
      innerType,
      catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
    });
  }
  var ZodNaN = /* @__PURE__ */ $constructor("ZodNaN", (inst, def) => {
    $ZodNaN.init(inst, def);
    ZodType.init(inst, def);
  });
  function nan(params) {
    return _nan(ZodNaN, params);
  }
  var ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
    $ZodPipe.init(inst, def);
    ZodType.init(inst, def);
    inst.in = def.in;
    inst.out = def.out;
  });
  function pipe(in_, out) {
    return new ZodPipe({
      type: "pipe",
      in: in_,
      out
      // ...util.normalizeParams(params),
    });
  }
  var ZodCodec = /* @__PURE__ */ $constructor("ZodCodec", (inst, def) => {
    ZodPipe.init(inst, def);
    $ZodCodec.init(inst, def);
  });
  function codec(in_, out, params) {
    return new ZodCodec({
      type: "pipe",
      in: in_,
      out,
      transform: params.decode,
      reverseTransform: params.encode
    });
  }
  var ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
    $ZodReadonly.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function readonly(innerType) {
    return new ZodReadonly({
      type: "readonly",
      innerType
    });
  }
  var ZodTemplateLiteral = /* @__PURE__ */ $constructor("ZodTemplateLiteral", (inst, def) => {
    $ZodTemplateLiteral.init(inst, def);
    ZodType.init(inst, def);
  });
  function templateLiteral(parts, params) {
    return new ZodTemplateLiteral(__spreadValues({
      type: "template_literal",
      parts
    }, util_exports.normalizeParams(params)));
  }
  var ZodLazy = /* @__PURE__ */ $constructor("ZodLazy", (inst, def) => {
    $ZodLazy.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.getter();
  });
  function lazy(getter) {
    return new ZodLazy({
      type: "lazy",
      getter
    });
  }
  var ZodPromise = /* @__PURE__ */ $constructor("ZodPromise", (inst, def) => {
    $ZodPromise.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function promise(innerType) {
    return new ZodPromise({
      type: "promise",
      innerType
    });
  }
  var ZodFunction = /* @__PURE__ */ $constructor("ZodFunction", (inst, def) => {
    $ZodFunction.init(inst, def);
    ZodType.init(inst, def);
  });
  function _function(params) {
    var _a, _b;
    return new ZodFunction({
      type: "function",
      input: Array.isArray(params == null ? void 0 : params.input) ? tuple(params == null ? void 0 : params.input) : (_a = params == null ? void 0 : params.input) != null ? _a : array(unknown()),
      output: (_b = params == null ? void 0 : params.output) != null ? _b : unknown()
    });
  }
  var ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
    $ZodCustom.init(inst, def);
    ZodType.init(inst, def);
  });
  function check(fn) {
    const ch = new $ZodCheck({
      check: "custom"
      // ...util.normalizeParams(params),
    });
    ch._zod.check = fn;
    return ch;
  }
  function custom(fn, _params) {
    return _custom(ZodCustom, fn != null ? fn : (() => true), _params);
  }
  function refine(fn, _params = {}) {
    return _refine(ZodCustom, fn, _params);
  }
  function superRefine(fn) {
    return _superRefine(fn);
  }
  function _instanceof(cls, params = {
    error: `Input not instance of ${cls.name}`
  }) {
    const inst = new ZodCustom(__spreadValues({
      type: "custom",
      check: "custom",
      fn: (data) => data instanceof cls,
      abort: true
    }, util_exports.normalizeParams(params)));
    inst._zod.bag.Class = cls;
    return inst;
  }
  var stringbool = (...args) => _stringbool({
    Codec: ZodCodec,
    Boolean: ZodBoolean,
    String: ZodString
  }, ...args);
  function json(params) {
    const jsonSchema = lazy(() => {
      return union([string2(params), number2(), boolean2(), _null3(), array(jsonSchema), record(string2(), jsonSchema)]);
    });
    return jsonSchema;
  }
  function preprocess(fn, schema) {
    return pipe(transform(fn), schema);
  }

  // node_modules/zod/v4/classic/compat.js
  var ZodIssueCode = {
    invalid_type: "invalid_type",
    too_big: "too_big",
    too_small: "too_small",
    invalid_format: "invalid_format",
    not_multiple_of: "not_multiple_of",
    unrecognized_keys: "unrecognized_keys",
    invalid_union: "invalid_union",
    invalid_key: "invalid_key",
    invalid_element: "invalid_element",
    invalid_value: "invalid_value",
    custom: "custom"
  };
  function setErrorMap(map2) {
    config({
      customError: map2
    });
  }
  function getErrorMap() {
    return config().customError;
  }
  var ZodFirstPartyTypeKind;
  /* @__PURE__ */ (function(ZodFirstPartyTypeKind2) {
  })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));

  // node_modules/zod/v4/classic/coerce.js
  var coerce_exports = {};
  __export(coerce_exports, {
    bigint: () => bigint3,
    boolean: () => boolean3,
    date: () => date4,
    number: () => number3,
    string: () => string3
  });
  function string3(params) {
    return _coercedString(ZodString, params);
  }
  function number3(params) {
    return _coercedNumber(ZodNumber, params);
  }
  function boolean3(params) {
    return _coercedBoolean(ZodBoolean, params);
  }
  function bigint3(params) {
    return _coercedBigint(ZodBigInt, params);
  }
  function date4(params) {
    return _coercedDate(ZodDate, params);
  }

  // node_modules/zod/v4/classic/external.js
  config(en_default());

  // src/core/validation/schemas.ts
  var ColorValueSchema = external_exports.object({
    colorSpace: external_exports.enum(["sRGB", "display-p3", "hsl", "hsla", "rgb", "rgba"]).optional(),
    hex: external_exports.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/, "Invalid hex color format").optional(),
    r: external_exports.number().min(0).max(255).optional(),
    g: external_exports.number().min(0).max(255).optional(),
    b: external_exports.number().min(0).max(255).optional(),
    a: external_exports.number().min(0).max(1).optional(),
    h: external_exports.number().min(0).max(360).optional(),
    s: external_exports.number().min(0).max(100).optional(),
    l: external_exports.number().min(0).max(100).optional()
  }).refine(
    (data) => {
      const hasHex = data.hex !== void 0;
      const hasRgb = data.r !== void 0 && data.g !== void 0 && data.b !== void 0;
      const hasHsl = data.h !== void 0 && data.s !== void 0 && data.l !== void 0;
      return hasHex || hasRgb || hasHsl;
    },
    { message: "ColorValue must have either hex, rgb, or hsl values" }
  );
  var DimensionValueSchema = external_exports.object({
    value: external_exports.number(),
    unit: external_exports.enum(["px", "rem", "em", "%", "pt"])
  });
  var ShadowValueSchema = external_exports.object({
    offsetX: external_exports.union([external_exports.number(), external_exports.string()]),
    offsetY: external_exports.union([external_exports.number(), external_exports.string()]),
    blur: external_exports.union([external_exports.number(), external_exports.string()]),
    spread: external_exports.union([external_exports.number(), external_exports.string()]).optional(),
    color: external_exports.union([external_exports.string(), ColorValueSchema]),
    inset: external_exports.boolean().optional()
  });
  var TypographyValueSchema = external_exports.object({
    fontFamily: external_exports.string().optional(),
    fontSize: external_exports.union([external_exports.number(), external_exports.string(), DimensionValueSchema]).optional(),
    fontWeight: external_exports.union([external_exports.number(), external_exports.string()]).optional(),
    lineHeight: external_exports.union([external_exports.number(), external_exports.string(), DimensionValueSchema]).optional(),
    letterSpacing: external_exports.union([external_exports.number(), external_exports.string(), DimensionValueSchema]).optional()
  });
  var CubicBezierValueSchema = external_exports.object({
    x1: external_exports.number().min(0).max(1),
    y1: external_exports.number(),
    x2: external_exports.number().min(0).max(1),
    y2: external_exports.number()
  });
  var TokenSourceSchema = external_exports.object({
    type: external_exports.enum(["github", "gitlab", "local", "api", "figma"]),
    location: external_exports.string(),
    imported: external_exports.string(),
    // ISO 8601 timestamp
    branch: external_exports.string().optional(),
    commit: external_exports.string().optional()
  });
  var TokenValidationSchema = external_exports.object({
    isValid: external_exports.boolean(),
    errors: external_exports.array(external_exports.string()),
    warnings: external_exports.array(external_exports.string())
  });
  var FigmaExtensionsSchema = external_exports.object({
    variableId: external_exports.string().optional(),
    collectionId: external_exports.string().optional(),
    collectionName: external_exports.string().optional(),
    scopes: external_exports.array(external_exports.string()).optional(),
    modeId: external_exports.string().optional(),
    modeName: external_exports.string().optional()
  });
  var TokenExtensionsSchema = external_exports.object({
    figma: FigmaExtensionsSchema.optional(),
    w3c: external_exports.record(external_exports.string(), external_exports.any()).optional(),
    styleDictionary: external_exports.record(external_exports.string(), external_exports.any()).optional()
  }).catchall(external_exports.any());
  var TokenBaseSchema = external_exports.object({
    // ==================== IDENTITY ====================
    id: external_exports.string().min(1),
    path: external_exports.array(external_exports.string()).min(1),
    name: external_exports.string().min(1),
    qualifiedName: external_exports.string().min(1),
    // ==================== RELATIONSHIPS ====================
    aliasTo: external_exports.string().optional(),
    referencedBy: external_exports.array(external_exports.string()).optional(),
    // ==================== ORGANIZATION ====================
    projectId: external_exports.string().min(1),
    collection: external_exports.string().min(1),
    theme: external_exports.string().optional(),
    brand: external_exports.string().optional(),
    // ==================== METADATA ====================
    description: external_exports.string().optional(),
    sourceFormat: external_exports.enum(["w3c", "style-dictionary", "figma", "custom"]),
    source: TokenSourceSchema,
    extensions: TokenExtensionsSchema,
    tags: external_exports.array(external_exports.string()),
    status: external_exports.enum(["active", "deprecated", "draft", "archived"]),
    version: external_exports.string().optional(),
    // ==================== TIMESTAMPS ====================
    created: external_exports.string(),
    // ISO 8601 timestamp
    lastModified: external_exports.string(),
    // ISO 8601 timestamp
    // ==================== VALIDATION ====================
    validation: TokenValidationSchema.optional()
  });
  var ColorTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("color"),
    rawValue: external_exports.any(),
    value: ColorValueSchema,
    resolvedValue: ColorValueSchema.optional()
  });
  var DimensionTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("dimension"),
    rawValue: external_exports.any(),
    value: DimensionValueSchema,
    resolvedValue: DimensionValueSchema.optional()
  });
  var FontSizeTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("fontSize"),
    rawValue: external_exports.any(),
    value: external_exports.union([DimensionValueSchema, external_exports.number()]),
    resolvedValue: external_exports.union([DimensionValueSchema, external_exports.number()]).optional()
  });
  var FontWeightTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("fontWeight"),
    rawValue: external_exports.any(),
    value: external_exports.union([external_exports.number(), external_exports.string()]),
    resolvedValue: external_exports.union([external_exports.number(), external_exports.string()]).optional()
  });
  var FontFamilyTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("fontFamily"),
    rawValue: external_exports.any(),
    value: external_exports.string(),
    resolvedValue: external_exports.string().optional()
  });
  var LineHeightTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("lineHeight"),
    rawValue: external_exports.any(),
    value: external_exports.union([DimensionValueSchema, external_exports.number(), external_exports.string()]),
    resolvedValue: external_exports.union([DimensionValueSchema, external_exports.number(), external_exports.string()]).optional()
  });
  var LetterSpacingTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("letterSpacing"),
    rawValue: external_exports.any(),
    value: external_exports.union([DimensionValueSchema, external_exports.number(), external_exports.string()]),
    resolvedValue: external_exports.union([DimensionValueSchema, external_exports.number(), external_exports.string()]).optional()
  });
  var SpacingTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("spacing"),
    rawValue: external_exports.any(),
    value: DimensionValueSchema,
    resolvedValue: DimensionValueSchema.optional()
  });
  var ShadowTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("shadow"),
    rawValue: external_exports.any(),
    value: ShadowValueSchema,
    resolvedValue: ShadowValueSchema.optional()
  });
  var BorderTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("border"),
    rawValue: external_exports.any(),
    value: external_exports.any(),
    // TODO: Define BorderValue type
    resolvedValue: external_exports.any().optional()
  });
  var DurationTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("duration"),
    rawValue: external_exports.any(),
    value: external_exports.union([external_exports.number(), external_exports.string()]),
    resolvedValue: external_exports.union([external_exports.number(), external_exports.string()]).optional()
  });
  var CubicBezierTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("cubicBezier"),
    rawValue: external_exports.any(),
    value: CubicBezierValueSchema,
    resolvedValue: CubicBezierValueSchema.optional()
  });
  var NumberTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("number"),
    rawValue: external_exports.any(),
    value: external_exports.number(),
    resolvedValue: external_exports.number().optional()
  });
  var StringTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("string"),
    rawValue: external_exports.any(),
    value: external_exports.string(),
    resolvedValue: external_exports.string().optional()
  });
  var TypographyTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("typography"),
    rawValue: external_exports.any(),
    value: TypographyValueSchema,
    resolvedValue: TypographyValueSchema.optional()
  });
  var BooleanTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("boolean"),
    rawValue: external_exports.any(),
    value: external_exports.boolean(),
    resolvedValue: external_exports.boolean().optional()
  });
  var OtherTokenSchema = TokenBaseSchema.extend({
    type: external_exports.literal("other"),
    rawValue: external_exports.any(),
    value: external_exports.any(),
    resolvedValue: external_exports.any().optional()
  });
  var TokenSchema = external_exports.discriminatedUnion("type", [
    ColorTokenSchema,
    DimensionTokenSchema,
    FontSizeTokenSchema,
    FontWeightTokenSchema,
    FontFamilyTokenSchema,
    LineHeightTokenSchema,
    LetterSpacingTokenSchema,
    SpacingTokenSchema,
    ShadowTokenSchema,
    BorderTokenSchema,
    DurationTokenSchema,
    CubicBezierTokenSchema,
    NumberTokenSchema,
    StringTokenSchema,
    TypographyTokenSchema,
    BooleanTokenSchema,
    OtherTokenSchema
  ]);
  var LegacyTokenSchema = TokenBaseSchema.extend({
    type: external_exports.enum([
      "color",
      "dimension",
      "fontSize",
      "fontWeight",
      "fontFamily",
      "lineHeight",
      "letterSpacing",
      "spacing",
      "shadow",
      "border",
      "duration",
      "cubicBezier",
      "number",
      "string",
      "typography",
      "boolean",
      "other"
    ]),
    rawValue: external_exports.any(),
    value: external_exports.any(),
    // Weak typing - any value allowed
    resolvedValue: external_exports.any().optional()
  });
  function validateToken(token) {
    const result = TokenSchema.safeParse(token);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
  }

  // src/core/services/TokenRepository.ts
  var TokenRepository = class {
    constructor() {
      // Primary storage
      this.tokens = /* @__PURE__ */ new Map();
      // Indexes for fast lookups
      this.projectIndex = /* @__PURE__ */ new Map();
      this.typeIndex = /* @__PURE__ */ new Map();
      this.collectionIndex = /* @__PURE__ */ new Map();
      this.pathIndex = /* @__PURE__ */ new Map();
      // qualifiedName -> id
      this.aliasIndex = /* @__PURE__ */ new Map();
      // target id -> referrer ids
      this.tagIndex = /* @__PURE__ */ new Map();
    }
    /**
     * Generate stable token ID from projectId and path
     * Uses hash to ensure consistent IDs across sessions
     */
    generateTokenId(projectId, path) {
      const key = `${projectId}:${path.join(".")}`;
      return this.simpleHash(key);
    }
    /**
     * Simple hash function for browser compatibility
     */
    simpleHash(str) {
      let hash2 = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash2 = (hash2 << 5) - hash2 + char;
        hash2 = hash2 & hash2;
      }
      return `token_${Math.abs(hash2).toString(36)}`;
    }
    /**
     * Add or update tokens in the repository
     * Updates all indexes automatically
     *
     * @param tokens - Array of tokens to add/update
     * @returns Success with added count
     */
    add(tokens) {
      try {
        let addedCount = 0;
        const validationErrors = [];
        for (const token of tokens) {
          if (!token.id || !token.projectId || !token.path || token.path.length === 0) {
            console.error("[TokenRepository] Invalid token missing required fields:", token);
            continue;
          }
          if (isFeatureEnabled("ZOD_VALIDATION")) {
            const validationResult = validateToken(token);
            if (!validationResult.success && validationResult.error) {
              console.warn(
                `[TokenRepository] Token validation failed for ${token.qualifiedName}:`,
                validationResult.error.issues
              );
              validationErrors.push({
                tokenId: token.id,
                errors: validationResult.error.issues.map((e) => ({
                  path: e.path.join("."),
                  message: e.message,
                  code: e.code
                }))
              });
              token.status = "draft";
              token.extensions = __spreadProps(__spreadValues({}, token.extensions), {
                validationErrors: validationResult.error.issues.map((e) => ({
                  path: e.path.join("."),
                  message: e.message,
                  code: e.code
                }))
              });
            }
          }
          if (this.tokens.has(token.id)) {
            this.removeFromIndexes(token.id);
          }
          this.tokens.set(token.id, token);
          this.addToIndexes(token);
          addedCount++;
        }
        if (validationErrors.length > 0) {
          console.warn(
            `[TokenRepository] ${validationErrors.length} token(s) failed validation but were added as drafts`
          );
        }
        return Success(addedCount);
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
        console.error("[TokenRepository] Failed to add tokens:", message);
        return Failure(message);
      }
    }
    /**
     * Get token by ID
     *
     * @param id - Token ID
     * @returns Token or undefined
     */
    get(id) {
      return this.tokens.get(id);
    }
    /**
     * Get token by qualified name within a project
     *
     * @param projectId - Project identifier
     * @param qualifiedName - Dot-separated path (e.g., 'color.semantic.button.primary')
     * @returns Token or undefined
     */
    getByQualifiedName(projectId, qualifiedName) {
      const key = `${projectId}:${qualifiedName}`;
      const id = this.pathIndex.get(key);
      return id ? this.tokens.get(id) : void 0;
    }
    /**
     * Get token by path within a project
     *
     * @param projectId - Project identifier
     * @param path - Token path array
     * @returns Token or undefined
     */
    getByPath(projectId, path) {
      const qualifiedName = path.join(".");
      return this.getByQualifiedName(projectId, qualifiedName);
    }
    /**
     * Get all tokens for a project
     *
     * @param projectId - Project identifier
     * @returns Array of tokens
     */
    getByProject(projectId) {
      const tokenIds = this.projectIndex.get(projectId);
      if (!tokenIds) return [];
      return Array.from(tokenIds).map((id) => this.tokens.get(id)).filter((token) => token !== void 0);
    }
    /**
     * Get tokens by type
     *
     * @param type - Token type
     * @returns Array of tokens
     */
    getByType(type) {
      const tokenIds = this.typeIndex.get(type);
      if (!tokenIds) return [];
      return Array.from(tokenIds).map((id) => this.tokens.get(id)).filter((token) => token !== void 0);
    }
    /**
     * Get all tokens in the repository
     * Convenience method for query({})
     *
     * @returns Array of all tokens
     */
    getAll() {
      return Array.from(this.tokens.values());
    }
    /**
     * Query tokens with filters
     * Supports multiple filter criteria
     *
     * @param query - Query filters
     * @returns Array of matching tokens
     */
    query(query) {
      let results = [];
      if (query.ids && query.ids.length > 0) {
        results = query.ids.map((id) => this.tokens.get(id)).filter((token) => token !== void 0);
      } else if (query.projectId) {
        results = this.getByProject(query.projectId);
      } else if (query.type) {
        results = this.getByType(query.type);
      } else {
        results = Array.from(this.tokens.values());
      }
      if (query.type && query.projectId) {
        results = results.filter((t) => t.type === query.type);
      }
      if (query.types && query.types.length > 0) {
        results = results.filter((t) => query.types.includes(t.type));
      }
      if (query.collection) {
        results = results.filter((t) => t.collection === query.collection);
      }
      if (query.theme) {
        results = results.filter((t) => t.theme === query.theme);
      }
      if (query.brand) {
        results = results.filter((t) => t.brand === query.brand);
      }
      if (query.qualifiedName) {
        results = results.filter((t) => t.qualifiedName === query.qualifiedName);
      }
      if (query.pathPrefix && query.pathPrefix.length > 0) {
        results = results.filter((t) => {
          if (t.path.length < query.pathPrefix.length) return false;
          return query.pathPrefix.every((segment, i) => t.path[i] === segment);
        });
      }
      if (query.tags && query.tags.length > 0) {
        results = results.filter(
          (t) => query.tags.some((tag) => t.tags.includes(tag))
        );
      }
      if (query.status) {
        results = results.filter((t) => t.status === query.status);
      }
      if (query.isAlias !== void 0) {
        results = results.filter(
          (t) => query.isAlias ? t.aliasTo !== void 0 : t.aliasTo === void 0
        );
      }
      return results;
    }
    /**
     * Update a token
     *
     * @param id - Token ID
     * @param updates - Partial token data to update
     * @returns Updated token or failure
     */
    update(id, updates) {
      const token = this.tokens.get(id);
      if (!token) {
        return Failure(`Token not found: ${id}`);
      }
      this.removeFromIndexes(id);
      const updated = __spreadProps(__spreadValues(__spreadValues({}, token), updates), {
        id: token.id,
        // Preserve ID
        created: token.created,
        // Preserve creation timestamp
        lastModified: (/* @__PURE__ */ new Date()).toISOString()
      });
      this.tokens.set(id, updated);
      this.addToIndexes(updated);
      return Success(updated);
    }
    /**
     * Remove tokens by IDs
     *
     * @param ids - Array of token IDs to remove
     * @returns Success with removed count
     */
    remove(ids) {
      try {
        let removed = 0;
        for (const id of ids) {
          if (this.tokens.has(id)) {
            this.removeFromIndexes(id);
            this.tokens.delete(id);
            removed++;
          }
        }
        return Success(removed);
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
        return Failure(message);
      }
    }
    /**
     * Remove all tokens for a project
     *
     * @param projectId - Project identifier
     * @returns Success with removed count
     */
    removeProject(projectId) {
      const tokenIds = this.projectIndex.get(projectId);
      if (!tokenIds) {
        return Success(0);
      }
      return this.remove(Array.from(tokenIds));
    }
    /**
     * Get tokens that reference a specific token (inverse lookup)
     *
     * @param targetId - Token ID that is being referenced
     * @returns Array of tokens that alias to this token
     */
    getReferencingTokens(targetId) {
      const referrerIds = this.aliasIndex.get(targetId);
      if (!referrerIds) return [];
      return Array.from(referrerIds).map((id) => this.tokens.get(id)).filter((token) => token !== void 0);
    }
    /**
     * Get repository statistics
     *
     * @returns Repository stats
     */
    getStats() {
      const stats = {
        totalTokens: this.tokens.size,
        byProject: {},
        byType: {},
        byCollection: {},
        aliasCount: 0,
        circularReferenceCount: 0
      };
      for (const [projectId, tokenIds] of this.projectIndex) {
        stats.byProject[projectId] = tokenIds.size;
      }
      for (const [type, tokenIds] of this.typeIndex) {
        stats.byType[type] = tokenIds.size;
      }
      for (const [collection, tokenIds] of this.collectionIndex) {
        stats.byCollection[collection] = tokenIds.size;
      }
      stats.aliasCount = Array.from(this.tokens.values()).filter((t) => t.aliasTo).length;
      return stats;
    }
    /**
     * Clear all tokens (useful for testing)
     */
    clear() {
      this.tokens.clear();
      this.projectIndex.clear();
      this.typeIndex.clear();
      this.collectionIndex.clear();
      this.pathIndex.clear();
      this.aliasIndex.clear();
      this.tagIndex.clear();
    }
    /**
     * Get total token count
     */
    count() {
      return this.tokens.size;
    }
    // ==================== PRIVATE METHODS ====================
    /**
     * Add token to all indexes
     */
    addToIndexes(token) {
      if (!this.projectIndex.has(token.projectId)) {
        this.projectIndex.set(token.projectId, /* @__PURE__ */ new Set());
      }
      this.projectIndex.get(token.projectId).add(token.id);
      if (!this.typeIndex.has(token.type)) {
        this.typeIndex.set(token.type, /* @__PURE__ */ new Set());
      }
      this.typeIndex.get(token.type).add(token.id);
      if (!this.collectionIndex.has(token.collection)) {
        this.collectionIndex.set(token.collection, /* @__PURE__ */ new Set());
      }
      this.collectionIndex.get(token.collection).add(token.id);
      const pathKey = `${token.projectId}:${token.qualifiedName}`;
      this.pathIndex.set(pathKey, token.id);
      if (token.aliasTo) {
        if (!this.aliasIndex.has(token.aliasTo)) {
          this.aliasIndex.set(token.aliasTo, /* @__PURE__ */ new Set());
        }
        this.aliasIndex.get(token.aliasTo).add(token.id);
      }
      for (const tag of token.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, /* @__PURE__ */ new Set());
        }
        this.tagIndex.get(tag).add(token.id);
      }
    }
    /**
     * Remove token from all indexes
     */
    removeFromIndexes(id) {
      var _a, _b, _c, _d, _e;
      const token = this.tokens.get(id);
      if (!token) return;
      (_a = this.projectIndex.get(token.projectId)) == null ? void 0 : _a.delete(id);
      (_b = this.typeIndex.get(token.type)) == null ? void 0 : _b.delete(id);
      (_c = this.collectionIndex.get(token.collection)) == null ? void 0 : _c.delete(id);
      const pathKey = `${token.projectId}:${token.qualifiedName}`;
      this.pathIndex.delete(pathKey);
      if (token.aliasTo) {
        (_d = this.aliasIndex.get(token.aliasTo)) == null ? void 0 : _d.delete(id);
      }
      for (const tag of token.tags) {
        (_e = this.tagIndex.get(tag)) == null ? void 0 : _e.delete(id);
      }
    }
  };

  // src/core/services/TokenResolver.ts
  var TokenResolver = class {
    constructor(repository) {
      // Three-tier cache
      this.exactCache = /* @__PURE__ */ new Map();
      this.normalizedCache = /* @__PURE__ */ new Map();
      this.fuzzyCache = /* @__PURE__ */ new Map();
      // Statistics
      this.stats = {
        totalResolutions: 0,
        cacheHits: 0,
        cacheMisses: 0,
        cacheHitRate: 0,
        circularReferences: 0,
        unresolvedReferences: 0
      };
      this.repository = repository;
    }
    /**
     * Resolve a single token reference to its target token
     *
     * @param reference - Reference string (e.g., "color.primary", "{color.primary}")
     * @param projectId - Project context for resolution
     * @returns Resolved token or null
     */
    resolveReference(reference, projectId) {
      this.stats.totalResolutions++;
      const cleanRef = this.cleanReference(reference);
      if (!cleanRef) {
        return null;
      }
      const exactKey = `${projectId}:${cleanRef}`;
      if (this.exactCache.has(exactKey)) {
        this.stats.cacheHits++;
        this.updateCacheHitRate();
        return this.exactCache.get(exactKey);
      }
      const exactMatch = this.repository.getByQualifiedName(projectId, cleanRef);
      if (exactMatch) {
        this.exactCache.set(exactKey, exactMatch);
        this.stats.cacheMisses++;
        this.updateCacheHitRate();
        return exactMatch;
      }
      const normalized = this.normalizeReference(cleanRef);
      const normalizedKey = `${projectId}:${normalized}`;
      if (this.normalizedCache.has(normalizedKey)) {
        this.stats.cacheHits++;
        this.updateCacheHitRate();
        return this.normalizedCache.get(normalizedKey);
      }
      const normalizedMatch = this.repository.getByQualifiedName(projectId, normalized);
      if (normalizedMatch) {
        this.normalizedCache.set(normalizedKey, normalizedMatch);
        this.exactCache.set(exactKey, normalizedMatch);
        this.stats.cacheMisses++;
        this.updateCacheHitRate();
        return normalizedMatch;
      }
      if (this.fuzzyCache.has(exactKey)) {
        this.stats.cacheHits++;
        this.updateCacheHitRate();
        return this.fuzzyCache.get(exactKey);
      }
      const fuzzyMatch = this.fuzzyMatch(cleanRef, projectId);
      this.fuzzyCache.set(exactKey, fuzzyMatch);
      if (fuzzyMatch) {
        this.exactCache.set(exactKey, fuzzyMatch);
      } else {
        this.stats.unresolvedReferences++;
      }
      this.stats.cacheMisses++;
      this.updateCacheHitRate();
      return fuzzyMatch;
    }
    /**
     * Resolve all tokens in a project, handling aliases in dependency order
     * Uses topological sort to resolve dependencies correctly
     *
     * @param projectId - Project identifier
     * @returns Map of token ID to resolved value
     */
    async resolveAllTokens(projectId) {
      try {
        const tokens = this.repository.getByProject(projectId);
        const resolved = /* @__PURE__ */ new Map();
        const graph = this.buildDependencyGraph(tokens, projectId);
        const cycles = this.detectCycles(graph);
        if (cycles.length > 0) {
          this.stats.circularReferences += cycles.length;
          console.warn(`[TokenResolver] Detected ${cycles.length} circular references in project ${projectId}`);
        }
        const sorted = this.topologicalSort(graph, cycles);
        for (const tokenId of sorted) {
          const token = this.repository.get(tokenId);
          if (!token) continue;
          if (token.aliasTo) {
            const target = this.repository.get(token.aliasTo);
            if (target && target.projectId === projectId) {
              const targetValue = resolved.get(target.id) || target.value;
              resolved.set(token.id, targetValue);
              token.resolvedValue = targetValue;
            } else if (target && target.projectId !== projectId) {
              console.warn(
                `[TokenResolver] Cross-project reference detected: ${token.qualifiedName} (project: ${projectId}) references ${target.qualifiedName} (project: ${target.projectId})`
              );
              resolved.set(token.id, token.value);
              this.stats.unresolvedReferences++;
            } else {
              console.warn(
                `[TokenResolver] Unresolved reference: ${token.qualifiedName} references ${token.aliasTo}`
              );
              resolved.set(token.id, token.value);
              this.stats.unresolvedReferences++;
            }
          } else {
            resolved.set(token.id, token.value);
          }
        }
        return Success(resolved);
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
        console.error(`[TokenResolver] Failed to resolve all tokens: ${message}`);
        return Failure(message);
      }
    }
    /**
     * Detect circular references in a project
     *
     * @param projectId - Project identifier
     * @returns Array of circular reference cycles
     */
    detectCircularReferences(projectId) {
      const tokens = this.repository.getByProject(projectId);
      const graph = this.buildDependencyGraph(tokens, projectId);
      return this.detectCycles(graph);
    }
    /**
     * Detect cross-project references
     * Returns tokens that reference tokens in other projects
     *
     * @param projectId - Project identifier
     * @returns Array of tokens with cross-project references
     */
    detectCrossProjectReferences(projectId) {
      const tokens = this.repository.getByProject(projectId);
      const crossProjectRefs = [];
      for (const token of tokens) {
        if (token.aliasTo) {
          const target = this.repository.get(token.aliasTo);
          if (target && target.projectId !== projectId) {
            crossProjectRefs.push(token);
          }
        }
      }
      return crossProjectRefs;
    }
    /**
     * Clear all caches
     * Useful after token updates
     */
    clearCache() {
      this.exactCache.clear();
      this.normalizedCache.clear();
      this.fuzzyCache.clear();
    }
    /**
     * Get resolution statistics
     */
    getStats() {
      return __spreadValues({}, this.stats);
    }
    /**
     * Reset statistics
     */
    resetStats() {
      this.stats = {
        totalResolutions: 0,
        cacheHits: 0,
        cacheMisses: 0,
        cacheHitRate: 0,
        circularReferences: 0,
        unresolvedReferences: 0
      };
    }
    // ==================== PRIVATE METHODS ====================
    /**
     * Clean reference string (remove braces, trim)
     */
    cleanReference(reference) {
      if (!reference || typeof reference !== "string") {
        return null;
      }
      let cleaned = reference.trim();
      if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      return cleaned || null;
    }
    /**
     * Normalize reference (convert slashes to dots, lowercase)
     */
    normalizeReference(reference) {
      return reference.replace(/\//g, ".").replace(/\\/g, ".").toLowerCase();
    }
    /**
     * Fuzzy match reference to tokens
     * Expensive operation, only used as fallback
     */
    fuzzyMatch(reference, projectId) {
      const tokens = this.repository.getByProject(projectId);
      const refLower = reference.toLowerCase();
      for (const token of tokens) {
        if (token.qualifiedName.toLowerCase().endsWith(refLower)) {
          return token;
        }
      }
      for (const token of tokens) {
        if (token.qualifiedName.toLowerCase().includes(refLower)) {
          return token;
        }
      }
      const refName = refLower.split(".").pop() || "";
      for (const token of tokens) {
        if (token.name.toLowerCase() === refName) {
          return token;
        }
      }
      return null;
    }
    /**
     * Build dependency graph for alias resolution
     * Returns Map<tokenId, dependsOn[]>
     * Validates that all dependencies are within the same project
     *
     * @param tokens - Tokens to build graph from
     * @param projectId - Project identifier for validation
     */
    buildDependencyGraph(tokens, projectId) {
      const graph = /* @__PURE__ */ new Map();
      for (const token of tokens) {
        if (!graph.has(token.id)) {
          graph.set(token.id, []);
        }
        if (token.aliasTo) {
          const target = this.repository.get(token.aliasTo);
          if (target && target.projectId === projectId) {
            graph.get(token.id).push(token.aliasTo);
          } else if (target && target.projectId !== projectId) {
            console.warn(
              `[TokenResolver] buildDependencyGraph: Cross-project reference from ${token.qualifiedName} to ${target.qualifiedName} (different project: ${target.projectId})`
            );
          } else {
            console.warn(
              `[TokenResolver] buildDependencyGraph: Target not found for ${token.qualifiedName} (aliasTo: ${token.aliasTo})`
            );
          }
        }
      }
      return graph;
    }
    /**
     * Detect cycles in dependency graph using DFS
     */
    detectCycles(graph) {
      const cycles = [];
      const visited = /* @__PURE__ */ new Set();
      const recursionStack = /* @__PURE__ */ new Set();
      const path = [];
      const dfs = (nodeId) => {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);
        const dependencies = graph.get(nodeId) || [];
        for (const depId of dependencies) {
          if (!visited.has(depId)) {
            if (dfs(depId)) return true;
          } else if (recursionStack.has(depId)) {
            const cycleStart = path.indexOf(depId);
            const cycle = path.slice(cycleStart);
            const paths = cycle.map((id) => {
              var _a;
              return ((_a = this.repository.get(id)) == null ? void 0 : _a.path) || [];
            });
            cycles.push({ cycle, paths });
            return true;
          }
        }
        path.pop();
        recursionStack.delete(nodeId);
        return false;
      };
      for (const nodeId of graph.keys()) {
        if (!visited.has(nodeId)) {
          dfs(nodeId);
        }
      }
      return cycles;
    }
    /**
     * Topological sort for dependency-order resolution
     * Breaks cycles if detected
     */
    topologicalSort(graph, cycles) {
      const sorted = [];
      const visited = /* @__PURE__ */ new Set();
      const cycleNodes = new Set(cycles.flatMap((c) => c.cycle));
      const visit = (nodeId) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        const dependencies = graph.get(nodeId) || [];
        for (const depId of dependencies) {
          if (!cycleNodes.has(depId) || !cycleNodes.has(nodeId)) {
            visit(depId);
          }
        }
        sorted.push(nodeId);
      };
      for (const nodeId of graph.keys()) {
        visit(nodeId);
      }
      return sorted;
    }
    /**
     * Update cache hit rate statistic
     */
    updateCacheHitRate() {
      const total = this.stats.cacheHits + this.stats.cacheMisses;
      this.stats.cacheHitRate = total > 0 ? this.stats.cacheHits / total : 0;
    }
  };

  // src/core/services/FigmaSyncService.ts
  var FigmaSyncService = class {
    constructor(repository, resolver) {
      this.variableMap = /* @__PURE__ */ new Map();
      this.collectionMap = /* @__PURE__ */ new Map();
      this.repository = repository;
      this.resolver = resolver;
    }
    /**
     * Sync tokens to Figma variables
     * Replaces VariableManager.importTokens()
     *
     * @param tokens - Array of tokens to sync
     * @param options - Sync options
     * @returns Sync result with statistics
     */
    async syncTokens(tokens, options) {
      try {
        const opts = __spreadValues({
          updateExisting: true,
          preserveScopes: true,
          createStyles: true,
          percentageBase: 16
        }, options);
        const stats = { added: 0, updated: 0, skipped: 0 };
        const syncedCollections = /* @__PURE__ */ new Set();
        const byCollection = this.groupByCollection(tokens);
        const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
        for (const [collectionName, collectionTokens] of byCollection) {
          console.log(`[FigmaSyncService] Processing collection: ${collectionName} (${collectionTokens.length} tokens)`);
          const collection = this.getOrCreateCollection(existingCollections, collectionName);
          this.collectionMap.set(collectionName, collection);
          syncedCollections.add(collectionName);
          const collectionStats = await this.syncCollectionTokens(
            collectionTokens,
            collection,
            opts
          );
          stats.added += collectionStats.added;
          stats.updated += collectionStats.updated;
          stats.skipped += collectionStats.skipped;
        }
        await this.updateTokenExtensions(tokens);
        figma.notify(
          `\u2713 Tokens synced: ${stats.added} added, ${stats.updated} updated`,
          { timeout: 3e3 }
        );
        return Success({
          stats,
          collections: Array.from(syncedCollections),
          variables: this.variableMap
        });
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
        console.error(`[FigmaSyncService] Sync failed: ${message}`);
        return Failure(message);
      }
    }
    /**
     * Get variable map for reference resolution
     * Used by features that need access to Figma variables
     */
    getVariableMap() {
      return this.variableMap;
    }
    /**
     * Get collection map
     */
    getCollectionMap() {
      return this.collectionMap;
    }
    // ==================== PRIVATE METHODS ====================
    /**
     * Group tokens by collection name
     */
    groupByCollection(tokens) {
      const grouped = /* @__PURE__ */ new Map();
      for (const token of tokens) {
        const collection = token.collection || "default";
        if (!grouped.has(collection)) {
          grouped.set(collection, []);
        }
        grouped.get(collection).push(token);
      }
      return grouped;
    }
    /**
     * Get or create Figma variable collection
     * Handles renaming old uppercase collections to lowercase
     */
    getOrCreateCollection(existingCollections, name) {
      let collection = existingCollections.find((c) => c.name === name);
      if (!collection) {
        const uppercaseName = name.charAt(0).toUpperCase() + name.slice(1);
        const oldCollection = existingCollections.find((c) => c.name === uppercaseName);
        if (oldCollection) {
          console.log(`[FigmaSyncService] Renaming collection: ${uppercaseName} \u2192 ${name}`);
          oldCollection.name = name;
          collection = oldCollection;
        } else {
          console.log(`[FigmaSyncService] Creating collection: ${name}`);
          collection = figma.variables.createVariableCollection(name);
        }
      }
      return collection;
    }
    /**
     * Sync all tokens in a collection
     */
    async syncCollectionTokens(tokens, collection, options) {
      const stats = { added: 0, updated: 0, skipped: 0 };
      const existingVars = await this.getCollectionVariables(collection);
      const varsByName = new Map(existingVars.map((v) => [v.name, v]));
      for (const token of tokens) {
        if (options.createStyles && this.isStyleToken(token)) {
          const styleStats = await this.syncAsStyle(token, options);
          stats.added += styleStats.added;
          stats.updated += styleStats.updated;
          stats.skipped += styleStats.skipped;
          continue;
        }
        const tokenStats = await this.syncToken(token, collection, varsByName, options);
        stats.added += tokenStats.added;
        stats.updated += tokenStats.updated;
        stats.skipped += tokenStats.skipped;
      }
      return stats;
    }
    /**
     * Sync a single token to Figma variable
     */
    async syncToken(token, collection, existingVars, options) {
      const stats = { added: 0, updated: 0, skipped: 0 };
      try {
        const variableName = this.generateVariableName(token);
        const figmaType = this.mapToFigmaType(token.type);
        if (!figmaType) {
          console.warn(`[FigmaSyncService] Unsupported token type: ${token.type}`);
          stats.skipped++;
          return stats;
        }
        let variable = existingVars.get(variableName);
        if (!variable) {
          variable = figma.variables.createVariable(variableName, collection, figmaType);
          stats.added++;
        } else {
          if (!options.updateExisting) {
            stats.skipped++;
            return stats;
          }
          if (variable.resolvedType !== figmaType) {
            console.warn(`[FigmaSyncService] Type mismatch for ${variableName}: ${variable.resolvedType} \u2192 ${figmaType}`);
            variable = figma.variables.createVariable(`${variableName}_new`, collection, figmaType);
            stats.added++;
          } else {
            stats.updated++;
          }
        }
        if (token.description) {
          variable.description = token.description;
        }
        const modeId = collection.modes[0].modeId;
        if (token.aliasTo) {
          const targetToken = this.repository.get(token.aliasTo);
          if (targetToken) {
            const targetVarName = this.generateVariableName(targetToken);
            const targetVar = this.variableMap.get(targetVarName);
            if (targetVar) {
              variable.setValueForMode(modeId, {
                type: "VARIABLE_ALIAS",
                id: targetVar.id
              });
            } else {
              console.warn(`[FigmaSyncService] Alias target not found: ${targetVarName}`);
              const value = this.convertValue(token.resolvedValue || token.value, figmaType);
              variable.setValueForMode(modeId, value);
            }
          } else {
            console.warn(`[FigmaSyncService] Alias target token not found: ${token.aliasTo}`);
            const value = this.convertValue(token.resolvedValue || token.value, figmaType);
            variable.setValueForMode(modeId, value);
          }
        } else {
          const valueToConvert = token.resolvedValue || token.value;
          console.log(`[FigmaSyncService] Setting value for ${variableName}:`, {
            tokenValue: token.value,
            resolvedValue: token.resolvedValue,
            tokenType: token.type,
            figmaType,
            valueType: typeof valueToConvert
          });
          const value = this.convertValue(valueToConvert, figmaType);
          console.log(`[FigmaSyncService] Converted value for ${variableName}:`, value);
          variable.setValueForMode(modeId, value);
        }
        this.setCodeSyntax(variable, token);
        this.variableMap.set(variableName, variable);
        return stats;
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
        console.error(`[FigmaSyncService] Failed to sync token ${token.qualifiedName}: ${message}`);
        stats.skipped++;
        return stats;
      }
    }
    /**
     * Get all variables in a collection
     */
    async getCollectionVariables(collection) {
      const allVars = await figma.variables.getLocalVariablesAsync();
      return allVars.filter((v) => v.variableCollectionId === collection.id);
    }
    /**
     * Generate Figma-compatible variable name from token
     * Format: path/components/separated
     */
    generateVariableName(token) {
      return token.path.map((segment) => segment.replace(/[^a-zA-Z0-9-_]/g, "-")).join("/");
    }
    /**
     * Map TokenType to Figma VariableResolvedDataType
     */
    mapToFigmaType(type) {
      const typeMap = {
        color: "COLOR",
        number: "FLOAT",
        boolean: "BOOLEAN",
        string: "STRING",
        // Dimension types
        dimension: "FLOAT",
        fontSize: "FLOAT",
        spacing: "FLOAT",
        lineHeight: "FLOAT",
        letterSpacing: "FLOAT",
        fontWeight: "FLOAT"
      };
      return typeMap[type] || null;
    }
    /**
     * Convert token value to Figma-compatible format
     */
    convertValue(value, figmaType) {
      if (figmaType === "COLOR") {
        return this.convertColorValue(value);
      }
      if (figmaType === "FLOAT") {
        return this.convertNumericValue(value);
      }
      if (figmaType === "BOOLEAN") {
        return Boolean(value);
      }
      if (figmaType === "STRING") {
        return String(value);
      }
      return value;
    }
    /**
     * Convert color value to Figma RGB format
     * Handles: hex strings, RGB objects, HSL objects (uses hex), color objects with components
     * Note: Figma COLOR type only accepts RGB (r, g, b), not RGBA with 'a' property
     */
    convertColorValue(value) {
      if (typeof value === "string") {
        if (value.startsWith("#")) {
          return this.hexToRgb(value);
        }
        if (value.startsWith("rgb")) {
          return this.parseRgbString(value);
        }
      }
      if (typeof value === "object" && value !== null) {
        if ("r" in value && "g" in value && "b" in value) {
          const isNormalized = value.r <= 1 && value.g <= 1 && value.b <= 1;
          if (isNormalized) {
            return { r: value.r, g: value.g, b: value.b };
          }
          return {
            r: value.r / 255,
            g: value.g / 255,
            b: value.b / 255
          };
        }
        if ("colorSpace" in value && value.colorSpace === "hsl" && "hex" in value && value.hex) {
          console.log("[FigmaSyncService] Converting HSL color using hex fallback:", value.hex);
          return this.hexToRgb(value.hex);
        }
        if ("colorSpace" in value && value.colorSpace === "rgb" && Array.isArray(value.components)) {
          const [r, g, b] = value.components;
          return {
            r: r / 255,
            g: g / 255,
            b: b / 255
          };
        }
        if ("components" in value && Array.isArray(value.components) && !("colorSpace" in value)) {
          const [r, g, b] = value.components;
          return {
            r: r / 255,
            g: g / 255,
            b: b / 255
          };
        }
      }
      console.warn(`[FigmaSyncService] Could not convert color value:`, value);
      console.warn(`[FigmaSyncService] Value type: ${typeof value}, stringified:`, JSON.stringify(value));
      return { r: 0, g: 0, b: 0 };
    }
    /**
     * Convert color value to Figma RGBA format (for shadows and effects)
     * Similar to convertColorValue but includes alpha channel
     */
    convertColorToRGBA(value) {
      const rgb = this.convertColorValue(value);
      let alpha = 1;
      if (typeof value === "object" && value !== null) {
        if ("a" in value && typeof value.a === "number") {
          alpha = value.a;
        } else if ("alpha" in value && typeof value.alpha === "number") {
          alpha = value.alpha;
        }
      }
      if (typeof value === "string" && value.startsWith("rgba")) {
        const match = value.match(/rgba?\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
        if (match) {
          alpha = parseFloat(match[1]);
        }
      }
      return __spreadProps(__spreadValues({}, rgb), { a: alpha });
    }
    /**
     * Parse rgb() or rgba() string to RGB
     * Note: Alpha channel is ignored - Figma COLOR type only accepts RGB
     */
    parseRgbString(rgbString) {
      const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        return {
          r: parseInt(match[1]) / 255,
          g: parseInt(match[2]) / 255,
          b: parseInt(match[3]) / 255
        };
      }
      return { r: 0, g: 0, b: 0 };
    }
    /**
     * Convert hex color to RGB
     * Supports 3, 6, and 8 digit hex codes
     * Note: Alpha channel (8-digit hex) is ignored - Figma COLOR type only accepts RGB
     */
    hexToRgb(hex3) {
      const cleanHex = hex3.replace(/^#/, "");
      if (cleanHex.length === 3) {
        const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
        const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
        const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
        return { r, g, b };
      }
      if (cleanHex.length === 6) {
        const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
        const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
        const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
        return { r, g, b };
      }
      if (cleanHex.length === 8) {
        const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
        const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
        const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
        return { r, g, b };
      }
      console.warn(`[FigmaSyncService] Invalid hex format: ${hex3}`);
      return { r: 0, g: 0, b: 0 };
    }
    /**
     * Convert numeric value (handle units like px, rem, em, %)
     * Supports: numbers, strings with units, DimensionValue objects
     * Note: Converts rem/em to px using 16px base size (standard browser default)
     * Note: Converts percentage to px using percentageBase option (default 16px)
     */
    convertNumericValue(value, percentageBase = 16) {
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string") {
        const match = value.match(/^([\d.-]+)(px|rem|em|%)?$/);
        if (match) {
          const numericValue = parseFloat(match[1]);
          const unit = match[2] || "";
          if (unit === "rem" || unit === "em") {
            const converted = numericValue * 16;
            console.log(`[FigmaSyncService] Converted ${value} to ${converted}px`);
            return converted;
          }
          if (unit === "%") {
            const converted = numericValue / 100 * percentageBase;
            console.log(`[FigmaSyncService] Converted ${value} to ${converted}px (base: ${percentageBase}px)`);
            return converted;
          }
          return numericValue;
        }
        const numeric = parseFloat(value.replace(/[^\d.-]/g, ""));
        return isNaN(numeric) ? 0 : numeric;
      }
      if (typeof value === "object" && value !== null) {
        if ("value" in value && typeof value.value === "number") {
          const numericValue = value.value;
          const unit = value.unit || "";
          if (unit === "rem" || unit === "em") {
            const converted = numericValue * 16;
            console.log(`[FigmaSyncService] Converted ${numericValue}${unit} to ${converted}px`);
            return converted;
          }
          if (unit === "%") {
            const converted = numericValue / 100 * percentageBase;
            console.log(`[FigmaSyncService] Converted ${numericValue}${unit} to ${converted}px (base: ${percentageBase}px)`);
            return converted;
          }
          return numericValue;
        }
        if ("components" in value && Array.isArray(value.components) && value.components.length > 0) {
          const firstComponent = value.components[0];
          if (typeof firstComponent === "number") {
            return firstComponent;
          }
          if (typeof firstComponent === "string") {
            const numeric = parseFloat(firstComponent.replace(/[^\d.-]/g, ""));
            return isNaN(numeric) ? 0 : numeric;
          }
        }
      }
      console.warn("[FigmaSyncService] Could not convert value to number:", value);
      return 0;
    }
    /**
     * Convert line height value to Figma LineHeight format
     *
     * Line height can be:
     * - Unitless number (1.3, 1.5) → PERCENT (130%, 150% of font size)
     * - Pixel value ("24px") → PIXELS
     * - Rem/em value ("1.5rem") → PIXELS (converted)
     * - Percentage ("150%") → PERCENT
     *
     * Note: Unitless values are treated as multipliers (CSS standard)
     */
    convertLineHeight(value, percentageBase = 16) {
      if (typeof value === "number") {
        const percentValue = value * 100;
        return { value: percentValue, unit: "PERCENT" };
      }
      if (typeof value === "string") {
        const match = value.match(/^([\d.-]+)(px|rem|em|%)?$/);
        if (match) {
          const numericValue = parseFloat(match[1]);
          const unit = match[2] || "";
          if (!unit) {
            const percentValue = numericValue * 100;
            return { value: percentValue, unit: "PERCENT" };
          }
          if (unit === "%") {
            return { value: numericValue, unit: "PERCENT" };
          }
          if (unit === "px") {
            return { value: numericValue, unit: "PIXELS" };
          }
          if (unit === "rem" || unit === "em") {
            const pixelValue = numericValue * 16;
            return { value: pixelValue, unit: "PIXELS" };
          }
        }
      }
      if (typeof value === "object" && value !== null) {
        if ("value" in value && typeof value.value === "number") {
          const numericValue = value.value;
          const unit = value.unit || "";
          if (!unit) {
            const percentValue = numericValue * 100;
            return { value: percentValue, unit: "PERCENT" };
          }
          if (unit === "%") {
            return { value: numericValue, unit: "PERCENT" };
          }
          if (unit === "px") {
            return { value: numericValue, unit: "PIXELS" };
          }
          if (unit === "rem" || unit === "em") {
            const pixelValue = numericValue * 16;
            return { value: pixelValue, unit: "PIXELS" };
          }
        }
      }
      console.warn("[FigmaSyncService] Could not convert line height, using AUTO:", value);
      return { unit: "AUTO" };
    }
    /**
     * Set CSS variable code syntax using Figma's official API
     * Uses setVariableCodeSyntax() method for proper syntax setting
     */
    setCodeSyntax(variable, token) {
      try {
        const cssVarName = `--${token.path.join("-").toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
        console.log(`[FigmaSyncService] Setting code syntax for ${token.qualifiedName}: ${cssVarName}`);
        if (typeof variable.setVariableCodeSyntax === "function") {
          variable.setVariableCodeSyntax("WEB", cssVarName);
          const androidPath = token.path.join("_").toLowerCase().replace(/[^a-z0-9_]/g, "_");
          variable.setVariableCodeSyntax("ANDROID", `@dimen/${androidPath}`);
          variable.setVariableCodeSyntax("iOS", token.path.join("."));
          console.log(`[FigmaSyncService] Code syntax set successfully for ${token.qualifiedName}`);
        } else {
          console.warn(`[FigmaSyncService] setVariableCodeSyntax method not available (old Figma version?)`);
        }
      } catch (error46) {
        console.error(`[FigmaSyncService] Failed to set code syntax for ${token.qualifiedName}:`, error46);
      }
    }
    /**
     * Check if token should be handled as a Figma style (not variable)
     *
     * Typography tokens become Text Styles
     * Shadow tokens become Effect Styles
     */
    isStyleToken(token) {
      if (token.type === "typography") {
        const value = token.resolvedValue || token.value;
        if (typeof value === "object" && value !== null) {
          const hasTypographyProps = "fontFamily" in value || "fontSize" in value || "fontWeight" in value || "lineHeight" in value || "letterSpacing" in value;
          return hasTypographyProps;
        }
      }
      if (token.type === "shadow") {
        const value = token.resolvedValue || token.value;
        if (typeof value === "object" && value !== null) {
          const hasShadowProps = "offsetX" in value || "offsetY" in value || "blur" in value || "color" in value;
          return hasShadowProps;
        }
      }
      return false;
    }
    /**
     * Sync token as Figma style (text style or effect style)
     */
    async syncAsStyle(token, options) {
      if (token.type === "typography") {
        return this.createTextStyle(token, options);
      }
      if (token.type === "shadow") {
        return this.createEffectStyle(token, options);
      }
      return { added: 0, updated: 0, skipped: 1 };
    }
    /**
     * Resolve nested references in a composite value
     * Example: { fontFamily: "{primitive.typography.font-family.primary}" }
     * Becomes: { fontFamily: "Inter" }
     */
    resolveNestedReferences(value, projectId) {
      if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
        const referencedToken = this.resolver.resolveReference(value, projectId);
        if (referencedToken) {
          const resolvedValue = referencedToken.resolvedValue || referencedToken.value;
          return this.resolveNestedReferences(resolvedValue, projectId);
        } else {
          this.logUnresolvedReference(value, projectId);
          return value;
        }
      }
      if (typeof value === "object" && value !== null) {
        const resolved = Array.isArray(value) ? [] : {};
        for (const key in value) {
          resolved[key] = this.resolveNestedReferences(value[key], projectId);
        }
        return resolved;
      }
      return value;
    }
    /**
     * Find all unresolved references in a value (recursive)
     */
    findUnresolvedReferences(obj, path = "") {
      const unresolvedRefs = [];
      if (typeof obj === "string" && obj.startsWith("{") && obj.endsWith("}")) {
        unresolvedRefs.push(`${path}: ${obj}`);
      } else if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
        for (const [key, val] of Object.entries(obj)) {
          const refs = this.findUnresolvedReferences(val, path ? `${path}.${key}` : key);
          unresolvedRefs.push(...refs);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const refs = this.findUnresolvedReferences(item, `${path}[${index}]`);
          unresolvedRefs.push(...refs);
        });
      }
      return unresolvedRefs;
    }
    /**
     * Log detailed diagnostics for an unresolved reference
     */
    logUnresolvedReference(reference, projectId) {
      const cleanRef = reference.slice(1, -1);
      const projectTokens = this.repository.getByProject(projectId);
      const allTokens = this.repository.getAll();
      const exactMatches = allTokens.filter((t) => t.qualifiedName === cleanRef);
      const partialMatches = allTokens.filter(
        (t) => !exactMatches.includes(t) && (t.qualifiedName.includes(cleanRef) || cleanRef.includes(t.qualifiedName) || t.qualifiedName.toLowerCase() === cleanRef.toLowerCase())
      );
      console.group(`\u274C UNRESOLVED: ${reference}`);
      console.log(`\u{1F50D} Searching in project: "${projectId}" (${projectTokens.length} tokens)`);
      console.log(`\u{1F3AF} Looking for: "${cleanRef}"`);
      if (exactMatches.length > 0) {
        console.group(`\u26A0\uFE0F  PROJECT MISMATCH - Token found in different project(s):`);
        exactMatches.forEach((t) => {
          console.log(`\u{1F4CD} "${t.qualifiedName}"`);
          console.log(`   Project: "${t.projectId}" (expected: "${projectId}")`);
          console.log(`   Collection: ${t.collection}`);
          console.log(`   Type: ${t.type}`);
          console.log(`   Value: ${JSON.stringify(t.resolvedValue || t.value)}`);
        });
        console.log(`
\u{1F4A1} FIX: Ensure all tokens are in the same project ID`);
        console.groupEnd();
      } else if (partialMatches.length > 0) {
        console.group(`\u26A0\uFE0F  NAMING ISSUE - Found ${partialMatches.length} similar token(s):`);
        partialMatches.slice(0, 5).forEach((t) => {
          console.log(`\u{1F4CD} "${t.qualifiedName}" (project: ${t.projectId})`);
        });
        console.log(`
\u{1F4A1} FIX: Check reference name for typos`);
        console.groupEnd();
      } else {
        console.group(`\u274C TOKEN NOT FOUND - Token doesn't exist in any project`);
        console.log(`\u{1F4CB} Sample tokens in project "${projectId}":`);
        projectTokens.slice(0, 8).forEach((t) => {
          console.log(`   - ${t.qualifiedName} (${t.type})`);
        });
        if (projectTokens.length > 8) {
          console.log(`   ... and ${projectTokens.length - 8} more`);
        }
        console.log(`
\u{1F4A1} FIX: Add the missing token to your token files`);
        console.groupEnd();
      }
      console.groupEnd();
    }
    /**
     * Create or update Figma Text Style from typography token
     */
    async createTextStyle(token, options) {
      const stats = { added: 0, updated: 0, skipped: 0 };
      try {
        const value = token.resolvedValue || token.value;
        if (typeof value !== "object" || value === null) {
          console.warn(`[FigmaSyncService] Typography token ${token.qualifiedName} has invalid value type`);
          stats.skipped++;
          return stats;
        }
        const resolvedValue = this.resolveNestedReferences(value, token.projectId);
        const typValue = resolvedValue;
        const unresolvedRefs = this.findUnresolvedReferences(resolvedValue);
        if (unresolvedRefs.length > 0) {
          console.group(`\u26A0\uFE0F  TYPOGRAPHY: ${token.qualifiedName}`);
          console.log(`\u274C ${unresolvedRefs.length} unresolved reference(s) - will use Figma defaults (12px, AUTO)`);
          unresolvedRefs.forEach((ref) => console.log(`   ${ref}`));
          console.log(`\u{1F4CB} Project: "${token.projectId}" | Collection: "${token.collection}"`);
          console.log(`\u{1F4A1} See individual reference errors above for details`);
          console.groupEnd();
        }
        const styleName = token.path.join("/");
        const existingStyles = await figma.getLocalTextStylesAsync();
        let textStyle = existingStyles.find((s) => s.name === styleName);
        if (!textStyle) {
          textStyle = figma.createTextStyle();
          textStyle.name = styleName;
          stats.added++;
        } else {
          if (!options.updateExisting) {
            stats.skipped++;
            return stats;
          }
          stats.updated++;
        }
        if (token.description) {
          textStyle.description = token.description;
        }
        if (typValue.fontFamily) {
          try {
            let fontFamily;
            if (typeof typValue.fontFamily === "string") {
              if (typValue.fontFamily.includes(",")) {
                const fontStack = typValue.fontFamily.split(",").map((f) => f.trim());
                fontFamily = fontStack[0];
              } else {
                fontFamily = typValue.fontFamily;
              }
            } else if (Array.isArray(typValue.fontFamily)) {
              fontFamily = typValue.fontFamily[0];
            } else {
              throw new Error(`Invalid fontFamily type: ${typeof typValue.fontFamily}`);
            }
            const fontWeight = typValue.fontWeight || 400;
            if (typeof fontWeight === "string" && fontWeight.startsWith("{")) {
              console.warn(`\u26A0\uFE0F  Unresolved font weight "${fontWeight}" - using Regular`);
              await figma.loadFontAsync({ family: fontFamily, style: "Regular" });
              textStyle.fontName = { family: fontFamily, style: "Regular" };
            } else {
              const numericWeight = typeof fontWeight === "string" ? parseInt(fontWeight, 10) : fontWeight;
              const fontStyle = this.mapFontWeightToStyle(numericWeight);
              try {
                await figma.loadFontAsync({ family: fontFamily, style: fontStyle });
                textStyle.fontName = { family: fontFamily, style: fontStyle };
              } catch (fontLoadError) {
                console.warn(`\u26A0\uFE0F  "${fontFamily}" "${fontStyle}" not available - using Regular`);
                try {
                  await figma.loadFontAsync({ family: fontFamily, style: "Regular" });
                  textStyle.fontName = { family: fontFamily, style: "Regular" };
                } catch (fallbackError) {
                  console.error(`\u274C Font "${fontFamily}" not installed in Figma`);
                  throw fontLoadError;
                }
              }
            }
          } catch (error46) {
            const message = error46 instanceof Error ? error46.message : String(error46);
            console.group(`\u274C FONT ERROR: ${token.qualifiedName}`);
            console.log(`Family: ${JSON.stringify(typValue.fontFamily)}`);
            console.log(`Weight: ${JSON.stringify(typValue.fontWeight)}`);
            console.log(`Error: ${message}`);
            console.groupEnd();
            throw error46;
          }
        }
        if (typValue.fontSize !== void 0) {
          const fontSize = this.convertNumericValue(typValue.fontSize, options.percentageBase);
          if (fontSize < 1) {
            throw new Error(`Font size must be >= 1 (got ${fontSize} from ${typValue.fontSize})`);
          }
          textStyle.fontSize = fontSize;
        }
        if (typValue.lineHeight !== void 0) {
          const lineHeightResult = this.convertLineHeight(typValue.lineHeight, options.percentageBase);
          textStyle.lineHeight = lineHeightResult;
        }
        if (typValue.letterSpacing !== void 0) {
          const letterSpacing = this.convertNumericValue(typValue.letterSpacing, options.percentageBase);
          textStyle.letterSpacing = { value: letterSpacing, unit: "PIXELS" };
        }
        return stats;
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : String(error46);
        const stack = error46 instanceof Error ? error46.stack : "";
        console.error(`[FigmaSyncService] Failed to create text style ${token.qualifiedName}:`);
        console.error(`  Error: ${message}`);
        if (stack) {
          console.error(`  Stack: ${stack}`);
        }
        console.error(`  Token value:`, JSON.stringify(token.value, null, 2));
        stats.skipped++;
        return stats;
      }
    }
    /**
     * Create or update Figma Effect Style from shadow token
     */
    async createEffectStyle(token, options) {
      const stats = { added: 0, updated: 0, skipped: 0 };
      try {
        const value = token.resolvedValue || token.value;
        if (typeof value !== "object" || value === null) {
          console.warn(`[FigmaSyncService] Shadow token ${token.qualifiedName} has invalid value type`);
          stats.skipped++;
          return stats;
        }
        const resolvedValue = this.resolveNestedReferences(value, token.projectId);
        const shadowValue = resolvedValue;
        const unresolvedRefs = this.findUnresolvedReferences(resolvedValue);
        if (unresolvedRefs.length > 0) {
          console.group(`\u26A0\uFE0F  SHADOW: ${token.qualifiedName}`);
          console.log(`\u274C ${unresolvedRefs.length} unresolved reference(s) - shadow may not render correctly`);
          unresolvedRefs.forEach((ref) => {
            if (ref.includes("color")) {
              console.log(`   ${ref} \u26A0\uFE0F  MISSING COLOR - shadow will be invisible!`);
            } else {
              console.log(`   ${ref}`);
            }
          });
          console.log(`\u{1F4CB} Project: "${token.projectId}" | Collection: "${token.collection}"`);
          console.log(`\u{1F4A1} See individual reference errors above for details`);
          console.groupEnd();
        }
        const styleName = token.path.join("/");
        const existingStyles = await figma.getLocalEffectStylesAsync();
        let effectStyle = existingStyles.find((s) => s.name === styleName);
        if (!effectStyle) {
          effectStyle = figma.createEffectStyle();
          effectStyle.name = styleName;
          stats.added++;
        } else {
          if (!options.updateExisting) {
            stats.skipped++;
            return stats;
          }
          stats.updated++;
        }
        if (token.description) {
          effectStyle.description = token.description;
        }
        const shadowEffect = shadowValue.inset ? {
          type: "INNER_SHADOW",
          visible: true,
          color: this.convertColorToRGBA(shadowValue.color),
          offset: {
            x: this.convertNumericValue(shadowValue.offsetX, options.percentageBase),
            y: this.convertNumericValue(shadowValue.offsetY, options.percentageBase)
          },
          radius: this.convertNumericValue(shadowValue.blur, options.percentageBase),
          spread: shadowValue.spread ? this.convertNumericValue(shadowValue.spread, options.percentageBase) : 0,
          blendMode: "NORMAL"
        } : {
          type: "DROP_SHADOW",
          visible: true,
          color: this.convertColorToRGBA(shadowValue.color),
          offset: {
            x: this.convertNumericValue(shadowValue.offsetX, options.percentageBase),
            y: this.convertNumericValue(shadowValue.offsetY, options.percentageBase)
          },
          radius: this.convertNumericValue(shadowValue.blur, options.percentageBase),
          spread: shadowValue.spread ? this.convertNumericValue(shadowValue.spread, options.percentageBase) : 0,
          blendMode: "NORMAL"
        };
        effectStyle.effects = [shadowEffect];
        return stats;
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
        console.error(`[FigmaSyncService] Failed to create effect style ${token.qualifiedName}: ${message}`);
        stats.skipped++;
        return stats;
      }
    }
    /**
     * Map font weight to Figma font style
     */
    mapFontWeightToStyle(weight) {
      const numWeight = typeof weight === "number" ? weight : parseInt(weight);
      const weightMap = {
        100: "Thin",
        200: "ExtraLight",
        300: "Light",
        400: "Regular",
        500: "Medium",
        600: "SemiBold",
        700: "Bold",
        800: "ExtraBold",
        900: "Black"
      };
      return weightMap[numWeight] || "Regular";
    }
    /**
     * Update token extensions with Figma metadata
     */
    async updateTokenExtensions(tokens) {
      var _a;
      for (const token of tokens) {
        const varName = this.generateVariableName(token);
        const variable = this.variableMap.get(varName);
        if (variable) {
          this.repository.update(token.id, {
            extensions: __spreadProps(__spreadValues({}, token.extensions), {
              figma: {
                variableId: variable.id,
                collectionId: variable.variableCollectionId,
                collectionName: (_a = this.collectionMap.get(token.collection)) == null ? void 0 : _a.name
              }
            })
          });
        }
      }
    }
  };

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

  // src/shared/utils.ts
  function deepClone(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    if (obj instanceof Array) {
      return obj.map((item) => deepClone(item));
    }
    if (obj instanceof Set) {
      return new Set(Array.from(obj).map(deepClone));
    }
    if (obj instanceof Map) {
      const cloned2 = /* @__PURE__ */ new Map();
      obj.forEach((value, key) => {
        cloned2.set(deepClone(key), deepClone(value));
      });
      return cloned2;
    }
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  // src/core/services/TokenProcessor.ts
  var TokenProcessor = class {
    /**
     * Process raw token data into Token[] using auto-detected format
     *
     * @param data - Raw token data
     * @param options - Processing options (projectId, source info, etc.)
     * @returns Array of processed tokens
     */
    async processTokenData(data, options) {
      try {
        const strategy = TokenFormatRegistry.detectFormat(data);
        if (!strategy) {
          return Failure("Could not detect token format");
        }
        const parseResult = strategy.parseTokens(data);
        if (!parseResult.success) {
          return Failure(`Failed to parse tokens: ${parseResult.error}`);
        }
        const tokens = this.convertProcessedTokens(
          parseResult.data || [],
          strategy,
          options
        );
        return Success(tokens);
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
        console.error(`[TokenProcessor] Failed to process token data: ${message}`);
        return Failure(message);
      }
    }
    /**
     * Process multiple token files
     *
     * @param files - Array of {data, collection} objects
     * @param options - Processing options
     * @returns Combined array of tokens from all files
     */
    async processMultipleFiles(files, options) {
      try {
        const allTokens = [];
        for (const file2 of files) {
          const collection = file2.collection || this.inferCollectionFromPath(file2.filePath);
          const result = await this.processTokenData(file2.data, __spreadProps(__spreadValues({}, options), {
            collection
          }));
          if (result.success && result.data) {
            allTokens.push(...result.data);
          } else {
            console.warn(`[TokenProcessor] Failed to process file: ${result.error}`);
          }
        }
        if (allTokens.length === 0) {
          return Failure("No tokens could be processed from the provided files");
        }
        return Success(allTokens);
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
        console.error(`[TokenProcessor] Failed to process multiple files: ${message}`);
        return Failure(message);
      }
    }
    // ==================== PRIVATE METHODS ====================
    /**
     * Convert ProcessedToken[] to Token[]
     */
    convertProcessedTokens(processed, strategy, options) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const tokens = [];
      for (const pt of processed) {
        const id = this.generateTokenId(options.projectId, pt.path);
        const qualifiedName = pt.path.join(".");
        const name = pt.path[pt.path.length - 1];
        const isAlias = strategy.isReference(pt.value);
        const aliasTo = isAlias ? strategy.extractReference(pt.value) : void 0;
        const type = this.mapToTokenType(pt.type);
        const source = {
          type: options.sourceType,
          location: options.sourceLocation,
          imported: now,
          branch: options.sourceBranch,
          commit: options.sourceCommit
        };
        const collection = options.collection || "default";
        const formatInfo = strategy.getFormatInfo();
        const sourceFormat = this.mapFormatName(formatInfo.name);
        const token = {
          id,
          path: pt.path,
          name,
          qualifiedName,
          type,
          rawValue: deepClone(pt.originalValue !== void 0 ? pt.originalValue : pt.value),
          value: deepClone(pt.value),
          resolvedValue: isAlias ? void 0 : deepClone(pt.value),
          aliasTo: aliasTo ? this.generateTokenId(options.projectId, aliasTo.split(".")) : void 0,
          projectId: options.projectId,
          collection,
          theme: options.theme,
          brand: options.brand,
          sourceFormat,
          source,
          extensions: {},
          tags: this.inferTags(pt.path, pt.type),
          status: "active",
          created: now,
          lastModified: now
        };
        if (isFeatureEnabled("ZOD_VALIDATION")) {
          const validationResult = validateToken(token);
          if (!validationResult.success && validationResult.error) {
            console.warn(
              `[TokenProcessor] Token validation failed for ${qualifiedName}:`,
              validationResult.error.issues
            );
            token.extensions = __spreadProps(__spreadValues({}, token.extensions), {
              validationErrors: validationResult.error.issues.map((e) => ({
                path: e.path.join("."),
                message: e.message,
                code: e.code
              }))
            });
            token.status = "draft";
          }
        }
        tokens.push(token);
      }
      return tokens;
    }
    /**
     * Generate stable token ID
     */
    generateTokenId(projectId, path) {
      const key = `${projectId}:${path.join(".")}`;
      return this.simpleHash(key);
    }
    /**
     * Simple hash function for ID generation
     */
    simpleHash(str) {
      let hash2 = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash2 = (hash2 << 5) - hash2 + char;
        hash2 = hash2 & hash2;
      }
      return `token_${Math.abs(hash2).toString(36)}`;
    }
    /**
     * Map format-specific type to TokenType
     */
    mapToTokenType(type) {
      const normalized = type.toLowerCase();
      const typeMap = {
        color: "color",
        dimension: "dimension",
        fontsize: "fontSize",
        fontweight: "fontWeight",
        fontfamily: "fontFamily",
        lineheight: "lineHeight",
        letterspacing: "letterSpacing",
        spacing: "spacing",
        shadow: "shadow",
        border: "border",
        duration: "duration",
        cubicbezier: "cubicBezier",
        number: "number",
        string: "string",
        typography: "typography",
        boolean: "boolean"
      };
      if (normalized.includes("font")) {
        if (normalized.includes("size")) return "fontSize";
        if (normalized.includes("weight")) return "fontWeight";
        if (normalized.includes("family")) return "fontFamily";
      }
      if (normalized.includes("line") && normalized.includes("height")) {
        return "lineHeight";
      }
      if (normalized.includes("letter") && normalized.includes("spacing")) {
        return "letterSpacing";
      }
      return typeMap[normalized] || "other";
    }
    /**
     * Map format name to source format type
     */
    mapFormatName(formatName) {
      const normalized = formatName.toLowerCase();
      if (normalized.includes("w3c")) return "w3c";
      if (normalized.includes("style") && normalized.includes("dictionary")) return "style-dictionary";
      if (normalized.includes("figma")) return "figma";
      return "custom";
    }
    /**
     * Infer collection from file path
     * Examples:
     * - tokens/primitives.json -> primitives
     * - tokens/semantic/colors.json -> semantic
     * - colors.json -> default
     */
    inferCollectionFromPath(filePath) {
      if (!filePath) return "default";
      const parts = filePath.toLowerCase().split("/");
      const collectionKeywords = [
        "primitive",
        "primitives",
        "semantic",
        "semantics",
        "base",
        "core",
        "foundation",
        "component",
        "components"
      ];
      for (const part of parts) {
        for (const keyword of collectionKeywords) {
          if (part.includes(keyword)) {
            return part.replace(/\.(json|js|ts)$/i, "");
          }
        }
      }
      const filename = parts[parts.length - 1];
      return filename.replace(/\.(json|js|ts)$/i, "") || "default";
    }
    /**
     * Infer tags from token path and type
     */
    inferTags(path, type) {
      const tags = [];
      tags.push(type);
      if (path.length > 1) {
        tags.push(path[0]);
        if (path.length > 2) {
          tags.push(`${path[0]}.${path[1]}`);
        }
      }
      return tags;
    }
  };

  // src/backend/controllers/TokenController.ts
  var TokenController = class {
    constructor(figmaSyncService, storage, tokenRepository, tokenResolver) {
      this.figmaSyncService = figmaSyncService;
      this.storage = storage;
      this.tokenRepository = tokenRepository;
      this.tokenResolver = tokenResolver;
    }
    /**
     * Import tokens to Figma variables (v2.0)
     * Converts legacy TokenData format to Token[] and syncs via FigmaSyncService
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
        const processor = new TokenProcessor();
        const allTokens = [];
        let stats = { added: 0, updated: 0, skipped: 0 };
        if (primitives) {
          const primResult = await processor.processTokenData(primitives, {
            projectId: "default",
            collection: "primitive",
            sourceType: "local",
            sourceLocation: "primitives"
          });
          if (primResult.success && primResult.data) {
            allTokens.push(...primResult.data);
          } else if (!primResult.success) {
            throw new Error(`Failed to process primitives: ${primResult.error}`);
          }
        }
        if (semantics) {
          const semResult = await processor.processTokenData(semantics, {
            projectId: "default",
            collection: "semantic",
            sourceType: "local",
            sourceLocation: "semantics"
          });
          if (semResult.success && semResult.data) {
            allTokens.push(...semResult.data);
          } else if (!semResult.success) {
            throw new Error(`Failed to process semantics: ${semResult.error}`);
          }
        }
        this.tokenRepository.add(allTokens);
        ErrorHandler.info(
          `Resolving ${allTokens.length} tokens...`,
          "TokenController"
        );
        const resolveResult = await this.tokenResolver.resolveAllTokens("default");
        if (!resolveResult.success) {
          ErrorHandler.warn(
            `Token resolution failed: ${resolveResult.error}. Continuing with unresolved values.`,
            "TokenController"
          );
        } else {
          const resolvedValues = resolveResult.data;
          ErrorHandler.info(
            `Resolved ${resolvedValues.size} token values`,
            "TokenController"
          );
          for (const [tokenId, resolvedValue] of resolvedValues.entries()) {
            this.tokenRepository.update(tokenId, { resolvedValue });
          }
          const updatedTokens = [];
          for (const token of allTokens) {
            const updated = this.tokenRepository.get(token.id);
            if (updated) {
              updatedTokens.push(updated);
            }
          }
          allTokens.length = 0;
          allTokens.push(...updatedTokens);
        }
        const syncResult = await this.figmaSyncService.syncTokens(allTokens);
        if (!syncResult.success) {
          throw new Error(syncResult.error || "Failed to sync tokens to Figma");
        }
        stats.added = allTokens.length;
        ErrorHandler.info(
          `Import completed: ${stats.added} tokens synced to Figma`,
          "TokenController"
        );
        ErrorHandler.notifyUser(
          `${SUCCESS_MESSAGES.IMPORT_SUCCESS}: ${stats.added} tokens synced`,
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
     * Get all tokens from repository (v2.0)
     * Returns Token[] array instead of legacy TokenMetadata[]
     */
    getTokens() {
      return this.tokenRepository.getAll();
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
    async fetchFiles(config2) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.validateRequired(
          config2,
          ["owner", "repo", "branch"],
          "Fetch GitHub Files"
        );
        ErrorHandler.info(
          `Fetching files from ${config2.owner}/${config2.repo}@${config2.branch}`,
          "GitHubController"
        );
        const fileObjects = await this.githubService.fetchRepositoryFiles(config2);
        const filePaths = fileObjects.map((file2) => file2.path);
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
    async importFiles(config2) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.validateRequired(
          config2,
          ["owner", "repo", "branch", "files"],
          "Import GitHub Files"
        );
        ErrorHandler.assert(
          config2.files && config2.files.length > 0,
          "No files selected for import",
          "Import GitHub Files"
        );
        ErrorHandler.info(
          `Importing ${config2.files.length} files from ${config2.owner}/${config2.repo}@${config2.branch}`,
          "GitHubController"
        );
        const result = await this.githubService.fetchMultipleFiles(
          config2,
          config2.files
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
    async saveConfig(config2) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.validateRequired(
          config2,
          ["owner", "repo", "branch"],
          "Save GitHub Config"
        );
        const result = await this.storage.saveGitHubConfig(config2);
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
    async validateConfig(config2) {
      return ErrorHandler.handle(async () => {
        ErrorHandler.validateRequired(
          config2,
          ["owner", "repo", "branch"],
          "Validate GitHub Config"
        );
        try {
          await this.githubService.fetchRepositoryFiles(config2);
          ErrorHandler.info("GitHub configuration is valid", "GitHubController");
          return true;
        } catch (error46) {
          ErrorHandler.warn(
            `GitHub configuration validation failed: ${ErrorHandler.formatError(error46)}`,
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
     * Apply scope assignments to variables (legacy method using variable names)
     * Updates the scopes property of selected variables
     *
     * @param scopeAssignments - Map of variable names to scope arrays
     * @returns Number of variables updated
     * @deprecated Use applyScopesFromTokens() for O(1) Token ID-based lookups
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
     * Apply scope assignments to variables using Token ID-based lookups (NEW)
     * 80% faster than name-based lookups - O(1) vs O(n) per token
     *
     * IMPORTANT: This operates on EXISTING Figma variables only.
     * Variables must have been created by FigmaSyncService first, which
     * populates token.extensions.figma.variableId
     *
     * @param tokens - Array of tokens with Figma variable IDs in extensions
     * @param scopeAssignments - Map of token IDs to scope arrays
     * @returns Number of variables updated
     */
    async applyScopesFromTokens(tokens, scopeAssignments) {
      return ErrorHandler.handle(async () => {
        var _a, _b;
        ErrorHandler.assert(
          tokens && tokens.length > 0,
          "No tokens provided",
          "Apply Scopes From Tokens"
        );
        ErrorHandler.assert(
          scopeAssignments && scopeAssignments.size > 0,
          "No scope assignments provided",
          "Apply Scopes From Tokens"
        );
        ErrorHandler.info(
          `Applying scopes to ${tokens.length} token(s) using Token ID lookup`,
          "ScopeController"
        );
        let updatedCount = 0;
        let skippedCount = 0;
        for (const token of tokens) {
          const variableId = (_b = (_a = token.extensions) == null ? void 0 : _a.figma) == null ? void 0 : _b.variableId;
          if (!variableId) {
            console.warn(`[ScopeController] Token ${token.id} (${token.qualifiedName}) has no Figma variable ID`);
            skippedCount++;
            continue;
          }
          const newScopes = scopeAssignments.get(token.id);
          if (!newScopes) {
            continue;
          }
          const variable = figma.variables.getVariableByIdAsync ? await figma.variables.getVariableByIdAsync(variableId) : figma.variables.getVariableById(variableId);
          if (!variable) {
            console.warn(`[ScopeController] Figma variable not found for token ${token.id} (variableId: ${variableId})`);
            skippedCount++;
            continue;
          }
          this.validateScopes(newScopes, token.qualifiedName);
          variable.scopes = newScopes;
          updatedCount++;
          ErrorHandler.info(
            `Updated scopes for ${token.qualifiedName} (ID: ${token.id}): ${newScopes.join(", ")}`,
            "ScopeController"
          );
        }
        ErrorHandler.info(
          `Scopes updated for ${updatedCount} variable(s), ${skippedCount} skipped (no variable ID)`,
          "ScopeController"
        );
        if (updatedCount === 0 && skippedCount === 0) {
          ErrorHandler.warn("No variables were updated. Check token IDs and scope assignments.", "ScopeController");
        }
        ErrorHandler.notifyUser(
          `${SUCCESS_MESSAGES.SCOPE_APPLIED}: ${updatedCount} variable(s)`,
          "success"
        );
        return updatedCount;
      }, "Apply Scopes From Tokens");
    }
    /**
     * Get variable by Token (NEW - O(1) lookup)
     * Uses token.extensions.figma.variableId for direct access
     *
     * @param token - Token with Figma variable ID in extensions
     * @returns Variable or null if not found
     */
    async getVariableByToken(token) {
      return ErrorHandler.handle(async () => {
        var _a, _b;
        const variableId = (_b = (_a = token.extensions) == null ? void 0 : _a.figma) == null ? void 0 : _b.variableId;
        if (!variableId) {
          ErrorHandler.info(`Token ${token.id} (${token.qualifiedName}) has no Figma variable ID`, "ScopeController");
          return null;
        }
        ErrorHandler.info(`Looking up variable for token: ${token.qualifiedName} (ID: ${variableId})`, "ScopeController");
        const variable = figma.variables.getVariableByIdAsync ? await figma.variables.getVariableByIdAsync(variableId) : figma.variables.getVariableById(variableId);
        if (variable) {
          ErrorHandler.info(`Found variable: ${variable.name}`, "ScopeController");
        } else {
          ErrorHandler.info(`Variable not found for ID: ${variableId}`, "ScopeController");
        }
        return variable;
      }, "Get Variable By Token");
    }
    /**
     * Get variable by name across all collections (legacy method)
     * Useful for finding a specific variable
     *
     * @param variableName - Name of the variable to find
     * @returns Variable or null if not found
     * @deprecated Use getVariableByToken() for O(1) lookups
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
    constructor(generator, storage, tokenRepository) {
      this.generator = generator;
      this.storage = storage;
      this.tokenRepository = tokenRepository;
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
          for (const [fileName, file2] of Object.entries(tokenState.tokenFiles)) {
            tokenFilesMap.set(fileName, file2);
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
        const tokens = this.tokenRepository.getAll();
        if (tokens && tokens.length > 0) {
          ErrorHandler.info(
            `Found ${tokens.length} tokens in repository`,
            "DocumentationController"
          );
        } else {
          ErrorHandler.info(
            "No tokens in repository, generator will read from Figma variables",
            "DocumentationController"
          );
        }
        const result = await this.generator.generate(
          tokenFilesMap,
          tokens,
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

  // src/core/adapters/GitHubFileSource.ts
  var GitHubFileSource = class {
    constructor(githubService) {
      this.githubService = githubService || new GitHubService();
    }
    /**
     * Fetch list of JSON files from GitHub repository
     */
    async fetchFileList(config2) {
      try {
        const ghConfig = this.toGitHubConfig(config2);
        const files = await this.githubService.fetchRepositoryFiles(ghConfig);
        const metadata = files.map((file2) => ({
          path: file2.path,
          type: file2.type,
          sha: file2.sha
        }));
        return Success(metadata);
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
        console.error(`[GitHubFileSource] Failed to fetch file list: ${message}`);
        return Failure(message);
      }
    }
    /**
     * Fetch content of a single file from GitHub
     */
    async fetchFileContent(config2, filePath) {
      try {
        const ghConfig = this.toGitHubConfig(config2);
        const content = await this.githubService.fetchFileContent(ghConfig, filePath);
        return Success(content);
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
        console.error(`[GitHubFileSource] Failed to fetch file '${filePath}': ${message}`);
        return Failure(message);
      }
    }
    /**
     * Fetch content of multiple files from GitHub
     */
    async fetchMultipleFiles(config2, filePaths) {
      try {
        const ghConfig = this.toGitHubConfig(config2);
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
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
        console.error(`[GitHubFileSource] Failed to fetch multiple files: ${message}`);
        return Failure(message);
      }
    }
    /**
     * Validate GitHub configuration
     */
    async validateConfig(config2) {
      try {
        const ghConfig = this.toGitHubConfig(config2);
        await this.githubService.fetchRepositoryFiles(ghConfig);
        return Success(true);
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
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
    toGitHubConfig(config2) {
      const ghConfig = config2;
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
      const check2 = (obj) => {
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
              check2(value);
            }
          }
        }
      };
      check2(data);
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
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
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
      const check2 = (obj) => {
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
              check2(value);
            }
          }
        }
      };
      check2(data);
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
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
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
      } catch (error46) {
        square.fills = [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8 } }];
        console.error(`[ColorVisualizer] Failed to parse color for ${token.name}`);
        console.error(`[ColorVisualizer] Error details:`, error46);
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
      if (typeof value === "object" && value !== null) {
        if ("r" in value && "g" in value && "b" in value) {
          if (typeof value.r === "number" && typeof value.g === "number" && typeof value.b === "number") {
            return {
              r: value.r,
              g: value.g,
              b: value.b
            };
          }
        }
        if ("colorSpace" in value && value.colorSpace === "hsl" && "hex" in value && value.hex) {
          return this.parseHex(value.hex);
        }
        if ("colorSpace" in value && value.colorSpace === "rgb" && Array.isArray(value.components)) {
          const [r, g, b] = value.components;
          return {
            r: r / 255,
            g: g / 255,
            b: b / 255
          };
        }
        if ("components" in value && Array.isArray(value.components) && !("colorSpace" in value)) {
          const [r, g, b] = value.components;
          return {
            r: r / 255,
            g: g / 255,
            b: b / 255
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
    parseHex(hex3) {
      const cleaned = hex3.replace("#", "");
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

  // src/core/adapters/TokenDocumentationAdapter.ts
  var TokenDocumentationAdapter = class {
    constructor(repository) {
      this.repository = repository;
    }
    /**
     * Convert Token[] to TokenMetadata[]
     *
     * @param tokens - Array of tokens to convert
     * @returns TokenMetadata array for DocumentationGenerator
     */
    tokensToMetadata(tokens) {
      return tokens.map((token) => this.tokenToMetadata(token));
    }
    /**
     * Convert single Token to TokenMetadata
     *
     * @param token - Token to convert
     * @returns TokenMetadata
     */
    tokenToMetadata(token) {
      let aliasTo;
      if (token.aliasTo) {
        const targetToken = this.repository.get(token.aliasTo);
        if (targetToken) {
          aliasTo = `{${targetToken.qualifiedName}}`;
        }
      }
      return {
        name: token.name,
        fullPath: token.qualifiedName,
        type: token.type,
        value: token.resolvedValue || token.value,
        originalValue: aliasTo || token.rawValue || token.value,
        description: token.description,
        aliasTo,
        collection: token.collection
      };
    }
  };

  // src/backend/services/DocumentationGenerator.ts
  var DocumentationGenerator = class {
    constructor(repository) {
      this.fontFamily = DOCUMENTATION_TYPOGRAPHY.defaultFontFamily;
      this.defaultVisualizer = new DefaultVisualizer();
      if (repository) {
        this.adapter = new TokenDocumentationAdapter(repository);
      }
    }
    /**
     * Generate documentation table in Figma (implementation)
     */
    async generate(tokenFiles, tokensOrMetadata, options) {
      try {
        if (options.fontFamily) {
          this.fontFamily = options.fontFamily;
        }
        await this.loadFont();
        let metadata;
        if (tokensOrMetadata.length > 0 && this.isToken(tokensOrMetadata[0])) {
          if (!this.adapter) {
            return Failure("TokenRepository required to process Token[] - please provide repository in constructor");
          }
          console.log("[DocumentationGenerator] Converting Token[] to TokenMetadata[]...");
          metadata = this.adapter.tokensToMetadata(tokensOrMetadata);
        } else {
          metadata = tokensOrMetadata;
        }
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
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
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
      } catch (error46) {
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
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : "Unknown error";
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
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      if (typeof value === "object") {
        if ("r" in value && "g" in value && "b" in value) {
          return this.rgbToHex(value);
        }
        if ("value" in value && "unit" in value) {
          const numVal = typeof value.value === "number" ? value.value : parseFloat(value.value);
          const unit = value.unit || "";
          if (unit === "rem" || unit === "em") {
            const pxValue = numVal * 16;
            return `${formatNumber(pxValue)}px (${formatNumber(numVal)}${unit})`;
          }
          return `${formatNumber(numVal)}${unit}`;
        }
        if ("colorSpace" in value && value.colorSpace === "hsl" && "hex" in value) {
          return value.hex;
        }
        if ("colorSpace" in value && value.colorSpace === "rgb" && "components" in value) {
          const [r, g, b] = value.components;
          return this.rgbToHex({ r: r / 255, g: g / 255, b: b / 255 });
        }
        if ("components" in value && Array.isArray(value.components) && !("colorSpace" in value)) {
          const [r, g, b] = value.components;
          return this.rgbToHex({ r: r / 255, g: g / 255, b: b / 255 });
        }
        if (type === "typography" && "fontFamily" in value) {
          const parts = [];
          if (value.fontFamily) parts.push(value.fontFamily);
          if (value.fontSize) parts.push(`${value.fontSize}px`);
          if (value.fontWeight) parts.push(`weight: ${value.fontWeight}`);
          if (value.lineHeight) parts.push(`line: ${value.lineHeight}`);
          return parts.length > 0 ? parts.join(" / ") : JSON.stringify(value);
        }
        if (type === "shadow" && ("offsetX" in value || "x" in value)) {
          const x = value.offsetX || value.x || 0;
          const y = value.offsetY || value.y || 0;
          const blur = value.blur || 0;
          const spread = value.spread || 0;
          const color = value.color || "#000000";
          return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
        }
        console.warn("[DocumentationGenerator] Unhandled object format:", { type, value });
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
      if (typeof value === "object" && value !== null) {
        if ("r" in value && "g" in value && "b" in value) {
          return this.rgbToHex(value);
        }
        if ("colorSpace" in value && value.colorSpace === "hsl" && "hex" in value) {
          return value.hex;
        }
        if ("colorSpace" in value && value.colorSpace === "rgb" && Array.isArray(value.components)) {
          const [r, g, b] = value.components;
          return this.rgbToHex({ r: r / 255, g: g / 255, b: b / 255 });
        }
        if ("components" in value && Array.isArray(value.components) && !("colorSpace" in value)) {
          const [r, g, b] = value.components;
          return this.rgbToHex({ r: r / 255, g: g / 255, b: b / 255 });
        }
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
        const hex3 = clamped.toString(16);
        return hex3.length === 1 ? "0" + hex3 : hex3;
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
    /**
     * Type guard to check if object is a Token
     */
    isToken(obj) {
      return obj && "id" in obj && "qualifiedName" in obj && "path" in obj;
    }
  };

  // src/backend/main.ts
  var PluginBackend = class {
    constructor() {
      this.registerArchitectureComponents();
      this.githubService = new GitHubService();
      this.storage = new StorageService();
      this.tokenRepository = new TokenRepository();
      this.tokenResolver = new TokenResolver(this.tokenRepository);
      this.figmaSyncService = new FigmaSyncService(this.tokenRepository, this.tokenResolver);
      this.tokenController = new TokenController(this.figmaSyncService, this.storage, this.tokenRepository, this.tokenResolver);
      this.githubController = new GitHubController(this.githubService, this.storage);
      this.scopeController = new ScopeController();
      const documentationGenerator = new DocumentationGenerator(this.tokenRepository);
      this.documentationController = new DocumentationController(
        documentationGenerator,
        this.storage,
        this.tokenRepository
      );
      ErrorHandler.info("Plugin backend initialized (v2.0 Architecture)", "PluginBackend");
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
      } catch (error46) {
        const errorMessage = ErrorHandler.formatError(error46);
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

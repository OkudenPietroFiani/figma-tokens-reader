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
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return `token_${Math.abs(hash).toString(36)}`;
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
        for (const token of tokens) {
          if (!token.id || !token.projectId || !token.path || token.path.length === 0) {
            console.error("[TokenRepository] Invalid token missing required fields:", token);
            continue;
          }
          if (this.tokens.has(token.id)) {
            this.removeFromIndexes(token.id);
          }
          this.tokens.set(token.id, token);
          this.addToIndexes(token);
        }
        return Success(tokens.length);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
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
        const graph = this.buildDependencyGraph(tokens);
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
            if (target) {
              const targetValue = resolved.get(target.id) || target.value;
              resolved.set(token.id, targetValue);
            } else {
              resolved.set(token.id, token.value);
              this.stats.unresolvedReferences++;
            }
          } else {
            resolved.set(token.id, token.value);
          }
        }
        return Success(resolved);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
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
      const graph = this.buildDependencyGraph(tokens);
      return this.detectCycles(graph);
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
     */
    buildDependencyGraph(tokens) {
      const graph = /* @__PURE__ */ new Map();
      for (const token of tokens) {
        if (!graph.has(token.id)) {
          graph.set(token.id, []);
        }
        if (token.aliasTo) {
          graph.get(token.id).push(token.aliasTo);
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
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
    hexToRgb(hex) {
      const cleanHex = hex.replace(/^#/, "");
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
      console.warn(`[FigmaSyncService] Invalid hex format: ${hex}`);
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
      } catch (error) {
        console.error(`[FigmaSyncService] Failed to set code syntax for ${token.qualifiedName}:`, error);
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
        console.log(`[FigmaSyncService] Resolving reference: "${value}" (project: "${projectId}")`);
        const referencedToken = this.resolver.resolveReference(value, projectId);
        if (referencedToken) {
          const resolvedValue = referencedToken.resolvedValue || referencedToken.value;
          console.log(`[FigmaSyncService] \u2713 Resolved "${value}" \u2192 ${JSON.stringify(resolvedValue)}`);
          return this.resolveNestedReferences(resolvedValue, projectId);
        } else {
          console.error(`[FigmaSyncService] \u2717 Could not resolve reference: "${value}"`);
          const allTokens = this.repository.getByProject(projectId);
          console.error(`[FigmaSyncService]   Project has ${allTokens.length} tokens`);
          console.error(`[FigmaSyncService]   Sample tokens: ${allTokens.slice(0, 5).map((t) => t.qualifiedName).join(", ")}`);
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
        console.log(`[FigmaSyncService] Processing typography token ${token.qualifiedName}:`, {
          fontFamily: typValue.fontFamily,
          fontSize: typValue.fontSize,
          fontWeight: typValue.fontWeight,
          lineHeight: typValue.lineHeight,
          letterSpacing: typValue.letterSpacing
        });
        const styleName = token.path.join("/");
        const existingStyles = await figma.getLocalTextStylesAsync();
        let textStyle = existingStyles.find((s) => s.name === styleName);
        if (!textStyle) {
          textStyle = figma.createTextStyle();
          textStyle.name = styleName;
          stats.added++;
          console.log(`[FigmaSyncService] Created text style: ${styleName}`);
        } else {
          if (!options.updateExisting) {
            stats.skipped++;
            return stats;
          }
          stats.updated++;
          console.log(`[FigmaSyncService] Updated text style: ${styleName}`);
        }
        if (token.description) {
          textStyle.description = token.description;
        }
        if (typValue.fontFamily) {
          try {
            const fontFamily = typeof typValue.fontFamily === "string" ? typValue.fontFamily : typValue.fontFamily[0];
            const fontWeight = typValue.fontWeight || 400;
            const fontStyle = this.mapFontWeightToStyle(fontWeight);
            console.log(`[FigmaSyncService] Loading font: ${fontFamily} ${fontStyle}`);
            await figma.loadFontAsync({ family: fontFamily, style: fontStyle });
            textStyle.fontName = { family: fontFamily, style: fontStyle };
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[FigmaSyncService] Could not load font ${typValue.fontFamily}: ${message}`);
            throw error;
          }
        }
        if (typValue.fontSize !== void 0) {
          const fontSize = this.convertNumericValue(typValue.fontSize, options.percentageBase);
          console.log(`[FigmaSyncService] Font size converted: ${typValue.fontSize} \u2192 ${fontSize}px`);
          if (fontSize < 1) {
            console.error(`[FigmaSyncService] Invalid font size: ${fontSize}px (must be >= 1). Original value: ${typValue.fontSize}`);
            throw new Error(`Font size must be >= 1 (got ${fontSize})`);
          }
          textStyle.fontSize = fontSize;
        }
        if (typValue.lineHeight !== void 0) {
          const lineHeightResult = this.convertLineHeight(typValue.lineHeight, options.percentageBase);
          const displayValue = lineHeightResult.unit === "AUTO" ? "AUTO" : `${lineHeightResult.value}${lineHeightResult.unit === "PERCENT" ? "%" : "px"}`;
          console.log(`[FigmaSyncService] Line height converted: ${typValue.lineHeight} \u2192 ${displayValue}`);
          textStyle.lineHeight = lineHeightResult;
        }
        if (typValue.letterSpacing !== void 0) {
          const letterSpacing = this.convertNumericValue(typValue.letterSpacing, options.percentageBase);
          console.log(`[FigmaSyncService] Letter spacing converted: ${typValue.letterSpacing} \u2192 ${letterSpacing}px`);
          textStyle.letterSpacing = { value: letterSpacing, unit: "PIXELS" };
        }
        return stats;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : "";
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
        const styleName = token.path.join("/");
        const existingStyles = await figma.getLocalEffectStylesAsync();
        let effectStyle = existingStyles.find((s) => s.name === styleName);
        if (!effectStyle) {
          effectStyle = figma.createEffectStyle();
          effectStyle.name = styleName;
          stats.added++;
          console.log(`[FigmaSyncService] Created effect style: ${styleName}`);
        } else {
          if (!options.updateExisting) {
            stats.skipped++;
            return stats;
          }
          stats.updated++;
          console.log(`[FigmaSyncService] Updated effect style: ${styleName}`);
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
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
        for (const file of files) {
          const collection = file.collection || this.inferCollectionFromPath(file.filePath);
          const result = await this.processTokenData(file.data, __spreadProps(__spreadValues({}, options), {
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
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
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return `token_${Math.abs(hash).toString(36)}`;
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

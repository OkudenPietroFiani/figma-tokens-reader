"use strict";
(() => {
  // src/constants.ts
  var UI_CONFIG = {
    width: 800,
    height: 600
  };
  var COLLECTION_NAMES = {
    primitive: "Primitive",
    semantic: "Semantic"
  };
  var TYPE_MAPPING = {
    "color": "COLOR",
    "dimension": "FLOAT",
    "spacing": "FLOAT",
    "number": "FLOAT",
    "fontFamily": "STRING",
    "fontWeight": "STRING",
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
        let primitiveCollection = existingCollections.find((c) => c.name === COLLECTION_NAMES.primitive);
        let semanticCollection = existingCollections.find((c) => c.name === COLLECTION_NAMES.semantic);
        if (!primitiveCollection) {
          primitiveCollection = figma.variables.createVariableCollection(COLLECTION_NAMES.primitive);
        }
        if (!semanticCollection) {
          semanticCollection = figma.variables.createVariableCollection(COLLECTION_NAMES.semantic);
        }
        this.collectionMap.set(COLLECTION_NAMES.primitive, primitiveCollection);
        this.collectionMap.set(COLLECTION_NAMES.semantic, semanticCollection);
        if (primitives) {
          const flattenedPrimitives = this.flattenTokenFiles(primitives, "primitive");
          await this.processTokenGroup(flattenedPrimitives, COLLECTION_NAMES.primitive, primitiveCollection, []);
        }
        if (semantics) {
          const flattenedSemantics = this.flattenTokenFiles(semantics, "semantic");
          await this.processTokenGroup(flattenedSemantics, COLLECTION_NAMES.semantic, semanticCollection, []);
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
     * Flatten token files structure to merge multiple files into a single token tree
     * Handles both direct token structure and file-keyed structure (e.g., { "file.json": {...} })
     * Also removes redundant top-level keys that match the collection name
     */
    flattenTokenFiles(data, collectionType) {
      if (!data || typeof data !== "object") {
        return {};
      }
      let result = data;
      const keys = Object.keys(data);
      const isFileKeyed = keys.some(
        (key) => key.endsWith(".json") || key.includes("-json") || key.includes("_json")
      );
      if (isFileKeyed) {
        const merged = {};
        for (const [fileName, fileContent] of Object.entries(data)) {
          if (fileContent && typeof fileContent === "object") {
            Object.assign(merged, fileContent);
          }
        }
        result = merged;
      }
      const resultKeys = Object.keys(result);
      if (resultKeys.length === 1) {
        const topKey = resultKeys[0].toLowerCase();
        const collectionKeyVariants = [
          collectionType,
          collectionType + "s",
          collectionType.slice(0, -1)
          // Remove 's' if plural
        ];
        if (collectionKeyVariants.some((variant) => topKey === variant || topKey === variant + "s")) {
          const unwrapped = result[resultKeys[0]];
          if (unwrapped && typeof unwrapped === "object") {
            return unwrapped;
          }
        }
      }
      return result;
    }
    async processTokenGroup(tokens, collectionName, collection, pathPrefix) {
      for (const [key, value] of Object.entries(tokens)) {
        const currentPath = [...pathPrefix, key];
        if (value && typeof value === "object") {
          if ("$value" in value) {
            await this.createVariable(value, currentPath, collection, collectionName);
          } else {
            await this.processTokenGroup(value, collectionName, collection, currentPath);
          }
        }
      }
    }
    async createVariable(token, path, collection, collectionName) {
      try {
        const variableName = path.map(
          (segment) => segment.replace(/[^a-zA-Z0-9-_]/g, "-")
        ).join("/");
        const tokenType = token.$type || inferTokenType(token.$value);
        const figmaType = mapTokenTypeToFigma(tokenType);
        let variable = await this.findVariableByName(variableName, collection);
        let isNewVariable = false;
        if (!variable) {
          variable = figma.variables.createVariable(variableName, collection, figmaType);
          isNewVariable = true;
          this.importStats.added++;
        } else {
          if (variable.resolvedType !== figmaType) {
            variable = figma.variables.createVariable(variableName + "_new", collection, figmaType);
            isNewVariable = true;
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
          await handleImportTokens(msg.data);
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
  async function handleImportTokens(data) {
    const { primitives, semantics } = data;
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
})();

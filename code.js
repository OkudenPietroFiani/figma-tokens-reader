"use strict";
(() => {
  // src/constants.ts
  var UI_CONFIG = {
    width: 800,
    height: 600
  };
  var DOCUMENTATION = {
    columnWidths: [180, 90, 120, 130, 120, 260],
    tableWidth: 900,
    headerHeight: 40,
    rowHeight: 60,
    previewSize: 40,
    spacing: 12,
    padding: 32,
    titleSpacing: 24
  };
  var FONT_CONFIG = {
    defaultFamily: "Inter",
    defaultStyle: "Regular",
    boldStyle: "Bold",
    titleSize: 24,
    headerSize: 12,
    cellSize: 11,
    previewSize: 9,
    fontPreviewSize: 18
  };
  var COLORS = {
    white: { r: 1, g: 1, b: 1 },
    black: { r: 0, g: 0, b: 0 },
    gray: { r: 0.2, g: 0.2, b: 0.2 },
    lightGray: { r: 0.8, g: 0.8, b: 0.8 },
    backgroundGray: { r: 0.95, g: 0.95, b: 0.95 },
    borderGray: { r: 0.9, g: 0.9, b: 0.9 },
    spacingBlue: { r: 0.5, g: 0.7, b: 1 },
    textGray: { r: 0.4, g: 0.4, b: 0.4 }
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
  function formatValue(value, type) {
    if (typeof value === "object" && value !== null) {
      if ("value" in value && "unit" in value) {
        return `${value.value}${value.unit}`;
      }
      if ("value" in value) {
        return String(value.value);
      }
      return JSON.stringify(value);
    }
    return String(value);
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
          await this.processTokenGroup(primitives, COLLECTION_NAMES.primitive, primitiveCollection, []);
        }
        if (semantics) {
          await this.processTokenGroup(semantics, COLLECTION_NAMES.semantic, semanticCollection, []);
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
        const variableName = path.join("/");
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

  // src/services/documentationGenerator.ts
  var DocumentationGenerator = class {
    async generateDocumentation() {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      if (collections.length === 0) {
        figma.notify("No variable collections found. Please create some variables first.", { timeout: 3e3 });
        return;
      }
      const startX = figma.viewport.center.x - 400;
      let currentY = figma.viewport.center.y;
      for (const collection of collections) {
        const tokens = await this.extractTokensFromCollection(collection);
        if (tokens.length > 0) {
          await this.createDocumentationFrame(collection.name, tokens, startX, currentY);
          currentY += 100;
        }
      }
      figma.notify("Documentation generated successfully", { timeout: 3e3 });
    }
    async extractTokensFromCollection(collection) {
      const tokens = [];
      for (const variableId of collection.variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        if (!variable) continue;
        const modeId = collection.modes[0].modeId;
        const valueForMode = variable.valuesByMode[modeId];
        let value;
        let aliasTo;
        let originalValue = valueForMode;
        if (typeof valueForMode === "object" && valueForMode !== null && "type" in valueForMode) {
          if (valueForMode.type === "VARIABLE_ALIAS") {
            const aliasedVariable = await figma.variables.getVariableByIdAsync(valueForMode.id);
            if (aliasedVariable) {
              aliasTo = aliasedVariable.name;
              value = aliasedVariable.valuesByMode[collection.modes[0].modeId];
            }
          }
        } else {
          value = valueForMode;
        }
        const type = this.figmaTypeToTokenType(variable.resolvedType);
        const metadata = {
          name: variable.name.split("/").pop() || variable.name,
          fullPath: `${collection.name.toLowerCase()}.${variable.name.replace(/\//g, ".")}`,
          type,
          value,
          originalValue,
          description: variable.description || void 0,
          aliasTo,
          collection: collection.name
        };
        tokens.push(metadata);
      }
      return tokens;
    }
    figmaTypeToTokenType(figmaType) {
      switch (figmaType) {
        case "COLOR":
          return "color";
        case "FLOAT":
          return "number";
        case "STRING":
          return "string";
        default:
          return "string";
      }
    }
    async createDocumentationFrame(title, tokens, x, y) {
      const frame = figma.createFrame();
      frame.name = `${title} Documentation`;
      frame.x = x;
      frame.y = y;
      frame.fills = [{ type: "SOLID", color: COLORS.white }];
      frame.layoutMode = "VERTICAL";
      frame.primaryAxisSizingMode = "AUTO";
      frame.counterAxisSizingMode = "AUTO";
      frame.paddingTop = DOCUMENTATION.padding;
      frame.paddingBottom = DOCUMENTATION.padding;
      frame.paddingLeft = DOCUMENTATION.padding;
      frame.paddingRight = DOCUMENTATION.padding;
      frame.itemSpacing = 0;
      const titleText = figma.createText();
      await figma.loadFontAsync({ family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.boldStyle });
      titleText.fontName = { family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.boldStyle };
      titleText.fontSize = FONT_CONFIG.titleSize;
      titleText.characters = title;
      titleText.fills = [{ type: "SOLID", color: COLORS.black }];
      frame.appendChild(titleText);
      const spacer = figma.createRectangle();
      spacer.resize(1, DOCUMENTATION.titleSpacing);
      spacer.fills = [];
      frame.appendChild(spacer);
      const headerRow = await this.createTableRow(
        ["Name", "Type", "Value", "Alias", "Preview", "Description"],
        true
      );
      frame.appendChild(headerRow);
      for (const token of tokens) {
        const row = await this.createTokenRow(token);
        frame.appendChild(row);
      }
      figma.currentPage.appendChild(frame);
    }
    async createTableRow(cells, isHeader = false) {
      const row = figma.createFrame();
      row.name = isHeader ? "Header" : "Row";
      row.layoutMode = "HORIZONTAL";
      row.primaryAxisSizingMode = "FIXED";
      row.counterAxisSizingMode = "AUTO";
      row.resize(DOCUMENTATION.tableWidth, isHeader ? DOCUMENTATION.headerHeight : DOCUMENTATION.rowHeight);
      row.itemSpacing = DOCUMENTATION.spacing;
      row.paddingLeft = DOCUMENTATION.spacing;
      row.paddingRight = DOCUMENTATION.spacing;
      row.paddingTop = 10;
      row.paddingBottom = 10;
      row.fills = isHeader ? [{ type: "SOLID", color: COLORS.backgroundGray }] : [];
      await figma.loadFontAsync({
        family: FONT_CONFIG.defaultFamily,
        style: isHeader ? FONT_CONFIG.boldStyle : FONT_CONFIG.defaultStyle
      });
      for (let index = 0; index < cells.length; index++) {
        const text = cells[index];
        const cell = figma.createFrame();
        cell.name = `Cell ${index}`;
        cell.layoutMode = "HORIZONTAL";
        cell.primaryAxisSizingMode = "FIXED";
        cell.counterAxisSizingMode = "AUTO";
        cell.resize(DOCUMENTATION.columnWidths[index], cell.height);
        cell.fills = [];
        const textNode = figma.createText();
        textNode.characters = text;
        textNode.fontName = {
          family: FONT_CONFIG.defaultFamily,
          style: isHeader ? FONT_CONFIG.boldStyle : FONT_CONFIG.defaultStyle
        };
        textNode.fontSize = isHeader ? FONT_CONFIG.headerSize : FONT_CONFIG.cellSize;
        textNode.fills = [{ type: "SOLID", color: COLORS.black }];
        cell.appendChild(textNode);
        row.appendChild(cell);
      }
      return row;
    }
    async createTokenRow(token) {
      const row = figma.createFrame();
      row.name = token.fullPath;
      row.layoutMode = "HORIZONTAL";
      row.primaryAxisSizingMode = "FIXED";
      row.counterAxisSizingMode = "AUTO";
      row.resize(DOCUMENTATION.tableWidth, DOCUMENTATION.rowHeight);
      row.itemSpacing = DOCUMENTATION.spacing;
      row.paddingLeft = DOCUMENTATION.spacing;
      row.paddingRight = DOCUMENTATION.spacing;
      row.paddingTop = 10;
      row.paddingBottom = 10;
      row.fills = [];
      row.strokes = [{ type: "SOLID", color: COLORS.borderGray }];
      row.strokeWeight = 1;
      await figma.loadFontAsync({ family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.defaultStyle });
      const nameCell = await this.createCell(token.fullPath, DOCUMENTATION.columnWidths[0]);
      row.appendChild(nameCell);
      const typeCell = await this.createCell(token.type, DOCUMENTATION.columnWidths[1]);
      row.appendChild(typeCell);
      const valueStr = formatValue(token.originalValue, token.type);
      const valueCell = await this.createCell(valueStr, DOCUMENTATION.columnWidths[2]);
      row.appendChild(valueCell);
      const aliasCell = await this.createCell(token.aliasTo || "-", DOCUMENTATION.columnWidths[3]);
      row.appendChild(aliasCell);
      const previewCell = await this.createPreviewCell(token, DOCUMENTATION.columnWidths[4]);
      row.appendChild(previewCell);
      const descCell = await this.createCell(token.description || "-", DOCUMENTATION.columnWidths[5]);
      row.appendChild(descCell);
      return row;
    }
    async createCell(text, width) {
      const cell = figma.createFrame();
      cell.layoutMode = "HORIZONTAL";
      cell.primaryAxisSizingMode = "FIXED";
      cell.counterAxisSizingMode = "AUTO";
      cell.resize(width, cell.height);
      cell.fills = [];
      await figma.loadFontAsync({ family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.defaultStyle });
      const textNode = figma.createText();
      textNode.characters = text;
      textNode.fontName = { family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.defaultStyle };
      textNode.fontSize = FONT_CONFIG.cellSize;
      textNode.fills = [{ type: "SOLID", color: COLORS.gray }];
      cell.appendChild(textNode);
      return cell;
    }
    async createPreviewCell(token, width) {
      const cell = figma.createFrame();
      cell.layoutMode = "HORIZONTAL";
      cell.primaryAxisSizingMode = "FIXED";
      cell.counterAxisSizingMode = "AUTO";
      cell.primaryAxisAlignItems = "CENTER";
      cell.resize(width, DOCUMENTATION.previewSize);
      cell.fills = [];
      cell.itemSpacing = 6;
      switch (token.type) {
        case "color":
          if (token.value && typeof token.value === "object" && "r" in token.value) {
            const colorPreview = figma.createRectangle();
            colorPreview.resize(DOCUMENTATION.previewSize, DOCUMENTATION.previewSize);
            colorPreview.fills = [{ type: "SOLID", color: token.value }];
            colorPreview.strokes = [{ type: "SOLID", color: COLORS.lightGray }];
            colorPreview.strokeWeight = 1;
            colorPreview.cornerRadius = 4;
            cell.appendChild(colorPreview);
          }
          break;
        case "number":
          if (typeof token.value === "number") {
            await figma.loadFontAsync({ family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.defaultStyle });
            const numberText = figma.createText();
            numberText.fontName = { family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.defaultStyle };
            numberText.characters = `${token.value}`;
            numberText.fontSize = FONT_CONFIG.cellSize;
            cell.appendChild(numberText);
          }
          break;
        case "string":
        default:
          await figma.loadFontAsync({ family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.defaultStyle });
          const defaultText = figma.createText();
          defaultText.fontName = { family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.defaultStyle };
          const displayValue = String(token.value).substring(0, 15);
          defaultText.characters = displayValue;
          defaultText.fontSize = 10;
          cell.appendChild(defaultText);
      }
      return cell;
    }
  };

  // src/main.ts
  var variableManager = new VariableManager();
  var documentationGenerator = new DocumentationGenerator();
  figma.showUI(__html__, { width: UI_CONFIG.width, height: UI_CONFIG.height });
  figma.ui.onmessage = async (msg) => {
    try {
      switch (msg.type) {
        case "import-tokens":
          await handleImportTokens(msg.data);
          break;
        case "generate-documentation":
          await handleGenerateDocumentation();
          break;
        case "save-github-config":
          await handleSaveGithubConfig(msg.data);
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
  async function handleGenerateDocumentation() {
    await documentationGenerator.generateDocumentation();
    figma.ui.postMessage({
      type: "documentation-success",
      message: "\u2713 Documentation generated successfully!"
    });
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
})();

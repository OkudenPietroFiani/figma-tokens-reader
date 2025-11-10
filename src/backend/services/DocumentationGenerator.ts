// ====================================================================================
// DOCUMENTATION GENERATOR
// Generate visual documentation tables in Figma
// ====================================================================================

import { Result, Success, Failure, DocumentationOptions, DocumentationResult, DocumentationTokenRow, TokenFile, TokenMetadata } from '../../shared/types';
import {
  getEnabledColumns,
  calculateColumnWidths,
  DOCUMENTATION_LAYOUT_CONFIG,
  extractCategoryFromPath,
  formatTokenValue,
  formatNumber,
  DOCUMENTATION_TYPOGRAPHY,
} from '../../shared/documentation-config';
import { TokenVisualizerRegistry } from '../../core/registries/TokenVisualizerRegistry';
import { DefaultVisualizer } from '../../core/visualizers/DefaultVisualizer';

/**
 * DocumentationGenerator
 *
 * Principles:
 * - Single Responsibility: Generates Figma documentation tables
 * - Configuration-Driven: Uses extensible column config
 * - Strategy Pattern: Uses TokenVisualizerRegistry for visualizations
 *
 * Architecture:
 * - Parses token files into rows
 * - Groups tokens by category
 * - Creates table structure with auto-layout
 * - Delegates visualization to registered visualizers
 */
export class DocumentationGenerator {
  private fontFamily: string;
  private defaultVisualizer: DefaultVisualizer;

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
  async generate(
    tokenFiles: Map<string, TokenFile>,
    tokenMetadata: TokenMetadata[],
    options: DocumentationOptions
  ): Promise<Result<DocumentationResult>> {
    try {
      // Set font family
      if (options.fontFamily) {
        this.fontFamily = options.fontFamily;
      }

      // Load font
      await this.loadFont();

      // If no metadata provided, build from Figma variables
      let metadata = tokenMetadata;
      if (!metadata || metadata.length === 0) {
        console.log('[DocumentationGenerator] No metadata provided, building from Figma variables...');
        const buildResult = await this.buildMetadataFromFigmaVariables();
        if (!buildResult.success) {
          return Failure(buildResult.error || 'Failed to build metadata from Figma variables');
        }
        metadata = buildResult.data!;
      }

      // Filter tokens by selected files
      const filteredMetadata = this.filterTokensByFiles(
        metadata,
        options.fileNames
      );

      if (filteredMetadata.length === 0) {
        return Failure('No tokens found in selected files or Figma variables');
      }

      // Convert to rows
      const rows = this.convertToRows(filteredMetadata);

      // Group by category
      const groupedRows = this.groupByCategory(rows);

      // Create documentation frame
      const docFrame = await this.createDocumentationFrame(
        groupedRows,
        options.includeDescriptions
      );

      // Select and zoom to the frame
      figma.currentPage.selection = [docFrame];
      figma.viewport.scrollAndZoomIntoView([docFrame]);

      return Success({
        frameId: docFrame.id,
        tokenCount: rows.length,
        categoryCount: Object.keys(groupedRows).length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DocumentationGenerator] Generation failed:', message);
      return Failure(`Documentation generation failed: ${message}`);
    }
  }

  /**
   * Load font for documentation
   * Loads Regular and Bold styles needed for all visualizations
   */
  private async loadFont(): Promise<void> {
    try {
      await figma.loadFontAsync({ family: this.fontFamily, style: 'Regular' });
      await figma.loadFontAsync({ family: this.fontFamily, style: 'Bold' });
    } catch (error) {
      // Try fallback fonts
      for (const fallback of DOCUMENTATION_TYPOGRAPHY.fallbackFonts) {
        try {
          await figma.loadFontAsync({ family: fallback, style: 'Regular' });
          await figma.loadFontAsync({ family: fallback, style: 'Bold' });
          this.fontFamily = fallback;
          console.log(`[DocumentationGenerator] Using fallback font: ${fallback}`);
          return;
        } catch {
          continue;
        }
      }
      throw new Error('Failed to load any font');
    }
  }

  /**
   * Recursively resolve a variable value until we get a non-alias value
   */
  private async resolveVariableValue(variable: Variable, modeId: string): Promise<any> {
    let currentValue = variable.valuesByMode[modeId];
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    // Keep resolving until we get a non-alias value
    while (typeof currentValue === 'object' && currentValue !== null && 'type' in currentValue && currentValue.type === 'VARIABLE_ALIAS') {
      iterations++;
      if (iterations > maxIterations) {
        console.warn(`[resolveVariableValue] Max iterations reached for ${variable.name}, stopping`);
        break;
      }

      const aliasedVar = await figma.variables.getVariableByIdAsync((currentValue as VariableAlias).id);
      if (!aliasedVar) {
        console.warn(`[resolveVariableValue] Could not resolve alias for ${variable.name}`);
        break;
      }

      currentValue = aliasedVar.valuesByMode[modeId];
    }

    return currentValue;
  }

  /**
   * Build metadata from Figma variables
   * Used when no metadata is provided from VariableManager
   */
  private async buildMetadataFromFigmaVariables(): Promise<Result<TokenMetadata[]>> {
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const metadata: TokenMetadata[] = [];

      for (const collection of collections) {
        // Use async version to fetch variables
        for (const variableId of collection.variableIds) {
          const variable = await figma.variables.getVariableByIdAsync(variableId);
          if (!variable) continue;

          // Get the default mode value
          const defaultModeId = collection.modes[0].modeId;
          let value = variable.valuesByMode[defaultModeId];
          let originalValue = value;
          let resolvedValue = value;

          // If value is a VariableAlias, keep reference and resolve it recursively
          if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS') {
            const aliasedVariable = await figma.variables.getVariableByIdAsync((value as VariableAlias).id);
            if (aliasedVariable) {
              // Store reference as {token.name} format
              const referenceName = aliasedVariable.name.replace(/\//g, '.');
              originalValue = `{${referenceName}}`;
              // Recursively resolve the value until we get a non-alias
              resolvedValue = await this.resolveVariableValue(aliasedVariable, defaultModeId);
              // Use resolved value for type detection and visualization
              value = resolvedValue;
            }
          }

          // Build metadata
          // Convert Figma variable name (with /) to token nomenclature (with .)
          const tokenName = variable.name.replace(/\//g, '.');
          const tokenType = this.mapVariableTypeToTokenType(variable.resolvedType, variable.name, value);

          metadata.push({
            name: tokenName,
            fullPath: tokenName,
            type: tokenType,
            value: resolvedValue, // Use resolved value for visualization
            originalValue: originalValue, // Keep original (reference or actual value)
            description: variable.description || '',
            collection: collection.name,
          });
        }
      }

      console.log(`[DocumentationGenerator] Built metadata for ${metadata.length} variables`);
      return Success(metadata);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DocumentationGenerator] Failed to build metadata:', message);
      return Failure(`Failed to build metadata from Figma variables: ${message}`);
    }
  }

  /**
   * Map Figma variable type to token type with intelligent detection
   */
  private mapVariableTypeToTokenType(variableType: VariableResolvedDataType, variableName: string, value: any): string {
    // Handle color type
    if (variableType === 'COLOR') {
      return 'color';
    }

    // For FLOAT type, detect specific token types based on name and value
    if (variableType === 'FLOAT') {
      const nameLower = variableName.toLowerCase();

      // Detect font weight tokens (check before fontSize)
      if (nameLower.includes('fontweight') || nameLower.includes('font-weight') ||
          nameLower.includes('weight') && (nameLower.includes('font') || nameLower.includes('text'))) {
        return 'fontWeight';
      }

      // Detect border radius tokens
      if (nameLower.includes('borderradius') || nameLower.includes('border-radius') ||
          nameLower.includes('radius') || nameLower.includes('corner')) {
        return 'borderRadius';
      }

      // Detect spacing/dimension tokens
      if (nameLower.includes('spacing') || nameLower.includes('space') ||
          nameLower.includes('gap') || nameLower.includes('margin') ||
          nameLower.includes('padding') || nameLower.includes('dimension')) {
        return 'spacing';
      }

      // Detect fontSize tokens
      if (nameLower.includes('fontsize') || nameLower.includes('font-size') ||
          nameLower.includes('size') && (nameLower.includes('text') || nameLower.includes('font'))) {
        return 'fontSize';
      }

      // Default to number for other FLOAT types
      return 'number';
    }

    // Handle other types
    if (variableType === 'STRING') {
      return 'string';
    }

    if (variableType === 'BOOLEAN') {
      return 'boolean';
    }

    return 'string';
  }

  /**
   * Filter tokens by selected file names
   */
  private filterTokensByFiles(
    metadata: TokenMetadata[],
    fileNames: string[]
  ): TokenMetadata[] {
    // If no filtering needed, return all
    if (fileNames.length === 0) {
      return metadata;
    }

    // Filter by collection (file name)
    // Match against both the exact collection name and partial filename matches
    return metadata.filter(token => {
      const collectionLower = token.collection.toLowerCase();
      return fileNames.some(fileName => {
        const fileNameLower = fileName.toLowerCase();
        // Check if collection contains filename or vice versa
        return collectionLower.includes(fileNameLower) ||
               fileNameLower.includes(collectionLower);
      });
    });
  }

  /**
   * Convert token metadata to documentation rows
   */
  private convertToRows(metadata: TokenMetadata[]): DocumentationTokenRow[] {
    return metadata.map(token => ({
      name: token.name,
      value: this.formatValue(token.originalValue || token.value, token.type),
      resolvedValue: this.formatResolvedValue(token.value, token.type),
      type: token.type,
      description: token.description || '',
      category: extractCategoryFromPath(token.fullPath),
      path: token.fullPath,
      originalToken: token,
    }));
  }

  /**
   * Group rows by collection (primitive, semantic, etc.)
   */
  private groupByCategory(rows: DocumentationTokenRow[]): Record<string, DocumentationTokenRow[]> {
    const grouped: Record<string, DocumentationTokenRow[]> = {};

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
  private formatValue(value: any, type: string): string {
    // Check if it's a token reference
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      return value; // Return reference as-is
    }

    // Otherwise format the value
    return this.formatResolvedValue(value, type);
  }

  /**
   * Format resolved value for display
   * Always shows the final computed value, never a reference
   */
  private formatResolvedValue(value: any, type: string): string {
    if (value === null || value === undefined) {
      return '—';
    }

    // Handle color values
    if (type === 'color') {
      return this.formatColorValue(value);
    }

    // Handle numeric values
    if (typeof value === 'number') {
      // Check if it should be in rem
      if (type === 'fontSize' || type === 'lineHeight') {
        const remValue = value / 16;
        return `${formatNumber(remValue)}rem`;
      }
      // Otherwise show as px
      if (type === 'dimension' || type === 'spacing') {
        return `${formatNumber(value)}px`;
      }
      // Other numbers with precision formatting
      return formatNumber(value);
    }

    // Handle string values
    if (typeof value === 'string') {
      return value;
    }

    // Handle boolean values
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    // Handle objects (shouldn't happen for resolved values)
    if (typeof value === 'object') {
      if ('r' in value && 'g' in value && 'b' in value) {
        return this.rgbToHex(value as RGB);
      }
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Format color value to hex or other format
   */
  private formatColorValue(value: any): string {
    // Already a string (hex, hsl, etc.)
    if (typeof value === 'string') {
      return value;
    }

    // RGB object
    if (typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
      return this.rgbToHex(value as RGB);
    }

    return formatTokenValue(value, 'color');
  }

  /**
   * Convert RGB object to hex string
   * Handles both Figma format (0-1 floats) and standard format (0-255 integers)
   */
  private rgbToHex(rgb: RGB): string {
    // Figma uses 0-1 range, check if values are in that range
    const isFigmaFormat = rgb.r <= 1 && rgb.g <= 1 && rgb.b <= 1;

    const r = Math.round(isFigmaFormat ? rgb.r * 255 : rgb.r);
    const g = Math.round(isFigmaFormat ? rgb.g * 255 : rgb.g);
    const b = Math.round(isFigmaFormat ? rgb.b * 255 : rgb.b);

    const toHex = (n: number) => {
      const clamped = Math.max(0, Math.min(255, n)); // Clamp to valid range
      const hex = clamped.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  /**
   * Create the main documentation frame
   */
  private async createDocumentationFrame(
    groupedRows: Record<string, DocumentationTokenRow[]>,
    includeDescriptions: boolean
  ): FrameNode {
    const mainFrame = figma.createFrame();
    mainFrame.name = 'Token Documentation';
    mainFrame.fills = [{ type: 'SOLID', color: DOCUMENTATION_LAYOUT_CONFIG.global.backgroundColor }];

    // Auto-layout vertical
    mainFrame.layoutMode = 'VERTICAL';
    mainFrame.primaryAxisSizingMode = 'AUTO';
    mainFrame.counterAxisSizingMode = 'AUTO';
    mainFrame.itemSpacing = DOCUMENTATION_LAYOUT_CONFIG.global.gap;
    mainFrame.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.global.padding;
    mainFrame.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.global.padding;
    mainFrame.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.global.padding;
    mainFrame.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.global.padding;

    // Create a collection section for each group
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
  private async createCollectionSection(
    collection: string,
    rows: DocumentationTokenRow[],
    includeDescriptions: boolean
  ): Promise<FrameNode> {
    const sectionFrame = figma.createFrame();
    sectionFrame.name = `Collection: ${collection}`;
    sectionFrame.fills = [];

    // Auto-layout vertical
    sectionFrame.layoutMode = 'VERTICAL';
    sectionFrame.primaryAxisSizingMode = 'AUTO';
    sectionFrame.counterAxisSizingMode = 'AUTO';
    sectionFrame.itemSpacing = DOCUMENTATION_LAYOUT_CONFIG.category.gap;

    // Title
    const title = figma.createText();
    title.name = 'Title';
    title.characters = collection.charAt(0).toUpperCase() + collection.slice(1);
    title.fontSize = DOCUMENTATION_LAYOUT_CONFIG.category.titleFontSize;
    title.fontName = { family: this.fontFamily, style: 'Bold' };
    title.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    sectionFrame.appendChild(title);

    // Table
    const table = await this.createTable(rows, includeDescriptions);
    sectionFrame.appendChild(table);

    return sectionFrame;
  }

  /**
   * Create table with header and rows
   */
  private async createTable(
    rows: DocumentationTokenRow[],
    includeDescriptions: boolean
  ): Promise<FrameNode> {
    const tableFrame = figma.createFrame();
    tableFrame.name = 'Table';
    tableFrame.fills = [];

    // Get columns (filter out description if not included)
    let columns = getEnabledColumns();
    if (!includeDescriptions) {
      columns = columns.filter(col => col.key !== 'description');
    }

    // Use fixed table width from config
    const tableWidth = DOCUMENTATION_LAYOUT_CONFIG.table.width;

    // Calculate individual column widths
    const columnWidths = calculateColumnWidths(tableWidth, includeDescriptions);

    // Auto-layout vertical with fixed width
    tableFrame.layoutMode = 'VERTICAL';
    tableFrame.primaryAxisSizingMode = 'AUTO';
    tableFrame.counterAxisSizingMode = 'FIXED';
    tableFrame.resize(tableWidth, 100); // Width fixed, height will grow
    tableFrame.itemSpacing = DOCUMENTATION_LAYOUT_CONFIG.table.gap;

    // Header row
    const headerRow = this.createHeaderRow(columns, columnWidths, tableWidth);
    tableFrame.appendChild(headerRow);

    // Data rows
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
  private createHeaderRow(
    columns: Array<{ key: string; label: string; widthRatio: number }>,
    columnWidths: Map<string, number>,
    tableWidth: number
  ): FrameNode {
    const rowFrame = figma.createFrame();
    rowFrame.name = 'Header Row';
    rowFrame.fills = [{ type: 'SOLID', color: DOCUMENTATION_LAYOUT_CONFIG.header.backgroundColor }];

    // Auto-layout horizontal with fixed width, auto height
    rowFrame.layoutMode = 'HORIZONTAL';
    rowFrame.primaryAxisSizingMode = 'FIXED';
    rowFrame.counterAxisSizingMode = 'AUTO'; // Allow height to adapt to content
    rowFrame.resize(tableWidth, DOCUMENTATION_LAYOUT_CONFIG.table.headerHeight); // Initial height

    for (const column of columns) {
      const width = columnWidths.get(column.key) || 200; // Fallback width
      const cell = this.createHeaderCell(column.label, width);
      rowFrame.appendChild(cell);
    }

    return rowFrame;
  }

  /**
   * Create header cell
   */
  private createHeaderCell(label: string, width: number): FrameNode {
    const cellFrame = figma.createFrame();
    cellFrame.name = `Header: ${label}`;
    cellFrame.resize(width, DOCUMENTATION_LAYOUT_CONFIG.table.headerHeight);
    cellFrame.fills = [];

    // Auto-layout with FIXED width, AUTO height
    cellFrame.layoutMode = 'HORIZONTAL';
    cellFrame.primaryAxisSizingMode = 'FIXED'; // Fix width
    cellFrame.counterAxisSizingMode = 'AUTO'; // Allow height to adapt
    cellFrame.primaryAxisAlignItems = 'CENTER';
    cellFrame.counterAxisAlignItems = 'CENTER';
    cellFrame.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
    cellFrame.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
    cellFrame.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
    cellFrame.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;

    const text = figma.createText();
    text.characters = label;
    text.fontSize = DOCUMENTATION_LAYOUT_CONFIG.header.fontSize;
    text.fontName = { family: this.fontFamily, style: 'Bold' };
    text.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];

    cellFrame.appendChild(text);
    return cellFrame;
  }

  /**
   * Create data row
   */
  private async createDataRow(
    row: DocumentationTokenRow,
    columns: Array<{ key: string; label: string; widthRatio: number }>,
    columnWidths: Map<string, number>,
    isAlternate: boolean,
    tableWidth: number
  ): Promise<FrameNode> {
    const rowFrame = figma.createFrame();
    rowFrame.name = `Row: ${row.name}`;

    const bgColor = isAlternate
      ? DOCUMENTATION_LAYOUT_CONFIG.row.alternateBackgroundColor
      : DOCUMENTATION_LAYOUT_CONFIG.row.backgroundColor;
    rowFrame.fills = [{ type: 'SOLID', color: bgColor }];

    // Auto-layout horizontal with fixed width, auto height
    rowFrame.layoutMode = 'HORIZONTAL';
    rowFrame.primaryAxisSizingMode = 'FIXED';
    rowFrame.counterAxisSizingMode = 'AUTO'; // Allow height to adapt to content
    rowFrame.resize(tableWidth, DOCUMENTATION_LAYOUT_CONFIG.table.rowHeight); // Initial height

    for (const column of columns) {
      const cellWidth = columnWidths.get(column.key) || DOCUMENTATION_LAYOUT_CONFIG.table.minColumnWidth;
      let cell: FrameNode;

      if (column.key === 'visualization') {
        cell = await this.createVisualizationCell(row, cellWidth);
      } else {
        const value = this.getCellValue(row, column.key);
        cell = this.createTextCell(value, cellWidth);
      }

      rowFrame.appendChild(cell);
    }

    return rowFrame;
  }

  /**
   * Get cell value from row
   */
  private getCellValue(row: DocumentationTokenRow, key: string): string {
    switch (key) {
      case 'name':
        return row.name;
      case 'value':
        return row.value;
      case 'resolvedValue':
        return row.resolvedValue;
      case 'description':
        return row.description || '—';
      default:
        return '—';
    }
  }

  /**
   * Create text cell
   */
  private createTextCell(value: string, width: number): FrameNode {
    const cellFrame = figma.createFrame();
    cellFrame.name = 'Cell';
    cellFrame.resize(width, DOCUMENTATION_LAYOUT_CONFIG.table.rowHeight);
    cellFrame.fills = [];

    // Auto-layout with FIXED width, HUG height
    cellFrame.layoutMode = 'HORIZONTAL';
    cellFrame.primaryAxisSizingMode = 'FIXED'; // Fix width
    cellFrame.counterAxisSizingMode = 'AUTO'; // Allow height to adapt
    cellFrame.primaryAxisAlignItems = 'CENTER';
    cellFrame.counterAxisAlignItems = 'CENTER';
    cellFrame.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
    cellFrame.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
    cellFrame.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
    cellFrame.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;

    const text = figma.createText();
    text.characters = value;
    text.fontSize = DOCUMENTATION_LAYOUT_CONFIG.cell.fontSize;
    text.fontName = { family: this.fontFamily, style: 'Regular' };
    text.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }];

    cellFrame.appendChild(text);
    return cellFrame;
  }

  /**
   * Create visualization cell
   */
  private async createVisualizationCell(row: DocumentationTokenRow, width: number): Promise<FrameNode> {
    const cellFrame = figma.createFrame();
    cellFrame.name = 'Visualization Cell';
    cellFrame.resize(width, DOCUMENTATION_LAYOUT_CONFIG.table.rowHeight);
    cellFrame.fills = [];

    // Auto-layout with FIXED width, AUTO height
    cellFrame.layoutMode = 'HORIZONTAL';
    cellFrame.primaryAxisSizingMode = 'FIXED'; // Fix width
    cellFrame.counterAxisSizingMode = 'AUTO'; // Allow height to adapt
    cellFrame.primaryAxisAlignItems = 'CENTER';
    cellFrame.counterAxisAlignItems = 'CENTER';
    cellFrame.paddingTop = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
    cellFrame.paddingBottom = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;

    // Get visualizer
    const visualizer = TokenVisualizerRegistry.getForToken(row.originalToken) || this.defaultVisualizer;

    // Render visualization
    const visualization = visualizer.renderVisualization(
      row.originalToken,
      width,
      DOCUMENTATION_LAYOUT_CONFIG.table.rowHeight
    );

    cellFrame.appendChild(visualization);
    return cellFrame;
  }
}

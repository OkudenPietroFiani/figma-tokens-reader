// ====================================================================================
// DOCUMENTATION GENERATOR
// Generate visual documentation tables in Figma
// ====================================================================================

import { Result, Success, Failure, DocumentationOptions, DocumentationResult, DocumentationTokenRow, TokenFile, TokenMetadata } from '../../shared/types';
import {
  getEnabledColumns,
  getTableWidth,
  DOCUMENTATION_LAYOUT_CONFIG,
  extractCategoryFromPath,
  formatTokenValue,
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
   * Build metadata from Figma variables
   * Used when no metadata is provided from VariableManager
   */
  private async buildMetadataFromFigmaVariables(): Promise<Result<TokenMetadata[]>> {
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const metadata: TokenMetadata[] = [];

      for (const collection of collections) {
        const variables = collection.variableIds.map(id => figma.variables.getVariableById(id)!);

        for (const variable of variables) {
          if (!variable) continue;

          // Get the default mode value
          const defaultModeId = collection.modes[0].modeId;
          const value = variable.valuesByMode[defaultModeId];

          // Build metadata
          metadata.push({
            name: variable.name,
            fullPath: variable.name,
            type: this.mapVariableTypeToTokenType(variable.resolvedType),
            value: value,
            originalValue: value,
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
   * Map Figma variable type to token type
   */
  private mapVariableTypeToTokenType(variableType: VariableResolvedDataType): string {
    switch (variableType) {
      case 'COLOR':
        return 'color';
      case 'FLOAT':
        return 'number';
      case 'STRING':
        return 'string';
      case 'BOOLEAN':
        return 'boolean';
      default:
        return 'string';
    }
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
        return `${value / 16}rem`; // Assuming 16px base
      }
      // Otherwise show as px
      if (type === 'dimension' || type === 'spacing') {
        return `${value}px`;
      }
      return String(value);
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
   */
  private rgbToHex(rgb: RGB): string {
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);

    const toHex = (n: number) => {
      const hex = n.toString(16);
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

    // Calculate fixed table width
    const tableWidth = getTableWidth(includeDescriptions);

    // Auto-layout vertical with fixed width
    tableFrame.layoutMode = 'VERTICAL';
    tableFrame.primaryAxisSizingMode = 'AUTO';
    tableFrame.counterAxisSizingMode = 'FIXED';
    tableFrame.resize(tableWidth, 100); // Width fixed, height will grow
    tableFrame.itemSpacing = DOCUMENTATION_LAYOUT_CONFIG.table.gap;

    // Header row
    const headerRow = this.createHeaderRow(columns, tableWidth);
    tableFrame.appendChild(headerRow);

    // Data rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const isAlternate = i % 2 === 1;
      const dataRow = await this.createDataRow(row, columns, isAlternate, tableWidth);
      tableFrame.appendChild(dataRow);
    }

    return tableFrame;
  }

  /**
   * Create header row
   */
  private createHeaderRow(columns: Array<{ key: string; label: string; width: number }>, tableWidth: number): FrameNode {
    const rowFrame = figma.createFrame();
    rowFrame.name = 'Header Row';
    rowFrame.fills = [{ type: 'SOLID', color: DOCUMENTATION_LAYOUT_CONFIG.header.backgroundColor }];

    // Auto-layout horizontal with fixed width
    rowFrame.layoutMode = 'HORIZONTAL';
    rowFrame.primaryAxisSizingMode = 'FIXED';
    rowFrame.counterAxisSizingMode = 'FIXED';
    rowFrame.resize(tableWidth, DOCUMENTATION_LAYOUT_CONFIG.table.headerHeight);

    for (const column of columns) {
      const cell = this.createHeaderCell(column.label, column.width);
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

    // Auto-layout
    cellFrame.layoutMode = 'HORIZONTAL';
    cellFrame.primaryAxisAlignItems = 'CENTER';
    cellFrame.counterAxisAlignItems = 'CENTER';
    cellFrame.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
    cellFrame.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;

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
    columns: Array<{ key: string; label: string; width: number }>,
    isAlternate: boolean,
    tableWidth: number
  ): Promise<FrameNode> {
    const rowFrame = figma.createFrame();
    rowFrame.name = `Row: ${row.name}`;

    const bgColor = isAlternate
      ? DOCUMENTATION_LAYOUT_CONFIG.row.alternateBackgroundColor
      : DOCUMENTATION_LAYOUT_CONFIG.row.backgroundColor;
    rowFrame.fills = [{ type: 'SOLID', color: bgColor }];

    // Auto-layout horizontal with fixed width
    rowFrame.layoutMode = 'HORIZONTAL';
    rowFrame.primaryAxisSizingMode = 'FIXED';
    rowFrame.counterAxisSizingMode = 'FIXED';
    rowFrame.resize(tableWidth, DOCUMENTATION_LAYOUT_CONFIG.table.rowHeight);

    for (const column of columns) {
      let cell: FrameNode;

      if (column.key === 'visualization') {
        cell = await this.createVisualizationCell(row, column.width);
      } else {
        const value = this.getCellValue(row, column.key);
        cell = this.createTextCell(value, column.width);
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

    // Auto-layout
    cellFrame.layoutMode = 'HORIZONTAL';
    cellFrame.primaryAxisAlignItems = 'CENTER';
    cellFrame.counterAxisAlignItems = 'CENTER';
    cellFrame.paddingLeft = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;
    cellFrame.paddingRight = DOCUMENTATION_LAYOUT_CONFIG.cell.padding;

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

// Documentation generation service - reads from existing Figma variables

import { DOCUMENTATION, FONT_CONFIG, COLORS } from '../constants';
import { TokenMetadata } from '../types';
import { formatValue } from '../utils/parser';

export class DocumentationGenerator {
  async generateDocumentation(): Promise<void> {
    // Read all existing variable collections
    const collections = await figma.variables.getLocalVariableCollectionsAsync();

    if (collections.length === 0) {
      figma.notify('No variable collections found. Please create some variables first.', { timeout: 3000 });
      return;
    }

    const startX = figma.viewport.center.x - 400;
    let currentY = figma.viewport.center.y;

    // Create documentation for each collection
    for (const collection of collections) {
      const tokens = await this.extractTokensFromCollection(collection);

      if (tokens.length > 0) {
        await this.createDocumentationFrame(collection.name, tokens, startX, currentY);
        currentY += 100; // Spacing between frames
      }
    }

    figma.notify('Documentation generated successfully', { timeout: 3000 });
  }

  private async extractTokensFromCollection(collection: VariableCollection): Promise<TokenMetadata[]> {
    const tokens: TokenMetadata[] = [];

    for (const variableId of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(variableId);
      if (!variable) continue;

      // Get the value from the first mode
      const modeId = collection.modes[0].modeId;
      const valueForMode = variable.valuesByMode[modeId];

      let value: any;
      let aliasTo: string | undefined;
      let originalValue: any = valueForMode;

      // Check if it's an alias
      if (typeof valueForMode === 'object' && valueForMode !== null && 'type' in valueForMode) {
        if (valueForMode.type === 'VARIABLE_ALIAS') {
          const aliasedVariable = await figma.variables.getVariableByIdAsync(valueForMode.id);
          if (aliasedVariable) {
            aliasTo = aliasedVariable.name;
            // Get the actual value from the aliased variable
            value = aliasedVariable.valuesByMode[collection.modes[0].modeId];
          }
        }
      } else {
        value = valueForMode;
      }

      const type = this.figmaTypeToTokenType(variable.resolvedType);

      const metadata: TokenMetadata = {
        name: variable.name.split('/').pop() || variable.name,
        fullPath: `${collection.name.toLowerCase()}.${variable.name.replace(/\//g, '.')}`,
        type: type,
        value: value,
        originalValue: originalValue,
        description: variable.description || undefined,
        aliasTo: aliasTo,
        collection: collection.name
      };

      tokens.push(metadata);
    }

    return tokens;
  }

  private figmaTypeToTokenType(figmaType: VariableResolvedDataType): string {
    switch (figmaType) {
      case 'COLOR':
        return 'color';
      case 'FLOAT':
        return 'number';
      case 'STRING':
        return 'string';
      default:
        return 'string';
    }
  }

  private async createDocumentationFrame(title: string, tokens: TokenMetadata[], x: number, y: number): Promise<void> {
    const frame = figma.createFrame();
    frame.name = `${title} Documentation`;
    frame.x = x;
    frame.y = y;
    frame.fills = [{ type: 'SOLID', color: COLORS.white }];
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    frame.paddingTop = DOCUMENTATION.padding;
    frame.paddingBottom = DOCUMENTATION.padding;
    frame.paddingLeft = DOCUMENTATION.padding;
    frame.paddingRight = DOCUMENTATION.padding;
    frame.itemSpacing = 0;

    // Add title
    const titleText = figma.createText();
    await figma.loadFontAsync({ family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.boldStyle });
    titleText.fontName = { family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.boldStyle };
    titleText.fontSize = FONT_CONFIG.titleSize;
    titleText.characters = title;
    titleText.fills = [{ type: 'SOLID', color: COLORS.black }];
    frame.appendChild(titleText);

    // Add spacing
    const spacer = figma.createRectangle();
    spacer.resize(1, DOCUMENTATION.titleSpacing);
    spacer.fills = [];
    frame.appendChild(spacer);

    // Create table header
    const headerRow = await this.createTableRow(
      ['Name', 'Type', 'Value', 'Alias', 'Preview', 'Description'],
      true
    );
    frame.appendChild(headerRow);

    // Add token rows
    for (const token of tokens) {
      const row = await this.createTokenRow(token);
      frame.appendChild(row);
    }

    figma.currentPage.appendChild(frame);
  }

  private async createTableRow(cells: string[], isHeader: boolean = false): Promise<FrameNode> {
    const row = figma.createFrame();
    row.name = isHeader ? 'Header' : 'Row';
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'AUTO';
    row.resize(DOCUMENTATION.tableWidth, isHeader ? DOCUMENTATION.headerHeight : DOCUMENTATION.rowHeight);
    row.itemSpacing = DOCUMENTATION.spacing;
    row.paddingLeft = DOCUMENTATION.spacing;
    row.paddingRight = DOCUMENTATION.spacing;
    row.paddingTop = 10;
    row.paddingBottom = 10;
    row.fills = isHeader ? [{ type: 'SOLID', color: COLORS.backgroundGray }] : [];

    await figma.loadFontAsync({
      family: FONT_CONFIG.defaultFamily,
      style: isHeader ? FONT_CONFIG.boldStyle : FONT_CONFIG.defaultStyle
    });

    for (let index = 0; index < cells.length; index++) {
      const text = cells[index];
      const cell = figma.createFrame();
      cell.name = `Cell ${index}`;
      cell.layoutMode = 'HORIZONTAL';
      cell.primaryAxisSizingMode = 'FIXED';
      cell.counterAxisSizingMode = 'AUTO';
      cell.resize(DOCUMENTATION.columnWidths[index], cell.height);
      cell.fills = [];

      const textNode = figma.createText();
      textNode.characters = text;
      textNode.fontName = {
        family: FONT_CONFIG.defaultFamily,
        style: isHeader ? FONT_CONFIG.boldStyle : FONT_CONFIG.defaultStyle
      };
      textNode.fontSize = isHeader ? FONT_CONFIG.headerSize : FONT_CONFIG.cellSize;
      textNode.fills = [{ type: 'SOLID', color: COLORS.black }];

      cell.appendChild(textNode);
      row.appendChild(cell);
    }

    return row;
  }

  private async createTokenRow(token: TokenMetadata): Promise<FrameNode> {
    const row = figma.createFrame();
    row.name = token.fullPath;
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'AUTO';
    row.resize(DOCUMENTATION.tableWidth, DOCUMENTATION.rowHeight);
    row.itemSpacing = DOCUMENTATION.spacing;
    row.paddingLeft = DOCUMENTATION.spacing;
    row.paddingRight = DOCUMENTATION.spacing;
    row.paddingTop = 10;
    row.paddingBottom = 10;
    row.fills = [];
    row.strokes = [{ type: 'SOLID', color: COLORS.borderGray }];
    row.strokeWeight = 1;

    await figma.loadFontAsync({ family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.defaultStyle });

    // Name
    const nameCell = await this.createCell(token.fullPath, DOCUMENTATION.columnWidths[0]);
    row.appendChild(nameCell);

    // Type
    const typeCell = await this.createCell(token.type, DOCUMENTATION.columnWidths[1]);
    row.appendChild(typeCell);

    // Value
    const valueStr = formatValue(token.originalValue, token.type);
    const valueCell = await this.createCell(valueStr, DOCUMENTATION.columnWidths[2]);
    row.appendChild(valueCell);

    // Alias
    const aliasCell = await this.createCell(token.aliasTo || '-', DOCUMENTATION.columnWidths[3]);
    row.appendChild(aliasCell);

    // Preview
    const previewCell = await this.createPreviewCell(token, DOCUMENTATION.columnWidths[4]);
    row.appendChild(previewCell);

    // Description
    const descCell = await this.createCell(token.description || '-', DOCUMENTATION.columnWidths[5]);
    row.appendChild(descCell);

    return row;
  }

  private async createCell(text: string, width: number): Promise<FrameNode> {
    const cell = figma.createFrame();
    cell.layoutMode = 'HORIZONTAL';
    cell.primaryAxisSizingMode = 'FIXED';
    cell.counterAxisSizingMode = 'AUTO';
    cell.resize(width, cell.height);
    cell.fills = [];

    await figma.loadFontAsync({ family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.defaultStyle });
    const textNode = figma.createText();
    textNode.characters = text;
    textNode.fontName = { family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.defaultStyle };
    textNode.fontSize = FONT_CONFIG.cellSize;
    textNode.fills = [{ type: 'SOLID', color: COLORS.gray }];

    cell.appendChild(textNode);
    return cell;
  }

  private async createPreviewCell(token: TokenMetadata, width: number): Promise<FrameNode> {
    const cell = figma.createFrame();
    cell.layoutMode = 'HORIZONTAL';
    cell.primaryAxisSizingMode = 'FIXED';
    cell.counterAxisSizingMode = 'AUTO';
    cell.primaryAxisAlignItems = 'CENTER';
    cell.resize(width, DOCUMENTATION.previewSize);
    cell.fills = [];
    cell.itemSpacing = 6;

    switch (token.type) {
      case 'color':
        if (token.value && typeof token.value === 'object' && 'r' in token.value) {
          const colorPreview = figma.createRectangle();
          colorPreview.resize(DOCUMENTATION.previewSize, DOCUMENTATION.previewSize);
          colorPreview.fills = [{ type: 'SOLID', color: token.value }];
          colorPreview.strokes = [{ type: 'SOLID', color: COLORS.lightGray }];
          colorPreview.strokeWeight = 1;
          colorPreview.cornerRadius = 4;
          cell.appendChild(colorPreview);
        }
        break;

      case 'number':
        if (typeof token.value === 'number') {
          await figma.loadFontAsync({ family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.defaultStyle });
          const numberText = figma.createText();
          numberText.fontName = { family: FONT_CONFIG.defaultFamily, style: FONT_CONFIG.defaultStyle };
          numberText.characters = `${token.value}`;
          numberText.fontSize = FONT_CONFIG.cellSize;
          cell.appendChild(numberText);
        }
        break;

      case 'string':
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
}

// Figma variable management service

import { COLLECTION_NAMES } from '../constants';
import { DesignToken, TokenData, ImportStats, TokenMetadata } from '../types';
import { inferTokenType } from '../utils/parser';
import { mapTokenTypeToFigma, processTokenValue } from '../utils/tokenProcessor';

export class VariableManager {
  private variableMap: Map<string, Variable>;
  private collectionMap: Map<string, VariableCollection>;
  private tokenMetadata: TokenMetadata[];
  private importStats: ImportStats;

  constructor() {
    this.variableMap = new Map();
    this.collectionMap = new Map();
    this.tokenMetadata = [];
    this.importStats = { added: 0, updated: 0, skipped: 0 };
  }

  async importTokens(primitives: TokenData, semantics: TokenData): Promise<ImportStats> {
    try {
      // Reset stats and metadata
      this.importStats = { added: 0, updated: 0, skipped: 0 };
      this.tokenMetadata = [];

      // Get existing collections
      const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();

      // Create or get collections
      let primitiveCollection = existingCollections.find(c => c.name === COLLECTION_NAMES.primitive);
      let semanticCollection = existingCollections.find(c => c.name === COLLECTION_NAMES.semantic);

      if (!primitiveCollection) {
        primitiveCollection = figma.variables.createVariableCollection(COLLECTION_NAMES.primitive);
      }
      if (!semanticCollection) {
        semanticCollection = figma.variables.createVariableCollection(COLLECTION_NAMES.semantic);
      }

      this.collectionMap.set(COLLECTION_NAMES.primitive, primitiveCollection);
      this.collectionMap.set(COLLECTION_NAMES.semantic, semanticCollection);

      // Flatten and process primitives first (they have no dependencies)
      if (primitives) {
        const flattenedPrimitives = this.flattenTokenFiles(primitives);
        await this.processTokenGroup(flattenedPrimitives, COLLECTION_NAMES.primitive, primitiveCollection, []);
      }

      // Flatten and process semantics (they may reference primitives)
      if (semantics) {
        const flattenedSemantics = this.flattenTokenFiles(semantics);
        await this.processTokenGroup(flattenedSemantics, COLLECTION_NAMES.semantic, semanticCollection, []);
      }

      figma.notify(
        `✓ Tokens imported: ${this.importStats.added} added, ${this.importStats.updated} updated`,
        { timeout: 3000 }
      );

      return this.importStats;
    } catch (error) {
      throw new Error(`Failed to import tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Flatten token files structure to merge multiple files into a single token tree
   * Handles both direct token structure and file-keyed structure (e.g., { "file.json": {...} })
   */
  private flattenTokenFiles(data: TokenData): TokenData {
    if (!data || typeof data !== 'object') {
      return {};
    }

    // Check if this is a file-keyed structure (keys are filenames ending in .json)
    const keys = Object.keys(data);
    const isFileKeyed = keys.some(key =>
      key.endsWith('.json') || key.includes('-json') || key.includes('_json')
    );

    if (isFileKeyed) {
      // Merge all files into a single flat structure
      const merged: TokenData = {};
      for (const [fileName, fileContent] of Object.entries(data)) {
        if (fileContent && typeof fileContent === 'object') {
          // Merge file contents into the root level
          Object.assign(merged, fileContent);
        }
      }
      return merged;
    }

    // Already flat structure, return as is
    return data;
  }

  private async processTokenGroup(
    tokens: TokenData,
    collectionName: string,
    collection: VariableCollection,
    pathPrefix: string[]
  ): Promise<void> {
    for (const [key, value] of Object.entries(tokens)) {
      const currentPath = [...pathPrefix, key];

      // Check if this is a token (has $value) or a group
      if (value && typeof value === 'object') {
        if ('$value' in value) {
          // This is a token
          await this.createVariable(value, currentPath, collection, collectionName);
        } else {
          // This is a group, recurse
          await this.processTokenGroup(value, collectionName, collection, currentPath);
        }
      }
    }
  }

  private async createVariable(
    token: DesignToken,
    path: string[],
    collection: VariableCollection,
    collectionName: string
  ): Promise<void> {
    try {
      // Sanitize variable name - Figma requires alphanumeric, hyphens, underscores, slashes
      // Join path segments with '/' for Figma's grouping
      const variableName = path.map(segment =>
        segment.replace(/[^a-zA-Z0-9-_]/g, '-')
      ).join('/');

      const tokenType = token.$type || inferTokenType(token.$value);
      const figmaType = mapTokenTypeToFigma(tokenType);

      // Check if variable already exists
      let variable = await this.findVariableByName(variableName, collection);
      let isNewVariable = false;

      if (!variable) {
        variable = figma.variables.createVariable(variableName, collection, figmaType);
        isNewVariable = true;
        this.importStats.added++;
      } else {
        // Update existing variable type if needed
        if (variable.resolvedType !== figmaType) {
          variable = figma.variables.createVariable(variableName + '_new', collection, figmaType);
          isNewVariable = true;
          this.importStats.added++;
        } else {
          this.importStats.updated++;
        }
      }

      // Process and set the value
      const processedValue = await processTokenValue(token.$value, tokenType, this.variableMap);

      // Get the default mode
      const modeId = collection.modes[0].modeId;

      // Set the value
      if (processedValue.isAlias && processedValue.aliasVariable) {
        variable.setValueForMode(modeId, { type: 'VARIABLE_ALIAS', id: processedValue.aliasVariable.id });
      } else {
        variable.setValueForMode(modeId, processedValue.value);
      }

      // Store variable for reference resolution
      this.variableMap.set(variableName, variable);

      // Set description if available
      if (token.$description) {
        variable.description = token.$description;
      }

      // Store token metadata for documentation
      const fullPath = `${collectionName.toLowerCase()}.${path.join('.')}`;
      const metadata: TokenMetadata = {
        name: path[path.length - 1],
        fullPath: fullPath,
        type: tokenType,
        value: processedValue.value,
        originalValue: token.$value,
        description: token.$description,
        aliasTo: processedValue.isAlias && processedValue.aliasVariable ? processedValue.aliasVariable.name : undefined,
        collection: collectionName
      };
      this.tokenMetadata.push(metadata);
    } catch (error) {
      console.error(`Error creating variable ${path.join('/')}: ${error}`);
      this.importStats.skipped++;
      // Don't throw - continue with other tokens
    }
  }

  private async findVariableByName(name: string, collection: VariableCollection): Promise<Variable | null> {
    const variablePromises = collection.variableIds.map(id => figma.variables.getVariableByIdAsync(id));
    const allVariables = await Promise.all(variablePromises);
    return allVariables.find(v => v && v.name === name) || null;
  }

  getTokenMetadata(): TokenMetadata[] {
    return this.tokenMetadata;
  }
}

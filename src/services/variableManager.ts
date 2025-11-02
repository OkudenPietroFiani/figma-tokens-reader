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

      // Get or create collections
      const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
      const primitiveCollection = this.getOrCreateCollection(existingCollections, COLLECTION_NAMES.primitive);
      const semanticCollection = this.getOrCreateCollection(existingCollections, COLLECTION_NAMES.semantic);

      this.collectionMap.set(COLLECTION_NAMES.primitive, primitiveCollection);
      this.collectionMap.set(COLLECTION_NAMES.semantic, semanticCollection);

      // Process primitives first (they have no dependencies)
      if (primitives) {
        const cleanedPrimitives = this.prepareTokensForImport(primitives, 'primitive');
        await this.processTokenGroup(cleanedPrimitives, COLLECTION_NAMES.primitive, primitiveCollection, []);
      }

      // Process semantics (they may reference primitives)
      if (semantics) {
        const cleanedSemantics = this.prepareTokensForImport(semantics, 'semantic');
        await this.processTokenGroup(cleanedSemantics, COLLECTION_NAMES.semantic, semanticCollection, []);
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
   * Get existing collection or create a new one
   */
  private getOrCreateCollection(
    existingCollections: VariableCollection[],
    name: string
  ): VariableCollection {
    let collection = existingCollections.find(c => c.name === name);
    if (!collection) {
      collection = figma.variables.createVariableCollection(name);
    }
    return collection;
  }

  /**
   * Prepare tokens for import by:
   * 1. Unwrapping file-keyed structure (multiple files)
   * 2. Removing redundant collection-name wrapper from EACH file
   * 3. Deep merging all token trees
   */
  private prepareTokensForImport(data: TokenData, collectionType: 'primitive' | 'semantic'): TokenData {
    if (!data || typeof data !== 'object') {
      return {};
    }

    console.log(`[${collectionType}] Input keys:`, Object.keys(data));

    // Check if this is a file-keyed structure
    const isFileKeyed = this.isFileKeyedStructure(data);

    if (isFileKeyed) {
      console.log(`[${collectionType}] Processing file-keyed structure`);
      // Process each file individually: unwrap, then merge
      return this.mergeTokenFiles(data, collectionType);
    }

    // Single structure - just unwrap collection name if present
    console.log(`[${collectionType}] Processing single structure`);
    return this.unwrapCollectionKey(data, collectionType);
  }

  /**
   * Check if data structure has file names as keys
   */
  private isFileKeyedStructure(data: TokenData): boolean {
    const keys = Object.keys(data);
    return keys.some(key =>
      key.endsWith('.json') ||
      key.includes('-json') ||
      key.includes('_json')
    );
  }

  /**
   * Merge multiple token files:
   * 1. Unwrap collection name from each file individually
   * 2. Deep merge the unwrapped contents
   */
  private mergeTokenFiles(filesData: TokenData, collectionType: 'primitive' | 'semantic'): TokenData {
    const merged: TokenData = {};

    for (const [fileName, fileContent] of Object.entries(filesData)) {
      if (!fileContent || typeof fileContent !== 'object') continue;

      console.log(`[${collectionType}] Processing file: ${fileName}, keys:`, Object.keys(fileContent));

      // IMPORTANT: Unwrap collection name from THIS file's content BEFORE merging
      const unwrapped = this.unwrapCollectionKey(fileContent, collectionType);

      console.log(`[${collectionType}] After unwrap:`, Object.keys(unwrapped));

      // Deep merge (don't use Object.assign - it overwrites!)
      this.deepMerge(merged, unwrapped);
    }

    console.log(`[${collectionType}] Final merged keys:`, Object.keys(merged));
    return merged;
  }

  /**
   * Remove redundant top-level key that matches collection name
   * Handles: "primitive", "primitives", "semantic", "semantics"
   */
  private unwrapCollectionKey(data: TokenData, collectionType: 'primitive' | 'semantic'): TokenData {
    const keys = Object.keys(data);

    // Only unwrap if there's exactly one top-level key
    if (keys.length !== 1) {
      return data;
    }

    const topKey = keys[0];
    const normalizedKey = topKey.toLowerCase();

    // Check if key matches collection name (with or without 's')
    const matchesCollection =
      normalizedKey === collectionType ||
      normalizedKey === collectionType + 's' ||
      normalizedKey === collectionType.replace(/s$/, '');

    if (matchesCollection) {
      const unwrapped = data[topKey];
      if (unwrapped && typeof unwrapped === 'object') {
        console.log(`Unwrapped redundant '${topKey}' key`);
        return unwrapped as TokenData;
      }
    }

    return data;
  }

  /**
   * Deep merge source into target (handles nested objects correctly)
   */
  private deepMerge(target: TokenData, source: TokenData): void {
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !('$value' in value)) {
        // It's a nested group (not a token), merge recursively
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        this.deepMerge(target[key] as TokenData, value as TokenData);
      } else {
        // It's a token or primitive value, assign directly
        target[key] = value;
      }
    }
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

      // Set CSS variable code syntax for developers
      this.setCodeSyntax(variable, path, collectionName);

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

  /**
   * Set CSS variable code syntax for easy developer access
   * Format: --collection-name-path-to-token
   */
  private setCodeSyntax(variable: Variable, path: string[], collectionName: string): void {
    try {
      // Build CSS variable name: --primitive-spacing-sm or --semantic-colors-primary
      const collection = collectionName.toLowerCase();
      const tokenPath = path.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const cssVarName = `--${collection}-${tokenPath}`;

      // Set code syntax for Web/CSS
      variable.codeSyntax = {
        WEB: cssVarName,
        ANDROID: `${collection}.${path.join('.')}`,
        iOS: `${collection}.${path.join('.')}`
      };
    } catch (error) {
      console.error(`Error setting code syntax for ${path.join('/')}: ${error}`);
      // Non-fatal error, continue
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

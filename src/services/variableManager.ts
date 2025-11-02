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
        console.log('\n=== PROCESSING PRIMITIVES ===');
        const cleanedPrimitives = this.prepareAndValidateTokens(primitives, 'primitive');
        await this.processTokenGroup(cleanedPrimitives, COLLECTION_NAMES.primitive, primitiveCollection, []);
      }

      // Process semantics (they may reference primitives)
      if (semantics) {
        console.log('\n=== PROCESSING SEMANTICS ===');
        const cleanedSemantics = this.prepareAndValidateTokens(semantics, 'semantic');
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
   * Handles renaming old uppercase collections to lowercase
   */
  private getOrCreateCollection(
    existingCollections: VariableCollection[],
    name: string
  ): VariableCollection {
    // First, try to find exact match (lowercase)
    let collection = existingCollections.find(c => c.name === name);

    if (!collection) {
      // Check for old uppercase version (Primitive, Semantic)
      const uppercaseName = name.charAt(0).toUpperCase() + name.slice(1);
      const oldCollection = existingCollections.find(c => c.name === uppercaseName);

      if (oldCollection) {
        // Rename the old collection to lowercase
        console.log(`Renaming collection from '${uppercaseName}' to '${name}'`);
        oldCollection.name = name;
        collection = oldCollection;
      } else {
        // Create new collection with lowercase name
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
  private prepareAndValidateTokens(data: TokenData, collectionType: 'primitive' | 'semantic'): TokenData {
    console.log(`\n[PREPARE] Input structure for ${collectionType}:`, this.getStructureSummary(data));

    // Step 1: Check if file-keyed structure (multiple files)
    const isFileKeyed = this.isFileKeyedStructure(data);
    console.log(`[PREPARE] Is file-keyed: ${isFileKeyed}`);

    let processed: TokenData;

    if (isFileKeyed) {
      // Multiple files - process each and merge
      processed = this.processMultipleFiles(data, collectionType);
    } else {
      // Single structure - just clean it
      processed = this.removeAllCollectionWrappers(data, collectionType);
    }

    // Final validation: ensure no collection-name keys remain
    this.validateNoCollectionWrappers(processed, collectionType);

    console.log(`[PREPARE] Final structure for ${collectionType}:`, this.getStructureSummary(processed));
    return processed;
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
   * Process multiple token files and merge them
   * Clean code: Separated concerns - file processing vs merging
   */
  private processMultipleFiles(filesData: TokenData, collectionType: 'primitive' | 'semantic'): TokenData {
    console.log(`[MULTI-FILE] Processing ${Object.keys(filesData).length} files`);

    const cleanedFiles: TokenData[] = [];

    // Process each file individually
    for (const [fileName, fileContent] of Object.entries(filesData)) {
      if (!fileContent || typeof fileContent !== 'object') continue;

      console.log(`\n[FILE] Processing: ${fileName}`);
      console.log(`[FILE] Before clean:`, this.getStructureSummary(fileContent));

      // Remove ALL collection wrappers from this file
      const cleaned = this.removeAllCollectionWrappers(fileContent, collectionType);

      console.log(`[FILE] After clean:`, this.getStructureSummary(cleaned));

      cleanedFiles.push(cleaned);
    }

    // Merge all cleaned files
    const merged = this.deepMergeAll(cleanedFiles);
    console.log(`[MULTI-FILE] After merge:`, this.getStructureSummary(merged));

    return merged;
  }

  /**
   * Remove ALL collection-name wrappers recursively
   * This handles nested cases like: { "primitive": { "primitive": { ... } } }
   *
   * Clean code: Clear intent, handles edge cases
   */
  private removeAllCollectionWrappers(data: TokenData, collectionType: 'primitive' | 'semantic'): TokenData {
    let current = data;
    let iterations = 0;
    const maxIterations = 5; // Prevent infinite loops

    // Keep unwrapping until no more collection wrappers found
    while (iterations < maxIterations) {
      const keys = Object.keys(current);

      // Check if single key that matches collection name
      if (keys.length === 1) {
        const key = keys[0];
        if (this.isCollectionNameKey(key, collectionType)) {
          const unwrapped = current[key];
          if (unwrapped && typeof unwrapped === 'object' && !('$value' in unwrapped)) {
            console.log(`[UNWRAP] Removed wrapper: '${key}'`);
            current = unwrapped as TokenData;
            iterations++;
            continue;
          }
        }
      }

      // No more wrappers found
      break;
    }

    if (iterations >= maxIterations) {
      console.warn(`[UNWRAP] Warning: Max iterations reached. Possible circular structure.`);
    }

    return current;
  }

  /**
   * Check if a key matches the collection name
   * Handles: "primitive", "primitives", "semantic", "semantics"
   */
  private isCollectionNameKey(key: string, collectionType: 'primitive' | 'semantic'): boolean {
    const normalized = key.toLowerCase();
    return (
      normalized === collectionType ||
      normalized === collectionType + 's' ||
      normalized === collectionType.slice(0, -1)
    );
  }

  /**
   * Validate that no collection-name keys remain in structure
   * Throws error if found - fail fast principle
   */
  private validateNoCollectionWrappers(data: TokenData, collectionType: 'primitive' | 'semantic'): void {
    const keys = Object.keys(data);

    for (const key of keys) {
      if (this.isCollectionNameKey(key, collectionType)) {
        const value = data[key];
        // Check if it's a wrapper (object with nested structure, not a token)
        if (value && typeof value === 'object' && !('$value' in value)) {
          console.error(`[VALIDATION] Found collection wrapper that should have been removed: '${key}'`);
          console.error(`[VALIDATION] This will create duplicate levels in Figma!`);
          throw new Error(`Validation failed: Collection wrapper '${key}' still exists in ${collectionType} data`);
        }
      }
    }

    console.log(`[VALIDATION] ✓ No collection wrappers found in ${collectionType}`);
  }

  /**
   * Get structure summary for logging
   * Clean code: Helper for debugging
   */
  private getStructureSummary(data: TokenData): string {
    const keys = Object.keys(data);
    if (keys.length === 0) return '{}';
    if (keys.length <= 3) return `{ ${keys.join(', ')} }`;
    return `{ ${keys.slice(0, 3).join(', ')}, ... (${keys.length} keys) }`;
  }

  /**
   * Deep merge multiple token objects
   * Clean code: Pure function, no side effects
   */
  private deepMergeAll(sources: TokenData[]): TokenData {
    const result: TokenData = {};

    for (const source of sources) {
      this.deepMerge(result, source);
    }

    return result;
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

      if (!variable) {
        variable = figma.variables.createVariable(variableName, collection, figmaType);
        this.importStats.added++;
      } else {
        // Update existing variable type if needed
        if (variable.resolvedType !== figmaType) {
          variable = figma.variables.createVariable(variableName + '_new', collection, figmaType);
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
   * Set code syntax using Figma's official API
   * Uses setVariableCodeSyntax() method as documented
   */
  private setCodeSyntax(variable: Variable, path: string[], collectionName: string): void {
    try {
      // Build CSS variable name: --primitive-spacing-sm
      const collection = collectionName.toLowerCase();
      const tokenPath = path.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const cssVarName = `--${collection}-${tokenPath}`;

      // Use Figma's setVariableCodeSyntax() API
      // Format: variable.setVariableCodeSyntax(platform, value)
      variable.setVariableCodeSyntax('WEB', `var(${cssVarName})`);
      variable.setVariableCodeSyntax('ANDROID', `@dimen/${collection}_${path.join('_').replace(/[^a-z0-9_]/g, '_')}`);
      variable.setVariableCodeSyntax('iOS', `${collection}.${path.join('.')}`);

      console.log(`✓ Code syntax set for ${variable.name}: var(${cssVarName})`);
    } catch (error) {
      console.warn(`Could not set code syntax for ${path.join('/')}: ${error}`);
      // Non-fatal - continue import
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

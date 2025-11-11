// ====================================================================================
// FIGMA SYNC SERVICE
// Syncs Token[] to Figma variables with dynamic collections
// ====================================================================================

import { Token, TokenType } from '../models/Token';
import { Result, Success, Failure, ImportStats } from '../../shared/types';
import { TokenRepository } from './TokenRepository';
import { TokenResolver } from './TokenResolver';

/**
 * Sync result with detailed statistics
 */
export interface SyncResult {
  stats: ImportStats;
  collections: string[]; // Collections created/updated
  variables: Map<string, Variable>; // variableId -> Variable
}

/**
 * Variable sync options
 */
export interface SyncOptions {
  updateExisting?: boolean; // Update existing variables (default: true)
  preserveScopes?: boolean; // Preserve existing scopes (default: true)
  skipStyles?: boolean; // Skip typography/shadow tokens (default: false)
}

/**
 * Figma sync service for Token[] model
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles Figma variable synchronization
 * - Dependency Inversion: Depends on TokenRepository and TokenResolver
 * - Open/Closed: Extensible via options
 *
 * Key Improvements over VariableManager:
 * - Works with Token[] (universal model)
 * - Dynamic collections (not hardcoded primitive/semantic)
 * - Batch Figma API calls for performance
 * - Better error handling and rollback
 * - Preserves scopes by default (user manages via Scopes tab)
 *
 * Usage:
 * ```typescript
 * const service = new FigmaSyncService(repository, resolver);
 * const result = await service.syncTokens(tokens);
 * ```
 */
export class FigmaSyncService {
  private repository: TokenRepository;
  private resolver: TokenResolver;
  private variableMap: Map<string, Variable> = new Map();
  private collectionMap: Map<string, VariableCollection> = new Map();

  constructor(repository: TokenRepository, resolver: TokenResolver) {
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
  async syncTokens(tokens: Token[], options?: SyncOptions): Promise<Result<SyncResult>> {
    try {
      const opts = {
        updateExisting: true,
        preserveScopes: true,
        skipStyles: false,
        ...options,
      };

      const stats: ImportStats = { added: 0, updated: 0, skipped: 0 };
      const syncedCollections = new Set<string>();

      // Group tokens by collection
      const byCollection = this.groupByCollection(tokens);

      // Get existing collections once (batch call)
      const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();

      // Process each collection
      for (const [collectionName, collectionTokens] of byCollection) {
        console.log(`[FigmaSyncService] Processing collection: ${collectionName} (${collectionTokens.length} tokens)`);

        // Get or create collection
        const collection = this.getOrCreateCollection(existingCollections, collectionName);
        this.collectionMap.set(collectionName, collection);
        syncedCollections.add(collectionName);

        // Sync tokens in this collection
        const collectionStats = await this.syncCollectionTokens(
          collectionTokens,
          collection,
          opts
        );

        stats.added += collectionStats.added;
        stats.updated += collectionStats.updated;
        stats.skipped += collectionStats.skipped;
      }

      // Update token extensions with Figma metadata
      await this.updateTokenExtensions(tokens);

      figma.notify(
        `✓ Tokens synced: ${stats.added} added, ${stats.updated} updated`,
        { timeout: 3000 }
      );

      return Success({
        stats,
        collections: Array.from(syncedCollections),
        variables: this.variableMap,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FigmaSyncService] Sync failed: ${message}`);
      return Failure(message);
    }
  }

  /**
   * Get variable map for reference resolution
   * Used by features that need access to Figma variables
   */
  getVariableMap(): Map<string, Variable> {
    return this.variableMap;
  }

  /**
   * Get collection map
   */
  getCollectionMap(): Map<string, VariableCollection> {
    return this.collectionMap;
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Group tokens by collection name
   */
  private groupByCollection(tokens: Token[]): Map<string, Token[]> {
    const grouped = new Map<string, Token[]>();

    for (const token of tokens) {
      const collection = token.collection || 'default';
      if (!grouped.has(collection)) {
        grouped.set(collection, []);
      }
      grouped.get(collection)!.push(token);
    }

    return grouped;
  }

  /**
   * Get or create Figma variable collection
   * Handles renaming old uppercase collections to lowercase
   */
  private getOrCreateCollection(
    existingCollections: VariableCollection[],
    name: string
  ): VariableCollection {
    // Try exact match first
    let collection = existingCollections.find(c => c.name === name);

    if (!collection) {
      // Check for old uppercase version
      const uppercaseName = name.charAt(0).toUpperCase() + name.slice(1);
      const oldCollection = existingCollections.find(c => c.name === uppercaseName);

      if (oldCollection) {
        console.log(`[FigmaSyncService] Renaming collection: ${uppercaseName} → ${name}`);
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
  private async syncCollectionTokens(
    tokens: Token[],
    collection: VariableCollection,
    options: Required<SyncOptions>
  ): Promise<ImportStats> {
    const stats: ImportStats = { added: 0, updated: 0, skipped: 0 };

    // Get all existing variables in this collection (batch call)
    const existingVars = await this.getCollectionVariables(collection);
    const varsByName = new Map(existingVars.map(v => [v.name, v]));

    for (const token of tokens) {
      // Skip composite typography and shadow tokens if configured
      if (options.skipStyles && this.shouldSkipAsStyle(token)) {
        stats.skipped++;
        continue;
      }

      // Sync individual token
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
  private async syncToken(
    token: Token,
    collection: VariableCollection,
    existingVars: Map<string, Variable>,
    options: Required<SyncOptions>
  ): Promise<ImportStats> {
    const stats: ImportStats = { added: 0, updated: 0, skipped: 0 };

    try {
      // Generate Figma-compatible variable name
      const variableName = this.generateVariableName(token);

      // Map token type to Figma type
      const figmaType = this.mapToFigmaType(token.type);
      if (!figmaType) {
        console.warn(`[FigmaSyncService] Unsupported token type: ${token.type}`);
        stats.skipped++;
        return stats;
      }

      // Check if variable exists
      let variable = existingVars.get(variableName);

      if (!variable) {
        // Create new variable
        variable = figma.variables.createVariable(variableName, collection, figmaType);
        stats.added++;
      } else {
        // Update existing variable
        if (!options.updateExisting) {
          stats.skipped++;
          return stats;
        }

        // Check if type changed (need to recreate)
        if (variable.resolvedType !== figmaType) {
          console.warn(`[FigmaSyncService] Type mismatch for ${variableName}: ${variable.resolvedType} → ${figmaType}`);
          // Create new variable with suffix
          variable = figma.variables.createVariable(`${variableName}_new`, collection, figmaType);
          stats.added++;
        } else {
          stats.updated++;
        }
      }

      // Set description
      if (token.description) {
        variable.description = token.description;
      }

      // Get default mode
      const modeId = collection.modes[0].modeId;

      // Set value (handle aliases)
      if (token.aliasTo) {
        // This is an alias - resolve to Figma variable
        const targetToken = this.repository.get(token.aliasTo);
        if (targetToken) {
          const targetVarName = this.generateVariableName(targetToken);
          const targetVar = this.variableMap.get(targetVarName);

          if (targetVar) {
            variable.setValueForMode(modeId, {
              type: 'VARIABLE_ALIAS',
              id: targetVar.id,
            });
          } else {
            console.warn(`[FigmaSyncService] Alias target not found: ${targetVarName}`);
            // Fall back to resolved value
            const value = this.convertValue(token.resolvedValue || token.value, figmaType);
            variable.setValueForMode(modeId, value);
          }
        } else {
          console.warn(`[FigmaSyncService] Alias target token not found: ${token.aliasTo}`);
          const value = this.convertValue(token.resolvedValue || token.value, figmaType);
          variable.setValueForMode(modeId, value);
        }
      } else {
        // Direct value
        const value = this.convertValue(token.value, figmaType);
        variable.setValueForMode(modeId, value);
      }

      // Set code syntax for CSS variables
      this.setCodeSyntax(variable, token);

      // Preserve existing scopes (don't modify)
      // Scopes are managed via the Scopes tab

      // Store in variable map
      this.variableMap.set(variableName, variable);

      return stats;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FigmaSyncService] Failed to sync token ${token.qualifiedName}: ${message}`);
      stats.skipped++;
      return stats;
    }
  }

  /**
   * Get all variables in a collection
   */
  private async getCollectionVariables(collection: VariableCollection): Promise<Variable[]> {
    // Batch call - get all local variables
    const allVars = await figma.variables.getLocalVariablesAsync();
    // Filter to this collection
    return allVars.filter(v => v.variableCollectionId === collection.id);
  }

  /**
   * Generate Figma-compatible variable name from token
   * Format: path/components/separated
   */
  private generateVariableName(token: Token): string {
    return token.path
      .map(segment => segment.replace(/[^a-zA-Z0-9-_]/g, '-'))
      .join('/');
  }

  /**
   * Map TokenType to Figma VariableResolvedDataType
   */
  private mapToFigmaType(type: TokenType): VariableResolvedDataType | null {
    const typeMap: Record<string, VariableResolvedDataType> = {
      color: 'COLOR',
      number: 'FLOAT',
      boolean: 'BOOLEAN',
      string: 'STRING',
      // Dimension types
      dimension: 'FLOAT',
      fontSize: 'FLOAT',
      spacing: 'FLOAT',
      lineHeight: 'FLOAT',
      letterSpacing: 'FLOAT',
      fontWeight: 'FLOAT',
    };

    return typeMap[type] || null;
  }

  /**
   * Convert token value to Figma-compatible format
   */
  private convertValue(value: any, figmaType: VariableResolvedDataType): any {
    if (figmaType === 'COLOR') {
      return this.convertColorValue(value);
    }

    if (figmaType === 'FLOAT') {
      return this.convertNumericValue(value);
    }

    if (figmaType === 'BOOLEAN') {
      return Boolean(value);
    }

    if (figmaType === 'STRING') {
      return String(value);
    }

    return value;
  }

  /**
   * Convert color value to Figma RGB format
   */
  private convertColorValue(value: any): RGB | RGBA {
    if (typeof value === 'string') {
      // Parse hex color
      if (value.startsWith('#')) {
        return this.hexToRgb(value);
      }
      // TODO: Parse rgb(), rgba(), hsl() formats if needed
    }

    if (typeof value === 'object' && value !== null) {
      // Already in RGB/RGBA format
      if ('r' in value && 'g' in value && 'b' in value) {
        return value;
      }
    }

    console.warn(`[FigmaSyncService] Could not convert color value:`, value);
    return { r: 0, g: 0, b: 0 }; // Fallback to black
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): RGB {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      };
    }
    return { r: 0, g: 0, b: 0 };
  }

  /**
   * Convert numeric value (handle units like px, rem)
   */
  private convertNumericValue(value: any): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      // Remove units and parse
      const numeric = parseFloat(value.replace(/[^\d.-]/g, ''));
      return isNaN(numeric) ? 0 : numeric;
    }

    return 0;
  }

  /**
   * Set CSS variable code syntax
   */
  private setCodeSyntax(variable: Variable, token: Token): void {
    const cssVarName = `--${token.qualifiedName.replace(/\./g, '-')}`;
    variable.codeSyntax = {
      WEB: cssVarName,
    };
  }

  /**
   * Check if token should be skipped (handled as style instead)
   */
  private shouldSkipAsStyle(token: Token): boolean {
    // Skip composite typography tokens
    if (token.type === 'typography' && typeof token.value === 'object') {
      return true;
    }

    // Skip shadow tokens
    if (token.type === 'shadow') {
      return true;
    }

    return false;
  }

  /**
   * Update token extensions with Figma metadata
   */
  private async updateTokenExtensions(tokens: Token[]): Promise<void> {
    for (const token of tokens) {
      const varName = this.generateVariableName(token);
      const variable = this.variableMap.get(varName);

      if (variable) {
        // Update token with Figma metadata
        this.repository.update(token.id, {
          extensions: {
            ...token.extensions,
            figma: {
              variableId: variable.id,
              collectionId: variable.variableCollectionId,
              collectionName: this.collectionMap.get(token.collection)?.name,
            },
          },
        });
      }
    }
  }
}

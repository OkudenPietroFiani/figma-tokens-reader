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
  createStyles?: boolean; // Create text styles and effect styles from typography/shadow tokens (default: true)
  percentageBase?: number; // Base size for percentage calculations (default: 16px)
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
        createStyles: true,
        percentageBase: 16,
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
      // Handle typography and shadow tokens as Figma styles
      if (options.createStyles && this.isStyleToken(token)) {
        const styleStats = await this.syncAsStyle(token, options);
        stats.added += styleStats.added;
        stats.updated += styleStats.updated;
        stats.skipped += styleStats.skipped;
        continue;
      }

      // Sync individual token as variable
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
        // Direct value - use resolvedValue if available (handles embedded references)
        const valueToConvert = token.resolvedValue || token.value;
        console.log(`[FigmaSyncService] Setting value for ${variableName}:`, {
          tokenValue: token.value,
          resolvedValue: token.resolvedValue,
          tokenType: token.type,
          figmaType,
          valueType: typeof valueToConvert,
        });
        const value = this.convertValue(valueToConvert, figmaType);
        console.log(`[FigmaSyncService] Converted value for ${variableName}:`, value);
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
   * Handles: hex strings, RGB objects, HSL objects (uses hex), color objects with components
   * Note: Figma COLOR type only accepts RGB (r, g, b), not RGBA with 'a' property
   */
  private convertColorValue(value: any): RGB {
    // Handle string colors (hex format)
    if (typeof value === 'string') {
      if (value.startsWith('#')) {
        return this.hexToRgb(value);
      }
      // Handle rgb(), rgba() string formats
      if (value.startsWith('rgb')) {
        return this.parseRgbString(value);
      }
    }

    // Handle object formats
    if (typeof value === 'object' && value !== null) {
      // Format 1: Direct Figma RGB format { r: 0-1, g: 0-1, b: 0-1 }
      if ('r' in value && 'g' in value && 'b' in value) {
        // Check if values are already normalized (0-1)
        const isNormalized = value.r <= 1 && value.g <= 1 && value.b <= 1;
        if (isNormalized) {
          // Return only RGB (no alpha)
          return { r: value.r, g: value.g, b: value.b };
        }
        // Convert from 0-255 to 0-1
        return {
          r: value.r / 255,
          g: value.g / 255,
          b: value.b / 255,
        };
      }

      // Format 2: HSL colorSpace with hex fallback (common in W3C Design Tokens)
      // Example: { colorSpace: 'hsl', components: [225, 16, 92], alpha: 1, hex: '#E8E9EC' }
      if ('colorSpace' in value && value.colorSpace === 'hsl' && 'hex' in value && value.hex) {
        console.log('[FigmaSyncService] Converting HSL color using hex fallback:', value.hex);
        return this.hexToRgb(value.hex);
      }

      // Format 3: RGB colorSpace with components array
      // Example: { colorSpace: 'rgb', components: [255, 128, 0] }
      if ('colorSpace' in value && value.colorSpace === 'rgb' && Array.isArray(value.components)) {
        const [r, g, b] = value.components;
        return {
          r: r / 255,
          g: g / 255,
          b: b / 255,
        };
      }

      // Format 4: W3C color object with components array (no colorSpace)
      // Example: { components: [255, 128, 0], alpha: 1 }
      // Note: Alpha is ignored - Figma COLOR type only accepts RGB
      if ('components' in value && Array.isArray(value.components) && !('colorSpace' in value)) {
        const [r, g, b] = value.components;
        return {
          r: r / 255,
          g: g / 255,
          b: b / 255,
        };
      }
    }

    console.warn(`[FigmaSyncService] Could not convert color value:`, value);
    console.warn(`[FigmaSyncService] Value type: ${typeof value}, stringified:`, JSON.stringify(value));
    return { r: 0, g: 0, b: 0 }; // Fallback to black
  }

  /**
   * Convert color value to Figma RGBA format (for shadows and effects)
   * Similar to convertColorValue but includes alpha channel
   */
  private convertColorToRGBA(value: any): RGBA {
    // Get RGB components
    const rgb = this.convertColorValue(value);

    // Extract alpha if available
    let alpha = 1;

    if (typeof value === 'object' && value !== null) {
      if ('a' in value && typeof value.a === 'number') {
        alpha = value.a;
      } else if ('alpha' in value && typeof value.alpha === 'number') {
        alpha = value.alpha;
      }
    }

    // Parse alpha from rgba() string
    if (typeof value === 'string' && value.startsWith('rgba')) {
      const match = value.match(/rgba?\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
      if (match) {
        alpha = parseFloat(match[1]);
      }
    }

    return { ...rgb, a: alpha };
  }

  /**
   * Parse rgb() or rgba() string to RGB
   * Note: Alpha channel is ignored - Figma COLOR type only accepts RGB
   */
  private parseRgbString(rgbString: string): RGB {
    const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return {
        r: parseInt(match[1]) / 255,
        g: parseInt(match[2]) / 255,
        b: parseInt(match[3]) / 255,
      };
    }
    return { r: 0, g: 0, b: 0 };
  }

  /**
   * Convert hex color to RGB
   * Supports 3, 6, and 8 digit hex codes
   * Note: Alpha channel (8-digit hex) is ignored - Figma COLOR type only accepts RGB
   */
  private hexToRgb(hex: string): RGB {
    // Remove # if present
    const cleanHex = hex.replace(/^#/, '');

    // Handle 3-digit hex (e.g., #f80)
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
      const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
      const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
      return { r, g, b };
    }

    // Handle 6-digit hex (e.g., #ff8800)
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
      const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
      const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
      return { r, g, b };
    }

    // Handle 8-digit hex with alpha (e.g., #ff8800ff)
    // Note: Alpha is ignored - Figma COLOR type only accepts RGB
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
  private convertNumericValue(value: any, percentageBase: number = 16): number {
    // Handle direct numbers
    if (typeof value === 'number') {
      return value;
    }

    // Handle string values with units (e.g., "16px", "2.5rem", "1.5em", "50%")
    if (typeof value === 'string') {
      const match = value.match(/^([\d.-]+)(px|rem|em|%)?$/);
      if (match) {
        const numericValue = parseFloat(match[1]);
        const unit = match[2] || '';

        // Convert rem/em to px (16px base)
        if (unit === 'rem' || unit === 'em') {
          const converted = numericValue * 16;
          console.log(`[FigmaSyncService] Converted ${value} to ${converted}px`);
          return converted;
        }

        // Convert percentage to px
        if (unit === '%') {
          const converted = (numericValue / 100) * percentageBase;
          console.log(`[FigmaSyncService] Converted ${value} to ${converted}px (base: ${percentageBase}px)`);
          return converted;
        }

        return numericValue;
      }

      // Fallback: strip non-numeric
      const numeric = parseFloat(value.replace(/[^\d.-]/g, ''));
      return isNaN(numeric) ? 0 : numeric;
    }

    // Handle DimensionValue objects { value: number, unit: string }
    if (typeof value === 'object' && value !== null) {
      if ('value' in value && typeof value.value === 'number') {
        const numericValue = value.value;
        const unit = value.unit || '';

        // Convert rem/em to px (16px base)
        if (unit === 'rem' || unit === 'em') {
          const converted = numericValue * 16;
          console.log(`[FigmaSyncService] Converted ${numericValue}${unit} to ${converted}px`);
          return converted;
        }

        // Convert percentage to px
        if (unit === '%') {
          const converted = (numericValue / 100) * percentageBase;
          console.log(`[FigmaSyncService] Converted ${numericValue}${unit} to ${converted}px (base: ${percentageBase}px)`);
          return converted;
        }

        return numericValue;
      }

      // Handle { components: [number] } format
      if ('components' in value && Array.isArray(value.components) && value.components.length > 0) {
        const firstComponent = value.components[0];
        if (typeof firstComponent === 'number') {
          return firstComponent;
        }
        if (typeof firstComponent === 'string') {
          const numeric = parseFloat(firstComponent.replace(/[^\d.-]/g, ''));
          return isNaN(numeric) ? 0 : numeric;
        }
      }
    }

    console.warn('[FigmaSyncService] Could not convert value to number:', value);
    return 0;
  }

  /**
   * Set CSS variable code syntax using Figma's official API
   * Uses setVariableCodeSyntax() method for proper syntax setting
   */
  private setCodeSyntax(variable: Variable, token: Token): void {
    try {
      // Build CSS variable name from token path
      const cssVarName = `--${token.path.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

      console.log(`[FigmaSyncService] Setting code syntax for ${token.qualifiedName}: ${cssVarName}`);

      // Check if method exists (plugin API version check)
      if (typeof variable.setVariableCodeSyntax === 'function') {
        // Web: CSS variable reference
        variable.setVariableCodeSyntax('WEB', cssVarName);

        // Android: resource reference
        const androidPath = token.path.join('_').toLowerCase().replace(/[^a-z0-9_]/g, '_');
        variable.setVariableCodeSyntax('ANDROID', `@dimen/${androidPath}`);

        // iOS: dot notation
        variable.setVariableCodeSyntax('iOS', token.path.join('.'));

        console.log(`[FigmaSyncService] Code syntax set successfully for ${token.qualifiedName}`);
      } else {
        console.warn(`[FigmaSyncService] setVariableCodeSyntax method not available (old Figma version?)`);
      }
    } catch (error) {
      console.error(`[FigmaSyncService] Failed to set code syntax for ${token.qualifiedName}:`, error);
      // Non-fatal error - continue sync
    }
  }

  /**
   * Check if token should be handled as a Figma style (not variable)
   *
   * Typography tokens become Text Styles
   * Shadow tokens become Effect Styles
   */
  private isStyleToken(token: Token): boolean {
    // Composite typography tokens should be text styles
    // But only if it's a LEAF token with typography properties, not a group
    if (token.type === 'typography') {
      const value = token.resolvedValue || token.value;
      if (typeof value === 'object' && value !== null) {
        // Check if it has at least one typography property (leaf token)
        // Group tokens won't have these specific properties
        const hasTypographyProps =
          'fontFamily' in value ||
          'fontSize' in value ||
          'fontWeight' in value ||
          'lineHeight' in value ||
          'letterSpacing' in value;
        return hasTypographyProps;
      }
    }

    // Shadow tokens should be effect styles
    // Only if it's a LEAF token with shadow properties, not a group
    if (token.type === 'shadow') {
      const value = token.resolvedValue || token.value;
      if (typeof value === 'object' && value !== null) {
        // Check if it has shadow properties (leaf token)
        const hasShadowProps =
          'offsetX' in value ||
          'offsetY' in value ||
          'blur' in value ||
          'color' in value;
        return hasShadowProps;
      }
    }

    return false;
  }

  /**
   * Sync token as Figma style (text style or effect style)
   */
  private async syncAsStyle(token: Token, options: Required<SyncOptions>): Promise<ImportStats> {
    if (token.type === 'typography') {
      return this.createTextStyle(token, options);
    }

    if (token.type === 'shadow') {
      return this.createEffectStyle(token, options);
    }

    // Shouldn't reach here
    return { added: 0, updated: 0, skipped: 1 };
  }

  /**
   * Resolve nested references in a composite value
   * Example: { fontFamily: "{primitive.typography.font-family.primary}" }
   * Becomes: { fontFamily: "Inter" }
   */
  private resolveNestedReferences(value: any, projectId: string): any {
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      // It's a reference - try to resolve it
      const referencePath = value.slice(1, -1); // Remove { }
      const referencedToken = this.repository.getByQualifiedName(projectId, referencePath);

      if (referencedToken) {
        const resolvedValue = referencedToken.resolvedValue || referencedToken.value;
        console.log(`[FigmaSyncService] Resolved nested reference ${value} → ${JSON.stringify(resolvedValue)}`);
        return resolvedValue;
      } else {
        console.warn(`[FigmaSyncService] Could not resolve nested reference: ${value}`);
        return value; // Return as-is if can't resolve
      }
    }

    if (typeof value === 'object' && value !== null) {
      // Recursively resolve all properties in the object
      const resolved: any = Array.isArray(value) ? [] : {};
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
  private async createTextStyle(token: Token, options: Required<SyncOptions>): Promise<ImportStats> {
    const stats: ImportStats = { added: 0, updated: 0, skipped: 0 };

    try {
      const value = token.resolvedValue || token.value;

      if (typeof value !== 'object' || value === null) {
        console.warn(`[FigmaSyncService] Typography token ${token.qualifiedName} has invalid value type`);
        stats.skipped++;
        return stats;
      }

      // CRITICAL: Resolve nested references in composite value
      // Typography tokens can have references like: { fontFamily: "{primitive.typography.font-family.primary}" }
      const resolvedValue = this.resolveNestedReferences(value, token.projectId);
      const typValue = resolvedValue as any; // TypographyValue

      console.log(`[FigmaSyncService] Processing typography token ${token.qualifiedName}:`, {
        fontFamily: typValue.fontFamily,
        fontSize: typValue.fontSize,
        fontWeight: typValue.fontWeight,
        lineHeight: typValue.lineHeight,
        letterSpacing: typValue.letterSpacing,
      });

      const styleName = token.path.join('/');

      // Find existing text style (use async API)
      const existingStyles = await figma.getLocalTextStylesAsync();
      let textStyle = existingStyles.find(s => s.name === styleName);

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

      // Set text style properties
      if (token.description) {
        textStyle.description = token.description;
      }

      // Font family and style
      if (typValue.fontFamily) {
        try {
          const fontFamily = typeof typValue.fontFamily === 'string' ? typValue.fontFamily : typValue.fontFamily[0];
          const fontWeight = typValue.fontWeight || 400;
          const fontStyle = this.mapFontWeightToStyle(fontWeight);

          console.log(`[FigmaSyncService] Loading font: ${fontFamily} ${fontStyle}`);
          await figma.loadFontAsync({ family: fontFamily, style: fontStyle });
          textStyle.fontName = { family: fontFamily, style: fontStyle };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[FigmaSyncService] Could not load font ${typValue.fontFamily}: ${message}`);
          throw error; // Re-throw to skip this style
        }
      }

      // Font size (CRITICAL: validate >= 1)
      if (typValue.fontSize !== undefined) {
        const fontSize = this.convertNumericValue(typValue.fontSize, options.percentageBase);
        console.log(`[FigmaSyncService] Font size converted: ${typValue.fontSize} → ${fontSize}px`);

        if (fontSize < 1) {
          console.error(`[FigmaSyncService] Invalid font size: ${fontSize}px (must be >= 1). Original value: ${typValue.fontSize}`);
          throw new Error(`Font size must be >= 1 (got ${fontSize})`);
        }

        textStyle.fontSize = fontSize;
      }

      // Line height
      if (typValue.lineHeight !== undefined) {
        const lineHeight = this.convertNumericValue(typValue.lineHeight, options.percentageBase);
        console.log(`[FigmaSyncService] Line height converted: ${typValue.lineHeight} → ${lineHeight}px`);
        textStyle.lineHeight = { value: lineHeight, unit: 'PIXELS' };
      }

      // Letter spacing
      if (typValue.letterSpacing !== undefined) {
        const letterSpacing = this.convertNumericValue(typValue.letterSpacing, options.percentageBase);
        console.log(`[FigmaSyncService] Letter spacing converted: ${typValue.letterSpacing} → ${letterSpacing}px`);
        textStyle.letterSpacing = { value: letterSpacing, unit: 'PIXELS' };
      }

      return stats;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FigmaSyncService] Failed to create text style ${token.qualifiedName}: ${message}`);
      stats.skipped++;
      return stats;
    }
  }

  /**
   * Create or update Figma Effect Style from shadow token
   */
  private async createEffectStyle(token: Token, options: Required<SyncOptions>): Promise<ImportStats> {
    const stats: ImportStats = { added: 0, updated: 0, skipped: 0 };

    try {
      const value = token.resolvedValue || token.value;

      if (typeof value !== 'object' || value === null) {
        console.warn(`[FigmaSyncService] Shadow token ${token.qualifiedName} has invalid value type`);
        stats.skipped++;
        return stats;
      }

      // CRITICAL: Resolve nested references in composite value
      // Shadow tokens can have references like: { color: "{primitive.color.neutral.900}" }
      const resolvedValue = this.resolveNestedReferences(value, token.projectId);
      const shadowValue = resolvedValue as any; // ShadowValue

      const styleName = token.path.join('/');

      // Find existing effect style (use async API)
      const existingStyles = await figma.getLocalEffectStylesAsync();
      let effectStyle = existingStyles.find(s => s.name === styleName);

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

      // Set effect style description
      if (token.description) {
        effectStyle.description = token.description;
      }

      // Create shadow effect (drop shadow or inner shadow)
      const shadowEffect: DropShadowEffect | InnerShadowEffect = shadowValue.inset
        ? {
            type: 'INNER_SHADOW',
            visible: true,
            color: this.convertColorToRGBA(shadowValue.color),
            offset: {
              x: this.convertNumericValue(shadowValue.offsetX, options.percentageBase),
              y: this.convertNumericValue(shadowValue.offsetY, options.percentageBase),
            },
            radius: this.convertNumericValue(shadowValue.blur, options.percentageBase),
            spread: shadowValue.spread ? this.convertNumericValue(shadowValue.spread, options.percentageBase) : 0,
            blendMode: 'NORMAL',
          }
        : {
            type: 'DROP_SHADOW',
            visible: true,
            color: this.convertColorToRGBA(shadowValue.color),
            offset: {
              x: this.convertNumericValue(shadowValue.offsetX, options.percentageBase),
              y: this.convertNumericValue(shadowValue.offsetY, options.percentageBase),
            },
            radius: this.convertNumericValue(shadowValue.blur, options.percentageBase),
            spread: shadowValue.spread ? this.convertNumericValue(shadowValue.spread, options.percentageBase) : 0,
            blendMode: 'NORMAL',
          };

      effectStyle.effects = [shadowEffect];

      return stats;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FigmaSyncService] Failed to create effect style ${token.qualifiedName}: ${message}`);
      stats.skipped++;
      return stats;
    }
  }

  /**
   * Map font weight to Figma font style
   */
  private mapFontWeightToStyle(weight: number | string): string {
    const numWeight = typeof weight === 'number' ? weight : parseInt(weight);

    const weightMap: Record<number, string> = {
      100: 'Thin',
      200: 'ExtraLight',
      300: 'Light',
      400: 'Regular',
      500: 'Medium',
      600: 'SemiBold',
      700: 'Bold',
      800: 'ExtraBold',
      900: 'Black',
    };

    return weightMap[numWeight] || 'Regular';
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

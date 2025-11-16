// ====================================================================================
// TOKEN PROCESSOR
// Converts format-specific tokens to universal Token model
// ====================================================================================

import { Token, TokenType, TokenStatus, TokenSource } from '../models/Token';
import { ProcessedToken, TokenData } from '../../shared/types';
import { ITokenFormatStrategy } from '../interfaces/ITokenFormatStrategy';
import { TokenFormatRegistry } from '../registries/TokenFormatRegistry';
import { Result, Success, Failure } from '../../shared/types';
import { deepClone } from '../../shared/utils';
import { isFeatureEnabled } from '../config/FeatureFlags';

/**
 * Token processing options
 */
export interface ProcessingOptions {
  projectId: string;
  collection?: string; // Default collection name if not specified
  theme?: string;
  brand?: string;
  sourceType: 'github' | 'gitlab' | 'local' | 'api' | 'figma';
  sourceLocation: string;
  sourceBranch?: string;
  sourceCommit?: string;
}

/**
 * Token processor for format-agnostic token conversion
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles token conversion to universal format
 * - Open/Closed: Extensible via format strategies
 * - Dependency Inversion: Depends on ITokenFormatStrategy abstraction
 *
 * Architecture:
 * - Bridges format strategies (W3C, Style Dictionary) to Token model
 * - Generates stable IDs for tokens
 * - Infers collection from file paths if not specified
 * - Preserves format-specific metadata in extensions
 *
 * Usage:
 * ```typescript
 * const processor = new TokenProcessor(repository);
 * const tokens = await processor.processTokenData(data, options);
 * ```
 */
export class TokenProcessor {
  /**
   * Process raw token data into Token[] using auto-detected format
   *
   * @param data - Raw token data
   * @param options - Processing options (projectId, source info, etc.)
   * @returns Array of processed tokens
   */
  async processTokenData(
    data: TokenData,
    options: ProcessingOptions
  ): Promise<Result<Token[]>> {
    try {
      // Auto-detect format
      const strategy = TokenFormatRegistry.detectFormat(data);
      if (!strategy) {
        return Failure('Could not detect token format');
      }

      // Parse using format strategy
      const parseResult = strategy.parseTokens(data);
      if (!parseResult.success) {
        return Failure(`Failed to parse tokens: ${parseResult.error}`);
      }

      // Convert ProcessedToken[] to Token[]
      const tokens = this.convertProcessedTokens(
        parseResult.data || [],
        strategy,
        options
      );

      return Success(tokens);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[TokenProcessor] Failed to process token data: ${message}`);
      return Failure(message);
    }
  }

  /**
   * Process multiple token files
   *
   * @param files - Array of {data, collection} objects
   * @param options - Processing options
   * @returns Combined array of tokens from all files
   */
  async processMultipleFiles(
    files: Array<{ data: TokenData; collection?: string; filePath?: string }>,
    options: ProcessingOptions
  ): Promise<Result<Token[]>> {
    try {
      const allTokens: Token[] = [];

      for (const file of files) {
        // Infer collection from file path if not specified
        const collection = file.collection || this.inferCollectionFromPath(file.filePath);

        const result = await this.processTokenData(file.data, {
          ...options,
          collection,
        });

        if (result.success && result.data) {
          allTokens.push(...result.data);
        } else {
          console.warn(`[TokenProcessor] Failed to process file: ${result.error}`);
        }
      }

      if (allTokens.length === 0) {
        return Failure('No tokens could be processed from the provided files');
      }

      return Success(allTokens);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[TokenProcessor] Failed to process multiple files: ${message}`);
      return Failure(message);
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Convert ProcessedToken[] to Token[]
   */
  private convertProcessedTokens(
    processed: ProcessedToken[],
    strategy: ITokenFormatStrategy,
    options: ProcessingOptions
  ): Token[] {
    const now = new Date().toISOString();
    const tokens: Token[] = [];

    for (const pt of processed) {
      // Generate stable token ID
      const id = this.generateTokenId(options.projectId, pt.path);

      // Build qualified name
      const qualifiedName = pt.path.join('.');

      // Extract name (last component of path)
      const name = pt.path[pt.path.length - 1];

      // Determine if this is an alias
      const isAlias = strategy.isReference(pt.value);
      const aliasTo = isAlias ? strategy.extractReference(pt.value) : undefined;

      // Map format-specific type to TokenType
      const type = this.mapToTokenType(pt.type);

      // Build source info
      const source: TokenSource = {
        type: options.sourceType,
        location: options.sourceLocation,
        imported: now,
        branch: options.sourceBranch,
        commit: options.sourceCommit,
      };

      // Determine collection
      const collection = options.collection || 'default';

      // Get format name
      const formatInfo = strategy.getFormatInfo();
      const sourceFormat = this.mapFormatName(formatInfo.name);

      // Create token (deep clone values to prevent shared references)
      const token: Token = {
        id,
        path: pt.path,
        name,
        qualifiedName,
        type,
        rawValue: deepClone(pt.originalValue !== undefined ? pt.originalValue : pt.value),
        value: deepClone(pt.value),
        resolvedValue: isAlias ? undefined : deepClone(pt.value),
        aliasTo: aliasTo ? this.generateTokenId(options.projectId, aliasTo.split('.')) : undefined,
        projectId: options.projectId,
        collection,
        theme: options.theme,
        brand: options.brand,
        sourceFormat,
        source,
        extensions: {},
        tags: this.inferTags(pt.path, pt.type),
        status: 'active' as TokenStatus,
        created: now,
        lastModified: now,
      };

      tokens.push(token);
    }

    return tokens;
  }

  /**
   * Generate stable token ID
   */
  private generateTokenId(projectId: string, path: string[]): string {
    const key = `${projectId}:${path.join('.')}`;
    return this.simpleHash(key);
  }

  /**
   * Simple hash function for ID generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `token_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Map format-specific type to TokenType
   */
  private mapToTokenType(type: string): TokenType {
    const normalized = type.toLowerCase();

    // Direct mappings
    const typeMap: Record<string, TokenType> = {
      color: 'color',
      dimension: 'dimension',
      fontsize: 'fontSize',
      fontweight: 'fontWeight',
      fontfamily: 'fontFamily',
      lineheight: 'lineHeight',
      letterspacing: 'letterSpacing',
      spacing: 'spacing',
      shadow: 'shadow',
      border: 'border',
      duration: 'duration',
      cubicbezier: 'cubicBezier',
      number: 'number',
      string: 'string',
      typography: 'typography',
      boolean: 'boolean',
    };

    // Handle variations
    if (normalized.includes('font')) {
      if (normalized.includes('size')) return 'fontSize';
      if (normalized.includes('weight')) return 'fontWeight';
      if (normalized.includes('family')) return 'fontFamily';
    }

    if (normalized.includes('line') && normalized.includes('height')) {
      return 'lineHeight';
    }

    if (normalized.includes('letter') && normalized.includes('spacing')) {
      return 'letterSpacing';
    }

    return typeMap[normalized] || 'other';
  }

  /**
   * Map format name to source format type
   */
  private mapFormatName(formatName: string): Token['sourceFormat'] {
    const normalized = formatName.toLowerCase();

    if (normalized.includes('w3c')) return 'w3c';
    if (normalized.includes('style') && normalized.includes('dictionary')) return 'style-dictionary';
    if (normalized.includes('figma')) return 'figma';

    return 'custom';
  }

  /**
   * Infer collection from file path
   * Examples:
   * - tokens/primitives.json -> primitives
   * - tokens/semantic/colors.json -> semantic
   * - colors.json -> default
   */
  private inferCollectionFromPath(filePath?: string): string {
    if (!filePath) return 'default';

    const parts = filePath.toLowerCase().split('/');

    // Check for common collection names
    const collectionKeywords = [
      'primitive',
      'primitives',
      'semantic',
      'semantics',
      'base',
      'core',
      'foundation',
      'component',
      'components',
    ];

    for (const part of parts) {
      for (const keyword of collectionKeywords) {
        if (part.includes(keyword)) {
          return part.replace(/\.(json|js|ts)$/i, '');
        }
      }
    }

    // Fall back to filename without extension
    const filename = parts[parts.length - 1];
    return filename.replace(/\.(json|js|ts)$/i, '') || 'default';
  }

  /**
   * Infer tags from token path and type
   */
  private inferTags(path: string[], type: string): string[] {
    const tags: string[] = [];

    // Add type as tag
    tags.push(type);

    // Add path components as tags (useful for filtering)
    if (path.length > 1) {
      // Add category (first component)
      tags.push(path[0]);

      // Add semantic group if present (second component)
      if (path.length > 2) {
        tags.push(`${path[0]}.${path[1]}`);
      }
    }

    return tags;
  }
}

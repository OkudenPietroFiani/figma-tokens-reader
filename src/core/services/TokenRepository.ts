// ====================================================================================
// TOKEN REPOSITORY
// In-memory token storage with indexed queries
// ====================================================================================

import { Token, TokenType, TokenUpdate } from '../models/Token';
import { Result, Success, Failure } from '../../shared/types';
import { isFeatureEnabled } from '../config/FeatureFlags';
import { validateToken } from '../validation/schemas';

/**
 * Query interface for filtering tokens
 */
export interface TokenQuery {
  projectId?: string;
  type?: TokenType;
  types?: TokenType[];
  collection?: string;
  theme?: string;
  brand?: string;
  path?: string[];
  pathPrefix?: string[]; // Tokens starting with this path
  qualifiedName?: string;
  tags?: string[];
  status?: Token['status'];
  isAlias?: boolean;
  ids?: string[];
}

/**
 * Repository statistics
 */
export interface RepositoryStats {
  totalTokens: number;
  byProject: Record<string, number>;
  byType: Partial<Record<TokenType, number>>;
  byCollection: Record<string, number>;
  aliasCount: number;
  circularReferenceCount: number;
}

/**
 * In-memory token repository with O(1) indexed lookups
 *
 * SOLID Principles:
 * - Single Responsibility: Only manages token storage and retrieval
 * - Open/Closed: Extensible via query interface
 * - Liskov Substitution: Adheres to repository pattern
 * - Interface Segregation: Focused storage interface
 * - Dependency Inversion: Services depend on this abstraction
 *
 * Performance:
 * - O(1) lookups by ID
 * - O(1) lookups by qualified name (via index)
 * - O(k) filtering by type, project, etc. (k = result set size)
 * - Maintains multiple indexes for fast queries
 */
export class TokenRepository {
  // Primary storage
  private tokens: Map<string, Token> = new Map();

  // Indexes for fast lookups
  private projectIndex: Map<string, Set<string>> = new Map();
  private typeIndex: Map<TokenType, Set<string>> = new Map();
  private collectionIndex: Map<string, Set<string>> = new Map();
  private pathIndex: Map<string, string> = new Map(); // qualifiedName -> id
  private aliasIndex: Map<string, Set<string>> = new Map(); // target id -> referrer ids
  private tagIndex: Map<string, Set<string>> = new Map();

  /**
   * Generate stable token ID from projectId and path
   * Uses hash to ensure consistent IDs across sessions
   */
  public generateTokenId(projectId: string, path: string[]): string {
    const key = `${projectId}:${path.join('.')}`;
    // In browser environment, use a simple hash
    // In Node, could use crypto.createHash('sha256')
    return this.simpleHash(key);
  }

  /**
   * Simple hash function for browser compatibility
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
   * Add or update tokens in the repository
   * Updates all indexes automatically
   *
   * @param tokens - Array of tokens to add/update
   * @returns Success with added count
   */
  add(tokens: Token[]): Result<number> {
    try {
      let addedCount = 0;
      const validationErrors: Array<{ tokenId: string; errors: any[] }> = [];

      for (const token of tokens) {
        // Validate token has required fields
        if (!token.id || !token.projectId || !token.path || token.path.length === 0) {
          console.error('[TokenRepository] Invalid token missing required fields:', token);
          continue;
        }

        // Validate token with Zod if feature is enabled
        if (isFeatureEnabled('ZOD_VALIDATION')) {
          const validationResult = validateToken(token);
          if (!validationResult.success && validationResult.error) {
            console.warn(
              `[TokenRepository] Token validation failed for ${token.qualifiedName}:`,
              validationResult.error.issues
            );
            validationErrors.push({
              tokenId: token.id,
              errors: validationResult.error.issues.map((e: any) => ({
                path: e.path.join('.'),
                message: e.message,
                code: e.code,
              })),
            });
            // Still add the token but mark it as draft
            token.status = 'draft';
            token.extensions = {
              ...token.extensions,
              validationErrors: validationResult.error.issues.map((e: any) => ({
                path: e.path.join('.'),
                message: e.message,
                code: e.code,
              })),
            };
          }
        }

        // Remove old indexes if updating existing token
        if (this.tokens.has(token.id)) {
          this.removeFromIndexes(token.id);
        }

        // Store token
        this.tokens.set(token.id, token);

        // Update indexes
        this.addToIndexes(token);

        addedCount++;
      }

      if (validationErrors.length > 0) {
        console.warn(
          `[TokenRepository] ${validationErrors.length} token(s) failed validation but were added as drafts`
        );
      }

      return Success(addedCount);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TokenRepository] Failed to add tokens:', message);
      return Failure(message);
    }
  }

  /**
   * Get token by ID
   *
   * @param id - Token ID
   * @returns Token or undefined
   */
  get(id: string): Token | undefined {
    return this.tokens.get(id);
  }

  /**
   * Get token by qualified name within a project
   *
   * @param projectId - Project identifier
   * @param qualifiedName - Dot-separated path (e.g., 'color.semantic.button.primary')
   * @returns Token or undefined
   */
  getByQualifiedName(projectId: string, qualifiedName: string): Token | undefined {
    const key = `${projectId}:${qualifiedName}`;
    const id = this.pathIndex.get(key);
    return id ? this.tokens.get(id) : undefined;
  }

  /**
   * Get token by path within a project
   *
   * @param projectId - Project identifier
   * @param path - Token path array
   * @returns Token or undefined
   */
  getByPath(projectId: string, path: string[]): Token | undefined {
    const qualifiedName = path.join('.');
    return this.getByQualifiedName(projectId, qualifiedName);
  }

  /**
   * Get all tokens for a project
   *
   * @param projectId - Project identifier
   * @returns Array of tokens
   */
  getByProject(projectId: string): Token[] {
    const tokenIds = this.projectIndex.get(projectId);
    if (!tokenIds) return [];

    return Array.from(tokenIds)
      .map(id => this.tokens.get(id))
      .filter((token): token is Token => token !== undefined);
  }

  /**
   * Get tokens by type
   *
   * @param type - Token type
   * @returns Array of tokens
   */
  getByType(type: TokenType): Token[] {
    const tokenIds = this.typeIndex.get(type);
    if (!tokenIds) return [];

    return Array.from(tokenIds)
      .map(id => this.tokens.get(id))
      .filter((token): token is Token => token !== undefined);
  }

  /**
   * Get all tokens in the repository
   * Convenience method for query({})
   *
   * @returns Array of all tokens
   */
  getAll(): Token[] {
    return Array.from(this.tokens.values());
  }

  /**
   * Query tokens with filters
   * Supports multiple filter criteria
   *
   * @param query - Query filters
   * @returns Array of matching tokens
   */
  query(query: TokenQuery): Token[] {
    let results: Token[] = [];

    // Start with most specific index
    if (query.ids && query.ids.length > 0) {
      results = query.ids
        .map(id => this.tokens.get(id))
        .filter((token): token is Token => token !== undefined);
    } else if (query.projectId) {
      results = this.getByProject(query.projectId);
    } else if (query.type) {
      results = this.getByType(query.type);
    } else {
      results = Array.from(this.tokens.values());
    }

    // Apply additional filters
    if (query.type && query.projectId) {
      // If both projectId and type were specified, we need to filter by type
      results = results.filter(t => t.type === query.type);
    }

    if (query.types && query.types.length > 0) {
      results = results.filter(t => query.types!.includes(t.type));
    }

    if (query.collection) {
      results = results.filter(t => t.collection === query.collection);
    }

    if (query.theme) {
      results = results.filter(t => t.theme === query.theme);
    }

    if (query.brand) {
      results = results.filter(t => t.brand === query.brand);
    }

    if (query.qualifiedName) {
      results = results.filter(t => t.qualifiedName === query.qualifiedName);
    }

    if (query.pathPrefix && query.pathPrefix.length > 0) {
      results = results.filter(t => {
        if (t.path.length < query.pathPrefix!.length) return false;
        return query.pathPrefix!.every((segment, i) => t.path[i] === segment);
      });
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(t =>
        query.tags!.some(tag => t.tags.includes(tag))
      );
    }

    if (query.status) {
      results = results.filter(t => t.status === query.status);
    }

    if (query.isAlias !== undefined) {
      results = results.filter(t =>
        query.isAlias ? t.aliasTo !== undefined : t.aliasTo === undefined
      );
    }

    return results;
  }

  /**
   * Update a token
   *
   * @param id - Token ID
   * @param updates - Partial token data to update
   * @returns Updated token or failure
   */
  update(id: string, updates: TokenUpdate): Result<Token> {
    const token = this.tokens.get(id);
    if (!token) {
      return Failure(`Token not found: ${id}`);
    }

    // Remove old indexes
    this.removeFromIndexes(id);

    // Apply updates
    const updated: Token = {
      ...token,
      ...updates,
      id: token.id, // Preserve ID
      created: token.created, // Preserve creation timestamp
      lastModified: new Date().toISOString(),
    };

    // Update storage
    this.tokens.set(id, updated);

    // Rebuild indexes
    this.addToIndexes(updated);

    return Success(updated);
  }

  /**
   * Remove tokens by IDs
   *
   * @param ids - Array of token IDs to remove
   * @returns Success with removed count
   */
  remove(ids: string[]): Result<number> {
    try {
      let removed = 0;

      for (const id of ids) {
        if (this.tokens.has(id)) {
          this.removeFromIndexes(id);
          this.tokens.delete(id);
          removed++;
        }
      }

      return Success(removed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(message);
    }
  }

  /**
   * Remove all tokens for a project
   *
   * @param projectId - Project identifier
   * @returns Success with removed count
   */
  removeProject(projectId: string): Result<number> {
    const tokenIds = this.projectIndex.get(projectId);
    if (!tokenIds) {
      return Success(0);
    }

    return this.remove(Array.from(tokenIds));
  }

  /**
   * Get tokens that reference a specific token (inverse lookup)
   *
   * @param targetId - Token ID that is being referenced
   * @returns Array of tokens that alias to this token
   */
  getReferencingTokens(targetId: string): Token[] {
    const referrerIds = this.aliasIndex.get(targetId);
    if (!referrerIds) return [];

    return Array.from(referrerIds)
      .map(id => this.tokens.get(id))
      .filter((token): token is Token => token !== undefined);
  }

  /**
   * Get repository statistics
   *
   * @returns Repository stats
   */
  getStats(): RepositoryStats {
    const stats: RepositoryStats = {
      totalTokens: this.tokens.size,
      byProject: {},
      byType: {},
      byCollection: {},
      aliasCount: 0,
      circularReferenceCount: 0,
    };

    for (const [projectId, tokenIds] of this.projectIndex) {
      stats.byProject[projectId] = tokenIds.size;
    }

    for (const [type, tokenIds] of this.typeIndex) {
      stats.byType[type] = tokenIds.size;
    }

    for (const [collection, tokenIds] of this.collectionIndex) {
      stats.byCollection[collection] = tokenIds.size;
    }

    stats.aliasCount = Array.from(this.tokens.values()).filter(t => t.aliasTo).length;

    return stats;
  }

  /**
   * Clear all tokens (useful for testing)
   */
  clear(): void {
    this.tokens.clear();
    this.projectIndex.clear();
    this.typeIndex.clear();
    this.collectionIndex.clear();
    this.pathIndex.clear();
    this.aliasIndex.clear();
    this.tagIndex.clear();
  }

  /**
   * Get total token count
   */
  count(): number {
    return this.tokens.size;
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Add token to all indexes
   */
  private addToIndexes(token: Token): void {
    // Project index
    if (!this.projectIndex.has(token.projectId)) {
      this.projectIndex.set(token.projectId, new Set());
    }
    this.projectIndex.get(token.projectId)!.add(token.id);

    // Type index
    if (!this.typeIndex.has(token.type)) {
      this.typeIndex.set(token.type, new Set());
    }
    this.typeIndex.get(token.type)!.add(token.id);

    // Collection index
    if (!this.collectionIndex.has(token.collection)) {
      this.collectionIndex.set(token.collection, new Set());
    }
    this.collectionIndex.get(token.collection)!.add(token.id);

    // Path index (qualified name lookup)
    const pathKey = `${token.projectId}:${token.qualifiedName}`;
    this.pathIndex.set(pathKey, token.id);

    // Alias index (if this token is an alias)
    if (token.aliasTo) {
      if (!this.aliasIndex.has(token.aliasTo)) {
        this.aliasIndex.set(token.aliasTo, new Set());
      }
      this.aliasIndex.get(token.aliasTo)!.add(token.id);
    }

    // Tag index
    for (const tag of token.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(token.id);
    }
  }

  /**
   * Remove token from all indexes
   */
  private removeFromIndexes(id: string): void {
    const token = this.tokens.get(id);
    if (!token) return;

    // Project index
    this.projectIndex.get(token.projectId)?.delete(id);

    // Type index
    this.typeIndex.get(token.type)?.delete(id);

    // Collection index
    this.collectionIndex.get(token.collection)?.delete(id);

    // Path index
    const pathKey = `${token.projectId}:${token.qualifiedName}`;
    this.pathIndex.delete(pathKey);

    // Alias index
    if (token.aliasTo) {
      this.aliasIndex.get(token.aliasTo)?.delete(id);
    }

    // Tag index
    for (const tag of token.tags) {
      this.tagIndex.get(tag)?.delete(id);
    }
  }
}

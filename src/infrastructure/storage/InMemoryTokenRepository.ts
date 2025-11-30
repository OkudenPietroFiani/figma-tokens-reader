// ====================================================================================
// IN-MEMORY TOKEN REPOSITORY (Infrastructure Adapter)
// Implements ITokenRepository port using in-memory storage
// ====================================================================================

import { ITokenRepository, TokenQueryCriteria } from '../../core/ports/ITokenRepository';
import { Token } from '../../core/models/Token';
import { Result, Success, Failure } from '../../shared/types';
import { TokenRepository as CoreTokenRepository, TokenQuery } from '../../core/services/TokenRepository';

/**
 * In-Memory Token Repository
 *
 * Infrastructure adapter that implements the ITokenRepository port
 * using the existing TokenRepository implementation.
 *
 * This adapter provides a clean interface for the application layer
 * while leveraging the existing, well-tested repository implementation.
 *
 * Storage Strategy: In-memory (data lost on plugin reload)
 * Performance: O(1) indexed lookups, very fast
 * Limitations: No persistence, limited by memory
 */
export class InMemoryTokenRepository implements ITokenRepository {
  private repository: CoreTokenRepository;

  constructor() {
    this.repository = new CoreTokenRepository();
  }

  // ==================== QUERIES ====================

  findById(id: string): Token | undefined {
    return this.repository.get(id);
  }

  findByQualifiedName(qualifiedName: string, projectId: string): Token | undefined {
    return this.repository.getByQualifiedName(qualifiedName, projectId);
  }

  query(criteria: TokenQueryCriteria): Token[] {
    // Map TokenQueryCriteria to TokenQuery
    const query: TokenQuery = {
      projectId: criteria.projectId,
      collection: criteria.collection,
      type: criteria.type as any,
      theme: criteria.theme,
      brand: criteria.brand,
      status: criteria.status,
      tags: criteria.tags
    };

    let results = this.repository.query(query);

    // Apply search filter if provided
    if (criteria.search) {
      const searchLower = criteria.search.toLowerCase();
      results = results.filter(token =>
        token.name.toLowerCase().includes(searchLower) ||
        token.qualifiedName.toLowerCase().includes(searchLower) ||
        token.path.some(p => p.toLowerCase().includes(searchLower))
      );
    }

    return results;
  }

  findByProject(projectId: string): Token[] {
    return this.repository.query({ projectId });
  }

  findByCollection(collection: string, projectId?: string): Token[] {
    return this.repository.query({ collection, projectId });
  }

  exists(id: string): boolean {
    return this.repository.get(id) !== undefined;
  }

  count(criteria?: TokenQueryCriteria): number {
    if (!criteria) {
      return this.repository.getAll().length;
    }
    return this.query(criteria).length;
  }

  // ==================== COMMANDS ====================

  save(token: Token): Result<Token> {
    try {
      const result = this.repository.add([token]);
      if (result.success) {
        return Success(token);
      } else {
        return Failure(result.error || 'Failed to save token');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Failed to save token: ${message}`);
    }
  }

  saveMany(tokens: Token[]): Result<Token[]> {
    try {
      const result = this.repository.add(tokens);
      if (result.success) {
        return Success(tokens);
      } else {
        return Failure(result.error || 'Failed to save tokens');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Failed to save tokens: ${message}`);
    }
  }

  delete(id: string): Result<boolean> {
    try {
      const existed = this.repository.get(id) !== undefined;
      if (existed) {
        this.repository.remove([id]);
      }
      return Success(existed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Failed to delete token: ${message}`);
    }
  }

  deleteMany(ids: string[]): Result<number> {
    try {
      const result = this.repository.remove(ids);
      if (result.success) {
        return Success(result.data || 0);
      } else {
        return Failure(result.error || 'Failed to delete tokens');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Failed to delete tokens: ${message}`);
    }
  }

  deleteWhere(criteria: TokenQueryCriteria): Result<number> {
    try {
      const tokens = this.query(criteria);
      const ids = tokens.map(t => t.id);
      return this.deleteMany(ids);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Failed to delete tokens: ${message}`);
    }
  }

  clear(): Result<boolean> {
    try {
      this.repository.clear();
      return Success(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Failed to clear repository: ${message}`);
    }
  }

  // ==================== BULK OPERATIONS ====================

  replaceProject(projectId: string, tokens: Token[]): Result<Token[]> {
    try {
      // Delete all tokens in project
      const existing = this.findByProject(projectId);
      const existingIds = existing.map(t => t.id);
      if (existingIds.length > 0) {
        this.repository.remove(existingIds);
      }

      // Insert new tokens
      const addResult = this.repository.add(tokens);
      if (!addResult.success) {
        return Failure(addResult.error || 'Failed to replace project');
      }

      return Success(tokens);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Failed to replace project: ${message}`);
    }
  }

  replaceCollection(collection: string, projectId: string, tokens: Token[]): Result<Token[]> {
    try {
      // Delete all tokens in collection
      const existing = this.findByCollection(collection, projectId);
      const existingIds = existing.map(t => t.id);
      if (existingIds.length > 0) {
        this.repository.remove(existingIds);
      }

      // Insert new tokens
      const addResult = this.repository.add(tokens);
      if (!addResult.success) {
        return Failure(addResult.error || 'Failed to replace collection');
      }

      return Success(tokens);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Failure(`Failed to replace collection: ${message}`);
    }
  }

  // ==================== INDEXES & OPTIMIZATION ====================

  getCollections(projectId?: string): string[] {
    const tokens = projectId ? this.findByProject(projectId) : this.repository.getAll();
    const collections = new Set(tokens.map(t => t.collection));
    return Array.from(collections);
  }

  getProjects(): string[] {
    const tokens = this.repository.getAll();
    const projects = new Set(tokens.map(t => t.projectId));
    return Array.from(projects);
  }

  // ==================== ADDITIONAL METHODS (not in port) ====================

  /**
   * Get the underlying core repository (for backward compatibility)
   * Use sparingly - prefer using the port interface
   */
  getCoreRepository(): CoreTokenRepository {
    return this.repository;
  }

  /**
   * Get all tokens (convenience method)
   */
  getAll(): Token[] {
    return this.repository.getAll();
  }
}

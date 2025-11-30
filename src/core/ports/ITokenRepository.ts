// ====================================================================================
// TOKEN REPOSITORY PORT
// Domain interface for token storage and retrieval
// ====================================================================================

import { Token } from '../models/Token';
import { Result } from '../../shared/types';

/**
 * Query criteria for finding tokens
 */
export interface TokenQueryCriteria {
  /** Filter by project ID */
  projectId?: string;
  /** Filter by collection */
  collection?: string;
  /** Filter by token type */
  type?: string;
  /** Filter by theme */
  theme?: string;
  /** Filter by brand */
  brand?: string;
  /** Filter by status */
  status?: 'active' | 'draft' | 'archived';
  /** Search in token names/paths */
  search?: string;
  /** Filter by tag */
  tags?: string[];
}

/**
 * Port interface for token storage (Repository Pattern)
 *
 * This is a domain-level abstraction that allows the core business logic
 * to remain independent of specific storage implementations
 * (in-memory, file system, database, etc.)
 *
 * The repository provides a collection-like interface for tokens,
 * hiding persistence details from the domain.
 *
 * Hexagonal Architecture Pattern:
 * - This is a "port" (interface defined by domain)
 * - Concrete repositories are "adapters" (implementations in infrastructure)
 *
 * Examples of implementations:
 * - InMemoryTokenRepository (current implementation)
 * - FileSystemTokenRepository (persist to local JSON)
 * - LocalStorageTokenRepository (browser localStorage)
 * - RemoteTokenRepository (sync to API)
 */
export interface ITokenRepository {
  // ==================== QUERIES (Read Operations) ====================

  /**
   * Find a token by its unique ID
   *
   * @param id - Token ID
   * @returns Token or undefined if not found
   */
  findById(id: string): Token | undefined;

  /**
   * Find a token by qualified name within a project
   *
   * @param qualifiedName - Token qualified name (e.g., "color.primary.500")
   * @param projectId - Project ID
   * @returns Token or undefined if not found
   */
  findByQualifiedName(qualifiedName: string, projectId: string): Token | undefined;

  /**
   * Query tokens with flexible criteria
   *
   * @param criteria - Query filters
   * @returns Array of tokens matching criteria
   */
  query(criteria: TokenQueryCriteria): Token[];

  /**
   * Get all tokens for a project
   *
   * @param projectId - Project ID
   * @returns All tokens in the project
   */
  findByProject(projectId: string): Token[];

  /**
   * Get all tokens in a collection
   *
   * @param collection - Collection name
   * @param projectId - Optional project ID filter
   * @returns Tokens in the collection
   */
  findByCollection(collection: string, projectId?: string): Token[];

  /**
   * Check if a token exists
   *
   * @param id - Token ID
   * @returns True if token exists
   */
  exists(id: string): boolean;

  /**
   * Count total tokens (optionally filtered)
   *
   * @param criteria - Optional filter criteria
   * @returns Number of tokens
   */
  count(criteria?: TokenQueryCriteria): number;

  // ==================== COMMANDS (Write Operations) ====================

  /**
   * Save a single token
   *
   * If token with same ID exists, it will be updated.
   * Otherwise, a new token will be created.
   *
   * @param token - Token to save
   * @returns Result containing saved token or error
   */
  save(token: Token): Result<Token>;

  /**
   * Save multiple tokens in batch
   *
   * More efficient than calling save() multiple times.
   * Atomic: either all succeed or all fail.
   *
   * @param tokens - Tokens to save
   * @returns Result containing saved tokens or error
   */
  saveMany(tokens: Token[]): Result<Token[]>;

  /**
   * Delete a token by ID
   *
   * @param id - Token ID to delete
   * @returns Result indicating success or error
   */
  delete(id: string): Result<boolean>;

  /**
   * Delete multiple tokens by IDs
   *
   * @param ids - Token IDs to delete
   * @returns Result with count of deleted tokens
   */
  deleteMany(ids: string[]): Result<number>;

  /**
   * Delete all tokens matching criteria
   *
   * Useful for clearing a project or collection.
   *
   * @param criteria - Filter criteria
   * @returns Result with count of deleted tokens
   */
  deleteWhere(criteria: TokenQueryCriteria): Result<number>;

  /**
   * Clear all tokens from the repository
   *
   * ⚠️ Destructive operation - use with caution!
   *
   * @returns Result indicating success
   */
  clear(): Result<boolean>;

  // ==================== BULK OPERATIONS ====================

  /**
   * Replace all tokens for a project
   *
   * Deletes existing tokens and inserts new ones.
   * Atomic: all or nothing.
   *
   * @param projectId - Project ID
   * @param tokens - New tokens for the project
   * @returns Result containing replaced tokens
   */
  replaceProject(projectId: string, tokens: Token[]): Result<Token[]>;

  /**
   * Replace all tokens in a collection
   *
   * @param collection - Collection name
   * @param projectId - Project ID
   * @param tokens - New tokens for the collection
   * @returns Result containing replaced tokens
   */
  replaceCollection(
    collection: string,
    projectId: string,
    tokens: Token[]
  ): Result<Token[]>;

  // ==================== INDEXES & OPTIMIZATION ====================

  /**
   * Get all unique collections
   *
   * @param projectId - Optional project ID filter
   * @returns Array of collection names
   */
  getCollections(projectId?: string): string[];

  /**
   * Get all unique projects
   *
   * @returns Array of project IDs
   */
  getProjects(): string[];

  /**
   * Optional: Rebuild indexes for better query performance
   *
   * Some implementations may benefit from index rebuilding
   * after bulk operations.
   */
  rebuildIndexes?(): void;
}

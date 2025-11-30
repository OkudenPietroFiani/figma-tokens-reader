// ====================================================================================
// GET TOKENS USE CASE (Query)
// Handles querying and retrieving design tokens
// ====================================================================================

import { UseCase } from '../interfaces/IUseCase';
import { ITokenRepository, TokenQueryCriteria } from '../../core/ports/ITokenRepository';
import { Token } from '../../core/models/Token';
import { Result, Success, Failure } from '../../shared/types';

/**
 * Input for GetTokensUseCase
 */
export interface GetTokensInput {
  /** Optional: Filter by project ID */
  projectId?: string;
  /** Optional: Filter by collection */
  collection?: string;
  /** Optional: Filter by token type */
  type?: string;
  /** Optional: Search term (searches in name, qualifiedName, path) */
  search?: string;
  /** Optional: Filter by tags */
  tags?: string[];
  /** Optional: Pagination */
  pagination?: {
    /** Number of items per page */
    limit: number;
    /** Page number (0-indexed) */
    offset: number;
  };
}

/**
 * Output from GetTokensUseCase
 */
export interface GetTokensOutput {
  /** Retrieved tokens */
  tokens: Token[];
  /** Total count (before pagination) */
  total: number;
  /** Applied filters */
  filters: TokenQueryCriteria;
  /** Pagination info */
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Use Case: Get Tokens (Query)
 *
 * Retrieves tokens from the repository with flexible filtering and search.
 * This is a query-only operation (CQRS: Query side).
 *
 * Supports:
 * - Filtering by project, collection, type, tags
 * - Full-text search in token names/paths
 * - Pagination for large result sets
 *
 * This use case is used by the UI to display tokens.
 *
 * Example usage:
 * ```typescript
 * const useCase = new GetTokensUseCase(repository);
 * const result = await useCase.execute({
 *   projectId: 'my-project',
 *   collection: 'semantic',
 *   search: 'primary'
 * });
 * ```
 */
export class GetTokensUseCase extends UseCase<GetTokensInput, GetTokensOutput> {
  constructor(private repository: ITokenRepository) {
    super();
  }

  protected async executeImpl(input: GetTokensInput): Promise<Result<GetTokensOutput>> {
    // 1. Build query criteria from input
    const criteria: TokenQueryCriteria = {
      projectId: input.projectId,
      collection: input.collection,
      type: input.type,
      search: input.search,
      tags: input.tags,
      status: 'active' // Only return active tokens by default
    };

    // 2. Query all matching tokens (before pagination)
    const allTokens = this.repository.query(criteria);
    const total = allTokens.length;

    // 3. Apply pagination if specified
    let tokens = allTokens;
    if (input.pagination) {
      const { limit, offset } = input.pagination;
      tokens = allTokens.slice(offset, offset + limit);
    }

    console.log(
      `[GetTokensUseCase] Retrieved ${tokens.length} tokens` +
      (input.pagination ? ` (showing ${input.pagination.offset}-${input.pagination.offset + tokens.length} of ${total})` : '')
    );

    // 4. Build pagination info
    const pagination = input.pagination
      ? {
          limit: input.pagination.limit,
          offset: input.pagination.offset,
          hasMore: input.pagination.offset + input.pagination.limit < total
        }
      : undefined;

    return Success({
      tokens,
      total,
      filters: criteria,
      pagination
    });
  }

  validate(input: GetTokensInput): Result<boolean> {
    // Validation is lenient for queries - empty input is valid (returns all tokens)

    if (input.pagination) {
      if (input.pagination.limit < 1) {
        return Failure('Pagination limit must be at least 1');
      }
      if (input.pagination.offset < 0) {
        return Failure('Pagination offset cannot be negative');
      }
    }

    return Success(true);
  }
}

// ====================================================================================
// TOKEN DOCUMENTATION ADAPTER
// Adapts Token[] to TokenMetadata[] for DocumentationGenerator
// ====================================================================================

import { Token } from '../models/Token';
import { TokenMetadata } from '../../shared/types';
import { TokenRepository } from '../services/TokenRepository';

/**
 * Adapter for DocumentationGenerator
 *
 * Pattern: Adapter
 * - Converts Token[] (new model) to TokenMetadata[] (old format)
 * - Allows DocumentationGenerator to work with Token[] without breaking changes
 *
 * Usage:
 * ```typescript
 * const adapter = new TokenDocumentationAdapter(repository);
 * const metadata = adapter.tokensToMetadata(tokens);
 * await documentationGenerator.generate(tokenFiles, metadata, options);
 * ```
 */
export class TokenDocumentationAdapter {
  private repository: TokenRepository;

  constructor(repository: TokenRepository) {
    this.repository = repository;
  }

  /**
   * Convert Token[] to TokenMetadata[]
   *
   * @param tokens - Array of tokens to convert
   * @returns TokenMetadata array for DocumentationGenerator
   */
  tokensToMetadata(tokens: Token[]): TokenMetadata[] {
    return tokens.map(token => this.tokenToMetadata(token));
  }

  /**
   * Convert single Token to TokenMetadata
   *
   * @param token - Token to convert
   * @returns TokenMetadata
   */
  private tokenToMetadata(token: Token): TokenMetadata {
    // Resolve aliasTo from Token ID to qualified name
    let aliasTo: string | undefined;
    if (token.aliasTo) {
      const targetToken = this.repository.get(token.aliasTo);
      if (targetToken) {
        // Convert to reference format: {qualified.name}
        aliasTo = `{${targetToken.qualifiedName}}`;
      }
    }

    return {
      name: token.name,
      fullPath: token.qualifiedName,
      type: token.type,
      value: token.resolvedValue || token.value,
      originalValue: aliasTo || token.rawValue || token.value,
      description: token.description,
      aliasTo: aliasTo,
      collection: token.collection,
    };
  }
}

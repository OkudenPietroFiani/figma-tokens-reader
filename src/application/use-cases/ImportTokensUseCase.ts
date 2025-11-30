// ====================================================================================
// IMPORT TOKENS USE CASE
// Handles importing design tokens from external sources (files, APIs, etc.)
// ====================================================================================

import { UseCase } from '../interfaces/IUseCase';
import { ITokenParser } from '../../core/ports/ITokenParser';
import { ITokenRepository } from '../../core/ports/ITokenRepository';
import { Token } from '../../core/models/Token';
import { Result, Success, Failure, TokenData } from '../../shared/types';
import { ParseContext } from '../../core/interfaces/ITokenFormatStrategy';

/**
 * Input for ImportTokensUseCase
 */
export interface ImportTokensInput {
  /** Raw token data (JSON object) */
  data: TokenData;
  /** Project ID to import into */
  projectId: string;
  /** Optional: Explicit collection name */
  collection?: string;
  /** Optional: File path for context (level detection) */
  filePath?: string;
  /** Optional: Source information */
  source?: {
    type: 'github' | 'gitlab' | 'local' | 'api';
    location: string;
    branch?: string;
    commit?: string;
  };
  /** Optional: Replace existing tokens in project/collection */
  replace?: boolean;
}

/**
 * Output from ImportTokensUseCase
 */
export interface ImportTokensOutput {
  /** Imported tokens */
  tokens: Token[];
  /** Number of tokens imported */
  count: number;
  /** Collection name */
  collection: string;
  /** Whether tokens were replaced or merged */
  replaced: boolean;
}

/**
 * Use Case: Import Tokens
 *
 * Orchestrates the process of importing design tokens:
 * 1. Auto-detect token format (W3C, Style Dictionary, etc.)
 * 2. Parse tokens into universal Token model
 * 3. Store tokens in repository
 * 4. Optionally replace existing tokens
 *
 * This is the primary entry point for getting tokens into the system.
 *
 * Example usage:
 * ```typescript
 * const useCase = new ImportTokensUseCase(parserRegistry, repository);
 * const result = await useCase.execute({
 *   data: jsonData,
 *   projectId: 'my-project',
 *   filePath: 'tokens/semantic.json'
 * });
 * ```
 */
export class ImportTokensUseCase extends UseCase<ImportTokensInput, ImportTokensOutput> {
  constructor(
    private parserRegistry: { detectParser(data: TokenData): ITokenParser | null },
    private repository: ITokenRepository
  ) {
    super();
  }

  protected async executeImpl(input: ImportTokensInput): Promise<Result<ImportTokensOutput>> {
    // 1. Auto-detect parser
    const parser = this.parserRegistry.detectParser(input.data);
    if (!parser) {
      return Failure('Could not detect token format. Ensure data is valid W3C or Style Dictionary format.');
    }

    console.log(`[ImportTokensUseCase] Detected format: ${parser.name}`);

    // 2. Parse tokens
    const parseContext: ParseContext = {
      filePath: input.filePath,
      collection: input.collection
    };

    const parseResult = await parser.parse(input.data, parseContext);
    if (!parseResult.success) {
      return Failure(`Failed to parse tokens: ${parseResult.error}`);
    }

    const tokens = parseResult.data || [];
    if (tokens.length === 0) {
      return Failure('No tokens found in the provided data');
    }

    // 3. Determine collection (from tokens or input)
    const collection = input.collection || tokens[0]?.collection || 'default';

    console.log(`[ImportTokensUseCase] Parsed ${tokens.length} tokens for collection '${collection}'`);

    // 4. Optionally replace existing tokens
    if (input.replace) {
      const replaceResult = this.repository.replaceCollection(
        collection,
        input.projectId,
        tokens
      );

      if (!replaceResult.success) {
        return Failure(`Failed to replace tokens: ${replaceResult.error}`);
      }

      return Success({
        tokens: replaceResult.data || [],
        count: tokens.length,
        collection,
        replaced: true
      });
    }

    // 5. Save tokens (merge with existing)
    const saveResult = this.repository.saveMany(tokens);
    if (!saveResult.success) {
      return Failure(`Failed to save tokens: ${saveResult.error}`);
    }

    return Success({
      tokens: saveResult.data || [],
      count: tokens.length,
      collection,
      replaced: false
    });
  }

  validate(input: ImportTokensInput): Result<boolean> {
    if (!input.data || typeof input.data !== 'object') {
      return Failure('Input data must be a valid object');
    }

    if (!input.projectId || typeof input.projectId !== 'string') {
      return Failure('Project ID is required and must be a string');
    }

    return Success(true);
  }
}

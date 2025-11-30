// ====================================================================================
// GENERATE DOCUMENTATION USE CASE
// Handles token documentation generation in Figma
// ====================================================================================

import { UseCase } from '../interfaces/IUseCase';
import { ITokenRepository } from '../../core/ports/ITokenRepository';
import { Result, Success, Failure, DocumentationOptions, DocumentationResult, TokenFile } from '../../shared/types';
import { DocumentationGenerator } from '../../backend/services/DocumentationGenerator';
import { StorageService } from '../../backend/services/StorageService';

/**
 * Input for GenerateDocumentationUseCase
 */
export interface GenerateDocumentationInput {
  /** Optional: Specific file names to generate docs for */
  fileNames?: string[];
  /** Page name for documentation */
  pageName?: string;
  /** Include visualizations */
  includeVisuals?: boolean;
  /** Organization mode */
  organization?: 'by-collection' | 'by-type' | 'flat';
}

/**
 * Output from GenerateDocumentationUseCase
 */
export interface GenerateDocumentationOutput extends DocumentationResult {}

/**
 * Use Case: Generate Token Documentation
 *
 * Orchestrates the process of generating visual documentation in Figma:
 * 1. Query tokens from repository
 * 2. Load token metadata from storage (if available)
 * 3. Generate documentation frames with visualizations
 * 4. Report generation statistics
 *
 * Example usage:
 * ```typescript
 * const useCase = new GenerateDocumentationUseCase(repository, generator, storage);
 * const result = await useCase.execute({
 *   fileNames: ['primitives', 'semantic'],
 *   pageName: 'Design Tokens',
 *   includeVisuals: true
 * });
 * ```
 */
export class GenerateDocumentationUseCase extends UseCase<
  GenerateDocumentationInput,
  GenerateDocumentationOutput
> {
  constructor(
    private repository: ITokenRepository,
    private generator: DocumentationGenerator,
    private storage: StorageService
  ) {
    super();
  }

  protected async executeImpl(
    input: GenerateDocumentationInput
  ): Promise<Result<GenerateDocumentationOutput>> {
    console.log(
      `[GenerateDocumentationUseCase] Generating documentation${
        input.fileNames ? ` for ${input.fileNames.length} file(s)` : ' for all collections'
      }`
    );

    // 1. Load token state from storage (optional)
    const tokenStateResult = await this.storage.getTokenState();
    const tokenFilesMap = new Map<string, TokenFile>();

    if (tokenStateResult.success && tokenStateResult.data) {
      const tokenState = tokenStateResult.data;
      // Convert tokenFiles object to Map
      for (const [fileName, file] of Object.entries(tokenState.tokenFiles)) {
        tokenFilesMap.set(fileName, file);
      }
      console.log(`[GenerateDocumentationUseCase] Loaded ${tokenFilesMap.size} token files from storage`);
    } else {
      console.log('[GenerateDocumentationUseCase] No token state in storage, using Figma variables directly');
    }

    // 2. Get all tokens from repository
    const tokens = this.repository.query({ projectId: 'default' });

    if (tokens.length > 0) {
      console.log(`[GenerateDocumentationUseCase] Found ${tokens.length} tokens in repository`);
    } else {
      console.log('[GenerateDocumentationUseCase] No tokens in repository, generator will read from Figma');
    }

    // 3. Prepare options
    const options: DocumentationOptions = {
      fileNames: input.fileNames,
      pageName: input.pageName || 'Design Tokens',
      includeVisuals: input.includeVisuals ?? true,
      organization: input.organization || 'by-collection'
    };

    // 4. Generate documentation
    const result = await this.generator.generate(tokenFilesMap, tokens, options);

    if (!result.success) {
      return Failure(`Documentation generation failed: ${result.error}`);
    }

    const docResult = result.data!;

    console.log(
      `[GenerateDocumentationUseCase] Generated ${docResult.tokenCount} tokens ` +
      `in ${docResult.categoryCount} categories`
    );

    return Success(docResult);
  }

  validate(input: GenerateDocumentationInput): Result<boolean> {
    if (input.fileNames && !Array.isArray(input.fileNames)) {
      return Failure('fileNames must be an array');
    }

    if (input.pageName && typeof input.pageName !== 'string') {
      return Failure('pageName must be a string');
    }

    return Success(true);
  }
}

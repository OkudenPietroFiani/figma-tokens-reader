// ====================================================================================
// SYNC TO FIGMA VARIABLES USE CASE
// Handles syncing design tokens to Figma Variables
// ====================================================================================

import { UseCase } from '../interfaces/IUseCase';
import { ITokenExporter, ExportOptions, ExportResult } from '../../core/ports/ITokenExporter';
import { ITokenRepository, TokenQueryCriteria } from '../../core/ports/ITokenRepository';
import { Result, Success, Failure } from '../../shared/types';

/**
 * Input for SyncToFigmaVariablesUseCase
 */
export interface SyncToFigmaVariablesInput {
  /** Project ID to sync */
  projectId: string;
  /** Optional: Filter by collection */
  collection?: string;
  /** Optional: Filter by specific token IDs */
  tokenIds?: string[];
  /** Optional: Sync options */
  options?: {
    /** Overwrite existing Figma variables */
    overwrite?: boolean;
    /** Dry run (don't actually sync, just validate) */
    dryRun?: boolean;
  };
}

/**
 * Output from SyncToFigmaVariablesUseCase
 */
export interface SyncToFigmaVariablesOutput extends ExportResult {
  /** Total tokens processed */
  total: number;
  /** Collection names that were synced */
  collections: string[];
}

/**
 * Use Case: Sync Tokens to Figma Variables
 *
 * Orchestrates the process of syncing design tokens to Figma Variables:
 * 1. Query tokens from repository (by project, collection, or IDs)
 * 2. Resolve token references (ensure all dependencies are included)
 * 3. Export to Figma Variables via exporter
 * 4. Report sync statistics
 *
 * This is the primary use case for pushing tokens to Figma.
 *
 * Example usage:
 * ```typescript
 * const useCase = new SyncToFigmaVariablesUseCase(repository, exporter);
 * const result = await useCase.execute({
 *   projectId: 'my-project',
 *   collection: 'semantic'
 * });
 * ```
 */
export class SyncToFigmaVariablesUseCase extends UseCase<
  SyncToFigmaVariablesInput,
  SyncToFigmaVariablesOutput
> {
  constructor(
    private repository: ITokenRepository,
    private figmaExporter: ITokenExporter
  ) {
    super();
  }

  protected async executeImpl(
    input: SyncToFigmaVariablesInput
  ): Promise<Result<SyncToFigmaVariablesOutput>> {
    // 1. Build query criteria
    const criteria: TokenQueryCriteria = {
      projectId: input.projectId,
      collection: input.collection,
      status: 'active' // Only sync active tokens
    };

    // 2. Query tokens
    let tokens = input.tokenIds
      ? input.tokenIds.map(id => this.repository.findById(id)).filter(t => t !== undefined)
      : this.repository.query(criteria);

    if (tokens.length === 0) {
      return Failure('No tokens found matching the criteria');
    }

    console.log(`[SyncToFigmaVariablesUseCase] Found ${tokens.length} tokens to sync`);

    // 3. Get unique collections
    const collections = [...new Set(tokens.map(t => t.collection))];

    // 4. Optional: Validate tokens before export
    if (this.figmaExporter.validate) {
      const validation = this.figmaExporter.validate(tokens);
      if (!validation.success || (validation.data && !validation.data.valid)) {
        const errors = validation.data?.errors.map(e => e.message).join(', ') || 'Unknown validation errors';
        return Failure(`Token validation failed: ${errors}`);
      }
    }

    // 5. Prepare export options
    const exportOptions: ExportOptions = {
      target: 'figma-variables',
      projectId: input.projectId,
      collection: input.collection,
      overwrite: input.options?.overwrite ?? true,
      dryRun: input.options?.dryRun ?? false
    };

    // 6. Export to Figma
    const exportResult = await this.figmaExporter.export(tokens, exportOptions);
    if (!exportResult.success) {
      return Failure(`Failed to sync to Figma: ${exportResult.error}`);
    }

    const result = exportResult.data!;

    console.log(
      `[SyncToFigmaVariablesUseCase] Synced ${result.exported} tokens ` +
      `(${result.created} created, ${result.updated} updated, ${result.failed} failed)`
    );

    // 7. Return comprehensive result
    return Success({
      ...result,
      total: tokens.length,
      collections
    });
  }

  validate(input: SyncToFigmaVariablesInput): Result<boolean> {
    if (!input.projectId || typeof input.projectId !== 'string') {
      return Failure('Project ID is required and must be a string');
    }

    if (input.tokenIds && !Array.isArray(input.tokenIds)) {
      return Failure('Token IDs must be an array');
    }

    return Success(true);
  }
}

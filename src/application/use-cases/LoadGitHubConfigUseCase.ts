// ====================================================================================
// LOAD GITHUB CONFIG USE CASE
// Retrieves GitHub configuration from plugin storage
// ====================================================================================

import { UseCase } from '../interfaces/IUseCase';
import { Result, Success, FileSourceConfig } from '../../shared/types';
import { StorageService } from '../../backend/services/StorageService';

/**
 * Input for LoadGitHubConfigUseCase
 */
export interface LoadGitHubConfigInput {
  // No input needed - always loads from storage
}

/**
 * Output from LoadGitHubConfigUseCase
 */
export interface LoadGitHubConfigOutput {
  /** GitHub config if found, null if no saved config */
  config: FileSourceConfig | null;
}

/**
 * Use Case: Load GitHub Configuration
 *
 * Retrieves previously saved GitHub configuration from plugin storage.
 * Returns null if no configuration has been saved yet.
 *
 * Example usage:
 * ```typescript
 * const useCase = new LoadGitHubConfigUseCase(storage);
 * const result = await useCase.execute({});
 * if (result.success && result.data.config) {
 *   console.log('Using saved GitHub config');
 * }
 * ```
 */
export class LoadGitHubConfigUseCase extends UseCase<
  LoadGitHubConfigInput,
  LoadGitHubConfigOutput
> {
  constructor(private storage: StorageService) {
    super();
  }

  protected async executeImpl(
    input: LoadGitHubConfigInput
  ): Promise<Result<LoadGitHubConfigOutput>> {
    console.log('[LoadGitHubConfigUseCase] Loading GitHub configuration...');

    // Delegate to storage service
    const result = await this.storage.getFileSourceConfig();

    if (!result.success || !result.data) {
      // No saved config is not an error - just return null
      console.log('[LoadGitHubConfigUseCase] No saved GitHub config found');
      return Success({ config: null });
    }

    const config = result.data;

    console.log('[LoadGitHubConfigUseCase] GitHub config loaded successfully');

    return Success({ config });
  }

  validate(input: LoadGitHubConfigInput): Result<boolean> {
    // No validation needed for empty input
    return Success(true);
  }
}

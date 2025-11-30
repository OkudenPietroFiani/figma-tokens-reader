// ====================================================================================
// SAVE GITHUB CONFIG USE CASE
// Persists GitHub configuration to plugin storage
// ====================================================================================

import { UseCase } from '../interfaces/IUseCase';
import { Result, Success, Failure, FileSourceConfig } from '../../shared/types';
import { StorageService } from '../../backend/services/StorageService';

/**
 * Input for SaveGitHubConfigUseCase
 */
export interface SaveGitHubConfigInput {
  /** GitHub configuration to persist */
  config: FileSourceConfig;
}

/**
 * Output from SaveGitHubConfigUseCase
 */
export interface SaveGitHubConfigOutput {
  /** Whether save was successful */
  saved: boolean;
}

/**
 * Use Case: Save GitHub Configuration
 *
 * Persists GitHub repository configuration (owner, repo, token, path)
 * to Figma plugin storage so users don't have to re-enter credentials.
 *
 * Example usage:
 * ```typescript
 * const useCase = new SaveGitHubConfigUseCase(storage);
 * const result = await useCase.execute({
 *   config: {
 *     type: 'github',
 *     owner: 'myorg',
 *     repo: 'design-tokens',
 *     token: 'ghp_...',
 *     path: 'tokens/'
 *   }
 * });
 * ```
 */
export class SaveGitHubConfigUseCase extends UseCase<
  SaveGitHubConfigInput,
  SaveGitHubConfigOutput
> {
  constructor(private storage: StorageService) {
    super();
  }

  protected async executeImpl(
    input: SaveGitHubConfigInput
  ): Promise<Result<SaveGitHubConfigOutput>> {
    console.log('[SaveGitHubConfigUseCase] Saving GitHub configuration...');

    // Delegate to storage service
    const result = await this.storage.saveFileSourceConfig(input.config);

    if (!result.success) {
      return Failure(`Failed to save GitHub config: ${result.error}`);
    }

    console.log('[SaveGitHubConfigUseCase] GitHub config saved successfully');

    return Success({ saved: true });
  }

  validate(input: SaveGitHubConfigInput): Result<boolean> {
    if (!input.config) {
      return Failure('config is required');
    }

    if (typeof input.config !== 'object') {
      return Failure('config must be an object');
    }

    if (!input.config.type || input.config.type !== 'github') {
      return Failure('config.type must be "github"');
    }

    return Success(true);
  }
}

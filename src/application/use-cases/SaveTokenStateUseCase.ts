// ====================================================================================
// SAVE TOKEN STATE USE CASE
// Persists token state to plugin storage
// ====================================================================================

import { UseCase } from '../interfaces/IUseCase';
import { Result, Success, Failure, TokenState } from '../../shared/types';
import { StorageService } from '../../backend/services/StorageService';

/**
 * Input for SaveTokenStateUseCase
 */
export interface SaveTokenStateInput {
  /** Token state to persist */
  tokenState: TokenState;
}

/**
 * Output from SaveTokenStateUseCase
 */
export interface SaveTokenStateOutput {
  /** Whether save was successful */
  saved: boolean;
}

/**
 * Use Case: Save Token State
 *
 * Persists token state to Figma plugin storage so that users
 * can resume their work after closing and reopening the plugin.
 *
 * Example usage:
 * ```typescript
 * const useCase = new SaveTokenStateUseCase(storage);
 * const result = await useCase.execute({
 *   tokenState: {
 *     tokenFiles: { 'primitives': { ... } },
 *     lastSync: new Date().toISOString()
 *   }
 * });
 * ```
 */
export class SaveTokenStateUseCase extends UseCase<
  SaveTokenStateInput,
  SaveTokenStateOutput
> {
  constructor(private storage: StorageService) {
    super();
  }

  protected async executeImpl(
    input: SaveTokenStateInput
  ): Promise<Result<SaveTokenStateOutput>> {
    console.log('[SaveTokenStateUseCase] Saving token state...');

    // Delegate to storage service
    const result = await this.storage.saveTokenState(input.tokenState);

    if (!result.success) {
      return Failure(`Failed to save token state: ${result.error}`);
    }

    console.log('[SaveTokenStateUseCase] Token state saved successfully');

    return Success({ saved: true });
  }

  validate(input: SaveTokenStateInput): Result<boolean> {
    if (!input.tokenState) {
      return Failure('tokenState is required');
    }

    if (typeof input.tokenState !== 'object') {
      return Failure('tokenState must be an object');
    }

    if (!input.tokenState.tokenFiles) {
      return Failure('tokenState.tokenFiles is required');
    }

    return Success(true);
  }
}

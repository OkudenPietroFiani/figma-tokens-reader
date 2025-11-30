// ====================================================================================
// LOAD TOKEN STATE USE CASE
// Retrieves token state from plugin storage
// ====================================================================================

import { UseCase } from '../interfaces/IUseCase';
import { Result, Success, Failure, TokenState } from '../../shared/types';
import { StorageService } from '../../backend/services/StorageService';

/**
 * Input for LoadTokenStateUseCase
 */
export interface LoadTokenStateInput {
  // No input needed - always loads from storage
}

/**
 * Output from LoadTokenStateUseCase
 */
export interface LoadTokenStateOutput {
  /** Token state if found, null if no saved state */
  tokenState: TokenState | null;
}

/**
 * Use Case: Load Token State
 *
 * Retrieves previously saved token state from Figma plugin storage.
 * Returns null if no state has been saved yet.
 *
 * Example usage:
 * ```typescript
 * const useCase = new LoadTokenStateUseCase(storage);
 * const result = await useCase.execute({});
 * if (result.success && result.data.tokenState) {
 *   console.log('Restored previous session');
 * }
 * ```
 */
export class LoadTokenStateUseCase extends UseCase<
  LoadTokenStateInput,
  LoadTokenStateOutput
> {
  constructor(private storage: StorageService) {
    super();
  }

  protected async executeImpl(
    input: LoadTokenStateInput
  ): Promise<Result<LoadTokenStateOutput>> {
    console.log('[LoadTokenStateUseCase] Loading token state...');

    // Delegate to storage service
    const result = await this.storage.getTokenState();

    if (!result.success) {
      // Storage errors are non-fatal - just return null
      console.log('[LoadTokenStateUseCase] No saved state found');
      return Success({ tokenState: null });
    }

    const tokenState = result.data || null;

    if (tokenState) {
      console.log('[LoadTokenStateUseCase] Token state loaded successfully');
    } else {
      console.log('[LoadTokenStateUseCase] No saved state available');
    }

    return Success({ tokenState });
  }

  validate(input: LoadTokenStateInput): Result<boolean> {
    // No validation needed for empty input
    return Success(true);
  }
}

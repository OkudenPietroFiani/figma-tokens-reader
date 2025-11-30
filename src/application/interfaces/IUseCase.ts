//====================================================================================
// USE CASE INTERFACE
// Base interface for all application layer use cases
// ====================================================================================

import { Result } from '../../shared/types';

/**
 * Base interface for all use cases in the application layer
 *
 * A use case represents a single user action or business operation.
 * It orchestrates domain services and infrastructure to accomplish a goal.
 *
 * Examples:
 * - ImportTokensUseCase
 * - SyncToFigmaVariablesUseCase
 * - ExportTokensUseCase
 * - GetTokensUseCase (query)
 *
 * Design Principles:
 * - Single Responsibility: Each use case does one thing
 * - Dependency Inversion: Depends on abstractions (ports), not implementations
 * - Command/Query Separation: Commands change state, queries don't
 *
 * @template TInput - Input data for the use case
 * @template TOutput - Output data from the use case
 */
export interface IUseCase<TInput, TOutput> {
  /**
   * Execute the use case
   *
   * @param input - Input data required for the operation
   * @returns Result containing output data or error
   */
  execute(input: TInput): Promise<Result<TOutput>>;

  /**
   * Optional: Validate input before execution
   * Returns validation errors if input is invalid
   *
   * @param input - Input data to validate
   * @returns Result with validation status
   */
  validate?(input: TInput): Result<boolean>;
}

/**
 * Base class for use cases (optional convenience class)
 *
 * Provides common functionality like logging, error handling
 */
export abstract class UseCase<TInput, TOutput> implements IUseCase<TInput, TOutput> {
  /**
   * Template method for executing use case with error handling
   */
  async execute(input: TInput): Promise<Result<TOutput>> {
    try {
      // Optional validation
      if (this.validate) {
        const validation = this.validate(input);
        if (!validation.success) {
          return validation as any; // Return validation error
        }
      }

      // Execute the actual logic (implemented by subclass)
      return await this.executeImpl(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${this.constructor.name}] Error:`, message);
      return {
        success: false,
        error: message
      };
    }
  }

  /**
   * Implement this method in subclasses with the actual use case logic
   */
  protected abstract executeImpl(input: TInput): Promise<Result<TOutput>>;

  /**
   * Optional validation (override in subclass if needed)
   */
  validate?(input: TInput): Result<boolean>;
}

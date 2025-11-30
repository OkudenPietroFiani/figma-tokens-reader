// ====================================================================================
// USE CASE REGISTRY
// Central registry for managing and executing use cases
// ====================================================================================

import { IUseCase } from './interfaces/IUseCase';
import { Result, Failure } from '../shared/types';

/**
 * Use Case Registry
 *
 * Provides a centralized way to register, retrieve, and execute use cases.
 * This follows the Registry pattern and enables:
 * - Dependency injection of use cases
 * - Dynamic use case execution by name
 * - Centralized use case management
 *
 * The registry is used by the plugin backend to execute use cases
 * based on user actions (commands, UI events).
 *
 * Example usage:
 * ```typescript
 * // Setup (in main.ts)
 * const registry = new UseCaseRegistry();
 * registry.register('import-tokens', importTokensUseCase);
 * registry.register('sync-to-figma', syncToFigmaUseCase);
 *
 * // Execute (from plugin command)
 * const result = await registry.execute('import-tokens', { data, projectId });
 * ```
 */
export class UseCaseRegistry {
  private useCases = new Map<string, IUseCase<any, any>>();
  private metadata = new Map<string, UseCaseMetadata>();

  /**
   * Register a use case with the registry
   *
   * @param name - Unique identifier for the use case
   * @param useCase - Use case instance
   * @param metadata - Optional metadata about the use case
   */
  register<TInput, TOutput>(
    name: string,
    useCase: IUseCase<TInput, TOutput>,
    metadata?: Partial<UseCaseMetadata>
  ): void {
    if (this.useCases.has(name)) {
      console.warn(`[UseCaseRegistry] Overwriting existing use case: ${name}`);
    }

    this.useCases.set(name, useCase);

    // Store metadata
    this.metadata.set(name, {
      name,
      description: metadata?.description || '',
      category: metadata?.category || 'general',
      requiresAuth: metadata?.requiresAuth ?? false
    });

    console.log(`[UseCaseRegistry] Registered use case: ${name}`);
  }

  /**
   * Get a use case by name
   *
   * @param name - Use case name
   * @returns Use case instance or undefined
   */
  get<TInput, TOutput>(name: string): IUseCase<TInput, TOutput> | undefined {
    return this.useCases.get(name);
  }

  /**
   * Check if a use case is registered
   *
   * @param name - Use case name
   * @returns True if registered
   */
  has(name: string): boolean {
    return this.useCases.has(name);
  }

  /**
   * Execute a use case by name
   *
   * Convenience method that looks up the use case and executes it.
   *
   * @param name - Use case name
   * @param input - Use case input
   * @returns Result from use case execution
   */
  async execute<TInput, TOutput>(
    name: string,
    input: TInput
  ): Promise<Result<TOutput>> {
    const useCase = this.useCases.get(name);

    if (!useCase) {
      return Failure(`Use case not found: ${name}. Available: ${this.listNames().join(', ')}`);
    }

    console.log(`[UseCaseRegistry] Executing use case: ${name}`);

    try {
      return await useCase.execute(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[UseCaseRegistry] Use case '${name}' failed:`, message);
      return Failure(`Use case execution failed: ${message}`);
    }
  }

  /**
   * List all registered use case names
   *
   * @returns Array of use case names
   */
  listNames(): string[] {
    return Array.from(this.useCases.keys());
  }

  /**
   * List all registered use cases with metadata
   *
   * @returns Array of use case metadata
   */
  list(): UseCaseMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Get metadata for a specific use case
   *
   * @param name - Use case name
   * @returns Metadata or undefined
   */
  getMetadata(name: string): UseCaseMetadata | undefined {
    return this.metadata.get(name);
  }

  /**
   * Get use cases by category
   *
   * @param category - Category name
   * @returns Array of use case names in category
   */
  getByCategory(category: string): string[] {
    return Array.from(this.metadata.entries())
      .filter(([_, meta]) => meta.category === category)
      .map(([name]) => name);
  }

  /**
   * Clear all registered use cases
   *
   * Useful for testing or resetting the registry.
   */
  clear(): void {
    this.useCases.clear();
    this.metadata.clear();
    console.log('[UseCaseRegistry] Cleared all use cases');
  }

  /**
   * Get count of registered use cases
   */
  count(): number {
    return this.useCases.size;
  }
}

/**
 * Metadata about a use case
 */
export interface UseCaseMetadata {
  /** Use case name (unique identifier) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Category for grouping */
  category: 'import' | 'export' | 'sync' | 'query' | 'transform' | 'general';
  /** Whether the use case requires authentication */
  requiresAuth: boolean;
}

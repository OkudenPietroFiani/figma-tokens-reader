// ====================================================================================
// FILE SOURCE REGISTRY
// Central registry for file source implementations (GitHub, GitLab, etc.)
// ====================================================================================

import { IFileSource } from '../interfaces/IFileSource';

/**
 * Singleton registry for file source implementations
 *
 * SOLID Principles:
 * - Single Responsibility: Only manages source registration/retrieval
 * - Open/Closed: New sources registered at runtime without modification
 * - Dependency Inversion: Controllers get sources via abstraction
 *
 * Usage:
 * ```typescript
 * // Register a source
 * FileSourceRegistry.register(new GitHubFileSource());
 * FileSourceRegistry.register(new GitLabFileSource());
 *
 * // Get a source
 * const source = FileSourceRegistry.get('github');
 * ```
 */
export class FileSourceRegistry {
  private static sources: Map<string, IFileSource> = new Map();

  /**
   * Register a file source implementation
   *
   * @param source - File source implementation
   * @throws Error if source with same type already registered
   */
  static register(source: IFileSource): void {
    const sourceType = source.getSourceType();

    if (this.sources.has(sourceType)) {
      console.error(`[FileSourceRegistry] Source '${sourceType}' is already registered`);
      throw new Error(`File source '${sourceType}' is already registered`);
    }

    this.sources.set(sourceType, source);
  }

  /**
   * Get a file source by type
   *
   * @param sourceType - Source identifier (e.g., 'github', 'gitlab')
   * @returns File source implementation or undefined
   */
  static get(sourceType: string): IFileSource | undefined {
    const source = this.sources.get(sourceType);

    if (!source) {
      console.error(`[FileSourceRegistry] No source registered for type: ${sourceType}`);
    }

    return source;
  }

  /**
   * Check if a source type is registered
   *
   * @param sourceType - Source identifier
   * @returns True if registered
   */
  static has(sourceType: string): boolean {
    return this.sources.has(sourceType);
  }

  /**
   * Get all registered source types
   *
   * @returns Array of source type identifiers
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Clear all registered sources
   * Useful for testing
   */
  static clear(): void {
    this.sources.clear();
  }

  /**
   * Get count of registered sources
   *
   * @returns Number of registered sources
   */
  static count(): number {
    return this.sources.size;
  }
}

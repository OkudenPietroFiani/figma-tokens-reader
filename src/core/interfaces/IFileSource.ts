// ====================================================================================
// FILE SOURCE INTERFACE
// Abstraction for fetching files from different sources (GitHub, GitLab, local, etc.)
// ====================================================================================

import { Result } from '../../shared/types';

/**
 * Represents metadata about a file from a remote source
 */
export interface FileMetadata {
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha?: string;
}

/**
 * Configuration for connecting to a file source
 * Extended by specific implementations (GitHub, GitLab, etc.)
 */
export interface FileSourceConfig {
  source: string; // 'github' | 'gitlab' | 'local' | etc.
  [key: string]: any; // Allow implementation-specific fields
}

/**
 * Interface for file source implementations
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles file fetching operations
 * - Open/Closed: Extend for new sources without modifying interface
 * - Liskov Substitution: All implementations must be interchangeable
 * - Interface Segregation: Minimal, focused interface
 * - Dependency Inversion: Controllers depend on this abstraction
 *
 * Implementations: GitHubFileSource, GitLabFileSource, LocalFileSource
 */
export interface IFileSource {
  /**
   * Fetch list of available files from the source
   *
   * @param config - Source-specific configuration
   * @returns List of file metadata (paths, types, sizes)
   */
  fetchFileList(config: FileSourceConfig): Promise<Result<FileMetadata[]>>;

  /**
   * Fetch content of a single file
   *
   * @param config - Source-specific configuration
   * @param filePath - Path to the file
   * @returns Parsed JSON content
   */
  fetchFileContent(config: FileSourceConfig, filePath: string): Promise<Result<any>>;

  /**
   * Fetch content of multiple files
   *
   * @param config - Source-specific configuration
   * @param filePaths - Array of file paths
   * @returns Array of parsed JSON contents
   */
  fetchMultipleFiles(config: FileSourceConfig, filePaths: string[]): Promise<Result<any[]>>;

  /**
   * Validate that the source configuration is correct
   * Tests connection without fetching files
   *
   * @param config - Source-specific configuration
   * @returns True if valid, false otherwise
   */
  validateConfig(config: FileSourceConfig): Promise<Result<boolean>>;

  /**
   * Get the identifier for this file source
   *
   * @returns Source identifier (e.g., 'github', 'gitlab')
   */
  getSourceType(): string;
}

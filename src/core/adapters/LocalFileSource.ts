// ====================================================================================
// LOCAL FILE SOURCE ADAPTER
// Handles token files imported from local filesystem
// ====================================================================================

import { IFileSource, FileMetadata, FileSourceConfig } from '../interfaces/IFileSource';
import { Result, Success, Failure } from '../../shared/types';

/**
 * Local file-specific configuration
 */
export interface LocalFileSourceConfig extends FileSourceConfig {
  source: 'local';
  files: Array<{
    name: string;
    path: string;
    content: any;
  }>;
}

/**
 * Local file source implementation
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles local file operations
 * - Open/Closed: Implements IFileSource without modification
 * - Liskov Substitution: Can be used anywhere IFileSource is expected
 * - Interface Segregation: Minimal, focused interface
 * - Dependency Inversion: Depends on IFileSource abstraction
 *
 * Pattern: Strategy
 * - Provides local file access strategy
 * - Works with in-memory file data from Figma's file picker
 * - No actual filesystem access (Figma plugin constraint)
 *
 * Context:
 * Figma plugins run in sandboxed environment with no direct filesystem access.
 * Files are loaded via Figma's UI file picker, which provides file content as
 * base64 or text. This adapter works with that pre-loaded content.
 */
export class LocalFileSource implements IFileSource {
  /**
   * Fetch list of available local files
   * Returns metadata for files provided in config
   *
   * @param config - Local file source configuration with file data
   * @returns List of file metadata
   */
  async fetchFileList(config: FileSourceConfig): Promise<Result<FileMetadata[]>> {
    try {
      const localConfig = config as LocalFileSourceConfig;

      if (!localConfig.files || !Array.isArray(localConfig.files)) {
        return Failure('No files provided in local file source config');
      }

      const metadata: FileMetadata[] = localConfig.files.map(file => ({
        path: file.path || file.name,
        type: 'file' as const,
        size: JSON.stringify(file.content).length,
      }));

      return Success(metadata);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[LocalFileSource] Failed to fetch file list: ${message}`);
      return Failure(message);
    }
  }

  /**
   * Fetch content of a single local file
   *
   * @param config - Local file source configuration
   * @param filePath - Path/name of the file to fetch
   * @returns Parsed JSON content
   */
  async fetchFileContent(config: FileSourceConfig, filePath: string): Promise<Result<any>> {
    try {
      const localConfig = config as LocalFileSourceConfig;

      if (!localConfig.files || !Array.isArray(localConfig.files)) {
        return Failure('No files provided in local file source config');
      }

      // Find file by path or name
      const file = localConfig.files.find(
        f => f.path === filePath || f.name === filePath
      );

      if (!file) {
        return Failure(`File not found: ${filePath}`);
      }

      return Success(file.content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[LocalFileSource] Failed to fetch file '${filePath}': ${message}`);
      return Failure(message);
    }
  }

  /**
   * Fetch content of multiple local files
   *
   * @param config - Local file source configuration
   * @param filePaths - Array of file paths/names to fetch
   * @returns Array of parsed JSON contents
   */
  async fetchMultipleFiles(config: FileSourceConfig, filePaths: string[]): Promise<Result<any[]>> {
    try {
      const localConfig = config as LocalFileSourceConfig;

      if (!localConfig.files || !Array.isArray(localConfig.files)) {
        return Failure('No files provided in local file source config');
      }

      const contents: any[] = [];

      for (const filePath of filePaths) {
        const file = localConfig.files.find(
          f => f.path === filePath || f.name === filePath
        );

        if (!file) {
          console.warn(`[LocalFileSource] File not found: ${filePath}`);
          continue;
        }

        contents.push(file.content);
      }

      if (contents.length === 0) {
        return Failure('No files could be loaded from the provided paths');
      }

      return Success(contents);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[LocalFileSource] Failed to fetch multiple files: ${message}`);
      return Failure(message);
    }
  }

  /**
   * Validate local file source configuration
   * Checks that files are provided and contain valid JSON
   *
   * @param config - Local file source configuration
   * @returns True if valid, false otherwise
   */
  async validateConfig(config: FileSourceConfig): Promise<Result<boolean>> {
    try {
      const localConfig = config as LocalFileSourceConfig;

      // Check that files array exists
      if (!localConfig.files || !Array.isArray(localConfig.files)) {
        console.error('[LocalFileSource] Config validation failed: No files provided');
        return Success(false);
      }

      // Check that all files have required properties
      for (const file of localConfig.files) {
        if (!file.name || !file.content) {
          console.error('[LocalFileSource] Config validation failed: Invalid file structure');
          return Success(false);
        }

        // Validate that content is valid JSON (if it's a string)
        if (typeof file.content === 'string') {
          try {
            JSON.parse(file.content);
          } catch {
            console.error(`[LocalFileSource] Config validation failed: Invalid JSON in ${file.name}`);
            return Success(false);
          }
        }
      }

      return Success(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[LocalFileSource] Config validation failed: ${message}`);
      return Success(false);
    }
  }

  /**
   * Get source type identifier
   *
   * @returns 'local'
   */
  getSourceType(): string {
    return 'local';
  }
}

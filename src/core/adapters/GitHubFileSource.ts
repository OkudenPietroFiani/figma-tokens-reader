// ====================================================================================
// GITHUB FILE SOURCE ADAPTER
// Wraps GitHubService to implement IFileSource interface
// ====================================================================================

import { IFileSource, FileMetadata, FileSourceConfig } from '../interfaces/IFileSource';
import { Result, Success, Failure, GitHubConfig } from '../../shared/types';
import { GitHubService } from '../../services/githubService';

/**
 * GitHub-specific configuration
 */
export interface GitHubFileSourceConfig extends FileSourceConfig {
  source: 'github';
  token: string;
  owner: string;
  repo: string;
  branch: string;
  files?: string[];
}

/**
 * Adapter that wraps GitHubService to implement IFileSource
 *
 * SOLID Principles:
 * - Single Responsibility: Only adapts GitHubService to IFileSource interface
 * - Open/Closed: Extends IFileSource without modifying GitHubService
 * - Liskov Substitution: Can be used anywhere IFileSource is expected
 * - Dependency Inversion: Depends on GitHubService abstraction
 *
 * Pattern: Adapter/Wrapper
 * - Delegates to existing GitHubService
 * - Zero behavioral changes to preserve existing functionality
 * - Thin wrapper (minimal code)
 */
export class GitHubFileSource implements IFileSource {
  private githubService: GitHubService;

  constructor(githubService?: GitHubService) {
    this.githubService = githubService || new GitHubService();
  }

  /**
   * Fetch list of JSON files from GitHub repository
   */
  async fetchFileList(config: FileSourceConfig): Promise<Result<FileMetadata[]>> {
    try {
      const ghConfig = this.toGitHubConfig(config);
      const files = await this.githubService.fetchRepositoryFiles(ghConfig);

      // Convert to FileMetadata format
      const metadata: FileMetadata[] = files.map(file => ({
        path: file.path,
        type: file.type as 'file' | 'dir',
        sha: file.sha
      }));

      return Success(metadata);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[GitHubFileSource] Failed to fetch file list: ${message}`);
      return Failure(message);
    }
  }

  /**
   * Fetch content of a single file from GitHub
   */
  async fetchFileContent(config: FileSourceConfig, filePath: string): Promise<Result<any>> {
    try {
      const ghConfig = this.toGitHubConfig(config);
      const content = await this.githubService.fetchFileContent(ghConfig, filePath);

      return Success(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[GitHubFileSource] Failed to fetch file '${filePath}': ${message}`);
      return Failure(message);
    }
  }

  /**
   * Fetch content of multiple files from GitHub
   */
  async fetchMultipleFiles(config: FileSourceConfig, filePaths: string[]): Promise<Result<any[]>> {
    try {
      const ghConfig = this.toGitHubConfig(config);
      const result = await this.githubService.fetchMultipleFiles(ghConfig, filePaths);

      // Flatten primitives and semantics into array
      const files: any[] = [];

      if (result.primitives) {
        for (const [fileName, content] of Object.entries(result.primitives)) {
          files.push(content);
        }
      }

      if (result.semantics) {
        for (const [fileName, content] of Object.entries(result.semantics)) {
          files.push(content);
        }
      }

      return Success(files);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[GitHubFileSource] Failed to fetch multiple files: ${message}`);
      return Failure(message);
    }
  }

  /**
   * Validate GitHub configuration
   */
  async validateConfig(config: FileSourceConfig): Promise<Result<boolean>> {
    try {
      const ghConfig = this.toGitHubConfig(config);

      // Try to fetch files to validate connection
      await this.githubService.fetchRepositoryFiles(ghConfig);

      return Success(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[GitHubFileSource] Config validation failed: ${message}`);
      return Success(false);
    }
  }

  /**
   * Get source type identifier
   */
  getSourceType(): string {
    return 'github';
  }

  /**
   * Convert FileSourceConfig to GitHubConfig
   * Private helper to maintain type safety
   */
  private toGitHubConfig(config: FileSourceConfig): GitHubConfig {
    const ghConfig = config as GitHubFileSourceConfig;

    return {
      token: ghConfig.token,
      owner: ghConfig.owner,
      repo: ghConfig.repo,
      branch: ghConfig.branch,
      files: ghConfig.files
    };
  }
}

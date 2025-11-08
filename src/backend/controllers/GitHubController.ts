// ====================================================================================
// GITHUB CONTROLLER
// Orchestrates GitHub repository operations
// ====================================================================================

import { Result, Success, GitHubConfig, GitHubFileObject, TokenData } from '../../shared/types';
import { ErrorHandler } from '../utils/ErrorHandler';
import { StorageService } from '../services/StorageService';
import { GitHubService } from '../../services/githubService';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../shared/constants';

/**
 * Controller for GitHub operations
 *
 * Responsibilities:
 * - Fetch repository file lists
 * - Import token files from GitHub
 * - Manage GitHub configuration persistence
 *
 * Principles:
 * - Dependency Injection: Receives services via constructor
 * - Single Responsibility: Only orchestrates GitHub operations
 * - Result Pattern: All public methods return Result<T>
 * - Validation: Validates configs before operations
 */
export class GitHubController {
  private githubService: GitHubService;
  private storage: StorageService;

  constructor(
    githubService: GitHubService,
    storage: StorageService
  ) {
    this.githubService = githubService;
    this.storage = storage;
  }

  /**
   * Fetch list of files from GitHub repository
   * Returns only .json files suitable for token import
   *
   * @param config - GitHub repository configuration
   * @returns Array of file paths
   */
  async fetchFiles(config: GitHubConfig): Promise<Result<string[]>> {
    return ErrorHandler.handle(async () => {
      // Validate required fields
      ErrorHandler.validateRequired(
        config,
        ['owner', 'repo', 'branch'],
        'Fetch GitHub Files'
      );

      ErrorHandler.info(
        `Fetching files from ${config.owner}/${config.repo}@${config.branch}`,
        'GitHubController'
      );

      // Fetch file objects from GitHub
      const fileObjects = await this.githubService.fetchRepositoryFiles(config);

      // Extract just the paths for UI display
      const filePaths = fileObjects.map(file => file.path);

      ErrorHandler.info(
        `Found ${filePaths.length} JSON files in repository`,
        'GitHubController'
      );

      return filePaths;
    }, 'Fetch GitHub Files');
  }

  /**
   * Import multiple token files from GitHub
   * Fetches and parses selected files
   *
   * @param config - GitHub configuration with selected files
   * @returns Token data organized by primitives/semantics
   */
  async importFiles(config: GitHubConfig): Promise<Result<{ primitives: TokenData; semantics: TokenData }>> {
    return ErrorHandler.handle(async () => {
      // Validate required fields
      ErrorHandler.validateRequired(
        config,
        ['owner', 'repo', 'branch', 'files'],
        'Import GitHub Files'
      );

      ErrorHandler.assert(
        config.files && config.files.length > 0,
        'No files selected for import',
        'Import GitHub Files'
      );

      ErrorHandler.info(
        `Importing ${config.files!.length} files from ${config.owner}/${config.repo}@${config.branch}`,
        'GitHubController'
      );

      // Fetch and parse multiple files
      const result = await this.githubService.fetchMultipleFiles(
        config,
        config.files!
      );

      ErrorHandler.info(
        `Files imported successfully (primitives: ${result.primitives ? 'yes' : 'no'}, semantics: ${result.semantics ? 'yes' : 'no'})`,
        'GitHubController'
      );

      return result;
    }, 'Import GitHub Files');
  }

  /**
   * Save GitHub configuration to storage
   * Allows resuming GitHub sync without re-entering credentials
   *
   * @param config - GitHub configuration to save
   */
  async saveConfig(config: GitHubConfig): Promise<Result<void>> {
    return ErrorHandler.handle(async () => {
      // Validate required fields
      ErrorHandler.validateRequired(
        config,
        ['owner', 'repo', 'branch'],
        'Save GitHub Config'
      );

      // Save via StorageService
      const result = await this.storage.saveGitHubConfig(config);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save GitHub configuration');
      }

      ErrorHandler.info('GitHub configuration saved', 'GitHubController');
      ErrorHandler.notifyUser(SUCCESS_MESSAGES.CONFIG_SAVED, 'success');
    }, 'Save GitHub Config');
  }

  /**
   * Load GitHub configuration from storage
   * Restores previously saved credentials and repo info
   *
   * @returns GitHub config or null if not found
   */
  async loadConfig(): Promise<Result<GitHubConfig | null>> {
    return ErrorHandler.handle(async () => {
      const result = await this.storage.getGitHubConfig();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load GitHub configuration');
      }

      if (!result.data) {
        ErrorHandler.info('No saved GitHub config found', 'GitHubController');
        return null;
      }

      ErrorHandler.info(
        `GitHub config loaded: ${result.data.owner}/${result.data.repo}@${result.data.branch}`,
        'GitHubController'
      );

      return result.data;
    }, 'Load GitHub Config');
  }

  /**
   * Clear saved GitHub configuration
   * Useful for disconnecting from repository
   */
  async clearConfig(): Promise<Result<void>> {
    return ErrorHandler.handle(async () => {
      const result = await this.storage.clearGitHubConfig();

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear GitHub configuration');
      }

      ErrorHandler.info('GitHub configuration cleared', 'GitHubController');
      ErrorHandler.notifyUser('GitHub configuration cleared', 'success');
    }, 'Clear GitHub Config');
  }

  /**
   * Validate GitHub configuration
   * Tests connection to repository without fetching files
   *
   * @param config - GitHub configuration to validate
   * @returns True if valid, false otherwise
   */
  async validateConfig(config: GitHubConfig): Promise<Result<boolean>> {
    return ErrorHandler.handle(async () => {
      // Validate required fields
      ErrorHandler.validateRequired(
        config,
        ['owner', 'repo', 'branch'],
        'Validate GitHub Config'
      );

      // Try to fetch files to validate connection
      try {
        await this.githubService.fetchRepositoryFiles(config);
        ErrorHandler.info('GitHub configuration is valid', 'GitHubController');
        return true;
      } catch (error) {
        ErrorHandler.warn(
          `GitHub configuration validation failed: ${ErrorHandler.formatError(error)}`,
          'GitHubController'
        );
        return false;
      }
    }, 'Validate GitHub Config');
  }
}

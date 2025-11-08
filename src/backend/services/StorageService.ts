// ====================================================================================
// STORAGE SERVICE
// Wrapper around figma.clientStorage for type-safe persistence
// ====================================================================================

import { Result, Success, Failure, TokenState, GitHubConfig } from '../../shared/types';
import { STORAGE_KEYS } from '../../shared/constants';
import { ErrorHandler } from '../utils/ErrorHandler';

/**
 * Service for managing plugin persistent storage
 *
 * Principles:
 * - Abstraction: Hides figma.clientStorage implementation details
 * - Type Safety: Strong typing for stored data
 * - Error Handling: Result pattern for all operations
 * - Single Responsibility: Only handles storage operations
 *
 * Storage Schema:
 * - tokenState: { tokenFiles, tokenSource, githubConfig }
 * - githubConfig: { token, owner, repo, branch, files }
 */
export class StorageService {
  /**
   * Save token state to storage
   * Preserves user's current token files and source
   */
  async saveTokenState(state: TokenState): Promise<Result<void>> {
    return ErrorHandler.handle(async () => {
      const serialized = JSON.stringify(state);
      await figma.clientStorage.setAsync(STORAGE_KEYS.TOKEN_STATE, serialized);
      ErrorHandler.info(`Token state saved (${Object.keys(state.tokenFiles).length} files)`, 'StorageService');
    }, 'Save Token State');
  }

  /**
   * Load token state from storage
   * Returns null if no state exists
   */
  async getTokenState(): Promise<Result<TokenState | null>> {
    return ErrorHandler.handle(async () => {
      const serialized = await figma.clientStorage.getAsync(STORAGE_KEYS.TOKEN_STATE);

      if (!serialized) {
        ErrorHandler.info('No token state found in storage', 'StorageService');
        return null;
      }

      const state = JSON.parse(serialized as string) as TokenState;
      ErrorHandler.info(`Token state loaded (${Object.keys(state.tokenFiles).length} files)`, 'StorageService');
      return state;
    }, 'Load Token State');
  }

  /**
   * Clear token state from storage
   */
  async clearTokenState(): Promise<Result<void>> {
    return ErrorHandler.handle(async () => {
      await figma.clientStorage.deleteAsync(STORAGE_KEYS.TOKEN_STATE);
      ErrorHandler.info('Token state cleared', 'StorageService');
    }, 'Clear Token State');
  }

  /**
   * Save GitHub configuration to storage
   * Allows resuming GitHub sync without re-entering credentials
   *
   * SECURITY WARNING: GitHub Personal Access Tokens are stored in plain text
   * in Figma's clientStorage. This is a known limitation. Users should:
   * - Use tokens with minimal required scopes (read-only repository access)
   * - Be aware tokens persist until explicitly cleared
   * - Consider using the "Clear Credentials" feature when done
   */
  async saveGitHubConfig(config: GitHubConfig): Promise<Result<void>> {
    return ErrorHandler.handle(async () => {
      // Validate required fields
      ErrorHandler.validateRequired(
        config,
        ['owner', 'repo', 'branch'],
        'Save GitHub Config'
      );

      const serialized = JSON.stringify(config);
      await figma.clientStorage.setAsync(STORAGE_KEYS.GITHUB_CONFIG, serialized);
      ErrorHandler.info(`GitHub config saved (${config.owner}/${config.repo}@${config.branch})`, 'StorageService');
    }, 'Save GitHub Config');
  }

  /**
   * Load GitHub configuration from storage
   * Returns null if no config exists
   *
   * SECURITY NOTE: Retrieved tokens are in plain text and should be handled
   * securely. Do not log or expose tokens in error messages.
   */
  async getGitHubConfig(): Promise<Result<GitHubConfig | null>> {
    return ErrorHandler.handle(async () => {
      const serialized = await figma.clientStorage.getAsync(STORAGE_KEYS.GITHUB_CONFIG);

      if (!serialized) {
        ErrorHandler.info('No GitHub config found in storage', 'StorageService');
        return null;
      }

      const config = JSON.parse(serialized as string) as GitHubConfig;
      ErrorHandler.info(`GitHub config loaded (${config.owner}/${config.repo}@${config.branch})`, 'StorageService');
      return config;
    }, 'Load GitHub Config');
  }

  /**
   * Clear GitHub configuration from storage
   */
  async clearGitHubConfig(): Promise<Result<void>> {
    return ErrorHandler.handle(async () => {
      await figma.clientStorage.deleteAsync(STORAGE_KEYS.GITHUB_CONFIG);
      ErrorHandler.info('GitHub config cleared', 'StorageService');
    }, 'Clear GitHub Config');
  }

  /**
   * Clear all storage data
   * Useful for plugin reset or debugging
   */
  async clearAll(): Promise<Result<void>> {
    return ErrorHandler.handle(async () => {
      await figma.clientStorage.deleteAsync(STORAGE_KEYS.TOKEN_STATE);
      await figma.clientStorage.deleteAsync(STORAGE_KEYS.GITHUB_CONFIG);
      ErrorHandler.info('All storage cleared', 'StorageService');
    }, 'Clear All Storage');
  }

  /**
   * Get storage usage statistics
   * Useful for debugging
   */
  async getStorageStats(): Promise<Result<{ tokenStateSize: number; githubConfigSize: number }>> {
    return ErrorHandler.handle(async () => {
      const tokenState = await figma.clientStorage.getAsync(STORAGE_KEYS.TOKEN_STATE);
      const githubConfig = await figma.clientStorage.getAsync(STORAGE_KEYS.GITHUB_CONFIG);

      const stats = {
        tokenStateSize: tokenState ? (tokenState as string).length : 0,
        githubConfigSize: githubConfig ? (githubConfig as string).length : 0,
      };

      ErrorHandler.info(`Storage stats: tokenState=${stats.tokenStateSize} bytes, githubConfig=${stats.githubConfigSize} bytes`, 'StorageService');
      return stats;
    }, 'Get Storage Stats');
  }
}

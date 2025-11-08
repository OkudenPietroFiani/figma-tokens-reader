// ====================================================================================
// TOKEN CONTROLLER
// Orchestrates token import/export operations
// ====================================================================================

import { Result, Success, TokenData, ImportStats, TokenState, TokenImportData } from '../../shared/types';
import { ErrorHandler } from '../utils/ErrorHandler';
import { StorageService } from '../services/StorageService';
import { VariableManager } from '../../services/variableManager';
import { SUCCESS_MESSAGES } from '../../shared/constants';

/**
 * Controller for token operations
 *
 * Responsibilities:
 * - Orchestrate token import to Figma variables
 * - Manage token state persistence
 * - Coordinate between VariableManager and StorageService
 *
 * Principles:
 * - Dependency Injection: Receives services via constructor
 * - Single Responsibility: Only orchestrates, delegates work to services
 * - Result Pattern: All public methods return Result<T>
 */
export class TokenController {
  private variableManager: VariableManager;
  private storage: StorageService;

  constructor(
    variableManager: VariableManager,
    storage: StorageService
  ) {
    this.variableManager = variableManager;
    this.storage = storage;
  }

  /**
   * Import tokens to Figma variables
   * Creates/updates variables and text styles
   *
   * @param data - Token import data with primitives and semantics
   * @returns Import statistics
   */
  async importTokens(data: TokenImportData): Promise<Result<ImportStats>> {
    return ErrorHandler.handle(async () => {
      const { primitives, semantics } = data;

      // Validate at least one token set is provided
      if (!primitives && !semantics) {
        throw new Error('No token data provided. Expected primitives or semantics.');
      }

      ErrorHandler.info(
        `Importing tokens (primitives: ${primitives ? 'yes' : 'no'}, semantics: ${semantics ? 'yes' : 'no'})`,
        'TokenController'
      );

      // Import tokens via VariableManager
      // This creates both variables and text styles
      const stats = await this.variableManager.importTokens(
        primitives || {},
        semantics || {}
      );

      ErrorHandler.info(
        `Import completed: ${stats.added} added, ${stats.updated} updated, ${stats.skipped} skipped`,
        'TokenController'
      );

      // Notify user
      ErrorHandler.notifyUser(
        `${SUCCESS_MESSAGES.IMPORT_SUCCESS}: ${stats.added} added, ${stats.updated} updated`,
        'success'
      );

      return stats;
    }, 'Import Tokens');
  }

  /**
   * Save token state to persistent storage
   * Allows resuming work without re-importing
   *
   * @param state - Token state to save
   */
  async saveTokens(state: TokenState): Promise<Result<void>> {
    return ErrorHandler.handle(async () => {
      // Validate state has required fields
      ErrorHandler.validateRequired(
        state,
        ['tokenFiles', 'tokenSource'],
        'Save Tokens'
      );

      // Save to storage
      const result = await this.storage.saveTokenState(state);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save token state');
      }

      ErrorHandler.info('Token state saved successfully', 'TokenController');
    }, 'Save Token State');
  }

  /**
   * Load token state from persistent storage
   * Restores previously imported tokens
   *
   * @returns Token state or null if not found
   */
  async loadTokens(): Promise<Result<TokenState | null>> {
    return ErrorHandler.handle(async () => {
      const result = await this.storage.getTokenState();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load token state');
      }

      if (!result.data) {
        ErrorHandler.info('No saved token state found', 'TokenController');
        return null;
      }

      ErrorHandler.info(
        `Token state loaded: ${Object.keys(result.data.tokenFiles).length} files`,
        'TokenController'
      );

      return result.data;
    }, 'Load Token State');
  }

  /**
   * Clear all saved token state
   * Useful for plugin reset
   */
  async clearTokens(): Promise<Result<void>> {
    return ErrorHandler.handle(async () => {
      const result = await this.storage.clearTokenState();

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear token state');
      }

      ErrorHandler.info('Token state cleared', 'TokenController');
      ErrorHandler.notifyUser('Token state cleared', 'success');
    }, 'Clear Token State');
  }

  /**
   * Get token metadata from last import
   * Useful for debugging and UI display
   */
  getTokenMetadata() {
    return this.variableManager.getTokenMetadata();
  }
}

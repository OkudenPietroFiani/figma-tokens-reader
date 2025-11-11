// ====================================================================================
// TOKEN CONTROLLER
// Orchestrates token import/export operations
// ====================================================================================

import { Result, Success, Failure, TokenData, ImportStats, TokenState, TokenImportData } from '../../shared/types';
import { ErrorHandler } from '../utils/ErrorHandler';
import { StorageService } from '../services/StorageService';
import { FigmaSyncService } from '../../core/services/FigmaSyncService';
import { TokenRepository } from '../../core/services/TokenRepository';
import { TokenProcessor } from '../../core/services/TokenProcessor';
import { SUCCESS_MESSAGES } from '../../shared/constants';

/**
 * Controller for token operations (v2.0)
 *
 * Responsibilities:
 * - Orchestrate token import to Figma variables
 * - Manage token state persistence
 * - Coordinate between FigmaSyncService and StorageService
 *
 * Principles:
 * - Dependency Injection: Receives services via constructor
 * - Single Responsibility: Only orchestrates, delegates work to services
 * - Result Pattern: All public methods return Result<T>
 */
export class TokenController {
  private figmaSyncService: FigmaSyncService;
  private storage: StorageService;
  private tokenRepository: TokenRepository;

  constructor(
    figmaSyncService: FigmaSyncService,
    storage: StorageService,
    tokenRepository: TokenRepository
  ) {
    this.figmaSyncService = figmaSyncService;
    this.storage = storage;
    this.tokenRepository = tokenRepository;
  }

  /**
   * Import tokens to Figma variables (v2.0)
   * Converts legacy TokenData format to Token[] and syncs via FigmaSyncService
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

      // Process tokens using new TokenProcessor
      const processor = new TokenProcessor();
      const allTokens = [];
      let stats: ImportStats = { added: 0, updated: 0, skipped: 0 };

      // Process primitives
      if (primitives) {
        const primResult = await processor.processTokenData(primitives, {
          projectId: 'default',
          collection: 'primitive',
          sourceType: 'local',
          sourceLocation: 'primitives',
        });
        if (primResult.success && primResult.data) {
          allTokens.push(...primResult.data);
        } else if (!primResult.success) {
          throw new Error(`Failed to process primitives: ${primResult.error}`);
        }
      }

      // Process semantics
      if (semantics) {
        const semResult = await processor.processTokenData(semantics, {
          projectId: 'default',
          collection: 'semantic',
          sourceType: 'local',
          sourceLocation: 'semantics',
        });
        if (semResult.success && semResult.data) {
          allTokens.push(...semResult.data);
        } else if (!semResult.success) {
          throw new Error(`Failed to process semantics: ${semResult.error}`);
        }
      }

      // Add to repository
      for (const token of allTokens) {
        this.tokenRepository.add(token);
      }

      // Sync to Figma using FigmaSyncService
      const syncResult = await this.figmaSyncService.syncTokens(allTokens);

      if (!syncResult.success) {
        throw new Error(syncResult.error || 'Failed to sync tokens to Figma');
      }

      // Calculate stats (for now, all tokens are considered "added")
      // TODO: Track actual add vs update in FigmaSyncService
      stats.added = allTokens.length;

      ErrorHandler.info(
        `Import completed: ${stats.added} tokens synced to Figma`,
        'TokenController'
      );

      // Notify user
      ErrorHandler.notifyUser(
        `${SUCCESS_MESSAGES.IMPORT_SUCCESS}: ${stats.added} tokens synced`,
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
        ['tokenFiles'],
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
   * Get all tokens from repository (v2.0)
   * Returns Token[] array instead of legacy TokenMetadata[]
   */
  getTokens() {
    return this.tokenRepository.getAll();
  }
}

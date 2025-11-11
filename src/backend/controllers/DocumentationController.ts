// ====================================================================================
// DOCUMENTATION CONTROLLER
// Orchestrates token documentation generation operations
// ====================================================================================

import { Result, Success, DocumentationOptions, DocumentationResult, TokenFile, TokenMetadata } from '../../shared/types';
import { ErrorHandler } from '../utils/ErrorHandler';
import { StorageService } from '../services/StorageService';
import { DocumentationGenerator } from '../services/DocumentationGenerator';
import { TokenRepository } from '../../core/services/TokenRepository';

/**
 * Controller for documentation operations (v2.0)
 *
 * Responsibilities:
 * - Orchestrate documentation generation
 * - Load token state and metadata
 * - Coordinate between Generator and Storage
 *
 * Principles:
 * - Dependency Injection: Receives services via constructor
 * - Single Responsibility: Only orchestrates, delegates work to services
 * - Result Pattern: All public methods return Result<T>
 */
export class DocumentationController {
  private generator: DocumentationGenerator;
  private storage: StorageService;
  private tokenRepository: TokenRepository;

  constructor(
    generator: DocumentationGenerator,
    storage: StorageService,
    tokenRepository: TokenRepository
  ) {
    this.generator = generator;
    this.storage = storage;
    this.tokenRepository = tokenRepository;
  }

  /**
   * Generate documentation for selected token files
   *
   * @param options - Documentation generation options
   * @returns Result with generation statistics
   */
  async generateDocumentation(options: DocumentationOptions): Promise<Result<DocumentationResult>> {
    return ErrorHandler.handle(async () => {
      // Empty fileNames means use all collections
      const fileCount = options.fileNames?.length || 0;
      ErrorHandler.info(
        fileCount > 0
          ? `Generating documentation for ${fileCount} file(s)`
          : 'Generating documentation for all Figma variable collections',
        'DocumentationController'
      );

      // Load token state from storage (optional - generator can work without it)
      const tokenStateResult = await this.storage.getTokenState();
      let tokenFilesMap = new Map<string, TokenFile>();

      if (tokenStateResult.success && tokenStateResult.data) {
        const tokenState = tokenStateResult.data;
        // Convert tokenFiles object to Map
        for (const [fileName, file] of Object.entries(tokenState.tokenFiles)) {
          tokenFilesMap.set(fileName, file);
        }
        ErrorHandler.info(
          `Loaded ${tokenFilesMap.size} token files from storage`,
          'DocumentationController'
        );
      } else {
        ErrorHandler.info(
          'No token state found in storage, will use Figma variables directly',
          'DocumentationController'
        );
      }

      // Get all tokens from TokenRepository (v2.0)
      const tokens = this.tokenRepository.getAll();

      if (tokens && tokens.length > 0) {
        ErrorHandler.info(
          `Found ${tokens.length} tokens in repository`,
          'DocumentationController'
        );
      } else {
        ErrorHandler.info(
          'No tokens in repository, generator will read from Figma variables',
          'DocumentationController'
        );
      }

      // Generate documentation (uses Token[] overload)
      const result = await this.generator.generate(
        tokenFilesMap,
        tokens,
        options
      );

      if (!result.success) {
        throw new Error(result.error || 'Documentation generation failed');
      }

      ErrorHandler.info(
        `Documentation generated: ${result.data!.tokenCount} tokens in ${result.data!.categoryCount} categories`,
        'DocumentationController'
      );

      // Notify user
      ErrorHandler.notifyUser(
        `✓ Documentation generated: ${result.data!.tokenCount} tokens`,
        'success'
      );

      return result.data!;
    }, 'Generate Documentation');
  }
}

// ====================================================================================
// DOCUMENTATION CONTROLLER
// Orchestrates token documentation generation operations
// ====================================================================================

import { Result, Success, DocumentationOptions, DocumentationResult, TokenFile, TokenMetadata } from '../../shared/types';
import { ErrorHandler } from '../utils/ErrorHandler';
import { StorageService } from '../services/StorageService';
import { DocumentationGenerator } from '../services/DocumentationGenerator';
import { VariableManager } from '../../services/variableManager';

/**
 * Controller for documentation operations
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
  private variableManager: VariableManager;

  constructor(
    generator: DocumentationGenerator,
    storage: StorageService,
    variableManager: VariableManager
  ) {
    this.generator = generator;
    this.storage = storage;
    this.variableManager = variableManager;
  }

  /**
   * Generate documentation for selected token files
   *
   * @param options - Documentation generation options
   * @returns Result with generation statistics
   */
  async generateDocumentation(options: DocumentationOptions): Promise<Result<DocumentationResult>> {
    return ErrorHandler.handle(async () => {
      // Validate options
      if (!options.fileNames || options.fileNames.length === 0) {
        throw new Error('No files selected for documentation');
      }

      ErrorHandler.info(
        `Generating documentation for ${options.fileNames.length} file(s)`,
        'DocumentationController'
      );

      // Load token state from storage
      const tokenStateResult = await this.storage.getTokenState();
      if (!tokenStateResult.success || !tokenStateResult.data) {
        throw new Error('No token state found. Please import tokens first.');
      }

      const tokenState = tokenStateResult.data;

      // Convert tokenFiles object to Map
      const tokenFilesMap = new Map<string, TokenFile>();
      for (const [fileName, file] of Object.entries(tokenState.tokenFiles)) {
        tokenFilesMap.set(fileName, file);
      }

      // Get token metadata from VariableManager
      const tokenMetadata = this.variableManager.getTokenMetadata();

      if (!tokenMetadata || tokenMetadata.length === 0) {
        throw new Error('No token metadata found. Please import tokens to Figma first.');
      }

      ErrorHandler.info(
        `Found ${tokenMetadata.length} tokens in metadata`,
        'DocumentationController'
      );

      // Generate documentation
      const result = await this.generator.generate(
        tokenFilesMap,
        tokenMetadata,
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

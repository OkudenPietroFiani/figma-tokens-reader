// ====================================================================================
// BACKEND MAIN ENTRY POINT
// W3C Design Tokens Importer for Figma
// ====================================================================================

import { UI_CONFIG } from '../shared/constants';
import { PluginMessage } from '../shared/types';
import { ErrorHandler } from './utils/ErrorHandler';

// Services
import { GitHubService } from '../services/githubService';
import { StorageService } from './services/StorageService';
import { TokenRepository } from '../core/services/TokenRepository';
import { TokenResolver } from '../core/services/TokenResolver';
import { FigmaSyncService } from '../core/services/FigmaSyncService';

// Controllers (v2.0 - TODO: Migrate remaining operations)
import { TokenController } from './controllers/TokenController'; // Used for: saveTokens, loadTokens
import { GitHubController } from './controllers/GitHubController'; // Used for: GitHub operations

// New Architecture (Phases 1-4)
// import { FileSourceRegistry } from '../core/registries/FileSourceRegistry'; // DEPRECATED: Never queried
import { TokenFormatRegistry } from '../core/registries/TokenFormatRegistry';
// import { GitHubFileSource } from '../core/adapters/GitHubFileSource'; // DEPRECATED: Only used with FileSourceRegistry
import { W3CTokenFormatStrategy } from '../core/adapters/W3CTokenFormatStrategy';
import { StyleDictionaryFormatStrategy } from '../core/adapters/StyleDictionaryFormatStrategy';

// Layered Architecture (Sprint 3 + Migration)
import { UseCaseRegistry } from '../application/UseCaseRegistry';
import { ImportTokensUseCase } from '../application/use-cases/ImportTokensUseCase';
import { SyncToFigmaVariablesUseCase } from '../application/use-cases/SyncToFigmaVariablesUseCase';
import { GetTokensUseCase } from '../application/use-cases/GetTokensUseCase';
import { GenerateDocumentationUseCase } from '../application/use-cases/GenerateDocumentationUseCase';
import { GetFigmaVariablesUseCase } from '../application/use-cases/GetFigmaVariablesUseCase';
import { ApplyScopesUseCase } from '../application/use-cases/ApplyScopesUseCase';
import { TokenParserRegistry } from '../infrastructure/input/TokenParserRegistry';
import { W3CTokenParser } from '../infrastructure/input/W3CTokenParser';
import { TokenExporterRegistry } from '../infrastructure/output/TokenExporterRegistry';
import { FigmaVariablesExporter } from '../infrastructure/output/FigmaVariablesExporter';
import { InMemoryTokenRepository } from '../infrastructure/storage/InMemoryTokenRepository';

// Documentation Architecture
import { TokenVisualizerRegistry } from '../core/registries/TokenVisualizerRegistry';
import { ColorVisualizer } from '../core/visualizers/ColorVisualizer';
import { SpacingVisualizer } from '../core/visualizers/SpacingVisualizer';
import { FontSizeVisualizer } from '../core/visualizers/FontSizeVisualizer';
import { FontWeightVisualizer } from '../core/visualizers/FontWeightVisualizer';
import { BorderRadiusVisualizer } from '../core/visualizers/BorderRadiusVisualizer';
import { DefaultVisualizer } from '../core/visualizers/DefaultVisualizer';
import { DocumentationGenerator } from './services/DocumentationGenerator';

/**
 * Main backend class for plugin
 *
 * Principles:
 * - Dependency Injection: Services injected into controllers
 * - Controller Pattern: Business logic delegated to controllers
 * - Clean Architecture: Clear separation of concerns
 * - Error Handling: Centralized error handling via ErrorHandler
 */
class PluginBackend {
  // Services (v2.0 Architecture)
  private githubService: GitHubService;
  private storage: StorageService;
  private tokenRepository: TokenRepository;
  private tokenResolver: TokenResolver;
  private figmaSyncService: FigmaSyncService;

  // Layered Architecture (Sprint 3)
  private useCaseRegistry: UseCaseRegistry;
  private parserRegistry: TokenParserRegistry;
  private exporterRegistry: TokenExporterRegistry;
  private repositoryAdapter: InMemoryTokenRepository;

  // Controllers (v2.0 - being phased out)
  private tokenController: TokenController; // TODO: Migrate saveTokens/loadTokens to use cases
  private githubController: GitHubController; // TODO: Migrate GitHub operations to use cases

  constructor() {
    // Register new architecture components (Phases 1-4)
    this.registerArchitectureComponents();

    // Initialize v2.0 services
    this.githubService = new GitHubService();
    this.storage = new StorageService();
    this.tokenRepository = new TokenRepository();
    this.tokenResolver = new TokenResolver(this.tokenRepository);
    this.figmaSyncService = new FigmaSyncService(this.tokenRepository, this.tokenResolver);

    // Initialize layered architecture (Sprint 3)
    this.initializeLayeredArchitecture();

    // Initialize remaining controllers (v2.0 - TODO: migrate)
    this.tokenController = new TokenController(this.figmaSyncService, this.storage, this.tokenRepository, this.tokenResolver);
    this.githubController = new GitHubController(this.githubService, this.storage);

    ErrorHandler.info('Plugin backend initialized (v3.0 Layered Architecture)', 'PluginBackend');
  }

  /**
   * Initialize layered architecture components (Sprint 3)
   *
   * Creates:
   * - Infrastructure layer (parsers, exporters, repositories)
   * - Application layer (use cases)
   * - Use case registry for command execution
   *
   * @private
   */
  private initializeLayeredArchitecture(): void {
    ErrorHandler.info('Initializing layered architecture...', 'PluginBackend');

    // 1. Create infrastructure components

    // Input adapters (parsers)
    this.parserRegistry = new TokenParserRegistry();
    this.parserRegistry.register(new W3CTokenParser());
    // TODO: Add StyleDictionaryParser when implemented

    // Output adapters (exporters)
    this.exporterRegistry = new TokenExporterRegistry();
    const figmaExporter = new FigmaVariablesExporter(this.tokenRepository, this.tokenResolver);
    this.exporterRegistry.register(figmaExporter);
    // TODO: Add FigmaStylesExporter, JSONExporter, CSSExporter when implemented

    // Storage adapter (repository) - CRITICAL: Share the same repository instance!
    // This ensures tokens imported via new architecture are visible to old architecture
    this.repositoryAdapter = new InMemoryTokenRepository(this.tokenRepository);

    // 2. Create application layer (use cases)
    this.useCaseRegistry = new UseCaseRegistry();

    // Import use case
    const importTokensUseCase = new ImportTokensUseCase(
      this.parserRegistry,
      this.repositoryAdapter
    );
    this.useCaseRegistry.register('import-tokens', importTokensUseCase, {
      description: 'Import design tokens from JSON files',
      category: 'import'
    });

    // Sync to Figma use case
    const syncToFigmaUseCase = new SyncToFigmaVariablesUseCase(
      this.repositoryAdapter,
      figmaExporter
    );
    this.useCaseRegistry.register('sync-to-figma', syncToFigmaUseCase, {
      description: 'Sync tokens to Figma Variables',
      category: 'sync'
    });

    // Get tokens (query) use case
    const getTokensUseCase = new GetTokensUseCase(this.repositoryAdapter);
    this.useCaseRegistry.register('get-tokens', getTokensUseCase, {
      description: 'Query and retrieve tokens',
      category: 'query'
    });

    // Documentation use case
    const documentationGenerator = new DocumentationGenerator(this.tokenRepository);
    const generateDocsUseCase = new GenerateDocumentationUseCase(
      this.repositoryAdapter,
      documentationGenerator,
      this.storage
    );
    this.useCaseRegistry.register('generate-documentation', generateDocsUseCase, {
      description: 'Generate visual token documentation in Figma',
      category: 'documentation'
    });

    // Scopes use cases
    const getFigmaVariablesUseCase = new GetFigmaVariablesUseCase();
    this.useCaseRegistry.register('get-figma-variables', getFigmaVariablesUseCase, {
      description: 'Get all Figma variables with scope information',
      category: 'scopes'
    });

    const applyScopesUseCase = new ApplyScopesUseCase();
    this.useCaseRegistry.register('apply-scopes', applyScopesUseCase, {
      description: 'Apply scope assignments to Figma variables',
      category: 'scopes'
    });

    ErrorHandler.info(
      `Layered architecture initialized: ${this.parserRegistry.count()} parsers, ` +
      `${this.exporterRegistry.count()} exporters, ${this.useCaseRegistry.count()} use cases`,
      'PluginBackend'
    );
  }

  /**
   * Register new architecture components
   * Phase 1: File sources and token formats
   * Phase 3: Parallel processing (enabled via FEATURE_FLAGS)
   * Phase 4: Format auto-detection (enabled via FEATURE_FLAGS)
   * Phase 5: Documentation system with visualizers
   * @private
   */
  private registerArchitectureComponents(): void {
    // Register file sources (GitHub, GitLab, etc.)
    // NOTE: FileSourceRegistry is never queried - keeping registration commented out
    // FileSourceRegistry.register(new GitHubFileSource());

    // Register token format strategies (W3C, Style Dictionary, etc.)
    TokenFormatRegistry.register(new W3CTokenFormatStrategy());
    TokenFormatRegistry.register(new StyleDictionaryFormatStrategy());

    // Register token visualizers for documentation
    TokenVisualizerRegistry.register(new ColorVisualizer());
    TokenVisualizerRegistry.register(new SpacingVisualizer());
    TokenVisualizerRegistry.register(new FontSizeVisualizer());
    TokenVisualizerRegistry.register(new FontWeightVisualizer());
    TokenVisualizerRegistry.register(new BorderRadiusVisualizer());
    TokenVisualizerRegistry.register(new DefaultVisualizer());

    ErrorHandler.info('Architecture components registered', 'PluginBackend');
  }

  /**
   * Initialize the plugin
   * Shows UI and sets up message handler
   */
  init(): void {
    // Show UI
    figma.showUI(__html__, {
      width: UI_CONFIG.width,
      height: UI_CONFIG.height
    });

    // Set up message handler
    figma.ui.onmessage = this.handleMessage.bind(this);

    ErrorHandler.info('Plugin UI shown', 'PluginBackend');
  }

  /**
   * Handle messages from UI
   * Routes messages to appropriate controllers
   */
  private async handleMessage(msg: PluginMessage): Promise<void> {
    const requestId = msg.requestId; // Capture requestId for error handling
    try {
      ErrorHandler.info(`Received message: ${msg.type}`, 'PluginBackend');

      switch (msg.type) {
        // ==================== TOKEN OPERATIONS ====================
        case 'import-tokens':
          await this.handleImportTokens(msg);
          break;

        case 'save-tokens':
          await this.handleSaveTokens(msg);
          break;

        case 'load-tokens':
          await this.handleLoadTokens(msg);
          break;

        // ==================== GITHUB OPERATIONS ====================
        case 'github-fetch-files':
          await this.handleGitHubFetchFiles(msg);
          break;

        case 'github-import-files':
          await this.handleGitHubImportFiles(msg);
          break;

        case 'load-github-config':
          await this.handleLoadGitHubConfig(msg);
          break;

        case 'save-github-config':
          await this.handleSaveGitHubConfig(msg);
          break;

        // ==================== SCOPE OPERATIONS ====================
        case 'get-figma-variables':
          await this.handleGetFigmaVariables(msg);
          break;

        case 'apply-variable-scopes':
          await this.handleApplyVariableScopes(msg);
          break;

        // ==================== DOCUMENTATION OPERATIONS ====================
        case 'generate-documentation':
          await this.handleGenerateDocumentation(msg);
          break;

        // ==================== PLUGIN CONTROL ====================
        case 'cancel':
          figma.closePlugin();
          break;

        default:
          ErrorHandler.warn(`Unknown message type: ${msg.type}`, 'PluginBackend');
      }
    } catch (error) {
      const errorMessage = ErrorHandler.formatError(error);
      console.error('[PluginBackend] Unhandled error:', errorMessage);

      // Send error to UI (include requestId if present)
      figma.ui.postMessage({
        type: 'error',
        message: errorMessage,
        requestId: requestId
      });
    }
  }

  // ==================== TOKEN HANDLERS ====================

  private async handleImportTokens(msg: PluginMessage): Promise<void> {
    const { primitives, semantics, source } = msg.data;

    // Validate at least one token set is provided
    if (!primitives && !semantics) {
      throw new Error('No token data provided. Expected primitives or semantics.');
    }

    let totalTokens = 0;

    // Step 1: Import primitives (if provided)
    if (primitives) {
      const primResult = await this.useCaseRegistry.execute('import-tokens', {
        data: primitives,
        projectId: 'default',
        collection: 'primitive',
        filePath: 'primitives.json'
      });

      if (!primResult.success) {
        throw new Error(`Failed to import primitives: ${primResult.error}`);
      }

      totalTokens += primResult.data!.count;
      ErrorHandler.info(`Imported ${primResult.data!.count} primitive tokens`, 'PluginBackend');
    }

    // Step 2: Import semantics (if provided)
    if (semantics) {
      const semResult = await this.useCaseRegistry.execute('import-tokens', {
        data: semantics,
        projectId: 'default',
        collection: 'semantic',
        filePath: 'semantic.json'
      });

      if (!semResult.success) {
        throw new Error(`Failed to import semantics: ${semResult.error}`);
      }

      totalTokens += semResult.data!.count;
      ErrorHandler.info(`Imported ${semResult.data!.count} semantic tokens`, 'PluginBackend');
    }

    // Step 3: Sync all tokens to Figma Variables
    const syncResult = await this.useCaseRegistry.execute('sync-to-figma', {
      projectId: 'default',
      options: { overwrite: true }
    });

    if (!syncResult.success) {
      throw new Error(`Failed to sync to Figma: ${syncResult.error}`);
    }

    const { created, updated, failed } = syncResult.data!;

    ErrorHandler.info(
      `Sync completed: ${created} created, ${updated} updated, ${failed} failed`,
      'PluginBackend'
    );

    // Step 4: Send success message to UI
    figma.ui.postMessage({
      type: 'import-success',
      message: ` Tokens imported: ${created} added, ${updated} updated, ${failed} skipped`,
      requestId: msg.requestId
    });
  }

  private async handleSaveTokens(msg: PluginMessage): Promise<void> {
    const result = await this.tokenController.saveTokens(msg.data);

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  private async handleLoadTokens(msg: PluginMessage): Promise<void> {
    const result = await this.tokenController.loadTokens();

    if (!result.success) {
      throw new Error(result.error);
    }

    // Always send a response, even if data is null (no saved state)
    figma.ui.postMessage({
      type: 'tokens-loaded',
      data: result.data || {},
      requestId: msg.requestId
    });
  }

  // ==================== GITHUB HANDLERS ====================

  private async handleGitHubFetchFiles(msg: PluginMessage): Promise<void> {
    const result = await this.githubController.fetchFiles(msg.data);

    if (result.success) {
      figma.ui.postMessage({
        type: 'github-files-fetched',
        data: { files: result.data },
        requestId: msg.requestId
      });
    } else {
      throw new Error(result.error);
    }
  }

  private async handleGitHubImportFiles(msg: PluginMessage): Promise<void> {
    const result = await this.githubController.importFiles(msg.data);

    if (result.success) {
      figma.ui.postMessage({
        type: 'github-files-imported',
        data: result.data,
        requestId: msg.requestId
      });
    } else {
      throw new Error(result.error);
    }
  }

  private async handleLoadGitHubConfig(msg: PluginMessage): Promise<void> {
    const result = await this.githubController.loadConfig();

    if (result.success && result.data) {
      figma.ui.postMessage({
        type: 'github-config-loaded',
        data: result.data,
        requestId: msg.requestId
      });
    } else if (!result.success) {
      throw new Error(result.error);
    }
    // If result.data is null, just don't send anything (no saved config)
  }

  private async handleSaveGitHubConfig(msg: PluginMessage): Promise<void> {
    const result = await this.githubController.saveConfig(msg.data);

    if (!result.success) {
      throw new Error(result.error);
    }
  }

  // ==================== SCOPE HANDLERS ====================

  private async handleGetFigmaVariables(msg: PluginMessage): Promise<void> {
    const result = await this.useCaseRegistry.execute('get-figma-variables', {});

    if (!result.success) {
      throw new Error(result.error);
    }

    figma.ui.postMessage({
      type: 'figma-variables-loaded',
      data: { variables: result.data!.variables },
      requestId: msg.requestId
    });
  }

  private async handleApplyVariableScopes(msg: PluginMessage): Promise<void> {
    const result = await this.useCaseRegistry.execute('apply-scopes', {
      scopeAssignments: msg.data.variableScopes
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    figma.ui.postMessage({
      type: 'scopes-applied',
      message: `Scopes updated for ${result.data!.updatedCount} variable(s)`,
      requestId: msg.requestId
    });
  }

  // ==================== DOCUMENTATION HANDLERS ====================

  private async handleGenerateDocumentation(msg: PluginMessage): Promise<void> {
    const result = await this.useCaseRegistry.execute('generate-documentation', {
      fileNames: msg.data.fileNames,
      pageName: msg.data.pageName,
      includeVisuals: msg.data.includeVisuals,
      organization: msg.data.organization
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    figma.ui.postMessage({
      type: 'documentation-generated',
      data: result.data,
      message: `Documentation generated: ${result.data!.tokenCount} tokens in ${result.data!.categoryCount} categories`,
      requestId: msg.requestId
    });
  }
}

// ==================== PLUGIN INITIALIZATION ====================
// Create and initialize the plugin backend
const backend = new PluginBackend();
backend.init();

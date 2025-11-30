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

// Controllers
import { TokenController } from './controllers/TokenController';
import { GitHubController } from './controllers/GitHubController';
import { ScopeController } from './controllers/ScopeController';
import { DocumentationController } from './controllers/DocumentationController';

// New Architecture (Phases 1-4)
// import { FileSourceRegistry } from '../core/registries/FileSourceRegistry'; // DEPRECATED: Never queried
import { TokenFormatRegistry } from '../core/registries/TokenFormatRegistry';
// import { GitHubFileSource } from '../core/adapters/GitHubFileSource'; // DEPRECATED: Only used with FileSourceRegistry
import { W3CTokenFormatStrategy } from '../core/adapters/W3CTokenFormatStrategy';
import { StyleDictionaryFormatStrategy } from '../core/adapters/StyleDictionaryFormatStrategy';

// Layered Architecture (Sprint 3)
import { UseCaseRegistry } from '../application/UseCaseRegistry';
import { ImportTokensUseCase } from '../application/use-cases/ImportTokensUseCase';
import { SyncToFigmaVariablesUseCase } from '../application/use-cases/SyncToFigmaVariablesUseCase';
import { GetTokensUseCase } from '../application/use-cases/GetTokensUseCase';
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

  // Controllers
  private tokenController: TokenController;
  private githubController: GitHubController;
  private scopeController: ScopeController;
  private documentationController: DocumentationController;

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

    // Initialize controllers with dependency injection
    this.tokenController = new TokenController(this.figmaSyncService, this.storage, this.tokenRepository, this.tokenResolver);
    this.githubController = new GitHubController(this.githubService, this.storage);
    this.scopeController = new ScopeController();

    // Initialize documentation controller
    const documentationGenerator = new DocumentationGenerator(this.tokenRepository);
    this.documentationController = new DocumentationController(
      documentationGenerator,
      this.storage,
      this.tokenRepository
    );

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

    // Storage adapter (repository)
    this.repositoryAdapter = new InMemoryTokenRepository();

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
    const result = await this.tokenController.importTokens({
      primitives: msg.data.primitives,
      semantics: msg.data.semantics,
      source: msg.data.source || 'local'
    });

    if (result.success) {
      figma.ui.postMessage({
        type: 'import-success',
        message: ` Tokens imported: ${result.data!.added} added, ${result.data!.updated} updated, ${result.data!.skipped} skipped`,
        requestId: msg.requestId
      });
    } else {
      throw new Error(result.error);
    }
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
    const result = await this.scopeController.getFigmaVariables();

    if (result.success) {
      figma.ui.postMessage({
        type: 'figma-variables-loaded',
        data: { variables: result.data },
        requestId: msg.requestId
      });
    } else {
      throw new Error(result.error);
    }
  }

  private async handleApplyVariableScopes(msg: PluginMessage): Promise<void> {
    const result = await this.scopeController.applyScopes(msg.data.variableScopes);

    if (result.success) {
      figma.ui.postMessage({
        type: 'scopes-applied',
        message: `Scopes updated for ${result.data} variable(s)`,
        requestId: msg.requestId
      });
    } else {
      throw new Error(result.error);
    }
  }

  // ==================== DOCUMENTATION HANDLERS ====================

  private async handleGenerateDocumentation(msg: PluginMessage): Promise<void> {
    const result = await this.documentationController.generateDocumentation(msg.data);

    if (result.success) {
      figma.ui.postMessage({
        type: 'documentation-generated',
        data: result.data,
        message: `Documentation generated: ${result.data!.tokenCount} tokens in ${result.data!.categoryCount} categories`,
        requestId: msg.requestId
      });
    } else {
      throw new Error(result.error);
    }
  }
}

// ==================== PLUGIN INITIALIZATION ====================
// Create and initialize the plugin backend
const backend = new PluginBackend();
backend.init();

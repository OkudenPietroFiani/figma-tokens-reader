// ====================================================================================
// FRONTEND ENTRY POINT
// Initializes and manages all UI components
// ====================================================================================

import { AppState } from './state/AppState';
import { PluginBridge } from './services/PluginBridge';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ImportScreen } from './components/ImportScreen';
import { TokenScreen } from './components/TokenScreen';
import { ScopeScreen } from './components/ScopeScreen';
import { ScreenType } from '../shared/types';

/**
 * Frontend application class
 * Manages components and screen navigation
 */
class FrontendApp {
  private state: AppState;
  private bridge: PluginBridge;

  // Components
  private welcomeScreen: WelcomeScreen;
  private importScreen: ImportScreen;
  private tokenScreen: TokenScreen;
  private scopeScreen: ScopeScreen;

  // Screen registry
  private screens: Map<ScreenType, any>;

  constructor() {
    // Initialize state and bridge
    this.state = new AppState();
    this.bridge = new PluginBridge();

    // Create components (pass both state and bridge)
    this.welcomeScreen = new WelcomeScreen(this.state);
    this.importScreen = new ImportScreen(this.state, this.bridge);
    this.tokenScreen = new TokenScreen(this.state, this.bridge);
    this.scopeScreen = new ScopeScreen(this.state, this.bridge);

    // Initialize components (bind events after all properties are set)
    this.welcomeScreen.init();
    this.importScreen.init();
    this.tokenScreen.init();
    this.scopeScreen.init();

    // Register screens
    this.screens = new Map([
      ['welcome', this.welcomeScreen],
      ['import', this.importScreen],
      ['token', this.tokenScreen],
    ]);
  }

  /**
   * Initialize and start the application
   */
  init(): void {
    // Mount all components
    const body = document.body;
    this.welcomeScreen.mount(body);
    this.importScreen.mount(body);
    this.tokenScreen.mount(body);

    // Show welcome screen by default
    this.welcomeScreen.show();

    // Subscribe to screen changes
    this.state.subscribe('screen-changed', (screen: ScreenType) => {
      this.handleScreenChange(screen);
    });

    // Setup backend message handlers
    this.setupBackendHandlers();

    console.log('[Frontend] Application started');
  }

  /**
   * Handle screen navigation
   */
  private handleScreenChange(screen: ScreenType): void {
    console.log(`[Frontend] Navigating to: ${screen}`);

    // Hide all screens
    this.screens.forEach(s => s.hide());

    // Show requested screen
    const targetScreen = this.screens.get(screen);
    if (targetScreen) {
      targetScreen.show();
    } else {
      console.warn(`[Frontend] Unknown screen: ${screen}`);
    }
  }

  /**
   * Setup backend message handlers
   */
  private setupBackendHandlers(): void {
    // Import success
    this.bridge.on('import-success', (message: string) => {
      console.log('[Frontend] Import success:', message);
    });

    // Error
    this.bridge.on('error', (message: string) => {
      console.error('[Frontend] Backend error:', message);
    });

    // GitHub files fetched
    this.bridge.on('github-files-fetched', (data: any) => {
      console.log('[Frontend] GitHub files fetched:', data);
    });

    // Tokens loaded
    this.bridge.on('tokens-loaded', (data: any) => {
      console.log('[Frontend] Tokens loaded:', data);
    });
  }
}

// Initialize app when DOM is ready
try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const app = new FrontendApp();
      app.init();
    });
  } else {
    const app = new FrontendApp();
    app.init();
  }
} catch (error) {
  console.error('[Frontend] Initialization error:', error);
}

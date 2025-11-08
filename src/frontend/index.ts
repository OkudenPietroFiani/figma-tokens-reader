// ====================================================================================
// FRONTEND ENTRY POINT
// Initializes and manages all UI components
// ====================================================================================

console.log('[Frontend] Script loading...');

import { AppState } from './state/AppState';
import { PluginBridge } from './services/PluginBridge';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ImportScreen } from './components/ImportScreen';
import { TokenScreen } from './components/TokenScreen';
import { ScopeScreen } from './components/ScopeScreen';
import { ScreenType } from '../shared/types';

console.log('[Frontend] All imports loaded');

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
    console.log('[FrontendApp] Constructor starting...');

    // Initialize state and bridge
    console.log('[FrontendApp] Creating AppState...');
    this.state = new AppState();
    console.log('[FrontendApp] Creating PluginBridge...');
    this.bridge = new PluginBridge();

    // Create components (pass both state and bridge)
    console.log('[FrontendApp] Creating WelcomeScreen...');
    this.welcomeScreen = new WelcomeScreen(this.state);
    console.log('[FrontendApp] Creating ImportScreen...');
    this.importScreen = new ImportScreen(this.state, this.bridge);
    console.log('[FrontendApp] Creating TokenScreen...');
    this.tokenScreen = new TokenScreen(this.state, this.bridge);
    console.log('[FrontendApp] Creating ScopeScreen...');
    this.scopeScreen = new ScopeScreen(this.state, this.bridge);

    // Register screens
    this.screens = new Map([
      ['welcome', this.welcomeScreen],
      ['import', this.importScreen],
      ['token', this.tokenScreen],
    ]);

    console.log('[FrontendApp] Initialized');
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

    console.log('[FrontendApp] Started');
  }

  /**
   * Handle screen navigation
   */
  private handleScreenChange(screen: ScreenType): void {
    console.log(`[FrontendApp] Navigating to: ${screen}`);

    // Hide all screens
    this.screens.forEach(s => s.hide());

    // Show requested screen
    const targetScreen = this.screens.get(screen);
    if (targetScreen) {
      targetScreen.show();
    } else {
      console.warn(`[FrontendApp] Unknown screen: ${screen}`);
    }
  }

  /**
   * Setup backend message handlers
   */
  private setupBackendHandlers(): void {
    // Import success
    this.bridge.on('import-success', (message: string) => {
      console.log('[FrontendApp] Import success:', message);
      // Show notification or update UI
    });

    // Error
    this.bridge.on('error', (message: string) => {
      console.error('[FrontendApp] Backend error:', message);
      // Show error notification
    });

    // GitHub files fetched
    this.bridge.on('github-files-fetched', (data: any) => {
      console.log('[FrontendApp] GitHub files fetched:', data);
    });

    // Tokens loaded
    this.bridge.on('tokens-loaded', (data: any) => {
      console.log('[FrontendApp] Tokens loaded:', data);
      // Update state with loaded tokens
    });

    console.log('[FrontendApp] Backend handlers setup complete');
  }
}

// Initialize app when DOM is ready
console.log('[Frontend] Setting up initialization...');
console.log('[Frontend] document.readyState:', document.readyState);

try {
  if (document.readyState === 'loading') {
    console.log('[Frontend] Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Frontend] DOMContentLoaded fired!');
      try {
        const app = new FrontendApp();
        app.init();
      } catch (error) {
        console.error('[Frontend] Error during initialization:', error);
        console.error('[Frontend] Error stack:', error instanceof Error ? error.stack : 'No stack');
      }
    });
  } else {
    console.log('[Frontend] DOM already loaded, initializing immediately...');
    try {
      const app = new FrontendApp();
      app.init();
    } catch (error) {
      console.error('[Frontend] Error during initialization:', error);
      console.error('[Frontend] Error stack:', error instanceof Error ? error.stack : 'No stack');
    }
  }
} catch (error) {
  console.error('[Frontend] Error in setup:', error);
}

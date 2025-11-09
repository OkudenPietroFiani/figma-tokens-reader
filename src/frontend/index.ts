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
      ['scope', this.scopeScreen],
    ]);
  }

  /**
   * Initialize and start the application
   */
  async init(): Promise<void> {
    // Mount all components
    const body = document.body;
    this.welcomeScreen.mount(body);
    this.importScreen.mount(body);
    this.tokenScreen.mount(body);
    this.scopeScreen.mount(body);

    // Hide all screens initially
    this.welcomeScreen.hide();
    this.importScreen.hide();
    this.tokenScreen.hide();
    this.scopeScreen.hide();

    // Subscribe to screen changes
    this.state.subscribe('screen-changed', (screen: ScreenType) => {
      this.handleScreenChange(screen);
    });

    // Subscribe to file changes to auto-save
    this.state.subscribe('files-loaded', () => {
      this.saveTokenState();
    });

    // Setup backend message handlers
    this.setupBackendHandlers();

    // Setup notification system
    this.setupNotificationSystem();

    // Load saved tokens if any
    await this.loadSavedTokens();

    console.log('[Frontend] Application started');
  }

  /**
   * Load saved tokens from storage
   */
  private async loadSavedTokens(): Promise<void> {
    try {
      console.log('[Frontend] Loading saved tokens...');
      const response = await this.bridge.send('load-tokens');
      console.log('[Frontend] Load tokens response:', response);

      if (response && response.tokenFiles && Object.keys(response.tokenFiles).length > 0) {
        // Restore state
        const files = Object.values(response.tokenFiles);
        console.log('[Frontend] Found saved tokens:', files.length, 'files');

        // Manually set token files without updating lastUpdated
        files.forEach((file: any) => {
          this.state.addTokenFile(file);
        });
        this.state.setTokenSource(response.tokenSource || 'local');

        // Restore GitHub config if present
        if (response.githubConfig) {
          console.log('[Frontend] Restoring GitHub config:', response.githubConfig);
          this.state.setGitHubConfig(response.githubConfig);
        }

        // Restore lastUpdated timestamp if present
        if (response.lastUpdated) {
          // Access private property through snapshot
          const snapshot = this.state.getSnapshot();
          snapshot.lastUpdated = response.lastUpdated;
          this.state.restoreSnapshot(snapshot);
        }

        // Navigate to token screen
        console.log('[Frontend] Navigating to token screen');
        this.state.setCurrentScreen('token');
        console.log('[Frontend] Restored saved tokens successfully');
      } else {
        // No saved tokens, show welcome screen
        console.log('[Frontend] No saved tokens found, showing welcome screen');
        this.welcomeScreen.show();
      }
    } catch (error) {
      console.error('[Frontend] Failed to load saved tokens:', error);
      // Show welcome screen on error
      this.welcomeScreen.show();
    }
  }

  /**
   * Save current token state to storage
   */
  private saveTokenState(): void {
    const files = Array.from(this.state.tokenFiles.values());

    // Only save if there are files
    if (files.length === 0) {
      return;
    }

    // Convert files array to object keyed by name
    const tokenFiles: { [key: string]: any } = {};
    files.forEach(file => {
      tokenFiles[file.name] = file;
    });

    const tokenState = {
      tokenFiles,
      tokenSource: this.state.tokenSource,
      githubConfig: this.state.githubConfig,
      lastUpdated: this.state.lastUpdated
    };

    // Save asynchronously without waiting
    this.bridge.sendAsync('save-tokens', tokenState);
    console.log('[Frontend] Saved token state:', files.length, 'files');
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

  /**
   * Setup notification system
   */
  private setupNotificationSystem(): void {
    // Create notification container
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(container);

    // Listen for notification events
    window.addEventListener('notification', ((event: CustomEvent) => {
      const { message, type } = event.detail;
      this.displayNotification(message, type);
    }) as EventListener);
  }

  /**
   * Display a notification
   */
  private displayNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const container = document.getElementById('notification-container');
    if (!container) return;

    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: ${type === 'success' ? '#0ACF83' : type === 'error' ? '#F24822' : '#0066FF'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      max-width: 300px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      pointer-events: auto;
      cursor: pointer;
      animation: slideIn 0.2s ease-out;
    `;
    notification.textContent = message;

    // Add animation keyframes
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Add to container
    container.appendChild(notification);

    // Auto-remove after 4 seconds
    const removeNotification = () => {
      notification.style.animation = 'slideOut 0.2s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 200);
    };

    // Click to dismiss
    notification.addEventListener('click', removeNotification);

    // Auto-dismiss
    setTimeout(removeNotification, 4000);
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

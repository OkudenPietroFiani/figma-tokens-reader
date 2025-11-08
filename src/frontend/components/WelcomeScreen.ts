// ====================================================================================
// WELCOME SCREEN COMPONENT
// Landing page with import source selection
// ====================================================================================

import { BaseComponent } from './BaseComponent';
import { AppState } from '../state/AppState';
import { SCREEN_IDS, CSS_CLASSES } from '../../shared/constants';

/**
 * Welcome screen component
 *
 * Features:
 * - Logo and title
 * - Two import options: GitHub or Local
 * - Back button (shown when returning from token screen)
 *
 * Principles:
 * - Extends BaseComponent for lifecycle management
 * - Updates AppState on user interaction
 * - Clean UI with clear call-to-action
 */
export class WelcomeScreen extends BaseComponent {
  private connectGithubBtn!: HTMLButtonElement;
  private importLocalBtn!: HTMLButtonElement;
  private backToTokensBtn!: HTMLButtonElement;

  constructor(state: AppState) {
    super(state);
  }

  protected createElement(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = SCREEN_IDS.WELCOME;
    screen.className = 'screen welcome-screen';

    screen.innerHTML = `
      <div class="welcome-logo"><®</div>
      <h1 class="welcome-title">W3C Design Tokens Importer</h1>
      <p class="welcome-subtitle">
        Import and sync design tokens from GitHub repositories or local files to Figma Variables
      </p>

      <div class="welcome-buttons">
        <button class="btn-pill primary" id="connect-github-btn">Connect to GitHub</button>
        <button class="btn-pill secondary" id="import-local-btn">Import Local Files</button>
      </div>

      <button class="welcome-back-btn hidden" id="back-to-tokens-btn">
        ê Back to Tokens
      </button>
    `;

    // Cache button references
    this.connectGithubBtn = screen.querySelector('#connect-github-btn')!;
    this.importLocalBtn = screen.querySelector('#import-local-btn')!;
    this.backToTokensBtn = screen.querySelector('#back-to-tokens-btn')!;

    return screen;
  }

  protected bindEvents(): void {
    // Connect to GitHub button
    this.addEventListener(this.connectGithubBtn, 'click', () => {
      this.handleGitHubConnect();
    });

    // Import Local Files button
    this.addEventListener(this.importLocalBtn, 'click', () => {
      this.handleLocalImport();
    });

    // Back to Tokens button
    this.addEventListener(this.backToTokensBtn, 'click', () => {
      this.handleBackToTokens();
    });

    // Listen to state changes to show/hide back button
    this.subscribeToState('files-loaded', () => {
      this.updateBackButton();
    });
  }

  /**
   * Handle GitHub connect button click
   * Navigates to import screen with GitHub mode
   */
  private handleGitHubConnect(): void {
    console.log('[WelcomeScreen] GitHub connect clicked');

    // Update state
    this.state.setImportMode('github');
    this.state.setCurrentScreen('import');
  }

  /**
   * Handle local import button click
   * Navigates to import screen with local mode
   */
  private handleLocalImport(): void {
    console.log('[WelcomeScreen] Local import clicked');

    // Update state
    this.state.setImportMode('local');
    this.state.setCurrentScreen('import');
  }

  /**
   * Handle back to tokens button click
   * Returns to token screen
   */
  private handleBackToTokens(): void {
    console.log('[WelcomeScreen] Back to tokens clicked');

    this.state.setCurrentScreen('token');
  }

  /**
   * Update back button visibility
   * Show if tokens are loaded, hide otherwise
   */
  private updateBackButton(): void {
    const hasTokens = this.state.tokenFiles.size > 0;

    if (hasTokens) {
      this.backToTokensBtn.classList.remove(CSS_CLASSES.HIDDEN);
    } else {
      this.backToTokensBtn.classList.add(CSS_CLASSES.HIDDEN);
    }
  }

  /**
   * Show this screen
   * Override to add custom logic if needed
   */
  show(): void {
    super.show();
    this.updateBackButton();
    console.log('[WelcomeScreen] Screen shown');
  }
}

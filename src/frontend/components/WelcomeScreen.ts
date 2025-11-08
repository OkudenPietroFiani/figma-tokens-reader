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
      <h1 class="welcome-title">W3C Token manager</h1>
      <p class="welcome-subtitle">
        Token manager helps you synchronise your W3C tokens with Figma variables and styles
      </p>

      <div class="welcome-actions">
        <button class="btn btn-primary" id="connect-github-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" fill="currentColor"/>
          </svg>
          Connect to Github
        </button>
        <button class="btn btn-secondary" id="import-local-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Import a file
        </button>
      </div>

      <button class="welcome-back-btn hidden" id="back-to-tokens-btn">
        � Back to Tokens
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

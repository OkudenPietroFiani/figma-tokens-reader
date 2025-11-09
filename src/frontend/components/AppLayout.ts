// ====================================================================================
// APP LAYOUT COMPONENT
// Shared layout for Token and Scope screens
// ====================================================================================

import { BaseComponent } from './BaseComponent';
import { AppState } from '../state/AppState';
import { ScreenType } from '../../shared/types';

/**
 * AppLayout component
 * Provides the shared top navigation bar and action footer
 * Used by both Token and Scope screens
 */
export class AppLayout extends BaseComponent {
  private topBar!: HTMLDivElement;
  private contentArea!: HTMLDivElement;
  private actionFooter!: HTMLDivElement;
  private tokensTab!: HTMLButtonElement;
  private scopesTab!: HTMLButtonElement;
  private documentationTab!: HTMLButtonElement;
  private switchSourceBtn!: HTMLButtonElement;
  private syncBtn!: HTMLButtonElement;
  private pullChangesBtn!: HTMLButtonElement;
  private changeIndicator!: HTMLSpanElement;
  private lastUpdatedText!: HTMLDivElement;

  // Callbacks for button actions (set by screens)
  public onSync: (() => void) | null = null;
  public onPull: (() => void) | null = null;

  constructor(state: AppState) {
    super(state);
  }

  protected createElement(): HTMLElement {
    const layout = document.createElement('div');
    layout.id = 'app-layout';
    layout.className = 'app-layout hidden';

    layout.innerHTML = `
      <!-- Top Navigation Bar -->
      <div class="app-top-bar">
        <div class="app-tabs">
          <button class="app-tab active" id="app-tokens-tab">Tokens</button>
          <button class="app-tab" id="app-scopes-tab">Scopes</button>
          <button class="app-tab" id="app-documentation-tab">Documentation</button>
        </div>
        <button class="btn-switch-source" id="app-switch-source-btn">Switch source</button>
      </div>

      <!-- Content Area (screens will mount here) -->
      <div id="app-content-area" class="app-content-area"></div>

      <!-- Action Footer -->
      <div class="app-actions">
        <button class="btn btn-primary" id="app-sync-btn">Sync in Figma</button>
        <button class="btn btn-secondary hidden" id="app-pull-btn">
          Pull changes
          <span class="badge badge-info hidden" id="app-change-indicator"></span>
        </button>
      </div>
    `;

    // Cache references
    this.topBar = layout.querySelector('.app-top-bar')!;
    this.contentArea = layout.querySelector('#app-content-area')!;
    this.actionFooter = layout.querySelector('.app-actions')!;
    this.tokensTab = layout.querySelector('#app-tokens-tab')!;
    this.scopesTab = layout.querySelector('#app-scopes-tab')!;
    this.documentationTab = layout.querySelector('#app-documentation-tab')!;
    this.switchSourceBtn = layout.querySelector('#app-switch-source-btn')!;
    this.syncBtn = layout.querySelector('#app-sync-btn')!;
    this.pullChangesBtn = layout.querySelector('#app-pull-btn')!;
    this.changeIndicator = layout.querySelector('#app-change-indicator')!;

    return layout;
  }

  protected bindEvents(): void {
    // Tokens tab
    this.addEventListener(this.tokensTab, 'click', () => {
      this.state.setCurrentScreen('token');
    });

    // Scopes tab
    this.addEventListener(this.scopesTab, 'click', () => {
      this.state.setCurrentScreen('scope');
    });

    // Documentation tab
    this.addEventListener(this.documentationTab, 'click', () => {
      this.state.setCurrentScreen('documentation');
    });

    // Switch source button
    this.addEventListener(this.switchSourceBtn, 'click', () => {
      this.state.setCurrentScreen('welcome');
    });

    // Sync button - delegates to current screen
    this.addEventListener(this.syncBtn, 'click', () => {
      if (this.onSync) {
        this.onSync();
      }
    });

    // Pull button - delegates to current screen
    this.addEventListener(this.pullChangesBtn, 'click', () => {
      if (this.onPull) {
        this.onPull();
      }
    });

    // Subscribe to screen changes to update active tab
    this.subscribeToState('screen-changed', (screen: ScreenType) => {
      this.updateActiveTab(screen);
      this.updateVisibility(screen);
    });
  }

  /**
   * Update active tab based on current screen
   */
  private updateActiveTab(screen: ScreenType): void {
    this.tokensTab.classList.toggle('active', screen === 'token');
    this.scopesTab.classList.toggle('active', screen === 'scope');
    this.documentationTab.classList.toggle('active', screen === 'documentation');
  }

  /**
   * Show or hide the layout based on current screen
   */
  private updateVisibility(screen: ScreenType): void {
    // Only show layout for token, scope, and documentation screens
    const shouldShow = screen === 'token' || screen === 'scope' || screen === 'documentation';

    if (shouldShow) {
      this.element.classList.remove('hidden');
    } else {
      this.element.classList.add('hidden');
    }
  }

  /**
   * Get the content area where screens should mount their content
   */
  public getContentArea(): HTMLElement {
    return this.contentArea;
  }

  /**
   * Update pull button visibility and badge
   */
  public updatePullButton(visible: boolean, hasChanges: boolean = false): void {
    if (visible) {
      this.pullChangesBtn.classList.remove('hidden');
      this.changeIndicator.classList.toggle('hidden', !hasChanges);
    } else {
      this.pullChangesBtn.classList.add('hidden');
    }
  }

  /**
   * Enable or disable buttons
   */
  public setButtonsEnabled(enabled: boolean): void {
    this.syncBtn.disabled = !enabled;
    this.pullChangesBtn.disabled = !enabled;
  }
}

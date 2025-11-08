// ====================================================================================
// APP STATE
// Centralized state management with Observable pattern
// ====================================================================================

import {
  TokenFile,
  AppStateEvent,
  ScreenType,
  TabType,
  ImportMode,
  GitHubConfig,
  FigmaVariableData
} from '../../shared/types';

/**
 * Centralized application state with Observable pattern
 *
 * Principles:
 * - Single Source of Truth: All app state in one place
 * - Observable Pattern: Emit events on state changes
 * - Immutability: State changes create new references
 * - Type Safety: Strongly typed state and events
 *
 * Usage:
 * const state = new AppState();
 * state.subscribe('screen-changed', (screen) => {
 *   console.log('Screen changed to:', screen);
 * });
 * state.setCurrentScreen('import');
 */
export class AppState {
  // ==================== STATE PROPERTIES ====================

  private _tokenFiles: Map<string, TokenFile> = new Map();
  private _selectedFile: string | null = null;
  private _selectedTokens: Set<string> = new Set();
  private _currentScreen: ScreenType = 'welcome';
  private _currentTab: TabType = 'tokens';
  private _importMode: ImportMode = 'github';
  private _tokenSource: 'github' | 'local' | null = null;
  private _githubConfig: GitHubConfig | null = null;
  private _figmaVariables: Map<string, FigmaVariableData> = new Map();
  private _tokenScopesMap: Map<string, string[]> = new Map();

  // ==================== OBSERVABLE PATTERN ====================

  private eventListeners: Map<AppStateEvent, Set<Function>> = new Map();

  /**
   * Subscribe to state change events
   * Returns unsubscribe function
   */
  subscribe(event: AppStateEvent, callback: (data?: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(event, callback);
    };
  }

  /**
   * Unsubscribe from state change events
   */
  unsubscribe(event: AppStateEvent, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  private emit(event: AppStateEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[AppState] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // ==================== GETTERS ====================

  get tokenFiles(): Map<string, TokenFile> {
    return new Map(this._tokenFiles); // Return copy for immutability
  }

  get selectedFile(): string | null {
    return this._selectedFile;
  }

  get selectedTokens(): Set<string> {
    return new Set(this._selectedTokens); // Return copy for immutability
  }

  get currentScreen(): ScreenType {
    return this._currentScreen;
  }

  get currentTab(): TabType {
    return this._currentTab;
  }

  get importMode(): ImportMode {
    return this._importMode;
  }

  get tokenSource(): 'github' | 'local' | null {
    return this._tokenSource;
  }

  get githubConfig(): GitHubConfig | null {
    return this._githubConfig;
  }

  get figmaVariables(): Map<string, FigmaVariableData> {
    return new Map(this._figmaVariables); // Return copy for immutability
  }

  get tokenScopesMap(): Map<string, string[]> {
    return new Map(this._tokenScopesMap); // Return copy for immutability
  }

  // ==================== SETTERS WITH EVENTS ====================

  /**
   * Set token files and emit event
   */
  setTokenFiles(files: TokenFile[]): void {
    this._tokenFiles.clear();
    files.forEach(file => {
      this._tokenFiles.set(file.name, file);
    });

    this.emit('files-loaded', files);
    console.log(`[AppState] Token files updated: ${files.length} files`);
  }

  /**
   * Add a single token file
   */
  addTokenFile(file: TokenFile): void {
    this._tokenFiles.set(file.name, file);
    this.emit('files-loaded', Array.from(this._tokenFiles.values()));
    console.log(`[AppState] Token file added: ${file.name}`);
  }

  /**
   * Remove a token file
   */
  removeTokenFile(fileName: string): void {
    this._tokenFiles.delete(fileName);
    this.emit('files-loaded', Array.from(this._tokenFiles.values()));
    console.log(`[AppState] Token file removed: ${fileName}`);
  }

  /**
   * Clear all token files
   */
  clearTokenFiles(): void {
    this._tokenFiles.clear();
    this.emit('files-loaded', []);
    console.log(`[AppState] All token files cleared`);
  }

  /**
   * Set selected file and emit event
   */
  setSelectedFile(fileName: string | null): void {
    this._selectedFile = fileName;
    this.emit('file-selected', fileName);
    console.log(`[AppState] Selected file: ${fileName}`);
  }

  /**
   * Select a token (for scope assignment)
   */
  selectToken(tokenPath: string): void {
    this._selectedTokens.add(tokenPath);
    this.emit('tokens-selected', Array.from(this._selectedTokens));
    console.log(`[AppState] Token selected: ${tokenPath}`);
  }

  /**
   * Deselect a token
   */
  deselectToken(tokenPath: string): void {
    this._selectedTokens.delete(tokenPath);
    this.emit('tokens-selected', Array.from(this._selectedTokens));
    console.log(`[AppState] Token deselected: ${tokenPath}`);
  }

  /**
   * Toggle token selection
   */
  toggleTokenSelection(tokenPath: string): void {
    if (this._selectedTokens.has(tokenPath)) {
      this.deselectToken(tokenPath);
    } else {
      this.selectToken(tokenPath);
    }
  }

  /**
   * Clear all token selections
   */
  clearTokenSelection(): void {
    this._selectedTokens.clear();
    this.emit('tokens-selected', []);
    console.log(`[AppState] Token selection cleared`);
  }

  /**
   * Set current screen and emit event
   */
  setCurrentScreen(screen: ScreenType): void {
    this._currentScreen = screen;
    this.emit('screen-changed', screen);
    console.log(`[AppState] Screen changed to: ${screen}`);
  }

  /**
   * Set current tab and emit event
   */
  setCurrentTab(tab: TabType): void {
    this._currentTab = tab;
    this.emit('tab-changed', tab);
    console.log(`[AppState] Tab changed to: ${tab}`);
  }

  /**
   * Set import mode and emit event
   */
  setImportMode(mode: ImportMode): void {
    this._importMode = mode;
    this.emit('import-mode-changed', mode);
    console.log(`[AppState] Import mode changed to: ${mode}`);
  }

  /**
   * Set token source
   */
  setTokenSource(source: 'github' | 'local' | null): void {
    this._tokenSource = source;
    console.log(`[AppState] Token source set to: ${source}`);
  }

  /**
   * Set GitHub configuration
   */
  setGitHubConfig(config: GitHubConfig | null): void {
    this._githubConfig = config;
    console.log(`[AppState] GitHub config updated`);
  }

  /**
   * Set Figma variables and emit event
   */
  setFigmaVariables(variables: { [name: string]: FigmaVariableData }): void {
    this._figmaVariables.clear();
    Object.entries(variables).forEach(([name, data]) => {
      this._figmaVariables.set(name, data);
    });

    this.emit('variables-loaded', variables);
    console.log(`[AppState] Figma variables updated: ${this._figmaVariables.size} variables`);
  }

  /**
   * Set scope for a token
   */
  setTokenScopes(tokenPath: string, scopes: string[]): void {
    this._tokenScopesMap.set(tokenPath, scopes);
    this.emit('scopes-updated', { tokenPath, scopes });
    console.log(`[AppState] Scopes set for ${tokenPath}: ${scopes.join(', ')}`);
  }

  /**
   * Clear scope for a token
   */
  clearTokenScopes(tokenPath: string): void {
    this._tokenScopesMap.delete(tokenPath);
    this.emit('scopes-updated', { tokenPath, scopes: [] });
    console.log(`[AppState] Scopes cleared for ${tokenPath}`);
  }

  /**
   * Get scopes for a token
   */
  getTokenScopes(tokenPath: string): string[] {
    return this._tokenScopesMap.get(tokenPath) || [];
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get state snapshot
   * Useful for saving/restoring state
   */
  getSnapshot() {
    return {
      tokenFiles: Array.from(this._tokenFiles.values()),
      selectedFile: this._selectedFile,
      selectedTokens: Array.from(this._selectedTokens),
      currentScreen: this._currentScreen,
      currentTab: this._currentTab,
      importMode: this._importMode,
      tokenSource: this._tokenSource,
      githubConfig: this._githubConfig,
      figmaVariables: Array.from(this._figmaVariables.entries()),
      tokenScopesMap: Array.from(this._tokenScopesMap.entries()),
    };
  }

  /**
   * Restore state from snapshot
   */
  restoreSnapshot(snapshot: any): void {
    if (snapshot.tokenFiles) {
      this.setTokenFiles(snapshot.tokenFiles);
    }
    if (snapshot.selectedFile !== undefined) {
      this.setSelectedFile(snapshot.selectedFile);
    }
    if (snapshot.selectedTokens) {
      this._selectedTokens = new Set(snapshot.selectedTokens);
    }
    if (snapshot.currentScreen) {
      this.setCurrentScreen(snapshot.currentScreen);
    }
    if (snapshot.currentTab) {
      this.setCurrentTab(snapshot.currentTab);
    }
    if (snapshot.importMode) {
      this.setImportMode(snapshot.importMode);
    }
    if (snapshot.tokenSource !== undefined) {
      this.setTokenSource(snapshot.tokenSource);
    }
    if (snapshot.githubConfig !== undefined) {
      this.setGitHubConfig(snapshot.githubConfig);
    }
    if (snapshot.figmaVariables) {
      const variablesObj: { [name: string]: FigmaVariableData } = {};
      snapshot.figmaVariables.forEach(([name, data]: [string, FigmaVariableData]) => {
        variablesObj[name] = data;
      });
      this.setFigmaVariables(variablesObj);
    }
    if (snapshot.tokenScopesMap) {
      this._tokenScopesMap = new Map(snapshot.tokenScopesMap);
    }

    console.log(`[AppState] State restored from snapshot`);
  }

  /**
   * Reset state to initial values
   */
  reset(): void {
    this._tokenFiles.clear();
    this._selectedFile = null;
    this._selectedTokens.clear();
    this._currentScreen = 'welcome';
    this._currentTab = 'tokens';
    this._importMode = 'github';
    this._tokenSource = null;
    this._githubConfig = null;
    this._figmaVariables.clear();
    this._tokenScopesMap.clear();

    console.log(`[AppState] State reset to initial values`);
  }
}

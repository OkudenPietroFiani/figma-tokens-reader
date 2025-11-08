"use strict";
(() => {
  // src/frontend/state/AppState.ts
  var AppState = class {
    constructor() {
      // ==================== STATE PROPERTIES ====================
      this._tokenFiles = /* @__PURE__ */ new Map();
      this._selectedFile = null;
      this._selectedTokens = /* @__PURE__ */ new Set();
      this._currentScreen = "welcome";
      this._currentTab = "tokens";
      this._importMode = "github";
      this._tokenSource = null;
      this._githubConfig = null;
      this._figmaVariables = /* @__PURE__ */ new Map();
      this._tokenScopesMap = /* @__PURE__ */ new Map();
      // ==================== OBSERVABLE PATTERN ====================
      this.eventListeners = /* @__PURE__ */ new Map();
    }
    /**
     * Subscribe to state change events
     * Returns unsubscribe function
     */
    subscribe(event, callback) {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, /* @__PURE__ */ new Set());
      }
      this.eventListeners.get(event).add(callback);
      return () => {
        this.unsubscribe(event, callback);
      };
    }
    /**
     * Unsubscribe from state change events
     */
    unsubscribe(event, callback) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    }
    /**
     * Emit an event to all subscribers
     */
    emit(event, data) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            console.error(`[AppState] Error in event listener for ${event}:`, error);
          }
        });
      }
    }
    // ==================== GETTERS ====================
    get tokenFiles() {
      return new Map(this._tokenFiles);
    }
    get selectedFile() {
      return this._selectedFile;
    }
    get selectedTokens() {
      return new Set(this._selectedTokens);
    }
    get currentScreen() {
      return this._currentScreen;
    }
    get currentTab() {
      return this._currentTab;
    }
    get importMode() {
      return this._importMode;
    }
    get tokenSource() {
      return this._tokenSource;
    }
    get githubConfig() {
      return this._githubConfig;
    }
    get figmaVariables() {
      return new Map(this._figmaVariables);
    }
    get tokenScopesMap() {
      return new Map(this._tokenScopesMap);
    }
    // ==================== SETTERS WITH EVENTS ====================
    /**
     * Set token files and emit event
     */
    setTokenFiles(files) {
      this._tokenFiles.clear();
      files.forEach((file) => {
        this._tokenFiles.set(file.name, file);
      });
      this.emit("files-loaded", files);
      console.log(`[AppState] Token files updated: ${files.length} files`);
    }
    /**
     * Add a single token file
     */
    addTokenFile(file) {
      this._tokenFiles.set(file.name, file);
      this.emit("files-loaded", Array.from(this._tokenFiles.values()));
      console.log(`[AppState] Token file added: ${file.name}`);
    }
    /**
     * Remove a token file
     */
    removeTokenFile(fileName) {
      this._tokenFiles.delete(fileName);
      this.emit("files-loaded", Array.from(this._tokenFiles.values()));
      console.log(`[AppState] Token file removed: ${fileName}`);
    }
    /**
     * Clear all token files
     */
    clearTokenFiles() {
      this._tokenFiles.clear();
      this.emit("files-loaded", []);
      console.log(`[AppState] All token files cleared`);
    }
    /**
     * Set selected file and emit event
     */
    setSelectedFile(fileName) {
      this._selectedFile = fileName;
      this.emit("file-selected", fileName);
      console.log(`[AppState] Selected file: ${fileName}`);
    }
    /**
     * Select a token (for scope assignment)
     */
    selectToken(tokenPath) {
      this._selectedTokens.add(tokenPath);
      this.emit("tokens-selected", Array.from(this._selectedTokens));
      console.log(`[AppState] Token selected: ${tokenPath}`);
    }
    /**
     * Deselect a token
     */
    deselectToken(tokenPath) {
      this._selectedTokens.delete(tokenPath);
      this.emit("tokens-selected", Array.from(this._selectedTokens));
      console.log(`[AppState] Token deselected: ${tokenPath}`);
    }
    /**
     * Toggle token selection
     */
    toggleTokenSelection(tokenPath) {
      if (this._selectedTokens.has(tokenPath)) {
        this.deselectToken(tokenPath);
      } else {
        this.selectToken(tokenPath);
      }
    }
    /**
     * Clear all token selections
     */
    clearTokenSelection() {
      this._selectedTokens.clear();
      this.emit("tokens-selected", []);
      console.log(`[AppState] Token selection cleared`);
    }
    /**
     * Set current screen and emit event
     */
    setCurrentScreen(screen) {
      this._currentScreen = screen;
      this.emit("screen-changed", screen);
      console.log(`[AppState] Screen changed to: ${screen}`);
    }
    /**
     * Set current tab and emit event
     */
    setCurrentTab(tab) {
      this._currentTab = tab;
      this.emit("tab-changed", tab);
      console.log(`[AppState] Tab changed to: ${tab}`);
    }
    /**
     * Set import mode and emit event
     */
    setImportMode(mode) {
      this._importMode = mode;
      this.emit("import-mode-changed", mode);
      console.log(`[AppState] Import mode changed to: ${mode}`);
    }
    /**
     * Set token source
     */
    setTokenSource(source) {
      this._tokenSource = source;
      console.log(`[AppState] Token source set to: ${source}`);
    }
    /**
     * Set GitHub configuration
     */
    setGitHubConfig(config) {
      this._githubConfig = config;
      console.log(`[AppState] GitHub config updated`);
    }
    /**
     * Set Figma variables and emit event
     */
    setFigmaVariables(variables) {
      this._figmaVariables.clear();
      Object.entries(variables).forEach(([name, data]) => {
        this._figmaVariables.set(name, data);
      });
      this.emit("variables-loaded", variables);
      console.log(`[AppState] Figma variables updated: ${this._figmaVariables.size} variables`);
    }
    /**
     * Set scope for a token
     */
    setTokenScopes(tokenPath, scopes) {
      this._tokenScopesMap.set(tokenPath, scopes);
      this.emit("scopes-updated", { tokenPath, scopes });
      console.log(`[AppState] Scopes set for ${tokenPath}: ${scopes.join(", ")}`);
    }
    /**
     * Clear scope for a token
     */
    clearTokenScopes(tokenPath) {
      this._tokenScopesMap.delete(tokenPath);
      this.emit("scopes-updated", { tokenPath, scopes: [] });
      console.log(`[AppState] Scopes cleared for ${tokenPath}`);
    }
    /**
     * Get scopes for a token
     */
    getTokenScopes(tokenPath) {
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
        tokenScopesMap: Array.from(this._tokenScopesMap.entries())
      };
    }
    /**
     * Restore state from snapshot
     */
    restoreSnapshot(snapshot) {
      if (snapshot.tokenFiles) {
        this.setTokenFiles(snapshot.tokenFiles);
      }
      if (snapshot.selectedFile !== void 0) {
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
      if (snapshot.tokenSource !== void 0) {
        this.setTokenSource(snapshot.tokenSource);
      }
      if (snapshot.githubConfig !== void 0) {
        this.setGitHubConfig(snapshot.githubConfig);
      }
      if (snapshot.figmaVariables) {
        const variablesObj = {};
        snapshot.figmaVariables.forEach(([name, data]) => {
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
    reset() {
      this._tokenFiles.clear();
      this._selectedFile = null;
      this._selectedTokens.clear();
      this._currentScreen = "welcome";
      this._currentTab = "tokens";
      this._importMode = "github";
      this._tokenSource = null;
      this._githubConfig = null;
      this._figmaVariables.clear();
      this._tokenScopesMap.clear();
      console.log(`[AppState] State reset to initial values`);
    }
  };

  // src/frontend/services/PluginBridge.ts
  var PluginBridge = class {
    constructor() {
      this.messageHandlers = /* @__PURE__ */ new Map();
      this.pendingRequests = /* @__PURE__ */ new Map();
      window.addEventListener("message", this.handleBackendMessage.bind(this));
      console.log("[PluginBridge] Initialized");
    }
    /**
     * Send message to plugin backend
     * Returns a promise that resolves when backend responds
     *
     * @param type - Message type
     * @param data - Message data (optional)
     * @returns Promise that resolves with response data
     */
    send(type, data) {
      return new Promise((resolve, reject) => {
        try {
          const requestId = `${type}_${Date.now()}_${Math.random()}`;
          this.pendingRequests.set(requestId, { resolve, reject });
          parent.postMessage(
            {
              pluginMessage: {
                type,
                data,
                requestId
              }
            },
            "*"
          );
          console.log(`[PluginBridge] Sent message: ${type}`, data);
          setTimeout(() => {
            if (this.pendingRequests.has(requestId)) {
              this.pendingRequests.delete(requestId);
              reject(new Error(`Request timeout: ${type}`));
            }
          }, 3e4);
        } catch (error) {
          reject(error);
        }
      });
    }
    /**
     * Send message to backend without waiting for response
     * Fire-and-forget style
     *
     * @param type - Message type
     * @param data - Message data (optional)
     */
    sendAsync(type, data) {
      try {
        parent.postMessage(
          {
            pluginMessage: {
              type,
              data
            }
          },
          "*"
        );
        console.log(`[PluginBridge] Sent async message: ${type}`, data);
      } catch (error) {
        console.error(`[PluginBridge] Error sending async message:`, error);
      }
    }
    /**
     * Subscribe to backend messages
     * Returns unsubscribe function
     *
     * @param type - Message type to listen for
     * @param handler - Handler function
     */
    on(type, handler) {
      if (!this.messageHandlers.has(type)) {
        this.messageHandlers.set(type, /* @__PURE__ */ new Set());
      }
      this.messageHandlers.get(type).add(handler);
      console.log(`[PluginBridge] Subscribed to: ${type}`);
      return () => {
        this.off(type, handler);
      };
    }
    /**
     * Unsubscribe from backend messages
     *
     * @param type - Message type
     * @param handler - Handler function to remove
     */
    off(type, handler) {
      if (!handler) {
        this.messageHandlers.delete(type);
        console.log(`[PluginBridge] Unsubscribed from all: ${type}`);
      } else {
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
          handlers.delete(handler);
          console.log(`[PluginBridge] Unsubscribed from: ${type}`);
        }
      }
    }
    /**
     * Handle messages from backend
     * Routes to appropriate handlers
     */
    handleBackendMessage(event) {
      const message = event.data.pluginMessage;
      if (!message) return;
      const { type, data, message: messageText, requestId } = message;
      console.log(`[PluginBridge] Received message: ${type}`, data || messageText);
      if (requestId && this.pendingRequests.has(requestId)) {
        const { resolve, reject } = this.pendingRequests.get(requestId);
        this.pendingRequests.delete(requestId);
        if (type === "error") {
          reject(new Error(messageText || "Unknown error"));
        } else {
          resolve(data || messageText);
        }
        return;
      }
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(data || messageText);
          } catch (error) {
            console.error(`[PluginBridge] Error in message handler for ${type}:`, error);
          }
        });
      }
    }
    /**
     * Clear all message handlers
     * Useful for cleanup
     */
    clearAllHandlers() {
      this.messageHandlers.clear();
      console.log("[PluginBridge] All handlers cleared");
    }
    /**
     * Get list of active subscriptions
     * Useful for debugging
     */
    getActiveSubscriptions() {
      return Array.from(this.messageHandlers.keys());
    }
  };

  // src/shared/constants.ts
  var SCREEN_IDS = {
    WELCOME: "welcome-screen",
    IMPORT: "import-screen",
    TOKEN: "token-screen"
  };
  var SCOPE_CATEGORIES = {
    // Fill scopes
    fill: {
      label: "Fill",
      scopes: ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"]
    },
    // Stroke scopes
    stroke: {
      label: "Stroke",
      scopes: ["STROKE_COLOR"]
    },
    // Effect scopes
    effect: {
      label: "Effect",
      scopes: ["EFFECT_COLOR"]
    },
    // Size & spacing
    sizeSpacing: {
      label: "Size & Spacing",
      scopes: ["CORNER_RADIUS", "WIDTH_HEIGHT", "GAP"]
    },
    // Text content
    textContent: {
      label: "Text Content",
      scopes: ["TEXT_CONTENT"]
    },
    // Typography
    typography: {
      label: "Typography",
      scopes: [
        "FONT_FAMILY",
        "FONT_STYLE",
        "FONT_WEIGHT",
        "FONT_SIZE",
        "LINE_HEIGHT",
        "LETTER_SPACING",
        "PARAGRAPH_SPACING",
        "PARAGRAPH_INDENT"
      ]
    }
  };
  var ALL_SCOPES = Object.values(SCOPE_CATEGORIES).flatMap((category) => category.scopes);
  var CSS_CLASSES = {
    ACTIVE: "active",
    HIDDEN: "hidden",
    LOADING: "loading",
    DISABLED: "disabled",
    CHECKED: "checked",
    ERROR: "error",
    SUCCESS: "success"
  };

  // src/frontend/components/BaseComponent.ts
  var BaseComponent = class {
    constructor(state) {
      this.eventCleanupFunctions = [];
      this.state = state;
      this.element = this.createElement();
    }
    /**
     * Initialize the component (call after construction)
     * This ensures all properties are set before binding events
     */
    init() {
      this.bindEvents();
    }
    /**
     * Mount the component to a parent element
     */
    mount(parent2) {
      parent2.appendChild(this.element);
    }
    /**
     * Unmount the component from the DOM
     * Cleans up all event listeners to prevent memory leaks
     */
    unmount() {
      this.eventCleanupFunctions.forEach((cleanup) => cleanup());
      this.eventCleanupFunctions = [];
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    }
    /**
     * Show the component (make visible)
     */
    show() {
      this.element.classList.add(CSS_CLASSES.ACTIVE);
      this.element.classList.remove(CSS_CLASSES.HIDDEN);
    }
    /**
     * Hide the component (make invisible)
     */
    hide() {
      this.element.classList.remove(CSS_CLASSES.ACTIVE);
      this.element.classList.add(CSS_CLASSES.HIDDEN);
    }
    /**
     * Get the component's root element
     */
    getElement() {
      return this.element;
    }
    /**
     * Helper: Add event listener with automatic cleanup tracking
     * Prevents memory leaks by storing cleanup functions
     */
    addEventListener(element, type, listener, options) {
      element.addEventListener(type, listener, options);
      this.eventCleanupFunctions.push(() => {
        element.removeEventListener(type, listener, options);
      });
    }
    /**
     * Helper: Subscribe to AppState changes with automatic cleanup
     */
    subscribeToState(event, callback) {
      this.state.subscribe(event, callback);
      this.eventCleanupFunctions.push(() => {
        this.state.unsubscribe(event, callback);
      });
    }
    /**
     * Helper: Query selector with type safety
     */
    querySelector(selector) {
      return this.element.querySelector(selector);
    }
    /**
     * Helper: Query all with type safety
     */
    querySelectorAll(selector) {
      return this.element.querySelectorAll(selector);
    }
    /**
     * Helper: Get element by ID from component's subtree
     */
    getElementById(id) {
      return document.getElementById(id);
    }
    /**
     * Helper: Enable/disable an element
     */
    setEnabled(element, enabled) {
      if (enabled) {
        element.classList.remove(CSS_CLASSES.DISABLED);
        if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
          element.disabled = false;
        }
      } else {
        element.classList.add(CSS_CLASSES.DISABLED);
        if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
          element.disabled = true;
        }
      }
    }
    /**
     * Helper: Show/hide loading state
     */
    setLoading(element, loading) {
      if (loading) {
        element.classList.add(CSS_CLASSES.LOADING);
      } else {
        element.classList.remove(CSS_CLASSES.LOADING);
      }
    }
    /**
     * Helper: Show notification (delegates to global notification system)
     */
    showNotification(message, type = "info") {
      const event = new CustomEvent("notification", {
        detail: { message, type }
      });
      window.dispatchEvent(event);
    }
  };

  // src/frontend/components/WelcomeScreen.ts
  var WelcomeScreen = class extends BaseComponent {
    constructor(state) {
      super(state);
    }
    createElement() {
      const screen = document.createElement("div");
      screen.id = SCREEN_IDS.WELCOME;
      screen.className = "screen welcome-screen";
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
        \uFFFD Back to Tokens
      </button>
    `;
      this.connectGithubBtn = screen.querySelector("#connect-github-btn");
      this.importLocalBtn = screen.querySelector("#import-local-btn");
      this.backToTokensBtn = screen.querySelector("#back-to-tokens-btn");
      return screen;
    }
    bindEvents() {
      this.addEventListener(this.connectGithubBtn, "click", () => {
        this.handleGitHubConnect();
      });
      this.addEventListener(this.importLocalBtn, "click", () => {
        this.handleLocalImport();
      });
      this.addEventListener(this.backToTokensBtn, "click", () => {
        this.handleBackToTokens();
      });
      this.subscribeToState("files-loaded", () => {
        this.updateBackButton();
      });
    }
    /**
     * Handle GitHub connect button click
     * Navigates to import screen with GitHub mode
     */
    handleGitHubConnect() {
      console.log("[WelcomeScreen] GitHub connect clicked");
      this.state.setImportMode("github");
      this.state.setCurrentScreen("import");
    }
    /**
     * Handle local import button click
     * Navigates to import screen with local mode
     */
    handleLocalImport() {
      console.log("[WelcomeScreen] Local import clicked");
      this.state.setImportMode("local");
      this.state.setCurrentScreen("import");
    }
    /**
     * Handle back to tokens button click
     * Returns to token screen
     */
    handleBackToTokens() {
      console.log("[WelcomeScreen] Back to tokens clicked");
      this.state.setCurrentScreen("token");
    }
    /**
     * Update back button visibility
     * Show if tokens are loaded, hide otherwise
     */
    updateBackButton() {
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
    show() {
      super.show();
      this.updateBackButton();
      console.log("[WelcomeScreen] Screen shown");
    }
  };

  // src/frontend/components/ImportScreen.ts
  var ImportScreen = class extends BaseComponent {
    constructor(state, bridge) {
      super(state);
      this.bridge = bridge;
    }
    createElement() {
      const screen = document.createElement("div");
      screen.id = "import-screen";
      screen.className = "screen import-screen";
      screen.innerHTML = `
      <div class="import-header">
        <a class="back-link" id="back-to-welcome">\u2190 Back</a>
        <h1 class="import-title" id="import-title">Import Tokens</h1>
        <p class="import-subtitle" id="import-subtitle">Configure your token source</p>
      </div>

      <!-- GitHub Import Content -->
      <div class="import-content active" id="github-import-content">
        <div class="input-group">
          <label for="github-token">Github access key</label>
          <input type="password" id="github-token" placeholder="example">
        </div>

        <div class="input-group">
          <label for="repo-url">Repository url</label>
          <input type="text" id="repo-url" placeholder="example">
        </div>

        <div class="input-group">
          <label for="branch-name">Branch (optional)</label>
          <input type="text" id="branch-name" placeholder="main" value="main">
        </div>

        <button class="btn btn-primary btn-full" id="fetch-files-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" fill="currentColor"/>
          </svg>
          Connect repository
        </button>

        <div class="loading hidden" id="github-loading">
          <span>Fetching files from GitHub...</span>
        </div>

        <div id="github-files-container"></div>

        <div class="action-buttons hidden" id="github-action-buttons">
          <button class="btn btn-primary btn-full" id="sync-tokens-btn" disabled>Synchronise files</button>
        </div>
      </div>

      <!-- Local Import Content -->
      <div class="import-content" id="local-import-content">
        <input type="file" id="file-input" multiple accept=".json,.zip" style="display: none;">

        <div class="file-selector-section">
          <div id="local-files-list" class="file-list-items"></div>
        </div>
      </div>
    `;
      this.backLink = screen.querySelector("#back-to-welcome");
      this.importTitle = screen.querySelector("#import-title");
      this.importSubtitle = screen.querySelector("#import-subtitle");
      this.githubContent = screen.querySelector("#github-import-content");
      this.githubToken = screen.querySelector("#github-token");
      this.repoUrl = screen.querySelector("#repo-url");
      this.branchName = screen.querySelector("#branch-name");
      this.fetchFilesBtn = screen.querySelector("#fetch-files-btn");
      this.githubLoading = screen.querySelector("#github-loading");
      this.githubFilesContainer = screen.querySelector("#github-files-container");
      this.githubActionButtons = screen.querySelector("#github-action-buttons");
      this.syncTokensBtn = screen.querySelector("#sync-tokens-btn");
      this.localContent = screen.querySelector("#local-import-content");
      this.fileInput = screen.querySelector("#file-input");
      this.localFilesList = screen.querySelector("#local-files-list");
      return screen;
    }
    bindEvents() {
      this.addEventListener(this.backLink, "click", (e) => {
        e.preventDefault();
        this.state.setCurrentScreen("welcome");
      });
      this.addEventListener(this.fetchFilesBtn, "click", () => {
        this.handleFetchFiles();
      });
      this.addEventListener(this.syncTokensBtn, "click", () => {
        this.handleSyncTokens();
      });
      this.addEventListener(this.fileInput, "change", (e) => {
        const target = e.target;
        if (target.files) {
          this.handleLocalFiles(Array.from(target.files));
        }
      });
      this.subscribeToState("import-mode-changed", (mode) => {
        this.updateMode(mode);
      });
      this.setupBackendListeners();
    }
    /**
     * Setup backend event listeners
     */
    setupBackendListeners() {
      this.bridge.on("github-files-imported", (data) => {
        this.handleFilesImported(data);
      });
      this.bridge.on("github-config-loaded", (config) => {
        this.loadGitHubConfig(config);
      });
      this.bridge.on("error", (message) => {
        this.showNotification(message, "error");
        this.githubLoading.classList.add(CSS_CLASSES.HIDDEN);
        this.setEnabled(this.fetchFilesBtn, true);
      });
    }
    /**
     * Handle fetch files from GitHub
     */
    async handleFetchFiles() {
      const token = this.githubToken.value.trim();
      const url = this.repoUrl.value.trim();
      const branch = this.branchName.value.trim() || "main";
      if (!url) {
        this.showNotification("Please enter a repository URL", "error");
        return;
      }
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        this.showNotification("Invalid GitHub URL format", "error");
        return;
      }
      const [, owner, repo] = match;
      const githubConfig = {
        token,
        owner,
        repo: repo.replace(".git", ""),
        branch
      };
      this.state.setGitHubConfig(githubConfig);
      this.githubLoading.classList.remove(CSS_CLASSES.HIDDEN);
      this.setEnabled(this.fetchFilesBtn, false);
      try {
        const response = await this.bridge.send("github-fetch-files", githubConfig);
        this.handleFilesFetched(response.files);
      } catch (error) {
        console.error("Error fetching files:", error);
        this.githubLoading.classList.add(CSS_CLASSES.HIDDEN);
        this.setEnabled(this.fetchFilesBtn, true);
      }
    }
    /**
     * Handle files fetched from GitHub
     */
    handleFilesFetched(files) {
      this.githubLoading.classList.add(CSS_CLASSES.HIDDEN);
      this.setEnabled(this.fetchFilesBtn, true);
      if (files.length === 0) {
        this.githubFilesContainer.innerHTML = '<div class="empty-state">No JSON files found in repository</div>';
        return;
      }
      const fileList = document.createElement("div");
      fileList.className = "file-list";
      fileList.innerHTML = `
      <div class="file-list-header">Select files to sync (${files.length} found)</div>
      ${files.map((file) => `
        <div class="file-item">
          <input type="checkbox" class="file-checkbox" value="${file}" id="file-${file}" checked>
          <label for="file-${file}">
            <div class="file-name">${file.split("/").pop()}</div>
            <div class="file-path">${file}</div>
          </label>
        </div>
      `).join("")}
    `;
      this.githubFilesContainer.innerHTML = "";
      this.githubFilesContainer.appendChild(fileList);
      this.fetchFilesBtn.classList.add(CSS_CLASSES.HIDDEN);
      this.githubActionButtons.classList.remove(CSS_CLASSES.HIDDEN);
      this.setEnabled(this.syncTokensBtn, true);
    }
    /**
     * Handle sync tokens from GitHub
     */
    async handleSyncTokens() {
      console.log("[ImportScreen] Sync Tokens clicked");
      const selectedFiles = Array.from(
        this.githubFilesContainer.querySelectorAll('input[type="checkbox"]:checked')
      ).map((cb) => cb.value);
      console.log("[ImportScreen] Selected files:", selectedFiles);
      if (selectedFiles.length === 0) {
        this.showNotification("Please select at least one file", "error");
        return;
      }
      const config = this.state.githubConfig;
      if (!config) {
        this.showNotification("GitHub configuration missing", "error");
        return;
      }
      config.files = selectedFiles;
      this.state.setGitHubConfig(config);
      console.log("[ImportScreen] Saving GitHub config...");
      this.bridge.sendAsync("save-github-config", config);
      this.githubLoading.classList.remove(CSS_CLASSES.HIDDEN);
      this.setEnabled(this.syncTokensBtn, false);
      console.log("[ImportScreen] Sending import request...");
      this.bridge.sendAsync("github-import-files", config);
      console.log("[ImportScreen] Import request sent, waiting for backend response");
    }
    /**
     * Handle files imported from GitHub
     */
    handleFilesImported(data) {
      console.log("[ImportScreen] Files imported from GitHub:", data);
      this.githubLoading.classList.add(CSS_CLASSES.HIDDEN);
      const tokenFiles = [];
      if (data.primitives) {
        tokenFiles.push({
          name: "primitives",
          path: "github://primitives",
          content: data.primitives,
          source: "github"
        });
      }
      if (data.semantics) {
        tokenFiles.push({
          name: "semantics",
          path: "github://semantics",
          content: data.semantics,
          source: "github"
        });
      }
      console.log("[ImportScreen] Created token files:", tokenFiles.length);
      this.state.setTokenFiles(tokenFiles);
      this.state.setTokenSource("github");
      console.log("[ImportScreen] Navigating to token screen...");
      this.state.setCurrentScreen("token");
    }
    /**
     * Handle local file selection
     */
    async handleLocalFiles(files) {
      if (files.length === 0) return;
      const tokenFiles = [];
      for (const file of files) {
        if (file.name.endsWith(".json")) {
          const content = await this.readFileAsText(file);
          try {
            const parsed = JSON.parse(content);
            tokenFiles.push({
              name: file.name,
              path: `local://${file.name}`,
              content: parsed,
              source: "local"
            });
          } catch (error) {
            console.error(`Error parsing ${file.name}:`, error);
            this.showNotification(`Failed to parse ${file.name}`, "error");
          }
        } else if (file.name.endsWith(".zip")) {
          this.showNotification("ZIP files not yet supported", "error");
        }
      }
      if (tokenFiles.length > 0) {
        this.state.setTokenFiles(tokenFiles);
        this.state.setTokenSource("local");
        this.state.setCurrentScreen("token");
      }
    }
    /**
     * Read file as text
     */
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }
    /**
     * Load GitHub config into form
     */
    loadGitHubConfig(config) {
      if (config.token) this.githubToken.value = config.token;
      if (config.owner && config.repo) {
        this.repoUrl.value = `https://github.com/${config.owner}/${config.repo}`;
      }
      if (config.branch) this.branchName.value = config.branch;
    }
    /**
     * Update mode (GitHub or Local)
     */
    updateMode(mode) {
      if (mode === "github") {
        this.importTitle.textContent = "Connect to github";
        this.importSubtitle.textContent = "Connect to a GitHub repository to import and synchronize design tokens.";
        this.githubContent.classList.add(CSS_CLASSES.ACTIVE);
        this.localContent.classList.remove(CSS_CLASSES.ACTIVE);
        this.bridge.sendAsync("load-github-config");
      } else {
        this.importTitle.textContent = "Import from local";
        this.importSubtitle.textContent = "Import local design tokens from your files.";
        this.localContent.classList.add(CSS_CLASSES.ACTIVE);
        this.githubContent.classList.remove(CSS_CLASSES.ACTIVE);
      }
    }
    /**
     * Show this screen
     */
    show() {
      super.show();
      this.updateMode(this.state.importMode);
      console.log("[ImportScreen] Screen shown");
    }
  };

  // src/frontend/components/TokenScreen.ts
  var TokenScreen = class extends BaseComponent {
    constructor(state, bridge) {
      super(state);
      this.bridge = bridge;
    }
    createElement() {
      const screen = document.createElement("div");
      screen.id = "token-screen";
      screen.className = "screen token-screen";
      screen.innerHTML = `
      <!-- Top Bar -->
      <div class="token-top-bar">
        <div class="token-top-bar-tabs">
          <button class="token-tab active" id="tokens-tab">Tokens</button>
          <button class="token-tab" id="scope-tab">Scopes</button>
        </div>
        <button class="btn-switch-source" id="switch-source-btn">Switch source</button>
      </div>

      <!-- Tokens View -->
      <div class="token-view active" id="tokens-view">
        <div class="token-layout">
          <!-- Left Column: File Tabs -->
          <div class="file-tabs">
            <div class="file-tabs-header">
              <div class="file-tabs-title">Files</div>
            </div>
            <div id="file-tabs-list" style="padding: 16px 16px 0 16px;">
              <!-- Tabs will be dynamically added here -->
            </div>
          </div>

          <!-- Right Column: Token Tree View -->
          <div class="token-tree-view">
            <div id="token-tree-content">
              <div class="empty-state">Select a token file from the left to preview its contents</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="token-actions">
        <button class="btn btn-primary" id="sync-to-figma-btn">Sync in Figma</button>
        <button class="btn btn-secondary hidden" id="pull-changes-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
            <path d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 8V12L14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 4C13.5 2.5 15.5 2 18 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Pull changes</span>
        </button>
      </div>
    `;
      this.syncBtn = screen.querySelector("#sync-to-figma-btn");
      this.pullChangesBtn = screen.querySelector("#pull-changes-btn");
      this.switchSourceBtn = screen.querySelector("#switch-source-btn");
      this.fileTabsList = screen.querySelector("#file-tabs-list");
      this.tokenTreeContent = screen.querySelector("#token-tree-content");
      return screen;
    }
    bindEvents() {
      this.addEventListener(this.syncBtn, "click", () => {
        this.handleSyncToFigma();
      });
      this.addEventListener(this.pullChangesBtn, "click", () => {
        this.handlePullChanges();
      });
      this.addEventListener(this.switchSourceBtn, "click", () => {
        this.state.setCurrentScreen("welcome");
      });
      const scopeTab = this.element.querySelector("#scope-tab");
      if (scopeTab) {
        this.addEventListener(scopeTab, "click", () => {
          this.state.setCurrentScreen("scope");
        });
      }
      this.subscribeToState("files-loaded", () => {
        this.renderFileList();
        this.updatePullChangesButton();
      });
      this.subscribeToState("file-selected", (fileName) => {
        this.renderFilePreview(fileName);
      });
    }
    /**
     * Render file list
     */
    renderFileList() {
      const files = Array.from(this.state.tokenFiles.values());
      if (files.length === 0) {
        this.fileTabsList.innerHTML = '<div class="empty-state">No files loaded</div>';
        return;
      }
      this.fileTabsList.innerHTML = files.map((file) => {
        return `<button class="file-tab" data-file="${file.name}">${file.name}</button>`;
      }).join("");
      const fileTabs = this.fileTabsList.querySelectorAll(".file-tab");
      fileTabs.forEach((tab) => {
        this.addEventListener(tab, "click", () => {
          const fileName = tab.getAttribute("data-file");
          this.state.setSelectedFile(fileName);
          fileTabs.forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
        });
      });
      if (files.length > 0 && !this.state.selectedFile) {
        this.state.setSelectedFile(files[0].name);
        fileTabs[0].classList.add("active");
      }
    }
    /**
     * Render file preview as tree view
     */
    renderFilePreview(fileName) {
      if (!fileName) {
        this.tokenTreeContent.innerHTML = '<div class="empty-state">Select a file to preview</div>';
        return;
      }
      const file = this.state.tokenFiles.get(fileName);
      if (!file) {
        this.tokenTreeContent.innerHTML = '<div class="empty-state">File not found</div>';
        return;
      }
      this.tokenTreeContent.innerHTML = this.renderTokenTree(file.content);
      const toggleBtns = this.tokenTreeContent.querySelectorAll(".tree-toggle");
      toggleBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const target = e.currentTarget;
          const parent2 = target.closest(".tree-group");
          parent2 == null ? void 0 : parent2.classList.toggle("collapsed");
        });
      });
    }
    /**
     * Render token tree recursively
     */
    renderTokenTree(obj, level = 0) {
      if (typeof obj !== "object" || obj === null) {
        return `<div class="tree-value">${this.escapeHtml(JSON.stringify(obj))}</div>`;
      }
      let html = "";
      for (const [key, value] of Object.entries(obj)) {
        const isGroup = typeof value === "object" && value !== null && !value.$value;
        if (isGroup) {
          html += `
          <div class="tree-group" style="padding-left: ${level * 12}px;">
            <div class="tree-header">
              <span class="tree-toggle"></span>
              <span class="tree-label">${this.escapeHtml(key)}</span>
            </div>
            <div class="tree-children">
              ${this.renderTokenTree(value, level + 1)}
            </div>
          </div>
        `;
        } else {
          let displayValue = "";
          if (value && typeof value === "object" && value.$value !== void 0) {
            displayValue = this.formatTokenValue(value.$value);
          } else {
            displayValue = this.formatTokenValue(value);
          }
          html += `
          <div class="tree-item" style="padding-left: ${level * 12 + 16}px;">
            <span class="token-name">${this.escapeHtml(key)}</span>
            <span class="token-value">${displayValue}</span>
          </div>
        `;
        }
      }
      return html;
    }
    /**
     * Format token value for display
     */
    formatTokenValue(value) {
      if (value === null || value === void 0) {
        return "";
      }
      if (typeof value === "string") {
        return this.escapeHtml(value);
      }
      if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
      }
      if (typeof value === "object") {
        return this.escapeHtml(JSON.stringify(value));
      }
      return this.escapeHtml(String(value));
    }
    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    /**
     * Handle sync to Figma
     */
    async handleSyncToFigma() {
      const files = Array.from(this.state.tokenFiles.values());
      if (files.length === 0) {
        this.showNotification("No token files loaded", "error");
        return;
      }
      let primitives = null;
      let semantics = null;
      files.forEach((file) => {
        if (file.name.toLowerCase().includes("primitive")) {
          primitives = file.content;
        } else if (file.name.toLowerCase().includes("semantic")) {
          semantics = file.content;
        }
      });
      if (!primitives && files.length > 0) {
        primitives = files[0].content;
      }
      try {
        this.setEnabled(this.syncBtn, false);
        const message = await this.bridge.send("import-tokens", {
          primitives,
          semantics,
          source: this.state.tokenSource
        });
        this.showNotification(message, "success");
        this.setEnabled(this.syncBtn, true);
      } catch (error) {
        console.error("Error syncing to Figma:", error);
        this.showNotification("Failed to sync tokens", "error");
        this.setEnabled(this.syncBtn, true);
      }
    }
    /**
     * Update pull changes button visibility
     */
    updatePullChangesButton() {
      if (this.state.tokenSource === "github") {
        this.pullChangesBtn.classList.remove("hidden");
      } else {
        this.pullChangesBtn.classList.add("hidden");
      }
    }
    /**
     * Handle pull changes from GitHub
     */
    async handlePullChanges() {
      const githubConfig = this.state.githubConfig;
      if (!githubConfig) {
        this.showNotification("GitHub configuration not found", "error");
        return;
      }
      try {
        this.showNotification("Pulling latest changes from GitHub...", "info");
        this.setEnabled(this.pullChangesBtn, false);
        const response = await this.bridge.send("github-import-files", githubConfig);
        this.handleFilesImported(response);
        this.setEnabled(this.pullChangesBtn, true);
      } catch (error) {
        console.error("Error pulling changes:", error);
        this.showNotification("Failed to pull changes", "error");
        this.setEnabled(this.pullChangesBtn, true);
      }
    }
    /**
     * Handle files imported from GitHub
     */
    handleFilesImported(data) {
      console.log("[TokenScreen] Files imported from GitHub:", data);
      const tokenFiles = [];
      if (data.primitives) {
        tokenFiles.push({
          name: "primitives",
          path: "github://primitives",
          content: data.primitives,
          source: "github"
        });
      }
      if (data.semantics) {
        tokenFiles.push({
          name: "semantics",
          path: "github://semantics",
          content: data.semantics,
          source: "github"
        });
      }
      if (tokenFiles.length > 0) {
        this.state.setTokenFiles(tokenFiles);
        this.showNotification("Successfully pulled latest changes", "success");
      }
    }
    /**
     * Show this screen
     */
    show() {
      super.show();
      this.renderFileList();
      this.updatePullChangesButton();
      console.log("[TokenScreen] Screen shown");
    }
  };

  // src/frontend/components/ScopeScreen.ts
  var ScopeScreen = class extends BaseComponent {
    constructor(state, bridge) {
      super(state);
      this.variables = [];
      this.selectedCollection = null;
      this.selectedVariables = /* @__PURE__ */ new Set();
      this.lastSelectedIndex = -1;
      this.bridge = bridge;
    }
    createElement() {
      const div = document.createElement("div");
      div.className = "screen scope-screen";
      div.innerHTML = `
      <div class="token-top-bar">
        <div class="token-top-bar-tabs">
          <button class="token-tab" id="back-to-tokens-tab">Tokens</button>
          <button class="token-tab active" id="scope-tab-active">Scopes</button>
        </div>
        <button class="btn-switch-source" id="scope-switch-source-btn">Switch source</button>
      </div>

      <!-- Scope View -->
      <div class="token-view active">
        <div class="token-layout">
          <!-- Left Column: Collections -->
          <div class="file-tabs">
            <div class="file-tabs-header">
              <div class="file-tabs-title">Collections</div>
            </div>
            <div id="collections-list" style="padding: 16px 16px 0 16px;">
              <!-- Collection tabs will be dynamically added here -->
            </div>

            <!-- Scope Selector (replaces collections when variables selected) -->
            <div id="scope-selector" class="scope-selector hidden" style="padding: 16px;">
              <div class="scope-selector-header">
                <h3 class="scope-selector-title" id="scope-title">Color scopes</h3>
                <div class="scope-selector-count" id="selected-count">0 tokens selected</div>
              </div>
              <div class="scope-options" id="scope-options">
                <!-- Scope options will be dynamically rendered based on variable type -->
              </div>
              <div class="scope-actions">
                <button class="btn btn-primary btn-full" id="apply-scopes-btn">Apply scopes</button>
                <button class="btn-text" id="reset-selection-btn">Reset selection</button>
              </div>
            </div>
          </div>

          <!-- Right Column: Scope Tree View -->
          <div class="token-tree-view">
            <div id="scope-content">
              <div class="empty-state">Loading variables...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="token-actions">
        <button class="btn btn-primary" id="sync-to-figma-btn-scope">Sync in Figma</button>
        <button class="btn btn-secondary hidden" id="pull-changes-btn-scope">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
            <path d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 8V12L14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 4C13.5 2.5 15.5 2 18 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Pull changes</span>
        </button>
      </div>
    `;
      this.syncBtn = div.querySelector("#sync-to-figma-btn-scope");
      this.pullChangesBtn = div.querySelector("#pull-changes-btn-scope");
      this.switchSourceBtn = div.querySelector("#scope-switch-source-btn");
      this.collectionsList = div.querySelector("#collections-list");
      this.scopeContent = div.querySelector("#scope-content");
      this.scopeSelector = div.querySelector("#scope-selector");
      this.selectedCountEl = div.querySelector("#selected-count");
      this.scopeTitle = div.querySelector("#scope-title");
      this.applyScopesBtn = div.querySelector("#apply-scopes-btn");
      this.resetSelectionBtn = div.querySelector("#reset-selection-btn");
      return div;
    }
    bindEvents() {
      const backToTokensTab = this.element.querySelector("#back-to-tokens-tab");
      if (backToTokensTab) {
        this.addEventListener(backToTokensTab, "click", () => {
          this.state.setCurrentScreen("token");
        });
      }
      this.addEventListener(this.switchSourceBtn, "click", () => {
        this.state.setCurrentScreen("welcome");
      });
      this.addEventListener(this.syncBtn, "click", () => {
        this.handleSyncScopes();
      });
      this.addEventListener(this.pullChangesBtn, "click", () => {
        this.handlePullChanges();
      });
      this.addEventListener(this.applyScopesBtn, "click", () => {
        this.handleApplyScopes();
      });
      this.addEventListener(this.resetSelectionBtn, "click", () => {
        this.handleResetSelection();
      });
    }
    /**
     * Show this screen
     */
    show() {
      super.show();
      this.loadVariables();
    }
    /**
     * Load Figma variables
     */
    async loadVariables() {
      try {
        this.scopeContent.innerHTML = '<div class="empty-state">Loading variables...</div>';
        console.log("[ScopeScreen] Requesting Figma variables...");
        const response = await this.bridge.send("get-figma-variables", {});
        console.log("[ScopeScreen] Raw response:", response);
        const variablesObj = response.variables || {};
        console.log("[ScopeScreen] Variables object:", variablesObj);
        console.log("[ScopeScreen] Variables object keys:", Object.keys(variablesObj));
        this.variables = Object.values(variablesObj);
        console.log("[ScopeScreen] Loaded variables array:", this.variables);
        console.log("[ScopeScreen] Variables count:", this.variables.length);
        if (this.variables.length === 0) {
          console.warn("[ScopeScreen] No variables found in response");
        }
        this.renderVariables();
        this.renderCollections();
      } catch (error) {
        console.error("[ScopeScreen] Error loading variables:", error);
        this.scopeContent.innerHTML = `<div class="empty-state">Failed to load variables: ${error instanceof Error ? error.message : "Unknown error"}</div>`;
      }
    }
    /**
     * Render collections list
     */
    renderCollections() {
      const collections = /* @__PURE__ */ new Set();
      this.variables.forEach((v) => {
        if (v.collection) {
          collections.add(v.collection);
        }
      });
      const collectionNames = Array.from(collections);
      console.log("[ScopeScreen] Found Figma collections:", collectionNames);
      if (collectionNames.length === 0) {
        this.collectionsList.innerHTML = '<div style="color: #999; font-size: 12px;">No collections found</div>';
        return;
      }
      if (!this.selectedCollection && collectionNames.length > 0) {
        this.selectedCollection = collectionNames[0];
      }
      this.collectionsList.innerHTML = collectionNames.map((collectionName) => `
      <button class="file-tab ${collectionName === this.selectedCollection ? "active" : ""}" data-collection="${collectionName}">${collectionName}</button>
    `).join("");
      const collectionButtons = this.collectionsList.querySelectorAll(".file-tab");
      collectionButtons.forEach((btn) => {
        this.addEventListener(btn, "click", () => {
          const collectionName = btn.getAttribute("data-collection");
          console.log("[ScopeScreen] Switching to collection:", collectionName);
          this.selectedCollection = collectionName;
          this.renderCollections();
          this.filterVariablesByCollection();
        });
      });
    }
    /**
     * Filter variables by selected collection
     */
    filterVariablesByCollection() {
      console.log("[ScopeScreen] Filtering by collection:", this.selectedCollection);
      console.log("[ScopeScreen] Total variables before filter:", this.variables.length);
      if (!this.selectedCollection) {
        this.renderVariables();
        return;
      }
      const filteredVars = this.variables.filter((v) => {
        const matches = v.collection === this.selectedCollection;
        if (!matches) {
          console.log(`[ScopeScreen] Variable ${v.name} collection "${v.collection}" doesn't match "${this.selectedCollection}"`);
        }
        return matches;
      });
      console.log("[ScopeScreen] Filtered variables count:", filteredVars.length);
      console.log("[ScopeScreen] Filtered variables:", filteredVars.map((v) => v.name));
      const tree = this.buildVariableTree(filteredVars);
      const html = '<div class="scope-tree">' + this.renderVariableTree(tree, 0) + "</div>";
      if (filteredVars.length === 0) {
        this.scopeContent.innerHTML = '<div class="empty-state">No variables found in this collection.</div>';
      } else {
        this.scopeContent.innerHTML = html;
        this.attachVariableEventHandlers();
      }
    }
    /**
     * Render variables with scope options
     */
    renderVariables() {
      if (this.variables.length === 0) {
        this.scopeContent.innerHTML = '<div class="empty-state">No variables found. Please import tokens first.</div>';
        return;
      }
      const tree = this.buildVariableTree(this.variables);
      const html = '<div class="scope-tree">' + this.renderVariableTree(tree, 0) + "</div>";
      this.scopeContent.innerHTML = html;
      this.attachVariableEventHandlers();
    }
    /**
     * Attach event handlers to rendered variables
     */
    attachVariableEventHandlers() {
      const toggleBtns = this.scopeContent.querySelectorAll(".tree-toggle");
      toggleBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const target = e.currentTarget;
          const parent2 = target.closest(".tree-group");
          parent2 == null ? void 0 : parent2.classList.toggle("collapsed");
        });
      });
      const groupCheckboxes = this.scopeContent.querySelectorAll(".group-checkbox");
      groupCheckboxes.forEach((groupCb) => {
        this.addEventListener(groupCb, "change", (e) => {
          const cb = groupCb;
          const groupId = cb.getAttribute("data-group-id");
          const checked = cb.checked;
          const groupContainer = this.scopeContent.querySelector(`.tree-children[data-group-id="${groupId}"]`);
          if (groupContainer) {
            const childCheckboxes = groupContainer.querySelectorAll(".scope-checkbox");
            childCheckboxes.forEach((childCb) => {
              childCb.checked = checked;
              const varId = childCb.getAttribute("data-var-id");
              if (checked) {
                this.selectedVariables.add(varId);
              } else {
                this.selectedVariables.delete(varId);
              }
            });
          }
          this.updateScopeSelector();
        });
      });
      const checkboxes = this.scopeContent.querySelectorAll(".scope-checkbox");
      checkboxes.forEach((checkbox, index) => {
        this.addEventListener(checkbox, "click", (e) => {
          const event = e;
          const cb = checkbox;
          const varId = cb.getAttribute("data-var-id");
          if (event.shiftKey && this.lastSelectedIndex >= 0) {
            const start = Math.min(this.lastSelectedIndex, index);
            const end = Math.max(this.lastSelectedIndex, index);
            const checked = cb.checked;
            for (let i = start; i <= end; i++) {
              const currentCb = checkboxes[i];
              currentCb.checked = checked;
              const currentVarId = currentCb.getAttribute("data-var-id");
              if (checked) {
                this.selectedVariables.add(currentVarId);
              } else {
                this.selectedVariables.delete(currentVarId);
              }
            }
          } else {
            if (cb.checked) {
              this.selectedVariables.add(varId);
            } else {
              this.selectedVariables.delete(varId);
            }
          }
          this.lastSelectedIndex = index;
          this.updateScopeSelector();
        });
      });
    }
    /**
     * Update scope selector visibility and count
     */
    updateScopeSelector() {
      const count = this.selectedVariables.size;
      this.selectedCountEl.textContent = `${count} tokens selected`;
      if (count > 0) {
        const scopeType = this.determineScopeType();
        this.scopeTitle.textContent = scopeType;
        this.renderScopeOptions();
        this.scopeSelector.classList.remove("hidden");
        this.collectionsList.parentElement.querySelector(".file-tabs-header").classList.add("hidden");
        this.collectionsList.classList.add("hidden");
      } else {
        this.scopeSelector.classList.add("hidden");
        this.collectionsList.parentElement.querySelector(".file-tabs-header").classList.remove("hidden");
        this.collectionsList.classList.remove("hidden");
      }
    }
    /**
     * Determine scope type from selected variables
     */
    determineScopeType() {
      const types = /* @__PURE__ */ new Set();
      this.selectedVariables.forEach((varId) => {
        const variable = this.variables.find((v) => v.id === varId);
        if (variable) {
          types.add(variable.type);
        }
      });
      if (types.size === 1) {
        const type = Array.from(types)[0];
        switch (type) {
          case "COLOR":
            return "Color scopes";
          case "FLOAT":
            return "Number scopes";
          case "STRING":
            return "String scopes";
          case "BOOLEAN":
            return "Boolean scopes";
          default:
            return "Scopes";
        }
      } else {
        return "Multiple scopes";
      }
    }
    /**
     * Render scope options based on selected variable types
     */
    renderScopeOptions() {
      const types = /* @__PURE__ */ new Set();
      this.selectedVariables.forEach((varId) => {
        const variable = this.variables.find((v) => v.id === varId);
        if (variable) {
          types.add(variable.type);
        }
      });
      const scopeOptionsContainer = this.scopeSelector.querySelector("#scope-options");
      if (!scopeOptionsContainer) return;
      const scopesByType = {
        "COLOR": [
          { label: "All fills", value: "ALL_FILLS" },
          { label: "Frame fill", value: "FRAME_FILL" },
          { label: "Shape fill", value: "SHAPE_FILL" },
          { label: "Text fill", value: "TEXT_FILL" },
          { label: "All strokes", value: "ALL_STROKES" },
          { label: "Frame stroke", value: "FRAME_STROKE" },
          { label: "Shape stroke", value: "SHAPE_STROKE" },
          { label: "Text stroke", value: "TEXT_STROKE" },
          { label: "Effect color", value: "EFFECT_COLOR" }
        ],
        "FLOAT": [
          { label: "Corner radius", value: "CORNER_RADIUS" },
          { label: "Width & height", value: "WIDTH_HEIGHT" },
          { label: "Gap", value: "GAP" },
          { label: "Opacity", value: "OPACITY" },
          { label: "Font size", value: "FONT_SIZE" },
          { label: "Line height", value: "LINE_HEIGHT" },
          { label: "Letter spacing", value: "LETTER_SPACING" },
          { label: "Paragraph spacing", value: "PARAGRAPH_SPACING" },
          { label: "Paragraph indent", value: "PARAGRAPH_INDENT" }
        ],
        "STRING": [
          { label: "Text content", value: "TEXT_CONTENT" },
          { label: "Font family", value: "FONT_FAMILY" },
          { label: "Font style", value: "FONT_STYLE" },
          { label: "Font weight", value: "FONT_WEIGHT" }
        ],
        "BOOLEAN": []
      };
      if (types.size > 1) {
        scopeOptionsContainer.innerHTML = '<div class="empty-state">Select variables of the same type to assign scopes</div>';
        return;
      }
      const type = Array.from(types)[0];
      const scopes = scopesByType[type] || [];
      if (scopes.length === 0) {
        scopeOptionsContainer.innerHTML = '<div class="empty-state">No scopes available for this type</div>';
        return;
      }
      scopeOptionsContainer.innerHTML = scopes.map((scope) => `
      <label class="scope-option">
        <span>${scope.label}</span>
        <input type="checkbox" value="${scope.value}" data-scope="${scope.value}">
      </label>
    `).join("");
    }
    /**
     * Build tree structure from variable names
     */
    buildVariableTree(variables) {
      const tree = {};
      variables.forEach((variable) => {
        const parts = variable.name.split("/");
        let current = tree;
        parts.forEach((part, index) => {
          if (index === parts.length - 1) {
            current[part] = {
              _isVariable: true,
              _data: variable
            };
          } else {
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }
        });
      });
      return tree;
    }
    /**
     * Get all variable types within a tree node (for checking compatibility)
     */
    getGroupVariableTypes(tree) {
      const types = /* @__PURE__ */ new Set();
      for (const value of Object.values(tree)) {
        if (value._isVariable) {
          types.add(value._data.type);
        } else {
          const childTypes = this.getGroupVariableTypes(value);
          childTypes.forEach((type) => types.add(type));
        }
      }
      return types;
    }
    /**
     * Render variable tree recursively
     */
    renderVariableTree(tree, level) {
      let html = "";
      for (const [key, value] of Object.entries(tree)) {
        if (value._isVariable) {
          const v = value._data;
          const typeText = this.formatTypeText(v.type);
          html += `
          <div class="scope-item" style="padding-left: ${level * 12}px;">
            <div class="scope-item-content">
              <input type="checkbox" class="scope-checkbox" data-var-id="${v.id}">
              <span class="scope-var-name">${key}</span>
              <span class="scope-type">${typeText}</span>
            </div>
          </div>
        `;
        } else {
          const groupTypes = this.getGroupVariableTypes(value);
          const hasCompatibleTypes = groupTypes.size === 1;
          const groupId = `group-${level}-${key}`;
          html += `
          <div class="tree-group" style="padding-left: ${level * 12}px;">
            <div class="tree-header">
              ${hasCompatibleTypes ? `<input type="checkbox" class="group-checkbox" data-group-id="${groupId}">` : `<span class="group-checkbox-spacer"></span>`}
              <span class="tree-toggle"></span>
              <span class="tree-label">${key}</span>
            </div>
            <div class="tree-children" data-group-id="${groupId}">
              ${this.renderVariableTree(value, level + 1)}
            </div>
          </div>
        `;
        }
      }
      return html;
    }
    /**
     * Format scope text from Figma scopes array
     */
    formatScopeText(scopes) {
      if (!scopes || scopes.length === 0) {
        return "No scopes";
      }
      const scopeMap = {
        "ALL_SCOPES": "All scopes",
        "ALL_FILLS": "All fills",
        "FRAME_FILL": "Frame fill",
        "SHAPE_FILL": "Shape fill",
        "TEXT_FILL": "Text fill",
        "ALL_STROKES": "All strokes",
        "FRAME_STROKE": "Frame stroke",
        "SHAPE_STROKE": "Shape stroke",
        "TEXT_STROKE": "Text stroke",
        "EFFECT_COLOR": "Effect color",
        "TEXT_CONTENT": "Text content",
        "CORNER_RADIUS": "Corner radius",
        "WIDTH_HEIGHT": "Width & height",
        "GAP": "Gap",
        "OPACITY": "Opacity",
        "FONT_FAMILY": "Font family",
        "FONT_STYLE": "Font style",
        "FONT_WEIGHT": "Font weight",
        "FONT_SIZE": "Font size",
        "LINE_HEIGHT": "Line height",
        "LETTER_SPACING": "Letter spacing",
        "PARAGRAPH_SPACING": "Paragraph spacing",
        "PARAGRAPH_INDENT": "Paragraph indent"
      };
      const displayScopes = scopes.map((s) => scopeMap[s] || s);
      if (displayScopes.length === 1) {
        return displayScopes[0];
      } else if (displayScopes.length <= 3) {
        return displayScopes.join(", ");
      } else {
        return `${displayScopes.length} scopes`;
      }
    }
    /**
     * Format variable type to display text
     */
    formatTypeText(type) {
      const typeMap = {
        "COLOR": "Color",
        "FLOAT": "Number",
        "STRING": "String",
        "BOOLEAN": "Boolean"
      };
      return typeMap[type] || type;
    }
    /**
     * Handle apply scopes button click
     */
    async handleApplyScopes() {
      if (this.selectedVariables.size === 0) {
        this.showNotification("No variables selected", "error");
        return;
      }
      try {
        this.setEnabled(this.applyScopesBtn, false);
        const scopeCheckboxes = this.scopeSelector.querySelectorAll('input[type="checkbox"]:checked');
        const selectedScopes = Array.from(scopeCheckboxes).map((cb) => cb.value);
        if (selectedScopes.length === 0) {
          this.showNotification("Please select at least one scope to apply", "error");
          this.setEnabled(this.applyScopesBtn, true);
          return;
        }
        const scopeAssignments = {};
        this.selectedVariables.forEach((varId) => {
          const variable = this.variables.find((v) => v.id === varId);
          if (variable) {
            scopeAssignments[variable.name] = selectedScopes;
          }
        });
        console.log("[ScopeScreen] Applying scopes:", scopeAssignments);
        const response = await this.bridge.send("apply-variable-scopes", { variableScopes: scopeAssignments });
        this.showNotification(response.message || "Scopes applied successfully", "success");
        this.selectedVariables.clear();
        this.updateScopeSelector();
        await this.loadVariables();
        this.setEnabled(this.applyScopesBtn, true);
      } catch (error) {
        console.error("Error applying scopes:", error);
        this.showNotification("Failed to apply scopes", "error");
        this.setEnabled(this.applyScopesBtn, true);
      }
    }
    /**
     * Handle reset selection button click
     */
    handleResetSelection() {
      const checkboxes = this.scopeContent.querySelectorAll(".scope-checkbox");
      checkboxes.forEach((cb) => {
        cb.checked = false;
      });
      this.selectedVariables.clear();
      this.lastSelectedIndex = -1;
      this.updateScopeSelector();
    }
    /**
     * Handle sync scopes (legacy - keeping for backward compatibility)
     */
    async handleSyncScopes() {
      await this.handleApplyScopes();
    }
    /**
     * Handle pull changes
     */
    async handlePullChanges() {
      this.showNotification("Pull changes from scope screen", "info");
    }
  };

  // src/frontend/index.ts
  var FrontendApp = class {
    constructor() {
      this.state = new AppState();
      this.bridge = new PluginBridge();
      this.welcomeScreen = new WelcomeScreen(this.state);
      this.importScreen = new ImportScreen(this.state, this.bridge);
      this.tokenScreen = new TokenScreen(this.state, this.bridge);
      this.scopeScreen = new ScopeScreen(this.state, this.bridge);
      this.welcomeScreen.init();
      this.importScreen.init();
      this.tokenScreen.init();
      this.scopeScreen.init();
      this.screens = /* @__PURE__ */ new Map([
        ["welcome", this.welcomeScreen],
        ["import", this.importScreen],
        ["token", this.tokenScreen],
        ["scope", this.scopeScreen]
      ]);
    }
    /**
     * Initialize and start the application
     */
    init() {
      const body = document.body;
      this.welcomeScreen.mount(body);
      this.importScreen.mount(body);
      this.tokenScreen.mount(body);
      this.scopeScreen.mount(body);
      this.welcomeScreen.hide();
      this.importScreen.hide();
      this.tokenScreen.hide();
      this.scopeScreen.hide();
      this.welcomeScreen.show();
      this.state.subscribe("screen-changed", (screen) => {
        this.handleScreenChange(screen);
      });
      this.setupBackendHandlers();
      console.log("[Frontend] Application started");
    }
    /**
     * Handle screen navigation
     */
    handleScreenChange(screen) {
      console.log(`[Frontend] Navigating to: ${screen}`);
      this.screens.forEach((s) => s.hide());
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
    setupBackendHandlers() {
      this.bridge.on("import-success", (message) => {
        console.log("[Frontend] Import success:", message);
      });
      this.bridge.on("error", (message) => {
        console.error("[Frontend] Backend error:", message);
      });
      this.bridge.on("github-files-fetched", (data) => {
        console.log("[Frontend] GitHub files fetched:", data);
      });
      this.bridge.on("tokens-loaded", (data) => {
        console.log("[Frontend] Tokens loaded:", data);
      });
    }
  };
  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        const app = new FrontendApp();
        app.init();
      });
    } else {
      const app = new FrontendApp();
      app.init();
    }
  } catch (error) {
    console.error("[Frontend] Initialization error:", error);
  }
})();

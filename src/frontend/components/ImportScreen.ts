// ====================================================================================
// IMPORT SCREEN COMPONENT
// Handles GitHub and Local file import
// ====================================================================================

import { BaseComponent } from './BaseComponent';
import { AppState } from '../state/AppState';
import { PluginBridge } from '../services/PluginBridge';
import { CSS_CLASSES } from '../../shared/constants';
import { TokenFile } from '../../shared/types';

/**
 * Import screen component
 *
 * Features:
 * - GitHub import: token, repo, branch, file selection
 * - Local import: drag & drop + file selection
 * - Mode switching between GitHub and Local
 * - Loading states
 * - Error handling
 */
export class ImportScreen extends BaseComponent {
  private bridge: PluginBridge;

  // UI elements
  private backLink!: HTMLAnchorElement;
  private importTitle!: HTMLHeadingElement;
  private importSubtitle!: HTMLParagraphElement;

  // GitHub elements
  private githubContent!: HTMLDivElement;
  private githubToken!: HTMLInputElement;
  private repoUrl!: HTMLInputElement;
  private branchName!: HTMLInputElement;
  private fetchFilesBtn!: HTMLButtonElement;
  private githubLoading!: HTMLDivElement;
  private githubFilesContainer!: HTMLDivElement;
  private githubActionButtons!: HTMLDivElement;
  private syncTokensBtn!: HTMLButtonElement;

  // Local elements
  private localContent!: HTMLDivElement;
  private fileInput!: HTMLInputElement;
  private localFilesList!: HTMLDivElement;

  constructor(state: AppState, bridge: PluginBridge) {
    super(state);
    this.bridge = bridge;
  }

  protected createElement(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'import-screen';
    screen.className = 'screen import-screen';

    screen.innerHTML = `
      <div class="import-header">
        <a class="back-link" id="back-to-welcome">← Back</a>
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

    // Cache element references
    this.backLink = screen.querySelector('#back-to-welcome')!;
    this.importTitle = screen.querySelector('#import-title')!;
    this.importSubtitle = screen.querySelector('#import-subtitle')!;

    // GitHub elements
    this.githubContent = screen.querySelector('#github-import-content')!;
    this.githubToken = screen.querySelector('#github-token')!;
    this.repoUrl = screen.querySelector('#repo-url')!;
    this.branchName = screen.querySelector('#branch-name')!;
    this.fetchFilesBtn = screen.querySelector('#fetch-files-btn')!;
    this.githubLoading = screen.querySelector('#github-loading')!;
    this.githubFilesContainer = screen.querySelector('#github-files-container')!;
    this.githubActionButtons = screen.querySelector('#github-action-buttons')!;
    this.syncTokensBtn = screen.querySelector('#sync-tokens-btn')!;

    // Local elements
    this.localContent = screen.querySelector('#local-import-content')!;
    this.fileInput = screen.querySelector('#file-input')!;
    this.localFilesList = screen.querySelector('#local-files-list')!;

    return screen;
  }

  protected bindEvents(): void {
    // Back to welcome
    this.addEventListener(this.backLink, 'click', (e) => {
      e.preventDefault();
      this.state.setCurrentScreen('welcome');
    });

    // GitHub fetch files
    this.addEventListener(this.fetchFilesBtn, 'click', () => {
      this.handleFetchFiles();
    });

    // GitHub sync tokens
    this.addEventListener(this.syncTokensBtn, 'click', () => {
      this.handleSyncTokens();
    });

    // Local file input
    this.addEventListener(this.fileInput, 'change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        this.handleLocalFiles(Array.from(target.files));
      }
    });

    // Listen to state changes
    this.subscribeToState('import-mode-changed', (mode) => {
      this.updateMode(mode);
    });

    // Listen to backend events
    this.setupBackendListeners();
  }

  /**
   * Setup backend event listeners
   */
  private setupBackendListeners(): void {
    // GitHub files imported (fire-and-forget from sync button)
    this.bridge.on('github-files-imported', (data) => {
      this.handleFilesImported(data);
    });

    // GitHub config loaded (fire-and-forget)
    this.bridge.on('github-config-loaded', (config) => {
      this.loadGitHubConfig(config);
    });

    // Errors (general error handler for async messages without requestId)
    this.bridge.on('error', (message) => {
      this.showNotification(message, 'error');
      this.githubLoading.classList.add(CSS_CLASSES.HIDDEN);
      this.setEnabled(this.fetchFilesBtn, true);
    });
  }

  /**
   * Handle fetch files from GitHub
   */
  private async handleFetchFiles(): Promise<void> {
    const token = this.githubToken.value.trim();
    const url = this.repoUrl.value.trim();
    const branch = this.branchName.value.trim() || 'main';

    if (!url) {
      this.showNotification('Please enter a repository URL', 'error');
      return;
    }

    // Parse owner and repo from URL
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      this.showNotification('Invalid GitHub URL format', 'error');
      return;
    }

    const [, owner, repo] = match;

    // Save config
    const githubConfig = {
      token,
      owner,
      repo: repo.replace('.git', ''),
      branch
    };
    this.state.setGitHubConfig(githubConfig);

    // Show loading
    this.githubLoading.classList.remove(CSS_CLASSES.HIDDEN);
    this.setEnabled(this.fetchFilesBtn, false);

    // Send request to backend
    try {
      const response = await this.bridge.send('github-fetch-files', githubConfig);
      this.handleFilesFetched(response.files);
    } catch (error) {
      console.error('Error fetching files:', error);
      this.githubLoading.classList.add(CSS_CLASSES.HIDDEN);
      this.setEnabled(this.fetchFilesBtn, true);
    }
  }

  /**
   * Handle files fetched from GitHub
   */
  private handleFilesFetched(files: string[]): void {
    this.githubLoading.classList.add(CSS_CLASSES.HIDDEN);
    this.setEnabled(this.fetchFilesBtn, true);

    if (files.length === 0) {
      this.githubFilesContainer.innerHTML = '<div class="empty-state">No JSON files found in repository</div>';
      return;
    }

    // Display file list with checkboxes
    const fileList = document.createElement('div');
    fileList.className = 'file-list';
    fileList.innerHTML = `
      <div class="file-list-header">Select files to sync (${files.length} found)</div>
      ${files.map(file => `
        <div class="file-item">
          <input type="checkbox" class="file-checkbox" value="${file}" id="file-${file}" checked>
          <label for="file-${file}">
            <div class="file-name">${file.split('/').pop()}</div>
            <div class="file-path">${file}</div>
          </label>
        </div>
      `).join('')}
    `;

    this.githubFilesContainer.innerHTML = '';
    this.githubFilesContainer.appendChild(fileList);

    // Show action buttons
    this.fetchFilesBtn.classList.add(CSS_CLASSES.HIDDEN);
    this.githubActionButtons.classList.remove(CSS_CLASSES.HIDDEN);
    this.setEnabled(this.syncTokensBtn, true);
  }

  /**
   * Handle sync tokens from GitHub
   */
  private async handleSyncTokens(): Promise<void> {
    console.log('[ImportScreen] Sync Tokens clicked');

    const selectedFiles = Array.from(
      this.githubFilesContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')
    ).map(cb => cb.value);

    console.log('[ImportScreen] Selected files:', selectedFiles);

    if (selectedFiles.length === 0) {
      this.showNotification('Please select at least one file', 'error');
      return;
    }

    const config = this.state.githubConfig;
    if (!config) {
      this.showNotification('GitHub configuration missing', 'error');
      return;
    }

    // Update config with selected files
    config.files = selectedFiles;
    this.state.setGitHubConfig(config);

    console.log('[ImportScreen] Saving GitHub config...');
    // Save config (fire-and-forget - notification comes via 'info' message)
    this.bridge.sendAsync('save-github-config', config);

    // Show loading
    this.githubLoading.classList.remove(CSS_CLASSES.HIDDEN);
    this.setEnabled(this.syncTokensBtn, false);

    console.log('[ImportScreen] Sending import request...');
    // Send import request (async - response comes via 'github-files-imported' event)
    this.bridge.sendAsync('github-import-files', config);
    console.log('[ImportScreen] Import request sent, waiting for backend response');

    // Note: Loading state will be cleared in handleFilesImported() when backend responds
  }

  /**
   * Handle files imported from GitHub
   */
  private handleFilesImported(data: { primitives: any; semantics: any }): void {
    console.log('[ImportScreen] Files imported from GitHub:', data);
    this.githubLoading.classList.add(CSS_CLASSES.HIDDEN);

    // Convert to TokenFile format
    const tokenFiles: TokenFile[] = [];

    if (data.primitives) {
      tokenFiles.push({
        name: 'primitives',
        path: 'github://primitives',
        content: data.primitives,
        source: 'github'
      });
    }

    if (data.semantics) {
      tokenFiles.push({
        name: 'semantics',
        path: 'github://semantics',
        content: data.semantics,
        source: 'github'
      });
    }

    console.log('[ImportScreen] Created token files:', tokenFiles.length);

    // Update state
    this.state.setTokenFiles(tokenFiles);
    this.state.setTokenSource('github');

    console.log('[ImportScreen] Navigating to token screen...');
    // Navigate to token screen
    this.state.setCurrentScreen('token');
  }

  /**
   * Handle local file selection
   */
  private async handleLocalFiles(files: File[]): Promise<void> {
    if (files.length === 0) return;

    const tokenFiles: TokenFile[] = [];

    for (const file of files) {
      if (file.name.endsWith('.json')) {
        const content = await this.readFileAsText(file);
        try {
          const parsed = JSON.parse(content);
          tokenFiles.push({
            name: file.name,
            path: `local://${file.name}`,
            content: parsed,
            source: 'local'
          });
        } catch (error) {
          console.error(`Error parsing ${file.name}:`, error);
          this.showNotification(`Failed to parse ${file.name}`, 'error');
        }
      } else if (file.name.endsWith('.zip')) {
        // TODO: Handle ZIP files with JSZip
        this.showNotification('ZIP files not yet supported', 'error');
      }
    }

    if (tokenFiles.length > 0) {
      // Update state
      this.state.setTokenFiles(tokenFiles);
      this.state.setTokenSource('local');

      // Navigate to token screen
      this.state.setCurrentScreen('token');
    }
  }

  /**
   * Read file as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Load GitHub config into form
   */
  private loadGitHubConfig(config: any): void {
    if (config.token) this.githubToken.value = config.token;
    if (config.owner && config.repo) {
      this.repoUrl.value = `https://github.com/${config.owner}/${config.repo}`;
    }
    if (config.branch) this.branchName.value = config.branch;
  }

  /**
   * Update mode (GitHub or Local)
   */
  private updateMode(mode: 'github' | 'local'): void {
    if (mode === 'github') {
      this.importTitle.textContent = 'Connect to github';
      this.importSubtitle.textContent = 'Connect to a GitHub repository to import and synchronize design tokens.';
      this.githubContent.classList.add(CSS_CLASSES.ACTIVE);
      this.localContent.classList.remove(CSS_CLASSES.ACTIVE);

      // Load saved GitHub config
      this.bridge.sendAsync('load-github-config');
    } else {
      this.importTitle.textContent = 'Import from local';
      this.importSubtitle.textContent = 'Import local design tokens from your files.';
      this.localContent.classList.add(CSS_CLASSES.ACTIVE);
      this.githubContent.classList.remove(CSS_CLASSES.ACTIVE);
    }
  }

  /**
   * Show this screen
   */
  show(): void {
    super.show();
    // Update mode based on current import mode
    this.updateMode(this.state.importMode);
    console.log('[ImportScreen] Screen shown');
  }
}

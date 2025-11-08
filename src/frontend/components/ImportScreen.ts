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
  private dropZone!: HTMLDivElement;

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
        <a class="back-link" id="back-to-welcome">← Back to Welcome</a>
        <h1 class="import-title" id="import-title">Import Tokens</h1>
        <p class="import-subtitle" id="import-subtitle">Configure your token source</p>
      </div>

      <!-- GitHub Import Content -->
      <div class="import-content active" id="github-import-content">
        <div class="input-group">
          <label for="github-token">GitHub Personal Access Token</label>
          <input type="password" id="github-token" placeholder="ghp_...">
          <div class="input-hint">Required for private repositories</div>
        </div>

        <div class="input-group">
          <label for="repo-url">Repository URL</label>
          <input type="text" id="repo-url" placeholder="https://github.com/owner/repo">
        </div>

        <div class="input-group">
          <label for="branch-name">Branch</label>
          <input type="text" id="branch-name" placeholder="main" value="main">
        </div>

        <button class="btn btn-primary btn-full" id="fetch-files-btn">Connect to Repository</button>

        <div class="loading" id="github-loading">
          <span>Fetching files from GitHub...</span>
        </div>

        <div id="github-files-container"></div>

        <div class="action-buttons hidden" id="github-action-buttons">
          <button class="btn btn-primary btn-full" id="sync-tokens-btn" disabled>Sync Tokens</button>
        </div>
      </div>

      <!-- Local Import Content -->
      <div class="import-content" id="local-import-content">
        <input type="file" id="file-input" multiple accept=".json,.zip" style="display: none;">

        <div class="drop-zone" id="drop-zone">
          <div class="drop-zone-icon">📁</div>
          <div class="drop-zone-text">Click to select token files or drag & drop</div>
          <div class="drop-zone-hint">Supports .json and .zip files</div>
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
    this.dropZone = screen.querySelector('#drop-zone')!;

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

    // Drop zone click
    this.addEventListener(this.dropZone, 'click', () => {
      this.fileInput.click();
    });

    // Drop zone drag & drop
    this.addEventListener(this.dropZone, 'dragover', (e) => {
      e.preventDefault();
      this.dropZone.style.borderColor = '#0d99ff';
      this.dropZone.style.background = '#f8fcff';
    });

    this.addEventListener(this.dropZone, 'dragleave', (e) => {
      e.preventDefault();
      this.dropZone.style.borderColor = '#e0e0e0';
      this.dropZone.style.background = '';
    });

    this.addEventListener(this.dropZone, 'drop', (e) => {
      e.preventDefault();
      this.dropZone.style.borderColor = '#e0e0e0';
      this.dropZone.style.background = '';

      if (e.dataTransfer?.files) {
        this.handleLocalFiles(Array.from(e.dataTransfer.files));
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
    // GitHub files fetched
    this.bridge.on('github-files-fetched', (data) => {
      this.handleFilesFetched(data.files);
    });

    // GitHub files imported
    this.bridge.on('github-files-imported', (data) => {
      this.handleFilesImported(data);
    });

    // GitHub config loaded
    this.bridge.on('github-config-loaded', (config) => {
      this.loadGitHubConfig(config);
    });

    // Errors
    this.bridge.on('error', (message) => {
      this.showNotification(message, 'error');
      this.setLoading(this.githubLoading, false);
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
    this.setLoading(this.githubLoading, true);
    this.setEnabled(this.fetchFilesBtn, false);

    // Send request to backend
    try {
      await this.bridge.send('github-fetch-files', githubConfig);
    } catch (error) {
      console.error('Error fetching files:', error);
      this.setLoading(this.githubLoading, false);
      this.setEnabled(this.fetchFilesBtn, true);
    }
  }

  /**
   * Handle files fetched from GitHub
   */
  private handleFilesFetched(files: string[]): void {
    this.setLoading(this.githubLoading, false);
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
    // Save config
    await this.bridge.send('save-github-config', config);
    console.log('[ImportScreen] Config saved');

    // Show loading
    this.setLoading(this.githubLoading, true);
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
    this.setLoading(this.githubLoading, false);

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
      this.importTitle.textContent = 'Connect to GitHub';
      this.importSubtitle.textContent = 'Import tokens from a GitHub repository';
      this.githubContent.classList.add(CSS_CLASSES.ACTIVE);
      this.localContent.classList.remove(CSS_CLASSES.ACTIVE);

      // Load saved GitHub config
      this.bridge.sendAsync('load-github-config');
    } else {
      this.importTitle.textContent = 'Import Local Files';
      this.importSubtitle.textContent = 'Select token files from your computer';
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

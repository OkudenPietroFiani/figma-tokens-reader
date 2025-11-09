// ====================================================================================
// TOKEN SCREEN COMPONENT
// Display token files and sync to Figma
// ====================================================================================

import { BaseComponent } from './BaseComponent';
import { AppState } from '../state/AppState';
import { PluginBridge } from '../services/PluginBridge';

export class TokenScreen extends BaseComponent {
  private bridge: PluginBridge;
  private fileTabsList!: HTMLDivElement;
  private tokenTreeContent!: HTMLDivElement;
  private lastUpdatedText!: HTMLDivElement;

  // Callback for layout to update pull button state
  public onPullButtonUpdate: ((visible: boolean, hasChanges: boolean) => void) | null = null;

  constructor(state: AppState, bridge: PluginBridge) {
    super(state);
    this.bridge = bridge;
  }

  protected createElement(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'token-screen';
    screen.className = 'screen-content token-screen';

    screen.innerHTML = `
      <!-- Tokens View -->
      <div class="token-view active" id="tokens-view">
        <div class="token-layout">
          <!-- Left Column: File Tabs -->
          <div class="file-tabs">
            <div class="file-tabs-header">
              <div class="file-tabs-title">Files</div>
              <div id="last-updated-text" class="last-updated-text"></div>
            </div>
            <div id="file-tabs-list" class="file-tabs-content">
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
    `;

    // Cache references
    this.fileTabsList = screen.querySelector('#file-tabs-list')!;
    this.tokenTreeContent = screen.querySelector('#token-tree-content')!;
    this.lastUpdatedText = screen.querySelector('#last-updated-text')!;

    return screen;
  }

  protected bindEvents(): void {
    // Listen to state changes
    this.subscribeToState('files-loaded', () => {
      this.renderFileList();
      this.updatePullButton();
      this.updateLastUpdatedText();
    });

    this.subscribeToState('file-selected', (fileName) => {
      this.renderFilePreview(fileName);
    });
  }

  /**
   * Render file list
   */
  private renderFileList(): void {
    const files = Array.from(this.state.tokenFiles.values());

    if (files.length === 0) {
      this.fileTabsList.innerHTML = '<div class="empty-state">No files loaded</div>';
      return;
    }

    // Clear and create file tabs securely using DOM methods
    this.fileTabsList.innerHTML = '';

    const fileTabs: HTMLButtonElement[] = [];
    files.forEach(file => {
      const tab = document.createElement('button');
      tab.className = 'file-tab';
      tab.setAttribute('data-file', file.name);
      tab.textContent = file.name; // Safe: uses textContent instead of innerHTML

      this.addEventListener(tab, 'click', () => {
        const fileName = tab.getAttribute('data-file')!;
        this.state.setSelectedFile(fileName);

        // Update active state
        fileTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });

      fileTabs.push(tab);
      this.fileTabsList.appendChild(tab);
    });

    // Auto-select first file
    if (files.length > 0 && !this.state.selectedFile) {
      this.state.setSelectedFile(files[0].name);
      fileTabs[0].classList.add('active');
    }
  }

  /**
   * Render file preview as tree view
   */
  private renderFilePreview(fileName: string | null): void {
    if (!fileName) {
      this.tokenTreeContent.innerHTML = '<div class="empty-state">Select a file to preview</div>';
      return;
    }

    const file = this.state.tokenFiles.get(fileName);
    if (!file) {
      this.tokenTreeContent.innerHTML = '<div class="empty-state">File not found</div>';
      return;
    }

    // Render token tree
    this.tokenTreeContent.innerHTML = this.renderTokenTree(file.content);

    // Add click handlers for expand/collapse
    const toggleBtns = this.tokenTreeContent.querySelectorAll('.tree-toggle');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const parent = target.closest('.tree-group');
        parent?.classList.toggle('collapsed');
      });
    });
  }

  /**
   * Render token tree recursively
   */
  private renderTokenTree(obj: any, level: number = 0): string {
    if (typeof obj !== 'object' || obj === null) {
      return `<div class="tree-value">${this.escapeHtml(JSON.stringify(obj))}</div>`;
    }

    let html = '';
    // Cap level at 6 to match CSS classes
    const cappedLevel = Math.min(level, 6);

    for (const [key, value] of Object.entries(obj)) {
      // Check if this is a token group or a token value
      const isGroup = typeof value === 'object' && value !== null && !value.$value;

      if (isGroup) {
        html += `
          <div class="tree-group tree-indent-${cappedLevel}">
            <div class="tree-header">
              <span class="tree-toggle">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="tree-label">${this.escapeHtml(key)}</span>
            </div>
            <div class="tree-children">
              ${this.renderTokenTree(value, level + 1)}
            </div>
          </div>
        `;
      } else {
        // Get the display value
        let displayValue = '';
        if (value && typeof value === 'object' && value.$value !== undefined) {
          displayValue = this.formatTokenValue(value.$value);
        } else {
          displayValue = this.formatTokenValue(value);
        }

        html += `
          <div class="tree-item tree-item-indent-${cappedLevel}">
            <span class="tree-item-label">${this.escapeHtml(key)}</span>
            <span class="tree-item-meta">${displayValue}</span>
          </div>
        `;
      }
    }

    return html;
  }

  /**
   * Format token value for display
   */
  private formatTokenValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return this.escapeHtml(value);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (typeof value === 'object') {
      return this.escapeHtml(JSON.stringify(value));
    }

    return this.escapeHtml(String(value));
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Handle sync to Figma (called from AppLayout)
   */
  public async handleSyncToFigma(): Promise<void> {
    const files = Array.from(this.state.tokenFiles.values());

    if (files.length === 0) {
      this.showNotification('No token files loaded', 'error');
      return;
    }

    // Organize tokens by type (primitives/semantics)
    let primitives = null;
    let semantics = null;

    files.forEach(file => {
      if (file.name.toLowerCase().includes('primitive')) {
        primitives = file.content;
      } else if (file.name.toLowerCase().includes('semantic')) {
        semantics = file.content;
      }
    });

    // If not found by name, use first as primitives
    if (!primitives && files.length > 0) {
      primitives = files[0].content;
    }

    try {
      // Disabled state managed by AppLayout
      const message = await this.bridge.send('import-tokens', {
        primitives,
        semantics,
        source: this.state.tokenSource
      });
      this.showNotification(message, 'success');
    } catch (error) {
      console.error('Error syncing to Figma:', error);
      this.showNotification('Failed to sync tokens', 'error');
    }
  }

  /**
   * Update pull button state and notify layout
   */
  private updatePullButton(): void {
    // Always show the pull changes button
    const shouldShowPullButton = true;

    // Check if we should show change indicator
    const hasChanges = this.shouldShowChangeIndicator();

    // Notify layout to update pull button
    if (this.onPullButtonUpdate) {
      this.onPullButtonUpdate(shouldShowPullButton, hasChanges);
    }
  }

  /**
   * Check if change indicator should be shown
   */
  private shouldShowChangeIndicator(): boolean {
    const lastUpdated = this.state.lastUpdated;

    if (!lastUpdated) {
      return false;
    }

    // Check if more than 5 minutes have passed since last update
    const lastUpdateTime = new Date(lastUpdated).getTime();
    const now = new Date().getTime();
    const minutesSinceUpdate = Math.floor((now - lastUpdateTime) / 60000);

    // Show indicator if it's been more than 5 minutes since last update
    return minutesSinceUpdate >= 5;
  }

  /**
   * Update last updated timestamp text
   */
  private updateLastUpdatedText(): void {
    const lastUpdated = this.state.lastUpdated;

    if (!lastUpdated) {
      this.lastUpdatedText.textContent = '';
      return;
    }

    // Format the timestamp
    const date = new Date(lastUpdated);
    const formattedDate = this.formatDateTime(date);
    this.lastUpdatedText.textContent = `Updated: ${formattedDate}`;
  }

  /**
   * Format date and time for display
   */
  private formatDateTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    // If less than 1 minute ago, show "just now"
    if (diffMins < 1) {
      return 'just now';
    }

    // If less than 60 minutes ago, show "X mins ago"
    if (diffMins < 60) {
      return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    }

    // Otherwise show date and time
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Handle pull changes from source (called from AppLayout)
   * For GitHub: pulls latest changes from repository
   * For local: navigates to import screen to re-select files
   */
  public async handlePullChanges(): Promise<void> {
    const tokenSource = this.state.tokenSource;
    const githubConfig = this.state.githubConfig;

    // Handle local source - navigate to import screen
    if (tokenSource === 'local' || !githubConfig) {
      this.showNotification('Re-import your token files from the import screen', 'info');
      this.state.setCurrentScreen('import');
      return;
    }

    // Handle GitHub source - pull latest changes
    try {
      this.showNotification('Pulling latest changes from GitHub...', 'info');

      // Store current files for comparison
      const oldFiles = Array.from(this.state.tokenFiles.values());

      const response = await this.bridge.send('github-import-files', githubConfig);
      this.handleFilesImported(response, oldFiles);

      // Update pull button state (will hide change indicator)
      this.updatePullButton();
    } catch (error) {
      console.error('Error pulling changes:', error);
      this.showNotification('Failed to pull changes', 'error');
    }
  }

  /**
   * Handle files imported from GitHub
   */
  private handleFilesImported(data: any, oldFiles?: any[]): void {
    console.log('[TokenScreen] Files imported from GitHub:', data);

    const tokenFiles = [];
    const githubConfig = this.state.githubConfig;
    const repoPath = githubConfig ? `${githubConfig.owner}/${githubConfig.repo}/${githubConfig.branch}` : 'github';

    // Extract primitives files (if it's an object with multiple files)
    if (data.primitives) {
      if (typeof data.primitives === 'object' && Object.keys(data.primitives).some(k => k.endsWith('.json'))) {
        // Multiple files stored with their filenames as keys
        for (const [filename, content] of Object.entries(data.primitives)) {
          tokenFiles.push({
            name: filename.replace('.json', ''),
            path: `${repoPath}/${filename}`,
            content: content,
            source: 'github' as const
          });
        }
      } else {
        // Single primitives file
        tokenFiles.push({
          name: 'primitives',
          path: `${repoPath}/primitives`,
          content: data.primitives,
          source: 'github' as const
        });
      }
    }

    // Extract semantics files (if it's an object with multiple files)
    if (data.semantics) {
      if (typeof data.semantics === 'object' && Object.keys(data.semantics).some(k => k.endsWith('.json'))) {
        // Multiple files stored with their filenames as keys
        for (const [filename, content] of Object.entries(data.semantics)) {
          tokenFiles.push({
            name: filename.replace('.json', ''),
            path: `${repoPath}/${filename}`,
            content: content,
            source: 'github' as const
          });
        }
      } else {
        // Single semantics file
        tokenFiles.push({
          name: 'semantics',
          path: `${repoPath}/semantics`,
          content: data.semantics,
          source: 'github' as const
        });
      }
    }

    if (tokenFiles.length > 0) {
      this.state.setTokenFiles(tokenFiles);
      this.state.setTokenSource('github'); // Ensure tokenSource is set

      // Show detailed comparison if we have old files to compare
      if (oldFiles && oldFiles.length > 0) {
        const changeMessage = this.compareTokenFiles(oldFiles, tokenFiles);
        this.showNotification(changeMessage, 'success');
      } else {
        this.showNotification(`✓ Successfully pulled ${tokenFiles.length} file${tokenFiles.length === 1 ? '' : 's'}`, 'success');
      }
    } else {
      this.showNotification('No token files found in response', 'error');
    }
  }

  /**
   * Compare old and new token files and generate a summary message
   */
  private compareTokenFiles(oldFiles: any[], newFiles: any[]): string {
    let hasChanges = false;
    let changeDetails: string[] = [];

    // Compare each file
    for (const newFile of newFiles) {
      const oldFile = oldFiles.find(f => f.name === newFile.name);

      if (!oldFile) {
        hasChanges = true;
        changeDetails.push(`${newFile.name}: added`);
        continue;
      }

      // Compare file contents
      const oldJson = JSON.stringify(oldFile.content);
      const newJson = JSON.stringify(newFile.content);

      if (oldJson !== newJson) {
        hasChanges = true;
        const oldSize = Object.keys(this.flattenTokens(oldFile.content)).length;
        const newSize = Object.keys(this.flattenTokens(newFile.content)).length;
        const diff = newSize - oldSize;

        if (diff > 0) {
          changeDetails.push(`${newFile.name}: +${diff} token${diff === 1 ? '' : 's'}`);
        } else if (diff < 0) {
          changeDetails.push(`${newFile.name}: ${diff} token${diff === -1 ? '' : 's'}`);
        } else {
          changeDetails.push(`${newFile.name}: modified`);
        }
      }
    }

    // Check for deleted files
    for (const oldFile of oldFiles) {
      if (!newFiles.find(f => f.name === oldFile.name)) {
        hasChanges = true;
        changeDetails.push(`${oldFile.name}: removed`);
      }
    }

    if (!hasChanges) {
      return '✓ No changes detected - tokens are up to date';
    }

    if (changeDetails.length === 1) {
      return `✓ ${changeDetails[0]}`;
    }

    return `✓ Changes detected: ${changeDetails.join(', ')}`;
  }

  /**
   * Flatten token object to count all tokens
   */
  private flattenTokens(obj: any, result: any = {}): any {
    for (const key in obj) {
      const value = obj[key];
      if (value && typeof value === 'object') {
        if ('$value' in value) {
          // It's a token
          result[key] = value;
        } else {
          // It's a group, recurse
          this.flattenTokens(value, result);
        }
      }
    }
    return result;
  }

  /**
   * Show this screen
   */
  show(): void {
    super.show();
    this.renderFileList();
    this.updatePullButton();
    this.updateLastUpdatedText();
    console.log('[TokenScreen] Screen shown');
  }
}

// ====================================================================================
// TOKEN SCREEN COMPONENT
// Display token files and sync to Figma
// ====================================================================================

import { BaseComponent } from './BaseComponent';
import { AppState } from '../state/AppState';
import { PluginBridge } from '../services/PluginBridge';

export class TokenScreen extends BaseComponent {
  private bridge: PluginBridge;
  private syncBtn!: HTMLButtonElement;
  private switchSourceBtn!: HTMLButtonElement;
  private fileTabsList!: HTMLDivElement;
  private jsonContent!: HTMLDivElement;

  constructor(state: AppState, bridge: PluginBridge) {
    super(state);
    this.bridge = bridge;
  }

  protected createElement(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'token-screen';
    screen.className = 'screen token-screen';

    screen.innerHTML = `
      <!-- Top Bar -->
      <div class="token-top-bar">
        <div class="token-top-bar-tabs">
          <button class="token-tab active" id="tokens-tab">Tokens</button>
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

          <!-- Right Column: JSON Preview -->
          <div class="json-preview">
            <div class="json-content" id="json-content">
              <div class="empty-state">Select a token file from the left to preview its contents</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="token-actions">
        <button class="btn btn-primary" id="sync-to-figma-btn">Sync in Figma</button>
      </div>
    `;

    // Cache references
    this.syncBtn = screen.querySelector('#sync-to-figma-btn')!;
    this.switchSourceBtn = screen.querySelector('#switch-source-btn')!;
    this.fileTabsList = screen.querySelector('#file-tabs-list')!;
    this.jsonContent = screen.querySelector('#json-content')!;

    return screen;
  }

  protected bindEvents(): void {
    // Sync to Figma button
    this.addEventListener(this.syncBtn, 'click', () => {
      this.handleSyncToFigma();
    });

    // Switch source button
    this.addEventListener(this.switchSourceBtn, 'click', () => {
      this.state.setCurrentScreen('welcome');
    });

    // Listen to state changes
    this.subscribeToState('files-loaded', () => {
      this.renderFileList();
    });

    this.subscribeToState('file-selected', (fileName) => {
      this.renderFilePreview(fileName);
    });

    // Backend listeners
    this.bridge.on('import-success', (message) => {
      this.showNotification(message, 'success');
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

    this.fileTabsList.innerHTML = files.map(file => {
      return `<button class="file-tab" data-file="${file.name}">${file.name}</button>`;
    }).join('');

    // Add click handlers
    const fileTabs = this.fileTabsList.querySelectorAll('.file-tab');
    fileTabs.forEach(tab => {
      this.addEventListener(tab as HTMLElement, 'click', () => {
        const fileName = tab.getAttribute('data-file')!;
        this.state.setSelectedFile(fileName);

        // Update active state
        fileTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });

    // Auto-select first file
    if (files.length > 0 && !this.state.selectedFile) {
      this.state.setSelectedFile(files[0].name);
      fileTabs[0].classList.add('active');
    }
  }

  /**
   * Render file preview
   */
  private renderFilePreview(fileName: string | null): void {
    if (!fileName) {
      this.jsonContent.innerHTML = '<div class="empty-state">Select a file to preview</div>';
      return;
    }

    const file = this.state.tokenFiles.get(fileName);
    if (!file) {
      this.jsonContent.innerHTML = '<div class="empty-state">File not found</div>';
      return;
    }

    // Simple JSON preview
    const jsonStr = JSON.stringify(file.content, null, 2);
    this.jsonContent.innerHTML = '<pre>' + jsonStr + '</pre>';
  }

  /**
   * Handle sync to Figma
   */
  private async handleSyncToFigma(): Promise<void> {
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
      this.setEnabled(this.syncBtn, false);
      await this.bridge.send('import-tokens', {
        primitives,
        semantics,
        source: this.state.tokenSource
      });
      this.setEnabled(this.syncBtn, true);
    } catch (error) {
      console.error('Error syncing to Figma:', error);
      this.showNotification('Failed to sync tokens', 'error');
      this.setEnabled(this.syncBtn, true);
    }
  }

  /**
   * Show this screen
   */
  show(): void {
    super.show();
    this.renderFileList();
    console.log('[TokenScreen] Screen shown');
  }
}

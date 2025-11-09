// ====================================================================================
// DOCUMENTATION SCREEN COMPONENT
// Generate visual documentation of design tokens in Figma
// ====================================================================================

import { BaseComponent } from './BaseComponent';
import { AppState } from '../state/AppState';
import { PluginBridge } from '../services/PluginBridge';
import { DocumentationOptions } from '../../shared/types';

/**
 * DocumentationScreen component
 *
 * Principles:
 * - Single Responsibility: Manages documentation generation UI
 * - Configuration-Driven: Uses extensible column config
 * - Observable Pattern: Subscribes to AppState changes
 *
 * Features:
 * - Select token files to document
 * - Choose font family for documentation
 * - Generate visual table in Figma
 */
export class DocumentationScreen extends BaseComponent {
  private bridge: PluginBridge;
  private fileSelectionList!: HTMLDivElement;
  private fontFamilyInput!: HTMLInputElement;
  private includeDescriptionsCheckbox!: HTMLInputElement;
  private generateBtn!: HTMLButtonElement;
  private selectedFiles: Set<string> = new Set();

  // Callback for layout to manage button states
  public onButtonUpdate: ((enabled: boolean) => void) | null = null;

  constructor(state: AppState, bridge: PluginBridge) {
    super(state);
    this.bridge = bridge;
  }

  protected createElement(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'documentation-screen';
    screen.className = 'screen-content documentation-screen';

    screen.innerHTML = `
      <div class="import-header">
        <h1 class="import-title">Generate Documentation</h1>
        <p class="import-subtitle">Create a visual table of your design tokens in Figma</p>
      </div>

      <div class="import-content active">
        <!-- File Selection -->
        <div class="input-group">
          <label>Select Token Files</label>
          <div class="file-selection-list" id="file-selection-list">
            <div class="empty-state">No token files loaded. Import tokens first.</div>
          </div>
        </div>

        <!-- Font Family -->
        <div class="input-group">
          <label for="doc-font-family">Font Family</label>
          <input
            type="text"
            id="doc-font-family"
            placeholder="Inter"
            value="Inter"
          />
        </div>

        <!-- Options -->
        <div class="input-group">
          <label class="checkbox-label">
            <input type="checkbox" id="doc-include-descriptions" checked />
            <span>Include descriptions column</span>
          </label>
        </div>

        <!-- Generate Button -->
        <button class="btn btn-primary btn-full" id="doc-generate-btn">
          Generate Documentation
        </button>
      </div>
    `;

    // Cache references
    this.fileSelectionList = screen.querySelector('#file-selection-list')!;
    this.fontFamilyInput = screen.querySelector('#doc-font-family')!;
    this.includeDescriptionsCheckbox = screen.querySelector('#doc-include-descriptions')!;
    this.generateBtn = screen.querySelector('#doc-generate-btn')!;

    return screen;
  }

  protected bindEvents(): void {
    // Listen to state changes
    this.subscribeToState('files-loaded', () => {
      this.renderFileSelection();
      this.updateGenerateButtonState();
    });

    // Generate button
    this.addEventListener(this.generateBtn, 'click', () => {
      this.handleGenerateDocumentation();
    });

    // Font input validation
    this.addEventListener(this.fontFamilyInput, 'input', () => {
      this.updateGenerateButtonState();
    });
  }

  /**
   * Render file selection list with checkboxes
   */
  private renderFileSelection(): void {
    const files = Array.from(this.state.tokenFiles.values());

    if (files.length === 0) {
      this.fileSelectionList.innerHTML = '<div class="empty-state">No token files loaded. Import tokens first.</div>';
      this.updateGenerateButtonState();
      return;
    }

    // Clear and create file checkboxes
    this.fileSelectionList.innerHTML = '';

    files.forEach(file => {
      const label = document.createElement('label');
      label.className = 'file-checkbox';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = file.name;
      checkbox.checked = true; // Select all by default
      this.selectedFiles.add(file.name);

      const span = document.createElement('span');
      span.textContent = file.name;

      this.addEventListener(checkbox, 'change', () => {
        if (checkbox.checked) {
          this.selectedFiles.add(file.name);
        } else {
          this.selectedFiles.delete(file.name);
        }
        this.updateGenerateButtonState();
      });

      label.appendChild(checkbox);
      label.appendChild(span);
      this.fileSelectionList.appendChild(label);
    });

    this.updateGenerateButtonState();
  }

  /**
   * Update generate button state based on form validity
   */
  private updateGenerateButtonState(): void {
    const hasFiles = this.selectedFiles.size > 0;
    const hasFont = this.fontFamilyInput.value.trim().length > 0;
    const isValid = hasFiles && hasFont;

    this.generateBtn.disabled = !isValid;

    if (this.onButtonUpdate) {
      this.onButtonUpdate(isValid);
    }
  }

  /**
   * Handle documentation generation
   */
  private async handleGenerateDocumentation(): Promise<void> {
    if (this.selectedFiles.size === 0) {
      this.showNotification('Please select at least one token file', 'error');
      return;
    }

    const fontFamily = this.fontFamilyInput.value.trim();
    if (!fontFamily) {
      this.showNotification('Please enter a font family', 'error');
      return;
    }

    const options: DocumentationOptions = {
      fileNames: Array.from(this.selectedFiles),
      fontFamily: fontFamily,
      includeDescriptions: this.includeDescriptionsCheckbox.checked,
    };

    try {
      // Disable button during generation
      this.generateBtn.disabled = true;
      this.generateBtn.textContent = 'Generating...';

      const result = await this.bridge.send('generate-documentation', options);

      this.showNotification(
        `✓ Documentation generated: ${result.tokenCount} tokens in ${result.categoryCount} categories`,
        'success'
      );

      // Re-enable button
      this.generateBtn.disabled = false;
      this.generateBtn.textContent = 'Generate Documentation';
    } catch (error) {
      console.error('Error generating documentation:', error);
      this.showNotification(
        error instanceof Error ? error.message : 'Failed to generate documentation',
        'error'
      );

      // Re-enable button
      this.generateBtn.disabled = false;
      this.generateBtn.textContent = 'Generate Documentation';
    }
  }

  /**
   * Show this screen
   */
  show(): void {
    super.show();
    this.renderFileSelection();
    this.updateGenerateButtonState();
  }
}

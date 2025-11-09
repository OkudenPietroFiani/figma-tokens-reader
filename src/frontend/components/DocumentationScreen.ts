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
      <!-- Documentation View -->
      <div class="screen-view active" id="documentation-view">
        <div class="documentation-layout">

          <!-- Configuration Section -->
          <div class="documentation-config">
            <h2 class="section-title">Generate Token Documentation</h2>
            <p class="section-description">
              Create a visual table of your design tokens directly in Figma with automatic categorization.
            </p>

            <!-- File Selection -->
            <div class="form-group">
              <label class="form-label">Select Token Files</label>
              <div class="file-selection-list" id="file-selection-list">
                <div class="empty-state">No token files loaded. Import tokens first.</div>
              </div>
            </div>

            <!-- Font Family -->
            <div class="form-group">
              <label class="form-label" for="doc-font-family">Font Family</label>
              <input
                type="text"
                id="doc-font-family"
                class="form-input"
                placeholder="Inter"
                value="Inter"
              />
              <span class="form-help">Font used for all text in the documentation table</span>
            </div>

            <!-- Options -->
            <div class="form-group">
              <label class="form-checkbox">
                <input type="checkbox" id="doc-include-descriptions" checked />
                <span>Include descriptions column</span>
              </label>
            </div>

            <!-- Generate Button -->
            <button class="btn btn-primary btn-large" id="doc-generate-btn">
              Generate Documentation
            </button>

            <!-- Info Box -->
            <div class="info-box">
              <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div class="info-content">
                <strong>Documentation Format:</strong> The documentation will be generated as a table with one row per token, organized by category (color, spacing, typography, etc.). Each column is configurable and extensible.
              </div>
            </div>
          </div>
        </div>
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

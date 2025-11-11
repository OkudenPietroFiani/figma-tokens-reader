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
  private fontFamilySelect!: HTMLSelectElement;
  private includeDescriptionsCheckbox!: HTMLInputElement;
  private generateBtn!: HTMLButtonElement;
  private selectedFiles: Set<string> = new Set();

  // Available fonts for documentation
  private readonly AVAILABLE_FONTS = ['Inter', 'DM Sans', 'Karla', 'Roboto', 'Space Grotesk'];

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
        <!-- Section: Files to Select -->
        <div class="doc-section">
          <h3 class="doc-section-title">Files to Select</h3>
          <div class="input-group">
            <label>Token Files</label>
            <div class="file-selection-list" id="file-selection-list">
              <div class="empty-state">No token files loaded. Import tokens first.</div>
            </div>
          </div>
        </div>

        <!-- Section: Parameters -->
        <div class="doc-section">
          <h3 class="doc-section-title">Parameters</h3>
          <div class="input-group">
            <label class="checkbox-label">
              <input type="checkbox" id="doc-include-descriptions" checked />
              <span>Include descriptions column</span>
            </label>
          </div>
        </div>

        <!-- Section: Customization -->
        <div class="doc-section">
          <h3 class="doc-section-title">Customization</h3>
          <div class="input-group">
            <label for="doc-font-family">Font Family</label>
            <select id="doc-font-family" class="select-input">
              <option value="Inter">Inter</option>
              <option value="DM Sans">DM Sans</option>
              <option value="Karla">Karla</option>
              <option value="Roboto">Roboto</option>
              <option value="Space Grotesk">Space Grotesk</option>
            </select>
          </div>
        </div>

        <!-- Generate Button -->
        <button class="btn btn-primary btn-full" id="doc-generate-btn">
          Generate Documentation
        </button>
      </div>
    `;

    // Cache references
    this.fileSelectionList = screen.querySelector('#file-selection-list')!;
    this.fontFamilySelect = screen.querySelector('#doc-font-family')!;
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

    // Font selection validation
    this.addEventListener(this.fontFamilySelect, 'change', () => {
      this.updateGenerateButtonState();
    });
  }

  /**
   * Render file selection list with checkboxes
   */
  private renderFileSelection(): void {
    const files = Array.from(this.state.tokenFiles.values());

    if (files.length === 0) {
      this.fileSelectionList.innerHTML = '<div class="empty-state">No token files loaded. Will use all Figma variable collections.</div>';
      // Clear selected files so it will use all collections
      this.selectedFiles.clear();
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
    const tokenFilesLoaded = this.state.tokenFiles.size > 0;
    // If no files loaded, we'll use all Figma collections (valid)
    // If files loaded, at least one must be selected
    const hasValidSelection = !tokenFilesLoaded || this.selectedFiles.size > 0;
    const hasFont = this.fontFamilySelect.value.trim().length > 0;
    const isValid = hasValidSelection && hasFont;

    this.generateBtn.disabled = !isValid;

    if (this.onButtonUpdate) {
      this.onButtonUpdate(isValid);
    }
  }

  /**
   * Handle documentation generation
   */
  private async handleGenerateDocumentation(): Promise<void> {
    const tokenFilesLoaded = this.state.tokenFiles.size > 0;

    // Only require file selection if files are loaded
    if (tokenFilesLoaded && this.selectedFiles.size === 0) {
      this.showNotification('Please select at least one token file', 'error');
      return;
    }

    const fontFamily = this.fontFamilySelect.value.trim();
    if (!fontFamily) {
      this.showNotification('Please select a font family', 'error');
      return;
    }

    // If no files loaded, pass empty array to use all Figma collections
    const fileNames = tokenFilesLoaded ? Array.from(this.selectedFiles) : [];

    const options: DocumentationOptions = {
      fileNames: fileNames,
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

// ====================================================================================
// SCOPE SCREEN COMPONENT
// Manage token scopes (simplified version)
// ====================================================================================

import { BaseComponent } from './BaseComponent';
import { AppState } from '../state/AppState';
import { PluginBridge } from '../services/PluginBridge';

/**
 * ScopeScreen component
 * Note: This is a simplified version. Full scope management can be added later.
 */
export class ScopeScreen extends BaseComponent {
  private bridge: PluginBridge;
  private syncBtn!: HTMLButtonElement;
  private pullChangesBtn!: HTMLButtonElement;
  private switchSourceBtn!: HTMLButtonElement;
  private collectionsList!: HTMLDivElement;
  private scopeContent!: HTMLDivElement;
  private scopeSelector!: HTMLDivElement;
  private selectedCountEl!: HTMLElement;
  private scopeTitle!: HTMLElement;
  private applyScopesBtn!: HTMLButtonElement;
  private resetSelectionBtn!: HTMLButtonElement;
  private variables: any[] = [];
  private selectedCollection: string | null = null;
  private selectedVariables: Set<string> = new Set();
  private lastSelectedIndex: number = -1;

  constructor(state: AppState, bridge: PluginBridge) {
    super(state);
    this.bridge = bridge;
  }

  protected createElement(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'screen scope-screen';
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

    // Cache references
    this.syncBtn = div.querySelector('#sync-to-figma-btn-scope')!;
    this.pullChangesBtn = div.querySelector('#pull-changes-btn-scope')!;
    this.switchSourceBtn = div.querySelector('#scope-switch-source-btn')!;
    this.collectionsList = div.querySelector('#collections-list')!;
    this.scopeContent = div.querySelector('#scope-content')!;
    this.scopeSelector = div.querySelector('#scope-selector')!;
    this.selectedCountEl = div.querySelector('#selected-count')!;
    this.scopeTitle = div.querySelector('#scope-title')!;
    this.applyScopesBtn = div.querySelector('#apply-scopes-btn')!;
    this.resetSelectionBtn = div.querySelector('#reset-selection-btn')!;

    return div;
  }

  protected bindEvents(): void {
    // Back to tokens button
    const backToTokensTab = this.element.querySelector('#back-to-tokens-tab');
    if (backToTokensTab) {
      this.addEventListener(backToTokensTab as HTMLElement, 'click', () => {
        this.state.setCurrentScreen('token');
      });
    }

    // Switch source button
    this.addEventListener(this.switchSourceBtn, 'click', () => {
      this.state.setCurrentScreen('welcome');
    });

    // Sync button
    this.addEventListener(this.syncBtn, 'click', () => {
      this.handleSyncScopes();
    });

    // Pull changes button
    this.addEventListener(this.pullChangesBtn, 'click', () => {
      this.handlePullChanges();
    });

    // Apply scopes button
    this.addEventListener(this.applyScopesBtn, 'click', () => {
      this.handleApplyScopes();
    });

    // Reset selection button
    this.addEventListener(this.resetSelectionBtn, 'click', () => {
      this.handleResetSelection();
    });
  }

  /**
   * Show this screen
   */
  show(): void {
    super.show();
    this.loadVariables();
  }

  /**
   * Load Figma variables
   */
  private async loadVariables(): Promise<void> {
    try {
      this.scopeContent.innerHTML = '<div class="empty-state">Loading variables...</div>';

      console.log('[ScopeScreen] Requesting Figma variables...');
      const response = await this.bridge.send('get-figma-variables', {});
      console.log('[ScopeScreen] Raw response:', response);

      // Backend returns an object { [name: string]: FigmaVariableData }, convert to array
      const variablesObj = response.variables || {};
      console.log('[ScopeScreen] Variables object:', variablesObj);
      console.log('[ScopeScreen] Variables object keys:', Object.keys(variablesObj));

      this.variables = Object.values(variablesObj);
      console.log('[ScopeScreen] Loaded variables array:', this.variables);
      console.log('[ScopeScreen] Variables count:', this.variables.length);

      if (this.variables.length === 0) {
        console.warn('[ScopeScreen] No variables found in response');
      }

      this.renderVariables();
      this.renderCollections();
    } catch (error) {
      console.error('[ScopeScreen] Error loading variables:', error);
      this.scopeContent.innerHTML = `<div class="empty-state">Failed to load variables: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
    }
  }

  /**
   * Render collections list
   */
  private renderCollections(): void {
    // Get unique collection names from the variables themselves
    const collections = new Set<string>();
    this.variables.forEach(v => {
      if (v.collection) {
        collections.add(v.collection);
      }
    });

    const collectionNames = Array.from(collections);
    console.log('[ScopeScreen] Found Figma collections:', collectionNames);

    if (collectionNames.length === 0) {
      this.collectionsList.innerHTML = '<div style="color: #999; font-size: 12px;">No collections found</div>';
      return;
    }

    // Select first collection by default
    if (!this.selectedCollection && collectionNames.length > 0) {
      this.selectedCollection = collectionNames[0];
    }

    // Clear and create collection buttons securely
    this.collectionsList.innerHTML = '';

    collectionNames.forEach(collectionName => {
      const button = document.createElement('button');
      button.className = `file-tab ${collectionName === this.selectedCollection ? 'active' : ''}`;
      button.setAttribute('data-collection', collectionName);
      button.textContent = collectionName; // Safe: uses textContent

      this.addEventListener(button, 'click', () => {
        const name = button.getAttribute('data-collection')!;
        console.log('[ScopeScreen] Switching to collection:', name);
        this.selectedCollection = name;
        this.renderCollections(); // Re-render to update active state
        this.filterVariablesByCollection();
      });

      this.collectionsList.appendChild(button);
    });
  }

  /**
   * Filter variables by selected collection
   */
  private filterVariablesByCollection(): void {
    console.log('[ScopeScreen] Filtering by collection:', this.selectedCollection);
    console.log('[ScopeScreen] Total variables before filter:', this.variables.length);

    if (!this.selectedCollection) {
      this.renderVariables();
      return;
    }

    // Filter variables that belong to the selected collection
    const filteredVars = this.variables.filter(v => {
      const matches = v.collection === this.selectedCollection;
      if (!matches) {
        console.log(`[ScopeScreen] Variable ${v.name} collection "${v.collection}" doesn't match "${this.selectedCollection}"`);
      }
      return matches;
    });

    console.log('[ScopeScreen] Filtered variables count:', filteredVars.length);
    console.log('[ScopeScreen] Filtered variables:', filteredVars.map(v => v.name));

    // Build tree with filtered variables
    const tree = this.buildVariableTree(filteredVars);
    const html = '<div class="scope-tree">' + this.renderVariableTree(tree, 0) + '</div>';

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
  private renderVariables(): void {
    if (this.variables.length === 0) {
      this.scopeContent.innerHTML = '<div class="empty-state">No variables found. Please import tokens first.</div>';
      return;
    }

    // Build tree structure from variable names
    const tree = this.buildVariableTree(this.variables);

    // Render tree
    const html = '<div class="scope-tree">' + this.renderVariableTree(tree, 0) + '</div>';
    this.scopeContent.innerHTML = html;

    this.attachVariableEventHandlers();
  }

  /**
   * Attach event handlers to rendered variables
   */
  private attachVariableEventHandlers(): void {
    // Add click handlers for expand/collapse
    const toggleBtns = this.scopeContent.querySelectorAll('.tree-toggle');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const parent = target.closest('.tree-group');
        parent?.classList.toggle('collapsed');
      });
    });

    // Add group checkbox handlers
    const groupCheckboxes = this.scopeContent.querySelectorAll('.group-checkbox');
    groupCheckboxes.forEach(groupCb => {
      this.addEventListener(groupCb as HTMLElement, 'change', (e) => {
        const cb = groupCb as HTMLInputElement;
        const groupId = cb.getAttribute('data-group-id')!;
        const checked = cb.checked;

        // Find all child variable checkboxes in this group
        const groupContainer = this.scopeContent.querySelector(`.tree-children[data-group-id="${groupId}"]`);
        if (groupContainer) {
          const childCheckboxes = groupContainer.querySelectorAll<HTMLInputElement>('.scope-checkbox');
          childCheckboxes.forEach(childCb => {
            childCb.checked = checked;
            const varId = childCb.getAttribute('data-var-id')!;
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

    // Add variable checkbox handlers
    const checkboxes = this.scopeContent.querySelectorAll('.scope-checkbox');
    checkboxes.forEach((checkbox, index) => {
      this.addEventListener(checkbox as HTMLElement, 'click', (e) => {
        const event = e as MouseEvent;
        const cb = checkbox as HTMLInputElement;
        const varId = cb.getAttribute('data-var-id')!;

        if (event.shiftKey && this.lastSelectedIndex >= 0) {
          // Multi-select with shift
          const start = Math.min(this.lastSelectedIndex, index);
          const end = Math.max(this.lastSelectedIndex, index);
          const checked = cb.checked;

          for (let i = start; i <= end; i++) {
            const currentCb = checkboxes[i] as HTMLInputElement;
            currentCb.checked = checked;
            const currentVarId = currentCb.getAttribute('data-var-id')!;
            if (checked) {
              this.selectedVariables.add(currentVarId);
            } else {
              this.selectedVariables.delete(currentVarId);
            }
          }
        } else {
          // Single select
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
  private updateScopeSelector(): void {
    const count = this.selectedVariables.size;
    this.selectedCountEl.textContent = `${count} tokens selected`;

    if (count > 0) {
      // Determine scope type from selected variables
      const scopeType = this.determineScopeType();
      this.scopeTitle.textContent = scopeType;

      // Update scope options based on variable types
      this.renderScopeOptions();

      // Show scope selector, hide collections
      this.scopeSelector.classList.remove('hidden');
      this.collectionsList.parentElement!.querySelector('.file-tabs-header')!.classList.add('hidden');
      this.collectionsList.classList.add('hidden');
    } else {
      // Hide scope selector, show collections
      this.scopeSelector.classList.add('hidden');
      this.collectionsList.parentElement!.querySelector('.file-tabs-header')!.classList.remove('hidden');
      this.collectionsList.classList.remove('hidden');
    }
  }

  /**
   * Determine scope type from selected variables
   */
  private determineScopeType(): string {
    // Get types of selected variables
    const types = new Set<string>();
    this.selectedVariables.forEach(varId => {
      const variable = this.variables.find(v => v.id === varId);
      if (variable) {
        types.add(variable.type);
      }
    });

    // Return appropriate scope type label
    if (types.size === 1) {
      const type = Array.from(types)[0];
      switch (type) {
        case 'COLOR':
          return 'Color scopes';
        case 'FLOAT':
          return 'Number scopes';
        case 'STRING':
          return 'String scopes';
        case 'BOOLEAN':
          return 'Boolean scopes';
        default:
          return 'Scopes';
      }
    } else {
      return 'Multiple scopes';
    }
  }

  /**
   * Render scope options based on selected variable types
   */
  private renderScopeOptions(): void {
    // Get types of selected variables
    const types = new Set<string>();
    this.selectedVariables.forEach(varId => {
      const variable = this.variables.find(v => v.id === varId);
      if (variable) {
        types.add(variable.type);
      }
    });

    const scopeOptionsContainer = this.scopeSelector.querySelector('#scope-options');
    if (!scopeOptionsContainer) return;

    // Define scope options for each type
    const scopesByType: { [key: string]: Array<{ label: string, value: string }> } = {
      'COLOR': [
        { label: 'All fills', value: 'ALL_FILLS' },
        { label: 'Frame fill', value: 'FRAME_FILL' },
        { label: 'Shape fill', value: 'SHAPE_FILL' },
        { label: 'Text fill', value: 'TEXT_FILL' },
        { label: 'All strokes', value: 'ALL_STROKES' },
        { label: 'Frame stroke', value: 'FRAME_STROKE' },
        { label: 'Shape stroke', value: 'SHAPE_STROKE' },
        { label: 'Text stroke', value: 'TEXT_STROKE' },
        { label: 'Effect color', value: 'EFFECT_COLOR' }
      ],
      'FLOAT': [
        { label: 'Corner radius', value: 'CORNER_RADIUS' },
        { label: 'Width & height', value: 'WIDTH_HEIGHT' },
        { label: 'Gap', value: 'GAP' },
        { label: 'Opacity', value: 'OPACITY' },
        { label: 'Font size', value: 'FONT_SIZE' },
        { label: 'Line height', value: 'LINE_HEIGHT' },
        { label: 'Letter spacing', value: 'LETTER_SPACING' },
        { label: 'Paragraph spacing', value: 'PARAGRAPH_SPACING' },
        { label: 'Paragraph indent', value: 'PARAGRAPH_INDENT' }
      ],
      'STRING': [
        { label: 'Text content', value: 'TEXT_CONTENT' },
        { label: 'Font family', value: 'FONT_FAMILY' },
        { label: 'Font style', value: 'FONT_STYLE' },
        { label: 'Font weight', value: 'FONT_WEIGHT' }
      ],
      'BOOLEAN': []
    };

    // If mixed types, show message
    if (types.size > 1) {
      scopeOptionsContainer.innerHTML = '<div class="empty-state">Select variables of the same type to assign scopes</div>';
      return;
    }

    // Get the single type
    const type = Array.from(types)[0];
    const scopes = scopesByType[type] || [];

    if (scopes.length === 0) {
      scopeOptionsContainer.innerHTML = '<div class="empty-state">No scopes available for this type</div>';
      return;
    }

    // Render scope checkboxes
    scopeOptionsContainer.innerHTML = scopes.map(scope => `
      <label class="scope-option">
        <span>${scope.label}</span>
        <input type="checkbox" value="${scope.value}" data-scope="${scope.value}">
      </label>
    `).join('');
  }

  /**
   * Build tree structure from variable names
   */
  private buildVariableTree(variables: any[]): any {
    const tree: any = {};

    variables.forEach(variable => {
      const parts = variable.name.split('/');
      let current = tree;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // Leaf node (actual variable)
          current[part] = {
            _isVariable: true,
            _data: variable
          };
        } else {
          // Group node
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
  private getGroupVariableTypes(tree: any): Set<string> {
    const types = new Set<string>();

    for (const value of Object.values(tree)) {
      if (value._isVariable) {
        types.add(value._data.type);
      } else {
        // Recursively get types from nested groups
        const childTypes = this.getGroupVariableTypes(value);
        childTypes.forEach(type => types.add(type));
      }
    }

    return types;
  }

  /**
   * Render variable tree recursively
   */
  private renderVariableTree(tree: any, level: number): string {
    let html = '';

    for (const [key, value] of Object.entries(tree)) {
      if (value._isVariable) {
        // Render variable item
        const v = value._data;
        const typeText = this.formatTypeText(v.type);
        const escapedKey = this.escapeHtml(key);
        const escapedId = this.escapeHtml(v.id);

        html += `
          <div class="scope-item" style="padding-left: ${level * 12}px;">
            <div class="scope-item-content">
              <input type="checkbox" class="scope-checkbox" data-var-id="${escapedId}">
              <span class="scope-var-name">${escapedKey}</span>
              <span class="scope-type">${typeText}</span>
            </div>
          </div>
        `;
      } else {
        // Check if all children have the same type
        const groupTypes = this.getGroupVariableTypes(value);
        const hasCompatibleTypes = groupTypes.size === 1;

        // Render group with checkbox only if all children are compatible
        const escapedKey = this.escapeHtml(key);
        const groupId = `group-${level}-${escapedKey}`;

        html += `
          <div class="tree-group" style="padding-left: ${level * 12}px;">
            <div class="tree-header">
              ${hasCompatibleTypes
                ? `<input type="checkbox" class="group-checkbox" data-group-id="${groupId}">`
                : `<span class="group-checkbox-spacer"></span>`
              }
              <span class="tree-toggle"></span>
              <span class="tree-label">${escapedKey}</span>
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
   * Escape HTML special characters to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format scope text from Figma scopes array
   */
  private formatScopeText(scopes: string[]): string {
    if (!scopes || scopes.length === 0) {
      return 'No scopes';
    }

    // Map Figma scope names to display names
    const scopeMap: { [key: string]: string } = {
      'ALL_SCOPES': 'All scopes',
      'ALL_FILLS': 'All fills',
      'FRAME_FILL': 'Frame fill',
      'SHAPE_FILL': 'Shape fill',
      'TEXT_FILL': 'Text fill',
      'ALL_STROKES': 'All strokes',
      'FRAME_STROKE': 'Frame stroke',
      'SHAPE_STROKE': 'Shape stroke',
      'TEXT_STROKE': 'Text stroke',
      'EFFECT_COLOR': 'Effect color',
      'TEXT_CONTENT': 'Text content',
      'CORNER_RADIUS': 'Corner radius',
      'WIDTH_HEIGHT': 'Width & height',
      'GAP': 'Gap',
      'OPACITY': 'Opacity',
      'FONT_FAMILY': 'Font family',
      'FONT_STYLE': 'Font style',
      'FONT_WEIGHT': 'Font weight',
      'FONT_SIZE': 'Font size',
      'LINE_HEIGHT': 'Line height',
      'LETTER_SPACING': 'Letter spacing',
      'PARAGRAPH_SPACING': 'Paragraph spacing',
      'PARAGRAPH_INDENT': 'Paragraph indent'
    };

    const displayScopes = scopes.map(s => scopeMap[s] || s);

    if (displayScopes.length === 1) {
      return displayScopes[0];
    } else if (displayScopes.length <= 3) {
      return displayScopes.join(', ');
    } else {
      return `${displayScopes.length} scopes`;
    }
  }

  /**
   * Format variable type to display text
   */
  private formatTypeText(type: string): string {
    const typeMap: { [key: string]: string } = {
      'COLOR': 'Color',
      'FLOAT': 'Number',
      'STRING': 'String',
      'BOOLEAN': 'Boolean'
    };

    return typeMap[type] || type;
  }

  /**
   * Handle apply scopes button click
   */
  private async handleApplyScopes(): Promise<void> {
    if (this.selectedVariables.size === 0) {
      this.showNotification('No variables selected', 'error');
      return;
    }

    try {
      this.setEnabled(this.applyScopesBtn, false);

      // Get selected scopes from the scope selector
      const scopeCheckboxes = this.scopeSelector.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked');
      const selectedScopes = Array.from(scopeCheckboxes).map(cb => cb.value);

      if (selectedScopes.length === 0) {
        this.showNotification('Please select at least one scope to apply', 'error');
        this.setEnabled(this.applyScopesBtn, true);
        return;
      }

      // Build scope assignments for selected variables
      const scopeAssignments: { [varName: string]: any[] } = {};

      this.selectedVariables.forEach(varId => {
        const variable = this.variables.find(v => v.id === varId);
        if (variable) {
          scopeAssignments[variable.name] = selectedScopes;
        }
      });

      console.log('[ScopeScreen] Applying scopes:', scopeAssignments);

      const response = await this.bridge.send('apply-variable-scopes', { variableScopes: scopeAssignments });
      this.showNotification(response.message || 'Scopes applied successfully', 'success');

      // Clear selection and reload
      this.selectedVariables.clear();
      this.updateScopeSelector();
      await this.loadVariables();

      this.setEnabled(this.applyScopesBtn, true);
    } catch (error) {
      console.error('Error applying scopes:', error);
      this.showNotification('Failed to apply scopes', 'error');
      this.setEnabled(this.applyScopesBtn, true);
    }
  }

  /**
   * Handle reset selection button click
   */
  private handleResetSelection(): void {
    // Clear all checkboxes
    const checkboxes = this.scopeContent.querySelectorAll<HTMLInputElement>('.scope-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = false;
    });

    // Clear selection
    this.selectedVariables.clear();
    this.lastSelectedIndex = -1;
    this.updateScopeSelector();
  }

  /**
   * Handle sync scopes (legacy - keeping for backward compatibility)
   */
  private async handleSyncScopes(): Promise<void> {
    // Redirect to apply scopes
    await this.handleApplyScopes();
  }

  /**
   * Handle pull changes
   */
  private async handlePullChanges(): Promise<void> {
    this.showNotification('Pull changes from scope screen', 'info');
  }
}

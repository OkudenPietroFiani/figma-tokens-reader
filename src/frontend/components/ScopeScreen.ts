// Simplified ScopeScreen - to be enriched in Phase 5
import { BaseComponent } from './BaseComponent';
import { AppState } from '../state/AppState';

export class ScopeScreen extends BaseComponent {
  protected createElement(): HTMLElement {
    const div = document.createElement('div');
    div.innerHTML = `<p>Scope screen - to be implemented</p>`;
    return div;
  }

  protected bindEvents(): void {
    // To be implemented
  }
}

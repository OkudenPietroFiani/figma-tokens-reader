// Simplified TokenScreen - to be enriched in Phase 5
import { BaseComponent } from './BaseComponent';
import { AppState } from '../state/AppState';

export class TokenScreen extends BaseComponent {
  protected createElement(): HTMLElement {
    const div = document.createElement('div');
    div.id = 'token-screen';
    div.className = 'screen token-screen';
    div.innerHTML = `<p>Token screen - to be implemented</p>`;
    return div;
  }

  protected bindEvents(): void {
    // To be implemented
  }
}

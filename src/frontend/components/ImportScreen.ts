// Simplified ImportScreen - to be enriched in Phase 5
import { BaseComponent } from './BaseComponent';
import { AppState } from '../state/AppState';

export class ImportScreen extends BaseComponent {
  protected createElement(): HTMLElement {
    const div = document.createElement('div');
    div.id = 'import-screen';
    div.className = 'screen import-screen';
    div.innerHTML = `
      <div class="import-header">
        <a class="back-link" id="back-to-welcome">← Back to Welcome</a>
        <h1 class="import-title" id="import-title">Import Tokens</h1>
      </div>
      <p>Import screen - to be implemented</p>
    `;
    return div;
  }

  protected bindEvents(): void {
    const backBtn = this.querySelector<HTMLElement>('#back-to-welcome');
    if (backBtn) {
      this.addEventListener(backBtn, 'click', () => {
        this.state.setCurrentScreen('welcome');
      });
    }
  }
}

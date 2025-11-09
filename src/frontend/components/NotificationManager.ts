// ====================================================================================
// NOTIFICATION MANAGER
// Manages toast-style notifications with Observable pattern
// ====================================================================================

import { AppState } from '../state/AppState';
import { NotificationType } from '../../shared/types';

/**
 * NotificationManager component
 *
 * Principles:
 * - Single Responsibility: Only handles notification display
 * - Event-driven: Listens to window notification events
 * - Clean separation: UI creation separated from logic
 * - Self-contained: Manages its own lifecycle
 *
 * Usage:
 * const manager = new NotificationManager(state);
 * manager.init();
 * manager.mount(document.body);
 */
export class NotificationManager {
  private container: HTMLElement;
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    this.container = this.createContainer();
    this.setupStyles();
  }

  /**
   * Initialize the notification manager
   */
  init(): void {
    // Listen for notification events from any component
    window.addEventListener('notification', this.handleNotificationEvent.bind(this));
  }

  /**
   * Mount the notification container to the DOM
   */
  mount(parent: HTMLElement): void {
    parent.appendChild(this.container);
  }

  /**
   * Unmount and cleanup
   */
  unmount(): void {
    window.removeEventListener('notification', this.handleNotificationEvent.bind(this));

    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
  }

  /**
   * Create the notification container element
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';
    return container;
  }

  /**
   * Setup CSS styles for notifications
   * Clean code: Styles defined in one place, reusable
   */
  private setupStyles(): void {
    // Check if styles already exist
    if (document.getElementById('notification-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification-container {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      }

      .notification {
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        max-width: 300px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        pointer-events: auto;
        cursor: pointer;
        animation: slideIn 0.2s ease-out;
        color: white;
      }

      .notification-success {
        background-color: #0ACF83;
      }

      .notification-error {
        background-color: #F24822;
      }

      .notification-info {
        background-color: #0066FF;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
    `;

    document.head.appendChild(style);
    this.styleElement = style;
  }

  /**
   * Handle notification events
   */
  private handleNotificationEvent(event: Event): void {
    const customEvent = event as CustomEvent;
    const { message, type } = customEvent.detail;
    this.show(message, type || 'info');
  }

  /**
   * Display a notification
   * Clean code: Single purpose, clear flow
   */
  show(message: string, type: NotificationType = 'info'): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to container
    this.container.appendChild(notification);

    // Setup auto-dismiss
    const dismiss = () => this.dismiss(notification);

    // Click to dismiss
    notification.addEventListener('click', dismiss);

    // Auto-dismiss after 4 seconds
    setTimeout(dismiss, 4000);
  }

  /**
   * Dismiss a notification with animation
   */
  private dismiss(notification: HTMLElement): void {
    notification.style.animation = 'slideOut 0.2s ease-in';

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 200);
  }
}

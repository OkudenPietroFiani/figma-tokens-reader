// ====================================================================================
// BASE COMPONENT
// Abstract base class for all UI components
// ====================================================================================

import { AppState } from '../state/AppState';
import { CSS_CLASSES } from '../../shared/constants';

/**
 * Abstract base class for all UI components
 *
 * Principles:
 * - Single Responsibility: Each component manages its own DOM and events
 * - Observable Pattern: Components subscribe to AppState changes
 * - Lifecycle Management: Mount/unmount with cleanup
 * - Clean Code: Clear separation of concerns
 *
 * Usage:
 * class MyComponent extends BaseComponent {
 *   createElement() { return document.createElement('div'); }
 *   bindEvents() { // Add event listeners }
 * }
 */
export abstract class BaseComponent {
  protected element: HTMLElement;
  protected state: AppState;
  protected eventCleanupFunctions: (() => void)[] = [];

  constructor(state: AppState) {
    this.state = state;
    this.element = this.createElement();
    this.bindEvents();
  }

  /**
   * Create the component's root element
   * Must be implemented by subclasses
   */
  protected abstract createElement(): HTMLElement;

  /**
   * Bind event listeners to DOM elements
   * Must be implemented by subclasses
   */
  protected abstract bindEvents(): void;

  /**
   * Mount the component to a parent element
   */
  mount(parent: HTMLElement): void {
    parent.appendChild(this.element);
  }

  /**
   * Unmount the component from the DOM
   * Cleans up all event listeners to prevent memory leaks
   */
  unmount(): void {
    // Clean up all event listeners
    this.eventCleanupFunctions.forEach(cleanup => cleanup());
    this.eventCleanupFunctions = [];

    // Remove from DOM
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  /**
   * Show the component (make visible)
   */
  show(): void {
    this.element.classList.add(CSS_CLASSES.ACTIVE);
    this.element.classList.remove(CSS_CLASSES.HIDDEN);
  }

  /**
   * Hide the component (make invisible)
   */
  hide(): void {
    this.element.classList.remove(CSS_CLASSES.ACTIVE);
    this.element.classList.add(CSS_CLASSES.HIDDEN);
  }

  /**
   * Get the component's root element
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Helper: Add event listener with automatic cleanup tracking
   * Prevents memory leaks by storing cleanup functions
   */
  protected addEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    element.addEventListener(type, listener, options);

    // Store cleanup function
    this.eventCleanupFunctions.push(() => {
      element.removeEventListener(type, listener, options);
    });
  }

  /**
   * Helper: Subscribe to AppState changes with automatic cleanup
   */
  protected subscribeToState(event: string, callback: (data?: any) => void): void {
    this.state.subscribe(event, callback);

    // Store cleanup function
    this.eventCleanupFunctions.push(() => {
      this.state.unsubscribe(event, callback);
    });
  }

  /**
   * Helper: Query selector with type safety
   */
  protected querySelector<T extends HTMLElement>(selector: string): T | null {
    return this.element.querySelector<T>(selector);
  }

  /**
   * Helper: Query all with type safety
   */
  protected querySelectorAll<T extends HTMLElement>(selector: string): NodeListOf<T> {
    return this.element.querySelectorAll<T>(selector);
  }

  /**
   * Helper: Get element by ID from component's subtree
   */
  protected getElementById<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }

  /**
   * Helper: Enable/disable an element
   */
  protected setEnabled(element: HTMLElement, enabled: boolean): void {
    if (enabled) {
      element.classList.remove(CSS_CLASSES.DISABLED);
      if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
        element.disabled = false;
      }
    } else {
      element.classList.add(CSS_CLASSES.DISABLED);
      if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
        element.disabled = true;
      }
    }
  }

  /**
   * Helper: Show/hide loading state
   */
  protected setLoading(element: HTMLElement, loading: boolean): void {
    if (loading) {
      element.classList.add(CSS_CLASSES.LOADING);
    } else {
      element.classList.remove(CSS_CLASSES.LOADING);
    }
  }

  /**
   * Helper: Show notification (delegates to global notification system)
   */
  protected showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // This will be implemented by the notification system
    // For now, just dispatch a custom event
    const event = new CustomEvent('notification', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  }
}

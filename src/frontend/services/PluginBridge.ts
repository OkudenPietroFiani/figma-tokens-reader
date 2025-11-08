// ====================================================================================
// PLUGIN BRIDGE
// Communication layer between frontend and backend
// ====================================================================================

import { PluginMessageType, UIMessageType } from '../../shared/types';

/**
 * Bridge for communicating with the plugin backend
 *
 * Principles:
 * - Type Safety: Strongly typed messages
 * - Promise-based: Async communication with promises
 * - Event Handling: Subscribe to backend messages
 * - Error Handling: Catch communication errors
 *
 * Usage:
 * const bridge = new PluginBridge();
 * bridge.on('import-success', (data) => {
 *   console.log('Import success:', data);
 * });
 * await bridge.send('import-tokens', { primitives, semantics });
 */
export class PluginBridge {
  private messageHandlers: Map<UIMessageType, Set<Function>> = new Map();
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();

  constructor() {
    // Listen for messages from plugin backend
    window.addEventListener('message', this.handleBackendMessage.bind(this));
    console.log('[PluginBridge] Initialized');
  }

  /**
   * Send message to plugin backend
   * Returns a promise that resolves when backend responds
   *
   * @param type - Message type
   * @param data - Message data (optional)
   * @returns Promise that resolves with response data
   */
  send(type: PluginMessageType, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // Generate unique request ID
        const requestId = `${type}_${Date.now()}_${Math.random()}`;

        // Store promise handlers
        this.pendingRequests.set(requestId, { resolve, reject });

        // Send message to backend
        parent.postMessage(
          {
            pluginMessage: {
              type,
              data,
              requestId
            }
          },
          '*'
        );

        console.log(`[PluginBridge] Sent message: ${type}`, data);

        // Set timeout for request (30 seconds)
        setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            reject(new Error(`Request timeout: ${type}`));
          }
        }, 30000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send message to backend without waiting for response
   * Fire-and-forget style
   *
   * @param type - Message type
   * @param data - Message data (optional)
   */
  sendAsync(type: PluginMessageType, data?: any): void {
    try {
      parent.postMessage(
        {
          pluginMessage: {
            type,
            data
          }
        },
        '*'
      );

      console.log(`[PluginBridge] Sent async message: ${type}`, data);
    } catch (error) {
      console.error(`[PluginBridge] Error sending async message:`, error);
    }
  }

  /**
   * Subscribe to backend messages
   * Returns unsubscribe function
   *
   * @param type - Message type to listen for
   * @param handler - Handler function
   */
  on(type: UIMessageType, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler);
    console.log(`[PluginBridge] Subscribed to: ${type}`);

    // Return unsubscribe function
    return () => {
      this.off(type, handler);
    };
  }

  /**
   * Unsubscribe from backend messages
   *
   * @param type - Message type
   * @param handler - Handler function to remove
   */
  off(type: UIMessageType, handler?: Function): void {
    if (!handler) {
      // Remove all handlers for this type
      this.messageHandlers.delete(type);
      console.log(`[PluginBridge] Unsubscribed from all: ${type}`);
    } else {
      // Remove specific handler
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        console.log(`[PluginBridge] Unsubscribed from: ${type}`);
      }
    }
  }

  /**
   * Handle messages from backend
   * Routes to appropriate handlers
   */
  private handleBackendMessage(event: MessageEvent): void {
    const message = event.data.pluginMessage;
    if (!message) return;

    const { type, data, message: messageText, requestId } = message;

    console.log(`[PluginBridge] Received message: ${type}`, data || messageText);

    // If this is a response to a pending request, resolve it
    if (requestId && this.pendingRequests.has(requestId)) {
      const { resolve, reject } = this.pendingRequests.get(requestId)!;
      this.pendingRequests.delete(requestId);

      if (type === 'error') {
        reject(new Error(messageText || 'Unknown error'));
      } else {
        resolve(data || messageText);
      }
      return;
    }

    // Otherwise, emit to event handlers
    const handlers = this.messageHandlers.get(type as UIMessageType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data || messageText);
        } catch (error) {
          console.error(`[PluginBridge] Error in message handler for ${type}:`, error);
        }
      });
    }
  }

  /**
   * Clear all message handlers
   * Useful for cleanup
   */
  clearAllHandlers(): void {
    this.messageHandlers.clear();
    console.log('[PluginBridge] All handlers cleared');
  }

  /**
   * Get list of active subscriptions
   * Useful for debugging
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.messageHandlers.keys());
  }
}

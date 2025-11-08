// ====================================================================================
// ERROR HANDLER
// Centralized error handling and user notification
// ====================================================================================

import { Result, Success, Failure } from '../../shared/types';
import { ERROR_MESSAGES } from '../../shared/constants';

/**
 * Centralized error handler for the backend
 *
 * Principles:
 * - DRY: Single place for error handling logic
 * - Fail Fast: Convert exceptions to Result types
 * - User-Friendly: Send clear messages to UI
 * - Logging: Console logging for debugging
 *
 * Usage:
 * const result = await ErrorHandler.handle(
 *   async () => await someOperation(),
 *   'operation context'
 * );
 *
 * if (!result.success) {
 *   return result; // Propagate error
 * }
 */
export class ErrorHandler {
  /**
   * Wrap an async operation with error handling
   * Catches exceptions and converts to Result type
   *
   * @param operation - Async function to execute
   * @param context - Context description for logging
   * @returns Result<T> with success/failure
   */
  static async handle<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<Result<T>> {
    try {
      console.log(`[${context}] Starting operation...`);
      const data = await operation();
      console.log(`[${context}]  Operation completed successfully`);
      return Success(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${context}]  Error:`, errorMessage);
      console.error(`[${context}] Stack trace:`, error instanceof Error ? error.stack : 'N/A');

      return Failure(errorMessage);
    }
  }

  /**
   * Wrap a synchronous operation with error handling
   */
  static handleSync<T>(
    operation: () => T,
    context: string
  ): Result<T> {
    try {
      console.log(`[${context}] Starting operation...`);
      const data = operation();
      console.log(`[${context}]  Operation completed successfully`);
      return Success(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${context}]  Error:`, errorMessage);
      return Failure(errorMessage);
    }
  }

  /**
   * Send error notification to UI
   * Does not throw - just notifies user
   */
  static notifyUser(message: string, type: 'error' | 'success' | 'info' = 'error'): void {
    try {
      if (type === 'error') {
        console.error('[User Notification]', message);
        // Use Figma's native notification for errors
        figma.notify(`L ${message}`, { error: true });
      } else if (type === 'success') {
        console.log('[User Notification]', message);
        figma.notify(message, { timeout: 3000 });
      } else {
        console.info('[User Notification]', message);
        figma.notify(message, { timeout: 3000 });
      }

      // Also send to UI for display in notification component
      figma.ui.postMessage({
        type: type === 'error' ? 'error' : 'info',
        message: message
      });
    } catch (err) {
      // Fallback if notification fails
      console.error('[ErrorHandler] Failed to send notification:', err);
    }
  }

  /**
   * Get user-friendly error message from error code
   */
  static getErrorMessage(errorCode: keyof typeof ERROR_MESSAGES): string {
    return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  /**
   * Validate required fields
   * Throws error if validation fails (fail-fast principle)
   */
  static validateRequired(
    data: any,
    requiredFields: string[],
    context: string
  ): void {
    const missingFields = requiredFields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      const error = `Missing required fields: ${missingFields.join(', ')}`;
      console.error(`[${context}] Validation failed:`, error);
      throw new Error(error);
    }
  }

  /**
   * Assert condition is true
   * Throws error if condition is false (fail-fast principle)
   */
  static assert(condition: boolean, message: string, context: string): void {
    if (!condition) {
      console.error(`[${context}] Assertion failed:`, message);
      throw new Error(message);
    }
  }

  /**
   * Log warning without throwing
   */
  static warn(message: string, context: string): void {
    console.warn(`[${context}] Warning:`, message);
  }

  /**
   * Log info message
   */
  static info(message: string, context: string): void {
    console.log(`[${context}]`, message);
  }

  /**
   * Format error for display
   * Extracts meaningful message from various error types
   */
  static formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object' && error !== null) {
      // Try to extract message from object
      const errorObj = error as any;
      if (errorObj.message) return String(errorObj.message);
      if (errorObj.error) return String(errorObj.error);

      // Fallback to JSON stringify
      try {
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    }

    return ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  /**
   * Create a Result from a thrown error
   * Useful in catch blocks
   */
  static fromError<T>(error: unknown, context?: string): Result<T> {
    const message = this.formatError(error);
    if (context) {
      console.error(`[${context}] Error:`, message);
    }
    return Failure(message);
  }

  /**
   * Retry an operation with exponential backoff
   * Useful for network operations
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    context: string = 'Retry Operation'
  ): Promise<Result<T>> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[${context}] Attempt ${attempt}/${maxRetries}...`);
        const result = await operation();
        console.log(`[${context}]  Success on attempt ${attempt}`);
        return Success(result);
      } catch (error) {
        lastError = error;
        const message = this.formatError(error);
        console.warn(`[${context}] Attempt ${attempt}/${maxRetries} failed:`, message);

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`[${context}] Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    const errorMessage = this.formatError(lastError);
    console.error(`[${context}] All ${maxRetries} attempts failed. Last error:`, errorMessage);
    return Failure(`Operation failed after ${maxRetries} attempts: ${errorMessage}`);
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

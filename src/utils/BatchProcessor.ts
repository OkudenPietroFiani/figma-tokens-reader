// ====================================================================================
// BATCH PROCESSOR
// Generic utility for parallel processing with batching and rate limiting
// ====================================================================================

/**
 * Batch processing configuration
 */
export interface BatchProcessorOptions {
  /**
   * Number of items to process concurrently per batch
   * @default 10
   */
  batchSize?: number;

  /**
   * Delay in milliseconds between batches for rate limiting
   * @default 100
   */
  delayMs?: number;

  /**
   * Progress callback for tracking completion
   * @param completed - Number of items completed
   * @param total - Total number of items
   */
  onProgress?: (completed: number, total: number) => void;

  /**
   * Error callback for individual item failures
   * @param error - The error that occurred
   * @param item - The item that failed
   * @param index - Index of the failed item
   */
  onError?: (error: Error, item: any, index: number) => void;
}

/**
 * Result of batch processing
 */
export interface BatchResult<T> {
  /**
   * Successfully processed results
   */
  successes: T[];

  /**
   * Failures with error information
   */
  failures: Array<{
    index: number;
    error: Error;
    item: any;
  }>;

  /**
   * Total number of items processed
   */
  total: number;

  /**
   * Number of successful items
   */
  successCount: number;

  /**
   * Number of failed items
   */
  failureCount: number;
}

/**
 * Generic batch processor with parallel execution and rate limiting
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles batch processing logic
 * - Open/Closed: Generic for any type of processing
 * - Dependency Inversion: Uses callbacks for extensibility
 *
 * Features:
 * - Parallel processing within batches
 * - Rate limiting between batches
 * - Progress tracking
 * - Error isolation (one failure doesn't break all)
 * - Type-safe generics
 *
 * Performance:
 * - 5-10x faster than sequential for I/O-bound operations
 * - Memory efficient (processes in batches, not all at once)
 * - Configurable batch size and delays for API rate limits
 */
export class BatchProcessor {
  /**
   * Process items in parallel batches
   *
   * @param items - Array of items to process
   * @param processor - Async function to process each item
   * @param options - Batch processing configuration
   * @returns Promise with results and error information
   *
   * @example
   * ```typescript
   * const files = ['file1.json', 'file2.json', ...]; // 50 files
   *
   * const result = await BatchProcessor.processBatch(
   *   files,
   *   async (file) => await fetchFileContent(file),
   *   {
   *     batchSize: 10,  // Process 10 files at a time
   *     delayMs: 100,   // Wait 100ms between batches
   *     onProgress: (completed, total) => {
   *       console.log(`Progress: ${completed}/${total}`);
   *     }
   *   }
   * );
   *
   * console.log(`Success: ${result.successCount}, Failed: ${result.failureCount}`);
   * ```
   */
  static async processBatch<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput, index: number) => Promise<TOutput>,
    options: BatchProcessorOptions = {}
  ): Promise<BatchResult<TOutput>> {
    const {
      batchSize = 10,
      delayMs = 100,
      onProgress,
      onError
    } = options;

    const successes: TOutput[] = [];
    const failures: Array<{ index: number; error: Error; item: TInput }> = [];
    let completed = 0;

    // Process items in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchStartIndex = i;

      // Process batch in parallel with error isolation
      const batchResults = await Promise.allSettled(
        batch.map((item, batchIndex) => {
          const globalIndex = batchStartIndex + batchIndex;
          return processor(item, globalIndex);
        })
      );

      // Collect results and errors
      batchResults.forEach((result, batchIndex) => {
        const globalIndex = batchStartIndex + batchIndex;
        const item = batch[batchIndex];

        if (result.status === 'fulfilled') {
          successes.push(result.value);
        } else {
          const error = result.reason instanceof Error
            ? result.reason
            : new Error(String(result.reason));

          failures.push({
            index: globalIndex,
            error,
            item
          });

          // Call error callback if provided
          if (onError) {
            onError(error, item, globalIndex);
          } else {
            // Only log if no custom error handler provided
            console.error(`[BatchProcessor] Item ${globalIndex} failed:`, error.message);
          }
        }

        completed++;
      });

      // Report progress
      if (onProgress) {
        onProgress(completed, items.length);
      }

      // Delay between batches for rate limiting (except after last batch)
      if (i + batchSize < items.length && delayMs > 0) {
        await this.delay(delayMs);
      }
    }

    return {
      successes,
      failures,
      total: items.length,
      successCount: successes.length,
      failureCount: failures.length
    };
  }

  /**
   * Process items with automatic retry on failure
   *
   * @param items - Array of items to process
   * @param processor - Async function to process each item
   * @param options - Batch processing configuration
   * @param maxRetries - Maximum number of retries per item (default: 2)
   * @returns Promise with results and error information
   */
  static async processBatchWithRetry<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput, index: number) => Promise<TOutput>,
    options: BatchProcessorOptions = {},
    maxRetries: number = 2
  ): Promise<BatchResult<TOutput>> {
    const processorWithRetry = async (item: TInput, index: number): Promise<TOutput> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await processor(item, index);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // Don't retry on last attempt
          if (attempt < maxRetries) {
            // Exponential backoff: 2^attempt * 1000ms
            const backoffMs = Math.pow(2, attempt) * 1000;
            await this.delay(backoffMs);
          }
        }
      }

      // All attempts failed
      throw lastError || new Error('Unknown error');
    };

    return this.processBatch(items, processorWithRetry, options);
  }

  /**
   * Simple delay utility
   * @private
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

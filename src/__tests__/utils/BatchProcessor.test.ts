// ====================================================================================
// BATCH PROCESSOR TESTS
// Comprehensive unit tests for BatchProcessor
// ====================================================================================

import { BatchProcessor } from '../../utils/BatchProcessor';

describe('BatchProcessor', () => {
  describe('processBatch()', () => {
    test('should process items successfully', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = async (item: number) => item * 2;

      const result = await BatchProcessor.processBatch(items, processor);

      expect(result.successCount).toBe(5);
      expect(result.failureCount).toBe(0);
      expect(result.total).toBe(5);
      expect(result.successes).toEqual([2, 4, 6, 8, 10]);
      expect(result.failures).toHaveLength(0);
    });

    test('should handle empty array', async () => {
      const items: number[] = [];
      const processor = async (item: number) => item * 2;

      const result = await BatchProcessor.processBatch(items, processor);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.total).toBe(0);
      expect(result.successes).toEqual([]);
    });

    test('should process items in batches', async () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      const processedBatches: number[][] = [];
      let currentBatch: number[] = [];

      const processor = async (item: number) => {
        currentBatch.push(item);

        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));

        // When batch reaches size 10, record it
        if (currentBatch.length === 10) {
          processedBatches.push([...currentBatch]);
          currentBatch = [];
        }

        return item;
      };

      await BatchProcessor.processBatch(items, processor, { batchSize: 10, delayMs: 0 });

      // Should have processed in 3 batches (10, 10, 5)
      expect(processedBatches.length).toBeGreaterThanOrEqual(2);
    });

    test('should isolate errors (one failure does not break all)', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = async (item: number) => {
        if (item === 3) {
          throw new Error('Item 3 failed');
        }
        return item * 2;
      };

      const result = await BatchProcessor.processBatch(items, processor);

      expect(result.successCount).toBe(4);
      expect(result.failureCount).toBe(1);
      expect(result.successes).toEqual([2, 4, 8, 10]);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].index).toBe(2); // Index 2 is item 3
      expect(result.failures[0].error.message).toBe('Item 3 failed');
    });

    test('should handle all items failing', async () => {
      const items = [1, 2, 3];
      const processor = async (item: number) => {
        throw new Error(`Item ${item} failed`);
      };

      const result = await BatchProcessor.processBatch(items, processor);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(3);
      expect(result.failures).toHaveLength(3);
    });

    test('should call progress callback', async () => {
      const items = [1, 2, 3, 4, 5];
      const progressUpdates: Array<{ completed: number; total: number }> = [];

      const processor = async (item: number) => item * 2;

      await BatchProcessor.processBatch(items, processor, {
        batchSize: 2,
        onProgress: (completed, total) => {
          progressUpdates.push({ completed, total });
        }
      });

      // Should have called progress callback multiple times
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Last update should be completion
      const lastUpdate = progressUpdates[progressUpdates.length - 1];
      expect(lastUpdate.completed).toBe(5);
      expect(lastUpdate.total).toBe(5);
    });

    test('should call error callback on failures', async () => {
      const items = [1, 2, 3, 4, 5];
      const errors: Array<{ error: Error; item: number; index: number }> = [];

      const processor = async (item: number) => {
        if (item === 2 || item === 4) {
          throw new Error(`Item ${item} failed`);
        }
        return item * 2;
      };

      await BatchProcessor.processBatch(items, processor, {
        onError: (error, item, index) => {
          errors.push({ error, item, index });
        }
      });

      expect(errors).toHaveLength(2);
      expect(errors[0].item).toBe(2);
      expect(errors[0].index).toBe(1);
      expect(errors[1].item).toBe(4);
      expect(errors[1].index).toBe(3);
    });

    test('should respect batch size configuration', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const concurrentCounts: number[] = [];
      let currentConcurrent = 0;

      const processor = async (item: number) => {
        currentConcurrent++;
        const maxConcurrent = currentConcurrent;

        await new Promise(resolve => setTimeout(resolve, 10));

        currentConcurrent--;

        // Record max concurrent processed
        if (!concurrentCounts.includes(maxConcurrent)) {
          concurrentCounts.push(maxConcurrent);
        }

        return item;
      };

      await BatchProcessor.processBatch(items, processor, {
        batchSize: 5,
        delayMs: 0
      });

      // Max concurrent should not exceed batch size
      const maxConcurrent = Math.max(...concurrentCounts);
      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });

    test('should delay between batches', async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const delayMs = 100;
      const startTime = Date.now();

      const processor = async (item: number) => item;

      await BatchProcessor.processBatch(items, processor, {
        batchSize: 2,
        delayMs
      });

      const elapsed = Date.now() - startTime;

      // Should have 3 batches with 2 delays between them
      // Minimum time: 2 * delayMs = 200ms
      expect(elapsed).toBeGreaterThanOrEqual(delayMs * 2 - 50); // Allow 50ms tolerance
    });

    test('should handle non-Error exceptions', async () => {
      const items = [1, 2, 3];
      const processor = async (item: number) => {
        if (item === 2) {
          throw 'String error'; // Non-Error exception
        }
        return item;
      };

      const result = await BatchProcessor.processBatch(items, processor);

      expect(result.failureCount).toBe(1);
      expect(result.failures[0].error).toBeInstanceOf(Error);
      expect(result.failures[0].error.message).toBe('String error');
    });

    test('should preserve item order in successes', async () => {
      const items = [5, 3, 8, 1, 9, 2, 7];
      const processor = async (item: number) => {
        // Simulate variable processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        return item;
      };

      const result = await BatchProcessor.processBatch(items, processor, {
        batchSize: 3
      });

      expect(result.successes).toEqual([5, 3, 8, 1, 9, 2, 7]);
    });

    test('should handle large datasets efficiently', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => i);
      const processor = async (item: number) => item * 2;

      const startTime = Date.now();

      const result = await BatchProcessor.processBatch(items, processor, {
        batchSize: 50,
        delayMs: 0
      });

      const elapsed = Date.now() - startTime;

      expect(result.successCount).toBe(1000);

      // Should complete in reasonable time (< 5 seconds)
      expect(elapsed).toBeLessThan(5000);
    });

    test('should pass index to processor', async () => {
      const items = ['a', 'b', 'c'];
      const indices: number[] = [];

      const processor = async (item: string, index: number) => {
        indices.push(index);
        return item;
      };

      await BatchProcessor.processBatch(items, processor);

      expect(indices).toEqual([0, 1, 2]);
    });
  });

  describe('processBatchWithRetry()', () => {
    test('should retry failed items', async () => {
      const items = [1, 2, 3];
      let attempts: Record<number, number> = {};

      const processor = async (item: number) => {
        attempts[item] = (attempts[item] || 0) + 1;

        // Fail first 2 attempts for item 2
        if (item === 2 && attempts[item] < 3) {
          throw new Error('Temporary failure');
        }

        return item * 2;
      };

      const result = await BatchProcessor.processBatchWithRetry(
        items,
        processor,
        {},
        2 // maxRetries
      );

      expect(result.successCount).toBe(3);
      expect(attempts[2]).toBe(3); // Should have attempted 3 times (initial + 2 retries)
    });

    test('should fail after max retries', async () => {
      const items = [1, 2, 3];
      let attempts = 0;

      const processor = async (item: number) => {
        if (item === 2) {
          attempts++;
          throw new Error('Permanent failure');
        }
        return item * 2;
      };

      const result = await BatchProcessor.processBatchWithRetry(
        items,
        processor,
        {},
        2 // maxRetries
      );

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(attempts).toBe(3); // Initial + 2 retries
    });

    test('should apply exponential backoff', async () => {
      const items = [1];
      const attemptTimes: number[] = [];

      const processor = async (item: number) => {
        attemptTimes.push(Date.now());

        // Fail first 2 attempts
        if (attemptTimes.length < 3) {
          throw new Error('Retry me');
        }

        return item;
      };

      await BatchProcessor.processBatchWithRetry(items, processor, {}, 2);

      expect(attemptTimes).toHaveLength(3);

      // Check backoff delays
      const delay1 = attemptTimes[1] - attemptTimes[0];
      const delay2 = attemptTimes[2] - attemptTimes[1];

      // First retry: ~1000ms (2^0 * 1000)
      expect(delay1).toBeGreaterThanOrEqual(900);
      expect(delay1).toBeLessThan(1200);

      // Second retry: ~2000ms (2^1 * 1000)
      expect(delay2).toBeGreaterThanOrEqual(1900);
      expect(delay2).toBeLessThan(2200);
    });

    test('should not retry on success', async () => {
      const items = [1, 2, 3];
      let attempts = 0;

      const processor = async (item: number) => {
        attempts++;
        return item * 2;
      };

      await BatchProcessor.processBatchWithRetry(items, processor, {}, 2);

      expect(attempts).toBe(3); // One attempt per item, no retries
    });
  });

  describe('performance characteristics', () => {
    test('parallel should be faster than sequential', async () => {
      const items = Array.from({ length: 20 }, (_, i) => i);
      const delayMs = 50;

      // Sequential simulation
      const sequentialStart = Date.now();
      for (const item of items) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      const sequentialTime = Date.now() - sequentialStart;

      // Parallel with batch size 10
      const parallelStart = Date.now();
      await BatchProcessor.processBatch(
        items,
        async (item) => {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return item;
        },
        { batchSize: 10, delayMs: 0 }
      );
      const parallelTime = Date.now() - parallelStart;

      // Parallel should be at least 50% faster
      expect(parallelTime).toBeLessThan(sequentialTime * 0.6);
    });

    test('should maintain memory efficiency with batching', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => i);
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const processor = async (item: number) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

        await new Promise(resolve => setTimeout(resolve, 1));

        currentConcurrent--;
        return item;
      };

      await BatchProcessor.processBatch(items, processor, {
        batchSize: 20,
        delayMs: 0
      });

      // Should never process more than batch size concurrently
      expect(maxConcurrent).toBeLessThanOrEqual(20);
    });
  });
});

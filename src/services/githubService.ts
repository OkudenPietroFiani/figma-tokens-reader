// ====================================================================================
// GITHUB INTEGRATION SERVICE (Refactored)
// Handles GitHub API operations with extracted utilities
// ====================================================================================

import { Base64Decoder } from '../utils/Base64Decoder';
import { FileClassifier } from '../utils/FileClassifier';
import { BatchProcessor } from '../utils/BatchProcessor';
import { FEATURE_FLAGS } from '../shared/constants';

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

interface GitHubFile {
  path: string;
  type: string;
  sha: string;
}

/**
 * GitHub service - refactored with Single Responsibility
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles GitHub API communication
 * - Dependency Inversion: Uses utility abstractions (Base64Decoder, FileClassifier)
 * - Open/Closed: Easy to extend with new endpoints
 *
 * Responsibilities:
 * - Fetch repository file lists
 * - Fetch individual file content
 * - Fetch multiple files in batch
 * - Parse repository URLs
 *
 * Delegated Responsibilities (extracted):
 * - Base64 decoding → Base64Decoder
 * - File classification → FileClassifier
 */
export class GitHubService {
  /**
   * Fetch list of JSON files from repository
   */
  async fetchRepositoryFiles(config: GitHubConfig): Promise<GitHubFile[]> {
    try {
      const url = `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${config.branch}?recursive=1`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Figma-W3C-Tokens-Plugin'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();

      // Filter for JSON files only
      const jsonFiles = data.tree.filter((item: any) =>
        item.type === 'blob' && item.path.endsWith('.json')
      );

      return jsonFiles.map((file: any) => ({
        path: file.path,
        type: file.type,
        sha: file.sha
      }));
    } catch (error) {
      console.error('GitHub fetch error:', error);
      throw new Error(`Failed to fetch repository files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch content of a single file
   */
  async fetchFileContent(config: GitHubConfig, filePath: string): Promise<any> {
    try {
      const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}?ref=${config.branch}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Figma-W3C-Tokens-Plugin'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GitHub API error for ${filePath}:`, response.status, errorText);
        throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.content) {
        throw new Error(`No content field in GitHub response for ${filePath}`);
      }

      // Decode base64 content using utility
      const content = Base64Decoder.decode(data.content);

      return JSON.parse(content);
    } catch (error) {
      console.error(`Error fetching file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Fetch multiple files and organize by primitives/semantics
   */
  async fetchMultipleFiles(config: GitHubConfig, filePaths: string[]): Promise<{ primitives: any; semantics: any }> {
    if (FEATURE_FLAGS.ENABLE_PARALLEL_FETCHING) {
      return this.fetchMultipleFilesParallel(config, filePaths);
    } else {
      return this.fetchMultipleFilesSequential(config, filePaths);
    }
  }

  /**
   * Fetch multiple files in parallel using BatchProcessor (Phase 3)
   * 5-10x faster than sequential for large file sets
   * @private
   */
  private async fetchMultipleFilesParallel(config: GitHubConfig, filePaths: string[]): Promise<{ primitives: any; semantics: any }> {
    const primitivesData: any = {};
    const semanticsData: any = {};

    // Process files in parallel batches
    const result = await BatchProcessor.processBatch(
      filePaths,
      async (filePath) => {
        const jsonData = await this.fetchFileContent(config, filePath);
        const fileName = filePath.split('/').pop() || filePath;
        return { filePath, fileName, jsonData };
      },
      {
        batchSize: FEATURE_FLAGS.PARALLEL_BATCH_SIZE,
        delayMs: FEATURE_FLAGS.BATCH_DELAY_MS,
        onProgress: (completed, total) => {
          // Progress feedback (can be emitted to UI if needed)
          if (completed % 10 === 0 || completed === total) {
            console.log(`[GitHubService] Fetching files: ${completed}/${total}`);
          }
        }
      }
    );

    // Organize results by category
    for (const { filePath, fileName, jsonData } of result.successes) {
      if (FileClassifier.isSemantic(filePath)) {
        semanticsData[fileName] = jsonData;
      } else {
        primitivesData[fileName] = jsonData;
      }
    }

    // Log failures (but don't throw - partial success is OK)
    if (result.failureCount > 0) {
      console.error(`[GitHubService] Failed to fetch ${result.failureCount} file(s):`);
      result.failures.forEach(failure => {
        console.error(`  - ${failure.item}: ${failure.error.message}`);
      });
    }

    return { primitives: primitivesData, semantics: semanticsData };
  }

  /**
   * Fetch multiple files sequentially (legacy method)
   * @private
   */
  private async fetchMultipleFilesSequential(config: GitHubConfig, filePaths: string[]): Promise<{ primitives: any; semantics: any }> {
    const primitivesData: any = {};
    const semanticsData: any = {};

    for (const filePath of filePaths) {
      const jsonData = await this.fetchFileContent(config, filePath);
      const fileName = filePath.split('/').pop() || filePath;

      // Use FileClassifier utility to determine category
      if (FileClassifier.isSemantic(filePath)) {
        semanticsData[fileName] = jsonData;
      } else {
        // Default to primitives (includes 'unknown')
        primitivesData[fileName] = jsonData;
      }
    }

    return { primitives: primitivesData, semantics: semanticsData };
  }

  /**
   * Parse GitHub repository URL
   */
  parseRepoUrl(url: string): { owner: string; repo: string } | null {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return null;
    }

    return {
      owner: match[1],
      repo: match[2].replace('.git', '')
    };
  }
}

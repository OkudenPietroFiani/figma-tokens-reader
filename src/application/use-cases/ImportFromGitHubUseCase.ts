// ====================================================================================
// IMPORT FROM GITHUB USE CASE
// Imports design tokens from GitHub repository
// ====================================================================================

import { UseCase } from '../interfaces/IUseCase';
import { UseCaseRegistry } from '../UseCaseRegistry';
import { Result, Success, Failure, GitHubFile } from '../../shared/types';
import { GitHubService } from '../../backend/services/GitHubService';

/**
 * Input for ImportFromGitHubUseCase
 */
export interface ImportFromGitHubInput {
  /** Repository owner (user or organization) */
  owner: string;
  /** Repository name */
  repo: string;
  /** Files to import */
  files: Array<{
    /** File path in repository */
    path: string;
    /** Optional: Collection name for these tokens */
    collection?: string;
  }>;
  /** Optional: GitHub personal access token */
  token?: string;
  /** Optional: Branch name (defaults to 'main') */
  branch?: string;
}

/**
 * Output from ImportFromGitHubUseCase
 */
export interface ImportFromGitHubOutput {
  /** Number of files imported */
  filesImported: number;
  /** Total tokens imported across all files */
  tokensImported: number;
  /** Number of tokens synced to Figma */
  tokensSynced: number;
  /** Import statistics */
  stats: {
    created: number;
    updated: number;
    failed: number;
  };
}

/**
 * Use Case: Import Tokens from GitHub
 *
 * Orchestrates importing design tokens from a GitHub repository:
 * 1. Fetch file contents from GitHub
 * 2. Import each file using ImportTokensUseCase
 * 3. Sync all imported tokens to Figma using SyncToFigmaVariablesUseCase
 *
 * Example usage:
 * ```typescript
 * const useCase = new ImportFromGitHubUseCase(githubService, useCaseRegistry);
 * const result = await useCase.execute({
 *   owner: 'myorg',
 *   repo: 'design-tokens',
 *   files: [
 *     { path: 'primitives.json', collection: 'primitive' },
 *     { path: 'semantic.json', collection: 'semantic' }
 *   ],
 *   token: 'ghp_...'
 * });
 * ```
 */
export class ImportFromGitHubUseCase extends UseCase<
  ImportFromGitHubInput,
  ImportFromGitHubOutput
> {
  constructor(
    private githubService: GitHubService,
    private useCaseRegistry: UseCaseRegistry
  ) {
    super();
  }

  protected async executeImpl(
    input: ImportFromGitHubInput
  ): Promise<Result<ImportFromGitHubOutput>> {
    console.log(
      `[ImportFromGitHubUseCase] Importing ${input.files.length} file(s) from ${input.owner}/${input.repo}`
    );

    let filesImported = 0;
    let tokensImported = 0;

    // Build config for GitHubService (matching GitHubConfig interface)
    const config = {
      owner: input.owner,
      repo: input.repo,
      token: input.token || '',
      branch: input.branch || 'main'
    };

    // Step 1: Import each file
    for (const fileSpec of input.files) {
      console.log(`[ImportFromGitHubUseCase] Fetching ${fileSpec.path}...`);

      // Fetch file content from GitHub
      const fileContent = await this.githubService.fetchFileContent(
        config,
        fileSpec.path
      );

      if (!fileContent.success) {
        console.warn(
          `[ImportFromGitHubUseCase] Failed to fetch ${fileSpec.path}: ${fileContent.error}`
        );
        continue; // Skip this file, continue with others
      }

      // Parse JSON content
      let tokenData;
      try {
        tokenData = JSON.parse(fileContent.data!);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid JSON';
        console.warn(
          `[ImportFromGitHubUseCase] Failed to parse ${fileSpec.path}: ${message}`
        );
        continue;
      }

      // Import tokens using ImportTokensUseCase
      const importResult = await this.useCaseRegistry.execute('import-tokens', {
        data: tokenData,
        projectId: 'default',
        collection: fileSpec.collection || this.inferCollection(fileSpec.path),
        filePath: fileSpec.path,
        source: {
          type: 'github',
          location: `${input.owner}/${input.repo}/${fileSpec.path}`
        }
      });

      if (!importResult.success) {
        console.warn(
          `[ImportFromGitHubUseCase] Failed to import ${fileSpec.path}: ${importResult.error}`
        );
        continue;
      }

      filesImported++;
      tokensImported += importResult.data!.count;
      console.log(
        `[ImportFromGitHubUseCase] Imported ${importResult.data!.count} tokens from ${fileSpec.path}`
      );
    }

    if (filesImported === 0) {
      return Failure('No files were successfully imported');
    }

    // Step 2: Sync all imported tokens to Figma
    console.log(`[ImportFromGitHubUseCase] Syncing ${tokensImported} tokens to Figma...`);

    const syncResult = await this.useCaseRegistry.execute('sync-to-figma', {
      projectId: 'default',
      options: { overwrite: true }
    });

    if (!syncResult.success) {
      return Failure(`Files imported but sync failed: ${syncResult.error}`);
    }

    const { created, updated, failed } = syncResult.data!;

    console.log(
      `[ImportFromGitHubUseCase] Complete: ${filesImported} files, ` +
      `${tokensImported} tokens imported, ${created + updated} synced to Figma`
    );

    return Success({
      filesImported,
      tokensImported,
      tokensSynced: created + updated,
      stats: { created, updated, failed }
    });
  }

  validate(input: ImportFromGitHubInput): Result<boolean> {
    if (!input.owner || typeof input.owner !== 'string') {
      return Failure('owner is required and must be a string');
    }

    if (!input.repo || typeof input.repo !== 'string') {
      return Failure('repo is required and must be a string');
    }

    if (!input.files || !Array.isArray(input.files) || input.files.length === 0) {
      return Failure('files is required and must be a non-empty array');
    }

    for (const file of input.files) {
      if (!file.path || typeof file.path !== 'string') {
        return Failure('Each file must have a path (string)');
      }
    }

    return Success(true);
  }

  /**
   * Infer collection name from file path
   * e.g., "tokens/primitives.json" → "primitive"
   */
  private inferCollection(filePath: string): string {
    const filename = filePath.split('/').pop() || filePath;
    const nameWithoutExt = filename.replace(/\.(json|tokens)$/i, '');

    // Remove common suffixes
    const cleaned = nameWithoutExt
      .replace(/[-_]tokens$/i, '')
      .replace(/s$/, ''); // Remove trailing 's' (primitives → primitive)

    return cleaned.toLowerCase();
  }
}

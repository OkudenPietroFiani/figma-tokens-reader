// ====================================================================================
// FETCH GITHUB FILES USE CASE
// Lists token files available in a GitHub repository
// ====================================================================================

import { UseCase } from '../interfaces/IUseCase';
import { Result, Success, Failure, GitHubFile } from '../../shared/types';
import { GitHubService } from '../../backend/services/GitHubService';

/**
 * Input for FetchGitHubFilesUseCase
 */
export interface FetchGitHubFilesInput {
  /** Repository owner (user or organization) */
  owner: string;
  /** Repository name */
  repo: string;
  /** Optional: Path within repository */
  path?: string;
  /** Optional: GitHub personal access token */
  token?: string;
}

/**
 * Output from FetchGitHubFilesUseCase
 */
export interface FetchGitHubFilesOutput {
  /** List of files found in the repository */
  files: GitHubFile[];
}

/**
 * Use Case: Fetch GitHub Files
 *
 * Retrieves a list of token files from a GitHub repository.
 * Users can browse available files before selecting which to import.
 *
 * Example usage:
 * ```typescript
 * const useCase = new FetchGitHubFilesUseCase(githubService);
 * const result = await useCase.execute({
 *   owner: 'myorg',
 *   repo: 'design-tokens',
 *   path: 'tokens/',
 *   token: 'ghp_...'
 * });
 * console.log(`Found ${result.data.files.length} files`);
 * ```
 */
export class FetchGitHubFilesUseCase extends UseCase<
  FetchGitHubFilesInput,
  FetchGitHubFilesOutput
> {
  constructor(private githubService: GitHubService) {
    super();
  }

  protected async executeImpl(
    input: FetchGitHubFilesInput
  ): Promise<Result<FetchGitHubFilesOutput>> {
    console.log(
      `[FetchGitHubFilesUseCase] Fetching files from ${input.owner}/${input.repo}` +
      (input.path ? ` at ${input.path}` : '')
    );

    // Build file source config for GitHubService
    const config = {
      type: 'github' as const,
      owner: input.owner,
      repo: input.repo,
      path: input.path,
      token: input.token
    };

    // Fetch files using GitHubService
    const result = await this.githubService.fetchFiles(config);

    if (!result.success) {
      return Failure(`Failed to fetch GitHub files: ${result.error}`);
    }

    const files = result.data || [];

    console.log(`[FetchGitHubFilesUseCase] Found ${files.length} files`);

    return Success({ files });
  }

  validate(input: FetchGitHubFilesInput): Result<boolean> {
    if (!input.owner || typeof input.owner !== 'string') {
      return Failure('owner is required and must be a string');
    }

    if (!input.repo || typeof input.repo !== 'string') {
      return Failure('repo is required and must be a string');
    }

    if (input.path && typeof input.path !== 'string') {
      return Failure('path must be a string');
    }

    if (input.token && typeof input.token !== 'string') {
      return Failure('token must be a string');
    }

    return Success(true);
  }
}

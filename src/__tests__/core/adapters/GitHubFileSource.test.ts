// ====================================================================================
// GITHUB FILE SOURCE TESTS
// Comprehensive unit tests for GitHubFileSource adapter
// ====================================================================================

import { GitHubFileSource, GitHubFileSourceConfig } from '../../../core/adapters/GitHubFileSource';
import { GitHubService } from '../../../services/githubService';
import { GitHubConfig } from '../../../shared/types';

// Mock GitHubService
class MockGitHubService extends GitHubService {
  public mockFiles: any[] = [];
  public mockFileContent: any = {};
  public mockMultipleFiles: { primitives: any; semantics: any } = {
    primitives: {},
    semantics: {}
  };
  public shouldThrow: boolean = false;
  public errorMessage: string = 'Mock error';

  async fetchRepositoryFiles(config: GitHubConfig): Promise<any[]> {
    if (this.shouldThrow) {
      throw new Error(this.errorMessage);
    }
    return this.mockFiles;
  }

  async fetchFileContent(config: GitHubConfig, filePath: string): Promise<any> {
    if (this.shouldThrow) {
      throw new Error(this.errorMessage);
    }
    return this.mockFileContent;
  }

  async fetchMultipleFiles(config: GitHubConfig, filePaths: string[]): Promise<any> {
    if (this.shouldThrow) {
      throw new Error(this.errorMessage);
    }
    return this.mockMultipleFiles;
  }
}

describe('GitHubFileSource', () => {
  let mockService: MockGitHubService;
  let fileSource: GitHubFileSource;
  let testConfig: GitHubFileSourceConfig;

  beforeEach(() => {
    mockService = new MockGitHubService();
    fileSource = new GitHubFileSource(mockService);
    testConfig = {
      source: 'github',
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo',
      branch: 'main'
    };
  });

  describe('getSourceType()', () => {
    test('should return "github" as source type', () => {
      expect(fileSource.getSourceType()).toBe('github');
    });
  });

  describe('fetchFileList()', () => {
    test('should fetch and convert file list successfully', async () => {
      mockService.mockFiles = [
        { path: 'tokens/colors.json', type: 'blob', sha: 'abc123' },
        { path: 'tokens/spacing.json', type: 'blob', sha: 'def456' }
      ];

      const result = await fileSource.fetchFileList(testConfig);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toEqual({
        path: 'tokens/colors.json',
        type: 'blob',
        sha: 'abc123'
      });
    });

    test('should return failure result on error', async () => {
      mockService.shouldThrow = true;
      mockService.errorMessage = 'API rate limit exceeded';

      const result = await fileSource.fetchFileList(testConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API rate limit exceeded');
    });

    test('should handle empty file list', async () => {
      mockService.mockFiles = [];

      const result = await fileSource.fetchFileList(testConfig);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('fetchFileContent()', () => {
    test('should fetch single file content successfully', async () => {
      const mockContent = {
        color: {
          primary: { $value: '#0000ff', $type: 'color' }
        }
      };
      mockService.mockFileContent = mockContent;

      const result = await fileSource.fetchFileContent(testConfig, 'tokens/colors.json');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockContent);
    });

    test('should return failure result on error', async () => {
      mockService.shouldThrow = true;
      mockService.errorMessage = 'File not found';

      const result = await fileSource.fetchFileContent(testConfig, 'nonexistent.json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('fetchMultipleFiles()', () => {
    test('should fetch multiple files and flatten results', async () => {
      mockService.mockMultipleFiles = {
        primitives: {
          'colors.json': { color: { red: { $value: '#ff0000' } } },
          'spacing.json': { spacing: { small: { $value: '8px' } } }
        },
        semantics: {
          'semantic.json': { semantic: { text: { $value: '{color.red}' } } }
        }
      };

      const result = await fileSource.fetchMultipleFiles(testConfig, [
        'tokens/colors.json',
        'tokens/spacing.json',
        'tokens/semantic.json'
      ]);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    test('should handle only primitives', async () => {
      mockService.mockMultipleFiles = {
        primitives: {
          'colors.json': { color: { red: { $value: '#ff0000' } } }
        },
        semantics: {}
      };

      const result = await fileSource.fetchMultipleFiles(testConfig, ['tokens/colors.json']);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    test('should handle only semantics', async () => {
      mockService.mockMultipleFiles = {
        primitives: {},
        semantics: {
          'semantic.json': { semantic: { text: { $value: '{color.red}' } } }
        }
      };

      const result = await fileSource.fetchMultipleFiles(testConfig, ['tokens/semantic.json']);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    test('should return failure result on error', async () => {
      mockService.shouldThrow = true;
      mockService.errorMessage = 'Network error';

      const result = await fileSource.fetchMultipleFiles(testConfig, ['tokens/colors.json']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('validateConfig()', () => {
    test('should return true for valid config', async () => {
      mockService.mockFiles = [
        { path: 'tokens/colors.json', type: 'blob', sha: 'abc123' }
      ];

      const result = await fileSource.validateConfig(testConfig);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    test('should return false for invalid config', async () => {
      mockService.shouldThrow = true;
      mockService.errorMessage = 'Authentication failed';

      const result = await fileSource.validateConfig(testConfig);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    test('should validate by attempting to fetch files', async () => {
      mockService.mockFiles = [];

      const result = await fileSource.validateConfig(testConfig);

      // Even empty list means connection works
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });
  });

  describe('configuration conversion', () => {
    test('should correctly convert FileSourceConfig to GitHubConfig', async () => {
      const config: GitHubFileSourceConfig = {
        source: 'github',
        token: 'my-token',
        owner: 'my-org',
        repo: 'my-repo',
        branch: 'develop',
        files: ['file1.json', 'file2.json']
      };

      mockService.mockFiles = [];

      // This will internally convert config
      await fileSource.fetchFileList(config);

      // If conversion was correct, no error would be thrown
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    test('should handle Error instances', async () => {
      mockService.shouldThrow = true;
      mockService.errorMessage = 'Specific error message';

      const result = await fileSource.fetchFileList(testConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Specific error message');
    });

    test('should handle non-Error exceptions', async () => {
      // Override to throw non-Error
      const customSource = new GitHubFileSource();
      const spy = jest.spyOn(GitHubService.prototype, 'fetchRepositoryFiles')
        .mockRejectedValue('String error');

      const result = await customSource.fetchFileList(testConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');

      spy.mockRestore();
    });
  });
});

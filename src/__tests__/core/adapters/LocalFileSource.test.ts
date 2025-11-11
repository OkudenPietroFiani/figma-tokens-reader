// ====================================================================================
// LOCAL FILE SOURCE TESTS
// Comprehensive unit tests for LocalFileSource
// ====================================================================================

import { LocalFileSource, LocalFileSourceConfig } from '../../../core/adapters/LocalFileSource';

describe('LocalFileSource', () => {
  let source: LocalFileSource;

  beforeEach(() => {
    source = new LocalFileSource();
  });

  describe('getSourceType()', () => {
    it('should return "local"', () => {
      expect(source.getSourceType()).toBe('local');
    });
  });

  describe('fetchFileList()', () => {
    it('should return list of file metadata', async () => {
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [
          {
            name: 'colors.json',
            path: 'tokens/colors.json',
            content: { color: { primary: { $value: '#FF0000' } } },
          },
          {
            name: 'spacing.json',
            path: 'tokens/spacing.json',
            content: { spacing: { small: { $value: '8px' } } },
          },
        ],
      };

      const result = await source.fetchFileList(config);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]).toMatchObject({
        path: 'tokens/colors.json',
        type: 'file',
      });
      expect(result.data?.[0].size).toBeGreaterThan(0);
    });

    it('should use name as path if path not provided', async () => {
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [
          {
            name: 'colors.json',
            path: '',
            content: {},
          },
        ],
      };

      const result = await source.fetchFileList(config);

      expect(result.success).toBe(true);
      expect(result.data?.[0].path).toBe('colors.json');
    });

    it('should return failure if no files provided', async () => {
      const config = {
        source: 'local' as const,
      };

      const result = await source.fetchFileList(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No files provided');
    });

    it('should handle empty files array', async () => {
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [],
      };

      const result = await source.fetchFileList(config);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('fetchFileContent()', () => {
    it('should fetch file by path', async () => {
      const content = { color: { primary: { $value: '#FF0000' } } };
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [
          {
            name: 'colors.json',
            path: 'tokens/colors.json',
            content,
          },
        ],
      };

      const result = await source.fetchFileContent(config, 'tokens/colors.json');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(content);
    });

    it('should fetch file by name', async () => {
      const content = { color: { primary: { $value: '#FF0000' } } };
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [
          {
            name: 'colors.json',
            path: 'tokens/colors.json',
            content,
          },
        ],
      };

      const result = await source.fetchFileContent(config, 'colors.json');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(content);
    });

    it('should return failure if file not found', async () => {
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [
          {
            name: 'colors.json',
            path: 'tokens/colors.json',
            content: {},
          },
        ],
      };

      const result = await source.fetchFileContent(config, 'nonexistent.json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });

    it('should return failure if no files provided', async () => {
      const config = {
        source: 'local' as const,
      };

      const result = await source.fetchFileContent(config, 'colors.json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No files provided');
    });
  });

  describe('fetchMultipleFiles()', () => {
    it('should fetch multiple files', async () => {
      const content1 = { color: { primary: { $value: '#FF0000' } } };
      const content2 = { spacing: { small: { $value: '8px' } } };
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [
          {
            name: 'colors.json',
            path: 'tokens/colors.json',
            content: content1,
          },
          {
            name: 'spacing.json',
            path: 'tokens/spacing.json',
            content: content2,
          },
        ],
      };

      const result = await source.fetchMultipleFiles(config, [
        'tokens/colors.json',
        'tokens/spacing.json',
      ]);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data).toContain(content1);
      expect(result.data).toContain(content2);
    });

    it('should fetch files by name or path', async () => {
      const content1 = { color: { primary: { $value: '#FF0000' } } };
      const content2 = { spacing: { small: { $value: '8px' } } };
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [
          {
            name: 'colors.json',
            path: 'tokens/colors.json',
            content: content1,
          },
          {
            name: 'spacing.json',
            path: 'tokens/spacing.json',
            content: content2,
          },
        ],
      };

      const result = await source.fetchMultipleFiles(config, [
        'colors.json', // by name
        'tokens/spacing.json', // by path
      ]);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should skip missing files with warning', async () => {
      const content = { color: { primary: { $value: '#FF0000' } } };
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [
          {
            name: 'colors.json',
            path: 'tokens/colors.json',
            content,
          },
        ],
      };

      const result = await source.fetchMultipleFiles(config, [
        'tokens/colors.json',
        'nonexistent.json', // Should be skipped
      ]);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toEqual(content);
    });

    it('should return failure if no files could be loaded', async () => {
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [
          {
            name: 'colors.json',
            path: 'tokens/colors.json',
            content: {},
          },
        ],
      };

      const result = await source.fetchMultipleFiles(config, ['nonexistent1.json', 'nonexistent2.json']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No files could be loaded');
    });

    it('should return failure if no files provided in config', async () => {
      const config = {
        source: 'local' as const,
      };

      const result = await source.fetchMultipleFiles(config, ['colors.json']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No files provided');
    });
  });

  describe('validateConfig()', () => {
    it('should validate correct config', async () => {
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [
          {
            name: 'colors.json',
            path: 'tokens/colors.json',
            content: { color: { primary: { $value: '#FF0000' } } },
          },
        ],
      };

      const result = await source.validateConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should fail if no files provided', async () => {
      const config = {
        source: 'local' as const,
      };

      const result = await source.validateConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should fail if files is not an array', async () => {
      const config = {
        source: 'local' as const,
        files: 'not an array' as any,
      };

      const result = await source.validateConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should fail if file missing name', async () => {
      const config = {
        source: 'local' as const,
        files: [
          {
            path: 'tokens/colors.json',
            content: {},
          } as any,
        ],
      };

      const result = await source.validateConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should fail if file missing content', async () => {
      const config = {
        source: 'local' as const,
        files: [
          {
            name: 'colors.json',
            path: 'tokens/colors.json',
          } as any,
        ],
      };

      const result = await source.validateConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should fail if content is invalid JSON string', async () => {
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [
          {
            name: 'colors.json',
            path: 'tokens/colors.json',
            content: 'invalid json{' as any,
          },
        ],
      };

      const result = await source.validateConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should accept valid JSON string content', async () => {
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [
          {
            name: 'colors.json',
            path: 'tokens/colors.json',
            content: '{"color": {"primary": {"$value": "#FF0000"}}}' as any,
          },
        ],
      };

      const result = await source.validateConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should handle empty files array', async () => {
      const config: LocalFileSourceConfig = {
        source: 'local',
        files: [],
      };

      const result = await source.validateConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true); // Empty array is valid
    });
  });

  describe('error handling', () => {
    it('should handle errors in fetchFileList gracefully', async () => {
      const config = null as any;

      const result = await source.fetchFileList(config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle errors in fetchFileContent gracefully', async () => {
      const config = null as any;

      const result = await source.fetchFileContent(config, 'test.json');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle errors in fetchMultipleFiles gracefully', async () => {
      const config = null as any;

      const result = await source.fetchMultipleFiles(config, ['test.json']);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle errors in validateConfig gracefully', async () => {
      const config = null as any;

      const result = await source.validateConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });
});

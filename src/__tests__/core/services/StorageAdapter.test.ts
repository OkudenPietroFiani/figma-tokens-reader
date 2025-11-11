// ====================================================================================
// STORAGE ADAPTER TESTS
// Comprehensive unit tests for auto-migration and zero data loss
// ====================================================================================

import { StorageAdapter } from '../../../core/services/StorageAdapter';
import { TokenState, ProjectStorage } from '../../../shared/types';
import { Token, TokenType } from '../../../core/models/Token';
import { TokenFormatRegistry } from '../../../core/registries/TokenFormatRegistry';
import { W3CTokenFormatStrategy } from '../../../core/adapters/W3CTokenFormatStrategy';

// Mock figma.clientStorage
const mockStorage: { [key: string]: any } = {};
(global as any).figma = {
  clientStorage: {
    getAsync: jest.fn((key: string) => Promise.resolve(mockStorage[key])),
    setAsync: jest.fn((key: string, value: any) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
  },
  notify: jest.fn(),
};

describe('StorageAdapter', () => {
  let adapter: StorageAdapter;

  beforeEach(() => {
    adapter = new StorageAdapter();
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    jest.clearAllMocks();

    // Register W3C format strategy for TokenProcessor
    TokenFormatRegistry.clear();
    TokenFormatRegistry.register(new W3CTokenFormatStrategy());
  });

  afterEach(() => {
    TokenFormatRegistry.clear();
  });

  describe('load() - New Project', () => {
    it('should return empty array for new project', async () => {
      const result = await adapter.load('new-project');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('load() - Old TokenState Format', () => {
    it('should detect old format and migrate', async () => {
      // Setup old format data
      const oldData: TokenState = {
        tokenFiles: {
          'primitives.json': {
            name: 'primitives.json',
            path: 'tokens/primitives.json',
            content: {
              color: {
                primary: {
                  $value: '#FF0000',
                  $type: 'color',
                },
              },
            },
            source: 'local',
          },
        },
        tokenSource: 'local',
        lastUpdated: new Date().toISOString(),
      };

      mockStorage['project:test'] = oldData;

      const result = await adapter.load('test');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);

      // Verify token properties
      const token = result.data![0];
      expect(token.qualifiedName).toBe('color.primary');
      expect(token.type).toBe('color');
      expect(token.value).toBe('#FF0000');
    });

    it('should create backup before migration', async () => {
      const oldData: TokenState = {
        tokenFiles: {
          'test.json': {
            name: 'test.json',
            path: 'test.json',
            content: {
              color: { primary: { $value: '#FF0000' } },
            },
            source: 'local',
          },
        },
        tokenSource: 'local',
      };

      mockStorage['project:test'] = oldData;

      await adapter.load('test');

      // Check that a backup was created
      const backupKeys = Object.keys(mockStorage).filter(k => k.startsWith('backup:test:'));
      expect(backupKeys.length).toBeGreaterThan(0);

      // Verify backup contains original data
      const backupKey = backupKeys[0];
      expect(mockStorage[backupKey]).toEqual(oldData);
    });

    it('should save migrated data in new format', async () => {
      const oldData: TokenState = {
        tokenFiles: {
          'test.json': {
            name: 'test.json',
            path: 'test.json',
            content: {
              color: { primary: { $value: '#FF0000' } },
            },
            source: 'local',
          },
        },
        tokenSource: 'local',
      };

      mockStorage['project:test'] = oldData;

      await adapter.load('test');

      // Verify new format was saved
      const newData = mockStorage['project:test'] as ProjectStorage;
      expect(newData.version).toBe('2.0');
      expect(newData.projectId).toBe('test');
      expect(newData.tokens).toBeDefined();
      expect(newData.metadata).toBeDefined();
    });

    it('should validate zero data loss', async () => {
      const oldData: TokenState = {
        tokenFiles: {
          'primitives.json': {
            name: 'primitives.json',
            path: 'primitives.json',
            content: {
              color: {
                primary: { $value: '#FF0000' },
                secondary: { $value: '#00FF00' },
              },
              spacing: {
                small: { $value: '8px', $type: 'spacing' },
              },
            },
            source: 'local',
          },
        },
        tokenSource: 'local',
      };

      mockStorage['project:test'] = oldData;

      const result = await adapter.load('test');

      expect(result.success).toBe(true);
      // Should have migrated all 3 tokens
      expect(result.data!.length).toBe(3);
    });

    it('should handle migration failure gracefully', async () => {
      const invalidData: TokenState = {
        tokenFiles: {
          'invalid.json': {
            name: 'invalid.json',
            path: 'invalid.json',
            content: null as any, // Invalid content
            source: 'local',
          },
        },
        tokenSource: 'local',
      };

      mockStorage['project:test'] = invalidData;

      // Mock backup failure
      (figma.clientStorage.setAsync as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));

      const result = await adapter.load('test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('backup');
    });
  });

  describe('load() - New ProjectStorage Format', () => {
    it('should load tokens from ProjectStorage directly', async () => {
      const token: Token = {
        id: 'token_1',
        name: 'primary',
        qualifiedName: 'color.primary',
        path: ['color', 'primary'],
        type: 'color' as TokenType,
        value: '#FF0000',
        rawValue: '#FF0000',
        projectId: 'test',
        collection: 'primitives',
        source: {
          type: 'local',
          location: 'test.json',
          imported: new Date().toISOString(),
        },
        sourceFormat: 'w3c',
        status: 'active',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        tags: ['color'],
        extensions: {},
      };

      const newData: ProjectStorage = {
        version: '2.0',
        projectId: 'test',
        tokens: [token],
        metadata: {
          lastSync: new Date().toISOString(),
          source: {
            type: 'local',
            location: 'test.json',
          },
          importStats: {
            added: 1,
            updated: 0,
            skipped: 0,
          },
        },
      };

      mockStorage['project:test'] = newData;

      const result = await adapter.load('test');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([token]);
    });

    it('should reject unsupported versions', async () => {
      const futureData = {
        version: '3.0',
        projectId: 'test',
        tokens: [],
        metadata: {},
      };

      mockStorage['project:test'] = futureData;

      const result = await adapter.load('test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported storage version');
    });
  });

  describe('save()', () => {
    it('should save tokens in ProjectStorage format', async () => {
      const token: Token = {
        id: 'token_1',
        name: 'primary',
        qualifiedName: 'color.primary',
        path: ['color', 'primary'],
        type: 'color' as TokenType,
        value: '#FF0000',
        rawValue: '#FF0000',
        projectId: 'test',
        collection: 'primitives',
        source: {
          type: 'local',
          location: 'test.json',
          imported: new Date().toISOString(),
        },
        sourceFormat: 'w3c',
        status: 'active',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        tags: ['color'],
        extensions: {},
      };

      const result = await adapter.save('test', [token]);

      expect(result.success).toBe(true);

      const saved = mockStorage['project:test'] as ProjectStorage;
      expect(saved.version).toBe('2.0');
      expect(saved.projectId).toBe('test');
      expect(saved.tokens).toHaveLength(1);
      expect(saved.metadata.lastSync).toBeDefined();
    });

    it('should enforce 1MB storage limit', async () => {
      // Create a large array of tokens to exceed 1MB
      const largeTokenArray: Token[] = [];
      for (let i = 0; i < 10000; i++) {
        largeTokenArray.push({
          id: `token_${i}`,
          name: `token${i}`,
          qualifiedName: `color.token${i}`,
          path: ['color', `token${i}`],
          type: 'color' as TokenType,
          value: '#FF0000',
          rawValue: '#FF0000',
          projectId: 'test',
          collection: 'primitives',
          source: {
            type: 'local',
            location: 'test.json',
            imported: new Date().toISOString(),
          },
          sourceFormat: 'w3c',
          status: 'active',
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          tags: ['color'],
          extensions: {},
        });
      }

      const result = await adapter.save('test', largeTokenArray);

      expect(result.success).toBe(false);
      expect(result.error).toContain('1MB limit');
    });

    it('should include source config in metadata', async () => {
      const token: Token = {
        id: 'token_1',
        name: 'primary',
        qualifiedName: 'color.primary',
        path: ['color', 'primary'],
        type: 'color' as TokenType,
        value: '#FF0000',
        rawValue: '#FF0000',
        projectId: 'test',
        collection: 'primitives',
        source: {
          type: 'github',
          location: 'owner/repo/tokens.json',
          imported: new Date().toISOString(),
          branch: 'main',
          commit: 'abc123',
        },
        sourceFormat: 'w3c',
        status: 'active',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        tags: ['color'],
        extensions: {},
      };

      await adapter.save('test', [token]);

      const saved = mockStorage['project:test'] as ProjectStorage;
      expect(saved.metadata.source.type).toBe('github');
      expect(saved.metadata.source.location).toBe('owner/repo/tokens.json');
      expect(saved.metadata.source.branch).toBe('main');
      expect(saved.metadata.source.commit).toBe('abc123');
    });
  });

  describe('restoreFromBackup()', () => {
    it('should restore from backup', async () => {
      const backupData: TokenState = {
        tokenFiles: {
          'test.json': {
            name: 'test.json',
            path: 'test.json',
            content: {
              color: { primary: { $value: '#FF0000' } },
            },
            source: 'local',
          },
        },
        tokenSource: 'local',
      };

      const timestamp = Date.now();
      mockStorage[`backup:test:${timestamp}`] = backupData;

      const result = await adapter.restoreFromBackup('test', timestamp);

      expect(result.success).toBe(true);
      expect(mockStorage['project:test']).toEqual(backupData);
    });

    it('should fail if backup not found', async () => {
      const result = await adapter.restoreFromBackup('test', 123456);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Backup not found');
    });
  });

  describe('Migration - Collection Inference', () => {
    it('should infer primitives collection from path', async () => {
      const oldData: TokenState = {
        tokenFiles: {
          'primitives.json': {
            name: 'primitives.json',
            path: 'tokens/primitives.json',
            content: {
              color: { primary: { $value: '#FF0000' } },
            },
            source: 'local',
          },
        },
        tokenSource: 'local',
      };

      mockStorage['project:test'] = oldData;

      const result = await adapter.load('test');

      expect(result.success).toBe(true);
      expect(result.data![0].collection).toBe('primitives');
    });

    it('should infer semantics collection from path', async () => {
      const oldData: TokenState = {
        tokenFiles: {
          'semantic.json': {
            name: 'semantic.json',
            path: 'tokens/semantic.json',
            content: {
              color: { primary: { $value: '#FF0000' } },
            },
            source: 'local',
          },
        },
        tokenSource: 'local',
      };

      mockStorage['project:test'] = oldData;

      const result = await adapter.load('test');

      expect(result.success).toBe(true);
      expect(result.data![0].collection).toBe('semantics');
    });

    it('should use filename as collection if no keyword found', async () => {
      const oldData: TokenState = {
        tokenFiles: {
          'colors.json': {
            name: 'colors.json',
            path: 'tokens/colors.json',
            content: {
              color: { primary: { $value: '#FF0000' } },
            },
            source: 'local',
          },
        },
        tokenSource: 'local',
      };

      mockStorage['project:test'] = oldData;

      const result = await adapter.load('test');

      expect(result.success).toBe(true);
      expect(result.data![0].collection).toBe('colors');
    });
  });
});

// ====================================================================================
// FILE SOURCE REGISTRY TESTS
// Comprehensive unit tests for FileSourceRegistry
// ====================================================================================

import { FileSourceRegistry } from '../../../core/registries/FileSourceRegistry';
import { IFileSource, FileSourceConfig } from '../../../core/interfaces/IFileSource';
import { Success } from '../../../shared/types';

// Mock file source for testing
class MockFileSource implements IFileSource {
  constructor(private sourceType: string) {}

  async fetchFileList(config: FileSourceConfig) {
    return Success([]);
  }

  async fetchFileContent(config: FileSourceConfig, filePath: string) {
    return Success({});
  }

  async fetchMultipleFiles(config: FileSourceConfig, filePaths: string[]) {
    return Success([]);
  }

  async validateConfig(config: FileSourceConfig) {
    return Success(true);
  }

  getSourceType(): string {
    return this.sourceType;
  }
}

describe('FileSourceRegistry', () => {
  // Clear registry before each test to ensure isolation
  beforeEach(() => {
    FileSourceRegistry.clear();
  });

  afterEach(() => {
    FileSourceRegistry.clear();
  });

  describe('register()', () => {
    test('should register a new file source', () => {
      const source = new MockFileSource('test');

      FileSourceRegistry.register(source);

      expect(FileSourceRegistry.has('test')).toBe(true);
      expect(FileSourceRegistry.count()).toBe(1);
    });

    test('should throw error when registering duplicate source type', () => {
      const source1 = new MockFileSource('github');
      const source2 = new MockFileSource('github');

      FileSourceRegistry.register(source1);

      expect(() => FileSourceRegistry.register(source2)).toThrow(
        "File source 'github' is already registered"
      );
    });

    test('should allow registering multiple different source types', () => {
      const github = new MockFileSource('github');
      const gitlab = new MockFileSource('gitlab');
      const local = new MockFileSource('local');

      FileSourceRegistry.register(github);
      FileSourceRegistry.register(gitlab);
      FileSourceRegistry.register(local);

      expect(FileSourceRegistry.count()).toBe(3);
      expect(FileSourceRegistry.has('github')).toBe(true);
      expect(FileSourceRegistry.has('gitlab')).toBe(true);
      expect(FileSourceRegistry.has('local')).toBe(true);
    });
  });

  describe('get()', () => {
    test('should retrieve registered source by type', () => {
      const source = new MockFileSource('github');
      FileSourceRegistry.register(source);

      const retrieved = FileSourceRegistry.get('github');

      expect(retrieved).toBe(source);
      expect(retrieved?.getSourceType()).toBe('github');
    });

    test('should return undefined for unregistered source type', () => {
      const retrieved = FileSourceRegistry.get('nonexistent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('has()', () => {
    test('should return true for registered source', () => {
      const source = new MockFileSource('github');
      FileSourceRegistry.register(source);

      expect(FileSourceRegistry.has('github')).toBe(true);
    });

    test('should return false for unregistered source', () => {
      expect(FileSourceRegistry.has('nonexistent')).toBe(false);
    });
  });

  describe('getRegisteredTypes()', () => {
    test('should return empty array when no sources registered', () => {
      const types = FileSourceRegistry.getRegisteredTypes();

      expect(types).toEqual([]);
    });

    test('should return all registered source types', () => {
      FileSourceRegistry.register(new MockFileSource('github'));
      FileSourceRegistry.register(new MockFileSource('gitlab'));
      FileSourceRegistry.register(new MockFileSource('local'));

      const types = FileSourceRegistry.getRegisteredTypes();

      expect(types).toHaveLength(3);
      expect(types).toContain('github');
      expect(types).toContain('gitlab');
      expect(types).toContain('local');
    });
  });

  describe('clear()', () => {
    test('should remove all registered sources', () => {
      FileSourceRegistry.register(new MockFileSource('github'));
      FileSourceRegistry.register(new MockFileSource('gitlab'));

      expect(FileSourceRegistry.count()).toBe(2);

      FileSourceRegistry.clear();

      expect(FileSourceRegistry.count()).toBe(0);
      expect(FileSourceRegistry.getRegisteredTypes()).toEqual([]);
    });
  });

  describe('count()', () => {
    test('should return 0 when no sources registered', () => {
      expect(FileSourceRegistry.count()).toBe(0);
    });

    test('should return correct count of registered sources', () => {
      FileSourceRegistry.register(new MockFileSource('github'));
      expect(FileSourceRegistry.count()).toBe(1);

      FileSourceRegistry.register(new MockFileSource('gitlab'));
      expect(FileSourceRegistry.count()).toBe(2);

      FileSourceRegistry.register(new MockFileSource('local'));
      expect(FileSourceRegistry.count()).toBe(3);
    });
  });
});

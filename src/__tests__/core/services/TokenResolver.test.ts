// ====================================================================================
// TOKEN RESOLVER TESTS
// Comprehensive unit tests for TokenResolver
// ====================================================================================

import { TokenResolver } from '../../../core/services/TokenResolver';
import { TokenRepository } from '../../../core/services/TokenRepository';
import { Token } from '../../../core/models/Token';

// Helper to create mock tokens
function createToken(overrides: Partial<Token>): Token {
  const now = new Date().toISOString();
  return {
    id: `token_${Math.random().toString(36).substr(2, 9)}`,
    path: ['test'],
    name: 'test',
    qualifiedName: 'test',
    type: 'string',
    rawValue: 'test',
    value: 'test',
    projectId: 'project1',
    collection: 'default',
    sourceFormat: 'w3c',
    source: {
      type: 'local',
      location: 'test.json',
      imported: now,
    },
    extensions: {},
    tags: [],
    status: 'active',
    created: now,
    lastModified: now,
    ...overrides,
  };
}

describe('TokenResolver', () => {
  let repository: TokenRepository;
  let resolver: TokenResolver;

  beforeEach(() => {
    repository = new TokenRepository();
    resolver = new TokenResolver(repository);
  });

  describe('resolveReference()', () => {
    it('should resolve exact reference', () => {
      const token = createToken({
        id: 'token1',
        projectId: 'project1',
        qualifiedName: 'color.primary',
        value: '#FF0000',
      });
      repository.add([token]);

      const resolved = resolver.resolveReference('color.primary', 'project1');

      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe('token1');
      expect(resolved?.value).toBe('#FF0000');
    });

    it('should resolve reference with braces', () => {
      const token = createToken({
        id: 'token1',
        qualifiedName: 'color.primary',
        projectId: 'project1',
      });
      repository.add([token]);

      const resolved = resolver.resolveReference('{color.primary}', 'project1');

      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe('token1');
    });

    it('should normalize slash references', () => {
      const token = createToken({
        id: 'token1',
        qualifiedName: 'color.primary',
        projectId: 'project1',
      });
      repository.add([token]);

      const resolved = resolver.resolveReference('color/primary', 'project1');

      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe('token1');
    });

    it('should handle case-insensitive matching', () => {
      const token = createToken({
        id: 'token1',
        qualifiedName: 'color.Primary',
        projectId: 'project1',
      });
      repository.add([token]);

      const resolved = resolver.resolveReference('COLOR.primary', 'project1');

      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe('token1');
    });

    it('should use exact cache on second call', () => {
      const token = createToken({
        id: 'token1',
        qualifiedName: 'color.primary',
        projectId: 'project1',
      });
      repository.add([token]);

      // First call - miss
      resolver.resolveReference('color.primary', 'project1');
      const stats1 = resolver.getStats();

      // Second call - should hit cache
      resolver.resolveReference('color.primary', 'project1');
      const stats2 = resolver.getStats();

      expect(stats2.cacheHits).toBe(stats1.cacheHits + 1);
      expect(stats2.totalResolutions).toBe(2);
    });

    it('should fuzzy match suffix', () => {
      const token = createToken({
        id: 'token1',
        qualifiedName: 'color.semantic.button.primary',
        projectId: 'project1',
      });
      repository.add([token]);

      const resolved = resolver.resolveReference('button.primary', 'project1');

      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe('token1');
    });

    it('should fuzzy match by name only', () => {
      const token = createToken({
        id: 'token1',
        name: 'primary',
        qualifiedName: 'color.semantic.button.primary',
        projectId: 'project1',
      });
      repository.add([token]);

      const resolved = resolver.resolveReference('primary', 'project1');

      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe('token1');
    });

    it('should return null for non-existent reference', () => {
      const resolved = resolver.resolveReference('nonexistent', 'project1');

      expect(resolved).toBeNull();
    });

    it('should cache null results for non-existent references', () => {
      resolver.resolveReference('nonexistent', 'project1');
      const stats1 = resolver.getStats();

      resolver.resolveReference('nonexistent', 'project1');
      const stats2 = resolver.getStats();

      expect(stats2.cacheHits).toBe(stats1.cacheHits + 1);
    });

    it('should track unresolved references', () => {
      resolver.resetStats();
      resolver.resolveReference('nonexistent', 'project1');

      const stats = resolver.getStats();
      expect(stats.unresolvedReferences).toBe(1);
    });

    it('should isolate by project', () => {
      const token1 = createToken({
        id: 'token1',
        projectId: 'project1',
        qualifiedName: 'color.primary',
        value: '#FF0000',
      });
      const token2 = createToken({
        id: 'token2',
        projectId: 'project2',
        qualifiedName: 'color.primary',
        value: '#00FF00',
      });
      repository.add([token1, token2]);

      const resolved1 = resolver.resolveReference('color.primary', 'project1');
      const resolved2 = resolver.resolveReference('color.primary', 'project2');

      expect(resolved1?.value).toBe('#FF0000');
      expect(resolved2?.value).toBe('#00FF00');
    });
  });

  describe('resolveAllTokens()', () => {
    it('should resolve all non-alias tokens', async () => {
      const tokens = [
        createToken({
          id: 'token1',
          projectId: 'project1',
          value: '#FF0000',
        }),
        createToken({
          id: 'token2',
          projectId: 'project1',
          value: '16px',
        }),
      ];
      repository.add(tokens);

      const result = await resolver.resolveAllTokens('project1');

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe(2);
      expect(result.data?.get('token1')).toBe('#FF0000');
      expect(result.data?.get('token2')).toBe('16px');
    });

    it('should resolve simple alias chain', async () => {
      const tokens = [
        createToken({
          id: 'token1',
          projectId: 'project1',
          value: '#FF0000',
        }),
        createToken({
          id: 'token2',
          projectId: 'project1',
          value: '{token1}',
          aliasTo: 'token1',
        }),
      ];
      repository.add(tokens);

      const result = await resolver.resolveAllTokens('project1');

      expect(result.success).toBe(true);
      expect(result.data?.get('token2')).toBe('#FF0000'); // Resolved to token1's value
    });

    it('should resolve multi-level alias chain', async () => {
      const tokens = [
        createToken({
          id: 'token1',
          projectId: 'project1',
          value: '#FF0000',
        }),
        createToken({
          id: 'token2',
          projectId: 'project1',
          value: '{token1}',
          aliasTo: 'token1',
        }),
        createToken({
          id: 'token3',
          projectId: 'project1',
          value: '{token2}',
          aliasTo: 'token2',
        }),
      ];
      repository.add(tokens);

      const result = await resolver.resolveAllTokens('project1');

      expect(result.success).toBe(true);
      expect(result.data?.get('token3')).toBe('#FF0000'); // Resolved through chain
    });

    it('should handle unresolved aliases gracefully', async () => {
      const tokens = [
        createToken({
          id: 'token1',
          projectId: 'project1',
          value: '{nonexistent}',
          aliasTo: 'nonexistent',
        }),
      ];
      repository.add(tokens);

      const result = await resolver.resolveAllTokens('project1');

      expect(result.success).toBe(true);
      expect(result.data?.get('token1')).toBe('{nonexistent}'); // Falls back to raw value
    });

    it('should handle circular references without infinite loop', async () => {
      const tokens = [
        createToken({
          id: 'token1',
          projectId: 'project1',
          value: '{token2}',
          aliasTo: 'token2',
        }),
        createToken({
          id: 'token2',
          projectId: 'project1',
          value: '{token1}',
          aliasTo: 'token1',
        }),
      ];
      repository.add(tokens);

      const result = await resolver.resolveAllTokens('project1');

      expect(result.success).toBe(true);
      // Should break cycle and return some value (not infinite loop)
      expect(result.data?.size).toBe(2);
    });

    it('should resolve tokens in dependency order', async () => {
      // token3 depends on token2 depends on token1
      const tokens = [
        createToken({
          id: 'token3',
          projectId: 'project1',
          value: '{token2}',
          aliasTo: 'token2',
        }),
        createToken({
          id: 'token1',
          projectId: 'project1',
          value: '#FF0000',
        }),
        createToken({
          id: 'token2',
          projectId: 'project1',
          value: '{token1}',
          aliasTo: 'token1',
        }),
      ];
      repository.add(tokens);

      const result = await resolver.resolveAllTokens('project1');

      expect(result.success).toBe(true);
      expect(result.data?.get('token1')).toBe('#FF0000');
      expect(result.data?.get('token2')).toBe('#FF0000');
      expect(result.data?.get('token3')).toBe('#FF0000');
    });
  });

  describe('detectCircularReferences()', () => {
    it('should detect simple circular reference', () => {
      const tokens = [
        createToken({
          id: 'token1',
          projectId: 'project1',
          aliasTo: 'token2',
        }),
        createToken({
          id: 'token2',
          projectId: 'project1',
          aliasTo: 'token1',
        }),
      ];
      repository.add(tokens);

      const cycles = resolver.detectCircularReferences('project1');

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0].cycle).toContain('token1');
      expect(cycles[0].cycle).toContain('token2');
    });

    it('should detect complex circular reference', () => {
      const tokens = [
        createToken({
          id: 'token1',
          projectId: 'project1',
          aliasTo: 'token2',
        }),
        createToken({
          id: 'token2',
          projectId: 'project1',
          aliasTo: 'token3',
        }),
        createToken({
          id: 'token3',
          projectId: 'project1',
          aliasTo: 'token1',
        }),
      ];
      repository.add(tokens);

      const cycles = resolver.detectCircularReferences('project1');

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should return empty array if no circular references', () => {
      const tokens = [
        createToken({
          id: 'token1',
          projectId: 'project1',
          value: '#FF0000',
        }),
        createToken({
          id: 'token2',
          projectId: 'project1',
          aliasTo: 'token1',
        }),
      ];
      repository.add(tokens);

      const cycles = resolver.detectCircularReferences('project1');

      expect(cycles).toEqual([]);
    });

    it('should track circular reference count', async () => {
      const tokens = [
        createToken({
          id: 'token1',
          projectId: 'project1',
          aliasTo: 'token2',
        }),
        createToken({
          id: 'token2',
          projectId: 'project1',
          aliasTo: 'token1',
        }),
      ];
      repository.add(tokens);

      resolver.resetStats();
      await resolver.resolveAllTokens('project1');

      const stats = resolver.getStats();
      expect(stats.circularReferences).toBeGreaterThan(0);
    });
  });

  describe('clearCache()', () => {
    it('should clear all caches', () => {
      const token = createToken({
        id: 'token1',
        qualifiedName: 'color.primary',
        projectId: 'project1',
      });
      repository.add([token]);

      // Prime caches
      resolver.resolveReference('color.primary', 'project1');

      // Clear
      resolver.clearCache();
      resolver.resetStats();

      // Should miss cache
      resolver.resolveReference('color.primary', 'project1');
      const stats = resolver.getStats();

      expect(stats.cacheMisses).toBe(1);
      expect(stats.cacheHits).toBe(0);
    });
  });

  describe('getStats() and resetStats()', () => {
    it('should track resolution statistics', () => {
      const token = createToken({
        id: 'token1',
        qualifiedName: 'color.primary',
        projectId: 'project1',
      });
      repository.add([token]);

      resolver.resetStats();

      // First resolution - cache miss
      resolver.resolveReference('color.primary', 'project1');
      // Second resolution - cache hit
      resolver.resolveReference('color.primary', 'project1');

      const stats = resolver.getStats();

      expect(stats.totalResolutions).toBe(2);
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.cacheHitRate).toBe(0.5);
    });

    it('should reset statistics', () => {
      const token = createToken({
        id: 'token1',
        qualifiedName: 'color.primary',
        projectId: 'project1',
      });
      repository.add([token]);

      resolver.resolveReference('color.primary', 'project1');
      resolver.resetStats();

      const stats = resolver.getStats();

      expect(stats.totalResolutions).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.cacheHitRate).toBe(0);
    });

    it('should calculate cache hit rate correctly', () => {
      const token = createToken({
        id: 'token1',
        qualifiedName: 'color.primary',
        projectId: 'project1',
      });
      repository.add([token]);

      resolver.resetStats();

      // 1 miss + 3 hits = 75% hit rate
      resolver.resolveReference('color.primary', 'project1'); // miss
      resolver.resolveReference('color.primary', 'project1'); // hit
      resolver.resolveReference('color.primary', 'project1'); // hit
      resolver.resolveReference('color.primary', 'project1'); // hit

      const stats = resolver.getStats();

      expect(stats.cacheHitRate).toBe(0.75);
    });
  });
});

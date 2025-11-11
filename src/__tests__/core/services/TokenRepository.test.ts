// ====================================================================================
// TOKEN REPOSITORY TESTS
// Comprehensive unit tests for TokenRepository
// ====================================================================================

import { TokenRepository } from '../../../core/services/TokenRepository';
import { Token, TokenType } from '../../../core/models/Token';

// Helper function to create mock tokens
function createMockToken(overrides: Partial<Token>): Token {
  const now = new Date().toISOString();
  return {
    id: `token_${Math.random().toString(36).substr(2, 9)}`,
    path: ['color', 'primary'],
    name: 'primary',
    qualifiedName: 'color.primary',
    type: 'color' as TokenType,
    rawValue: '#FF0000',
    value: '#FF0000',
    projectId: 'project1',
    collection: 'primitives',
    sourceFormat: 'w3c' as const,
    source: {
      type: 'local' as const,
      location: 'tokens.json',
      imported: now,
    },
    extensions: {},
    tags: [],
    status: 'active' as const,
    created: now,
    lastModified: now,
    ...overrides,
  };
}

describe('TokenRepository', () => {
  let repository: TokenRepository;

  beforeEach(() => {
    repository = new TokenRepository();
  });

  describe('generateTokenId()', () => {
    it('should generate consistent IDs for same input', () => {
      const id1 = repository.generateTokenId('project1', ['color', 'primary']);
      const id2 = repository.generateTokenId('project1', ['color', 'primary']);

      expect(id1).toBe(id2);
      expect(id1).toMatch(/^token_/);
    });

    it('should generate different IDs for different inputs', () => {
      const id1 = repository.generateTokenId('project1', ['color', 'primary']);
      const id2 = repository.generateTokenId('project1', ['color', 'secondary']);
      const id3 = repository.generateTokenId('project2', ['color', 'primary']);

      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
    });
  });

  describe('add()', () => {
    it('should add tokens to repository', () => {
      const token = createMockToken({ id: 'token1' });

      const result = repository.add([token]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(repository.count()).toBe(1);
    });

    it('should add multiple tokens', () => {
      const tokens = [
        createMockToken({ id: 'token1' }),
        createMockToken({ id: 'token2' }),
        createMockToken({ id: 'token3' }),
      ];

      const result = repository.add(tokens);

      expect(result.success).toBe(true);
      expect(result.data).toBe(3);
      expect(repository.count()).toBe(3);
    });

    it('should update existing token', () => {
      const token = createMockToken({ id: 'token1', value: '#FF0000' });
      repository.add([token]);

      const updated = createMockToken({ id: 'token1', value: '#00FF00' });
      const result = repository.add([updated]);

      expect(result.success).toBe(true);
      expect(repository.get('token1')?.value).toBe('#00FF00');
      expect(repository.count()).toBe(1); // Same token, not added twice
    });

    it('should skip tokens with missing required fields', () => {
      const invalid = createMockToken({ id: '', projectId: '' });
      const valid = createMockToken({ id: 'token1' });

      repository.add([invalid, valid]);

      expect(repository.count()).toBe(1); // Only valid token added
    });
  });

  describe('get()', () => {
    it('should retrieve token by ID', () => {
      const token = createMockToken({ id: 'token1' });
      repository.add([token]);

      const retrieved = repository.get('token1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('token1');
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = repository.get('nonexistent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getByQualifiedName()', () => {
    it('should retrieve token by qualified name', () => {
      const token = createMockToken({
        id: 'token1',
        projectId: 'project1',
        path: ['color', 'semantic', 'button', 'primary'],
        qualifiedName: 'color.semantic.button.primary',
      });
      repository.add([token]);

      const retrieved = repository.getByQualifiedName('project1', 'color.semantic.button.primary');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('token1');
    });

    it('should return undefined for non-existent qualified name', () => {
      const retrieved = repository.getByQualifiedName('project1', 'nonexistent');

      expect(retrieved).toBeUndefined();
    });

    it('should isolate by project', () => {
      const token1 = createMockToken({
        id: 'token1',
        projectId: 'project1',
        qualifiedName: 'color.primary',
      });
      const token2 = createMockToken({
        id: 'token2',
        projectId: 'project2',
        qualifiedName: 'color.primary',
      });
      repository.add([token1, token2]);

      const retrieved1 = repository.getByQualifiedName('project1', 'color.primary');
      const retrieved2 = repository.getByQualifiedName('project2', 'color.primary');

      expect(retrieved1?.id).toBe('token1');
      expect(retrieved2?.id).toBe('token2');
    });
  });

  describe('getByPath()', () => {
    it('should retrieve token by path', () => {
      const token = createMockToken({
        id: 'token1',
        projectId: 'project1',
        path: ['color', 'primary'],
        qualifiedName: 'color.primary',
      });
      repository.add([token]);

      const retrieved = repository.getByPath('project1', ['color', 'primary']);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('token1');
    });
  });

  describe('getByProject()', () => {
    it('should retrieve all tokens for a project', () => {
      const tokens = [
        createMockToken({ id: 'token1', projectId: 'project1' }),
        createMockToken({ id: 'token2', projectId: 'project1' }),
        createMockToken({ id: 'token3', projectId: 'project2' }),
      ];
      repository.add(tokens);

      const project1Tokens = repository.getByProject('project1');

      expect(project1Tokens).toHaveLength(2);
      expect(project1Tokens.map(t => t.id)).toContain('token1');
      expect(project1Tokens.map(t => t.id)).toContain('token2');
    });

    it('should return empty array for non-existent project', () => {
      const tokens = repository.getByProject('nonexistent');

      expect(tokens).toEqual([]);
    });
  });

  describe('getByType()', () => {
    it('should retrieve all tokens of a specific type', () => {
      const tokens = [
        createMockToken({ id: 'token1', type: 'color' }),
        createMockToken({ id: 'token2', type: 'color' }),
        createMockToken({ id: 'token3', type: 'dimension' }),
      ];
      repository.add(tokens);

      const colorTokens = repository.getByType('color');

      expect(colorTokens).toHaveLength(2);
      expect(colorTokens.map(t => t.id)).toContain('token1');
      expect(colorTokens.map(t => t.id)).toContain('token2');
    });
  });

  describe('query()', () => {
    beforeEach(() => {
      const tokens = [
        createMockToken({
          id: 'token1',
          projectId: 'project1',
          path: ['color', 'primary'],
          qualifiedName: 'color.primary',
          type: 'color',
          collection: 'primitives',
          theme: 'light',
          tags: ['primary'],
          status: 'active',
        }),
        createMockToken({
          id: 'token2',
          projectId: 'project1',
          path: ['spacing', 'small'],
          qualifiedName: 'spacing.small',
          type: 'dimension',
          collection: 'primitives',
          tags: ['spacing'],
          status: 'active',
        }),
        createMockToken({
          id: 'token3',
          projectId: 'project2',
          path: ['color', 'secondary'],
          qualifiedName: 'color.secondary',
          type: 'color',
          collection: 'semantic',
          theme: 'dark',
          tags: ['secondary'],
          status: 'deprecated',
          aliasTo: 'token1',
        }),
      ];
      repository.add(tokens);
    });

    it('should query by project', () => {
      const results = repository.query({ projectId: 'project1' });

      expect(results).toHaveLength(2);
      expect(results.map(t => t.id)).toContain('token1');
      expect(results.map(t => t.id)).toContain('token2');
    });

    it('should query by type', () => {
      const results = repository.query({ type: 'color' });

      expect(results).toHaveLength(2);
      expect(results.every(t => t.type === 'color')).toBe(true);
    });

    it('should query by multiple types', () => {
      const results = repository.query({ types: ['color', 'dimension'] });

      expect(results).toHaveLength(3);
    });

    it('should query by collection', () => {
      const results = repository.query({ collection: 'primitives' });

      expect(results).toHaveLength(2);
      expect(results.every(t => t.collection === 'primitives')).toBe(true);
    });

    it('should query by theme', () => {
      const results = repository.query({ theme: 'light' });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('token1');
    });

    it('should query by tags', () => {
      const results = repository.query({ tags: ['primary'] });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('token1');
    });

    it('should query by status', () => {
      const results = repository.query({ status: 'deprecated' });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('token3');
    });

    it('should query by isAlias', () => {
      const aliases = repository.query({ isAlias: true });
      const nonAliases = repository.query({ isAlias: false });

      expect(aliases).toHaveLength(1);
      expect(aliases[0].id).toBe('token3');
      expect(nonAliases).toHaveLength(2);
    });

    it('should query by IDs', () => {
      const results = repository.query({ ids: ['token1', 'token3'] });

      expect(results).toHaveLength(2);
      expect(results.map(t => t.id)).toContain('token1');
      expect(results.map(t => t.id)).toContain('token3');
    });

    it('should combine multiple filters', () => {
      const results = repository.query({
        projectId: 'project1',
        type: 'color',
        collection: 'primitives',
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('token1');
    });

    it('should query by path prefix', () => {
      const token = createMockToken({
        id: 'token4',
        path: ['color', 'semantic', 'button', 'primary'],
        qualifiedName: 'color.semantic.button.primary',
      });
      repository.add([token]);

      const results = repository.query({ pathPrefix: ['color', 'semantic'] });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('token4');
    });
  });

  describe('update()', () => {
    it('should update token fields', () => {
      const token = createMockToken({ id: 'token1', value: '#FF0000' });
      repository.add([token]);

      const result = repository.update('token1', { value: '#00FF00' });

      expect(result.success).toBe(true);
      expect(result.data?.value).toBe('#00FF00');
      expect(repository.get('token1')?.value).toBe('#00FF00');
    });

    it('should preserve ID and created timestamp', () => {
      const token = createMockToken({ id: 'token1', created: '2024-01-01T00:00:00Z' });
      repository.add([token]);

      const result = repository.update('token1', { value: '#00FF00' });

      expect(result.data?.id).toBe('token1');
      expect(result.data?.created).toBe('2024-01-01T00:00:00Z');
    });

    it('should update lastModified timestamp', async () => {
      const token = createMockToken({ id: 'token1', lastModified: '2024-01-01T00:00:00.000Z' });
      repository.add([token]);

      // Wait 1ms to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 1));
      const result = repository.update('token1', { value: '#00FF00' });

      expect(result.data?.lastModified).not.toBe('2024-01-01T00:00:00.000Z');
      expect(new Date(result.data!.lastModified).getTime()).toBeGreaterThan(new Date('2024-01-01T00:00:00.000Z').getTime());
    });

    it('should update indexes when type changes', () => {
      const token = createMockToken({ id: 'token1', type: 'color' });
      repository.add([token]);

      repository.update('token1', { type: 'dimension' });

      const colorTokens = repository.getByType('color');
      const dimensionTokens = repository.getByType('dimension');

      expect(colorTokens).toHaveLength(0);
      expect(dimensionTokens).toHaveLength(1);
    });

    it('should return failure for non-existent token', () => {
      const result = repository.update('nonexistent', { value: '#00FF00' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('remove()', () => {
    it('should remove tokens by IDs', () => {
      const tokens = [
        createMockToken({ id: 'token1' }),
        createMockToken({ id: 'token2' }),
        createMockToken({ id: 'token3' }),
      ];
      repository.add(tokens);

      const result = repository.remove(['token1', 'token3']);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
      expect(repository.count()).toBe(1);
      expect(repository.get('token1')).toBeUndefined();
      expect(repository.get('token2')).toBeDefined();
      expect(repository.get('token3')).toBeUndefined();
    });

    it('should handle removing non-existent tokens', () => {
      const result = repository.remove(['nonexistent']);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    it('should remove from indexes', () => {
      const token = createMockToken({ id: 'token1', projectId: 'project1' });
      repository.add([token]);

      repository.remove(['token1']);

      const projectTokens = repository.getByProject('project1');
      expect(projectTokens).toHaveLength(0);
    });
  });

  describe('removeProject()', () => {
    it('should remove all tokens for a project', () => {
      const tokens = [
        createMockToken({ id: 'token1', projectId: 'project1' }),
        createMockToken({ id: 'token2', projectId: 'project1' }),
        createMockToken({ id: 'token3', projectId: 'project2' }),
      ];
      repository.add(tokens);

      const result = repository.removeProject('project1');

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
      expect(repository.count()).toBe(1);
      expect(repository.get('token3')).toBeDefined();
    });
  });

  describe('getReferencingTokens()', () => {
    it('should return tokens that reference a target token', () => {
      const tokens = [
        createMockToken({ id: 'token1' }),
        createMockToken({ id: 'token2', aliasTo: 'token1' }),
        createMockToken({ id: 'token3', aliasTo: 'token1' }),
      ];
      repository.add(tokens);

      const referrers = repository.getReferencingTokens('token1');

      expect(referrers).toHaveLength(2);
      expect(referrers.map(t => t.id)).toContain('token2');
      expect(referrers.map(t => t.id)).toContain('token3');
    });

    it('should return empty array if no tokens reference target', () => {
      const token = createMockToken({ id: 'token1' });
      repository.add([token]);

      const referrers = repository.getReferencingTokens('token1');

      expect(referrers).toEqual([]);
    });
  });

  describe('getStats()', () => {
    it('should return repository statistics', () => {
      const tokens = [
        createMockToken({ id: 'token1', projectId: 'project1', type: 'color', collection: 'primitives' }),
        createMockToken({ id: 'token2', projectId: 'project1', type: 'dimension', collection: 'primitives' }),
        createMockToken({ id: 'token3', projectId: 'project2', type: 'color', collection: 'semantic', aliasTo: 'token1' }),
      ];
      repository.add(tokens);

      const stats = repository.getStats();

      expect(stats.totalTokens).toBe(3);
      expect(stats.byProject['project1']).toBe(2);
      expect(stats.byProject['project2']).toBe(1);
      expect(stats.byType['color']).toBe(2);
      expect(stats.byType['dimension']).toBe(1);
      expect(stats.byCollection['primitives']).toBe(2);
      expect(stats.byCollection['semantic']).toBe(1);
      expect(stats.aliasCount).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should remove all tokens', () => {
      const tokens = [
        createMockToken({ id: 'token1' }),
        createMockToken({ id: 'token2' }),
      ];
      repository.add(tokens);

      repository.clear();

      expect(repository.count()).toBe(0);
      expect(repository.getStats().totalTokens).toBe(0);
    });
  });

  describe('count()', () => {
    it('should return correct token count', () => {
      expect(repository.count()).toBe(0);

      const tokens = [
        createMockToken({ id: 'token1' }),
        createMockToken({ id: 'token2' }),
        createMockToken({ id: 'token3' }),
      ];
      repository.add(tokens);

      expect(repository.count()).toBe(3);
    });
  });
});

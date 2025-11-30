/**
 * Integration Tests for GetTokensUseCase
 *
 * These tests verify token query functionality
 * using real repository operations.
 */

import { GetTokensUseCase } from '../../application/use-cases/GetTokensUseCase';
import { InMemoryTokenRepository } from '../../infrastructure/storage/InMemoryTokenRepository';
import { Token } from '../../core/models/Token';

// Helper function to create test tokens
function createTestToken(overrides: Partial<Token> = {}): Token {
  const defaults = {
    id: `token-${Math.random().toString(36).substr(2, 9)}`,
    name: 'test-token',
    path: ['test', 'token'],
    qualifiedName: 'test.token',
    projectId: 'test-project',
    collection: 'test',
    sourceFormat: 'w3c' as const,
    source: { type: 'local' as const, location: 'test.json', imported: new Date().toISOString() },
    tags: [],
    status: 'active' as const,
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    extensions: {},
    type: 'color' as const,
    value: { hex: '#000000' },
    rawValue: '#000000'
  };
  return { ...defaults, ...overrides } as Token;
}

describe('GetTokensUseCase Integration Tests', () => {
  let useCase: GetTokensUseCase;
  let repository: InMemoryTokenRepository;

  beforeEach(() => {
    // Setup infrastructure
    repository = new InMemoryTokenRepository();
    useCase = new GetTokensUseCase(repository);

    // Seed repository with test data
    const testTokens: Token[] = [
      {
        id: 'token-1',
        name: 'blue500',
        path: ['color', 'blue', '500'],
        qualifiedName: 'color.blue.500',
        type: 'color',
        value: { hex: '#0066CC' },
        rawValue: '#0066CC',
        projectId: 'test-project',
        collection: 'primitives',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'tokens/primitives.json', imported: new Date().toISOString() },
        tags: [],
        status: 'active',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        extensions: {}
      } as any,
      {
        id: 'token-2',
        name: 'blue100',
        path: ['color', 'blue', '100'],
        qualifiedName: 'color.blue.100',
        type: 'color',
        value: { hex: '#E6F2FF' },
        rawValue: '#E6F2FF',
        projectId: 'test-project',
        collection: 'primitives',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'tokens/primitives.json', imported: new Date().toISOString() },
        tags: [],
        status: 'active',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        extensions: {}
      } as any,
      {
        id: 'token-3',
        name: 'primary',
        path: ['color', 'primary'],
        qualifiedName: 'color.primary',
        type: 'color',
        value: { hex: '#0066CC' },
        rawValue: '{color.blue.500}',
        projectId: 'test-project',
        collection: 'semantic',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'tokens/semantic.json', imported: new Date().toISOString() },
        tags: [],
        status: 'active',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        extensions: {}
      } as any,
      {
        id: 'token-4',
        name: 'sm',
        path: ['spacing', 'sm'],
        qualifiedName: 'spacing.sm',
        type: 'dimension',
        value: { value: 8, unit: 'px' },
        rawValue: '8px',
        projectId: 'test-project',
        collection: 'primitives',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'tokens/primitives.json', imported: new Date().toISOString() },
        tags: [],
        status: 'active',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        extensions: {}
      } as any,
      {
        id: 'token-5',
        name: 'md',
        path: ['spacing', 'md'],
        qualifiedName: 'spacing.md',
        type: 'dimension',
        value: { value: 16, unit: 'px' },
        rawValue: '16px',
        projectId: 'test-project',
        collection: 'primitives',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'tokens/primitives.json', imported: new Date().toISOString() },
        tags: [],
        status: 'active',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        extensions: {}
      } as any
    ];

    repository.saveMany(testTokens);
  });

  describe('Query All Tokens', () => {
    it('should return all tokens when no criteria specified', async () => {
      // Arrange
      const input = {};

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(5);
        expect(result.data!.total).toBe(5);
      }
    });

    it('should include metadata in response', async () => {
      // Arrange
      const input = {};

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.filters).toBeDefined();
        expect(result.data!.tokens).toHaveLength(5);
        // Verify we have both collections
        const collections = new Set(result.data!.tokens.map(t => t.collection));
        expect(collections).toContain('primitives');
        expect(collections).toContain('semantic');
      }
    });
  });

  describe('Query by Collection', () => {
    it('should filter tokens by collection', async () => {
      // Arrange
      const input = {
        collection: 'primitives'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(4); // 2 colors + 2 spacing
        result.data!.tokens.forEach(token => {
          expect(token.collection).toBe('primitives');
        });
      }
    });

    it('should return empty array for non-existent collection', async () => {
      // Arrange
      const input = {
        collection: 'non-existent'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(0);
        expect(result.data!.total).toBe(0);
      }
    });

    it('should handle semantic collection', async () => {
      // Arrange
      const input = {
        collection: 'semantic'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(1);
        expect(result.data!.tokens[0].name).toBe('primary');
        expect(result.data!.tokens[0].value).toContain('{'); // Reference
      }
    });
  });

  describe('Query by Type', () => {
    it('should filter tokens by type', async () => {
      // Arrange
      const input = {
        type: 'color'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(3); // 2 primitive + 1 semantic
        result.data!.tokens.forEach(token => {
          expect(token.type).toBe('color');
        });
      }
    });

    it('should filter dimension tokens', async () => {
      // Arrange
      const input = {
        type: 'dimension'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(2); // sm + md
        result.data!.tokens.forEach(token => {
          expect(token.type).toBe('dimension');
        });
      }
    });
  });

  describe('Search Tokens', () => {
    it('should search tokens by name', async () => {
      // Arrange
      const input = {
        search: 'blue'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens.length).toBeGreaterThan(0);
        result.data!.tokens.forEach(token => {
          expect(token.name.toLowerCase()).toContain('blue');
        });
      }
    });

    it('should search tokens by path', async () => {
      // Arrange
      const input = {
        search: 'spacing'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(2); // sm + md
        result.data!.tokens.forEach(token => {
          expect(token.path).toContain('spacing');
        });
      }
    });

    it('should be case-insensitive', async () => {
      // Arrange
      const input = {
        search: 'PRIMARY'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens.length).toBeGreaterThan(0);
        const primaryToken = result.data!.tokens.find(t => t.name === 'primary');
        expect(primaryToken).toBeDefined();
      }
    });

    it('should return empty array for no matches', async () => {
      // Arrange
      const input = {
        search: 'nonexistent'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(0);
      }
    });
  });

  describe('Combined Criteria', () => {
    it('should filter by collection and type', async () => {
      // Arrange
      const input = {
        collection: 'primitives',
        type: 'color'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(2); // blue500 + blue100
        result.data!.tokens.forEach(token => {
          expect(token.collection).toBe('primitives');
          expect(token.type).toBe('color');
        });
      }
    });

    it('should combine type and search', async () => {
      // Arrange
      const input = {
        type: 'color',
        search: 'blue'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(2); // blue500 + blue100
        result.data!.tokens.forEach(token => {
          expect(token.type).toBe('color');
          expect(token.name).toContain('blue');
        });
      }
    });

    it('should combine all criteria', async () => {
      // Arrange
      const input = {
        collection: 'primitives',
        type: 'dimension',
        search: 'sm'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(1); // Only spacing.sm
        expect(result.data!.tokens[0].name).toBe('sm');
      }
    });
  });

  describe('Get Token by ID', () => {
    it('should get single token by searching for it', async () => {
      // Arrange - Search for a specific token by name
      const input = {
        search: 'blue500'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens.length).toBeGreaterThan(0);
        const found = result.data!.tokens.find(t => t.name === 'blue500');
        expect(found).toBeDefined();
        expect(found?.id).toBe('token-1');
      }
    });

    it('should return empty for non-existent search', async () => {
      // Arrange
      const input = {
        search: 'non-existent-token-name'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty repository', async () => {
      // Arrange - Create new empty repository
      const emptyRepo = new InMemoryTokenRepository();
      const emptyUseCase = new GetTokensUseCase(emptyRepo);

      const input = {};

      // Act
      const result = await emptyUseCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(0);
        expect(result.data!.total).toBe(0);
        expect(result.data!.filters).toBeDefined();
      }
    });

    it('should handle special characters in search', async () => {
      // Arrange
      const specialToken = createTestToken({
        id: 'token-special',
        name: 'color-primary-100',
        path: ['color', 'primary-100'],
        qualifiedName: 'color.primary-100',
        type: 'color',
        value: { hex: '#000000' },
        rawValue: '#000'
      });

      repository.save(specialToken);

      const input = {
        search: 'primary-100'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens.length).toBeGreaterThan(0);
        const found = result.data!.tokens.find(t => t.id === 'token-special');
        expect(found).toBeDefined();
      }
    });
  });

  describe('Performance', () => {
    it('should query large token sets efficiently', async () => {
      // Arrange - Add 500 more tokens
      const largeTokenSet: Token[] = Array.from({ length: 500 }, (_, i) =>
        createTestToken({
          id: `token-large-${i}`,
          name: `color${i}`,
          path: ['color', 'large', `color${i}`],
          qualifiedName: `color.large.color${i}`,
          type: 'color',
          value: { hex: `#${i.toString(16).padStart(6, '0')}` },
          rawValue: `#${i.toString(16).padStart(6, '0')}`,
          collection: 'large-set'
        })
      );

      repository.saveMany(largeTokenSet);

      const input = {
        collection: 'large-set'
      };

      // Act
      const startTime = Date.now();
      const result = await useCase.execute(input);
      const endTime = Date.now();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toHaveLength(500);
        // Should complete quickly (< 100ms for query)
        expect(endTime - startTime).toBeLessThan(100);
      }
    });

    it('should handle search on large datasets', async () => {
      // Arrange - Repository already has 505 tokens (5 + 500)
      const input = {
        search: 'blue'
      };

      // Act
      const startTime = Date.now();
      const result = await useCase.execute(input);
      const endTime = Date.now();

      // Assert
      expect(result.success).toBe(true);
      // Should complete quickly even with search
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should support typical UI filtering workflow', async () => {
      // Scenario: User selects collection, then type, then searches

      // Step 1: Select primitives collection
      let result = await useCase.execute({
        collection: 'primitives'
      });
      expect(result.success).toBe(true);
      const primitivesCount = result.success ? result.data!.tokens.length : 0;

      // Step 2: Further filter by color type
      result = await useCase.execute({
        collection: 'primitives',
        type: 'color'
      });
      expect(result.success).toBe(true);
      const colorCount = result.success ? result.data!.tokens.length : 0;
      expect(colorCount).toBeLessThan(primitivesCount);

      // Step 3: Search within filtered set
      result = await useCase.execute({
        collection: 'primitives',
        type: 'color',
        search: 'blue'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens.length).toBeLessThanOrEqual(colorCount);
        result.data!.tokens.forEach(token => {
          expect(token.collection).toBe('primitives');
          expect(token.type).toBe('color');
          expect(token.name).toContain('blue');
        });
      }
    });

    it('should return metadata useful for UI dropdowns', async () => {
      // Arrange
      const input = {};

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        // Should return all tokens for UI to extract metadata
        expect(result.data!.tokens.length).toBeGreaterThan(0);

        // Collections available
        const collections = new Set(result.data!.tokens.map(t => t.collection));
        expect(collections).toContain('primitives');
        expect(collections).toContain('semantic');

        // Token types available
        const types = new Set(result.data!.tokens.map(t => t.type));
        expect(types).toContain('color');
        expect(types).toContain('dimension');

        // Count for display
        expect(result.data!.total).toBeGreaterThan(0);
      }
    });
  });
});

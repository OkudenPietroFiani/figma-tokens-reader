/**
 * Integration Tests for ImportTokensUseCase
 *
 * These tests verify end-to-end token import functionality
 * using real test data and minimal mocking.
 */

import { ImportTokensUseCase } from '../../application/use-cases/ImportTokensUseCase';
import { TokenParserRegistry } from '../../infrastructure/input/TokenParserRegistry';
import { W3CTokenParser } from '../../infrastructure/input/W3CTokenParser';
import { InMemoryTokenRepository } from '../../infrastructure/storage/InMemoryTokenRepository';
import { TokenData } from '../../shared/types';

describe('ImportTokensUseCase Integration Tests', () => {
  let useCase: ImportTokensUseCase;
  let parserRegistry: TokenParserRegistry;
  let repository: InMemoryTokenRepository;

  beforeEach(() => {
    // Setup infrastructure
    parserRegistry = new TokenParserRegistry();
    parserRegistry.register(new W3CTokenParser());

    repository = new InMemoryTokenRepository();

    // Create use case with real dependencies
    useCase = new ImportTokensUseCase(parserRegistry, repository);
  });

  describe('W3C Token Import', () => {
    it('should import primitive color tokens', async () => {
      // Arrange
      const tokenData: TokenData = {
        color: {
          primary: {
            $type: 'color',
            $value: '#0066CC'
          },
          secondary: {
            $type: 'color',
            $value: '#FF6600'
          }
        }
      };

      const input = {
        data: tokenData,
        projectId: 'test-project',
        collection: 'primitives',
        filePath: 'tokens/primitives.json'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.count).toBe(2);
        expect(result.data!.tokens).toHaveLength(2);

        const primaryToken = result.data!.tokens.find(t => t.name === 'primary');
        expect(primaryToken).toBeDefined();
        expect(primaryToken?.type).toBe('color');
        expect(primaryToken?.value).toBe('#0066CC');
        expect(primaryToken?.collection).toBe('primitives');
      }
    });

    it('should import semantic tokens with references', async () => {
      // Arrange - First import primitives
      const primitivesData: TokenData = {
        color: {
          blue500: {
            $type: 'color',
            $value: '#0066CC'
          }
        }
      };

      await useCase.execute({
        data: primitivesData,
        projectId: 'test-project',
        collection: 'primitives'
      });

      // Then import semantics with references
      const semanticsData: TokenData = {
        color: {
          primary: {
            $type: 'color',
            $value: '{color.blue500}'
          }
        }
      };

      const input = {
        data: semanticsData,
        projectId: 'test-project',
        collection: 'semantic'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.count).toBe(1);

        const primaryToken = result.data!.tokens[0];
        expect(primaryToken.value).toBe('{color.blue500}');
        expect(primaryToken.collection).toBe('semantic');
      }
    });

    it('should handle redundant token level nesting', async () => {
      // Arrange - semantic.json with redundant "semantic" top-level key
      const tokenData: TokenData = {
        semantic: {
          color: {
            primary: {
              $type: 'color',
              $value: '#0066CC'
            }
          }
        }
      };

      const input = {
        data: tokenData,
        projectId: 'test-project',
        collection: 'semantic',
        filePath: 'tokens/semantic.json'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        const primaryToken = result.data!.tokens[0];

        // Path should be normalized: 'color.primary' not 'semantic.color.primary'
        expect(primaryToken.path).toBe('color.primary');
        expect(primaryToken.path).not.toContain('semantic.semantic');
      }
    });

    it('should import multiple token types', async () => {
      // Arrange
      const tokenData: TokenData = {
        color: {
          primary: { $type: 'color', $value: '#0066CC' }
        },
        spacing: {
          small: { $type: 'dimension', $value: '8px' }
        },
        fontFamily: {
          body: { $type: 'fontFamily', $value: 'Inter' }
        }
      };

      const input = {
        data: tokenData,
        projectId: 'test-project',
        collection: 'design-system'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.count).toBe(3);

        const colorToken = result.data!.tokens.find(t => t.type === 'color');
        const spacingToken = result.data!.tokens.find(t => t.type === 'dimension');
        const fontToken = result.data!.tokens.find(t => t.type === 'fontFamily');

        expect(colorToken).toBeDefined();
        expect(spacingToken).toBeDefined();
        expect(fontToken).toBeDefined();
      }
    });

    it('should store tokens in repository', async () => {
      // Arrange
      const tokenData: TokenData = {
        color: {
          primary: { $type: 'color', $value: '#0066CC' }
        }
      };

      const input = {
        data: tokenData,
        projectId: 'test-project',
        collection: 'test'
      };

      // Act
      await useCase.execute(input);

      // Assert - Query repository directly
      const storedTokens = repository.query({ collection: 'test' });
      expect(storedTokens).toHaveLength(1);
      expect(storedTokens[0].name).toBe('primary');
    });
  });

  describe('Error Handling', () => {
    it('should fail gracefully with invalid token data', async () => {
      // Arrange
      const invalidData: any = {
        notAToken: 'invalid'
      };

      const input = {
        data: invalidData,
        projectId: 'test-project',
        collection: 'test'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      // Should either succeed with 0 tokens or fail gracefully
      expect(result).toBeDefined();
      if (result.success) {
        expect(result.data!.count).toBe(0);
      } else {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle empty token data', async () => {
      // Arrange
      const emptyData: TokenData = {};

      const input = {
        data: emptyData,
        projectId: 'test-project',
        collection: 'empty'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.count).toBe(0);
        expect(result.data!.tokens).toHaveLength(0);
      }
    });
  });

  describe('Parser Detection', () => {
    it('should auto-detect W3C format', async () => {
      // Arrange - W3C format with $type and $value
      const w3cData: TokenData = {
        color: {
          primary: {
            $type: 'color',
            $value: '#0066CC'
          }
        }
      };

      const input = {
        data: w3cData,
        projectId: 'test-project',
        collection: 'test'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens).toBeDefined();
        expect(result.data!.count).toBeGreaterThan(0);
      }
    });

    it('should fail when no parser can handle the format', async () => {
      // Arrange - Clear registry to simulate no parsers
      const emptyRegistry = new TokenParserRegistry();
      const useCaseWithNoParser = new ImportTokensUseCase(emptyRegistry, repository);

      const input = {
        data: { some: 'data' },
        projectId: 'test-project',
        collection: 'test'
      };

      // Act
      const result = await useCaseWithNoParser.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('No parser');
      }
    });
  });

  describe('Collection Management', () => {
    it('should use explicit collection from context', async () => {
      // Arrange
      const tokenData: TokenData = {
        color: {
          primary: { $type: 'color', $value: '#0066CC' }
        }
      };

      const input = {
        data: tokenData,
        projectId: 'test-project',
        collection: 'my-custom-collection'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.tokens[0].collection).toBe('my-custom-collection');
      }
    });

    it('should extract collection from file path', async () => {
      // Arrange
      const tokenData: TokenData = {
        color: {
          primary: { $type: 'color', $value: '#0066CC' }
        }
      };

      const input = {
        data: tokenData,
        projectId: 'test-project',
        filePath: 'tokens/primitives.json'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        // Collection should be derived from filename
        expect(result.data!.tokens[0].collection).toBeDefined();
      }
    });
  });

  describe('Real Test Data', () => {
    it('should import actual primitives.json structure', async () => {
      // Arrange - Simulating real primitives.json structure
      const primitivesData: TokenData = {
        primitives: {
          color: {
            blue: {
              '100': { $type: 'color', $value: '#E6F2FF' },
              '500': { $type: 'color', $value: '#0066CC' },
              '900': { $type: 'color', $value: '#002D5C' }
            }
          },
          spacing: {
            xs: { $type: 'dimension', $value: '4px' },
            sm: { $type: 'dimension', $value: '8px' },
            md: { $type: 'dimension', $value: '16px' }
          }
        }
      };

      const input = {
        data: primitivesData,
        projectId: 'test-project',
        collection: 'primitives',
        filePath: 'tokens/primitives.json'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        // Should have 6 tokens (3 colors + 3 spacing)
        expect(result.data!.count).toBeGreaterThanOrEqual(6);

        // Check specific tokens
        const blue500 = result.data!.tokens.find(t => t.name === '500' && t.path.includes('blue'));
        expect(blue500).toBeDefined();
        expect(blue500?.value).toBe('#0066CC');

        const spacingSm = result.data!.tokens.find(t => t.name === 'sm');
        expect(spacingSm).toBeDefined();
        expect(spacingSm?.value).toBe('8px');
      }
    });

    it('should import actual semantics.json with redundancy', async () => {
      // Arrange - Simulating real semantics.json with redundant nesting
      const semanticsData: TokenData = {
        semantic: {
          color: {
            primary: { $type: 'color', $value: '{primitives.color.blue.500}' },
            background: { $type: 'color', $value: '{primitives.color.blue.100}' }
          }
        }
      };

      const input = {
        data: semanticsData,
        projectId: 'test-project',
        collection: 'semantic',
        filePath: 'tokens/semantic.json'
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.count).toBe(2);

        // Paths should be normalized (no 'semantic.semantic')
        result.data!.tokens.forEach(token => {
          expect(token.path).not.toMatch(/semantic\.semantic/);
        });

        // Values should preserve references
        const primaryToken = result.data!.tokens.find(t => t.name === 'primary');
        expect(primaryToken?.value).toContain('{primitives');
      }
    });
  });
});

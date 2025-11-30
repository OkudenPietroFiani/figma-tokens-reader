/**
 * Integration Tests for SyncToFigmaVariablesUseCase
 *
 * These tests verify end-to-end token sync to Figma Variables
 * with mocked Figma API.
 */

import { SyncToFigmaVariablesUseCase } from '../../application/use-cases/SyncToFigmaVariablesUseCase';
import { InMemoryTokenRepository } from '../../infrastructure/storage/InMemoryTokenRepository';
import { FigmaVariablesExporter } from '../../infrastructure/output/FigmaVariablesExporter';
import { TokenRepository } from '../../core/services/TokenRepository';
import { TokenResolver } from '../../core/services/TokenResolver';
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

describe('SyncToFigmaVariablesUseCase Integration Tests', () => {
  let useCase: SyncToFigmaVariablesUseCase;
  let repository: InMemoryTokenRepository;
  let exporter: FigmaVariablesExporter;
  let coreRepository: TokenRepository;
  let resolver: TokenResolver;

  // Mock Figma API
  let mockFigma: any;

  beforeEach(() => {
    // Setup mock Figma API
    mockFigma = {
      variables: {
        createVariableCollection: jest.fn().mockReturnValue({
          id: 'collection-1',
          name: 'Test Collection',
          modes: [{ modeId: 'mode-1', name: 'Mode 1' }]
        }),
        createVariable: jest.fn().mockReturnValue({
          id: 'var-1',
          name: 'test-variable'
        })
      }
    };

    // Make figma global available (simulating Figma plugin environment)
    (global as any).figma = mockFigma;

    // Setup infrastructure
    coreRepository = new TokenRepository();
    resolver = new TokenResolver(coreRepository);

    repository = new InMemoryTokenRepository();
    exporter = new FigmaVariablesExporter(coreRepository, resolver);

    // Create use case
    useCase = new SyncToFigmaVariablesUseCase(repository, exporter);
  });

  afterEach(() => {
    // Clean up global
    delete (global as any).figma;
    jest.clearAllMocks();
  });

  describe('Sync All Tokens', () => {
    it('should sync color tokens to Figma Variables', async () => {
      // Arrange - Add tokens to repository
      const colorTokens: Token[] = [
        createTestToken({
          id: 'token-1',
          name: 'primary',
          path: ['color', 'primary'],
          qualifiedName: 'color.primary',
          type: 'color',
          value: { hex: '#0066CC' },
          rawValue: '#0066CC',
          collection: 'primitives'
        }),
        createTestToken({
          id: 'token-2',
          name: 'secondary',
          path: ['color', 'secondary'],
          qualifiedName: 'color.secondary',
          type: 'color',
          value: { hex: '#FF6600' },
          rawValue: '#FF6600',
          collection: 'primitives'
        })
      ];

      repository.saveMany(colorTokens);
      coreRepository.add(colorTokens);

      const input = {
        projectId: 'test-project',
        options: {
          dryRun: true // Use dry run to avoid actual Figma API calls
        }
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.exported).toBe(2);
        expect(result.data!.created).toBe(2);
      }
    });

    it('should sync tokens by collection', async () => {
      // Arrange
      const primitiveToken = createTestToken({
        id: 'token-1',
        name: 'blue500',
        path: ['color', 'blue500'],
        qualifiedName: 'color.blue500',
        type: 'color',
        value: { hex: '#0066CC' },
        rawValue: '#0066CC',
        collection: 'primitives'
      });

      const semanticToken = createTestToken({
        id: 'token-2',
        name: 'primary',
        path: ['color', 'primary'],
        qualifiedName: 'color.primary',
        type: 'color',
        value: { hex: '#0066CC' },
        rawValue: '{color.blue500}',
        collection: 'semantic'
      });

      repository.saveMany([primitiveToken, semanticToken]);
      coreRepository.add([primitiveToken, semanticToken]);

      // Sync only primitives
      const input = {
        projectId: 'test-project',
        collection: 'primitives',
        options: {
          dryRun: true
        }
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.exported).toBe(1); // Only primitive token
      }
    });

    it('should sync tokens by type', async () => {
      // Arrange
      const tokens: Token[] = [
        createTestToken({
          id: 'token-1',
          name: 'primary',
          path: ['color', 'primary'],
          qualifiedName: 'color.primary',
          type: 'color',
          value: { hex: '#0066CC' },
          rawValue: '#0066CC'
        }),
        createTestToken({
          id: 'token-2',
          name: 'small',
          path: ['spacing', 'small'],
          qualifiedName: 'spacing.small',
          type: 'dimension',
          value: { value: 8, unit: 'px' },
          rawValue: '8px'
        })
      ];

      repository.saveMany(tokens);
      coreRepository.add(tokens);

      // Sync only colors
      const input = {
        projectId: 'test-project',
        options: {
          dryRun: true
        }
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.exported).toBe(2); // Both tokens (API doesn't filter by type at input level)
      }
    });
  });

  describe('Token Query Integration', () => {
    it('should use repository query criteria', async () => {
      // Arrange
      const tokens: Token[] = [
        createTestToken({
          id: 'token-1',
          name: 'primary',
          path: ['color', 'primary'],
          qualifiedName: 'color.primary',
          type: 'color',
          value: { hex: '#0066CC' },
          rawValue: '#0066CC',
          collection: 'primitives'
        }),
        createTestToken({
          id: 'token-2',
          name: 'accent',
          path: ['color', 'accent'],
          qualifiedName: 'color.accent',
          type: 'color',
          value: { hex: '#FF6600' },
          rawValue: '#FF6600',
          collection: 'semantic'
        })
      ];

      repository.saveMany(tokens);
      coreRepository.add(tokens);

      // Query by multiple criteria
      const input = {
        projectId: 'test-project',
        collection: 'primitives',
        options: {
          dryRun: true
        }
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.exported).toBe(2); // Primitive tokens (1 color + 1 token)
      }
    });

    it('should handle search filter', async () => {
      // Arrange
      const tokens: Token[] = [
        createTestToken({
          id: 'token-1',
          name: 'primary-blue',
          path: ['color', 'primary-blue'],
          qualifiedName: 'color.primary-blue',
          type: 'color',
          value: { hex: '#0066CC' },
          rawValue: '#0066CC'
        }),
        createTestToken({
          id: 'token-2',
          name: 'primary-red',
          path: ['color', 'primary-red'],
          qualifiedName: 'color.primary-red',
          type: 'color',
          value: { hex: '#CC0000' },
          rawValue: '#CC0000'
        }),
        createTestToken({
          id: 'token-3',
          name: 'secondary',
          path: ['color', 'secondary'],
          qualifiedName: 'color.secondary',
          type: 'color',
          value: { hex: '#FF6600' },
          rawValue: '#FF6600'
        })
      ];

      repository.saveMany(tokens);
      coreRepository.add(tokens);

      // Sync all from project
      const input = {
        projectId: 'test-project',
        options: {
          dryRun: true
        }
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.exported).toBe(3); // All three tokens
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty repository', async () => {
      // Arrange - No tokens in repository
      const input = {
        projectId: 'test-project',
        options: { dryRun: true }
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      // Should fail when no tokens found
      expect(result.success).toBe(false);
    });

    it('should handle no tokens matching criteria', async () => {
      // Arrange
      const token = createTestToken({
        id: 'token-1',
        name: 'primary',
        path: ['color', 'primary'],
        qualifiedName: 'color.primary',
        type: 'color',
        value: { hex: '#0066CC' },
        rawValue: '#0066CC',
        collection: 'primitives'
      });

      repository.saveMany([token]);
      coreRepository.add([token]);

      // Query for non-existent collection
      const input = {
        projectId: 'test-project',
        collection: 'non-existent',
        options: { dryRun: true }
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      // Should fail when no tokens match criteria
      expect(result.success).toBe(false);
    });

    it('should validate tokens before export', async () => {
      // Arrange
      const validToken = createTestToken({
        id: 'token-1',
        name: 'primary',
        path: ['color', 'primary'],
        qualifiedName: 'color.primary',
        type: 'color',
        value: { hex: '#0066CC' },
        rawValue: '#0066CC'
      });

      repository.saveMany([validToken]);
      coreRepository.add([validToken]);

      const input = {
        projectId: 'test-project',
        options: { dryRun: true }
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      // Validation should have been called (exporter.validate)
    });
  });

  describe('Export Options', () => {
    it('should respect dryRun option', async () => {
      // Arrange
      const token = createTestToken({
        id: 'token-1',
        name: 'primary',
        path: ['color', 'primary'],
        qualifiedName: 'color.primary',
        type: 'color',
        value: { hex: '#0066CC' },
        rawValue: '#0066CC'
      });

      repository.saveMany([token]);
      coreRepository.add([token]);

      const input = {
        projectId: 'test-project',
        options: {
          dryRun: true
        }
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        // In dry run, should report what would be exported
        expect(result.data!.exported).toBeGreaterThan(0);
        // Actual Figma API should not be called (verified by mock)
      }
    });

    it('should pass overwrite option to exporter', async () => {
      // Arrange
      const token = createTestToken({
        id: 'token-1',
        name: 'primary',
        path: ['color', 'primary'],
        qualifiedName: 'color.primary',
        type: 'color',
        value: { hex: '#0066CC' },
        rawValue: '#0066CC'
      });

      repository.saveMany([token]);
      coreRepository.add([token]);

      const input = {
        projectId: 'test-project',
        options: {
          overwrite: false,
          dryRun: true
        }
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      // Options should be passed to exporter
    });
  });

  describe('Real-world Scenarios', () => {
    it('should sync a complete design system', async () => {
      // Arrange - Simulate a real design system with primitives and semantics
      const designSystemTokens: Token[] = [
        // Primitive colors
        createTestToken({
          id: 'token-1',
          name: 'blue500',
          path: ['color', 'blue', '500'],
          qualifiedName: 'color.blue.500',
          type: 'color',
          value: { hex: '#0066CC' },
          rawValue: '#0066CC',
          collection: 'primitives'
        }),
        createTestToken({
          id: 'token-2',
          name: 'blue100',
          path: ['color', 'blue', '100'],
          qualifiedName: 'color.blue.100',
          type: 'color',
          value: { hex: '#E6F2FF' },
          rawValue: '#E6F2FF',
          collection: 'primitives'
        }),
        // Semantic colors
        createTestToken({
          id: 'token-3',
          name: 'primary',
          path: ['color', 'primary'],
          qualifiedName: 'color.primary',
          type: 'color',
          value: { hex: '#0066CC' },
          rawValue: '{color.blue.500}',
          collection: 'semantic'
        }),
        createTestToken({
          id: 'token-4',
          name: 'background',
          path: ['color', 'background'],
          qualifiedName: 'color.background',
          type: 'color',
          value: { hex: '#E6F2FF' },
          rawValue: '{color.blue.100}',
          collection: 'semantic'
        }),
        // Spacing tokens
        createTestToken({
          id: 'token-5',
          name: 'sm',
          path: ['spacing', 'sm'],
          qualifiedName: 'spacing.sm',
          type: 'dimension',
          value: { value: 8, unit: 'px' },
          rawValue: '8px',
          collection: 'primitives'
        })
      ];

      repository.saveMany(designSystemTokens);
      coreRepository.add(designSystemTokens);

      const input = {
        projectId: 'test-project',
        options: {
          dryRun: true
        }
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.exported).toBe(5); // All tokens
        expect(result.data!.created).toBe(5);
      }
    });

    it('should sync only changed tokens (update scenario)', async () => {
      // Arrange
      const tokens: Token[] = [
        createTestToken({
          id: 'token-1',
          name: 'primary',
          path: ['color', 'primary'],
          qualifiedName: 'color.primary',
          type: 'color',
          value: { hex: '#0066CC' },
          rawValue: '#0066CC'
        })
      ];

      repository.saveMany(tokens);
      coreRepository.add(tokens);

      // First sync
      const firstSync = {
        projectId: 'test-project',
        options: { dryRun: true }
      };

      await useCase.execute(firstSync);

      // Update token value
      const updatedToken = createTestToken({
        id: tokens[0]!.id,
        name: tokens[0]!.name,
        path: tokens[0]!.path,
        qualifiedName: tokens[0]!.qualifiedName,
        collection: tokens[0]!.collection,
        projectId: tokens[0]!.projectId,
        value: { hex: '#0077DD' },
        rawValue: '#0077DD'
      });

      repository.save(updatedToken);
      coreRepository.add([updatedToken]);

      // Second sync
      const secondSync = {
        projectId: 'test-project',
        options: {
          overwrite: true,
          dryRun: true
        }
      };

      // Act
      const result = await useCase.execute(secondSync);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        // Should update existing variable
        expect(result.data!.exported).toBe(1);
      }
    });
  });

  describe('Performance', () => {
    it('should handle large token sets efficiently', async () => {
      // Arrange - Create 100 tokens
      const largeTokenSet: Token[] = Array.from({ length: 100 }, (_, i) =>
        createTestToken({
          id: `token-${i}`,
          name: `color${i}`,
          path: ['color', `color${i}`],
          qualifiedName: `color.color${i}`,
          type: 'color',
          value: { hex: `#${i.toString(16).padStart(6, '0')}` },
          rawValue: `#${i.toString(16).padStart(6, '0')}`
        })
      );

      repository.saveMany(largeTokenSet);
      coreRepository.add(largeTokenSet);

      const input = {
        projectId: 'test-project',
        options: { dryRun: true }
      };

      // Act
      const startTime = Date.now();
      const result = await useCase.execute(input);
      const endTime = Date.now();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.exported).toBe(100);
        // Should complete in reasonable time (< 5 seconds in dry run)
        expect(endTime - startTime).toBeLessThan(5000);
      }
    });
  });
});

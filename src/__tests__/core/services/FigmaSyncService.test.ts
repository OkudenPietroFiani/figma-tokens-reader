// ====================================================================================
// FIGMA SYNC SERVICE TESTS
// Tests for token synchronization to Figma variables
// ====================================================================================

import { FigmaSyncService } from '../../../core/services/FigmaSyncService';
import { TokenRepository } from '../../../core/services/TokenRepository';
import { TokenResolver } from '../../../core/services/TokenResolver';
import { Token } from '../../../core/models/Token';

// Mock Figma API
const mockFigma = {
  variables: {
    getLocalVariableCollectionsAsync: jest.fn(),
    createVariableCollection: jest.fn(),
    createVariable: jest.fn(),
    getLocalVariablesAsync: jest.fn(),
  },
  notify: jest.fn(),
};

// @ts-ignore
global.figma = mockFigma;

describe('FigmaSyncService', () => {
  let service: FigmaSyncService;
  let repository: TokenRepository;
  let resolver: TokenResolver;
  let mockVariable: any;
  let mockCollection: any;

  beforeEach(() => {
    repository = new TokenRepository();
    resolver = new TokenResolver(repository);
    service = new FigmaSyncService(repository, resolver);

    // Reset mocks
    jest.clearAllMocks();

    // Mock variable
    mockVariable = {
      id: 'var-123',
      name: 'color/primary',
      resolvedType: 'COLOR',
      variableCollectionId: 'collection-123',
      description: '',
      setValueForMode: jest.fn(),
      setVariableCodeSyntax: jest.fn(),
      scopes: [],
    };

    // Mock collection
    mockCollection = {
      id: 'collection-123',
      name: 'primitive',
      modes: [{ modeId: 'mode-1', name: 'Mode 1' }],
      variableIds: [],
    };

    // Setup default mock returns
    mockFigma.variables.getLocalVariableCollectionsAsync.mockResolvedValue([mockCollection]);
    mockFigma.variables.createVariableCollection.mockReturnValue(mockCollection);
    mockFigma.variables.createVariable.mockReturnValue(mockVariable);
    mockFigma.variables.getLocalVariablesAsync.mockResolvedValue([]);
  });

  describe('Color Value Conversion', () => {
    test('converts hex color #ff8800 to RGB', async () => {
      const token: Token = {
        id: 'token-1',
        path: ['color', 'primary'],
        name: 'primary',
        qualifiedName: 'color.primary',
        type: 'color',
        value: '#ff8800',
        rawValue: '#ff8800',
        resolvedValue: '#ff8800',
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith(
        'mode-1',
        expect.objectContaining({
          r: expect.closeTo(1.0, 2),
          g: expect.closeTo(0.533, 2),
          b: expect.closeTo(0.0, 2),
        })
      );
    });

    test('converts 3-digit hex color #f80 to RGB', async () => {
      const token: Token = {
        id: 'token-2',
        path: ['color', 'orange'],
        name: 'orange',
        qualifiedName: 'color.orange',
        type: 'color',
        value: '#f80',
        rawValue: '#f80',
        resolvedValue: '#f80',
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      // #f80 -> #ff8800 -> RGB(255, 136, 0) -> (1.0, 0.533, 0.0)
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith(
        'mode-1',
        expect.objectContaining({
          r: expect.closeTo(1.0, 2),
          g: expect.closeTo(0.533, 2),
          b: expect.closeTo(0.0, 2),
        })
      );
    });

    test('converts 8-digit hex color with alpha #ff8800ff to RGB (alpha ignored)', async () => {
      const token: Token = {
        id: 'token-3',
        path: ['color', 'orange-opaque'],
        name: 'orange-opaque',
        qualifiedName: 'color.orange-opaque',
        type: 'color',
        value: '#ff8800ff',
        rawValue: '#ff8800ff',
        resolvedValue: '#ff8800ff',
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      // Alpha channel is ignored - Figma COLOR type only accepts RGB
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith(
        'mode-1',
        expect.objectContaining({
          r: expect.closeTo(1.0, 2),
          g: expect.closeTo(0.533, 2),
          b: expect.closeTo(0.0, 2),
        })
      );
      // Verify no 'a' property
      const callArgs = mockVariable.setValueForMode.mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('a');
    });

    test('converts RGB object (0-255) to normalized RGB', async () => {
      const token: Token = {
        id: 'token-4',
        path: ['color', 'blue'],
        name: 'blue',
        qualifiedName: 'color.blue',
        type: 'color',
        value: { r: 0, g: 128, b: 255 },
        rawValue: { r: 0, g: 128, b: 255 },
        resolvedValue: { r: 0, g: 128, b: 255 },
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith(
        'mode-1',
        expect.objectContaining({
          r: expect.closeTo(0.0, 2),
          g: expect.closeTo(0.502, 2),
          b: expect.closeTo(1.0, 2),
        })
      );
    });

    test('converts W3C components array to RGB (alpha ignored)', async () => {
      const token: Token = {
        id: 'token-5',
        path: ['color', 'green'],
        name: 'green',
        qualifiedName: 'color.green',
        type: 'color',
        value: { components: [0, 255, 128], alpha: 1 } as any, // W3C format
        rawValue: { components: [0, 255, 128], alpha: 1 },
        resolvedValue: { components: [0, 255, 128], alpha: 1 } as any,
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      // Alpha is ignored - Figma COLOR type only accepts RGB
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith(
        'mode-1',
        expect.objectContaining({
          r: expect.closeTo(0.0, 2),
          g: expect.closeTo(1.0, 2),
          b: expect.closeTo(0.502, 2),
        })
      );
      // Verify no 'a' property
      const callArgs = mockVariable.setValueForMode.mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('a');
    });

    test('converts RGB colorSpace object to RGB', async () => {
      const token: Token = {
        id: 'token-6',
        path: ['color', 'purple'],
        name: 'purple',
        qualifiedName: 'color.purple',
        type: 'color',
        value: { colorSpace: 'rgb', components: [128, 0, 255] } as any, // W3C format
        rawValue: { colorSpace: 'rgb', components: [128, 0, 255] },
        resolvedValue: { colorSpace: 'rgb', components: [128, 0, 255] } as any,
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith(
        'mode-1',
        expect.objectContaining({
          r: expect.closeTo(0.502, 2),
          g: expect.closeTo(0.0, 2),
          b: expect.closeTo(1.0, 2),
        })
      );
    });

    test('converts HSL colorSpace object using hex fallback', async () => {
      const token: Token = {
        id: 'token-6b',
        path: ['color', 'primary-50'],
        name: 'primary-50',
        qualifiedName: 'color.primary-50',
        type: 'color',
        value: { colorSpace: 'hsl', components: [225, 16, 92], alpha: 1, hex: '#E8E9EC' } as any,
        rawValue: { colorSpace: 'hsl', components: [225, 16, 92], alpha: 1, hex: '#E8E9EC' },
        resolvedValue: { colorSpace: 'hsl', components: [225, 16, 92], alpha: 1, hex: '#E8E9EC' } as any,
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      // HSL should use hex fallback #E8E9EC = RGB(232, 233, 236)
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith(
        'mode-1',
        expect.objectContaining({
          r: expect.closeTo(0.910, 2),
          g: expect.closeTo(0.914, 2),
          b: expect.closeTo(0.925, 2),
        })
      );
    });

    test('converts rgb() string to RGB', async () => {
      const token: Token = {
        id: 'token-7',
        path: ['color', 'yellow'],
        name: 'yellow',
        qualifiedName: 'color.yellow',
        type: 'color',
        value: 'rgb(255, 255, 0)',
        rawValue: 'rgb(255, 255, 0)',
        resolvedValue: 'rgb(255, 255, 0)',
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith(
        'mode-1',
        expect.objectContaining({
          r: expect.closeTo(1.0, 2),
          g: expect.closeTo(1.0, 2),
          b: expect.closeTo(0.0, 2),
        })
      );
    });

    test('handles already normalized RGB (0-1)', async () => {
      const token: Token = {
        id: 'token-8',
        path: ['color', 'normalized'],
        name: 'normalized',
        qualifiedName: 'color.normalized',
        type: 'color',
        value: { r: 0.5, g: 0.3, b: 0.1 },
        rawValue: { r: 0.5, g: 0.3, b: 0.1 },
        resolvedValue: { r: 0.5, g: 0.3, b: 0.1 },
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith(
        'mode-1',
        expect.objectContaining({
          r: expect.closeTo(0.5, 2),
          g: expect.closeTo(0.3, 2),
          b: expect.closeTo(0.1, 2),
        })
      );
    });
  });

  describe('Numeric Value Conversion', () => {
    test('converts numeric value directly', async () => {
      const token: Token = {
        id: 'token-9',
        path: ['spacing', 'base'],
        name: 'base',
        qualifiedName: 'spacing.base',
        type: 'dimension',
        value: 16,
        rawValue: 16,
        resolvedValue: 16,
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith('mode-1', 16);
    });

    test('converts string with px unit to number', async () => {
      const token: Token = {
        id: 'token-10',
        path: ['spacing', 'large'],
        name: 'large',
        qualifiedName: 'spacing.large',
        type: 'dimension',
        value: '32px',
        rawValue: '32px',
        resolvedValue: '32px',
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      mockVariable.resolvedType = 'FLOAT';
      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith('mode-1', 32);
    });

    test('converts string with rem unit to px', async () => {
      const token: Token = {
        id: 'token-11',
        path: ['spacing', 'xlarge'],
        name: 'xlarge',
        qualifiedName: 'spacing.xlarge',
        type: 'dimension',
        value: '2.5rem',
        rawValue: '2.5rem',
        resolvedValue: '2.5rem',
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      mockVariable.resolvedType = 'FLOAT';
      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      // 2.5rem × 16 = 40px
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith('mode-1', 40);
    });

    test('converts DimensionValue object with rem unit to px', async () => {
      const token: Token = {
        id: 'token-11b',
        path: ['font-size', '10'],
        name: '10',
        qualifiedName: 'font-size.10',
        type: 'dimension',
        value: { value: 0.625, unit: 'rem' } as any,
        rawValue: { value: 0.625, unit: 'rem' },
        resolvedValue: { value: 0.625, unit: 'rem' } as any,
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      mockVariable.resolvedType = 'FLOAT';
      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      // 0.625rem × 16 = 10px
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith('mode-1', 10);
    });
  });

  describe('Code Syntax Generation', () => {
    test('sets CSS variable code syntax for simple token', async () => {
      const token: Token = {
        id: 'token-12',
        path: ['color', 'primary'],
        name: 'primary',
        qualifiedName: 'color.primary',
        type: 'color',
        value: '#ff0000',
        rawValue: '#ff0000',
        resolvedValue: '#ff0000',
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      await service.syncTokens([token]);

      expect(mockVariable.setVariableCodeSyntax).toHaveBeenCalledWith('WEB', '--color-primary');
      expect(mockVariable.setVariableCodeSyntax).toHaveBeenCalledWith('ANDROID', '@dimen/color_primary');
      expect(mockVariable.setVariableCodeSyntax).toHaveBeenCalledWith('iOS', 'color.primary');
    });

    test('sets CSS variable code syntax for nested token', async () => {
      const token: Token = {
        id: 'token-13',
        path: ['colors', 'brand', 'primary', 'light'],
        name: 'light',
        qualifiedName: 'colors.brand.primary.light',
        type: 'color',
        value: '#ffcccc',
        rawValue: '#ffcccc',
        resolvedValue: '#ffcccc',
        projectId: 'test',
        collection: 'semantic',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      await service.syncTokens([token]);

      expect(mockVariable.setVariableCodeSyntax).toHaveBeenCalledWith('WEB', '--colors-brand-primary-light');
      expect(mockVariable.setVariableCodeSyntax).toHaveBeenCalledWith('ANDROID', '@dimen/colors_brand_primary_light');
      expect(mockVariable.setVariableCodeSyntax).toHaveBeenCalledWith('iOS', 'colors.brand.primary.light');
    });

    test('handles special characters in token path', async () => {
      const token: Token = {
        id: 'token-14',
        path: ['color', 'primary-500'],
        name: 'primary-500',
        qualifiedName: 'color.primary-500',
        type: 'color',
        value: '#0066ff',
        rawValue: '#0066ff',
        resolvedValue: '#0066ff',
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      await service.syncTokens([token]);

      expect(mockVariable.setVariableCodeSyntax).toHaveBeenCalledWith('WEB', '--color-primary-500');
      expect(mockVariable.setVariableCodeSyntax).toHaveBeenCalledWith('ANDROID', '@dimen/color_primary_500');
      expect(mockVariable.setVariableCodeSyntax).toHaveBeenCalledWith('iOS', 'color.primary-500');
    });
  });

  describe('String Value Conversion', () => {
    test('converts string value directly', async () => {
      const token: Token = {
        id: 'token-15',
        path: ['font', 'family', 'base'],
        name: 'base',
        qualifiedName: 'font.family.base',
        type: 'string',
        value: 'Inter',
        rawValue: 'Inter',
        resolvedValue: 'Inter',
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      mockVariable.resolvedType = 'STRING';
      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith('mode-1', 'Inter');
    });
  });

  describe('Boolean Value Conversion', () => {
    test('converts boolean value directly', async () => {
      const token: Token = {
        id: 'token-16',
        path: ['feature', 'enabled'],
        name: 'enabled',
        qualifiedName: 'feature.enabled',
        type: 'boolean',
        value: true,
        rawValue: true,
        resolvedValue: true,
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      mockVariable.resolvedType = 'BOOLEAN';
      repository.add([token]);
      const result = await service.syncTokens([token]);

      expect(result.success).toBe(true);
      expect(mockVariable.setValueForMode).toHaveBeenCalledWith('mode-1', true);
    });
  });

  describe('End-to-End Sync', () => {
    test('syncs multiple tokens across different collections', async () => {
      const tokens: Token[] = [
        {
          id: 'token-17',
          path: ['color', 'primary'],
          name: 'primary',
          qualifiedName: 'color.primary',
          type: 'color',
          value: '#ff0000',
          rawValue: '#ff0000',
          resolvedValue: '#ff0000',
          projectId: 'test',
          collection: 'primitive',
          sourceFormat: 'w3c',
          source: { type: 'local', location: 'test', imported: '2025-01-01' },
          extensions: {},
          tags: [],
          status: 'active',
          created: '2025-01-01',
          lastModified: '2025-01-01',
        },
        {
          id: 'token-18',
          path: ['spacing', 'base'],
          name: 'base',
          qualifiedName: 'spacing.base',
          type: 'dimension',
          value: 16,
          rawValue: 16,
          resolvedValue: 16,
          projectId: 'test',
          collection: 'semantic',
          sourceFormat: 'w3c',
          source: { type: 'local', location: 'test', imported: '2025-01-01' },
          extensions: {},
          tags: [],
          status: 'active',
          created: '2025-01-01',
          lastModified: '2025-01-01',
        },
      ];

      // Mock separate collections for each
      const mockCollection2 = {
        ...mockCollection,
        id: 'collection-456',
        name: 'semantic',
      };

      mockFigma.variables.getLocalVariableCollectionsAsync.mockResolvedValue([
        mockCollection,
        mockCollection2,
      ]);

      repository.add(tokens);
      const result = await service.syncTokens(tokens);

      expect(result.success).toBe(true);
      expect(result.data?.stats.added).toBe(2);
      expect(mockFigma.variables.createVariable).toHaveBeenCalledTimes(2);
    });

    test('updates token extensions with Figma metadata', async () => {
      const token: Token = {
        id: 'token-19',
        path: ['color', 'accent'],
        name: 'accent',
        qualifiedName: 'color.accent',
        type: 'color',
        value: '#00ff00',
        rawValue: '#00ff00',
        resolvedValue: '#00ff00',
        projectId: 'test',
        collection: 'primitive',
        sourceFormat: 'w3c',
        source: { type: 'local', location: 'test', imported: '2025-01-01' },
        extensions: {},
        tags: [],
        status: 'active',
        created: '2025-01-01',
        lastModified: '2025-01-01',
      };

      repository.add([token]);
      await service.syncTokens([token]);

      const updatedToken = repository.get(token.id);
      expect(updatedToken?.extensions?.figma).toBeDefined();
      expect(updatedToken?.extensions?.figma?.variableId).toBe('var-123');
      expect(updatedToken?.extensions?.figma?.collectionId).toBe('collection-123');
    });
  });
});

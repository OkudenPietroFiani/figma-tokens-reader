// ====================================================================================
// TOKEN PROCESSOR TESTS
// Comprehensive unit tests for TokenProcessor
// ====================================================================================

import { TokenProcessor, ProcessingOptions } from '../../../core/services/TokenProcessor';
import { TokenFormatRegistry } from '../../../core/registries/TokenFormatRegistry';
import { W3CTokenFormatStrategy } from '../../../core/adapters/W3CTokenFormatStrategy';
import { TokenData } from '../../../shared/types';

describe('TokenProcessor', () => {
  let processor: TokenProcessor;
  let defaultOptions: ProcessingOptions;

  beforeEach(() => {
    processor = new TokenProcessor();

    // Register W3C format strategy
    TokenFormatRegistry.clear();
    TokenFormatRegistry.register(new W3CTokenFormatStrategy());

    defaultOptions = {
      projectId: 'project1',
      collection: 'primitives',
      sourceType: 'local',
      sourceLocation: 'tokens.json',
    };
  });

  afterEach(() => {
    TokenFormatRegistry.clear();
  });

  describe('processTokenData()', () => {
    it('should process W3C format tokens', async () => {
      const data: TokenData = {
        color: {
          primary: {
            $value: '#FF0000',
            $type: 'color',
            $description: 'Primary color',
          },
        },
      };

      const result = await processor.processTokenData(data, defaultOptions);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].qualifiedName).toBe('color.primary');
      expect(result.data?.[0].value).toBe('#FF0000');
      expect(result.data?.[0].type).toBe('color');
    });

    it('should generate stable token IDs', async () => {
      const data: TokenData = {
        color: {
          primary: {
            $value: '#FF0000',
          },
        },
      };

      const result1 = await processor.processTokenData(data, defaultOptions);
      const result2 = await processor.processTokenData(data, defaultOptions);

      expect(result1.data?.[0].id).toBe(result2.data?.[0].id);
      expect(result1.data?.[0].id).toMatch(/^token_/);
    });

    it('should set projectId correctly', async () => {
      const data: TokenData = {
        color: {
          primary: { $value: '#FF0000' },
        },
      };

      const result = await processor.processTokenData(data, {
        ...defaultOptions,
        projectId: 'myproject',
      });

      expect(result.data?.[0].projectId).toBe('myproject');
    });

    it('should set collection correctly', async () => {
      const data: TokenData = {
        color: {
          primary: { $value: '#FF0000' },
        },
      };

      const result = await processor.processTokenData(data, {
        ...defaultOptions,
        collection: 'semantic',
      });

      expect(result.data?.[0].collection).toBe('semantic');
    });

    it('should set theme and brand if provided', async () => {
      const data: TokenData = {
        color: {
          primary: { $value: '#FF0000' },
        },
      };

      const result = await processor.processTokenData(data, {
        ...defaultOptions,
        theme: 'dark',
        brand: 'acme',
      });

      expect(result.data?.[0].theme).toBe('dark');
      expect(result.data?.[0].brand).toBe('acme');
    });

    it('should capture source information', async () => {
      const data: TokenData = {
        color: {
          primary: { $value: '#FF0000' },
        },
      };

      const result = await processor.processTokenData(data, {
        ...defaultOptions,
        sourceType: 'github',
        sourceLocation: 'owner/repo/tokens.json',
        sourceBranch: 'main',
        sourceCommit: 'abc123',
      });

      const token = result.data?.[0];
      expect(token?.source.type).toBe('github');
      expect(token?.source.location).toBe('owner/repo/tokens.json');
      expect(token?.source.branch).toBe('main');
      expect(token?.source.commit).toBe('abc123');
    });

    it('should detect aliases', async () => {
      const data: TokenData = {
        color: {
          primary: { $value: '#FF0000' },
          secondary: { $value: '{color.primary}' },
        },
      };

      const result = await processor.processTokenData(data, defaultOptions);

      const secondary = result.data?.find(t => t.name === 'secondary');
      expect(secondary?.aliasTo).toBeDefined();
      expect(secondary?.resolvedValue).toBeUndefined(); // Not resolved yet
    });

    it('should infer tags from path and type', async () => {
      const data: TokenData = {
        color: {
          semantic: {
            button: {
              primary: { $value: '#FF0000' },
            },
          },
        },
      };

      const result = await processor.processTokenData(data, defaultOptions);

      const token = result.data?.[0];
      expect(token?.tags).toContain('color');
      expect(token?.tags).toContain('color.semantic');
    });

    it('should return failure if format detection fails', async () => {
      TokenFormatRegistry.clear(); // No strategies registered

      const data: TokenData = {
        color: { primary: { $value: '#FF0000' } },
      };

      const result = await processor.processTokenData(data, defaultOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not detect token format');
    });

    it('should set sourceFormat based on detected format', async () => {
      const data: TokenData = {
        color: {
          primary: { $value: '#FF0000' },
        },
      };

      const result = await processor.processTokenData(data, defaultOptions);

      expect(result.data?.[0].sourceFormat).toBe('w3c');
    });

    it('should set status to active by default', async () => {
      const data: TokenData = {
        color: {
          primary: { $value: '#FF0000' },
        },
      };

      const result = await processor.processTokenData(data, defaultOptions);

      expect(result.data?.[0].status).toBe('active');
    });

    it('should set created and lastModified timestamps', async () => {
      const data: TokenData = {
        color: {
          primary: { $value: '#FF0000' },
        },
      };

      const result = await processor.processTokenData(data, defaultOptions);

      expect(result.data?.[0].created).toBeDefined();
      expect(result.data?.[0].lastModified).toBeDefined();
      expect(new Date(result.data![0].created).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should handle nested token structures', async () => {
      const data: TokenData = {
        color: {
          semantic: {
            button: {
              primary: { $value: '#FF0000' },
              secondary: { $value: '#00FF00' },
            },
          },
        },
      };

      const result = await processor.processTokenData(data, defaultOptions);

      expect(result.data).toHaveLength(2);
      expect(result.data?.find(t => t.qualifiedName === 'color.semantic.button.primary')).toBeDefined();
      expect(result.data?.find(t => t.qualifiedName === 'color.semantic.button.secondary')).toBeDefined();
    });
  });

  describe('processMultipleFiles()', () => {
    it('should process multiple files', async () => {
      const files = [
        {
          data: {
            color: {
              primary: { $value: '#FF0000' },
            },
          },
          collection: 'primitives',
        },
        {
          data: {
            spacing: {
              small: { $value: '8px' },
            },
          },
          collection: 'primitives',
        },
      ];

      const result = await processor.processMultipleFiles(files, defaultOptions);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should infer collection from file path', async () => {
      const files = [
        {
          data: {
            color: {
              primary: { $value: '#FF0000' },
            },
          },
          filePath: 'tokens/primitives.json',
        },
        {
          data: {
            spacing: {
              small: { $value: '8px' },
            },
          },
          filePath: 'tokens/semantic/spacing.json',
        },
      ];

      const result = await processor.processMultipleFiles(files, defaultOptions);

      const colorToken = result.data?.find(t => t.type === 'color');
      const spacingToken = result.data?.find(t => t.type === 'spacing');

      expect(colorToken?.collection).toBe('primitives');
      expect(spacingToken?.collection).toBe('semantic');
    });

    it('should use default collection if not specified', async () => {
      const files = [
        {
          data: {
            color: {
              primary: { $value: '#FF0000' },
            },
          },
        },
      ];

      const result = await processor.processMultipleFiles(files, {
        ...defaultOptions,
        collection: undefined,
      });

      expect(result.data?.[0].collection).toBe('default');
    });

    it('should continue processing if one file fails', async () => {
      const files = [
        {
          data: { invalid: 'data' }, // Will fail to parse
        },
        {
          data: {
            color: {
              primary: { $value: '#FF0000' },
            },
          },
        },
      ];

      const result = await processor.processMultipleFiles(files, defaultOptions);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1); // Only the valid file
    });

    it('should return failure if no files could be processed', async () => {
      const files = [
        {
          data: { invalid: 'data' },
        },
      ];

      const result = await processor.processMultipleFiles(files, defaultOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No tokens could be processed');
    });

    it('should handle empty files array', async () => {
      const result = await processor.processMultipleFiles([], defaultOptions);

      expect(result.success).toBe(false);
    });
  });

  describe('type mapping', () => {
    it('should map common token types correctly', async () => {
      const data: TokenData = {
        color: { primary: { $value: '#FF0000', $type: 'color' } },
        fontSize: { base: { $value: '16px', $type: 'dimension' } },
        fontWeight: { bold: { $value: '700', $type: 'fontWeight' } },
        spacing: { small: { $value: '8px', $type: 'spacing' } },
      };

      const result = await processor.processTokenData(data, defaultOptions);

      expect(result.data?.find(t => t.path[0] === 'color')?.type).toBe('color');
      expect(result.data?.find(t => t.path[0] === 'fontSize')?.type).toBe('dimension');
      expect(result.data?.find(t => t.path[0] === 'fontWeight')?.type).toBe('fontWeight');
      expect(result.data?.find(t => t.path[0] === 'spacing')?.type).toBe('spacing');
    });
  });

  describe('collection inference', () => {
    it('should infer primitives from path', async () => {
      const files = [
        {
          data: { color: { primary: { $value: '#FF0000' } } },
          filePath: 'design-tokens/primitives/colors.json',
        },
      ];

      const result = await processor.processMultipleFiles(files, defaultOptions);

      expect(result.data?.[0].collection).toBe('primitives');
    });

    it('should infer semantic from path', async () => {
      const files = [
        {
          data: { color: { primary: { $value: '#FF0000' } } },
          filePath: 'tokens/semantic.json',
        },
      ];

      const result = await processor.processMultipleFiles(files, defaultOptions);

      expect(result.data?.[0].collection).toBe('semantic');
    });

    it('should use filename if no collection keyword found', async () => {
      const files = [
        {
          data: { color: { primary: { $value: '#FF0000' } } },
          filePath: 'tokens/colors.json',
        },
      ];

      const result = await processor.processMultipleFiles(files, defaultOptions);

      expect(result.data?.[0].collection).toBe('colors');
    });
  });
});

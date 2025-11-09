// ====================================================================================
// FILE CLASSIFIER TESTS
// Comprehensive unit tests for FileClassifier
// ====================================================================================

import { FileClassifier } from '../../utils/FileClassifier';

describe('FileClassifier', () => {
  describe('classify()', () => {
    describe('primitive classification', () => {
      test('should classify file with "primitive" in name', () => {
        const result = FileClassifier.classify('primitives.json');

        expect(result.category).toBe('primitive');
        expect(result.confidence).toBe(0.9);
      });

      test('should classify file with "base" in name', () => {
        const result = FileClassifier.classify('base-tokens.json');

        expect(result.category).toBe('primitive');
        expect(result.confidence).toBe(0.9);
      });

      test('should classify file with "core" in name', () => {
        const result = FileClassifier.classify('core.json');

        expect(result.category).toBe('primitive');
        expect(result.confidence).toBe(0.9);
      });

      test('should classify file with "foundation" in name', () => {
        const result = FileClassifier.classify('foundation-tokens.json');

        expect(result.category).toBe('primitive');
        expect(result.confidence).toBe(0.9);
      });

      test('should classify generic "tokens" file as primitive', () => {
        const result = FileClassifier.classify('tokens.json');

        expect(result.category).toBe('primitive');
        expect(result.confidence).toBe(0.9);
      });

      test('should be case insensitive for primitives', () => {
        expect(FileClassifier.classify('PRIMITIVES.json').category).toBe('primitive');
        expect(FileClassifier.classify('Primitive.json').category).toBe('primitive');
        expect(FileClassifier.classify('CORE.json').category).toBe('primitive');
      });
    });

    describe('semantic classification', () => {
      test('should classify file with "semantic" in name', () => {
        const result = FileClassifier.classify('semantic.json');

        expect(result.category).toBe('semantic');
        expect(result.confidence).toBe(0.9);
      });

      test('should classify file with "theme" in name', () => {
        const result = FileClassifier.classify('theme.json');

        expect(result.category).toBe('semantic');
        expect(result.confidence).toBe(0.9);
      });

      test('should classify file with "component" in name', () => {
        const result = FileClassifier.classify('components.json');

        expect(result.category).toBe('semantic');
        expect(result.confidence).toBe(0.9);
      });

      test('should classify file with "alias" in name', () => {
        const result = FileClassifier.classify('aliases.json');

        expect(result.category).toBe('semantic');
        expect(result.confidence).toBe(0.9);
      });

      test('should be case insensitive for semantics', () => {
        expect(FileClassifier.classify('SEMANTIC.json').category).toBe('semantic');
        expect(FileClassifier.classify('Semantic.json').category).toBe('semantic');
        expect(FileClassifier.classify('THEME.json').category).toBe('semantic');
      });
    });

    describe('unknown classification', () => {
      test('should default unknown files to primitive', () => {
        const result = FileClassifier.classify('colors.json');

        expect(result.category).toBe('primitive');
        expect(result.confidence).toBe(0.5);
      });

      test('should default random filenames to primitive', () => {
        const result = FileClassifier.classify('random-file.json');

        expect(result.category).toBe('primitive');
        expect(result.confidence).toBe(0.5);
      });
    });

    describe('path handling', () => {
      test('should handle full paths', () => {
        const result = FileClassifier.classify('tokens/primitives/colors.json');

        expect(result.category).toBe('primitive');
      });

      test('should handle deep paths', () => {
        const result = FileClassifier.classify('src/design/tokens/semantic/theme.json');

        expect(result.category).toBe('semantic');
      });

      test('should extract filename from path', () => {
        const result = FileClassifier.classify('foo/bar/baz/semantic.json');

        expect(result.category).toBe('semantic');
      });

      test('should handle paths with no directory', () => {
        const result = FileClassifier.classify('primitive.json');

        expect(result.category).toBe('primitive');
      });
    });
  });

  describe('isPrimitive()', () => {
    test('should return true for primitive files', () => {
      expect(FileClassifier.isPrimitive('primitives.json')).toBe(true);
      expect(FileClassifier.isPrimitive('base.json')).toBe(true);
      expect(FileClassifier.isPrimitive('core.json')).toBe(true);
    });

    test('should return false for semantic files', () => {
      expect(FileClassifier.isPrimitive('semantic.json')).toBe(false);
      expect(FileClassifier.isPrimitive('theme.json')).toBe(false);
    });

    test('should return true for unknown files (default)', () => {
      expect(FileClassifier.isPrimitive('colors.json')).toBe(true);
    });
  });

  describe('isSemantic()', () => {
    test('should return true for semantic files', () => {
      expect(FileClassifier.isSemantic('semantic.json')).toBe(true);
      expect(FileClassifier.isSemantic('theme.json')).toBe(true);
      expect(FileClassifier.isSemantic('components.json')).toBe(true);
    });

    test('should return false for primitive files', () => {
      expect(FileClassifier.isSemantic('primitives.json')).toBe(false);
      expect(FileClassifier.isSemantic('base.json')).toBe(false);
    });

    test('should return false for unknown files (default)', () => {
      expect(FileClassifier.isSemantic('colors.json')).toBe(false);
    });
  });

  describe('classifyBatch()', () => {
    test('should classify multiple files correctly', () => {
      const files = [
        'primitives/colors.json',
        'primitives/spacing.json',
        'semantic/theme.json',
        'semantic/components.json'
      ];

      const result = FileClassifier.classifyBatch(files);

      expect(result.primitives).toHaveLength(2);
      expect(result.semantics).toHaveLength(2);
      expect(result.primitives).toContain('primitives/colors.json');
      expect(result.primitives).toContain('primitives/spacing.json');
      expect(result.semantics).toContain('semantic/theme.json');
      expect(result.semantics).toContain('semantic/components.json');
    });

    test('should handle empty array', () => {
      const result = FileClassifier.classifyBatch([]);

      expect(result.primitives).toEqual([]);
      expect(result.semantics).toEqual([]);
    });

    test('should handle all primitives', () => {
      const files = ['primitives.json', 'base.json', 'core.json'];
      const result = FileClassifier.classifyBatch(files);

      expect(result.primitives).toHaveLength(3);
      expect(result.semantics).toHaveLength(0);
    });

    test('should handle all semantics', () => {
      const files = ['semantic.json', 'theme.json', 'aliases.json'];
      const result = FileClassifier.classifyBatch(files);

      expect(result.primitives).toHaveLength(0);
      expect(result.semantics).toHaveLength(3);
    });

    test('should default unknown files to primitives', () => {
      const files = ['unknown1.json', 'unknown2.json', 'random.json'];
      const result = FileClassifier.classifyBatch(files);

      expect(result.primitives).toHaveLength(3);
      expect(result.semantics).toHaveLength(0);
    });

    test('should handle mixed file types', () => {
      const files = [
        'base-colors.json',
        'semantic-text.json',
        'unknown.json',
        'theme-dark.json',
        'primitive-spacing.json'
      ];

      const result = FileClassifier.classifyBatch(files);

      expect(result.primitives.length + result.semantics.length).toBe(5);
      expect(result.primitives).toContain('base-colors.json');
      expect(result.semantics).toContain('semantic-text.json');
      expect(result.semantics).toContain('theme-dark.json');
      expect(result.primitives).toContain('primitive-spacing.json');
    });
  });

  describe('edge cases', () => {
    test('should handle filenames with multiple keywords', () => {
      // Semantic patterns are checked first, so semantic wins
      const result = FileClassifier.classify('primitive-semantic.json');

      expect(result.category).toBe('semantic');
    });

    test('should handle filenames without extension', () => {
      const result = FileClassifier.classify('primitives');

      expect(result.category).toBe('primitive');
    });

    test('should handle empty filename', () => {
      const result = FileClassifier.classify('');

      expect(result.category).toBe('primitive');
      expect(result.confidence).toBe(0.5);
    });

    test('should handle filename with only path separator', () => {
      const result = FileClassifier.classify('tokens/');

      expect(result.category).toBe('primitive');
      expect(result.confidence).toBe(0.9);
    });
  });
});

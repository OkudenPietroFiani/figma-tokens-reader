// ====================================================================================
// TOKEN LEVEL ANALYZER TESTS
// ====================================================================================

import { TokenLevelAnalyzer } from '../../../core/services/TokenLevelAnalyzer';

describe('TokenLevelAnalyzer', () => {
  let analyzer: TokenLevelAnalyzer;

  beforeEach(() => {
    analyzer = new TokenLevelAnalyzer();
  });

  describe('analyze()', () => {
    it('should detect redundant top-level key matching filename', () => {
      const data = {
        semantic: {
          color: {
            background: {
              primary: { $value: '#000000', $type: 'color' }
            }
          }
        }
      };

      const analysis = analyzer.analyze(data, 'semantic.json');

      expect(analysis.detectedLevel).toBe('semantic');
      expect(analysis.hasRedundantTopLevel).toBe(true);
      expect(analysis.redundantKey).toBe('semantic');
      expect(analysis.foundLevels).toContain('semantic');
    });

    it('should detect redundant top-level key matching explicit collection', () => {
      const data = {
        primitive: {
          color: {
            primary: { $value: '#000000', $type: 'color' }
          }
        }
      };

      const analysis = analyzer.analyze(data, undefined, 'primitive');

      expect(analysis.detectedLevel).toBe('primitive');
      expect(analysis.hasRedundantTopLevel).toBe(true);
      expect(analysis.redundantKey).toBe('primitive');
    });

    it('should not mark as redundant when top-level key does not match', () => {
      const data = {
        color: {
          primary: { $value: '#000000', $type: 'color' }
        }
      };

      const analysis = analyzer.analyze(data, 'semantic.json');

      expect(analysis.detectedLevel).toBe('semantic');
      expect(analysis.hasRedundantTopLevel).toBe(false);
      expect(analysis.redundantKey).toBeUndefined();
    });

    it('should detect level from filename when no redundancy', () => {
      const data = {
        color: {
          primary: { $value: '#000000', $type: 'color' }
        }
      };

      const analysis = analyzer.analyze(data, 'tokens/primitives.json');

      expect(analysis.detectedLevel).toBe('primitive');
      expect(analysis.hasRedundantTopLevel).toBe(false);
    });

    it('should handle multiple top-level keys without marking as redundant', () => {
      const data = {
        color: {
          primary: { $value: '#000000', $type: 'color' }
        },
        spacing: {
          small: { $value: 4, $type: 'spacing' }
        }
      };

      const analysis = analyzer.analyze(data, 'semantic.json');

      expect(analysis.detectedLevel).toBe('semantic');
      expect(analysis.hasRedundantTopLevel).toBe(false);
    });

    it('should detect component level', () => {
      const data = {
        component: {
          button: {
            background: { $value: '#000000', $type: 'color' }
          }
        }
      };

      const analysis = analyzer.analyze(data, 'component.json');

      expect(analysis.detectedLevel).toBe('component');
      expect(analysis.hasRedundantTopLevel).toBe(true);
      expect(analysis.redundantKey).toBe('component');
    });

    it('should detect theme level', () => {
      const data = {
        theme: {
          dark: {
            background: { $value: '#000000', $type: 'color' }
          }
        }
      };

      const analysis = analyzer.analyze(data, 'theme.json');

      expect(analysis.detectedLevel).toBe('theme');
      expect(analysis.hasRedundantTopLevel).toBe(true);
    });

    it('should handle aliases like "primitives" for primitive level', () => {
      const data = {
        primitives: {
          color: {
            primary: { $value: '#000000', $type: 'color' }
          }
        }
      };

      const analysis = analyzer.analyze(data, 'primitives.json');

      expect(analysis.detectedLevel).toBe('primitive');
      expect(analysis.hasRedundantTopLevel).toBe(true);
      expect(analysis.redundantKey).toBe('primitives');
    });
  });

  describe('normalizePath()', () => {
    it('should remove redundant top-level key from path', () => {
      const data = {
        semantic: {
          color: {
            background: { $value: '#000000' }
          }
        }
      };

      const analysis = analyzer.analyze(data, 'semantic.json');
      const path = ['semantic', 'color', 'background', 'primary'];
      const normalized = analyzer.normalizePath(path, analysis);

      expect(normalized).toEqual(['color', 'background', 'primary']);
    });

    it('should not modify path when no redundancy', () => {
      const data = {
        color: {
          background: { $value: '#000000' }
        }
      };

      const analysis = analyzer.analyze(data, 'semantic.json');
      const path = ['color', 'background', 'primary'];
      const normalized = analyzer.normalizePath(path, analysis);

      expect(normalized).toEqual(['color', 'background', 'primary']);
    });

    it('should handle case-sensitive path keys', () => {
      const data = {
        Semantic: {
          color: { $value: '#000000' }
        }
      };

      const analysis = analyzer.analyze(data, 'semantic.json');
      const path = ['Semantic', 'color', 'primary'];
      const normalized = analyzer.normalizePath(path, analysis);

      // Should remove 'Semantic' (case-insensitive match works)
      expect(normalized).toEqual(['color', 'primary']);
    });
  });

  describe('getLevels()', () => {
    it('should return all defined levels in order', () => {
      const levels = analyzer.getLevels();

      expect(levels).toHaveLength(4);
      expect(levels[0].name).toBe('primitive');
      expect(levels[0].order).toBe(0);
      expect(levels[1].name).toBe('semantic');
      expect(levels[1].order).toBe(1);
      expect(levels[2].name).toBe('component');
      expect(levels[3].name).toBe('theme');
    });
  });

  describe('addLevel()', () => {
    it('should add custom level definition', () => {
      const customLevel = {
        name: 'custom',
        order: 2.5,
        keywords: ['custom', 'special']
      };

      analyzer.addLevel(customLevel);
      const levels = analyzer.getLevels();

      const custom = levels.find(l => l.name === 'custom');
      expect(custom).toBeDefined();
      expect(custom?.keywords).toContain('custom');
    });

    it('should replace existing level with same name', () => {
      const updatedPrimitive = {
        name: 'primitive',
        order: 0,
        keywords: ['primitive', 'base', 'custom-keyword']
      };

      analyzer.addLevel(updatedPrimitive);
      const levels = analyzer.getLevels();

      const primitive = levels.find(l => l.name === 'primitive');
      expect(primitive?.keywords).toContain('custom-keyword');
    });
  });

  describe('real-world examples', () => {
    it('should handle semantic.json with semantic top-level', () => {
      const semanticJson = {
        semantic: {
          color: {
            background: {
              primary: {
                solid: {
                  default: { $value: '{primitive.color.primary.600}', $type: 'color' }
                }
              }
            }
          }
        }
      };

      const analysis = analyzer.analyze(semanticJson, 'semantic.json');

      expect(analysis.hasRedundantTopLevel).toBe(true);
      expect(analysis.redundantKey).toBe('semantic');

      const originalPath = ['semantic', 'color', 'background', 'primary', 'solid', 'default'];
      const normalizedPath = analyzer.normalizePath(originalPath, analysis);

      expect(normalizedPath).toEqual(['color', 'background', 'primary', 'solid', 'default']);
    });

    it('should handle primitives.json with primitive top-level', () => {
      const primitivesJson = {
        primitive: {
          color: {
            primary: {
              '600': { $value: { colorSpace: 'hsl', h: 240, s: 100, l: 50 }, $type: 'color' }
            }
          }
        }
      };

      const analysis = analyzer.analyze(primitivesJson, 'primitives.json');

      expect(analysis.hasRedundantTopLevel).toBe(true);
      expect(analysis.redundantKey).toBe('primitive');

      const originalPath = ['primitive', 'color', 'primary', '600'];
      const normalizedPath = analyzer.normalizePath(originalPath, analysis);

      expect(normalizedPath).toEqual(['color', 'primary', '600']);
    });

    it('should handle flat structure without level duplication', () => {
      const flatJson = {
        color: {
          primary: { $value: '#000000', $type: 'color' }
        },
        spacing: {
          small: { $value: 4, $type: 'spacing' }
        }
      };

      const analysis = analyzer.analyze(flatJson, 'tokens.json');

      expect(analysis.hasRedundantTopLevel).toBe(false);

      const path = ['color', 'primary'];
      const normalizedPath = analyzer.normalizePath(path, analysis);

      expect(normalizedPath).toEqual(['color', 'primary']);
    });
  });
});

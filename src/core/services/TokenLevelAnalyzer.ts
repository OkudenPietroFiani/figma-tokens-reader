// ====================================================================================
// TOKEN LEVEL ANALYZER
// Detects and normalizes token hierarchy levels to eliminate redundancy
// ====================================================================================

import { TokenData } from '../../shared/types';

/**
 * Token level information
 */
export interface TokenLevel {
  /** Level identifier (e.g., 'primitive', 'semantic', 'component', 'theme') */
  name: string;
  /** Order in hierarchy (0 = base, higher = derived) */
  order: number;
  /** Keywords/aliases that identify this level */
  keywords: string[];
}

/**
 * Analysis result for a token file
 */
export interface TokenLevelAnalysis {
  /** Detected level from structure or filename */
  detectedLevel?: string;
  /** Whether top-level key should be stripped (redundant with collection) */
  hasRedundantTopLevel: boolean;
  /** The redundant top-level key to strip, if any */
  redundantKey?: string;
  /** All detected level keywords in the structure */
  foundLevels: string[];
}

/**
 * Token Level Analyzer
 *
 * Analyzes token file structure to detect hierarchy levels and identify
 * redundant nesting patterns (e.g., semantic.json > "semantic" > ...)
 *
 * Design Principles:
 * - Flexible: Adapts to any JSON structure, not hardcoded
 * - Smart: Detects common patterns automatically
 * - Configurable: Can be extended with custom level definitions
 *
 * Usage:
 * ```typescript
 * const analyzer = new TokenLevelAnalyzer();
 * const analysis = analyzer.analyze(data, 'semantic.json');
 * // { detectedLevel: 'semantic', hasRedundantTopLevel: true, redundantKey: 'semantic' }
 * ```
 */
export class TokenLevelAnalyzer {
  private levels: TokenLevel[] = [
    {
      name: 'primitive',
      order: 0,
      keywords: ['primitive', 'primitives', 'base', 'foundation', 'core', 'global']
    },
    {
      name: 'semantic',
      order: 1,
      keywords: ['semantic', 'semantics', 'alias', 'theme-agnostic']
    },
    {
      name: 'component',
      order: 2,
      keywords: ['component', 'components', 'comp', 'widget', 'widgets']
    },
    {
      name: 'theme',
      order: 3,
      keywords: ['theme', 'themes', 'brand', 'brands', 'variant', 'variants']
    }
  ];

  /**
   * Analyze token data structure to detect levels and redundancy
   *
   * @param data - Token data (JSON structure)
   * @param filePath - Optional file path for additional context
   * @param explicitCollection - Explicitly provided collection name
   * @returns Analysis result with level detection and redundancy info
   */
  analyze(
    data: TokenData,
    filePath?: string,
    explicitCollection?: string
  ): TokenLevelAnalysis {
    // Step 1: Detect level from filename/path
    const pathLevel = this.detectLevelFromPath(filePath);

    // Step 2: Get top-level keys from JSON
    const topLevelKeys = this.getTopLevelKeys(data);

    // Step 3: Detect level keywords in top-level structure
    const foundLevels = this.detectLevelsInKeys(topLevelKeys);

    // Step 4: Check for redundancy
    const redundancyCheck = this.checkRedundancy(
      topLevelKeys,
      pathLevel,
      explicitCollection,
      foundLevels
    );

    return {
      detectedLevel: redundancyCheck.detectedLevel,
      hasRedundantTopLevel: redundancyCheck.hasRedundantTopLevel,
      redundantKey: redundancyCheck.redundantKey,
      foundLevels
    };
  }

  /**
   * Normalize token path by removing redundant level keys
   *
   * @param path - Original token path
   * @param analysis - Analysis result from analyze()
   * @returns Normalized path with redundancy removed
   */
  normalizePath(path: string[], analysis: TokenLevelAnalysis): string[] {
    if (!analysis.hasRedundantTopLevel || !analysis.redundantKey) {
      return path;
    }

    // Remove redundant top-level key
    if (path[0] === analysis.redundantKey) {
      return path.slice(1);
    }

    return path;
  }

  /**
   * Get all defined levels with their order
   */
  getLevels(): TokenLevel[] {
    return [...this.levels];
  }

  /**
   * Add custom level definition
   */
  addLevel(level: TokenLevel): void {
    // Remove existing level with same name
    this.levels = this.levels.filter(l => l.name !== level.name);

    // Add new level
    this.levels.push(level);

    // Re-sort by order
    this.levels.sort((a, b) => a.order - b.order);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Detect level from file path
   */
  private detectLevelFromPath(filePath?: string): string | undefined {
    if (!filePath) return undefined;

    const normalized = filePath.toLowerCase();

    for (const level of this.levels) {
      for (const keyword of level.keywords) {
        if (normalized.includes(keyword)) {
          return level.name;
        }
      }
    }

    return undefined;
  }

  /**
   * Get top-level keys from token data (excluding metadata)
   */
  private getTopLevelKeys(data: TokenData): string[] {
    if (typeof data !== 'object' || data === null) return [];

    return Object.keys(data).filter(key => !key.startsWith('$'));
  }

  /**
   * Detect level keywords in a list of keys
   */
  private detectLevelsInKeys(keys: string[]): string[] {
    const found = new Set<string>();

    for (const key of keys) {
      const normalized = key.toLowerCase();

      for (const level of this.levels) {
        for (const keyword of level.keywords) {
          if (normalized === keyword || normalized.includes(keyword)) {
            found.add(level.name);
          }
        }
      }
    }

    return Array.from(found);
  }

  /**
   * Check for redundancy between top-level keys and collection/path
   */
  private checkRedundancy(
    topLevelKeys: string[],
    pathLevel: string | undefined,
    explicitCollection: string | undefined,
    foundLevels: string[]
  ): {
    detectedLevel?: string;
    hasRedundantTopLevel: boolean;
    redundantKey?: string;
  } {
    // If no top-level keys, no redundancy
    if (topLevelKeys.length === 0) {
      return {
        detectedLevel: pathLevel || explicitCollection,
        hasRedundantTopLevel: false
      };
    }

    // If single top-level key that matches a level keyword
    if (topLevelKeys.length === 1 && foundLevels.length > 0) {
      const topKey = topLevelKeys[0];
      const topKeyNormalized = topKey.toLowerCase();

      // Check if top-level key matches path level or explicit collection
      const matchesPath = pathLevel && this.keyMatchesLevel(topKeyNormalized, pathLevel);
      const matchesCollection = explicitCollection &&
        this.keyMatchesLevel(topKeyNormalized, explicitCollection);

      if (matchesPath || matchesCollection) {
        return {
          detectedLevel: pathLevel || this.detectLevelFromKey(topKeyNormalized),
          hasRedundantTopLevel: true,
          redundantKey: topKey
        };
      }

      // Top-level key is a level but doesn't match path/collection
      // Use it as the detected level
      return {
        detectedLevel: this.detectLevelFromKey(topKeyNormalized),
        hasRedundantTopLevel: false
      };
    }

    // Multiple top-level keys - no redundancy
    return {
      detectedLevel: pathLevel || explicitCollection,
      hasRedundantTopLevel: false
    };
  }

  /**
   * Check if a key matches a level
   */
  private keyMatchesLevel(key: string, level: string): boolean {
    const levelDef = this.levels.find(l => l.name === level);
    if (!levelDef) return false;

    return levelDef.keywords.some(keyword =>
      key === keyword || key.includes(keyword)
    );
  }

  /**
   * Detect level from a single key
   */
  private detectLevelFromKey(key: string): string | undefined {
    for (const level of this.levels) {
      for (const keyword of level.keywords) {
        if (key === keyword || key.includes(keyword)) {
          return level.name;
        }
      }
    }
    return undefined;
  }
}

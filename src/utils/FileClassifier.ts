// ====================================================================================
// FILE CLASSIFIER
// Classifies token files into primitives/semantics based on filename patterns
// ====================================================================================

/**
 * Classification result for token files
 */
export interface FileClassification {
  category: 'primitive' | 'semantic' | 'unknown';
  confidence: number; // 0-1
}

/**
 * File classifier utility
 *
 * SOLID Principles:
 * - Single Responsibility: Only classifies files
 * - Open/Closed: Easy to extend with new patterns
 * - No dependencies: Pure utility class
 *
 * Classification Rules:
 * - Primitives: Contains "primitive", "base", "core", "foundation"
 * - Semantics: Contains "semantic", "theme", "component"
 * - Unknown: Doesn't match patterns (defaults to primitive for safety)
 */
export class FileClassifier {
  private static readonly PRIMITIVE_PATTERNS = [
    /primitive/i,
    /base/i,
    /core/i,
    /foundation/i,
    /tokens/i, // Generic token files default to primitives
  ];

  private static readonly SEMANTIC_PATTERNS = [
    /semantic/i,
    /theme/i,
    /component/i,
    /alias/i,
  ];

  /**
   * Classify a file path or filename
   *
   * @param filePath - Full path or filename
   * @returns Classification with confidence score
   */
  static classify(filePath: string): FileClassification {
    const filename = this.extractFilename(filePath);

    // Check for semantic patterns first (more specific)
    for (const pattern of this.SEMANTIC_PATTERNS) {
      if (pattern.test(filename)) {
        return {
          category: 'semantic',
          confidence: 0.9
        };
      }
    }

    // Check for primitive patterns
    for (const pattern of this.PRIMITIVE_PATTERNS) {
      if (pattern.test(filename)) {
        return {
          category: 'primitive',
          confidence: 0.9
        };
      }
    }

    // Unknown - default to primitive for backward compatibility
    return {
      category: 'primitive',
      confidence: 0.5
    };
  }

  /**
   * Check if file is primitive
   *
   * @param filePath - Full path or filename
   * @returns True if file is classified as primitive
   */
  static isPrimitive(filePath: string): boolean {
    return this.classify(filePath).category === 'primitive';
  }

  /**
   * Check if file is semantic
   *
   * @param filePath - Full path or filename
   * @returns True if file is classified as semantic
   */
  static isSemantic(filePath: string): boolean {
    return this.classify(filePath).category === 'semantic';
  }

  /**
   * Extract filename from full path
   * @private
   */
  private static extractFilename(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || filePath;
  }

  /**
   * Classify multiple files into primitives and semantics
   *
   * @param filePaths - Array of file paths
   * @returns Object with primitive and semantic arrays
   */
  static classifyBatch(filePaths: string[]): { primitives: string[]; semantics: string[] } {
    const primitives: string[] = [];
    const semantics: string[] = [];

    for (const path of filePaths) {
      const classification = this.classify(path);

      if (classification.category === 'semantic') {
        semantics.push(path);
      } else {
        // Default to primitives (including 'unknown')
        primitives.push(path);
      }
    }

    return { primitives, semantics };
  }
}

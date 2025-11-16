// ====================================================================================
// PRE-SYNC VALIDATOR TESTS
// Comprehensive tests for token validation before Figma sync
// ====================================================================================

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PreSyncValidator } from '../PreSyncValidator';
import { Token } from '../../models/Token';

describe('PreSyncValidator', () => {
  let validator: PreSyncValidator;

  beforeEach(() => {
    validator = new PreSyncValidator();
  });

  // Helper to create base token
  const createToken = (overrides: Partial<Token>): Token => {
    return {
      id: `test-${Date.now()}-${Math.random()}`,
      path: ['test'],
      name: 'test',
      qualifiedName: 'test',
      type: 'color',
      rawValue: '#000000',
      value: { hex: '#000000' },
      projectId: 'project-1',
      collection: 'test',
      sourceFormat: 'w3c',
      source: {
        type: 'local',
        location: 'test',
        imported: new Date().toISOString(),
      },
      extensions: {},
      tags: [],
      status: 'active',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      ...overrides,
    } as Token;
  };

  describe('validate() - basic validation', () => {
    it('should return valid report for valid tokens', () => {
      const tokens = [
        createToken({
          type: 'color',
          value: { hex: '#1e40af' },
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(true);
      expect(report.errorCount).toBe(0);
      expect(report.warningCount).toBe(0);
      expect(report.issues).toHaveLength(0);
    });

    it('should detect project mismatch', () => {
      const tokens = [
        createToken({
          projectId: 'project-2',
          qualifiedName: 'color.primary',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(true); // Warnings don't invalidate
      expect(report.warningCount).toBe(1);
      expect(report.issues[0].code).toBe('PROJECT_MISMATCH');
      expect(report.issues[0].severity).toBe('warning');
    });
  });

  describe('Unresolved references detection', () => {
    it('should detect unresolved top-level reference', () => {
      const tokens = [
        createToken({
          type: 'color',
          value: '{color.primary}' as any, // Unresolved reference
          qualifiedName: 'color.secondary',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(false);
      expect(report.errorCount).toBe(1);
      expect(report.issues[0].code).toBe('UNRESOLVED_REFERENCE');
      expect(report.issues[0].message).toContain('{color.primary}');
    });

    it('should detect unresolved nested reference in typography', () => {
      const tokens = [
        createToken({
          type: 'typography',
          value: {
            fontFamily: 'Inter',
            fontSize: '{typography.fontSize.large}', // Unresolved
            fontWeight: 700,
          },
          qualifiedName: 'typography.heading.h1',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(false);
      expect(report.errorCount).toBeGreaterThan(0);
      const unresolvedIssue = report.issues.find(
        i => i.code === 'UNRESOLVED_NESTED_REFERENCE'
      );
      expect(unresolvedIssue).toBeDefined();
      expect(unresolvedIssue!.message).toContain('{typography.fontSize.large}');
    });

    it('should detect unresolved color reference in shadow', () => {
      const tokens = [
        createToken({
          type: 'shadow',
          value: {
            offsetX: 0,
            offsetY: 4,
            blur: 6,
            color: '{color.shadow}', // Unresolved - CRITICAL for shadows!
          },
          qualifiedName: 'shadow.md',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(false);
      expect(report.errorCount).toBeGreaterThan(0);
      const colorIssue = report.issues.find(
        i => i.code === 'UNRESOLVED_NESTED_REFERENCE' && i.message.includes('COLOR')
      );
      expect(colorIssue).toBeDefined();
      expect(colorIssue!.severity).toBe('error'); // Color is critical
    });

    it('should NOT flag resolved values as unresolved', () => {
      const tokens = [
        createToken({
          type: 'color',
          aliasTo: 'color-base',
          value: { hex: '#1e40af' },
          resolvedValue: { hex: '#1e40af' }, // Resolved!
          qualifiedName: 'color.primary',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(true);
      expect(report.errorCount).toBe(0);
    });
  });

  describe('Typography token validation', () => {
    it('should validate complete typography token', () => {
      const tokens = [
        createToken({
          type: 'typography',
          value: {
            fontFamily: 'Inter',
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1.2,
          },
          qualifiedName: 'typography.heading.h1',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(true);
      expect(report.errorCount).toBe(0);
    });

    it('should warn about missing fontFamily', () => {
      const tokens = [
        createToken({
          type: 'typography',
          value: {
            fontSize: 16,
            fontWeight: 400,
          },
          qualifiedName: 'typography.body',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.warningCount).toBeGreaterThan(0);
      const missingFontFamily = report.issues.find(i => i.code === 'MISSING_FONT_FAMILY');
      expect(missingFontFamily).toBeDefined();
    });

    it('should warn about missing fontSize', () => {
      const tokens = [
        createToken({
          type: 'typography',
          value: {
            fontFamily: 'Inter',
            fontWeight: 400,
          },
          qualifiedName: 'typography.body',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.warningCount).toBeGreaterThan(0);
      const missingFontSize = report.issues.find(i => i.code === 'MISSING_FONT_SIZE');
      expect(missingFontSize).toBeDefined();
    });

    it('should detect invalid fontSize type', () => {
      const tokens = [
        createToken({
          type: 'typography',
          value: {
            fontFamily: 'Inter',
            fontSize: { invalid: true } as any, // Invalid type
            fontWeight: 400,
          },
          qualifiedName: 'typography.body',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.errorCount).toBeGreaterThan(0);
      const invalidFontSize = report.issues.find(i => i.code === 'INVALID_FONT_SIZE');
      expect(invalidFontSize).toBeDefined();
    });

    it('should skip validation for typography group tokens', () => {
      const tokens = [
        createToken({
          type: 'typography',
          value: {}, // Empty object - group token
          qualifiedName: 'typography',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      // Should not have typography-specific errors
      const typoErrors = report.issues.filter(i =>
        ['MISSING_FONT_FAMILY', 'MISSING_FONT_SIZE', 'INVALID_FONT_SIZE'].includes(i.code)
      );
      expect(typoErrors).toHaveLength(0);
    });
  });

  describe('Shadow token validation', () => {
    it('should validate complete shadow token', () => {
      const tokens = [
        createToken({
          type: 'shadow',
          value: {
            offsetX: 0,
            offsetY: 4,
            blur: 6,
            spread: 0,
            color: { hex: '#000000' },
          },
          qualifiedName: 'shadow.md',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(true);
      expect(report.errorCount).toBe(0);
    });

    it('should detect missing required shadow properties', () => {
      const tokens = [
        createToken({
          type: 'shadow',
          value: {
            offsetX: 0,
            // Missing: offsetY, blur, color
          } as any, // Intentionally invalid for testing
          qualifiedName: 'shadow.md',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.errorCount).toBeGreaterThan(0);
      const missingProps = report.issues.filter(i => i.code === 'MISSING_SHADOW_PROPERTY');
      expect(missingProps.length).toBeGreaterThanOrEqual(3); // offsetY, blur, color
    });

    it('should flag missing color as critical', () => {
      const tokens = [
        createToken({
          type: 'shadow',
          value: {
            offsetX: 0,
            offsetY: 4,
            blur: 6,
            // Missing color - shadow will be invisible!
          } as any, // Intentionally invalid for testing
          qualifiedName: 'shadow.md',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.errorCount).toBeGreaterThan(0);
      const missingColor = report.issues.find(
        i => i.code === 'MISSING_SHADOW_PROPERTY' && i.message.includes('color')
      );
      expect(missingColor).toBeDefined();
      expect(missingColor!.severity).toBe('error');
    });

    it('should skip validation for shadow group tokens', () => {
      const tokens = [
        createToken({
          type: 'shadow',
          value: {} as any, // Empty object - group token
          qualifiedName: 'shadow',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      // Should not have shadow-specific errors
      const shadowErrors = report.issues.filter(i => i.code === 'MISSING_SHADOW_PROPERTY');
      expect(shadowErrors).toHaveLength(0);
    });
  });

  describe('Color token validation', () => {
    it('should validate hex color', () => {
      const tokens = [
        createToken({
          type: 'color',
          value: { hex: '#1e40af' },
          qualifiedName: 'color.primary',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(true);
      expect(report.errorCount).toBe(0);
    });

    it('should validate RGB color', () => {
      const tokens = [
        createToken({
          type: 'color',
          value: { r: 30, g: 64, b: 175 },
          qualifiedName: 'color.primary',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(true);
      expect(report.errorCount).toBe(0);
    });

    it('should validate HSL color', () => {
      const tokens = [
        createToken({
          type: 'color',
          value: { h: 225, s: 73, l: 40 },
          qualifiedName: 'color.primary',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(true);
      expect(report.errorCount).toBe(0);
    });

    it('should detect invalid color format', () => {
      const tokens = [
        createToken({
          type: 'color',
          value: { invalid: true } as any, // No hex, rgb, or hsl
          qualifiedName: 'color.primary',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.errorCount).toBeGreaterThan(0);
      const invalidFormat = report.issues.find(i => i.code === 'INVALID_COLOR_FORMAT');
      expect(invalidFormat).toBeDefined();
    });

    it('should allow string color values', () => {
      const tokens = [
        createToken({
          type: 'color',
          value: '#1e40af' as any, // String color (will be converted)
          qualifiedName: 'color.primary',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(true);
    });
  });

  describe('Alias validation', () => {
    it('should warn if alias has no resolvedValue', () => {
      const tokens = [
        createToken({
          type: 'color',
          aliasTo: 'color-base',
          value: { hex: '#000000' },
          resolvedValue: undefined, // Not resolved yet
          qualifiedName: 'color.primary',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.warningCount).toBeGreaterThan(0);
      const aliasWarning = report.issues.find(i => i.code === 'ALIAS_NOT_RESOLVED');
      expect(aliasWarning).toBeDefined();
      expect(aliasWarning!.fix).toContain('TokenResolver');
    });

    it('should NOT warn if alias has resolvedValue', () => {
      const tokens = [
        createToken({
          type: 'color',
          aliasTo: 'color-base',
          value: { hex: '#000000' },
          resolvedValue: { hex: '#1e40af' }, // Resolved
          qualifiedName: 'color.primary',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      const aliasWarning = report.issues.find(i => i.code === 'ALIAS_NOT_RESOLVED');
      expect(aliasWarning).toBeUndefined();
    });
  });

  describe('formatReport()', () => {
    it('should format valid report', () => {
      const tokens = [
        createToken({
          type: 'color',
          value: { hex: '#1e40af' },
        }),
      ];

      const report = validator.validate(tokens, 'project-1');
      const formatted = validator.formatReport(report);

      expect(formatted).toContain('✓ All tokens are valid');
    });

    it('should format error report with fix suggestions', () => {
      const tokens = [
        createToken({
          type: 'shadow',
          value: {
            offsetX: 0,
            // Missing required properties
          } as any, // Intentionally invalid for testing
          qualifiedName: 'shadow.md',
          path: ['shadow', 'md'],
        }),
      ];

      const report = validator.validate(tokens, 'project-1');
      const formatted = validator.formatReport(report);

      expect(formatted).toContain('ERRORS:');
      expect(formatted).toContain('❌');
      expect(formatted).toContain('shadow/md');
      expect(formatted).toContain('💡 Fix:');
    });

    it('should categorize issues by severity', () => {
      const tokens = [
        // Error: unresolved reference
        createToken({
          type: 'color',
          value: '{color.undefined}' as any, // Intentionally invalid for testing
          qualifiedName: 'color.error',
          path: ['color', 'error'],
        }),
        // Warning: project mismatch
        createToken({
          type: 'color',
          projectId: 'project-2',
          value: { hex: '#000000' },
          qualifiedName: 'color.warning',
          path: ['color', 'warning'],
        }),
      ];

      const report = validator.validate(tokens, 'project-1');
      const formatted = validator.formatReport(report);

      expect(formatted).toContain('ERRORS:');
      expect(formatted).toContain('WARNINGS:');
      expect(report.errorCount).toBeGreaterThan(0);
      expect(report.warningCount).toBeGreaterThan(0);
    });
  });

  describe('Integration test: Complex token set', () => {
    it('should validate complex token set with mixed issues', () => {
      const tokens = [
        // Valid color
        createToken({
          id: 'color-1',
          type: 'color',
          value: { hex: '#1e40af' },
          qualifiedName: 'color.primary',
        }),
        // Typography with unresolved reference
        createToken({
          id: 'typo-1',
          type: 'typography',
          value: {
            fontFamily: 'Inter',
            fontSize: '{typography.fontSize.undefined}', // Error
            fontWeight: 700,
          },
          qualifiedName: 'typography.heading',
        }),
        // Shadow missing color
        createToken({
          id: 'shadow-1',
          type: 'shadow',
          value: {
            offsetX: 0,
            offsetY: 4,
            blur: 6,
            // Missing color - Error
          } as any, // Intentionally invalid for testing
          qualifiedName: 'shadow.md',
        }),
        // Alias not resolved
        createToken({
          id: 'alias-1',
          type: 'color',
          aliasTo: 'color-1',
          value: { hex: '#000000' },
          resolvedValue: undefined, // Warning
          qualifiedName: 'color.secondary',
        }),
      ];

      const report = validator.validate(tokens, 'project-1');

      expect(report.valid).toBe(false);
      expect(report.errorCount).toBeGreaterThan(0);
      expect(report.warningCount).toBeGreaterThan(0);
      expect(report.issues.length).toBeGreaterThan(0);

      // Check specific issues
      const unresolvedRef = report.issues.find(
        i => i.tokenId === 'typo-1' && i.code === 'UNRESOLVED_NESTED_REFERENCE'
      );
      expect(unresolvedRef).toBeDefined();

      const missingShadowColor = report.issues.find(
        i => i.tokenId === 'shadow-1' && i.code === 'MISSING_SHADOW_PROPERTY'
      );
      expect(missingShadowColor).toBeDefined();

      const aliasNotResolved = report.issues.find(
        i => i.tokenId === 'alias-1' && i.code === 'ALIAS_NOT_RESOLVED'
      );
      expect(aliasNotResolved).toBeDefined();
    });
  });
});

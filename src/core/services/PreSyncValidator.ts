// ====================================================================================
// PRE-SYNC VALIDATOR
// Validates tokens before Figma sync to prevent sync failures
// ====================================================================================

import { Token, isTypographyToken, isShadowToken, isColorToken } from '../models/Token';
import { Result, Success, Failure } from '../../shared/types';

/**
 * Validation issue severity
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Validation issue
 */
export interface ValidationIssue {
  tokenId: string;
  tokenPath: string[];
  severity: ValidationSeverity;
  code: string;
  message: string;
  fix?: string; // Suggested fix
}

/**
 * Validation report
 */
export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

/**
 * Pre-sync validator
 * Validates tokens before Figma sync to catch issues early
 *
 * SOLID Principles:
 * - Single Responsibility: Only validates tokens for sync compatibility
 * - Open/Closed: Extensible via rule-based validation
 *
 * Features:
 * - Detects unresolved references
 * - Validates composite tokens (typography, shadows)
 * - Provides actionable error messages
 * - Categorizes issues by severity
 *
 * Usage:
 * ```typescript
 * const validator = new PreSyncValidator();
 * const report = validator.validate(tokens, projectId);
 * if (!report.valid) {
 *   console.error(`Found ${report.errorCount} errors`);
 *   report.issues.forEach(issue => console.error(issue.message));
 * }
 * ```
 */
export class PreSyncValidator {
  /**
   * Validate tokens before Figma sync
   *
   * @param tokens - Tokens to validate
   * @param projectId - Project context for validation
   * @returns Validation report
   */
  validate(tokens: Token[], projectId: string): ValidationReport {
    const issues: ValidationIssue[] = [];

    for (const token of tokens) {
      // Validate token belongs to project
      if (token.projectId !== projectId) {
        issues.push({
          tokenId: token.id,
          tokenPath: token.path,
          severity: 'warning',
          code: 'PROJECT_MISMATCH',
          message: `Token ${token.qualifiedName} belongs to project "${token.projectId}" but is being synced to "${projectId}"`,
          fix: 'Ensure all tokens have matching projectId',
        });
      }

      // Check for unresolved references in value
      const unresolvedRefs = this.findUnresolvedReferences(token.value);
      if (unresolvedRefs.length > 0) {
        issues.push({
          tokenId: token.id,
          tokenPath: token.path,
          severity: 'error',
          code: 'UNRESOLVED_REFERENCE',
          message: `Token ${token.qualifiedName} has ${unresolvedRefs.length} unresolved reference(s): ${unresolvedRefs.join(', ')}`,
          fix: 'Ensure all referenced tokens exist in the same project and are defined before use',
        });
      }

      // Validate type-specific requirements
      if (isTypographyToken(token)) {
        const typoIssues = this.validateTypographyToken(token);
        issues.push(...typoIssues);
      } else if (isShadowToken(token)) {
        const shadowIssues = this.validateShadowToken(token);
        issues.push(...shadowIssues);
      } else if (isColorToken(token)) {
        const colorIssues = this.validateColorToken(token);
        issues.push(...colorIssues);
      }

      // Check resolvedValue if token has an alias
      if (token.aliasTo && !token.resolvedValue) {
        issues.push({
          tokenId: token.id,
          tokenPath: token.path,
          severity: 'warning',
          code: 'ALIAS_NOT_RESOLVED',
          message: `Token ${token.qualifiedName} is an alias to "${token.aliasTo}" but has no resolvedValue`,
          fix: 'Run TokenResolver.resolveAllTokens() before syncing',
        });
      }
    }

    // Categorize issues
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    return {
      valid: errorCount === 0,
      issues,
      errorCount,
      warningCount,
      infoCount,
    };
  }

  /**
   * Validate typography token
   */
  private validateTypographyToken(token: Token & { type: 'typography' }): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const value = token.resolvedValue || token.value;

    // Check if it's a composite token (has properties)
    if (typeof value !== 'object' || value === null) {
      issues.push({
        tokenId: token.id,
        tokenPath: token.path,
        severity: 'error',
        code: 'INVALID_TYPOGRAPHY_VALUE',
        message: `Typography token ${token.qualifiedName} has invalid value type: ${typeof value}`,
        fix: 'Typography tokens must be objects with fontFamily, fontSize, etc.',
      });
      return issues;
    }

    // Only validate if it has typography-specific properties (not a group token)
    const hasTypographyProps =
      'fontFamily' in value ||
      'fontSize' in value ||
      'fontWeight' in value ||
      'lineHeight' in value;

    if (!hasTypographyProps) {
      // This is a group token, not a leaf token - skip validation
      return issues;
    }

    // Check for required properties
    if (!('fontFamily' in value)) {
      issues.push({
        tokenId: token.id,
        tokenPath: token.path,
        severity: 'warning',
        code: 'MISSING_FONT_FAMILY',
        message: `Typography token ${token.qualifiedName} is missing fontFamily`,
        fix: 'Add fontFamily property',
      });
    }

    if (!('fontSize' in value)) {
      issues.push({
        tokenId: token.id,
        tokenPath: token.path,
        severity: 'warning',
        code: 'MISSING_FONT_SIZE',
        message: `Typography token ${token.qualifiedName} is missing fontSize`,
        fix: 'Add fontSize property (Figma will use 12px default)',
      });
    }

    // Check for unresolved references in nested properties
    const nestedRefs = this.findUnresolvedReferences(value);
    if (nestedRefs.length > 0) {
      issues.push({
        tokenId: token.id,
        tokenPath: token.path,
        severity: 'error',
        code: 'UNRESOLVED_NESTED_REFERENCE',
        message: `Typography token ${token.qualifiedName} has unresolved nested references: ${nestedRefs.join(', ')}`,
        fix: 'Ensure all referenced tokens are defined and resolved',
      });
    }

    // Validate fontSize is a valid number/string
    if ('fontSize' in value) {
      const fontSize = value.fontSize;
      if (typeof fontSize !== 'number' && typeof fontSize !== 'string') {
        issues.push({
          tokenId: token.id,
          tokenPath: token.path,
          severity: 'error',
          code: 'INVALID_FONT_SIZE',
          message: `Typography token ${token.qualifiedName} has invalid fontSize type: ${typeof fontSize}`,
          fix: 'fontSize must be a number or string with unit (e.g., "16px", "1rem")',
        });
      }
    }

    return issues;
  }

  /**
   * Validate shadow token
   */
  private validateShadowToken(token: Token & { type: 'shadow' }): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const value = token.resolvedValue || token.value;

    // Check if it's a composite token (has properties)
    if (typeof value !== 'object' || value === null) {
      issues.push({
        tokenId: token.id,
        tokenPath: token.path,
        severity: 'error',
        code: 'INVALID_SHADOW_VALUE',
        message: `Shadow token ${token.qualifiedName} has invalid value type: ${typeof value}`,
        fix: 'Shadow tokens must be objects with offsetX, offsetY, blur, color',
      });
      return issues;
    }

    // Only validate if it has shadow-specific properties (not a group token)
    const hasShadowProps =
      'offsetX' in value ||
      'offsetY' in value ||
      'blur' in value ||
      'color' in value;

    if (!hasShadowProps) {
      // This is a group token, not a leaf token - skip validation
      return issues;
    }

    // Check for required properties
    const requiredProps = ['offsetX', 'offsetY', 'blur', 'color'];
    for (const prop of requiredProps) {
      if (!(prop in value)) {
        issues.push({
          tokenId: token.id,
          tokenPath: token.path,
          severity: 'error',
          code: 'MISSING_SHADOW_PROPERTY',
          message: `Shadow token ${token.qualifiedName} is missing required property: ${prop}`,
          fix: `Add ${prop} property`,
        });
      }
    }

    // Check for unresolved references in nested properties (especially color!)
    const nestedRefs = this.findUnresolvedReferences(value);
    if (nestedRefs.length > 0) {
      // Check if color is unresolved - this is critical
      const colorUnresolved = nestedRefs.some(ref => ref.toLowerCase().includes('color'));
      issues.push({
        tokenId: token.id,
        tokenPath: token.path,
        severity: colorUnresolved ? 'error' : 'warning',
        code: 'UNRESOLVED_NESTED_REFERENCE',
        message: `Shadow token ${token.qualifiedName} has unresolved nested references: ${nestedRefs.join(', ')}${colorUnresolved ? ' (COLOR IS MISSING - shadow will be invisible!)' : ''}`,
        fix: 'Ensure all referenced tokens are defined and resolved',
      });
    }

    return issues;
  }

  /**
   * Validate color token
   */
  private validateColorToken(token: Token & { type: 'color' }): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const value = token.resolvedValue || token.value;

    // Check if value is valid
    if (typeof value !== 'object' || value === null) {
      // String colors are valid (hex, rgb, etc.)
      if (typeof value !== 'string') {
        issues.push({
          tokenId: token.id,
          tokenPath: token.path,
          severity: 'error',
          code: 'INVALID_COLOR_VALUE',
          message: `Color token ${token.qualifiedName} has invalid value type: ${typeof value}`,
          fix: 'Color must be a string (hex, rgb) or object with hex/r,g,b/h,s,l properties',
        });
      }
      return issues;
    }

    // Check if color has at least one of the required formats
    const hasHex = 'hex' in value && typeof value.hex === 'string';
    const hasRgb = 'r' in value && 'g' in value && 'b' in value;
    const hasHsl = 'h' in value && 's' in value && 'l' in value;

    if (!hasHex && !hasRgb && !hasHsl) {
      issues.push({
        tokenId: token.id,
        tokenPath: token.path,
        severity: 'error',
        code: 'INVALID_COLOR_FORMAT',
        message: `Color token ${token.qualifiedName} must have hex, rgb, or hsl values`,
        fix: 'Add hex, {r,g,b}, or {h,s,l} properties',
      });
    }

    return issues;
  }

  /**
   * Find unresolved references in a value (recursive)
   * Returns array of reference strings like "{color.primary}"
   */
  private findUnresolvedReferences(value: any, path: string = ''): string[] {
    const refs: string[] = [];

    // Check for reference syntax: {...}
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      refs.push(value);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively check object properties
      for (const [key, val] of Object.entries(value)) {
        const subPath = path ? `${path}.${key}` : key;
        const subRefs = this.findUnresolvedReferences(val, subPath);
        refs.push(...subRefs);
      }
    } else if (Array.isArray(value)) {
      // Recursively check array items
      value.forEach((item, index) => {
        const subRefs = this.findUnresolvedReferences(item, `${path}[${index}]`);
        refs.push(...subRefs);
      });
    }

    return refs;
  }

  /**
   * Format validation report as human-readable string
   */
  formatReport(report: ValidationReport): string {
    if (report.valid) {
      return '✓ All tokens are valid for Figma sync';
    }

    const lines: string[] = [];
    lines.push(`❌ Found ${report.errorCount} error(s), ${report.warningCount} warning(s), ${report.infoCount} info`);
    lines.push('');

    // Group issues by severity
    const errors = report.issues.filter(i => i.severity === 'error');
    const warnings = report.issues.filter(i => i.severity === 'warning');
    const infos = report.issues.filter(i => i.severity === 'info');

    if (errors.length > 0) {
      lines.push('ERRORS:');
      errors.forEach(issue => {
        lines.push(`  ❌ ${issue.tokenPath.join('/')} - ${issue.message}`);
        if (issue.fix) {
          lines.push(`     💡 Fix: ${issue.fix}`);
        }
      });
      lines.push('');
    }

    if (warnings.length > 0) {
      lines.push('WARNINGS:');
      warnings.forEach(issue => {
        lines.push(`  ⚠️  ${issue.tokenPath.join('/')} - ${issue.message}`);
        if (issue.fix) {
          lines.push(`     💡 Fix: ${issue.fix}`);
        }
      });
      lines.push('');
    }

    if (infos.length > 0) {
      lines.push('INFO:');
      infos.forEach(issue => {
        lines.push(`  ℹ️  ${issue.tokenPath.join('/')} - ${issue.message}`);
      });
    }

    return lines.join('\n');
  }
}

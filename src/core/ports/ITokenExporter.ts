// ====================================================================================
// TOKEN EXPORTER PORT (Output Adapter Interface)
// Domain interface for exporting tokens to external formats/systems
// ====================================================================================

import { Token } from '../models/Token';
import { Result } from '../../shared/types';

/**
 * Export options (common across all exporters)
 */
export interface ExportOptions {
  /** Target format or system */
  target?: string;
  /** Project ID for context */
  projectId?: string;
  /** Collection filter */
  collection?: string;
  /** Overwrite existing items */
  overwrite?: boolean;
  /** Additional format-specific options */
  [key: string]: any;
}

/**
 * Export result
 */
export interface ExportResult {
  /** Number of tokens successfully exported */
  exported: number;
  /** Number of tokens created (new) */
  created?: number;
  /** Number of tokens updated (existing) */
  updated?: number;
  /** Number of tokens that failed */
  failed?: number;
  /** Error messages for failed tokens */
  errors?: Array<{ token: string; error: string }>;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Port interface for token exporters (output adapters)
 *
 * This is a domain-level abstraction that allows the core business logic
 * to remain independent of specific export targets (Figma, JSON, CSS, etc.)
 *
 * Infrastructure layer implements this interface with concrete exporters.
 *
 * Hexagonal Architecture Pattern:
 * - This is a "port" (interface defined by domain)
 * - Concrete exporters are "adapters" (implementations in infrastructure)
 *
 * Examples of implementations:
 * - FigmaVariablesExporter (sync to Figma Variables)
 * - FigmaStylesExporter (sync to Figma Styles)
 * - JSONExporter (export to JSON file)
 * - CSSExporter (export to CSS variables)
 * - SCSSExporter (export to SCSS variables)
 * - TypeScriptExporter (export to TS constants)
 */
export interface ITokenExporter {
  /**
   * Human-readable name of the exporter
   * e.g., "Figma Variables", "CSS Variables", "JSON"
   */
  readonly name: string;

  /**
   * Target format identifier
   * e.g., "figma-variables", "css", "json", "scss"
   */
  readonly targetFormat: string;

  /**
   * Optional: Validate tokens before export
   *
   * Checks if tokens are compatible with the target format.
   * For example, Figma Variables may not support certain token types.
   *
   * @param tokens - Tokens to validate
   * @returns Validation result with errors
   */
  validate?(tokens: Token[]): Result<ValidationReport>;

  /**
   * Export tokens to the target format/system
   *
   * This is the core responsibility of the exporter.
   * Implementation depends on the target:
   * - Figma: Call Figma API to create/update variables
   * - JSON: Serialize to JSON format
   * - CSS: Generate CSS custom properties
   *
   * @param tokens - Tokens to export
   * @param options - Export options (overwrite, filters, etc.)
   * @returns Result containing export statistics or error
   */
  export(tokens: Token[], options?: ExportOptions): Promise<Result<ExportResult>>;
}

/**
 * Validation report for token export compatibility
 */
export interface ValidationReport {
  /** Overall validation status */
  valid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
  /** List of validation warnings (non-blocking) */
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  /** Token ID or path */
  token: string;
  /** Error message */
  message: string;
  /** Error code (optional) */
  code?: string;
}

export interface ValidationWarning {
  /** Token ID or path */
  token: string;
  /** Warning message */
  message: string;
}

/**
 * Registry interface for managing multiple exporters
 *
 * Allows selection of appropriate exporter by target format.
 */
export interface ITokenExporterRegistry {
  /**
   * Register an exporter
   */
  register(exporter: ITokenExporter): void;

  /**
   * Get exporter by target format
   *
   * @param targetFormat - Target format (e.g., "figma-variables", "css")
   * @returns Exporter or undefined
   */
  getExporter(targetFormat: string): ITokenExporter | undefined;

  /**
   * List all registered exporters
   */
  listExporters(): ITokenExporter[];
}

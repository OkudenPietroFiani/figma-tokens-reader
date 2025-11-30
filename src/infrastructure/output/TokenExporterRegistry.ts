// ====================================================================================
// TOKEN EXPORTER REGISTRY (Infrastructure)
// Manages token exporters for different target formats
// ====================================================================================

import { ITokenExporter, ITokenExporterRegistry } from '../../core/ports/ITokenExporter';

/**
 * Token Exporter Registry
 *
 * Infrastructure component that manages multiple token exporters
 * and provides selection by target format.
 *
 * Usage:
 * ```typescript
 * const registry = new TokenExporterRegistry();
 * registry.register(new FigmaVariablesExporter());
 * registry.register(new FigmaStylesExporter());
 * registry.register(new CSSExporter());
 *
 * const exporter = registry.getExporter('figma-variables');
 * await exporter.export(tokens);
 * ```
 */
export class TokenExporterRegistry implements ITokenExporterRegistry {
  private exporters = new Map<string, ITokenExporter>();

  /**
   * Register a token exporter
   */
  register(exporter: ITokenExporter): void {
    const targetFormat = exporter.targetFormat;

    if (this.exporters.has(targetFormat)) {
      console.warn(
        `[TokenExporterRegistry] Exporter for '${targetFormat}' already registered, replacing...`
      );
    }

    this.exporters.set(targetFormat, exporter);
    console.log(`[TokenExporterRegistry] Registered exporter: ${exporter.name} (${targetFormat})`);
  }

  /**
   * Get exporter by target format
   */
  getExporter(targetFormat: string): ITokenExporter | undefined {
    const exporter = this.exporters.get(targetFormat);

    if (!exporter) {
      console.warn(`[TokenExporterRegistry] No exporter found for format: ${targetFormat}`);
      console.log(`Available formats: ${Array.from(this.exporters.keys()).join(', ')}`);
    }

    return exporter;
  }

  /**
   * List all registered exporters
   */
  listExporters(): ITokenExporter[] {
    return Array.from(this.exporters.values());
  }

  /**
   * Get all available target formats
   */
  getAvailableFormats(): string[] {
    return Array.from(this.exporters.keys());
  }

  /**
   * Check if a format is supported
   */
  hasFormat(targetFormat: string): boolean {
    return this.exporters.has(targetFormat);
  }

  /**
   * Get count of registered exporters
   */
  count(): number {
    return this.exporters.size;
  }

  /**
   * Clear all exporters (useful for testing)
   */
  clear(): void {
    this.exporters.clear();
  }
}

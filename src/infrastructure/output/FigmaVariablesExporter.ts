// ====================================================================================
// FIGMA VARIABLES EXPORTER (Infrastructure Adapter)
// Implements ITokenExporter for syncing to Figma Variables
// ====================================================================================

import { ITokenExporter, ExportOptions, ExportResult } from '../../core/ports/ITokenExporter';
import { Token } from '../../core/models/Token';
import { Result, Success, Failure } from '../../shared/types';
import { FigmaSyncService, SyncOptions } from '../../core/services/FigmaSyncService';
import { TokenRepository } from '../../core/services/TokenRepository';
import { TokenResolver } from '../../core/services/TokenResolver';

/**
 * Figma Variables Exporter
 *
 * Infrastructure adapter that exports tokens to Figma Variables.
 * Wraps the existing FigmaSyncService to implement the ITokenExporter port.
 *
 * This adapter allows the application layer to sync tokens to Figma
 * without depending on Figma-specific implementation details.
 *
 * Target: Figma Variables (modern token system)
 * Format: Creates Figma Variable Collections and Variables
 * Supports: All token types that map to Figma variables
 */
export class FigmaVariablesExporter implements ITokenExporter {
  readonly name = 'Figma Variables';
  readonly targetFormat = 'figma-variables';

  private syncService: FigmaSyncService;

  constructor(repository: TokenRepository, resolver: TokenResolver) {
    this.syncService = new FigmaSyncService(repository, resolver);
  }

  /**
   * Export tokens to Figma Variables
   */
  async export(tokens: Token[], options?: ExportOptions): Promise<Result<ExportResult>> {
    try {
      // Map export options to sync options
      const syncOptions: SyncOptions = {
        updateExisting: options?.overwrite ?? true,
        preserveScopes: true,
        createStyles: true, // Also create text/effect styles
        percentageBase: 16
      };

      // Dry run check
      if (options?.dryRun) {
        console.log('[FigmaVariablesExporter] Dry run mode - not actually syncing');
        return Success({
          exported: tokens.length,
          created: tokens.length,
          updated: 0,
          failed: 0,
          metadata: { dryRun: true }
        });
      }

      // Sync tokens to Figma
      const syncResult = await this.syncService.syncTokens(tokens, syncOptions);

      if (!syncResult.success) {
        return Failure(`Figma sync failed: ${syncResult.error}`);
      }

      const stats = syncResult.data!.stats;

      // Map sync stats to export result
      const result: ExportResult = {
        exported: stats.added + stats.updated,
        created: stats.added,
        updated: stats.updated,
        failed: stats.skipped,
        errors: stats.skipped > 0 ? [{ token: 'various', error: `${stats.skipped} tokens skipped` }] : [],
        metadata: {
          collections: syncResult.data!.collections,
          variableCount: syncResult.data!.variables.size
        }
      };

      console.log(
        `[FigmaVariablesExporter] Exported ${result.exported} tokens ` +
        `(${result.created} created, ${result.updated} updated)`
      );

      return Success(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FigmaVariablesExporter] Export error: ${message}`);
      return Failure(`Failed to export to Figma Variables: ${message}`);
    }
  }

  /**
   * Optional: Validate tokens before export
   *
   * Figma Variables support most token types, so validation is lenient.
   * Could be extended to check for unsupported types or invalid values.
   */
  validate(tokens: Token[]): Result<any> {
    // Basic validation: ensure tokens exist
    if (!tokens || tokens.length === 0) {
      return Failure('No tokens to export');
    }

    // All tokens are valid for Figma Variables (service handles conversion)
    return Success({
      valid: true,
      errors: [],
      warnings: []
    });
  }
}

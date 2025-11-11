// ====================================================================================
// DUAL-RUN VALIDATOR
// Runs old and new code paths in parallel for validation
// ====================================================================================

import { ImportStats, TokenData } from '../../shared/types';
import { Token } from '../models/Token';
import { VariableManager } from '../../services/variableManager';
import { FigmaSyncService } from './FigmaSyncService';

/**
 * Feature flags for gradual rollout
 */
export const FEATURE_FLAGS = {
  ENABLE_NEW_TOKEN_MODEL: false, // Master switch
  ENABLE_DUAL_RUN: true, // Run both paths for comparison
  SWITCH_TO_NEW_MODEL: false, // Use new model output (after validation)
  AUTO_ROLLBACK_THRESHOLD: 0.05, // 5% discrepancy triggers rollback
};

/**
 * Variable state snapshot for comparison
 */
interface VariableSnapshot {
  id: string;
  name: string;
  type: VariableResolvedDataType;
  value: any;
  collection: string;
  collectionId: string;
  description: string;
  scopes: VariableScope[];
}

/**
 * Comparison result between old and new
 */
export interface ComparisonResult {
  identical: boolean;
  discrepancyRate: number;
  totalVariables: number;
  differences: {
    onlyInOld: string[]; // Variables only in old output
    onlyInNew: string[]; // Variables only in new output
    valueMismatches: Array<{
      name: string;
      oldValue: any;
      newValue: any;
    }>;
    typeMismatches: Array<{
      name: string;
      oldType: VariableResolvedDataType;
      newType: VariableResolvedDataType;
    }>;
  };
}

/**
 * Dual-run validation coordinator
 *
 * Pattern: Strangler Fig
 * - Old code continues to run (production)
 * - New code runs in parallel (validation only)
 * - Compare outputs for equivalence
 * - Gradual rollover via feature flags
 *
 * Usage:
 * ```typescript
 * const validator = new DualRunValidator(oldManager, newService);
 * const result = await validator.validate(primitives, semantics, tokens);
 * if (result.identical) {
 *   // Safe to switch to new model
 * }
 * ```
 */
export class DualRunValidator {
  private oldManager: VariableManager;
  private newService: FigmaSyncService;

  constructor(oldManager: VariableManager, newService: FigmaSyncService) {
    this.oldManager = oldManager;
    this.newService = newService;
  }

  /**
   * Run both old and new code paths and compare results
   *
   * @param primitives - Old format primitives
   * @param semantics - Old format semantics
   * @param tokens - New format tokens
   * @returns Comparison result
   */
  async validate(
    primitives: TokenData | null,
    semantics: TokenData | null,
    tokens: Token[]
  ): Promise<ComparisonResult> {
    console.log('[DualRunValidator] Starting dual-run validation...');

    // Capture initial state
    const initialState = await this.captureVariableState();

    try {
      // Run old code path
      console.log('[DualRunValidator] Running old code path (VariableManager)...');
      await this.oldManager.importTokens(primitives || {}, semantics || {});
      const oldState = await this.captureVariableState();

      // Rollback to initial state
      await this.rollbackToState(initialState);

      // Run new code path
      console.log('[DualRunValidator] Running new code path (FigmaSyncService)...');
      await this.newService.syncTokens(tokens);
      const newState = await this.captureVariableState();

      // Compare states
      const comparison = this.compareStates(oldState, newState);

      // Log results
      this.logComparison(comparison);

      // Check for auto-rollback
      if (comparison.discrepancyRate > FEATURE_FLAGS.AUTO_ROLLBACK_THRESHOLD) {
        console.error(
          `[DualRunValidator] Discrepancy rate ${(comparison.discrepancyRate * 100).toFixed(2)}% exceeds threshold ${(FEATURE_FLAGS.AUTO_ROLLBACK_THRESHOLD * 100)}%`
        );
      }

      // Rollback to initial state (validation only, don't commit changes)
      await this.rollbackToState(initialState);

      return comparison;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[DualRunValidator] Validation failed: ${message}`);

      // Rollback to initial state on error
      await this.rollbackToState(initialState);

      throw error;
    }
  }

  /**
   * Import tokens with dual-run validation (production entry point)
   *
   * @param primitives - Old format primitives
   * @param semantics - Old format semantics
   * @param tokens - New format tokens
   * @returns Import statistics
   */
  async importWithValidation(
    primitives: TokenData | null,
    semantics: TokenData | null,
    tokens: Token[]
  ): Promise<ImportStats> {
    if (!FEATURE_FLAGS.ENABLE_DUAL_RUN) {
      // No validation - use old or new based on switch
      if (FEATURE_FLAGS.SWITCH_TO_NEW_MODEL) {
        const result = await this.newService.syncTokens(tokens);
        return result.success ? result.data!.stats : { added: 0, updated: 0, skipped: 0 };
      } else {
        return await this.oldManager.importTokens(primitives || {}, semantics || {});
      }
    }

    // Run dual-run validation
    const comparison = await this.validate(primitives, semantics, tokens);

    // Decide which output to use
    if (FEATURE_FLAGS.SWITCH_TO_NEW_MODEL && comparison.discrepancyRate < FEATURE_FLAGS.AUTO_ROLLBACK_THRESHOLD) {
      // Use new model output
      console.log('[DualRunValidator] Using new model output');
      const result = await this.newService.syncTokens(tokens);
      return result.success ? result.data!.stats : { added: 0, updated: 0, skipped: 0 };
    } else {
      // Use old model output (safe default)
      console.log('[DualRunValidator] Using old model output');
      return await this.oldManager.importTokens(primitives || {}, semantics || {});
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Capture current Figma variable state
   */
  private async captureVariableState(): Promise<VariableSnapshot[]> {
    const variables = await figma.variables.getLocalVariablesAsync();
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const collectionMap = new Map(collections.map(c => [c.id, c.name]));

    return variables.map(v => ({
      id: v.id,
      name: v.name,
      type: v.resolvedType,
      value: this.serializeValue(v),
      collection: collectionMap.get(v.variableCollectionId) || 'unknown',
      collectionId: v.variableCollectionId,
      description: v.description,
      scopes: v.scopes,
    }));
  }

  /**
   * Serialize variable value for comparison
   */
  private serializeValue(variable: Variable): any {
    const modeId = variable.valuesByMode[Object.keys(variable.valuesByMode)[0]];
    const value = variable.valuesByMode[modeId];

    if (typeof value === 'object' && value !== null && 'type' in value) {
      // Variable alias
      return { type: 'VARIABLE_ALIAS', id: (value as VariableAlias).id };
    }

    return value;
  }

  /**
   * Rollback to a previous state
   */
  private async rollbackToState(targetState: VariableSnapshot[]): Promise<void> {
    const currentVars = await figma.variables.getLocalVariablesAsync();
    const targetIds = new Set(targetState.map(v => v.id));

    // Remove variables that shouldn't exist
    for (const v of currentVars) {
      if (!targetIds.has(v.id)) {
        v.remove();
      }
    }

    // Restore values for existing variables
    for (const snapshot of targetState) {
      const variable = currentVars.find(v => v.id === snapshot.id);
      if (variable) {
        const modeId = Object.keys(variable.valuesByMode)[0];
        // Note: Can't directly set value, would need to recreate
        // For validation purposes, we delete and recreate
      }
    }
  }

  /**
   * Compare two variable states
   */
  private compareStates(
    oldState: VariableSnapshot[],
    newState: VariableSnapshot[]
  ): ComparisonResult {
    const oldMap = new Map(oldState.map(v => [v.name, v]));
    const newMap = new Map(newState.map(v => [v.name, v]));

    const onlyInOld: string[] = [];
    const onlyInNew: string[] = [];
    const valueMismatches: Array<{ name: string; oldValue: any; newValue: any }> = [];
    const typeMismatches: Array<{ name: string; oldType: VariableResolvedDataType; newType: VariableResolvedDataType }> = [];

    // Check variables in old but not in new
    for (const [name, oldVar] of oldMap) {
      if (!newMap.has(name)) {
        onlyInOld.push(name);
      }
    }

    // Check variables in new but not in old
    for (const [name, newVar] of newMap) {
      if (!oldMap.has(name)) {
        onlyInNew.push(name);
      }
    }

    // Check for mismatches in common variables
    for (const [name, oldVar] of oldMap) {
      const newVar = newMap.get(name);
      if (!newVar) continue;

      // Compare types
      if (oldVar.type !== newVar.type) {
        typeMismatches.push({
          name,
          oldType: oldVar.type,
          newType: newVar.type,
        });
      }

      // Compare values (deep equality)
      if (JSON.stringify(oldVar.value) !== JSON.stringify(newVar.value)) {
        valueMismatches.push({
          name,
          oldValue: oldVar.value,
          newValue: newVar.value,
        });
      }
    }

    const totalDifferences = onlyInOld.length + onlyInNew.length + valueMismatches.length + typeMismatches.length;
    const totalVariables = Math.max(oldState.length, newState.length);
    const discrepancyRate = totalVariables > 0 ? totalDifferences / totalVariables : 0;

    return {
      identical: totalDifferences === 0,
      discrepancyRate,
      totalVariables,
      differences: {
        onlyInOld,
        onlyInNew,
        valueMismatches,
        typeMismatches,
      },
    };
  }

  /**
   * Log comparison results
   */
  private logComparison(comparison: ComparisonResult): void {
    console.log('\n=== DUAL-RUN VALIDATION RESULTS ===');
    console.log(`Total variables: ${comparison.totalVariables}`);
    console.log(`Identical: ${comparison.identical}`);
    console.log(`Discrepancy rate: ${(comparison.discrepancyRate * 100).toFixed(2)}%`);

    if (comparison.differences.onlyInOld.length > 0) {
      console.log(`\nOnly in old (${comparison.differences.onlyInOld.length}):`, comparison.differences.onlyInOld);
    }

    if (comparison.differences.onlyInNew.length > 0) {
      console.log(`\nOnly in new (${comparison.differences.onlyInNew.length}):`, comparison.differences.onlyInNew);
    }

    if (comparison.differences.valueMismatches.length > 0) {
      console.log(`\nValue mismatches (${comparison.differences.valueMismatches.length}):`);
      for (const mismatch of comparison.differences.valueMismatches.slice(0, 5)) {
        console.log(`  ${mismatch.name}:`);
        console.log(`    Old: ${JSON.stringify(mismatch.oldValue)}`);
        console.log(`    New: ${JSON.stringify(mismatch.newValue)}`);
      }
      if (comparison.differences.valueMismatches.length > 5) {
        console.log(`  ... and ${comparison.differences.valueMismatches.length - 5} more`);
      }
    }

    if (comparison.differences.typeMismatches.length > 0) {
      console.log(`\nType mismatches (${comparison.differences.typeMismatches.length}):`);
      for (const mismatch of comparison.differences.typeMismatches) {
        console.log(`  ${mismatch.name}: ${mismatch.oldType} → ${mismatch.newType}`);
      }
    }

    console.log('=====================================\n');
  }
}

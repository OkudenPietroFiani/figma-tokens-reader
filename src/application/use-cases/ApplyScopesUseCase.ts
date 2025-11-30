// ====================================================================================
// APPLY SCOPES USE CASE
// Applies scope assignments to Figma variables
// ====================================================================================

import { UseCase } from '../interfaces/IUseCase';
import { Result, Success, Failure, ScopeAssignments, VariableScope } from '../../shared/types';

/**
 * Input for ApplyScopesUseCase
 */
export interface ApplyScopesInput {
  /** Map of variable names to their new scope arrays */
  scopeAssignments: ScopeAssignments;
}

/**
 * Output from ApplyScopesUseCase
 */
export interface ApplyScopesOutput {
  /** Number of variables updated */
  updatedCount: number;
  /** Number of variables that failed to update */
  failedCount: number;
  /** Variable names that failed (if any) */
  failedVariables?: string[];
}

/**
 * Use Case: Apply Scopes to Figma Variables
 *
 * Updates the scopes property of Figma variables based on user assignments.
 * Operates on existing variables created by the sync process.
 *
 * Example usage:
 * ```typescript
 * const useCase = new ApplyScopesUseCase();
 * const result = await useCase.execute({
 *   scopeAssignments: {
 *     'color.primary': ['ALL_SCOPES'],
 *     'spacing.large': ['WIDTH_HEIGHT', 'GAP']
 *   }
 * });
 * ```
 */
export class ApplyScopesUseCase extends UseCase<ApplyScopesInput, ApplyScopesOutput> {
  protected async executeImpl(input: ApplyScopesInput): Promise<Result<ApplyScopesOutput>> {
    const { scopeAssignments } = input;
    const variableNames = Object.keys(scopeAssignments);

    console.log(`[ApplyScopesUseCase] Applying scopes to ${variableNames.length} variable(s)`);

    let updatedCount = 0;
    let failedCount = 0;
    const failedVariables: string[] = [];

    // Get all collections to find variables
    const collections = await figma.variables.getLocalVariableCollectionsAsync();

    // Build a map of variable names to Variable objects
    const variableMap = new Map<string, Variable>();
    for (const collection of collections) {
      const variablePromises = collection.variableIds.map(id =>
        figma.variables.getVariableByIdAsync(id)
      );
      const variables = await Promise.all(variablePromises);

      for (const variable of variables) {
        if (variable) {
          variableMap.set(variable.name, variable);
        }
      }
    }

    // Apply scopes to each variable
    for (const [variableName, scopes] of Object.entries(scopeAssignments)) {
      const variable = variableMap.get(variableName);

      if (!variable) {
        console.warn(`[ApplyScopesUseCase] Variable not found: ${variableName}`);
        failedCount++;
        failedVariables.push(variableName);
        continue;
      }

      try {
        // Validate scopes
        if (!this.isValidScopes(scopes, variable.resolvedType)) {
          console.warn(`[ApplyScopesUseCase] Invalid scopes for ${variableName}: ${scopes.join(', ')}`);
          failedCount++;
          failedVariables.push(variableName);
          continue;
        }

        // Apply scopes
        variable.scopes = scopes;
        updatedCount++;
        console.log(`[ApplyScopesUseCase] Updated scopes for ${variableName}: ${scopes.join(', ')}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ApplyScopesUseCase] Failed to update ${variableName}: ${message}`);
        failedCount++;
        failedVariables.push(variableName);
      }
    }

    console.log(
      `[ApplyScopesUseCase] Complete: ${updatedCount} updated, ${failedCount} failed`
    );

    return Success({
      updatedCount,
      failedCount,
      failedVariables: failedCount > 0 ? failedVariables : undefined
    });
  }

  validate(input: ApplyScopesInput): Result<boolean> {
    if (!input.scopeAssignments || typeof input.scopeAssignments !== 'object') {
      return Failure('scopeAssignments is required and must be an object');
    }

    if (Object.keys(input.scopeAssignments).length === 0) {
      return Failure('No scope assignments provided');
    }

    return Success(true);
  }

  /**
   * Validate scopes are appropriate for the variable type
   */
  private isValidScopes(scopes: VariableScope[], variableType: string): boolean {
    if (!Array.isArray(scopes) || scopes.length === 0) {
      return false;
    }

    // Color variables can use: ALL_SCOPES, FRAME_FILL, SHAPE_FILL, TEXT_FILL, STROKE_COLOR, EFFECT_COLOR
    // Float variables can use: ALL_SCOPES, WIDTH_HEIGHT, GAP, CORNER_RADIUS, etc.
    // String variables can use: ALL_SCOPES, TEXT_CONTENT
    // Boolean variables can use: ALL_SCOPES

    const validScopes = new Set([
      'ALL_SCOPES',
      'FRAME_FILL',
      'SHAPE_FILL',
      'TEXT_FILL',
      'STROKE_COLOR',
      'EFFECT_COLOR',
      'WIDTH_HEIGHT',
      'GAP',
      'CORNER_RADIUS',
      'OPACITY',
      'FONT_FAMILY',
      'FONT_STYLE',
      'FONT_WEIGHT',
      'FONT_SIZE',
      'LINE_HEIGHT',
      'LETTER_SPACING',
      'PARAGRAPH_SPACING',
      'PARAGRAPH_INDENT',
      'TEXT_CONTENT',
      'TEXT_CASE',
      'TEXT_DECORATION'
    ]);

    return scopes.every(scope => validScopes.has(scope));
  }
}

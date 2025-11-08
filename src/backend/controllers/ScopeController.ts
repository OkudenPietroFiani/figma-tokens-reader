// ====================================================================================
// SCOPE CONTROLLER
// Manages Figma variable scopes
// ====================================================================================

import { Result, Success, FigmaVariableData, ScopeAssignments } from '../../shared/types';
import { ErrorHandler } from '../utils/ErrorHandler';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../shared/constants';

/**
 * Controller for Figma variable scope operations
 *
 * Responsibilities:
 * - Fetch all Figma variables with their current scopes
 * - Apply scope assignments to selected variables
 * - Validate scope assignments before applying
 *
 * Principles:
 * - Direct API Access: Uses figma.variables API directly (no service needed)
 * - Single Responsibility: Only manages scopes
 * - Result Pattern: All public methods return Result<T>
 * - Validation: Validates scope assignments before applying
 */
export class ScopeController {
  /**
   * Get all Figma variables with their current scopes
   * Useful for UI display and scope management
   *
   * @returns Map of variable names to variable data
   */
  async getFigmaVariables(): Promise<Result<{ [name: string]: FigmaVariableData }>> {
    return ErrorHandler.handle(async () => {
      ErrorHandler.info('Fetching all Figma variables...', 'ScopeController');

      // Get all local variable collections
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const variables: { [name: string]: FigmaVariableData } = {};

      // Iterate through each collection
      for (const collection of collections) {
        ErrorHandler.info(`Processing collection: ${collection.name}`, 'ScopeController');

        // Get all variables in this collection
        const variablePromises = collection.variableIds.map(id =>
          figma.variables.getVariableByIdAsync(id)
        );
        const collectionVariables = await Promise.all(variablePromises);

        // Build variable data structure
        for (const variable of collectionVariables) {
          if (variable) {
            variables[variable.name] = {
              id: variable.id,
              name: variable.name,
              scopes: variable.scopes,
              type: variable.resolvedType,
              collection: collection.name,
              collectionId: collection.id,
            };
          }
        }
      }

      const count = Object.keys(variables).length;
      ErrorHandler.info(`Found ${count} variables across ${collections.length} collections`, 'ScopeController');

      if (count === 0) {
        ErrorHandler.warn('No Figma variables found. Import tokens first.', 'ScopeController');
      }

      return variables;
    }, 'Get Figma Variables');
  }

  /**
   * Apply scope assignments to variables
   * Updates the scopes property of selected variables
   *
   * @param scopeAssignments - Map of variable names to scope arrays
   * @returns Number of variables updated
   */
  async applyScopes(scopeAssignments: ScopeAssignments): Promise<Result<number>> {
    return ErrorHandler.handle(async () => {
      // Validate input
      ErrorHandler.assert(
        scopeAssignments && Object.keys(scopeAssignments).length > 0,
        'No scope assignments provided',
        'Apply Scopes'
      );

      const variableNames = Object.keys(scopeAssignments);
      ErrorHandler.info(
        `Applying scopes to ${variableNames.length} variable(s)`,
        'ScopeController'
      );

      // Get all local variable collections
      const collections = await figma.variables.getLocalVariableCollectionsAsync();

      let updatedCount = 0;

      // Iterate through each collection to find variables
      for (const collection of collections) {
        const variablePromises = collection.variableIds.map(id =>
          figma.variables.getVariableByIdAsync(id)
        );
        const collectionVariables = await Promise.all(variablePromises);

        for (const variable of collectionVariables) {
          if (variable && scopeAssignments[variable.name] !== undefined) {
            const newScopes = scopeAssignments[variable.name] as VariableScope[];

            // Validate scopes array
            this.validateScopes(newScopes, variable.name);

            // Apply scopes
            variable.scopes = newScopes;
            updatedCount++;

            ErrorHandler.info(
              `Updated scopes for ${variable.name}: ${newScopes.join(', ')}`,
              'ScopeController'
            );
          }
        }
      }

      ErrorHandler.info(`Scopes updated for ${updatedCount} variable(s)`, 'ScopeController');

      if (updatedCount === 0) {
        ErrorHandler.warn('No variables were updated. Check variable names.', 'ScopeController');
      }

      // Notify user
      ErrorHandler.notifyUser(
        `${SUCCESS_MESSAGES.SCOPE_APPLIED}: ${updatedCount} variable(s)`,
        'success'
      );

      return updatedCount;
    }, 'Apply Scopes');
  }

  /**
   * Get variable by name across all collections
   * Useful for finding a specific variable
   *
   * @param variableName - Name of the variable to find
   * @returns Variable or null if not found
   */
  async getVariableByName(variableName: string): Promise<Result<Variable | null>> {
    return ErrorHandler.handle(async () => {
      ErrorHandler.info(`Searching for variable: ${variableName}`, 'ScopeController');

      const collections = await figma.variables.getLocalVariableCollectionsAsync();

      for (const collection of collections) {
        const variablePromises = collection.variableIds.map(id =>
          figma.variables.getVariableByIdAsync(id)
        );
        const collectionVariables = await Promise.all(variablePromises);

        const variable = collectionVariables.find(v => v && v.name === variableName);
        if (variable) {
          ErrorHandler.info(`Found variable: ${variableName}`, 'ScopeController');
          return variable;
        }
      }

      ErrorHandler.info(`Variable not found: ${variableName}`, 'ScopeController');
      return null;
    }, 'Get Variable By Name');
  }

  /**
   * Get variables by collection name
   * Useful for filtering variables
   *
   * @param collectionName - Name of the collection
   * @returns Array of variables in the collection
   */
  async getVariablesByCollection(collectionName: string): Promise<Result<Variable[]>> {
    return ErrorHandler.handle(async () => {
      ErrorHandler.info(`Fetching variables from collection: ${collectionName}`, 'ScopeController');

      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const targetCollection = collections.find(c => c.name === collectionName);

      if (!targetCollection) {
        ErrorHandler.warn(`Collection not found: ${collectionName}`, 'ScopeController');
        return [];
      }

      const variablePromises = targetCollection.variableIds.map(id =>
        figma.variables.getVariableByIdAsync(id)
      );
      const variables = await Promise.all(variablePromises);

      // Filter out nulls
      const validVariables = variables.filter(v => v !== null) as Variable[];

      ErrorHandler.info(
        `Found ${validVariables.length} variables in collection: ${collectionName}`,
        'ScopeController'
      );

      return validVariables;
    }, 'Get Variables By Collection');
  }

  /**
   * Validate scope array
   * Ensures scopes are valid Figma VariableScope values
   *
   * @param scopes - Array of scope strings
   * @param variableName - Variable name for error messages
   */
  private validateScopes(scopes: VariableScope[], variableName: string): void {
    ErrorHandler.assert(
      Array.isArray(scopes),
      `Scopes for ${variableName} must be an array`,
      'Validate Scopes'
    );

    // Note: Figma API will validate actual scope values when applied
    // We just check it's an array here
  }

  /**
   * Reset all scopes for a variable (set to empty)
   * Useful for clearing scope assignments
   *
   * @param variableName - Name of the variable to reset
   */
  async resetScopes(variableName: string): Promise<Result<void>> {
    return ErrorHandler.handle(async () => {
      const result = await this.getVariableByName(variableName);

      if (!result.success) {
        throw new Error(result.error || 'Failed to find variable');
      }

      if (!result.data) {
        throw new Error(`Variable not found: ${variableName}`);
      }

      const variable = result.data;
      variable.scopes = [];

      ErrorHandler.info(`Scopes reset for ${variableName}`, 'ScopeController');
      ErrorHandler.notifyUser(`Scopes reset for ${variableName}`, 'success');
    }, 'Reset Scopes');
  }

  /**
   * Get scope statistics
   * Useful for debugging and UI display
   *
   * @returns Statistics about scope usage
   */
  async getScopeStats(): Promise<Result<{ totalVariables: number; variablesWithScopes: number; variablesWithoutScopes: number }>> {
    return ErrorHandler.handle(async () => {
      const result = await this.getFigmaVariables();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch variables');
      }

      const variables = Object.values(result.data!);
      const totalVariables = variables.length;
      const variablesWithScopes = variables.filter(v => v.scopes.length > 0).length;
      const variablesWithoutScopes = totalVariables - variablesWithScopes;

      const stats = {
        totalVariables,
        variablesWithScopes,
        variablesWithoutScopes,
      };

      ErrorHandler.info(
        `Scope stats: ${totalVariables} total, ${variablesWithScopes} with scopes, ${variablesWithoutScopes} without scopes`,
        'ScopeController'
      );

      return stats;
    }, 'Get Scope Stats');
  }
}

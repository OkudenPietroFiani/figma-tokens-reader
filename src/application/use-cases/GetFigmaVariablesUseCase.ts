// ====================================================================================
// GET FIGMA VARIABLES USE CASE
// Retrieves Figma variables with scope information
// ====================================================================================

import { UseCase } from '../interfaces/IUseCase';
import { Result, Success, Failure, FigmaVariableData } from '../../shared/types';

/**
 * Input for GetFigmaVariablesUseCase
 */
export interface GetFigmaVariablesInput {
  /** Optional: Filter by collection name */
  collection?: string;
}

/**
 * Output from GetFigmaVariablesUseCase
 */
export interface GetFigmaVariablesOutput {
  /** Map of variable names to variable data */
  variables: { [name: string]: FigmaVariableData };
  /** Total number of variables */
  count: number;
  /** Number of collections */
  collectionCount: number;
}

/**
 * Use Case: Get Figma Variables
 *
 * Retrieves all Figma variables with their current scopes and metadata.
 * Useful for displaying variables in the UI and managing scopes.
 *
 * Example usage:
 * ```typescript
 * const useCase = new GetFigmaVariablesUseCase();
 * const result = await useCase.execute({});
 * console.log(`Found ${result.data.count} variables`);
 * ```
 */
export class GetFigmaVariablesUseCase extends UseCase<
  GetFigmaVariablesInput,
  GetFigmaVariablesOutput
> {
  protected async executeImpl(
    input: GetFigmaVariablesInput
  ): Promise<Result<GetFigmaVariablesOutput>> {
    console.log('[GetFigmaVariablesUseCase] Fetching all Figma variables...');

    // Get all local variable collections
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    console.log(`[GetFigmaVariablesUseCase] Found ${collections.length} collections`);

    const variables: { [name: string]: FigmaVariableData } = {};
    let collectionCount = 0;

    // Iterate through each collection
    for (const collection of collections) {
      // Apply collection filter if provided
      if (input.collection && collection.name !== input.collection) {
        continue;
      }

      collectionCount++;
      console.log(`[GetFigmaVariablesUseCase] Processing collection: ${collection.name}`);

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
    console.log(`[GetFigmaVariablesUseCase] Found ${count} variables across ${collectionCount} collections`);

    if (count === 0) {
      return Failure('No Figma variables found. Import tokens first.');
    }

    return Success({
      variables,
      count,
      collectionCount
    });
  }

  validate(input: GetFigmaVariablesInput): Result<boolean> {
    if (input.collection && typeof input.collection !== 'string') {
      return Failure('collection must be a string');
    }

    return Success(true);
  }
}

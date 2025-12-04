/**
 * @file Compute Resource Validation and Management
 *
 * This module provides functions for validating and managing compute resources
 * in ChRIS CUBE. Used by plugin registration to ensure compute resources exist
 * before attempting to assign plugins to them.
 *
 * @module
 */

import { chrisConnection } from '../connect/chrisConnection.js';
import { ComputeResourceList } from '@fnndsc/chrisapi';
import { errorStack } from '../error/errorStack.js';
import { Result, Ok, Err } from '../utils/result.js';

/**
 * Interface representing a compute resource.
 */
export interface ComputeResource {
  id: number;
  name: string;
  compute_url: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Validates that specified compute resources exist in ChRIS CUBE.
 *
 * @param resourceNames - Array of compute resource names to validate.
 * @returns A Result containing valid resource names, or Err with available resources in errorStack.
 *
 * @example
 * ```
 * const result = await computeResources_validate(['host', 'gpu']);
 * if (!result.ok) {
 *   // Check errorStack for available resources
 *   const errors = errorStack.allOfType_get('error');
 *   console.error(errors);
 *   return;
 * }
 * // Proceed with valid resources
 * ```
 */
export async function computeResources_validate(
  resourceNames: string[]
): Promise<Result<string[]>> {
  try {
    const client = await chrisConnection.client_get();
    if (!client) {
      errorStack.stack_push('error', 'Not connected to ChRIS. Please log in.');
      return Err();
    }

    // Fetch all compute resources
    const computeResourceList: ComputeResourceList = await client.getComputeResources();
    const resources: ComputeResource[] = computeResourceList.data || [];

    // Extract available resource names
    const availableNames: Set<string> = new Set(resources.map((r: ComputeResource) => r.name));

    // Validate requested resources
    const invalidResources: string[] = resourceNames.filter((name: string) => !availableNames.has(name));

    if (invalidResources.length > 0) {
      const availableList: string = Array.from(availableNames).join(', ');
      errorStack.stack_push(
        'error',
        `Invalid compute resource(s): ${invalidResources.join(', ')}`
      );
      errorStack.stack_push(
        'error',
        `Available compute resources: ${availableList}`
      );
      return Err();
    }

    return Ok(resourceNames);
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push('error', `Failed to validate compute resources: ${errorMessage}`);
    return Err();
  }
}

/**
 * Fetches all available compute resources from ChRIS CUBE.
 *
 * @returns A Result containing array of compute resources, or Err on failure.
 */
export async function computeResources_getAll(): Promise<Result<ComputeResource[]>> {
  try {
    const client = await chrisConnection.client_get();
    if (!client) {
      errorStack.stack_push('error', 'Not connected to ChRIS. Please log in.');
      return Err();
    }

    const computeResourceList: ComputeResourceList = await client.getComputeResources();
    const resources: ComputeResource[] = computeResourceList.data || [];

    return Ok(resources);
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push('error', `Failed to fetch compute resources: ${errorMessage}`);
    return Err();
  }
}

/**
 * Gets compute resource names from a comma-separated string or array.
 *
 * @param computeInput - Comma-separated string or array of compute resource names.
 * @returns Array of trimmed compute resource names.
 *
 * @example
 * ```
 * computeResourceNames_parse('host, gpu, remote') // ['host', 'gpu', 'remote']
 * computeResourceNames_parse(['host', 'gpu'])     // ['host', 'gpu']
 * ```
 */
export function computeResourceNames_parse(computeInput: string | string[]): string[] {
  if (Array.isArray(computeInput)) {
    return computeInput.map((name: string) => name.trim());
  }
  return computeInput.split(',').map((name: string) => name.trim());
}

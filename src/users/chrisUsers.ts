/**
 * @file ChRIS User and Group Resource Access
 *
 * @module
 */

import { chrisConnection } from '../connect/chrisConnection.js';
import { GroupList } from '@fnndsc/chrisapi';
import { errorStack } from '../error/errorStack.js';
import { Result, Ok, Err } from '../utils/result.js';

/**
 * Represents a ChRIS group resource.
 */
export interface ChrisGroup {
  id: number;
  name: string;
}

/**
 * Represents the currently authenticated ChRIS user.
 */
export interface ChrisUser {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
}

/**
 * Fetches all groups from ChRIS CUBE.
 *
 * @returns A Result containing array of ChrisGroup, or Err on failure.
 */
export async function groups_getAll(): Promise<Result<ChrisGroup[]>> {
  try {
    const client = await chrisConnection.client_get();
    if (!client) {
      errorStack.stack_push('error', 'Not connected to ChRIS. Please log in.');
      return Err();
    }

    const groupList: GroupList = await client.getGroups({ limit: 1000 });
    const groups: ChrisGroup[] = (groupList.data as unknown as ChrisGroup[]) || [];

    return Ok(groups);
  } catch (error: unknown) {
    const msg: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push('error', `Failed to fetch groups: ${msg}`);
    return Err();
  }
}

/**
 * Fetches the currently authenticated user from ChRIS CUBE.
 *
 * @returns A Result containing ChrisUser, or Err on failure.
 */
export async function currentUser_get(): Promise<Result<ChrisUser>> {
  try {
    const client = await chrisConnection.client_get();
    if (!client) {
      errorStack.stack_push('error', 'Not connected to ChRIS. Please log in.');
      return Err();
    }

    const user = await client.getUser();
    const userData: ChrisUser = user.data as unknown as ChrisUser;

    return Ok(userData);
  } catch (error: unknown) {
    const msg: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push('error', `Failed to fetch current user: ${msg}`);
    return Err();
  }
}

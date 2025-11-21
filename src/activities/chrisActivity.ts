/**
 * @file ChRIS Activity
 *
 * This module defines the base Activity class for interactions with ChRIS.
 *
 * @module
 */

import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";

/**
 * Base class for ChRIS activities.
 */
export class Activity {
  // private _client: Client | null = null; // No longer needed

  public constructor() {
    // Client is fetched lazily
  }

  /**
   * Retrieves the ChRIS client instance asynchronously.
   * @returns A Promise resolving to the Client instance or null.
   */
  public async client_get(): Promise<Client | null>{
    return await chrisConnection.client_get();
  }
}
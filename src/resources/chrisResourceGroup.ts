/**
 * @file ChRIS Resource Group
 *
 * This module defines the base class for grouping ChRIS resources.
 * It handles the initialization and binding of resource fetching methods,
 * supporting both immediate and lazy binding strategies.
 *
 * @module
 */

import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";
import { ChRISResource } from "../resources/chrisResources.js";

/**
 * Abstract base class for a group of ChRIS resources.
 */
export abstract class ChRISResourceGroup {
  protected _asset: ChRISResource;

  /**
   * Constructor for ChRISResourceGroup.
   * @param resourceName - The name of the resource.
   * @param getMethod - The method name on the client/object to fetch resources.
   * @param chrisObj - Optional object to bind the method to. If not provided, uses the global ChRIS client lazily.
   */
  constructor(resourceName: string, getMethod: string, chrisObj?: any) {
    this._asset = new ChRISResource();
    this._asset.resourceName = resourceName;

    if (chrisObj) {
      this._asset.resource_bindGetMethodToObj(
        chrisObj,
        (chrisObj as any)[getMethod]
      );
    } else {
      this._asset.resource_bindMethodLazy(
        () => chrisConnection.client_get(),
        getMethod
      );
    }
  }

  /**
   * Retrieves the ChRIS client instance asynchronously.
   * @returns A Promise resolving to the Client instance or null.
   */
  async client_get(): Promise<Client | null> {
    return chrisConnection.client_get();
  }

  get asset(): ChRISResource {
    return this._asset;
  }
}
/**
 * @file ChRIS Plugin Management
 *
 * This module provides classes for managing ChRIS plugins.
 * It includes the `ChRISPluginGroup` for collection operations and `ChRISPlugin` for individual plugin operations,
 * such as searching for plugins and creating plugin instances.
 *
 * @module
 */

import Client, { PluginInstance, PluginList } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";
import { chrisContext, Context } from "../context/chrisContext.js";
import {
  ChRISResource,
  ListOptions,
  FilteredResourceData,
  Item,
  Dictionary,
} from "../resources/chrisResources.js";
import { ChRISResourceGroup } from "../resources/chrisResourceGroup.js";
import {
  ChRISElementsGet,
  QueryHits,
  params_fromOptions,
  record_extract,
  ChRISObjectParams,
  dictionary_fromCLI,
} from "../utils/keypair.js";
import { Searchable } from "../utils/searchable.js";
import { errorStack } from "../error/errorStack.js";
import { Result, Ok, Err } from "../utils/result.js";

/**
 * Group handler for ChRIS plugins.
 */
export class ChRISPluginGroup extends ChRISResourceGroup {
  constructor() {
    super("Plugins", "getPlugins");
  }
}

/**
 * Group handler for ChRIS plugin instances.
 */
export class ChRISPluginInstanceGroup extends ChRISResourceGroup {
  constructor() {
    super("PluginInstances", "getPluginInstances");
  }
}

interface PreviousIDParam {
  previous_id: number;
}

/**
 * Interface for Collection+JSON data item.
 */
interface CollectionData {
  name: string;
  value: unknown;
  prompt?: string;
}

/**
 * Interface for Collection+JSON item.
 */
interface CollectionItem {
  href: string;
  data?: CollectionData[];
  links?: Array<{ rel: string; href: string }>;
}

/**
 * Interface for Collection+JSON response.
 */
interface CollectionJson {
  collection: {
    version: string;
    href: string;
    items?: CollectionItem[];
    links?: Array<{ rel: string; href: string }>;
    error?: { message: string };
  };
}

/**
 * Type guard for CollectionJson.
 */
function isCollectionJson(data: unknown): data is CollectionJson {
  return (
    typeof data === 'object' &&
    data !== null &&
    'collection' in data &&
    typeof (data as any).collection === 'object'
  );
}

/**
 * Class for managing individual ChRIS plugins.
 */
export class ChRISPlugin {
  private _client: Client | null = null;

  constructor() {
    // Client is fetched lazily
  }

  /**
   * Retrieves the ChRIS client instance asynchronously.
   * @returns A Promise resolving to the Client instance or null.
   */
  async client_get(): Promise<Client | null> {
    if (!this._client) {
      this._client = await chrisConnection.client_get();
    }
    return this._client;
  }

  /**
   * Converts a plain string to a searchable format.
   * @deprecated Use Searchable.from() instead.
   */
  pluginString_makeSearchable(plugin: string): string {
    const searchable = Searchable.from(plugin);
    return searchable.toNormalizedString();
  }

  /**
   * Resolves a searchable string or object to plugin IDs.
   * @param pluginSearchable - A searchable string or Searchable object.
   * @returns A Promise resolving to QueryHits containing matching plugin IDs.
   */
  async pluginIDs_resolve(pluginSearchable: string | Searchable): Promise<QueryHits | null> {
    const searchable = typeof pluginSearchable === 'string'
      ? Searchable.from(pluginSearchable)
      : pluginSearchable;

    if (!searchable.validate()) {
      errorStack.stack_push("error", "Invalid searchable format");
      return null;
    }

    const pluginList: QueryHits | null = await this.pluginIDs_getFromSearchable(
      searchable
    );
    if (!pluginList || pluginList.hits.length === 0) {
      errorStack.stack_push("error", "No matching plugins found");
      return null;
    }
    return pluginList;
  }

  async previousID_get(): Promise<number | null> {
    const previousIDstring: string | null = await chrisContext.ChRISplugin_get();
    if (!previousIDstring) {
      errorStack.stack_push(
        "error",
        "Could not resolve a previous plugin ID context"
      );
      return null;
    }
    return Number(previousIDstring);
  }

  async plugin_runOnCUBE(
    pluginID: number,
    previousID: number,
    options: ChRISObjectParams
  ): Promise<PluginInstance | undefined | null> {
    const client = await this.client_get();
    if (!client) {
      console.error("Could not access ChRIS. Client is not initialized.");
      return null;
    }
    const combinedParams: ChRISObjectParams & PreviousIDParam = {
      ...options,
      previous_id: previousID,
    };
    const pluginInstance: PluginInstance | undefined | null =
      await client.createPluginInstance(pluginID, combinedParams);

    if (!pluginInstance) {
      errorStack.stack_push("error", "Failed to create plugin instance");
      return null;
    }
    return pluginInstance;
  }

  pluginInstance_toDict(
    pluginInstance: PluginInstance | undefined | null
  ): Dictionary | null {
    if (!pluginInstance) {
      return null;
    }
    const chrisResource: ChRISResource = new ChRISResource();
    chrisResource.resourceCollection = pluginInstance;
    const items: Item[] | null =
      chrisResource.resourceItems_buildFromCollection(pluginInstance);
    if (!items) {
      errorStack.stack_push(
        "error",
        "Could not convert pluginInstance resource into dictionary"
      );
      return null;
    }
    const dict: Dictionary = chrisResource.resourceItems_toDicts(items)[0];
    return dict;
  }

  async plugin_run(plugin: string, params: string): Promise<Dictionary | null> {
    let pluginList: QueryHits | null;
    if ((pluginList = await this.pluginIDs_resolve(plugin)) === null) {
      return null;
    }
    const pluginID: number = pluginList.hits[0] as number;

    // Parse params first to check for explicit previous_id
    const pluginParams: ChRISObjectParams = dictionary_fromCLI(params);

    // Prioritize explicit previous_id from params, fall back to context
    let previousID: number;
    if (pluginParams.previous_id !== undefined) {
      // Explicit value provided in params - use it!
      previousID = Number(pluginParams.previous_id);
    } else {
      // Fall back to context
      const contextPreviousID: number | null = await this.previousID_get();
      if (contextPreviousID === null) {
        return null;
      }
      previousID = contextPreviousID;
    }

    try {
      const dict: Dictionary | null = this.pluginInstance_toDict(
        await this.plugin_runOnCUBE(pluginID, previousID, pluginParams)
      );
      return dict;
    } catch (error: unknown) {
      if (error instanceof Error) {
        errorStack.stack_push(
          "error",
          `Error running plugin instance | ${error.message}`
        );
      } else {
        errorStack.stack_push(
          "error",
          "An unknown error occurred while running plugin instance"
        );
      }
      return null;
    }
  }

  async pluginData_getFromSearch(
    searchOptions: ChRISElementsGet,
    dataField: string
  ): Promise<QueryHits | null> {
    const chrisPluginGroup = new ChRISPluginGroup();
    // We rely on lazy initialization of ChRISResourceGroup
    const searchParams: ListOptions = params_fromOptions(searchOptions);
    const searchResults: FilteredResourceData | null =
      await chrisPluginGroup.asset.resources_listAndFilterByOptions(
        searchParams
      );
    if (!searchResults) {
      return null;
    }
    const queryHits: QueryHits = record_extract(
      searchResults.tableData,
      dataField
    );
    return queryHits;
  }

  /**
   * Gets plugin IDs from a searchable.
   * @param searchable - A searchable string or Searchable object.
   * @returns A Promise resolving to QueryHits containing matching plugin IDs.
   */
  async pluginIDs_getFromSearchable(
    searchable: string | Searchable
  ): Promise<QueryHits | null> {
    const searchableObj = typeof searchable === 'string'
      ? Searchable.from(searchable)
      : searchable;

    const seachParams: ChRISElementsGet = {
      search: searchableObj.toNormalizedString(),
    };
    const pluginList: QueryHits | null = await this.pluginData_getFromSearch(
      seachParams,
      "id"
    );
    if (!pluginList) {
      errorStack.stack_push(
        "error",
        `A plugin conforming to "${searchableObj.raw}" was not found.`
      );
      return null;
    }
    if (pluginList.hits.length > 1) {
      errorStack.stack_push(
        "warning",
        `Multiple plugins conformed to "${searchableObj.raw}".`
      );
    }
    return pluginList;
  }

  async pluginIDs_get(name_exact: string): Promise<QueryHits | null> {
    return await this.pluginData_getFromSearch(
      { search: "name_exact: " + name_exact },
      "id"
    );
  }

  /**
   * Uploads a plugin representation file to create a new plugin admin resource.
   *
   * Requires admin credentials. Will push error to errorStack if authentication fails.
   *
   * @param pluginData - Plugin descriptor JSON data.
   * @param computeResources - Array of compute resource names to assign plugin to.
   * @param adminToken - Optional admin authentication token (if different from current user).
   * @returns Promise resolving to the created plugin data or null on failure.
   */
  async plugin_registerWithAdmin(
    pluginData: Record<string, unknown>,
    computeResources: string[] = ['host'],
    adminToken?: string
  ): Promise<Record<string, unknown> | null> {
    try {
      let client: Client | null;

      if (adminToken) {
        // Use the provided admin token to create a specific client for this operation
        const url: string | null = await chrisConnection.chrisURL_get();
        if (!url) {
           errorStack.stack_push('error', 'ChRIS URL not found. Cannot create admin client.');
           return null;
        }
        client = new Client(url, { token: adminToken });
      } else {
        // Use the default authenticated client
        client = await this.client_get();
      }

      if (!client) {
        errorStack.stack_push('error', 'Not connected to ChRIS. Please log in.');
        return null;
      }

      // Create plugin representation as JSON string (ChRIS expects a file upload)
      const pluginJson: string = JSON.stringify(pluginData, null, 2);
      const pluginBlob: Blob = new Blob([pluginJson], { type: 'application/json' });

      const computeNames: string = computeResources.join(',');
      const pluginFileObj = { fname: pluginBlob };

      const pluginAdmin = await client.adminUploadPlugin(
        { compute_names: computeNames },
        pluginFileObj
      );

      if (pluginAdmin && pluginAdmin.data) {
        return pluginAdmin.data;
      }

      errorStack.stack_push('error', 'Failed to register plugin. No data in response.');
      return null;
    } catch (error: unknown) {
      // Check for admin authentication errors
      const errorMessage: string = error instanceof Error ? error.message : String(error);
      const errorString: string = errorMessage.toLowerCase();

      if (errorString.includes('403') || errorString.includes('forbidden') ||
          errorString.includes('401') || errorString.includes('unauthorized') ||
          errorString.includes('permission denied')) {
        errorStack.stack_push(
          'error',
          'Admin credentials required to register plugins. Authentication failed.'
        );
      } else {
        errorStack.stack_push('error', `Failed to register plugin: ${errorMessage}`);
      }
      return null;
    }
  }

    /**
     * Searches for a plugin in a peer ChRIS store (public plugin repository).
     * 
     * Uses anonymous client to query public plugin stores without authentication.
     * 
     * @param pluginName - Name of the plugin to search for.
     * @param version - Optional version of the plugin to search for.
     * @param peerStoreUrl - URL of the peer ChRIS store (default: cube.chrisproject.org).
     * @returns Promise resolving to plugin data and store URL, or null if not found.
     */
    async plugin_searchPeerStore(
      pluginName: string,
      version?: string,
      peerStoreUrl: string = 'https://cube.chrisproject.org/api/v1/'
    ): Promise<{ plugin: Record<string, unknown>; storeUrl: string } | null> {
      try {
        // Construct search URL with name_exact and optional version
        let searchUrl: string = `${peerStoreUrl}plugins/search/?name_exact=${encodeURIComponent(pluginName)}`;
        if (version) {
          searchUrl += `&version=${encodeURIComponent(version)}`;
        }
  
        const response: Response = await fetch(searchUrl, {
          headers: {
            'Accept': 'application/vnd.collection+json'
          }
        });
  
        if (!response.ok) {
          errorStack.stack_push(
            'error',
            `Failed to search peer store: ${response.status} ${response.statusText}`
          );
          return null;
        }
  
        const data: unknown = await response.json();
  
        // Handle Collection+JSON format (standard for ChRIS API)
        if (isCollectionJson(data) && data.collection && data.collection.items) {
          const items: CollectionItem[] = data.collection.items;
          if (items.length === 0) {
            return null;
          }
  
          // Iterate through items to find exact name and version match (if version provided)
          // If version is not provided, prioritize exact name match
          let targetItem: CollectionItem | null = null;
          const exactNameMatches: CollectionItem[] = [];
  
          for (const item of items) {
            const itemData: Record<string, unknown> = {};
            if (item.data) {
              item.data.forEach((datum: CollectionData) => {
                itemData[datum.name] = datum.value;
              });
            }
            
            if (itemData['name'] === pluginName) {
              exactNameMatches.push(item);
              if (version && itemData['version'] === version) {
                targetItem = item; // Found exact name and version
                break;
              } else if (!version) {
                // If no version specified, any exact name match is a candidate
                // For now, continue to find the "best" match (first by default)
                // Or consider latest version if multiple
              }
            }
          }
  
          // If exact name+version found, use it
          // If only exact name matches found (and no version specified), pick the first one from exactNameMatches
          // If no exact name match (even after filtering), fallback to first item in original 'items' if any.
          if (targetItem) {
              // targetItem is already the name+version exact match
          } else if (exactNameMatches.length > 0 && !version) {
              // If no version was specified and we found exact name matches, take the first one
              targetItem = exactNameMatches[0];
          } else {
              // Fallback to first item from original query results if no specific name match
              targetItem = items[0];
                          // If we didn't find an exact name match, but we are using this as fallback,
                          // we should warn if names differ.
                           const targetItemData: Record<string, unknown> = {};
                           if (targetItem.data) {
                               targetItem.data.forEach((datum: CollectionData) => {
                                   targetItemData[datum.name] = datum.value;
                               });
                           }
                           if (targetItemData['name'] !== pluginName) {
                              errorStack.stack_push('warning', `Peer store search for exact plugin name '${pluginName}' returned '${targetItemData['name']}'. Exact name not found, using first result.`);
                           }
                      }  
          // Extract data from target item
          const pluginData: Record<string, unknown> = {};
  
          if (targetItem.data) {
            targetItem.data.forEach((datum: CollectionData) => {
              pluginData[datum.name] = datum.value;
            });
          }
  
          // Ensure 'url' is present
          if (targetItem.href) {
            pluginData['url'] = targetItem.href;
          }
  
          // Extract links if present
          if (targetItem.links) {
            pluginData['links'] = targetItem.links;
          }
  
          return {
            plugin: pluginData,
            storeUrl: targetItem.href
          };
        }
      // Fallback for simple JSON (if ever supported)
      if (typeof data === 'object' && data !== null && 'results' in data) {
        const results: any[] = (data as any).results || [];

        if (results.length === 0) {
          return null;
        }

        // Return first matching plugin
        const plugin: any = results[0];
        return {
          plugin: plugin,
          storeUrl: plugin.url || `${peerStoreUrl}plugins/${plugin.id}/`
        };
      }

      return null;
    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : String(error);
      errorStack.stack_push('error', `Failed to search peer store: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Checks if a plugin with given name or dock_image already exists in current CUBE.
   *
   * @param nameOrImage - Plugin name or docker image to search for.
   * @returns Promise resolving to plugin data if found, null otherwise.
   */
  async plugin_existsInCube(nameOrImage: string): Promise<Record<string, unknown> | null> {
    try {
      const client = await this.client_get();
      if (!client) {
        return null;
      }

      // Try searching by name first
      let pluginList = await client.getPlugins({ name_exact: nameOrImage, limit: 1 });
      if (pluginList && pluginList.data && pluginList.data.length > 0) {
        return pluginList.data[0];
      }

      // Try searching by dock_image
      pluginList = await client.getPlugins({ dock_image: nameOrImage, limit: 1 });
      if (pluginList && pluginList.data && pluginList.data.length > 0) {
        return pluginList.data[0];
      }

      return null;
    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : String(error);
      errorStack.stack_push('error', `Failed to check if plugin exists: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Lists plugins from a peer ChRIS store.
   * Handles pagination to fetch all results.
   *
   * @param peerStoreUrl - URL of the peer store.
   * @param searchParams - Optional search parameters.
   * @returns Promise resolving to array of plugin data objects.
   */
  async plugin_listPeerStore(
    peerStoreUrl: string = 'https://cube.chrisproject.org/api/v1/',
    searchParams?: Record<string, string>
  ): Promise<Record<string, unknown>[] | null> {
    try {
      let url: string;
      
      // Use search endpoint if search parameters are provided
      if (searchParams && Object.keys(searchParams).length > 0) {
        url = `${peerStoreUrl}plugins/search/`;
      } else {
        url = `${peerStoreUrl}plugins/`;
      }
      
      const params = new URLSearchParams();
      params.append('limit', '100'); // Efficient pagination

      if (searchParams) {
        for (const [key, value] of Object.entries(searchParams)) {
          params.append(key, value);
        }
      }
      
      url += `?${params.toString()}`;

      const allPlugins: Record<string, unknown>[] = [];
      let nextUrl: string | null = url;

      while (nextUrl) {
        const response: Response = await fetch(nextUrl, {
          headers: { 'Accept': 'application/vnd.collection+json' }
        });

        if (!response.ok) {
          errorStack.stack_push('error', `Failed to fetch from peer store: ${response.statusText}`);
          return null;
        }

        const data: unknown = await response.json();

        if (isCollectionJson(data) && data.collection.items) {
          const items = data.collection.items;
          
          items.forEach(item => {
             const pluginData: Record<string, unknown> = {};
             if (item.data) {
               item.data.forEach((datum: CollectionData) => {
                 pluginData[datum.name] = datum.value;
               });
             }
             if (item.href) pluginData['url'] = item.href;
             allPlugins.push(pluginData);
          });

          // Check for next link
          nextUrl = null;
          if (data.collection.links) {
            const nextLink = data.collection.links.find(l => l.rel === 'next');
            if (nextLink) {
              nextUrl = nextLink.href;
            }
          }
        } else {
          break;
        }
      }

      return allPlugins;

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errorStack.stack_push('error', `Error listing peer store: ${msg}`);
      return null;
    }
  }

  /**
   * Gets the compute resources currently assigned to a plugin.
   *
   * @param pluginId - ID of the plugin.
   * @returns Promise resolving to array of compute resource names.
   */
  async plugin_getComputeResources(pluginId: number): Promise<string[]> {
    try {
      const client = await this.client_get();
      if (!client) {
        return [];
      }

      const plugin = await client.getPlugin(pluginId);
      if (!plugin) {
        return [];
      }

      const computeResourceList = await plugin.getPluginComputeResources();
      const resources: any[] = computeResourceList.data || [];

      return resources.map((r: any) => r.name);
    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : String(error);
      errorStack.stack_push('error', `Failed to get plugin compute resources: ${errorMessage}`);
      return [];
    }
  }
}

/**
 * Registers a plugin using the legacy non-admin PluginList._post() method.
 *
 * **DEPRECATED:** This method uses the legacy non-admin plugin registration endpoint
 * which may not be available in modern ChRIS CUBE installations. Prefer using
 * ChRISPlugin.plugin_registerWithAdmin() instead.
 *
 * This function is provided for backward compatibility only and will be removed
 * in a future release.
 *
 * @param pluginData - Plugin descriptor data (name, dock_image, etc.).
 * @param computeResources - Optional array of compute resource names to assign.
 * @returns A Result containing the registered plugin data, or an error.
 *
 * @deprecated Use ChRISPlugin.plugin_registerWithAdmin() instead.
 */
export async function plugin_registerDirect(
  pluginData: Record<string, unknown>,
  computeResources?: string[]
): Promise<Result<Record<string, unknown>>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push("error", "Not connected to ChRIS. Cannot register plugin.");
    return Err();
  }

  try {
    const pluginList: PluginList = await client.getPlugins();

    // Prepare data for POST request
    const data: Record<string, unknown> = {
      ...pluginData,
    };

    if (computeResources && computeResources.length > 0) {
      data.compute_resources = computeResources;
    }

    // Call the internal _post method directly (legacy API)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (pluginList as any)._post(data);

    if (response && response.data) {
      return Ok(response.data);
    }

    errorStack.stack_push("error", "Failed to register plugin. No data in response.");
    return Err();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to register plugin: ${msg}`);
    return Err();
  }
}
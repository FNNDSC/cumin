/**
 * @file ChRIS Feed Management
 *
 * This module provides classes for managing ChRIS feeds.
 * It includes the `ChRISFeedGroup` for collection operations and `ChRISFeed` for individual feed operations,
 * particularly creation from directories using the 'pl-dircopy' plugin.
 *
 * @module
 */

import Client from "@fnndsc/chrisapi";
import { PluginInstance } from "@fnndsc/chrisapi";
import { Feed } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";
import {
  SimpleRecord,
  resourceFields_get,
} from "../resources/chrisResources.js";
import { ChRISResourceGroup } from "../resources/chrisResourceGroup.js";
import { ChRISPlugin } from "../plugins/chrisPlugins.js";
import {
  QueryHits,
  keyPairParams_apply,
  ChRISObjectParams,
} from "../utils/keypair.js";
import { errorStack } from "../error/errorStack.js";

/**
 * Group handler for ChRIS feeds.
 */
export class ChRISFeedGroup extends ChRISResourceGroup {
  constructor() {
    super("Feeds", "getFeeds");
  }
}

/**
 * Class for managing individual ChRIS feeds.
 */
export class ChRISFeed {
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

  error_parse(error: unknown, activity?: string): null {
    if (error instanceof Error) {
      errorStack.stack_push("error", `Error ${activity}: ${error.message}`);
    } else {
      errorStack.stack_push("error", `An unknown error occurred while ${activity}`);
    }
    return null;
  }

  async feedDetail_getFromPluginInstance(
    pluginInstance: PluginInstance | null,
    detailSpec: string[]
  ): Promise<SimpleRecord | null> {
    if (!pluginInstance) {
      return null;
    }
    const feed: Feed | null = await pluginInstance.getFeed();
    if (!feed) {
      return null;
    }
    const feedDetail: SimpleRecord | null = resourceFields_get(
      feed,
      detailSpec
    );
    if (!feedDetail) {
      return null;
    }
    feedDetail.pluginInstance = pluginInstance;
    return feedDetail;
  }

  async createFromDirs(
    dirs: string,
    feedParams: ChRISObjectParams
  ): Promise<SimpleRecord | null> {
    const client = await this.client_get();
    if (!client) {
      console.error(
        "Could not access ChRIS. Have you connected with the 'connect' command?"
      );
      return null;
    }
    let pluginInstance: PluginInstance;
    try {
      const chrisPlugin: ChRISPlugin = new ChRISPlugin();
      const pluginList: QueryHits | null = await chrisPlugin.pluginIDs_get(
        "pl-dircopy"
      );
      if (!pluginList) {
        errorStack.stack_push(
          "error",
          "pl-dircopy was not found! No feeds can be created."
        );
        return null;
      }
      const pluginID: number = pluginList.hits[0] as number;
      const createParams: Record<string, string> = keyPairParams_apply(
        { dir: dirs },
        feedParams.params as string
      );
      pluginInstance = await client.createPluginInstance(
        pluginID,
        createParams as ChRISObjectParams & { previous_id: 0 }
      );
    } catch (error: unknown) {
      return this.error_parse(error, "creating feed");
    }
    return await this.feedDetail_getFromPluginInstance(pluginInstance, [
      "id",
      "name",
      "owner_username",
    ]);
  }
}

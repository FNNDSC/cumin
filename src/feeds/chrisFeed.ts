import Client from "@fnndsc/chrisapi";
import { PluginInstance } from "@fnndsc/chrisapi";
import { Feed } from "@fnndsc/chrisapi";
import {
  ChRISConnection,
  chrisConnection,
} from "../connect/chrisConnection.js";
import { ChRISResource, ListOptions } from "../resources/chrisResources.js";
import { ChRISPlugin } from "../plugins/chrisPlugins.js";
import {
  QueryHits,
  applyKeyPairParams,
  ChRISObjectDesc,
} from "../utils/keypair.js";

export class ChRISFeedGroup {
  private _client: Client | null;
  private _asset: ChRISResource;

  constructor() {
    this._client = chrisConnection.getClient();
    if (!this._client) {
      console.error(
        "Could not access ChRIS. Have you connected with the 'connect' command?"
      );
      process.exit(1);
    }
    this._asset = new ChRISResource();
    if (this._client) {
      this._asset.resource_bindGetMethodToObj(
        this._client,
        this._client.getFeeds
      );
    }
    this._asset.resourceName = "Feeds";
  }

  public get client(): Client | null {
    return this._client;
  }

  get asset(): ChRISResource {
    return this._asset;
  }
}

export class ChRISFeed {
  private _client: Client | null;

  constructor() {
    this._client = chrisConnection.getClient();
    if (!this._client) {
      console.error(
        "Could not access ChRIS. Have you connected with the 'connect' command?"
      );
      process.exit(1);
    }
  }

  async createFromDirs(
    dirs: string,
    feedParams: ChRISObjectDesc
  ): Promise<number | null> {
    if (!this._client) {
      return null;
    }
    let pluginInstance: PluginInstance;
    try {
      const chrisPlugin: ChRISPlugin = new ChRISPlugin();
      const pluginList: QueryHits | null = await chrisPlugin.pluginIDs_get(
        "pl-dircopy"
      );
      if (!pluginList) {
        console.error("pl-dircopy was not found! No feeds can be created.");
        return null;
      }
      const pluginID: number = pluginList.hits[0];
      const createParams: Record<string, string> = applyKeyPairParams(
        { dir: dirs },
        feedParams.params
      );
      console.log(createParams);
      pluginInstance = await this._client.createPluginInstance(
        pluginID,
        createParams as ChRISObjectDesc & { previous_id: 0 }
      );
      console.log(pluginInstance);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error creating feed: ${error.message}`);
      } else {
        console.error("An unknown error occurred while creating the feed");
      }
      return null;
    }
    const feed: Feed | null = await pluginInstance.getFeed();
    console.log(feed);
    return 1;
  }

  public get client(): Client | null {
    return this._client;
  }
}

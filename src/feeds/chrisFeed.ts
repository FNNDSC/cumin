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
  applyKeyPairParams,
  ChRISObjectDesc,
} from "../utils/keypair.js";

export class ChRISFeedGroup extends ChRISResourceGroup {
  constructor() {
    super("Feeds", "getFeeds");
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

  error_parse(error: unknown, activity?: string): null {
    if (error instanceof Error) {
      console.error(`Error ${activity}: ${error.message}`);
    } else {
      console.error(`An unknown error occurred while ${activity}`);
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
    return feedDetail;
  }

  async createFromDirs(
    dirs: string,
    feedParams: ChRISObjectDesc
  ): Promise<SimpleRecord | null> {
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
      pluginInstance = await this._client.createPluginInstance(
        pluginID,
        createParams as ChRISObjectDesc & { previous_id: 0 }
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

  public get client(): Client | null {
    return this._client;
  }
}

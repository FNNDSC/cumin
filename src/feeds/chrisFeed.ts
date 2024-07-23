import Client from "@fnndsc/chrisapi";
import { FeedList } from "@fnndsc/chrisapi";
import { ChRISConnection, chrisConnection } from "../connect/chrisConnection.js";
import { ChRISResource, ListOptions } from "../resources/chrisResources.js";

export class ChRISFeed {
  private client: Client | null;
  private _asset: ChRISResource;

  constructor() {
    this.client = chrisConnection.getClient();
    if(!this.client) {
      console.error("Could not access ChRIS. Have you connected with the 'connect' command?");
      process.exit(1);
    }
    this._asset = new ChRISResource();
    if (this.client) {
      this._asset.resource_bindGetMethodToObj(
        this.client,
        this.client.getFeeds,
      );
    }
    this._asset.resourceName = "Feeds";
  }

  get asset(): ChRISResource {
    return this._asset;
  }
}

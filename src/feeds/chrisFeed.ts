import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";
import { ChRISResource } from "../resources/chrisResources.js";

export class ChRISFeed {
  private client: Client | null;
  private _asset: ChRISResource;

  constructor() {
    this.client = chrisConnection.getClient();
    this._asset = new ChRISResource();
    if (this.client) {
      this._asset.resource_bindGetMethodToObj(
        this.client,
        this.client.getFeeds,
      );
    }
    this._asset.resourceName = "Feeds";
    this._asset.loggedIn_check();
  }

  get asset(): ChRISResource {
    return this._asset;
  }
}

export const chrisFeed = new ChRISFeed();

import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection";
import { ChRISResource } from "../resources/chrisResources";

export class ChRISPlugin {
  private client: Client | null;
  private _asset: ChRISResource;

  constructor() {
    this.client = chrisConnection.getClient();
    this._asset = new ChRISResource();
    if (this.client) {
      this._asset.resource_bindGetMethod(this.client.getPlugins);
    }
    this._asset.resourceName = "Plugins";
    this._asset.loggedIn_check();
  }

  get asset(): ChRISResource {
    return this._asset;
  }
}

export const chrisPlugin = new ChRISPlugin();

import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection";
import { ChRISResource } from "../resources/chrisResources";

export class ChRISPlugin {
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
        this.client.getPlugins,
      );
    }
    this._asset.resourceName = "Plugins";
  }

  get asset(): ChRISResource {
    return this._asset;
  }
}

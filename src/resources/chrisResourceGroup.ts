import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection";
import { ChRISResource } from "../resources/chrisResources";

export abstract class ChRISResourceGroup {
  protected _client: Client | null;
  protected _asset: ChRISResource;

  constructor(resourceName: string, getMethod: string) {
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
        (this._client as any)[getMethod]
      );
    }
    this._asset.resourceName = resourceName;
  }

  public get client(): Client | null {
    return this._client;
  }

  get asset(): ChRISResource {
    return this._asset;
  }
}

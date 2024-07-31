import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection";
import { ChRISResource, ListOptions, FilteredResourceData } from "../resources/chrisResources";
import { ChRISElementsGet, QueryHits, optionsToParams, extractRecordToQueryHits } from "../utils/keypair";

export class ChRISPluginGroup {
  private _client: Client | null;
  private _asset: ChRISResource;

  constructor() {
    this._client = chrisConnection.getClient();
    if(!this._client) {
      console.error("Could not access ChRIS. Have you connected with the 'connect' command?");
      process.exit(1);
    }
    this._asset = new ChRISResource();
    if (this._client) {
      this._asset.resource_bindGetMethodToObj(
        this._client,
        this._client.getPlugins,
      );
    }
    this._asset.resourceName = "Plugins";
  }

  public get client(): Client | null {
    return this._client
  }

  get asset(): ChRISResource {
    return this._asset;
  }
}

export class ChRISPlugin {
  private _client: Client | null;

  constructor() {
    this._client = chrisConnection.getClient();
    if(!this._client) {
      console.error("Could not access ChRIS. Have you connected with the 'connect' command?");
      process.exit(1);
    }
  }

  async pluginHits_get(searchOptions: ChRISElementsGet): Promise<QueryHits | null> {
    const chrisPluginGroup = new ChRISPluginGroup();
    const searchParams: ListOptions = optionsToParams(searchOptions);
    const searchResults: FilteredResourceData | null = 
      await chrisPluginGroup.asset.resources_listAndFilterByOptions(searchParams);
    if(!searchResults) {
      return null;
    }
    const queryHits: QueryHits = extractRecordToQueryHits(searchResults.tableData, "id");
    return queryHits;
  }

  async pluginIDs_get(name_exact: string): Promise<QueryHits|null> {
    return await this.pluginHits_get({"search": "name_exact: " + name_exact})
  }

}
import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection";
import {
  ChRISResource,
  ListOptions,
  FilteredResourceData,
} from "../resources/chrisResources";
import { ChRISResourceGroup } from "../resources/chrisResourceGroup";
import {
  ChRISElementsGet,
  QueryHits,
  optionsToParams,
  extractRecordToQueryHits,
} from "../utils/keypair";

export class ChRISPluginGroup extends ChRISResourceGroup {
  constructor() {
    super("Plugins", "getPlugins");
  }
}

export class ChRISPlugin {
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

  async pluginData_getFromSearch(
    searchOptions: ChRISElementsGet,
    dataField: string
  ): Promise<QueryHits | null> {
    const chrisPluginGroup = new ChRISPluginGroup();
    const searchParams: ListOptions = optionsToParams(searchOptions);
    const searchResults: FilteredResourceData | null =
      await chrisPluginGroup.asset.resources_listAndFilterByOptions(
        searchParams
      );
    if (!searchResults) {
      return null;
    }
    const queryHits: QueryHits = extractRecordToQueryHits(
      searchResults.tableData,
      dataField
    );
    return queryHits;
  }

  async pluginIDs_get(name_exact: string): Promise<QueryHits | null> {
    return await this.pluginData_getFromSearch(
      { search: "name_exact: " + name_exact },
      "id"
    );
  }
}

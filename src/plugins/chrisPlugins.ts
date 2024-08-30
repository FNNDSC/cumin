import Client, { PluginInstance } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection";
import { chrisContext, Context } from "../context/chrisContext";
import {
  ChRISResource,
  ListOptions,
  FilteredResourceData,
  Item,
  Dictionary,
} from "../resources/chrisResources";
import { ChRISResourceGroup } from "../resources/chrisResourceGroup";
import {
  ChRISElementsGet,
  QueryHits,
  optionsToParams,
  extractRecordToQueryHits,
  ChRISObjectParams,
  keyPairString_toJSON,
  CLItoDictionary,
} from "../utils/keypair";
import { errorStack } from "../error/errorStack";

export class ChRISPluginGroup extends ChRISResourceGroup {
  constructor() {
    super("Plugins", "getPlugins");
  }
}

interface PreviousIDParam {
  previous_id: number;
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

  pluginString_makeSearchable(plugin: string): string {
    if (plugin.includes(":")) {
      return plugin;
    }
    return `name: ${plugin}`;
  }

  async pluginIDs_resolve(pluginSearchable: string): Promise<QueryHits | null> {
    const pluginSpec: string =
      this.pluginString_makeSearchable(pluginSearchable);
    const pluginList: QueryHits | null = await this.pluginIDs_getFromSearchable(
      pluginSpec
    );
    if (!pluginList || pluginList.hits.length === 0) {
      errorStack.push("error", "No matching plugins found");
      return null;
    }
    return pluginList;
  }

  previousID_get(): number | null {
    const previousIDstring: string | null = chrisContext.ChRISplugin_get();
    if (!previousIDstring) {
      errorStack.push(
        "error",
        "Could not resolve a previous plugin ID context"
      );
      return null;
    }
    return Number(previousIDstring);
  }

  async plugin_runOnCUBE(
    pluginID: number,
    previousID: number,
    options: ChRISObjectParams
  ): Promise<PluginInstance | undefined | null> {
    const combinedParams: ChRISObjectParams & PreviousIDParam = {
      ...options,
      previous_id: previousID,
    };
    const pluginInstance: PluginInstance | undefined | null =
      await this._client?.createPluginInstance(pluginID, combinedParams);

    if (!pluginInstance) {
      errorStack.push("error", "Failed to create plugin instance");
      return null;
    }
    return pluginInstance;
  }

  pluginInstance_toDict(
    pluginInstance: PluginInstance | undefined | null
  ): Dictionary | null {
    if (!pluginInstance) {
      return null;
    }
    const chrisResource: ChRISResource = new ChRISResource();
    chrisResource.resourceCollection = pluginInstance;
    const items: Item[] | null =
      chrisResource.resourceItems_buildFromCollection(pluginInstance);
    if (!items) {
      errorStack.push(
        "error",
        "Could not convert pluginInstance resource into dictionary"
      );
      return null;
    }
    const dict: Dictionary = chrisResource.resourceItems_toDicts(items)[0];
    return dict;
  }

  async plugin_run(plugin: string, params: string): Promise<Dictionary | null> {
    let pluginList: QueryHits | null;
    if ((pluginList = await this.pluginIDs_resolve(plugin)) === null) {
      return null;
    }
    const pluginID: number = pluginList.hits[0];
    let previousID: number | null;
    if ((previousID = this.previousID_get()) === null) {
      return null;
    }

    const pluginParams: ChRISObjectParams = CLItoDictionary(params);

    try {
      const dict: Dictionary | null = this.pluginInstance_toDict(
        await this.plugin_runOnCUBE(pluginID, previousID, pluginParams)
      );
      return dict;
    } catch (error: unknown) {
      if (error instanceof Error) {
        errorStack.push(
          "error",
          `Error running plugin instance | ${error.message}`
        );
      } else {
        errorStack.push(
          "error",
          "An unknown error occurred while running plugin instance"
        );
      }
      return null;
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

  async pluginIDs_getFromSearchable(
    searchable: string
  ): Promise<QueryHits | null> {
    const seachParams: ChRISElementsGet = {
      search: searchable,
    };
    const pluginList: QueryHits | null = await this.pluginData_getFromSearch(
      seachParams,
      "id"
    );
    if (!pluginList) {
      errorStack.push(
        "error",
        `A plugin conforming to "${searchable}" was not found.`
      );
      return null;
    }
    if (pluginList.hits.length > 1) {
      errorStack.push(
        "warning",
        `Multiple plugins conformed to "${searchable}.`
      );
    }
    return pluginList;
  }

  async pluginIDs_get(name_exact: string): Promise<QueryHits | null> {
    return await this.pluginData_getFromSearch(
      { search: "name_exact: " + name_exact },
      "id"
    );
  }
}

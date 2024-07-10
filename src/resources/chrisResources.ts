import Client from "@fnndsc/chrisapi";
import { ListResource } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";

interface ListOptions {
  limit: number;
  offset: number;
  name?: string;
  [key: string]: any;
}

interface Item {
  data: Array<{ name: string; value: any }>;
  href: string;
  links: Array<any>;
}

interface ResourcesFromOptions {
  resources: ListResource | null;
  options?: ListOptions;
}

interface ResourcesByFields extends ResourcesFromOptions {
  items: Item[];
  fields: string[];
}

interface FilteredResourceData {
  tableData: Record<string, any>[];
  selectedFields: string[];
}

export class ChRISResource {
  private client: Client | null;
  private resource: Item[];
  private _resourceName: string;
  private clientMethod: ((params: ListOptions) => Promise<any>) | null;

  constructor() {
    this.resource = [];
    this.client = chrisConnection.getClient();
    this.loggedIn_check();
    this._resourceName = "";
    if (this.client) {
      this.clientMethod = this.client.getPlugins.bind(this.client);
    } else {
      this.clientMethod = null;
    }
  }

  get resourceName(): string {
    return this._resourceName;
  }

  set resourceName(name: string) {
    this._resourceName = name;
  }

  loggedIn_check(): boolean {
    let loggedIn: boolean = true;
    if (!this.client) {
      console.log(
        "Not connected to ChRIS. Please connect first using the connect command.",
      );
      loggedIn = false;
    }
    return loggedIn;
  }

  resourceItems_buildFromList(resources: ListResource | null): Item[] | null {
    if (resources) {
      return resources.collection.items.map((item: any) => ({
        data: item.data,
        href: item.href,
        links: item.links,
      }));
    } else {
      return null;
    }
  }

  resource_bindGetMethod(
    clientMethod: (params: ListOptions) => Promise<any>,
    resourceName?: string,
  ) {
    this.clientMethod = clientMethod.bind(this.client);
    if (resourceName) this.resourceName = resourceName;
  }

  resources_filterByFields(
    resourcesByFields: ResourcesByFields,
  ): FilteredResourceData | null {
    const resources = resourcesByFields.items;
    const selectedFields = resourcesByFields.fields;

    if (!resources) return null;

    const tableData = resources.map((resource) => {
      const rowData: Record<string, any> = {
        id: resource.href.split("/").slice(-2)[0],
      };
      resource.data.forEach((item) => {
        if (selectedFields.includes(item.name)) {
          rowData[item.name] = item.value;
        }
      });
      return rowData;
    });
    return { tableData, selectedFields };
  }

  async resourceFields_get(
    resourceOptions?: ResourcesFromOptions,
  ): Promise<ResourcesByFields | null> {
    if (!this.loggedIn_check()) return null;
    let availableResources: ListResource | null | undefined;
    if (!resourceOptions) {
      availableResources = (await this.resources_getList())?.resources;
      if (!availableResources) return null;
    } else {
      availableResources = resourceOptions.resources;
    }
    const resourceItems: Item[] | null =
      this.resourceItems_buildFromList(availableResources);
    if (!resourceItems || resourceItems.length === 0) return null;
    const allFields = ["id", ...resourceItems[0].data.map((item) => item.name)];
    let selectedFields: string[] = allFields;
    if (resourceOptions?.options?.fields) {
      selectedFields = resourceOptions.options.fields
        .split(",")
        .map((f) => f.trim());
    }
    const resourcesByFields: ResourcesByFields = {
      resources: availableResources,
      items: resourceItems,
      options: resourceOptions?.options,
      fields: selectedFields,
    };
    return resourcesByFields;
  }

  async resources_getList(
    options?: Partial<ListOptions>,
    clientMethod?: (params: ListOptions) => Promise<any>,
  ): Promise<ResourcesFromOptions | null> {
    if (!this.loggedIn_check()) return null;

    const params: ListOptions = {
      limit: 20,
      offset: 0,
      ...options,
    };

    if (clientMethod) {
      this.clientMethod = clientMethod;
    }
    if (!this.clientMethod) return null;
    const resources = await this.clientMethod(params);
    if (resources == undefined) {
      console.log(this._resourceName + " resource list returned 'undefined'");
      return { resources: null, options: params };
    }
    return { resources, options: params };
  }
}

export const chrisResource = new ChRISResource();

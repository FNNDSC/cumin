import Client from "@fnndsc/chrisapi";
import { ListResource, Resource } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";

export interface SimpleRecord {
  [key: string]: any;
}

export interface ListOptions extends SimpleRecord {
  limit?: number;
  offset?: number;
}

export interface Item {
  data: Array<{ name: string; value: any }>;
  href: string;
  links: Array<any>;
}

interface ResourcesFromOptions {
  resources: ListResource | Resource | null;
  options?: ListOptions;
}

export interface ResourceFieldsPerItem {
  items: Item[];
  fields: string[];
}

export interface ResourcesByFields extends ResourcesFromOptions {
  items: Item[] | null;
  fields: string[];
}

export interface FilteredResourceData {
  tableData: Record<string, any>[];
  selectedFields: string[];
}

export class ChRISResource {
  private _client: Client | null = null;
  private _resourceName: string = "";
  private resourceMethod: ((params: ListOptions) => Promise<any>) | null = null;

  constructor() {
    this._client = chrisConnection.getClient();
    this.loggedIn_check();
  }

  get client(): Client | null {
    return this._client;
  }

  get resourceName(): string {
    return this._resourceName;
  }

  set resourceName(name: string) {
    this._resourceName = name;
  }

  loggedIn_check(): boolean {
    let loggedIn: boolean = true;
    if (!this._client) {
      console.log(
        "(resource) Not connected to ChRIS. Please connect first using the connect command."
      );
      loggedIn = false;
    }
    return loggedIn;
  }

  resourceItems_buildFromList(
    resources: ListResource | Resource | null
  ): Item[] | null {
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

  resource_bindGetMethodToObj(
    obj: any,
    resourceMethod: (params: ListOptions) => Promise<any>,
    resourceName?: string
  ): void {
    // this._resourceObj = obj;
    this.resourceMethod = resourceMethod.bind(obj);
    if (resourceName) this._resourceName = resourceName;
  }

  resources_filterByFields(
    resourcesByFields: ResourcesByFields | null
  ): FilteredResourceData | null {
    if (!resourcesByFields) {
      return null;
    }
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

  async resources_listAndFilterByOptions(
    options?: Partial<ListOptions>
  ): Promise<FilteredResourceData | null> {
    const results: FilteredResourceData | null = this.resources_filterByFields(
      await this.resourceFields_get(await this.resources_getList(options))
    );
    return results;
  }

  resourcesByFields_enumerate(
    items: Item[] | null
  ): ResourceFieldsPerItem | null {
    if (!items) {
      return null;
    }
    const allFields = ["id", ...items[0].data.map((item) => item.name)];
    const resourcesFieldsPerItem: ResourceFieldsPerItem = {
      items: items,
      fields: allFields,
    };
    return resourcesFieldsPerItem;
  }

  fieldSpec_resolve(
    fieldFilter?: string,
    resourceOptions?: ResourcesFromOptions | null
  ): string[] {
    let selectedFields: string[] = [];
    let fieldSpec: string = "";
    if (resourceOptions?.options?.fields) {
      fieldSpec = resourceOptions.options.fields;
    } else if (fieldFilter) {
      fieldSpec = fieldFilter;
    }
    if (fieldSpec) {
      selectedFields = fieldSpec.split(",").map((f) => f.trim());
    }
    return selectedFields;
  }

  async resourceFields_get(
    resourceOptions?: ResourcesFromOptions | null,
    fields?: string
  ): Promise<ResourcesByFields | null> {
    let availableResources: Resource | ListResource | null | undefined;
    if (!resourceOptions) {
      availableResources = (await this.resources_getList())?.resources;
      if (!availableResources) return null;
    } else {
      availableResources = resourceOptions.resources;
    }
    const resourceItems: Item[] | null =
      this.resourceItems_buildFromList(availableResources);
    if (!resourceItems || resourceItems.length === 0) return null;

    let selectedFields: string[] = this.fieldSpec_resolve(
      fields,
      resourceOptions
    );
    const resourcesFields: ResourceFieldsPerItem | null =
      this.resourcesByFields_enumerate(resourceItems);
    if (!selectedFields.length) {
      if (resourcesFields) {
        selectedFields = resourcesFields.fields;
      }
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
    resourceMethod?: (params: ListOptions) => Promise<any>
  ): Promise<ResourcesFromOptions | null> {
    const params: ListOptions = {
      limit: 20,
      offset: 0,
      ...options,
    };

    if (resourceMethod) {
      this.resourceMethod = resourceMethod;
    }
    if (!this.resourceMethod) return null;
    const resources = await this.resourceMethod(params);
    if (resources == undefined) {
      console.log(this._resourceName + " resource list returned 'undefined'");
      return { resources: null, options: params };
    }
    return { resources, options: params };
  }
}

export function resourceFields_get(
  obj: Resource | ListResource,
  fields: string[]
): SimpleRecord | null {
  const chrisResource = new ChRISResource();
  const item: Item[] | null = chrisResource.resourceItems_buildFromList(obj);
  const resourceData: FilteredResourceData | null =
    chrisResource.resources_filterByFields({
      resources: obj,
      items: item,
      fields: fields,
    });
  if (!resourceData) {
    return null;
  }
  return resourceData.tableData[0];
}

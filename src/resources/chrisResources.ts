import Client from "@fnndsc/chrisapi";
import { ListResource, Resource, ItemResource } from "@fnndsc/chrisapi";
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
  options?: ListOptions | null;
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

export interface Dictionary {
  [key: string]: string | number | boolean;
}

export class ChRISResource {
  private _client: Client | null = null;
  private _resourceName: string = "";
  private _resourceCollection: ListResource | Resource | null = null;
  private _resourceArrayItems: Item[] | null = null;
  private _resourceArray: ItemResource[] | null | undefined = null;
  private _resourceItem: ItemResource | null = null;
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

  set resourceCollection(collection: ListResource | Resource) {
    this._resourceCollection = collection;
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

  resourceItem_toDict(item: Item): Dictionary {
    return item.data.reduce((acc: Dictionary, { name, value }) => {
      acc[name] = value;
      return acc;
    }, {});
  }

  resourceItems_toDicts(items: Item[]): Dictionary[] {
    return items.map(this.resourceItem_toDict);
  }

  async resourceItem_delete(id: number): Promise<boolean> {
    if (!(this._resourceCollection instanceof ListResource)) {
      return false;
    }
    const res: ItemResource = this._resourceCollection?.getItem(id);
    const delop = await res._delete();
    // res._delete seems to return "undefined"
    return true;
  }

  resourceItems_buildFromCollection(
    resources: ListResource | Resource | null
  ): Item[] | null {
    if (!resources) {
      return null;
    }
    return resources.collection.items.map((item: any) => ({
      data: item.data,
      href: item.href,
      links: item.links,
    }));
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

  async resources_listAndFilterByOptions(
    options?: Partial<ListOptions>
  ): Promise<FilteredResourceData | null> {
    const results: FilteredResourceData | null = this.resources_filterByFields(
      await this.resourceFields_get(await this.resources_getList(options))
    );
    return results;
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

  resourcesByFields_enumerate(
    items: Item[] | null
  ): ResourceFieldsPerItem | null {
    if (!items || !items.length) {
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
    options?: ListOptions | null
  ): string[] {
    let selectedFields: string[] = [];
    let fieldSpec: string = "";
    if (options?.fields) {
      fieldSpec = options.fields;
    } else if (fieldFilter) {
      fieldSpec = fieldFilter;
    }
    if (fieldSpec) {
      selectedFields = fieldSpec.split(",").map((f) => f.trim());
    }
    return selectedFields;
  }

  async resourceFields_get(
    options?: ListOptions | null,
    fields?: string
  ): Promise<ResourcesByFields | null> {
    if (!this._resourceCollection) {
      await this.resources_getList();
    }
    if (!this._resourceArrayItems) {
      return null;
    }
    let selectedFields: string[] = this.fieldSpec_resolve(fields, options);
    const resourcesFields: ResourceFieldsPerItem | null =
      this.resourcesByFields_enumerate(this._resourceArrayItems);
    if (!resourcesFields) {
      return null;
    }
    if (!selectedFields.length) {
      if (resourcesFields) {
        selectedFields = resourcesFields.fields;
      }
    }

    // Remove duplicates from selectedFields
    selectedFields = Array.from(new Set(selectedFields));

    const resourcesByFields: ResourcesByFields = {
      resources: this._resourceCollection,
      items: this._resourceArrayItems,
      options: options,
      fields: selectedFields,
    };
    return resourcesByFields;
  }

  async resources_getItems(
    options?: Partial<ListOptions>
  ): Promise<ItemResource[] | null> {
    const params: ListOptions = {
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    };
    if (!this.resourceMethod) {
      return null;
    }
    const resources: ListResource | null = await this.resourceMethod(params);
    if (!(this._resourceCollection instanceof ListResource)) {
      return null;
    }
    this._resourceArray = this._resourceCollection?.getItems();
    if (this._resourceArray) {
      console.log(this._resourceArray);
      return this._resourceArray;
    }
    return null;
  }

  options_simplify(options: ListOptions): ListOptions {
    const params: ListOptions = {
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    };
    return params;
  }

  private applyAdditionalFiltering(originalParams: ListOptions): any[] | null {
    if (!this._resourceArrayItems || this._resourceArrayItems.length === 0) {
      return null;
    }

    const filteredItems = this._resourceArrayItems.filter((item) => {
      return Object.entries(originalParams).every(([paramKey, paramValue]) => {
        // Skip non-search related parameters
        if (["limit", "offset"].includes(paramKey)) {
          return true;
        }

        // Find the corresponding data item
        const dataItem = item.data.find((d) => d.name === paramKey);
        if (!dataItem) {
          return false; // If the field is not found, it doesn't match the filter
        }

        const itemValue = String(dataItem.value).toLowerCase();
        const searchValue = String(paramValue).toLowerCase();

        // Perform exact match for 'id', partial match for other fields
        if (paramKey === "id") {
          return itemValue === searchValue;
        } else {
          return itemValue.includes(searchValue);
        }
      });
    });

    return filteredItems.length > 0 ? filteredItems : null;
  }

  async resources_getList(
    options?: Partial<ListOptions>,
    resourceMethod?: (params: ListOptions) => Promise<any>
  ): Promise<ListOptions | null> {
    const params: ListOptions = {
      limit: 20,
      offset: 0,
      ...options,
    };
    // Remove the "fields" otherwise some list resource ops break
    const { fields, ...pureparams }: ListOptions = params;
    let simplifiedParams: ListOptions = pureparams;
    if (resourceMethod) {
      this.resourceMethod = resourceMethod;
    }
    if (!this.resourceMethod) return params;
    let resources: ListResource | null;
    try {
      resources = await this.resourceMethod(pureparams);
    } catch (error) {
      simplifiedParams = this.options_simplify(pureparams);
      resources = await this.resourceMethod(simplifiedParams);
    }
    if (resources == undefined || resources == null) {
      console.log(
        this._resourceName + " resource list returned 'undefined' or 'null'"
      );
      return params;
    }

    this._resourceCollection = resources;
    if (!(this._resourceCollection instanceof ListResource)) {
      return null;
    }
    this._resourceArray = this._resourceCollection?.getItems();
    this._resourceArrayItems =
      this.resourceItems_buildFromCollection(resources);
    if (Object.keys(pureparams).length > Object.keys(simplifiedParams).length) {
      const filteredItems = this.applyAdditionalFiltering(pureparams);
      if (filteredItems === null) {
        console.log("Warning: No items match the search criteria.");
      }
      this._resourceArrayItems = filteredItems;
    }

    return params;
  }
}

export function resourceFields_get(
  obj: Resource | ListResource,
  fields: string[]
): SimpleRecord | null {
  const chrisResource = new ChRISResource();
  const item: Item[] | null =
    chrisResource.resourceItems_buildFromCollection(obj);
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

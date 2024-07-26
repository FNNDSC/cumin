"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChRISResource = void 0;
const chrisConnection_js_1 = require("../connect/chrisConnection.js");
class ChRISResource {
    constructor() {
        this._client = null;
        this._resourceName = "";
        this.resourceMethod = null;
        this._client = chrisConnection_js_1.chrisConnection.getClient();
        this.loggedIn_check();
    }
    get client() {
        return this._client;
    }
    get resourceName() {
        return this._resourceName;
    }
    set resourceName(name) {
        this._resourceName = name;
    }
    loggedIn_check() {
        let loggedIn = true;
        if (!this._client) {
            console.log("(resource) Not connected to ChRIS. Please connect first using the connect command.");
            loggedIn = false;
        }
        return loggedIn;
    }
    resourceItems_buildFromList(resources) {
        if (resources) {
            return resources.collection.items.map((item) => ({
                data: item.data,
                href: item.href,
                links: item.links,
            }));
        }
        else {
            return null;
        }
    }
    resource_bindGetMethodToObj(obj, resourceMethod, resourceName) {
        // this._resourceObj = obj;
        this.resourceMethod = resourceMethod.bind(obj);
        if (resourceName)
            this._resourceName = resourceName;
    }
    resources_filterByFields(resourcesByFields) {
        if (!resourcesByFields) {
            return null;
        }
        const resources = resourcesByFields.items;
        const selectedFields = resourcesByFields.fields;
        if (!resources)
            return null;
        const tableData = resources.map((resource) => {
            const rowData = {
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
    async resources_listAndFilterByOptions(options) {
        const results = this.resources_filterByFields(await this.resourceFields_get(await this.resources_getList(options)));
        return results;
    }
    async resourceFields_get(resourceOptions, fields) {
        let availableResources;
        if (!resourceOptions) {
            availableResources = (await this.resources_getList())?.resources;
            if (!availableResources)
                return null;
        }
        else {
            availableResources = resourceOptions.resources;
        }
        const resourceItems = this.resourceItems_buildFromList(availableResources);
        if (!resourceItems || resourceItems.length === 0)
            return null;
        const allFields = ["id", ...resourceItems[0].data.map((item) => item.name)];
        let selectedFields = allFields;
        let fieldSpec = "";
        if (resourceOptions?.options?.fields) {
            fieldSpec = resourceOptions.options.fields;
        }
        else if (fields) {
            fieldSpec = fields;
        }
        if (fieldSpec) {
            selectedFields = fieldSpec
                .split(",")
                .map((f) => f.trim());
        }
        const resourcesByFields = {
            resources: availableResources,
            items: resourceItems,
            options: resourceOptions?.options,
            fields: selectedFields,
        };
        return resourcesByFields;
    }
    async resources_getList(options, resourceMethod) {
        const params = {
            limit: 20,
            offset: 0,
            ...options,
        };
        if (resourceMethod) {
            this.resourceMethod = resourceMethod;
        }
        if (!this.resourceMethod)
            return null;
        const resources = await this.resourceMethod(params);
        if (resources == undefined) {
            console.log(this._resourceName + " resource list returned 'undefined'");
            return { resources: null, options: params };
        }
        return { resources, options: params };
    }
}
exports.ChRISResource = ChRISResource;
//# sourceMappingURL=chrisResources.js.map
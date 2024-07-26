"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChRISPlugin = void 0;
const chrisConnection_1 = require("../connect/chrisConnection");
const chrisResources_1 = require("../resources/chrisResources");
class ChRISPlugin {
    constructor() {
        this.client = chrisConnection_1.chrisConnection.getClient();
        if (!this.client) {
            console.error("Could not access ChRIS. Have you connected with the 'connect' command?");
            process.exit(1);
        }
        this._asset = new chrisResources_1.ChRISResource();
        if (this.client) {
            this._asset.resource_bindGetMethodToObj(this.client, this.client.getPlugins);
        }
        this._asset.resourceName = "Plugins";
    }
    get asset() {
        return this._asset;
    }
}
exports.ChRISPlugin = ChRISPlugin;
//# sourceMappingURL=chrisPlugins.js.map
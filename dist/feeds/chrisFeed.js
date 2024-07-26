"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChRISFeed = void 0;
const chrisConnection_js_1 = require("../connect/chrisConnection.js");
const chrisResources_js_1 = require("../resources/chrisResources.js");
class ChRISFeed {
    constructor() {
        this.client = chrisConnection_js_1.chrisConnection.getClient();
        if (!this.client) {
            console.error("Could not access ChRIS. Have you connected with the 'connect' command?");
            process.exit(1);
        }
        this._asset = new chrisResources_js_1.ChRISResource();
        if (this.client) {
            this._asset.resource_bindGetMethodToObj(this.client, this.client.getFeeds);
        }
        this._asset.resourceName = "Feeds";
    }
    get asset() {
        return this._asset;
    }
}
exports.ChRISFeed = ChRISFeed;
//# sourceMappingURL=chrisFeed.js.map
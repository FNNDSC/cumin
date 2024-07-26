"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChRISFileBrowser = exports.BrowserType = void 0;
const chrisConnection_1 = require("../connect/chrisConnection");
const chrisResources_1 = require("../resources/chrisResources");
var BrowserType;
(function (BrowserType) {
    BrowserType["Files"] = "Files";
    BrowserType["Links"] = "Links";
    BrowserType["Dirs"] = "Dirs";
})(BrowserType || (exports.BrowserType = BrowserType = {}));
;
class ChRISFileBrowser {
    constructor(variant = BrowserType.Files, chrisObj) {
        this._chrisFileBrowserFolder = null;
        this._resource = null;
        this._bindOp = { "status": false, "message": "" };
        this._client = chrisConnection_1.chrisConnection.getClient();
        if (!this._client) {
            console.error("Could not access ChRIS. Have you connected with the 'connect' command?");
            process.exit(1);
        }
        this._chrisFileBrowserFolder = chrisObj;
        this._resource = new chrisResources_1.ChRISResource();
        this._bindOp = this.getMethod_bind(variant);
    }
    get bindOp() {
        return this._bindOp;
    }
    getFiles_bind() {
        let bindOp = { "status": false, "message": "getFiles not bound" };
        if (this._resource && this._chrisFileBrowserFolder) {
            this._resource.resource_bindGetMethodToObj(this._chrisFileBrowserFolder, this._chrisFileBrowserFolder.getFiles, BrowserType.Files);
            bindOp.status = true;
            bindOp.message = "ChRISFileBrowser bound to fileBrowserFolder.getFiles";
        }
        return bindOp;
    }
    getLinks_bind() {
        let bindOp = { "status": false, "message": "getLinks not bound" };
        if (this._resource && this._chrisFileBrowserFolder) {
            this._resource.resource_bindGetMethodToObj(this._chrisFileBrowserFolder, this._chrisFileBrowserFolder.getLinkFiles, BrowserType.Links);
            bindOp.status = true;
            bindOp.message = "ChRISFileBrowser bound to fileBrowserFolder.getLinkFiles";
        }
        return bindOp;
    }
    getDirs_bind() {
        let bindOp = { "status": false, "message": "getDirs not bound" };
        if (this._resource && this._chrisFileBrowserFolder) {
            this._resource.resource_bindGetMethodToObj(this._chrisFileBrowserFolder, this._chrisFileBrowserFolder.getChildren, BrowserType.Dirs);
            bindOp.status = true;
            bindOp.message = "ChRISFileBrowser bound to fileBrowserFolder.getChildren";
        }
        return bindOp;
    }
    getMethod_bind(variant) {
        let bindOp = { "status": false, "message": "" };
        if (!this._resource || !this._chrisFileBrowserFolder) {
            bindOp.message = "ChRISFileBrowesr resource or fileBrowserFolder is null";
            return bindOp;
        }
        bindOp.status = true;
        switch (variant) {
            case BrowserType.Files:
                bindOp = this.getFiles_bind();
                break;
            case BrowserType.Links:
                bindOp = this.getLinks_bind();
                break;
            case BrowserType.Dirs:
                bindOp = this.getDirs_bind();
                break;
        }
        return bindOp;
    }
    get resource() {
        return this._resource;
    }
    get client() {
        if (this._client) {
            return this._client;
        }
        else {
            return null;
        }
    }
    get chrisFileBrowserFolder() {
        return this._chrisFileBrowserFolder;
    }
}
exports.ChRISFileBrowser = ChRISFileBrowser;
// export async function chrisFileBrowser_create(
//   path: string = "",
// ): Promise<ChRISFileBrowser | null> {
//   const browser = new ChRISFileBrowser(path);
//   const goodBinding = await browser.initializeAndBind();
//   if (goodBinding) {
//     return browser;
//   } else {
//     return null;
//   }
// }
//# sourceMappingURL=chrisFileBrowser.js.map
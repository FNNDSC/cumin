"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChRISinode = void 0;
exports.ChRISinode_create = ChRISinode_create;
const chrisFileBrowser_1 = require("./chrisFileBrowser");
const chrisConnection_1 = require("../connect/chrisConnection");
class ChRISConnectionError extends Error {
    constructor(message) {
        super(message);
        this.name = "ChRISConnectionError";
    }
}
class ChRISInitializationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ChRISInitializationError";
    }
}
class ChRISinode {
    constructor(path = "") {
        this._client = null;
        this._fileBrowserFolderObj = null;
        this._browsers = new Map();
        this._path = path;
        this._client = chrisConnection_1.chrisConnection.getClient();
        if (!this._client) {
            throw new ChRISConnectionError("Could not access ChRIS. Have you connected with the 'connect' command?");
        }
    }
    static async create(path = "") {
        const instance = new ChRISinode(path);
        await instance.initializeAndBind();
        return instance;
    }
    get fileBrowser() {
        return this.getBrowser(chrisFileBrowser_1.BrowserType.Files);
    }
    get linkBrowser() {
        return this.getBrowser(chrisFileBrowser_1.BrowserType.Links);
    }
    get dirBrowser() {
        return this.getBrowser(chrisFileBrowser_1.BrowserType.Dirs);
    }
    get path() {
        return this._path;
    }
    get fileBrowserFolder() {
        return this._fileBrowserFolderObj;
    }
    getBrowser(type) {
        return this._browsers.get(type) ?? null;
    }
    get client() {
        return this._client;
    }
    async initializeAndBind() {
        if (!this._client) {
            throw new ChRISConnectionError("ChRIS client is not initialized");
        }
        try {
            this._fileBrowserFolderObj = await this._client.getFileBrowserFolderByPath(this._path);
        }
        catch (error) {
            throw new ChRISInitializationError('Failed to get FileBrowserFolder: ' + (error instanceof Error ? error.message : String(error)));
        }
        if (!this._fileBrowserFolderObj) {
            throw new ChRISInitializationError("Failed to initialize FileBrowserFolder");
        }
        this._browsers.set(chrisFileBrowser_1.BrowserType.Files, new chrisFileBrowser_1.ChRISFileBrowser(chrisFileBrowser_1.BrowserType.Files, this._fileBrowserFolderObj));
        this._browsers.set(chrisFileBrowser_1.BrowserType.Links, new chrisFileBrowser_1.ChRISFileBrowser(chrisFileBrowser_1.BrowserType.Links, this._fileBrowserFolderObj));
        this._browsers.set(chrisFileBrowser_1.BrowserType.Dirs, new chrisFileBrowser_1.ChRISFileBrowser(chrisFileBrowser_1.BrowserType.Dirs, this._fileBrowserFolderObj));
        for (const [_, browser] of this._browsers) {
            if (browser && !browser.bindOp.status) {
                throw new ChRISInitializationError(`Failed to bind browser: ${browser.bindOp.message}`);
            }
        }
    }
}
exports.ChRISinode = ChRISinode;
// This function is now replaced by the static factory method ChRISinode.create
// Keeping it here for backwards compatibility, but it can be removed if not needed
async function ChRISinode_create(path) {
    try {
        return await ChRISinode.create(path);
    }
    catch (error) {
        console.error("Failed to create ChRISinode:", error);
        return null;
    }
}
//# sourceMappingURL=chrisFiles.js.map
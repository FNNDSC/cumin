#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChrisVersion = getChrisVersion;
__exportStar(require("./"), exports);
__exportStar(require("./feeds/chrisFeed"), exports);
__exportStar(require("./connect/chrisConnection"), exports);
__exportStar(require("./plugins/chrisPlugins"), exports);
__exportStar(require("./resources/chrisResources"), exports);
__exportStar(require("./filebrowser/chrisFileBrowser"), exports);
__exportStar(require("./filebrowser/chrisFiles"), exports);
__exportStar(require("./utils/search"), exports);
async function getChrisVersion(url) {
    const version = "1.0.0";
    // const client = Client.getClient(url);
    // const version = await client.getVersion();
    return version;
}
// Main function
async function main() {
    console.log("In main...");
}
// Only run the main function if this file is being run directly
// Use CommonJS check for main module
if (require.main === module) {
    main().catch((error) => {
        console.error("An error occurred:", error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map
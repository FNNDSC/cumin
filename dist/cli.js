#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const figlet_1 = __importDefault(require("figlet"));
const fs_1 = require("fs");
const path_1 = require("path");
// import { createChrisFilesGetFiles } from "./filebrowser/chrisFiles";
const chrisFiles_1 = require("./filebrowser/chrisFiles");
const chrisFeed_1 = require("./feeds/chrisFeed");
// Read package.json
const packageJson = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, "..", "package.json"), "utf-8"));
const version = packageJson.version;
async function main() {
    // console.log(Client);
    // console.log(Client.getAuthToken);
    const chrisFeed = new chrisFeed_1.ChRISFeed();
    const feedResults = await chrisFeed.asset.resourceFields_get();
    // const chrisFileBrowser = await chrisFileBrowser_create(
    //   "home/rudolphpienaar/uploads",
    // );
    // const chrisFileBrowser2 = await chrisFileBrowser_create(
    //   "home/rudolphpienaar/uploads/mail",
    // );
    // const results = await chrisFileBrowser2?.resource?.resourceFields_get();
    const chrisInode = await (0, chrisFiles_1.ChRISinode_create)("home/rudolphpienaar/uploads/mail");
    if (chrisInode && chrisInode.fileBrowser) {
        const filefields = await chrisInode.fileBrowser.resource?.resourceFields_get();
    }
    console.log(figlet_1.default.textSync("cumin"));
    console.log(" -- CUbe Management INterface --");
    console.log("      == version ", version, "==");
    console.log("\n");
    console.log("Welcome to cumin! Also known as a spicy part of any chili.\n\n");
    console.log("Note that cumin isn't really intended to be used as standalone program;");
    console.log("rather, it is a support interface providing useful services especially");
    console.log("the ChILI project.");
}
main().catch(console.error);
//# sourceMappingURL=cli.js.map
#!/usr/bin/env node
import figlet from "figlet";
import Client from "@fnndsc/chrisapi";
import { readFileSync } from "fs";
import { join } from "path";
// import { chrisFileBrowser_create } from "./filebrowser/chrisFileBrowser";
import { ChRISinode } from "./filebrowser/chrisFiles";

// import { createChrisFilesGetFiles } from "./filebrowser/chrisFiles";
import { ChRISinode_create } from "./filebrowser/chrisFiles";

import { ChRISFeed } from "./feeds/chrisFeed";

// Read package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
);
const version = packageJson.version;

async function main() {
  // console.log(Client);
  // console.log(Client.getAuthToken);

  const chrisFeed = new ChRISFeed();
  const feedResults = await chrisFeed.asset.resourceFields_get();

  // const chrisFileBrowser = await chrisFileBrowser_create(
  //   "home/rudolphpienaar/uploads",
  // );
  // const chrisFileBrowser2 = await chrisFileBrowser_create(
  //   "home/rudolphpienaar/uploads/mail",
  // );
  // const results = await chrisFileBrowser2?.resource?.resourceFields_get();

  const chrisInode: ChRISinode|null = await ChRISinode_create("home/rudolphpienaar/uploads/mail");

  if(chrisInode && chrisInode.fileBrowser) {
    const filefields = await chrisInode.fileBrowser.resource?.resourceFields_get();
  }

  console.log(figlet.textSync("cumin"));
  console.log(" -- CUbe Management INterface --");
  console.log("      == version ", version, "==");
  console.log("\n");
  console.log("Welcome to cumin! Also known as a spicy part of any chili.\n\n");
  console.log(
    "Note that cumin isn't really intended to be used as standalone program;",
  );
  console.log(
    "rather, it is a support interface providing useful services especially",
  );
  console.log("the ChILI project.");
}

main().catch(console.error);

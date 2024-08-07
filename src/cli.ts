#!/usr/bin/env node
import figlet from "figlet";
import Client from "@fnndsc/chrisapi";
import { readFileSync } from "fs";
import { join } from "path";
// import { chrisFileBrowser_create } from "./filebrowser/chrisFileBrowser";
import { ChRISinode } from "./filebrowser/chrisFiles";
import { chrisConnection } from "./connect/chrisConnection";
import { connectionConfig } from "./config/config";

// import { createChrisFilesGetFiles } from "./filebrowser/chrisFiles";
import { ChRISinode_create } from "./filebrowser/chrisFiles";

import { ChRISFeedGroup } from "./feeds/chrisFeed";

// Read package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8")
);
const version = packageJson.version;

async function main() {
  console.log(figlet.textSync("cumin"));
  console.log(" -- CUbe Management INterface --");
  console.log("      == version ", version, "==");
  console.log("\n");
  console.log(
    "Welcome to cumin! Also known as the basis for any good chili.\n\n"
  );
  console.log(
    "Note that cumin isn't really intended to be used as standalone program;"
  );
  console.log(
    "rather, it is a support interface providing useful services especially"
  );
  console.log("the ChILI project.");
  console.log("\n");
  console.log(
    "For this set of configuration values read during initialization,"
  );
  console.log("the authorization token is: ", chrisConnection.getAuthToken());
  console.log("the chris URL is ", chrisConnection.getChRISurl());
  console.log(connectionConfig);
}

main().catch(console.error);

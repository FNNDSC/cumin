#!/usr/bin/env node
import figlet from "figlet";
import Client from "@fnndsc/chrisapi";
import { readFileSync } from "fs";
import { join } from "path";

// Read package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
);
const version = packageJson.version;

async function main() {
  console.log(Client);
  console.log(Client.getAuthToken);

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

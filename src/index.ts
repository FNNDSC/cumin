#!/usr/bin/env node

export * from "./";
export * from "./feeds/chrisFeed";
export * from "./connect/chrisConnection";
export * from "./plugins/chrisPlugins";
export * from "./plugins/chrisPluginMetaPlugins";
export * from "./resources/chrisResources";
export * from "./resources/chrisResourceGroup";
export * from "./filebrowser/chrisFileBrowser";
export * from "./filebrowser/chrisFiles";
export * from "./filebrowser/chrisFilesGroup";
export * from "./utils/keypair";

export async function getChrisVersion(url: string): Promise<string> {
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

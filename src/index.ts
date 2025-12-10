#!/usr/bin/env node

export * from "./";
export * from "./error/errorStack";
export * from "./config/config";
export * from "./feeds/chrisFeed";
export * from "./connect/chrisConnection";
export * from "./context/chrisContext";
export * from "./plugins/chrisPlugins";
export * from "./plugins/chrisPluginMetaPlugins";
export * from "./compute/computeResources";
export * from "./resources/chrisResources";
export * from "./resources/chrisResourceGroup";
export * from "./resources/chrisObjContext";
export * from "./resources/chrisEmbeddedResourceGroup";
export * from "./filebrowser/chrisFileBrowser";
export * from "./filebrowser/chrisFiles";
export * from "./filebrowser/chrisPACS";
export * from "./filebrowser/chrisPipeline";
export * from "./io/chrisIO";
export * from "./io/io";
export * from "./io/node_io";
export * from "./utils/keypair";
export * from "./utils/searchable";
export * from "./utils/result";
export * from "./cache";
export * from "./path/chrisPath";

/**
 * Gets the ChRIS version from the given URL.
 *
 * @param url - The URL of the ChRIS instance.
 * @returns A Promise resolving to the version string.
 */
export async function getChrisVersion(url: string): Promise<string> {
  const version = "1.0.0";
  // const client = Client.getClient(url);
  // const version = await client.getVersion();
  return version;
}

/**
 * Main entry point for the module when run directly.
 */
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

#!/usr/bin/env node

import { chrisConnection, Client } from "./connect/chrisConnection.js";
export {
  chrisConnection,
  ChRISConnection,
  Client,
} from "./connect/chrisConnection.js";

export async function ChRISconnect(
  username: string,
  password: string,
  url: string,
): Promise<string | null> {
  try {
    const authToken: string | null = await chrisConnection.connect({
      user: username,
      password: password,
      url: url,
    });
    return authToken;
  } catch (error) {
    console.error("Failed to connect:", error);
  }
  return null;
}

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

#!/usr/bin/env node

import figlet from "figlet";
import { chrisConnection } from "./connect/chrisConnection";
export { chrisConnection };

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

async function main() {
  console.log(figlet.textSync("cumin"));
  console.log(" -- CUbe Managment INterface --");
  console.log("\n");
  console.log("Welcome to cumin! Also known as a spicy part of any chili.\n\n");
  console.log(
    "Note that cumin isn't really intended to be used as standalone program",
  );
  console.log(
    "rather, it is a support interface providing useful services especially",
  );
  console.log("the ChILI project.");
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});

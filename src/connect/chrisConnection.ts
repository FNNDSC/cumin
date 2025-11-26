/**
 * @file ChRIS Connection Management
 *
 * This module provides the `ChRISConnection` class, responsible for managing
 * the connection to a ChRIS CUBE, including authentication, token handling,
 * and context setting. It abstracts away the underlying storage mechanisms
 * for configuration and tokens using `IStorageProvider`.
 *
 * @module
 */

import Client from "@fnndsc/chrisapi";
import { ConnectionConfig, config_init, connectionConfig } from "../config/config.js";
import {
  chrisContextURL_parse,
  SingleContext,
  Context,
  chrisContext,
} from "../context/chrisContext.js";
import { IStorageProvider } from "../io/io.js";

/**
 * Re-exports the ChRIS API client for convenience.
 */
export { Client };

/**
 * Interface defining options for establishing a ChRIS connection.
 */
interface ConnectOptions {
  user: string;
  password: string;
  debug: boolean;
  url: string;
}

/**
 * Helper function to validate and format a context string.
 * @param context - The context string to check.
 * @returns The formatted context string.
 */
function contextString_check(context: string): string {
  if (context.includes("://")) {
    return context;
  }
  if (context.startsWith("?")) {
    return context;
  }
  return "?" + context;
}

/**
 * Manages the connection and authentication with a ChRIS CUBE.
 */
export class ChRISConnection {
  private authToken: string | null = null;
  private tokenFile!: string;
  private user: string | null = null;
  private chrisURL: string | null = null;
  private client: Client | null = null;
  private config?: ConnectionConfig; // Made optional
  private storageProvider?: IStorageProvider; // Made optional

  /**
   * Constructs a new ChRISConnection instance.
   * @param config - The connection configuration object.
   * @param storageProvider - The storage provider for persistence.
   */
  constructor(config?: ConnectionConfig, storageProvider?: IStorageProvider) {
    if (config && storageProvider) {
      this.init(config, storageProvider);
    }
    // Ensure that config and storageProvider are not undefined if no args were passed.
    // This allows the initial `new ChRISConnection()` to create a valid, though uninitialized, object.
    this.config = config;
    this.storageProvider = storageProvider;
  }

  /**
   * Initializes the connection with configuration and storage provider.
   * @param config - The connection configuration object.
   * @param storageProvider - The storage provider for persistence.
   */
  init(config: ConnectionConfig, storageProvider: IStorageProvider) {
    this.config = config;
    this.storageProvider = storageProvider;
    this.tokenFile = this.config.tokenFilepath;
  }

  /**
   * Establishes a connection to the ChRIS CUBE and authenticates the user.
   * @param options - Connection options including user, password, debug flag, and URL.
   * @returns A Promise resolving to the authentication token on success, or null on failure.
   */
  async connection_connect(options: ConnectOptions): Promise<string | null> {
    const { user, password, debug, url }: ConnectOptions = options;

    // Ensure configuration is initialized before use
    if (this.storageProvider) {
      await config_init(this.storageProvider);
      this.config = connectionConfig;
    }

    const authUrl: string = url + "auth-token/";
    this.user = user;
    this.chrisURL = url;
    console.log(`Connecting to ${url} with user ${user}`);
    await this.config!.context_set(user, url);
    this.tokenFile = this.config!.tokenFilepath;
    try {
      this.authToken = await Client.getAuthToken(authUrl, user, password);
      if (this.authToken) {
        console.log("Auth token: " + this.authToken);
        await this.token_saveToFile(this.tokenFile, this.authToken);
        console.log("Auth token saved successfully");
        console.log("ChRIS URL saved successfully");
        return this.authToken;
      } else {
        console.log("Failed to receive auth token");
        return null;
      }
    } catch (error) {
      console.error(
        "\nSome error seems to have been thrown while attempting to log in."
      );
      console.error(
        "If the ChRIS CUBE is reachable, then it's quite possible this means"
      );
      console.error(
        "an incorrect login. Please check your login credentials carefully."
      );
      console.error(
        "Also, if your password has 'special' character, make sure how you"
      );
      console.error("are specifying it is compatible with your shell!");
      console.error("\nExiting to system with code 1...");
      if (debug) {
        throw error;
      }
      process.exit(1);
    }
  }

  /**
   * Sets the ChRIS context based on a context string (e.g., user@url?folder=...). 
   * @param context - The context string.
   * @returns A Promise resolving to true on success, false otherwise.
   */
  async context_set(context: string): Promise<boolean> {
    const currentContext: SingleContext = await chrisContext.currentContext_update(); // Await this call
    context = contextString_check(context);
    const parsedContext: SingleContext = await chrisContextURL_parse(context);

    let status: boolean = true;
    let needsRefresh: boolean = false;

    if (parsedContext.user) {
      status =
        status &&
        (await chrisContext.current_set(Context.ChRISuser, parsedContext.user)); // Await this call
      this.user = parsedContext.user;
      needsRefresh = true;
      await this.config!.context_set(
        parsedContext.user,
        parsedContext.URL || ''
      );
    }

    if (parsedContext.URL) {
      status =
        status && (await chrisContext.current_set(Context.ChRISURL, parsedContext.URL)); // Await this call
      this.chrisURL = parsedContext.URL;
      this.user = currentContext.user;
      needsRefresh = true;
      await this.config!.context_set(this.user || "", parsedContext.URL);
    }

    if (parsedContext.folder) {
      status =
        status &&
        (await chrisContext.current_set(Context.ChRISfolder, parsedContext.folder)); // Await this call
    }

    if (parsedContext.feed) {
      status =
        status &&
        (await chrisContext.current_set(Context.ChRISfeed, parsedContext.feed)); // Await this call
    }

    if (parsedContext.plugin) {
      status =
        status &&
        (await chrisContext.current_set(Context.ChRISplugin, parsedContext.plugin)); // Await this call
    }

    // Refresh the client with the new context
    if (needsRefresh) {
      await this.client_refresh();
    }

    return status;
  }

  /**
   * Retrieves the authentication token.
   * @param forceLoad - If true, forces loading the token from storage.
   * @returns A Promise resolving to the authentication token or null.
   */
  async authToken_get(forceLoad?: boolean): Promise<string | null> {
    if (!this.authToken || forceLoad) {
      await this.token_load();
    }
    return this.authToken;
  }

  /**
   * Retrieves the current authenticated user's username.
   * @returns A Promise resolving to the username string or null if not authenticated.
   */
  async user_get(): Promise<string | null> {
    // Ensure token is loaded if not already present, as user is set during connection.
    if (!this.user && this.authToken) {
      // Re-load config if necessary, or simply return stored user.
      // For now, assume this.user is reliably set during connection_connect
      // or if auth token is loaded from storage (which would imply context reload).
      // A more robust implementation might re-derive user from token or context.
    }
    return this.user;
  }

  /**
   * Retrieves the ChRIS CUBE URL.
   * @returns A Promise resolving to the ChRIS URL or null.
   */
  async chrisURL_get(): Promise<string | null> {
    if (!this.chrisURL) {
      if (!this.config) {
        return null; // config not initialized
      }
      this.chrisURL = await this.config.chrisURL_load();
    }
    return this.chrisURL;
  }

  /**
   * Refreshes the ChRIS API client with current token and URL.
   * @returns A Promise resolving to the refreshed Client instance or null.
   */
  async client_refresh(): Promise<Client | null> {
    this.tokenFile = this.config!.tokenFilepath;
    this.chrisURL = await this.chrisURL_get();
    this.authToken = await this.authToken_get(true); // Pass true directly
    if (this.chrisURL && this.authToken) {
      this.client = new Client(this.chrisURL, { token: this.authToken });
    }
    return this.client;
  }

  /**
   * Retrieves the ChRIS API client instance.
   * @returns A Promise resolving to the Client instance or null.
   */
  async client_get(): Promise<Client | null> {
    if (
      (await this.authToken_get()) &&
      (await this.chrisURL_get()) &&
      this.chrisURL &&
      this.authToken
    ) {
      if (!this.client) {
        this.client = new Client(this.chrisURL, { token: this.authToken });
      }
    }
    return this.client;
  }

  /**
   * Checks if the client is currently connected.
   * @returns True if connected, false otherwise.
   */
  connection_isConnected(): boolean {
    return this.authToken !== null;
  }

  /**
   * Logs out the user by clearing the authentication token from storage.
   */
  async connection_logout(): Promise<void> {
    this.authToken = null;
    try {
      await this.storageProvider!.remove(this.tokenFile);
      console.log("Logged out successfully");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }

  /**
   * Saves data to a specified file using the storage provider.
   * @param file - The path to the file.
   * @param info - The string data to save.
   */
  private async token_saveToFile(file: string, info: string): Promise<void> {
    try {
      await this.storageProvider!.write(file, info || "");
    } catch (error) {
      console.error("For info: ", info);
      console.error("Error saving to file ", file, ": ", error);
    }
  }

  /**
   * Loads the authentication token from storage.
   * @returns A Promise that resolves when the token is loaded.
   */
  private async token_load(): Promise<void> {
    try {
      this.authToken = await this.storageProvider!.read(this.tokenFile);
    } catch (error) {
      this.authToken = null;
    }
  }
}

/**
 * Global instance of ChRISConnection, initialized as a constant singleton.
 */
export let chrisConnection: ChRISConnection = new ChRISConnection();

/**
 * Initializes the global ChRISConnection instance.
 * @param storageProvider - The storage provider to use for the connection.
 */
export async function chrisConnection_init(storageProvider: IStorageProvider): Promise<ChRISConnection> {
  await config_init(storageProvider); // This sets the global connectionConfig
  chrisConnection = new ChRISConnection(connectionConfig, storageProvider);
  return chrisConnection;
}

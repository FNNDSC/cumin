/**
 * @file ChRIS Context Management
 *
 * This module manages the context of the ChRIS session, including the current user,
 * URL, feed, folder, and plugin. It interacts with the session configuration to
 * persist and retrieve context information.
 *
 * @module
 */

import { sessionConfig, config_init, ConnectionConfig } from "../config/config.js";
import * as path from "path";
import { QueryHits } from "../utils/keypair.js";
import { ChRISPlugin } from "../plugins/chrisPlugins.js";

/**
 * Enum defining the types of context available in ChRIS.
 */
export enum Context {
  ChRISURL = "URL",
  ChRISuser = "user",
  ChRISfolder = "folder",
  ChRISfeed = "feed",
  ChRISplugin = "plugin",
}

/**
 * Interface representing the context associated with a specific URL.
 */
export interface URLContext {
  folder: string | null;
  feed: string | null;
  plugin: string | null;
  token: string | null;
}

/**
 * Interface representing a single context, extending URLContext with URL and user.
 */
export interface SingleContext extends URLContext {
  URL: string | null;
  user: string | null;
}

/**
 * Interface representing the context for a user, including multiple URLs.
 */
export interface UserContext {
  urls: {
    [url: string]: URLContext;
  };
  currentURL: string | null;
}

/**
 * Interface representing the full context of the application, including multiple users.
 */
export interface FullContext {
  users: {
    [user: string]: UserContext;
  };
  currentUser: string | null;
  currentURL: string | null;
}

/**
 * Parses a ChRIS context URL string into a SingleContext object.
 *
 * @param url - The context URL string to parse.
 * @returns A Promise resolving to a SingleContext object.
 */
export async function chrisContextURL_parse(
  url: string
): Promise<SingleContext> {
  const result: SingleContext = {
    URL: null,
    user: null,
    folder: null,
    feed: null,
    plugin: null,
    token: null,
  };

  // Split the URL at the @ symbol
  const parts = url.split("@");
  if (parts.length > 1) {
    result.user = parts[0];
    url = parts[1];
  }

  // Extract the base URL (everything before '?')
  const urlMatch = url.match(/(https?:\/\/[^?]+)/);
  if (urlMatch) {
    result.URL = urlMatch[1];
  }

  // Extract query parameters
  const queryString = url.split("?")[1];
  if (queryString) {
    const queryParams = new URLSearchParams(queryString);

    result.folder = queryParams.get("folder");
    result.feed = queryParams.get("feed");

    // Handle 'plugin' matches with an "includes" vs "equals"
    for (const [key, value] of queryParams.entries()) {
      if (key.includes("plugin")) {
        if (value.includes(":")) {
          result.plugin = await searchable_toID(value);
        } else {
          result.plugin = value;
        }
        break; // Stop after finding the first match
      }
    }

    // Note: token is not present in the URL, so it remains null
  }
  return result;
}

/**
 * helper to get plugin ID from a searchable string.
 *
 * @param searchable - The string to search for.
 * @returns A Promise resolving to the plugin ID or null.
 */
async function searchable_toID(searchable: string): Promise<string | null> {
  const plugin: ChRISPlugin = new ChRISPlugin();
  const ids: QueryHits | null = await plugin.pluginIDs_getFromSearchable(
    searchable
  );
  if (ids) {
    const id: number = ids.hits[0] as number;
    const ID: string = id.toString();
    return ID;
  }
  return null;
}

/**
 * Manages the ChRIS session context.
 */
export class ChrisContext {
  private fullContext: FullContext = {
    users: {},
    currentUser: null,
    currentURL: null,
  };

  private _singleContext: SingleContext = {
    URL: null,
    user: null,
    folder: null,
    feed: null,
    plugin: null,
    token: null,
  };

  get singleContext(): SingleContext {
    return this._singleContext;
  }

  constructor() {
    // Initialize is async, so we can't await it in constructor.
    // Consumers should rely on the state being eventually consistent or call methods that ensure initialization.
    // this.init(); // Removed to avoid accessing uninitialized sessionConfig
  }

  /**
   * Initializes the context by loading data from the configuration directory.
   */
  async init(): Promise<void> {
    const configDir: string = sessionConfig.connection.configDir;
    const storage = sessionConfig.connection.storage;

    if (!(await storage.exists(configDir))) {
      return;
    }

    const files = await storage.readdir(configDir);
    const users: string[] = [];

    for (const file of files) {
      if (await storage.isDirectory(path.join(configDir, file))) {
        users.push(file);
      }
    }

    this.fullContext.currentUser = await sessionConfig.connection.lastUser_load();
    const currentURL: string | null = await sessionConfig.connection.chrisURL_load();
    this.fullContext.currentURL = currentURL;

    for (const user of users) {
      this.fullContext.users[user] = { urls: {}, currentURL: null };
      const userDir: string = path.join(configDir, user);
      const chrisURLFile = path.join(
        userDir,
        sessionConfig.connection.chrisURLfile
      );
      if (await storage.exists(chrisURLFile)) {
        this.fullContext.users[user].currentURL = await storage.read(chrisURLFile);
      }
      
      if (!(await storage.exists(userDir))) continue;

      const userFiles = await storage.readdir(userDir);
      const urlDirs: string[] = [];
      
      for (const file of userFiles) {
          if (await storage.isDirectory(path.join(userDir, file))) {
              urlDirs.push(file);
          }
      }

      for (const urlDir of urlDirs) {
        let url: string = (
          sessionConfig.connection as ConnectionConfig
        ).dir_toUri(urlDir);
        
        this.fullContext.users[user].urls[url] = {
          folder: await storage.read(path.join(userDir, urlDir, sessionConfig.cwdFile)),
          feed: await storage.read(path.join(userDir, urlDir, sessionConfig.feedFile)),
          plugin: await storage.read(
            path.join(userDir, urlDir, sessionConfig.pluginFile)
          ),
          token: await storage.read(
            path.join(userDir, urlDir, sessionConfig.connection.tokenFile)
          ),
        };
      }
    }
  }

  /**
   * Get the full context object.
   * @returns The full context.
   */
  fullContext_get(): FullContext {
    return this.fullContext;
  }

  async ChRISURL_get(): Promise<string | null> {
    return sessionConfig.connection.chrisURL_load();
  }

  async ChRISuser_get(): Promise<string | null> {
    return sessionConfig.connection.lastUser_load();
  }

  async ChRISfolder_get(): Promise<string | null> {
    return sessionConfig.pathContext_get();
  }

  async ChRISfeed_get(): Promise<string | null> {
    return sessionConfig.feedContext_get();
  }

  async ChRISfolder_set(path: string): Promise<boolean> {
    return sessionConfig.pathContext_set(path);
  }

  async ChRISfeed_set(feedID: string): Promise<boolean> {
    return sessionConfig.feedContext_set(feedID);
  }

  async ChRISplugin_set(pluginID: string): Promise<boolean> {
    return sessionConfig.pluginContext_set(pluginID);
  }

  async ChRISplugin_get(): Promise<string | null> {
    return sessionConfig.pluginContext_get();
  }

  async folderpath_get(): Promise<string | null> {
    return sessionConfig.pathContext_get();
  }

  async currentContext_update(): Promise<SingleContext> {
    this._singleContext.URL = await this.ChRISURL_get();
    this._singleContext.user = await this.ChRISuser_get();
    this._singleContext.folder = await this.ChRISfolder_get();
    this._singleContext.feed = await this.ChRISfeed_get();
    this._singleContext.plugin = await this.ChRISplugin_get();
    return this._singleContext;
  }

  /**
   * Get the current value for a specific context type.
   * @param context - The context type to retrieve.
   * @returns The current context value or null.
   */
  async current_get(context: Context): Promise<string | null> {
    await this.currentContext_update();
    switch (context) {
      case Context.ChRISURL:
        return this._singleContext.URL;
      case Context.ChRISuser:
        return this._singleContext.user;
      case Context.ChRISfolder:
        return this._singleContext.folder;
      case Context.ChRISfeed:
        return this._singleContext.feed;
      case Context.ChRISplugin:
        return this._singleContext.plugin;
    }
    return null;
  }

  /**
   * Set the value for a specific context type.
   * @param context - The context type to set.
   * @param value - The value to set.
   * @returns True on success, false on failure.
   */
  async current_set(context: Context, value: string): Promise<boolean> {
    let status: boolean = false;
    await this.currentContext_update();
    switch (context) {
      case Context.ChRISuser:
        this._singleContext.user = value;
        status = await sessionConfig.connection.lastUser_save(value);
        break;
      case Context.ChRISURL:
        this._singleContext.URL = value;
        status = await sessionConfig.connection.chrisURL_save(value);
        break;
      case Context.ChRISfolder:
        this._singleContext.folder = value;
        status = await this.ChRISfolder_set(value);
        break;
      case Context.ChRISfeed:
        this._singleContext.feed = value;
        status = await this.ChRISfeed_set(value);
        break;
      case Context.ChRISplugin:
        this._singleContext.plugin = value;
        status = await this.ChRISplugin_set(value);
        break;
    }
    await sessionConfig.connection.init();
    await sessionConfig.init();
    return status;
  }
}

/**
 * Global ChRIS context instance.
 */
export const chrisContext: ChrisContext = new ChrisContext();
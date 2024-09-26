import { sessionConfig, readFile, ConnectionConfig } from "../config/config";
import fs from "fs";
import path from "path";
import { QueryHits } from "../utils/keypair";
import { ChRISPlugin } from "../plugins/chrisPlugins";

export enum Context {
  ChRISURL = "URL",
  ChRISuser = "user",
  ChRISfolder = "folder",
  ChRISfeed = "feed",
  ChRISplugin = "plugin",
}

export interface URLContext {
  folder: string | null;
  feed: string | null;
  plugin: string | null;
  token: string | null;
}

export interface SingleContext extends URLContext {
  URL: string | null;
  user: string | null;
}

export interface UserContext {
  urls: {
    [url: string]: URLContext;
  };
  currentURL: string | null;
}

export async function parseChRISContextURL(
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

  // Extract the base URL
  const urlMatch = url.match(/(https?:\/\/[^\/]+\/[^?]+)/);
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
          result.plugin = await id_fromSearchable(value);
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

async function id_fromSearchable(searchable: string): Promise<string | null> {
  const plugin: ChRISPlugin = new ChRISPlugin();
  const ids: QueryHits | null = await plugin.pluginIDs_getFromSearchable(
    searchable
  );
  if (ids) {
    const id: number = ids.hits[0];
    const ID: string = id.toString();
    return ID;
  }
  return null;
}

export interface FullContext {
  users: {
    [user: string]: UserContext;
  };
  currentUser: string | null;
  currentURL: string | null;
}

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
    this.initialize();
  }

  initialize(): void {
    const configDir: string = sessionConfig.connection.configDir;
    const users: string[] = fs
      .readdirSync(configDir)
      .filter((file) => fs.statSync(path.join(configDir, file)).isDirectory());

    this.fullContext.currentUser = sessionConfig.connection.loadLastUser();
    const currentURL: string | null = sessionConfig.connection.loadChrisURL();
    this.fullContext.currentURL = currentURL;

    users.forEach((user) => {
      this.fullContext.users[user] = { urls: {}, currentURL: null };
      const userDir: string = path.join(configDir, user);
      const chrisURLFile = path.join(
        userDir,
        sessionConfig.connection.chrisURLfile
      );
      if (fs.existsSync(chrisURLFile)) {
        this.fullContext.users[user].currentURL = readFile(chrisURLFile);
      }
      const urlDirs: string[] = fs
        .readdirSync(userDir)
        .filter((file: string): boolean =>
          fs.statSync(path.join(userDir, file)).isDirectory()
        );
      urlDirs.forEach((urlDir: string): void => {
        let url: string = (
          sessionConfig.connection as ConnectionConfig
        ).dirToUri(urlDir);
        this.fullContext.users[user].urls[url] = {
          folder: readFile(path.join(userDir, urlDir, sessionConfig.cwdFile)),
          feed: readFile(path.join(userDir, urlDir, sessionConfig.feedFile)),
          plugin: readFile(
            path.join(userDir, urlDir, sessionConfig.pluginFile)
          ),
          token: readFile(
            path.join(userDir, urlDir, sessionConfig.connection.tokenFile)
          ),
        };
      });
    });
  }

  getFullContext(): FullContext {
    return this.fullContext;
  }

  ChRISURL_get(): string | null {
    return sessionConfig.connection.loadChrisURL();
  }

  ChRISuser_get(): string | null {
    return sessionConfig.connection.loadLastUser();
  }

  ChRISfolder_get(): string | null {
    return sessionConfig.getPathContext();
  }

  ChRISfeed_get(): string | null {
    return sessionConfig.getFeedContext();
  }

  ChRISfolder_set(path: string): boolean {
    return sessionConfig.setPathContext(path);
  }

  ChRISfeed_set(feedID: string): boolean {
    return sessionConfig.setFeedContext(feedID);
  }

  ChRISplugin_set(pluginID: string): boolean {
    return sessionConfig.setPluginContext(pluginID);
  }

  ChRISplugin_get(): string | null {
    return sessionConfig.getPluginContext();
  }

  get folderpath(): string | null {
    return sessionConfig.getPathContext();
  }

  currentContext_update(): SingleContext {
    this._singleContext.URL = this.ChRISURL_get();
    this._singleContext.user = this.ChRISuser_get();
    this._singleContext.folder = this.ChRISfolder_get();
    this._singleContext.feed = this.ChRISfeed_get();
    this._singleContext.plugin = this.ChRISplugin_get();
    return this._singleContext;
  }

  getCurrent(context: Context): string | null {
    this.currentContext_update();
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
  }

  setCurrent(context: Context, value: string): boolean {
    let status: boolean = false;
    this.currentContext_update();
    switch (context) {
      case Context.ChRISuser:
        this._singleContext.user = value;
        status = sessionConfig.connection.saveLastUser(value);
        break;
      case Context.ChRISURL:
        this._singleContext.URL = value;
        status = sessionConfig.connection.saveChrisURL(value);
        break;
      case Context.ChRISfolder:
        this._singleContext.folder = value;
        status = this.ChRISfolder_set(value);
        break;
      case Context.ChRISfeed:
        this._singleContext.feed = value;
        status = this.ChRISfeed_set(value);
        break;
      case Context.ChRISplugin:
        this._singleContext.plugin = value;
        status = this.ChRISplugin_set(value);
        break;
    }
    sessionConfig.connection.initialize();
    sessionConfig.initialize();
    return status;
  }
}

export const chrisContext: ChrisContext = new ChrisContext();

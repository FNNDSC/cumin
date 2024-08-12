import { sessionConfig, readFile, ConnectionConfig } from "../config/config";
import fs from "fs";
import path from "path";

export enum Context {
  ChRISURL,
  ChRISuser,
  ChRISfolder,
  ChRISfeed,
}

export interface URLContext {
  folder: string | null;
  feed: string | null;
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
  private singleContext: SingleContext = {
    URL: null,
    user: null,
    folder: null,
    feed: null,
    token: null,
  };

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

  get folderpath(): string | null {
    return sessionConfig.getPathContext();
  }

  currentContext_update() {
    this.singleContext.URL = this.ChRISURL_get();
    this.singleContext.user = this.ChRISuser_get();
    this.singleContext.folder = this.ChRISfolder_get();
    this.singleContext.feed = this.ChRISfeed_get();
  }

  getCurrent(context: Context): string | null {
    this.currentContext_update();
    switch (context) {
      case Context.ChRISURL:
        return this.singleContext.URL;
      case Context.ChRISuser:
        return this.singleContext.user;
      case Context.ChRISfolder:
        return this.singleContext.folder;
      case Context.ChRISfeed:
        return this.singleContext.feed;
    }
  }

  setCurrent(context: Context, value: string): boolean {
    let status: boolean = false;
    switch (context) {
      case Context.ChRISuser:
        this.singleContext.user = value;
        status = sessionConfig.connection.saveLastUser(value);
        break;
      case Context.ChRISURL:
        this.singleContext.URL = value;
        status = sessionConfig.connection.saveChrisURL(value);
        break;
      case Context.ChRISfolder:
        this.singleContext.folder = value;
        status = this.ChRISfolder_set(value);
        break;
      case Context.ChRISfeed:
        this.singleContext.feed = value;
        status = this.ChRISfeed_set(value);
        break;
    }
    sessionConfig.connection.initialize();
    sessionConfig.initialize();
    return status;
  }
}

export const chrisContext: ChrisContext = new ChrisContext();

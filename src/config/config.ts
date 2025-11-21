// config.ts

import { IStorageProvider } from "../io/io.js";
import { errorStack } from "../error/errorStack.js";
import * as path from "path";
import * as os from "os";

const name = "@fnndsc/cumin";

export interface ConnectionConfigOptions {
  configDir?: string;
  chrisURLfile?: string;
  chrisURLfilepath?: string;
  userFile?: string;
  userFilepath?: string;
  userContextDir?: string;
  userChRISContextDir?: string;
  currentDirectory?: string;
  tokenFile?: string;
  tokenFilepath?: string;
}

export interface SessionConfigOptions {
  cwdFile?: string;
  cwdFilename?: string;
  feedFile?: string;
  feedFilename?: string;
  pluginFile?: string;
  pluginFilename?: string;
  storageProvider?: IStorageProvider; // Add storageProvider to options
}

export class ConnectionConfig {
  private static instance: ConnectionConfig;
  private storageProvider: IStorageProvider;

  public get storage(): IStorageProvider {
    return this.storageProvider;
  }

  public readonly configDir: string;
  public userContextDir: string;
  public userChRISContextDir: string;
  public userFile: string;
  public userFilepath: string;
  public chrisURLfile: string;
  public chrisURLfilepath: string;
  public tokenFile: string;
  public tokenFilepath: string;
  public readonly currentDirectory: string;

  private constructor(
    options: ConnectionConfigOptions = {},
    storageProvider: IStorageProvider
  ) {
    this.storageProvider = storageProvider;
    const configBase =
      process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
    this.configDir = path.join(configBase, name);
    this.userFile = options.userFile || "lastUser.txt";
    this.userFilepath =
      options.userFilepath || path.join(this.configDir, this.userFile);
    this.userContextDir = options.userContextDir || "";
    this.userChRISContextDir = options.userChRISContextDir || "";
    this.chrisURLfile = options.chrisURLfile || "chrisurl.txt";
    this.chrisURLfilepath = options.chrisURLfilepath || "";
    this.tokenFile = name.replace("/", "_") + "_token.txt";
    this.tokenFilepath = options.tokenFilepath || "";
    this.currentDirectory = options.currentDirectory || process.cwd();
  }

  public static async getInstance(
    storageProvider: IStorageProvider,
    options?: ConnectionConfigOptions
  ): Promise<ConnectionConfig> {
    if (!ConnectionConfig.instance) {
      ConnectionConfig.instance = new ConnectionConfig(options, storageProvider);
      await ConnectionConfig.instance.initialize();
    }
    return ConnectionConfig.instance;
  }

  public async initialize(): Promise<void> {
    await this.ensureDirExists(this.configDir);
    const lastUser: string | null = await this.loadLastUser();
    if (!lastUser) {
      return;
    }
    this.userContextDir = path.join(this.configDir, lastUser);
    this.chrisURLfilepath = path.join(this.userContextDir, this.chrisURLfile);
    const lastURL: string | null = await this.loadChrisURL();
    if (!lastURL) {
      return;
    }
    this.userChRISContextDir = path.join(
      this.userContextDir,
      this.uriToDir(lastURL)
    );
    this.tokenFilepath = path.join(this.userChRISContextDir, this.tokenFile);
  }

  private async ensureDirExists(dir: string): Promise<void> {
    if (!(await this.storageProvider.exists(dir))) {
      await this.storageProvider.mkdir(dir, { recursive: true });
    }
  }

  public uriToDir(uri: string): string {
    return uri
      .replace("://", "___") // Use triple underscore for protocol separator
      .replace(/:/g, "===") // Use triple equals for colon (to handle port numbers)
      .replace(/[/]/g, "_") // Replace slashes with single underscore
      .replace(/\./g, "--"); // Use double dash for dots
  }

  public dirToUri(dir: string): string {
    let uri = dir
      .replace(/--/g, ".") // Convert double dashes back to dots
      .replace(/___/g, "://") // Convert triple underscore back to protocol separator
      .replace(/===/g, ":"); // Convert triple equals back to colon

    // Split the URI into protocol, domain (including port if present), and path
    const parts = uri.split("://");
    if (parts.length !== 2) {
      throw new Error("Invalid directory name");
    }

    const [protocol, rest] = parts;
    // Split at the first underscore, which should be after the domain and port
    const [domainPart, ...pathParts] = rest.split("_");
    // Join the path parts back with slashes
    const path = pathParts.join("/");

    // Return the reconstructed URI
    return `${protocol}://${domainPart}/${path}`;
  }

  public async setContext(user: string, url?: string): Promise<void> {
    await this.saveLastUser(user);
    this.userContextDir = path.join(this.configDir, user);
    await this.ensureDirExists(this.userContextDir);
    this.chrisURLfilepath = path.join(this.userContextDir, this.chrisURLfile);
    if (!url) {
      return;
    }
    await this.saveChrisURL(url);
    this.userChRISContextDir = path.join(
      this.userContextDir,
      this.uriToDir(url)
    );
    await this.ensureDirExists(this.userChRISContextDir);
    this.tokenFilepath = path.join(this.userChRISContextDir, this.tokenFile);
  }

  public async saveLastUser(user: string): Promise<boolean> {
    const userDir = path.dirname(this.userFilepath);
    const userFolderPath = path.join(userDir, user);

    if (await this.storageProvider.exists(userFolderPath)) {
      await this.storageProvider.write(this.userFilepath, user);
      return true;
    }
    errorStack.push(
      "error",
      `user '${user}' has not logged in previously -- no context found`
    );
    return false;
  }

  public async saveChrisURL(url: string): Promise<boolean> {
    const urlDir = path.dirname(this.chrisURLfilepath);
    const urlFolderPath = path.join(urlDir, this.uriToDir(url));

    if (await this.storageProvider.exists(urlFolderPath)) {
      await this.storageProvider.write(this.chrisURLfilepath, url);
      return true;
    }
    errorStack.push(
      "error",
      `URL '${url}' has not been accessed previously -- no context found`
    );
    return false;
  }

  public async loadLastUser(): Promise<string | null> {
    return this.storageProvider.read(this.userFilepath);
  }

  public async loadChrisURL(): Promise<string | null> {
    const url: string | null = await this.storageProvider.read(
      this.chrisURLfilepath
    );
    return url;
  }
}

export class SessionConfig {
  private static instance: SessionConfig;

  public cwdFile: string;
  public cwdFilename: string;
  public feedFile: string;
  public feedFilename: string;
  public pluginFile: string;
  public pluginFilename: string;
  private connectionConfig: ConnectionConfig;
  private storageProvider: IStorageProvider;

  private constructor(
    options: SessionConfigOptions = {},
    connectionConfig: ConnectionConfig,
    storageProvider: IStorageProvider
  ) {
    this.cwdFile = options.cwdFile || "cwd.txt";
    this.cwdFilename = options.cwdFilename || "";
    this.feedFile = options.feedFile || "feed.txt";
    this.feedFilename = options.feedFilename || "";
    this.pluginFile = options.pluginFile || "plugin.txt";
    this.pluginFilename = options.pluginFilename || "";
    this.connectionConfig = connectionConfig;
    this.storageProvider = storageProvider;
  }

  get connection(): ConnectionConfig {
    return this.connectionConfig;
  }

  public static async getInstance(
    storageProvider: IStorageProvider,
    options?: SessionConfigOptions
  ): Promise<SessionConfig> {
    if (!SessionConfig.instance) {
      const connectionConfig = await ConnectionConfig.getInstance(storageProvider);
      SessionConfig.instance = new SessionConfig(
        options,
        connectionConfig,
        storageProvider
      );
      await SessionConfig.instance.initialize();
    }
    return SessionConfig.instance;
  }

  public async initialize(): Promise<void> {
    this.cwdFilename = path.join(
      this.connectionConfig.userChRISContextDir,
      this.cwdFile
    );
    this.feedFilename = path.join(
      this.connectionConfig.userChRISContextDir,
      this.feedFile
    );
    this.pluginFilename = path.join(
      this.connectionConfig.userChRISContextDir,
      this.pluginFile
    );
  }

  public async setPathContext(path: string): Promise<boolean> {
    await this.storageProvider.write(this.cwdFilename, path);
    return true;
  }

  public async getPathContext(): Promise<string | null> {
    return this.storageProvider.read(this.cwdFilename);
  }

  public async setFeedContext(feedID: string): Promise<boolean> {
    await this.storageProvider.write(this.feedFilename, feedID);
    return true;
  }

  public async getFeedContext(): Promise<string | null> {
    return this.storageProvider.read(this.feedFilename);
  }

  public async setPluginContext(pluginID: string): Promise<boolean> {
    await this.storageProvider.write(this.pluginFilename, pluginID);
    return true;
  }

  public async getPluginContext(): Promise<string | null> {
    return this.storageProvider.read(this.pluginFilename);
  }
}

export let connectionConfig: ConnectionConfig;
export let sessionConfig: SessionConfig;

export async function initializeConfig(storageProvider: IStorageProvider) {
  connectionConfig = await ConnectionConfig.getInstance(storageProvider);
  sessionConfig = await SessionConfig.getInstance(storageProvider);
}

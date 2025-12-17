// config.ts

import { IStorageProvider } from "../io/io.js";
import { errorStack } from "../error/errorStack.js";
import * as path from "path";
import * as os from "os";

const name = "@fnndsc/cumin";

/**
 * Options for configuring a ChRIS connection.
 */
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

/**
 * Options for configuring a ChRIS session.
 */
export interface SessionConfigOptions {
  cwdFile?: string;
  cwdFilename?: string;
  feedFile?: string;
  feedFilename?: string;
  pluginFile?: string;
  pluginFilename?: string;
  pacsserverFile?: string;
  pacsserverFilename?: string;
  storageProvider?: IStorageProvider; // Add storageProvider to options
}

/**
 * Manages configuration for connecting to a ChRIS instance.
 * Handles storage of user credentials, URLs, and context directories.
 */
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
  public debug: boolean = false;

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
    this.debug = process.env.CHILI_DEBUG === 'true';
  }

  /**
   * Get the singleton instance of ConnectionConfig.
   *
   * @param storageProvider - The storage provider to use.
   * @param options - Optional configuration options.
   * @returns A promise resolving to the ConnectionConfig instance.
   */
  public static async instance_get(
    storageProvider: IStorageProvider,
    options?: ConnectionConfigOptions
  ): Promise<ConnectionConfig> {
    if (!ConnectionConfig.instance) {
      ConnectionConfig.instance = new ConnectionConfig(options, storageProvider);
      await ConnectionConfig.instance.init();
    }
    return ConnectionConfig.instance;
  }

  /**
   * Initialize the connection configuration.
   * Loads last user and ChRIS URL from storage.
   */
  public async init(): Promise<void> {
    await this.dir_ensureExists(this.configDir);
    const lastUser: string | null = await this.lastUser_load();
    if (!lastUser) {
      return;
    }
    this.userContextDir = path.join(this.configDir, lastUser);
    this.chrisURLfilepath = path.join(this.userContextDir, this.chrisURLfile);
    const lastURL: string | null = await this.chrisURL_load();
    if (!lastURL) {
      return;
    }
    this.userChRISContextDir = path.join(
      this.userContextDir,
      this.uri_toDir(lastURL)
    );
    this.tokenFilepath = path.join(this.userChRISContextDir, this.tokenFile);
  }

  /**
   * Ensure a directory exists in storage.
   *
   * @param dir - The directory path to check/create.
   */
  private async dir_ensureExists(dir: string): Promise<void> {
    if (!(await this.storageProvider.exists(dir))) {
      await this.storageProvider.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Convert a URI to a directory-safe string.
   *
   * @param uri - The URI to convert.
   * @returns A string safe for use as a directory name.
   */
  public uri_toDir(uri: string): string {
    return uri
      .replace("://", "___") // Use triple underscore for protocol separator
      .replace(/:/g, "===") // Use triple equals for colon (to handle port numbers)
      .replace(/[/]/g, "_") // Replace slashes with single underscore
      .replace(/\./g, "--"); // Use double dash for dots
  }

  /**
   * Convert a directory-safe string back to a URI.
   *
   * @param dir - The directory name to convert.
   * @returns The reconstructed URI.
   * @throws Error if the directory name format is invalid.
   */
  public dir_toUri(dir: string): string {
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

  /**
   * Set the current user and ChRIS URL context.
   *
   * @param user - The username.
   * @param url - Optional ChRIS URL.
   */
  public async context_set(user: string, url?: string): Promise<void> {
    await this.lastUser_save(user);
    this.userContextDir = path.join(this.configDir, user);
    await this.dir_ensureExists(this.userContextDir);
    this.chrisURLfilepath = path.join(this.userContextDir, this.chrisURLfile);
    if (!url) {
      return;
    }
    await this.chrisURL_save(url);
    this.userChRISContextDir = path.join(
      this.userContextDir,
      this.uri_toDir(url)
    );
    await this.dir_ensureExists(this.userChRISContextDir);
    this.tokenFilepath = path.join(this.userChRISContextDir, this.tokenFile);
  }

  /**
   * Save the last logged-in user to storage.
   *
   * @param user - The username to save.
   * @returns True if successful, false otherwise.
   */
  public async lastUser_save(user: string): Promise<boolean> {
    const userDir = path.dirname(this.userFilepath);
    const userFolderPath = path.join(userDir, user);

    if (await this.storageProvider.exists(userFolderPath)) {
      await this.storageProvider.write(this.userFilepath, user);
      return true;
    }
    errorStack.stack_push(
      "error",
      `user '${user}' has not logged in previously -- no context found`
    );
    return false;
  }

  /**
   * Save the ChRIS URL to storage.
   *
   * @param url - The URL to save.
   * @returns True if successful, false otherwise.
   */
  public async chrisURL_save(url: string): Promise<boolean> {
    const urlDir = path.dirname(this.chrisURLfilepath);
    const urlFolderPath = path.join(urlDir, this.uri_toDir(url));

    if (await this.storageProvider.exists(urlFolderPath)) {
      await this.storageProvider.write(this.chrisURLfilepath, url);
      return true;
    }
    errorStack.stack_push(
      "error",
      `URL '${url}' has not been accessed previously -- no context found`
    );
    return false;
  }

  /**
   * Load the last logged-in user from storage.
   *
   * @returns The username or null if not found.
   */
  public async lastUser_load(): Promise<string | null> {
    return this.storageProvider.read(this.userFilepath);
  }

  /**
   * Load the saved ChRIS URL from storage.
   *
   * @returns The URL or null if not found.
   */
  public async chrisURL_load(): Promise<string | null> {
    const url: string | null = await this.storageProvider.read(
      this.chrisURLfilepath
    );
    return url;
  }
}

/**
 * Manages session-specific configuration such as current working directory (CWD),
 * active feed, and active plugin.
 */
export class SessionConfig {
  private static instance: SessionConfig;

  public cwdFile: string;
  public cwdFilename: string;
  public feedFile: string;
  public feedFilename: string;
  public pluginFile: string;
  public pluginFilename: string;
  public pacsserverFile: string;
  public pacsserverFilename: string;
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
    this.pacsserverFile = options.pacsserverFile || "pacsserver.txt";
    this.pacsserverFilename = options.pacsserverFilename || "";
    this.connectionConfig = connectionConfig;
    this.storageProvider = storageProvider;
  }

  get connection(): ConnectionConfig {
    return this.connectionConfig;
  }

  /**
   * Get the singleton instance of SessionConfig.
   *
   * @param storageProvider - The storage provider to use.
   * @param options - Optional configuration options.
   * @returns A promise resolving to the SessionConfig instance.
   */
  public static async instance_get(
    storageProvider: IStorageProvider,
    options?: SessionConfigOptions
  ): Promise<SessionConfig> {
    if (!SessionConfig.instance) {
      const connectionConfig = await ConnectionConfig.instance_get(storageProvider);
      SessionConfig.instance = new SessionConfig(
        options,
        connectionConfig,
        storageProvider
      );
      await SessionConfig.instance.init();
    }
    return SessionConfig.instance;
  }

  /**
   * Initialize the session configuration.
   * Sets up filenames based on the user's context directory.
   */
  public async init(): Promise<void> {
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
    this.pacsserverFilename = path.join(
      this.connectionConfig.userChRISContextDir,
      this.pacsserverFile
    );
  }

  /**
   * Set the current working directory context.
   *
   * @param path - The path to save.
   * @returns True if successful.
   */
  public async pathContext_set(path: string): Promise<boolean> {
    await this.storageProvider.write(this.cwdFilename, path);
    return true;
  }

  /**
   * Get the current working directory context.
   *
   * @returns The saved path or null if not found.
   */
  public async pathContext_get(): Promise<string | null> {
    return this.storageProvider.read(this.cwdFilename);
  }

  /**
   * Set the active feed context.
   *
   * @param feedID - The ID of the feed.
   * @returns True if successful.
   */
  public async feedContext_set(feedID: string): Promise<boolean> {
    await this.storageProvider.write(this.feedFilename, feedID);
    return true;
  }

  /**
   * Get the active feed context.
   *
   * @returns The saved feed ID or null if not found.
   */
  public async feedContext_get(): Promise<string | null> {
    return this.storageProvider.read(this.feedFilename);
  }

  /**
   * Set the active plugin context.
   *
   * @param pluginID - The ID of the plugin.
   * @returns True if successful.
   */
  public async pluginContext_set(pluginID: string): Promise<boolean> {
    await this.storageProvider.write(this.pluginFilename, pluginID);
    return true;
  }

  /**
   * Get the active plugin context.
   *
   * @returns The saved plugin ID or null if not found.
   */
  public async pluginContext_get(): Promise<string | null> {
    return this.storageProvider.read(this.pluginFilename);
  }

  /**
   * Set the active PACS server context.
   *
   * @param pacsServer - The PACS server identifier.
   * @returns True if successful.
   */
  public async pacsserverContext_set(pacsServer: string): Promise<boolean> {
    await this.storageProvider.write(this.pacsserverFilename, pacsServer);
    return true;
  }

  /**
   * Get the active PACS server context.
   *
   * @returns The saved PACS server identifier or null if not found.
   */
  public async pacsserverContext_get(): Promise<string | null> {
    return this.storageProvider.read(this.pacsserverFilename);
  }
}

/**
 * Global connection configuration instance.
 */
export let connectionConfig: ConnectionConfig;

/**
 * Global session configuration instance.
 */
export let sessionConfig: SessionConfig;

/**
 * Initialize both connection and session configurations.
 *
 * @param storageProvider - The storage provider to use.
 */
export async function config_init(storageProvider: IStorageProvider) {
  connectionConfig = await ConnectionConfig.instance_get(storageProvider);
  sessionConfig = await SessionConfig.instance_get(storageProvider);
}

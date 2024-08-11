// config.ts

import fs from "fs";
import { readFileSync } from "fs";
import path from "path";
import { join } from "path";
import os from "os";

// Read package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../..", "package.json"), "utf-8")
);
const name = packageJson.name;

export function writeFile(file: string, content: string): void {
  try {
    fs.writeFileSync(file, content, { mode: 0o600 });
  } catch (error) {
    console.error(`Error writing to file ${file}:`, error);
  }
}

export function readFile(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch (error) {
    return null;
  }
}

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
}

export class SessionConfig {
  private static instance: SessionConfig;

  public cwdFile: string;
  public cwdFilename: string;
  private connectionConfig: ConnectionConfig;

  private constructor(
    options: SessionConfigOptions = {},
    connectionConfig: ConnectionConfig
  ) {
    this.cwdFile = options.cwdFile || "cwd.txt";
    this.cwdFilename = options.cwdFilename || "";
    this.connectionConfig = connectionConfig;

    this.initialize();
  }

  get connection(): ConnectionConfig {
    return connectionConfig;
  }

  public static getInstance(options?: SessionConfigOptions): SessionConfig {
    if (!SessionConfig.instance) {
      SessionConfig.instance = new SessionConfig(options, connectionConfig);
    }
    return SessionConfig.instance;
  }

  public initialize(): void {
    this.cwdFilename = path.join(
      this.connectionConfig.userChRISContextDir,
      this.cwdFile
    );
  }

  public setPathContext(path: string): void {
    writeFile(this.cwdFilename, path);
  }
}

export class ConnectionConfig {
  private static instance: ConnectionConfig;

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

  private constructor(options: ConnectionConfigOptions = {}) {
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

    this.initialize();
  }

  public static getInstance(
    options?: ConnectionConfigOptions
  ): ConnectionConfig {
    if (!ConnectionConfig.instance) {
      ConnectionConfig.instance = new ConnectionConfig(options);
    }
    return ConnectionConfig.instance;
  }

  public initialize(): void {
    this.ensureDirExists(this.configDir);
    const lastUser: string | null = this.loadLastUser();
    if (!lastUser) {
      return;
    }
    this.userContextDir = path.join(this.configDir, lastUser);
    this.chrisURLfilepath = path.join(this.userContextDir, this.chrisURLfile);
    const lastURL: string | null = this.loadChrisURL();
    if (!lastURL) {
      return;
    }
    this.userChRISContextDir = path.join(
      this.userContextDir,
      this.uriToDir(lastURL)
    );
    this.tokenFilepath = path.join(this.userChRISContextDir, this.tokenFile);
  }

  private ensureDirExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  public uriToDir(uri: string): string {
    return uri
      .replace("://", "___") // Use triple underscore for protocol separator
      .replace(/[/:]/g, "_")
      .replace(/\./g, "--"); // Use double dash for dots
  }

  public dirToUri(dir: string): string {
    let uri = dir
      .replace(/--/g, ".") // Convert double dashes back to dots
      .replace(/___/g, "://"); // Convert triple underscore back to protocol separator

    // Replace remaining underscores with slashes, but not in the protocol and domain part
    const parts = uri.split("://");
    if (parts.length !== 2) {
      throw new Error("Invalid directory name");
    }

    const [protocol, rest] = parts;
    const domainAndPath = rest.split("/", 1);
    const domain = domainAndPath[0];
    const path = rest.slice(domain.length);

    return `${protocol}://${domain}${path.replace(/_/g, "/")}`;
  }

  public setContext(user: string, url?: string): void {
    this.saveLastUser(user);
    this.userContextDir = path.join(this.configDir, user);
    this.ensureDirExists(this.userContextDir);
    this.chrisURLfilepath = path.join(this.userContextDir, this.chrisURLfile);
    if (!url) {
      return;
    }
    this.saveChrisURL(url);
    this.userChRISContextDir = path.join(
      this.userContextDir,
      this.uriToDir(url)
    );
    this.ensureDirExists(this.userChRISContextDir);
    this.tokenFilepath = path.join(this.userChRISContextDir, this.tokenFile);
  }

  public saveLastUser(user: string): void {
    writeFile(this.userFilepath, user);
  }

  public loadLastUser(): string | null {
    return readFile(this.userFilepath);
  }

  public saveChrisURL(url: string): void {
    writeFile(this.chrisURLfilepath, url);
  }

  public loadChrisURL(): string | null {
    return readFile(this.chrisURLfilepath);
  }
}

export const connectionConfig = ConnectionConfig.getInstance();
export const sessionConfig = SessionConfig.getInstance();

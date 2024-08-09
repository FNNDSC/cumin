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
    return uri.replace(/[/:]/g, "_");
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
    this.writeFile(this.userFilepath, user);
  }

  public loadLastUser(): string | null {
    return this.readFile(this.userFilepath);
  }

  public saveChrisURL(url: string): void {
    this.writeFile(this.chrisURLfilepath, url);
  }

  public loadChrisURL(): string | null {
    return this.readFile(this.chrisURLfilepath);
  }

  private writeFile(file: string, content: string): void {
    try {
      fs.writeFileSync(file, content, { mode: 0o600 });
    } catch (error) {
      console.error(`Error writing to file ${file}:`, error);
    }
  }

  private readFile(file: string): string | null {
    try {
      return fs.readFileSync(file, "utf-8");
    } catch (error) {
      return null;
    }
  }
}

export const connectionConfig = ConnectionConfig.getInstance();

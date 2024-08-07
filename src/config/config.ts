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
  instanceDir?: string;
  chrisURLfile?: string;
  userFile?: string;
  currentDirectory?: string;
  tokenFile?: string;
}

export class ConnectionConfig {
  private static instance: ConnectionConfig;

  public readonly configDir: string;
  public instanceDir: string;
  public chrisURLfile: string;
  public userFile: string;
  public tokenFile: string;
  public readonly currentDirectory: string;

  private constructor(options: ConnectionConfigOptions = {}) {
    const configBase =
      process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
    this.configDir = path.join(configBase, name);
    this.instanceDir = options.instanceDir || "";
    this.chrisURLfile = options.chrisURLfile || "chrisurl.txt";
    this.userFile =
      options.userFile || path.join(this.configDir, "lastUser.txt");
    this.tokenFile = options.tokenFile || name.replace("/", "_") + "_token.txt";
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

  private initialize(): void {
    this.ensureDirExists(this.configDir);
    const lastUser = this.loadLastUser();
    if (lastUser) {
      this.setInstanceDir(lastUser);
      this.chrisURLfile = path.join(this.instanceDir, this.chrisURLfile);
      this.tokenFile = path.join(this.instanceDir, this.tokenFile);
    }
  }

  private ensureDirExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  public setInstanceDir(user: string): void {
    this.instanceDir = path.join(this.configDir, user);
    this.ensureDirExists(this.instanceDir);
  }

  public saveLastUser(user: string): void {
    this.writeFile(this.userFile, user);
  }

  public loadLastUser(): string | null {
    return this.readFile(this.userFile);
  }

  public saveChrisURL(url: string): void {
    this.writeFile(this.chrisURLfile, url);
  }

  public loadChrisURL(): string | null {
    return this.readFile(this.chrisURLfile);
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

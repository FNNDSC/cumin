import fs from "fs";
import path from "path";
import os from "os";
import Client from "@fnndsc/chrisapi";
import { readFileSync } from "fs";
import { join } from "path";

// Read package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../..", "package.json"), "utf-8"),
);
const name = packageJson.name;

export { Client };

interface ConnectOptions {
  user: string;
  password: string;
  url: string;
}

export class ChRISConnection {
  private authToken: string | null = null;
  private tokenFile: string;
  private userFile: string;
  private user: string | null = null;
  private configDir: string;
  private instanceDir: string;
  private chrisURLfile: string;
  private chrisURL: string | null = null;
  private client: Client | null = null;
  private instanceDataSet: boolean = false;

  constructor() {
    const configBase: string =
      process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
    this.configDir = path.join(configBase, name);
    this.ensureDirExists(this.configDir);
    this.userFile = path.join(this.configDir, "lastUser.txt");
    this.instanceDir = "";
    this.loadUser();
    this.tokenFile = name.replace("/", "_") + "_token.txt";
    this.chrisURLfile = "chrisurl.txt";
    this.chrisURL = "";
    if (this.user) {
      this.instanceData_set(this.user);
      this.instanceDataSet = true;
    }
    this.client = null;
  }

  private ensureDirExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      } catch (error) {
        console.error("Error creating directory:", error);
      }
    }
  }

  private instanceData_set(user: string): void {
    this.instanceDir = path.join(this.configDir, user);
    this.ensureDirExists(this.instanceDir);
    this.tokenFile = path.join(this.instanceDir, this.tokenFile);
    this.chrisURLfile = path.join(this.instanceDir, this.chrisURLfile);
  }

  private userConfigSet(user: string, url: string): void {
    this.user = user;
    this.saveToFile(this.userFile, user);
    if (!this.instanceDataSet) {
      this.instanceData_set(user);
    }
  }

  async connect(options: ConnectOptions): Promise<string | null> {
    const { user, password, url }: ConnectOptions = options;
    const authUrl: string = url + "auth-token/";
    this.chrisURL = url;

    console.log(`Connecting to ${url} with user ${user}`);
    this.userConfigSet(user, url);

    try {
      this.authToken = await Client.getAuthToken(authUrl, user, password);
      if (this.authToken) {
        console.log("Auth token: " + this.authToken);
        this.saveToFile(this.tokenFile, this.authToken);
        this.saveToFile(this.chrisURLfile, url);
        console.log("Auth token saved successfully");
        console.log("ChRIS URL  saved successfully");
        return this.authToken;
      } else {
        console.log("Failed to receive auth token");
        return null;
      }
    } catch (error) {
      console.error("\nSome error seems to have been thrown while attempting to log in.");
      console.error("If the ChRIS CUBE is reachable, then it's quite possible this means");
      console.error("an incorrect login. Please check your login credentials carefully.");
      console.error("Exiting to system with code 1...");
      throw error;
    }
  }

  getAuthToken(): string | null {
    if (!this.authToken) {
      this.loadToken();
    }
    return this.authToken;
  }

  getChRISurl(): string | null {
    if (!this.chrisURL) {
      this.loadChRISurl();
    }
    return this.chrisURL;
  }

  getClient(): Client | null {
    if (
      this.getAuthToken() &&
      this.getChRISurl() &&
      this.chrisURL &&
      this.authToken
    ) {
      if (!this.client) {
        this.client = new Client(this.chrisURL, { token: this.authToken });
      }
    }
    return this.client;
  }

  isConnected(): boolean {
    return this.getAuthToken() !== null;
  }

  loggedIn_check(): boolean {
    let loggedIn: boolean = true;
    if (!this.client) {
      console.log(
        "(connect) Not connected to ChRIS. Please connect first using the connect command.",
      );
      loggedIn = false;
    }
    return loggedIn;
  }

  logout(): void {
    this.authToken = null;
    try {
      fs.unlinkSync(this.tokenFile);
      console.log("Logged out successfully");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }

  private saveToFile(file: string, info: string): void {
    try {
      fs.writeFileSync(file, info || "", { mode: 0o600 });
    } catch (error) {
      console.error("For info: ", info);
      console.error("Error saving to file ", file, ": ", error);
    }
  }

  private saveToken(): void {
    try {
      fs.writeFileSync(this.tokenFile, this.authToken || "", { mode: 0o600 });
    } catch (error) {
      console.error("Error saving token:", error);
    }
  }

  private loadUser(): void {
    try {
      this.user = fs.readFileSync(this.userFile, "utf-8");
    } catch (error) {
      this.user = null;
    }
  }

  private loadToken(): void {
    try {
      this.authToken = fs.readFileSync(this.tokenFile, "utf-8");
    } catch (error) {
      this.authToken = null;
    }
  }

  private loadChRISurl(): void {
    try {
      this.chrisURL = fs.readFileSync(this.chrisURLfile, "utf-8");
    } catch (error) {
      this.chrisURL = null;
    }
  }
}

export const chrisConnection = new ChRISConnection();

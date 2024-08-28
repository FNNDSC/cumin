// chrisConnection.ts

import fs from "fs";
import path from "path";
import Client from "@fnndsc/chrisapi";
import { ConnectionConfig } from "../config/config";
import {
  parseChRISContextURL,
  SingleContext,
  Context,
  chrisContext,
} from "../context/chrisContext";

export { Client };

interface ConnectOptions {
  user: string;
  password: string;
  debug: boolean;
  url: string;
}

export class ChRISConnection {
  private authToken: string | null = null;
  private tokenFile: string;
  private user: string | null = null;
  private chrisURL: string | null = null;
  private client: Client | null = null;
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.config = config;
    this.tokenFile = this.config.tokenFilepath;
  }

  async connect(options: ConnectOptions): Promise<string | null> {
    const { user, password, debug, url }: ConnectOptions = options;
    const authUrl: string = url + "auth-token/";
    this.user = user;
    this.chrisURL = url;
    console.log(`Connecting to ${url} with user ${user}`);
    this.config.setContext(user, url);
    this.tokenFile = this.config.tokenFilepath;
    try {
      this.authToken = await Client.getAuthToken(authUrl, user, password);
      if (this.authToken) {
        console.log("Auth token: " + this.authToken);
        this.saveToFile(this.tokenFile, this.authToken);
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

  contextString_check(context: string): string {
    if (context.includes("://")) {
      return context;
    }
    if (context.startsWith("?")) {
      return context;
    }
    return "?" + context;
  }

  setContext(context: string): boolean {
    const currentContext: SingleContext = chrisContext.currentContext_update();
    context = this.contextString_check(context);
    const parsedContext: SingleContext = parseChRISContextURL(context);

    let success: boolean = true;
    let needsRefresh: boolean = false;

    if (parsedContext.user) {
      success =
        success &&
        chrisContext.setCurrent(Context.ChRISuser, parsedContext.user);
      this.user = parsedContext.user;
      needsRefresh = true;
      this.config.setContext(
        parsedContext.user,
        parsedContext.URL || undefined
      );
    }

    if (parsedContext.URL) {
      success =
        success && chrisContext.setCurrent(Context.ChRISURL, parsedContext.URL);
      this.chrisURL = parsedContext.URL;
      this.user = currentContext.user;
      needsRefresh = true;
      this.config.setContext(this.user || "", parsedContext.URL);
    }

    if (parsedContext.folder) {
      success =
        success &&
        chrisContext.setCurrent(Context.ChRISfolder, parsedContext.folder);
    }

    if (parsedContext.feed) {
      success =
        success &&
        chrisContext.setCurrent(Context.ChRISfeed, parsedContext.feed);
    }

    if (parsedContext.plugin) {
      success =
        success &&
        chrisContext.setCurrent(Context.ChRISplugin, parsedContext.plugin);
    }

    // Refresh the client with the new context
    if (needsRefresh) {
      this.refreshClient();
    }

    return success;
  }

  getAuthToken(forceLoad?: boolean): string | null {
    if (!this.authToken || forceLoad) {
      this.loadToken();
    }
    return this.authToken;
  }

  getChRISurl(): string | null {
    if (!this.chrisURL) {
      this.chrisURL = this.config.loadChrisURL();
    }
    return this.chrisURL;
  }

  refreshClient(): Client | null {
    const forceTokenLoad: boolean = true;
    this.tokenFile = this.config.tokenFilepath;
    this.chrisURL = this.getChRISurl();
    this.authToken = this.getAuthToken(forceTokenLoad);
    if (this.chrisURL && this.authToken) {
      this.client = new Client(this.chrisURL, { token: this.authToken });
    }
    return this.client;
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
        "(connect) Not connected to ChRIS. Please connect first using the connect command."
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

  private loadUser(): void {
    this.user = this.config.loadLastUser();
  }

  private loadToken(): void {
    try {
      this.authToken = fs.readFileSync(this.tokenFile, "utf-8");
    } catch (error) {
      this.authToken = null;
    }
  }
}

const config = ConnectionConfig.getInstance();
export const chrisConnection = new ChRISConnection(config);

import { ChRISFileBrowser, BrowserType, BoolString } from "./chrisFileBrowser";
import { FileBrowserFolder } from "@fnndsc/chrisapi";
import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection";

class ChRISConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChRISConnectionError";
  }
}

class ChRISInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChRISInitializationError";
  }
}

type ChRISBrowser = ChRISFileBrowser | null;

export class ChRISinode {
  private _client: Client | null = null;
  private _fileBrowserFolderObj: FileBrowserFolder | null = null;
  private _path: string;
  private _browsers: Map<BrowserType, ChRISBrowser> = new Map();

  private constructor(path: string = "") {
    this._path = path;
    this._client = chrisConnection.getClient();
    if (!this._client) {
      throw new ChRISConnectionError("Could not access ChRIS. Have you connected with the 'connect' command?");
    }
  }

  public static async create(path: string = ""): Promise<ChRISinode> {
    const instance = new ChRISinode(path);
    await instance.initializeAndBind();
    return instance;
  }

  public get fileBrowser(): ChRISFileBrowser | null {
    return this.getBrowser(BrowserType.Files);
  }

  public get linkBrowser(): ChRISFileBrowser | null {
    return this.getBrowser(BrowserType.Links);
  }

  public get dirBrowser(): ChRISFileBrowser | null {
    return this.getBrowser(BrowserType.Dirs);
  }

  public get path(): string {
    return this._path;
  }

  public get fileBrowserFolder(): FileBrowserFolder | null {
    return this._fileBrowserFolderObj;
  }

  public getBrowser(type: BrowserType): ChRISBrowser {
    return this._browsers.get(type) ?? null;
  }

  public get client(): Client | null {
    return this._client;
  }

  private async initializeAndBind(): Promise<void> {
    if (!this._client) {
      throw new ChRISConnectionError("ChRIS client is not initialized");
    }

    try {
      this._fileBrowserFolderObj = await this._client.getFileBrowserFolderByPath(this._path);
    } catch (error) {
      throw new ChRISInitializationError('Failed to get FileBrowserFolder: ' + (error instanceof Error ? error.message : String(error)));
    }

    if (!this._fileBrowserFolderObj) {
      throw new ChRISInitializationError("Failed to initialize FileBrowserFolder");
    }

    this._browsers.set(BrowserType.Files, new ChRISFileBrowser(BrowserType.Files, this._fileBrowserFolderObj));
    this._browsers.set(BrowserType.Links, new ChRISFileBrowser(BrowserType.Links, this._fileBrowserFolderObj));
    this._browsers.set(BrowserType.Dirs, new ChRISFileBrowser(BrowserType.Dirs, this._fileBrowserFolderObj));

    for (const [_, browser] of this._browsers) {
      if (browser && !browser.bindOp.status) {
        throw new ChRISInitializationError(`Failed to bind browser: ${browser.bindOp.message}`);
      }
    }
  }
}

// This function is now replaced by the static factory method ChRISinode.create
// Keeping it here for backwards compatibility, but it can be removed if not needed
export async function ChRISinode_create(path?: string): Promise<ChRISinode | null> {
  try {
    return await ChRISinode.create(path);
  } catch (error) {
    console.error("Failed to create ChRISinode:", error);
    return null;
  }
}
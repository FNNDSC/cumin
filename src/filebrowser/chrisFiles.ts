/**
 * @file ChRIS Inode Management
 *
 * This module provides the ChRISinode class for managing inodes (files, directories, links)
 * within the ChRIS filesystem. It acts as a facade for different browser types.
 *
 * @module
 */

import { ChRISFileBrowser, BrowserType, BoolString } from "./chrisFileBrowser.js";
import { FileBrowserFolder } from "@fnndsc/chrisapi";
import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";

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

/**
 * Class representing an inode in the ChRIS filesystem.
 */
export class ChRISinode {
  private _client: Client | null = null;
  private _fileBrowserFolderObj: FileBrowserFolder | null = null;
  private _path: string;
  private _browsers: Map<BrowserType, ChRISBrowser> = new Map();

  private constructor(path: string = "") {
    this._path = path;
  }

  /**
   * Factory method to create a new ChRISinode instance.
   * @param path - The path to the inode.
   * @returns A Promise resolving to a new ChRISinode instance.
   */
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

  private async initializeAndBind(): Promise<void> {
    this._client = await chrisConnection.client_get();
    if (!this._client) {
      throw new ChRISConnectionError("Could not access ChRIS. Have you connected with the 'connect' command?");
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

/**
 * @deprecated Use ChRISinode.create instead.
 */
export async function ChRISinode_create(path?: string): Promise<ChRISinode | null> {
  try {
    return await ChRISinode.create(path);
  } catch (error) {
    console.error("Failed to create ChRISinode:", error);
    return null;
  }
}

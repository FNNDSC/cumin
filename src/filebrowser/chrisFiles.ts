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
  public static async inode_create(path: string = ""): Promise<ChRISinode> {
    const instance = new ChRISinode(path);
    await instance.initAndBind();
    return instance;
  }

  /**
   * Gets the file browser instance for this inode.
   * @returns The file browser or null.
   */
  public get fileBrowser_get(): ChRISFileBrowser | null {
    return this.browser_get(BrowserType.Files);
  }

  /**
   * Gets the link browser instance for this inode.
   * @returns The link browser or null.
   */
  public get linkBrowser_get(): ChRISFileBrowser | null {
    return this.browser_get(BrowserType.Links);
  }

  /**
   * Gets the directory browser instance for this inode.
   * @returns The directory browser or null.
   */
  public get dirBrowser_get(): ChRISFileBrowser | null {
    return this.browser_get(BrowserType.Dirs);
  }

  /**
   * Gets the path of this inode.
   * @returns The path string.
   */
  public get path_get(): string {
    return this._path;
  }

  /**
   * Gets the underlying FileBrowserFolder object.
   * @returns The FileBrowserFolder instance or null.
   */
  public get fileBrowserFolder_get(): FileBrowserFolder | null {
    return this._fileBrowserFolderObj;
  }

  /**
   * Retrieves a specific browser type for this inode.
   * @param type - The type of browser to retrieve.
   * @returns The requested browser or null.
   */
  public browser_get(type: BrowserType): ChRISBrowser {
    return this._browsers.get(type) ?? null;
  }

  /**
   * Initializes the inode and binds browsers.
   */
  private async initAndBind(): Promise<void> {
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
      if (browser && !browser.bindOp_get.status) {
        throw new ChRISInitializationError(`Failed to bind browser: ${browser.bindOp_get.message}`);
      }
    }
  }
}

/**
 * @deprecated Use ChRISinode.inode_create instead.
 */
export async function ChRISinode_create(path?: string): Promise<ChRISinode | null> {
  try {
    return await ChRISinode.inode_create(path);
  } catch (error) {
    console.error("Failed to create ChRISinode:", error);
    return null;
  }
}

/**
 * @file ChRIS File Browser
 *
 * This module provides the ChRISFileBrowser class for browsing files, directories, and links
 * within the ChRIS filesystem.
 *
 * @module
 */

import Client from "@fnndsc/chrisapi";
import { FileBrowserFolder } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";
import { ChRISResource } from "../resources/chrisResources.js";

/**
 * Interface for boolean operations with a descriptive message.
 */
export interface BoolString {
  status: boolean;
  message: string;
}

/**
 * Enum defining the types of ChRIS browsers.
 */
export enum BrowserType {
  Files = "Files",
  Links = "Links",
  Dirs = "Dirs",
};

/**
 * Class for browsing ChRIS filesystem objects.
 */
export class ChRISFileBrowser {
  private _client: Client | null = null;
  private _chrisFileBrowserFolder: FileBrowserFolder | null = null;
  private _resource: ChRISResource | null = null;
  private _bindOp: BoolString = {"status": false, "message": ""};

  constructor(variant: BrowserType = BrowserType.Files, chrisObj: FileBrowserFolder) {
    this._chrisFileBrowserFolder = chrisObj;
    this._resource = new ChRISResource();
    this._bindOp = this.method_bind(variant);
  }

  /**
   * Retrieves the ChRIS client instance asynchronously.
   * @returns A Promise resolving to the Client instance or null.
   */
  async client_get(): Promise<Client | null> {
    if (!this._client) {
      this._client = await chrisConnection.client_get();
    }
    return this._client;
  }

  /**
   * Gets the status of the binding operation.
   * @returns The binding operation status.
   */
  get bindOp_get(): BoolString {
    return this._bindOp;
  }

  /**
   * Binds the `getFiles` method to the ChRIS resource.
   * @returns The status of the binding operation.
   */
  files_bind(): BoolString {
    let bindOp: BoolString = { "status": false, "message": "getFiles not bound"};
    if (this._resource && this._chrisFileBrowserFolder) {
      this._resource.resource_bindGetMethodToObj(
        this._chrisFileBrowserFolder,
        this._chrisFileBrowserFolder.getFiles,
        BrowserType.Files
      );
      bindOp.status = true;
      bindOp.message = "ChRISFileBrowser bound to fileBrowserFolder.getFiles";
    }
    return bindOp;
  }

  /**
   * Binds the `getLinkFiles` method to the ChRIS resource.
   * @returns The status of the binding operation.
   */
  links_bind(): BoolString {
    let bindOp: BoolString = { "status": false, "message": "getLinks not bound"};
    if (this._resource && this._chrisFileBrowserFolder) {
      this._resource.resource_bindGetMethodToObj(
        this._chrisFileBrowserFolder,
        this._chrisFileBrowserFolder.getLinkFiles,
        BrowserType.Links
      );
      bindOp.status = true;
      bindOp.message = "ChRISFileBrowser bound to fileBrowserFolder.getLinkFiles";
    }
    return bindOp;
  }

  /**
   * Binds the `getChildren` (dirs) method to the ChRIS resource.
   * @returns The status of the binding operation.
   */
  dirs_bind(): BoolString {
    let bindOp: BoolString = { "status": false, "message": "getDirs not bound"};
    if (this._resource && this._chrisFileBrowserFolder) {
      this._resource.resource_bindGetMethodToObj(
        this._chrisFileBrowserFolder,
        this._chrisFileBrowserFolder.getChildren,
        BrowserType.Dirs
      );
      bindOp.status = true;
      bindOp.message = "ChRISFileBrowser bound to fileBrowserFolder.getChildren";
    }
    return bindOp;
  }

  /**
   * Binds the appropriate method based on the browser variant.
   * @param variant - The browser type (Files, Links, Dirs).
   * @returns The status of the binding operation.
   */
  method_bind(variant: BrowserType): BoolString {
    let bindOp: BoolString = { "status": false, "message": ""};
    if (!this._resource || !this._chrisFileBrowserFolder) {
      bindOp.message = "ChRISFileBrowesr resource or fileBrowserFolder is null";
      return bindOp;
    }
    bindOp.status = true;
    switch(variant) {
      case BrowserType.Files:
        bindOp = this.files_bind();
        break;
      case BrowserType.Links:
        bindOp = this.links_bind();
        break;
      case BrowserType.Dirs:
        bindOp = this.dirs_bind();
        break;
    }
    return bindOp;
  }

  /**
   * Gets the associated ChRIS resource.
   * @returns The ChRISResource instance or null.
   */
  get resource_get(): ChRISResource | null {
    return this._resource;
  }

  /**
   * Gets the underlying FileBrowserFolder object.
   * @returns The FileBrowserFolder instance or null.
   */
  get fileBrowserFolder_get(): FileBrowserFolder | null {
    return this._chrisFileBrowserFolder;
  }
}
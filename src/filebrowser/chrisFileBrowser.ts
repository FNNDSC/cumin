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

export interface BoolString {
  status: boolean;
  message: string;
}

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
    this._bindOp = this.getMethod_bind(variant);
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

  get bindOp(): BoolString {
    return this._bindOp;
  }

  getFiles_bind(): BoolString {
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

  getLinks_bind(): BoolString {
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

  getDirs_bind(): BoolString {
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

  getMethod_bind(variant: BrowserType): BoolString {
    let bindOp: BoolString = { "status": false, "message": ""};
    if (!this._resource || !this._chrisFileBrowserFolder) {
      bindOp.message = "ChRISFileBrowesr resource or fileBrowserFolder is null";
      return bindOp;
    }
    bindOp.status = true;
    switch(variant) {
      case BrowserType.Files:
        bindOp = this.getFiles_bind();
        break;
      case BrowserType.Links:
        bindOp = this.getLinks_bind();
        break;
      case BrowserType.Dirs:
        bindOp = this.getDirs_bind();
        break;
    }
    return bindOp;
  }

  get resource(): ChRISResource | null {
    return this._resource;
  }

  get chrisFileBrowserFolder(): FileBrowserFolder | null {
    return this._chrisFileBrowserFolder;
  }
}
import Client from "@fnndsc/chrisapi";
import { FileBrowserFolder } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection";
import { ChRISResource } from "../resources/chrisResources";

interface ParamOptions {
  limit: number;
  offset: number;
  name?: string;
  [key: string]: any;
}

export class ChRISFileBrowser {
  // private _client: Client | null;
  private _path: string;
  // private _chrisFileBrowserFolder: FileBrowserFolder | null = null;
  private _resource: ChRISResource | null = null;

  constructor(path?: string) {
    this._path = path || "";
    // this._client = chrisConnection.getClient();
    console.log("In ChRISFileBrowser, declaring new ChRISResource...");
    this._resource = new ChRISResource();
    chrisConnection.loggedIn_check();
    // this._chrisFileBrowserFolder = null;
  }

  get resource(): ChRISResource | null {
    return this._resource;
  }

  get client(): Client | null {
    if (this._resource) {
      return this._resource.client;
    } else {
      return null;
    }
  }

  get path(): string {
    return this._path;
  }

  set path(path: string) {
    this._path = path;
  }

  get chrisFileBrowser(): FileBrowserFolder | null {
    return this._resource?.resourceObj;
  }

  async initialize(): Promise<FileBrowserFolder | null> {
    console.log("In ChRISFileBrowser, starting to initialize...");
    if (this.client) {
      console.log("In ChRISFileBrowser, client OK... initialize...");
      try {
        if (this._resource) {
          this._resource.resourceObj =
            await this.client.getFileBrowserFolderByPath(this._path);
          console.log("files...", await this._resource.resourceObj.getFiles());
        }
        console.log("In ChRISFileBrowser, this._resource.resourceObj set!");
        console.log("In ChRISFileBrowser, initialize? ", this);
        return this._resource?.resourceObj;
      } catch (error) {
        console.error("Error initializing ChRISFileBrowser: ", error);
      }
    } else {
      console.error("this.client is null");
    }
    return null;
  }

  bindGetMethod(
    clientMethod?: (params: ParamOptions) => Promise<any>,
    resourceName?: string,
  ): boolean {
    let status: boolean = true;
    console.log("Entering bindGetMethod");
    console.log(this);
    if (!this._resource?.resourceObj) {
      return false;
    }
    console.log("Binding...");
    try {
      if (clientMethod) {
        this._resource?.resource_bindGetMethodToObj(
          this._resource,
          clientMethod,
        );
        console.log("Binding to passed method", clientMethod);
      } else {
        this._resource?.resource_bindGetMethodToObj(
          this._resource,
          this._resource.resourceObj.getFiles,
        );
        console.log("Binding to (default) FileBrowserFolder getFiles");
      }
      if (resourceName && this._resource) {
        this._resource.resourceName = resourceName;
      }
    } catch (error) {
      console.error("getBind method failure: ", error);
    }
    return status;
  }

  async initializeAndBind(): Promise<FileBrowserFolder | null> {
    const fileBrowserFolder: FileBrowserFolder | null = await this.initialize();
    if (!fileBrowserFolder) {
      return null;
    }
    const bindStatusOK = this.bindGetMethod();
    if (bindStatusOK) {
      return fileBrowserFolder;
    } else {
      return null;
    }
  }
}

export async function chrisFileBrowser_create(
  path: string = "",
): Promise<ChRISFileBrowser | null> {
  const browser = new ChRISFileBrowser(path);
  const goodBinding = await browser.initializeAndBind();
  if (goodBinding) {
    return browser;
  } else {
    return null;
  }
}

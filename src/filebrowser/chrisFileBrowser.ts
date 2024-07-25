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

export interface BoolString {
  status: boolean;
  message: string;
}

export enum BrowserType {
  Files = "Files",
  Links = "Links",
  Dirs = "Dirs",
};

export class ChRISFileBrowser {
  private _client: Client | null;
  private _chrisFileBrowserFolder: FileBrowserFolder | null = null;
  private _resource: ChRISResource | null = null;
  private _bindOp: BoolString = {"status": false, "message": ""};

  constructor(variant: BrowserType = BrowserType.Files, chrisObj: FileBrowserFolder) {
    this._client = chrisConnection.getClient();
    if(!this._client) {
      console.error("Could not access ChRIS. Have you connected with the 'connect' command?");
      process.exit(1);
    }
    this._chrisFileBrowserFolder = chrisObj;
    this._resource = new ChRISResource();
    this._bindOp = this.getMethod_bind(variant);
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

  get client(): Client | null {
    if (this._client) {
      return this._client;
    } else {
      return null;
    }
  }

  get chrisFileBrowserFolder(): FileBrowserFolder | null {
    return this._chrisFileBrowserFolder;
  }

  // async initialize(): Promise<FileBrowserFolder | null> {
  //   console.log("In ChRISFileBrowser, starting to initialize...");
  //   if (this.client) {
  //     console.log("In ChRISFileBrowser, client OK... initialize...");
  //     try {
  //       if (this._resource) {
  //         this._resource.resourceObj =
  //           await this.client.getFileBrowserFolderByPath(this._path);
  //         console.log("files...", await this._resource.resourceObj.getFiles());
  //       }
  //       console.log("In ChRISFileBrowser, this._resource.resourceObj set!");
  //       console.log("In ChRISFileBrowser, initialize? ", this);
  //       return this._resource?.resourceObj;
  //     } catch (error) {
  //       console.error("Error initializing ChRISFileBrowser: ", error);
  //     }
  //   } else {
  //     console.error("this.client is null");
  //   }
  //   return null;
  // }

  // bindGetMethod(
  //   clientMethod?: (params: ParamOptions) => Promise<any>,
  //   resourceName?: string,
  // ): boolean {
  //   let status: boolean = true;
  //   console.log("Entering bindGetMethod");
  //   console.log(this);
  //   if (!this._resource?.resourceObj) {
  //     return false;
  //   }
  //   console.log("Binding...");
  //   try {
  //     if (clientMethod) {
  //       this._resource?.resource_bindGetMethodToObj(
  //         this._resource,
  //         clientMethod,
  //       );
  //       console.log("Binding to passed method", clientMethod);
  //     } else {
  //       this._resource?.resource_bindGetMethodToObj(
  //         this._resource,
  //         this._resource.resourceObj.getFiles,
  //       );
  //       console.log("Binding to (default) FileBrowserFolder getFiles");
  //     }
  //     if (resourceName && this._resource) {
  //       this._resource.resourceName = resourceName;
  //     }
  //   } catch (error) {
  //     console.error("getBind method failure: ", error);
  //   }
  //   return status;
  // }

  // async initializeAndBind(): Promise<FileBrowserFolder | null> {
  //   const fileBrowserFolder: FileBrowserFolder | null = await this.initialize();
  //   if (!fileBrowserFolder) {
  //     return null;
  //   }
  //   const bindStatusOK = this.bindGetMethod();
  //   if (bindStatusOK) {
  //     return fileBrowserFolder;
  //   } else {
  //     return null;
  //   }
  // }
}

// export async function chrisFileBrowser_create(
//   path: string = "",
// ): Promise<ChRISFileBrowser | null> {
//   const browser = new ChRISFileBrowser(path);
//   const goodBinding = await browser.initializeAndBind();
//   if (goodBinding) {
//     return browser;
//   } else {
//     return null;
//   }
// }

import { ChRISFileBrowser, BrowserType, BoolString } from "./chrisFileBrowser";
import { ChrisInstance, FileBrowserFolder } from "@fnndsc/chrisapi";
import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection";

type BindableMethod = "getFiles" | "getLinkFiles" | "getChildren";

export class ChRISinode {
  private _client: Client | null = null;
  private _fileBrowser: ChRISFileBrowser | null = null;
  private _linkBrowser: ChRISFileBrowser | null = null;
  private _dirBrowser: ChRISFileBrowser | null = null;
  private _fileBrowserFolderObj: FileBrowserFolder | null = null;
  private _path: string  = "";

  get path(): string | null {
    return this._path;
  }

  get fileBrowserFolder(): FileBrowserFolder | null {
    return this._fileBrowserFolderObj;
  }

  constructor(path?: string) {
    this._path = path || "";
    this._client = chrisConnection.getClient();
    if(!this._client) {
      console.error("Could not access ChRIS. Have you connected with the 'connect' command?");
      process.exit(1);
    }
  }

  get fileBrowser(): ChRISFileBrowser | null {
    return this._fileBrowser;
  }

  get linkBrowser(): ChRISFileBrowser | null {
    return this._linkBrowser;
  }

  get dirBrowser(): ChRISFileBrowser | null {
    return this._dirBrowser;
  }

  get client(): Client | null {
    return this._client;
  }

  async initializeAndBind(): Promise<boolean> {
    let fileBind: BoolString;
    let linkBind: BoolString;
    let dirBind: BoolString;
    if (!this._client) {
      return false;
    }
    this._fileBrowserFolderObj = await this._client.getFileBrowserFolderByPath(this._path);
    if (!this._fileBrowserFolderObj) {
      return false;
    }
    this._fileBrowser = new ChRISFileBrowser(BrowserType.Files, this._fileBrowserFolderObj);
    this._linkBrowser = new ChRISFileBrowser(BrowserType.Links, this._fileBrowserFolderObj);
    this._dirBrowser = new ChRISFileBrowser(BrowserType.Dirs, this._fileBrowserFolderObj);
    fileBind = this._fileBrowser.getFiles_bind();
    linkBind = this._linkBrowser.getLinks_bind();
    dirBind = this._dirBrowser.getDirs_bind();
    return fileBind.status && linkBind.status && dirBind.status;
  }
}

export async function ChRISinode_create(path?: string): Promise<ChRISinode | null> {
  const chrisInode: ChRISinode = new ChRISinode(path);
  let initializeOK: boolean = await chrisInode.initializeAndBind();
  if(initializeOK) {
    return chrisInode;
  } 
  return null;
}

// export abstract class ChRISFilesBase<T extends BindableMethod> {
//   protected _inode: ChRISFileBrowser;

//   constructor(inode: ChRISFileBrowser) {
//     this._inode = inode;
//   }

//   async initialize(): Promise<FileBrowserFolder | null> {
//     return await this._inode.initialize();
//   }

//   bindGetMethod(): boolean {
//     const methodToBindName = this.getMethodToBind();
//     const methodToBind = this._inode.chrisFileBrowser?.[methodToBindName];
//     return this._inode.bindGetMethod(methodToBind, methodToBindName);
//   }

//   async initializeAndBind(): Promise<boolean> {
//     await this._inode.initialize();
//     return this.bindGetMethod();
//   }

//   get inode(): ChRISFileBrowser {
//     return this._inode;
//   }

//   protected abstract getMethodToBind(): T;

//   static async create<T extends ChRISFilesBase<BindableMethod>>(
//     this: new (inode: ChRISFileBrowser) => T,
//     path: string = "",
//   ): Promise<T | null> {
//     console.log("Creating new ChRISFileBrowser...");
//     const inode = await chrisFileBrowser_create(path);
//     if (inode) return new this(inode);
//     return null;
//   }
// }

// export class ChRISFilesGetFiles extends ChRISFilesBase<"getFiles"> {
//   protected getMethodToBind(): "getFiles" {
//     return "getFiles";
//   }
// }

// export class ChRISFilesGetLinkFiles extends ChRISFilesBase<"getLinkFiles"> {
//   protected getMethodToBind(): "getLinkFiles" {
//     return "getLinkFiles";
//   }
// }

// export class ChRISFilesGetChildren extends ChRISFilesBase<"getChildren"> {
//   protected getMethodToBind(): "getChildren" {
//     return "getChildren";
//   }
// }

// export async function createChrisFilesGetFiles(
//   path: string = "",
// ): Promise<ChRISFilesGetFiles | null> {
//   const instance = await ChRISFilesGetFiles.create(path);
//   if (instance) {
//     await instance.initializeAndBind();
//     return instance;
//   } else {
//     return null;
//   }
// }

// export async function createChrisFilesGetLinkFiles(
//   path: string = "",
// ): Promise<ChRISFilesGetLinkFiles | null> {
//   const instance = await ChRISFilesGetLinkFiles.create(path);
//   if (instance) {
//     await instance.initializeAndBind();
//     return instance;
//   } else {
//     return null;
//   }
// }

// export async function createChrisFilesGetChildren(
//   path: string = "",
// ): Promise<ChRISFilesGetChildren | null> {
//   const instance = await ChRISFilesGetChildren.create(path);
//   if (instance) {
//     await instance.initializeAndBind();
//     return instance;
//   } else {
//     return null;
//   }
// }

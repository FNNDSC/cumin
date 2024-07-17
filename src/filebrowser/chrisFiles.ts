import { ChRISFileBrowser, chrisFileBrowser_create } from "./chrisFileBrowser";
import { FileBrowserFolder } from "@fnndsc/chrisapi";

type BindableMethod = "getFiles" | "getLinkFiles" | "getChildren";

export abstract class ChRISFilesBase<T extends BindableMethod> {
  protected _inode: ChRISFileBrowser;

  constructor(inode: ChRISFileBrowser) {
    this._inode = inode;
  }

  async initialize(): Promise<FileBrowserFolder | null> {
    return await this._inode.initialize();
  }

  bindGetMethod(): boolean {
    const methodToBindName = this.getMethodToBind();
    const methodToBind = this._inode.chrisFileBrowser?.[methodToBindName];
    return this._inode.bindGetMethod(methodToBind, methodToBindName);
  }

  async initializeAndBind(): Promise<boolean> {
    await this._inode.initialize();
    return this.bindGetMethod();
  }

  get inode(): ChRISFileBrowser {
    return this._inode;
  }

  protected abstract getMethodToBind(): T;

  static async create<T extends ChRISFilesBase<BindableMethod>>(
    this: new (inode: ChRISFileBrowser) => T,
    path: string = "",
  ): Promise<T | null> {
    console.log("Creating new ChRISFileBrowser...");
    const inode = await chrisFileBrowser_create(path);
    if (inode) return new this(inode);
    return null;
  }
}

export class ChRISFilesGetFiles extends ChRISFilesBase<"getFiles"> {
  protected getMethodToBind(): "getFiles" {
    return "getFiles";
  }
}

export class ChRISFilesGetLinkFiles extends ChRISFilesBase<"getLinkFiles"> {
  protected getMethodToBind(): "getLinkFiles" {
    return "getLinkFiles";
  }
}

export class ChRISFilesGetChildren extends ChRISFilesBase<"getChildren"> {
  protected getMethodToBind(): "getChildren" {
    return "getChildren";
  }
}

export async function createChrisFilesGetFiles(
  path: string = "",
): Promise<ChRISFilesGetFiles | null> {
  const instance = await ChRISFilesGetFiles.create(path);
  if (instance) {
    await instance.initializeAndBind();
    return instance;
  } else {
    return null;
  }
}

export async function createChrisFilesGetLinkFiles(
  path: string = "",
): Promise<ChRISFilesGetLinkFiles | null> {
  const instance = await ChRISFilesGetLinkFiles.create(path);
  if (instance) {
    await instance.initializeAndBind();
    return instance;
  } else {
    return null;
  }
}

export async function createChrisFilesGetChildren(
  path: string = "",
): Promise<ChRISFilesGetChildren | null> {
  const instance = await ChRISFilesGetChildren.create(path);
  if (instance) {
    await instance.initializeAndBind();
    return instance;
  } else {
    return null;
  }
}

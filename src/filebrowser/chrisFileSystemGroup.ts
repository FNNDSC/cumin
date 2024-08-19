import { ChRISResourceGroup } from "../resources/chrisResourceGroup";
import { FileBrowserFolder } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection";
import Client from "@fnndsc/chrisapi";

export class ChRISConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChRISConnectionError";
  }
}

export class ChRISInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChRISInitializationError";
  }
}

export abstract class ChRISFileSystemGroup extends ChRISResourceGroup {
  protected _path: string;
  protected _fileBrowserFolderObj: FileBrowserFolder | null = null;

  protected constructor(
    resourceName: string,
    getMethod: string,
    fileBrowserFolder: FileBrowserFolder,
    path: string
  ) {
    super(resourceName, getMethod, fileBrowserFolder);
    this._path = path;
    this._fileBrowserFolderObj = fileBrowserFolder;
  }

  protected static async initializeFileBrowserFolder(
    path: string
  ): Promise<FileBrowserFolder> {
    const client: Client | null = chrisConnection.getClient();
    if (!client) {
      throw new ChRISConnectionError("ChRIS client is not initialized");
    }

    let fileBrowserFolder: FileBrowserFolder | null;
    try {
      fileBrowserFolder = await client.getFileBrowserFolderByPath(path);
    } catch (error) {
      throw new ChRISInitializationError(
        "Failed to get FileBrowserFolder: " +
          (error instanceof Error ? error.message : String(error))
      );
    }

    if (!fileBrowserFolder) {
      throw new ChRISInitializationError(
        "Failed to initialize FileBrowserFolder"
      );
    }

    return fileBrowserFolder;
  }

  get path(): string {
    return this._path;
  }

  public get fileBrowserFolderObj(): FileBrowserFolder | null {
    return this._fileBrowserFolderObj;
  }
}

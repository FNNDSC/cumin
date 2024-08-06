import { ChRISResourceGroup } from "../resources/chrisResourceGroup";
import { FileBrowserFolder } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection";
import Client from "@fnndsc/chrisapi";

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

export class ChRISFilesGroup extends ChRISResourceGroup {
  private _fileBrowserFolderObj: FileBrowserFolder | null = null;
  private _path: string;

  private constructor(fileBrowserFolder: FileBrowserFolder, path: string) {
    super("Files", "getFiles", fileBrowserFolder);
    this._path = path;
  }

  static async create(path: string): Promise<ChRISFilesGroup> {
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

    return new ChRISFilesGroup(fileBrowserFolder, path);
  }

  private async initializeAndBind(): Promise<void> {
    if (!this._client) {
      throw new ChRISConnectionError("ChRIS client is not initialized");
    }

    try {
      this._fileBrowserFolderObj =
        await this._client.getFileBrowserFolderByPath(this._path);
    } catch (error) {
      throw new ChRISInitializationError(
        "Failed to get FileBrowserFolder: " +
          (error instanceof Error ? error.message : String(error))
      );
    }

    if (!this._fileBrowserFolderObj) {
      throw new ChRISInitializationError(
        "Failed to initialize FileBrowserFolder"
      );
    }
  }
}

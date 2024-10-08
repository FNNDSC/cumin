import { sessionConfig, readFile, ConnectionConfig } from "../config/config";
import { chrisConnection } from "../connect/chrisConnection";
import Client, { FileBrowserFolder, UserFile } from "@fnndsc/chrisapi";
import fs from "fs";
import path from "path";
import { errorStack } from "../error/errorStack";

export class ChrisIO {
  private _chrisFolder: string = "";
  private _client: Client | null;

  constructor() {
    this._client = chrisConnection.getClient();
  }

  get chrisFolder(): string {
    return this._chrisFolder;
  }

  set chrisFolder(folder: string) {
    this._chrisFolder = folder;
  }

  get client(): Client | null {
    return this._client;
  }

  async initialize(): Promise<boolean | null> {
    if (!this.client) {
      return null;
    }
    try {
      const fileBrowserFolder: FileBrowserFolder =
        await this.client.createFileBrowserFolder({ path: this.chrisFolder });
      return true;
    } catch (error: unknown) {
      errorStack.push(
        "error",
        `Failed to create FileBrowserFolder: 
        ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  private isArrayBuffer(obj: any): obj is ArrayBuffer {
    return (
      obj instanceof ArrayBuffer ||
      (typeof obj === "object" && obj.byteLength !== undefined)
    );
  }

  async file_download(fileId: number): Promise<Buffer | null> {
    if (!this.client) {
      console.error("ChRIS client is not initialized");
      return null;
    }

    try {
      const userFile: UserFile | null = await this.client.getUserFile(fileId);

      if (!userFile) {
        throw new Error(`Failed to get file with ID ${fileId}`);
      }

      const blob: unknown = await userFile.getFileBlob();

      if (typeof blob === "string") {
        return Buffer.from(blob);
      } else if (blob instanceof ArrayBuffer) {
        return Buffer.from(blob);
      } else if (blob instanceof Blob) {
        const arrayBuffer = await blob.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } else {
        throw new Error(`Unexpected blob type: ${typeof blob}`);
      }
    } catch (error: unknown) {
      errorStack.push(
        "error",
        `Failed to download file with ID ${fileId}: 
        ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  async file_upload(fileBlob: Blob, chrisPath: string): Promise<boolean> {
    if (!this.client) {
      console.error("ChRIS client is not initialized");
      return false;
    }

    try {
      const data: { upload_path: string } = {
        upload_path: chrisPath,
      };

      const uploadFileObj: { fname: any } = { fname: fileBlob };

      await this.client.uploadFile(data, uploadFileObj);
      return true;
    } catch (error: unknown) {
      errorStack.push(
        "error",
        `Failed to upload file ${chrisPath}:
        ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  async dummy_upload(): Promise<boolean | null> {
    if (!this.client) {
      return null;
    }
    const data: { upload_path: string } = {
      upload_path: this.chrisFolder,
    };

    const fileContent: string = "This is a test file";
    const fileData: string = JSON.stringify(fileContent);
    const uploadFileBlob: Blob = new Blob([fileData], {
      type: "application/json",
    });
    const uploadFileObj: { fname: Blob } = { fname: uploadFileBlob };

    const result: any = await this.client.uploadFile(data, uploadFileObj);
    return true;
  }
}

export const chrisIO: ChrisIO = new ChrisIO();

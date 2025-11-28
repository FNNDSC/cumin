/**
 * @file ChRIS IO Operations
 *
 * This module handles file input/output operations with the ChRIS backend,
 * including downloading and uploading files.
 *
 * @module
 */

import { chrisConnection } from "../connect/chrisConnection.js";
import Client, { FileBrowserFolder, UserFile } from "@fnndsc/chrisapi";
import { errorStack } from "../error/errorStack.js";
import { IStorageProvider } from "./io.js";

/**
 * Class for handling IO operations with ChRIS.
 */
export class ChrisIO {
  private _chrisFolder: string = "";
  private _client: Client | null = null;
  private storageProvider: IStorageProvider | null = null;

  constructor() {
    // Client initialization is deferred or handled via async accessor
  }

  /**
   * Sets the storage provider for local IO operations.
   * @param provider - The storage provider instance.
   */
  storageProvider_set(provider: IStorageProvider): void {
    this.storageProvider = provider;
  }

  /**
   * Gets the ChRIS client instance, initializing it if necessary.
   * @returns A Promise resolving to the Client instance or null.
   */
  async client_get(): Promise<Client | null> {
    if (!this._client) {
      this._client = await chrisConnection.client_get();
    }
    return this._client;
  }

  get chrisFolder(): string {
    return this._chrisFolder;
  }

  set chrisFolder(folder: string) {
    this._chrisFolder = folder;
  }

  /**
   * Initializes the ChrisIO instance by creating a file browser folder.
   * @returns A Promise resolving to true on success, false on failure, or null if client is missing.
   */
  async init(): Promise<boolean | null> {
    const client = await this.client_get();
    if (!client) {
      return null;
    }
    try {
      const fileBrowserFolder: FileBrowserFolder =
        await client.createFileBrowserFolder({ path: this.chrisFolder });
      return true;
    } catch (error: unknown) {
      errorStack.stack_push(
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

  /**
   * Downloads a file from ChRIS by its ID.
   * @param fileId - The ID of the file to download.
   * @returns A Promise resolving to a Buffer of the file content, or null on failure.
   */
  async file_download(fileId: number): Promise<Buffer | null> {
    const client = await this.client_get();
    if (!client) {
      console.error("ChRIS client is not initialized");
      return null;
    }

    try {
      const userFile: UserFile | null = await client.getUserFile(fileId);

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
      errorStack.stack_push(
        "error",
        `Failed to download file with ID ${fileId}: 
        ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Uploads a file to ChRIS.
   * @param fileBlob - The file content as a Blob.
   * @param uploadDir - The directory path in ChRIS to upload to.
   * @param filename - The name of the file to create.
   * @returns A Promise resolving to true on success, false on failure.
   */
  async file_upload(fileBlob: Blob, uploadDir: string, filename: string): Promise<boolean> {
    const client = await this.client_get();
    if (!client) {
      console.error("ChRIS client is not initialized");
      return false;
    }

    try {
      const data: { upload_path: string } = {
        upload_path: uploadDir,
      };

      let fileObj: Blob | File = fileBlob;
      if (typeof File !== 'undefined') {
        fileObj = new File([fileBlob], filename);
      }

      const uploadFileObj: { fname: Blob | File } = { fname: fileObj };

      await client.uploadFile(data, uploadFileObj);
      return true;
    } catch (error: unknown) {
      errorStack.stack_push(
        "error",
        `Failed to upload file ${filename} to ${uploadDir}:
        ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Uploads a local directory or file to ChRIS recursively.
   * @param localPath - The path on the local filesystem.
   * @param remotePath - The full destination path on ChRIS (including filename if it's a file).
   *                     If uploading a dir, this is the directory name on ChRIS.
   * @returns Promise<boolean> success status.
   */
  async uploadLocalPath(localPath: string, remotePath: string): Promise<boolean> {
    if (!this.storageProvider) {
      errorStack.stack_push("error", "Storage provider not configured in ChrisIO.");
      return false;
    }

    try {
      const isDir: boolean = await this.storageProvider.isDirectory(localPath);

      if (isDir) {
        const entries: string[] = await this.storageProvider.readdir(localPath);
        let success = true;

        for (const entry of entries) {
          const childLocal: string = this.storageProvider.join(localPath, entry);
          const childRemote: string = remotePath.endsWith('/') 
             ? remotePath + entry 
             : remotePath + '/' + entry;
             
          const result: boolean = await this.uploadLocalPath(childLocal, childRemote);
          if (!result) success = false;
        }
        return success;
      } else {
        // It's a file
        const content: ArrayBuffer | null = await this.storageProvider.readBinary(localPath);
        if (!content) {
           errorStack.stack_push("error", `Failed to read local file: ${localPath}`);
           return false; 
        }
        
        const blob = new Blob([content]);
        
        // Split remotePath into dir and filename
        // We need a reliable way to split paths. 
        // Since remote path is ChRIS path (Unix-like), we split by last '/'
        const lastSlashIndex = remotePath.lastIndexOf('/');
        let dir = "";
        let name = remotePath;
        if (lastSlashIndex !== -1) {
          dir = remotePath.substring(0, lastSlashIndex);
          name = remotePath.substring(lastSlashIndex + 1);
        }
        
        // If dir is empty, it implies root or relative? ChRIS paths usually absolute.
        // If remotePath was just "filename", dir is empty.
        // API requires absolute path usually.
        
        if (!dir) dir = "/"; // Default to root if no dir specified? Or error?
        
        return await this.file_upload(blob, dir, name);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errorStack.stack_push("error", `Recursive upload failed for ${localPath}: ${msg}`);
      return false;
    }
  }

  /**
   * Performs a dummy upload for testing purposes.
   * @returns A Promise resolving to true on success, or null if client is missing.
   */
  async dummy_upload(): Promise<boolean | null> {
    const client = await this.client_get();
    if (!client) {
      return null;
    }
    
    // dummy_upload is deprecated/test logic, fixing for compilation
    const data: { upload_path: string } = {
      upload_path: this.chrisFolder,
    };

    const fileContent: string = "This is a test file";
    const fileData: string = JSON.stringify(fileContent);
    const uploadFileBlob: Blob = new Blob([fileData], {
      type: "application/json",
    });
    const filename = "dummy.json";
    
    return await this.file_upload(uploadFileBlob, this.chrisFolder, filename);
  }
}

/**
 * Global ChRIS IO instance.
 */
export const chrisIO: ChrisIO = new ChrisIO();

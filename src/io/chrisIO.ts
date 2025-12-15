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
import { Err, Ok, Result } from "../utils/result.js";

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
   * Downloads a file from ChRIS by its ID as a stream (Node) or blob (browser).
   * Returns the raw response data plus optional size metadata when available.
   *
   * @param fileId - The ID of the file to download.
   * @returns A Result containing the stream/blob and optional size metadata.
   */
  async file_downloadStream(
    fileId: number
  ): Promise<Result<{ stream: any; size?: number; filename?: string }>> {
    const client: Client | null = await this.client_get();
    if (!client) {
      errorStack.stack_push("error", "ChRIS client is not initialized");
      return Err();
    }

    try {
      const userFile: UserFile | null = await client.getUserFile(fileId);

      if (!userFile) {
        errorStack.stack_push(
          "error",
          `File ID ${fileId} not found (404) or access denied (403).`
        );
        return Err();
      }

      const response: any = await (userFile as any).getFileStream();
      if (!response || response.data === undefined) {
        errorStack.stack_push("error", `File ID ${fileId} returned no data.`);
        return Err();
      }

      const lengthHeader: string | undefined | number =
        response.headers?.["content-length"] ||
        response.headers?.["Content-Length"];
      const size: number | undefined =
        typeof lengthHeader === "string" ? parseInt(lengthHeader, 10) : undefined;

      return Ok({
        stream: response.data,
        size: Number.isFinite(size) ? size : undefined,
        filename: (userFile as any).data?.fname as string | undefined,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errorStack.stack_push(
        "error",
        `Download stream failed for file ${fileId}: ${msg}`
      );
      return Err();
    }
  }

  /**
   * Downloads a file from ChRIS by its ID.
   * @param fileId - The ID of the file to download.
   * @returns A Promise resolving to a Buffer of the file content, or null on failure.
   */
  async file_download(fileId: number): Promise<Buffer | null> {
    const client = await this.client_get();
    if (!client) {
      errorStack.stack_push("error", "ChRIS client is not initialized");
      return null;
    }

    try {
      const userFile: UserFile | null = await client.getUserFile(fileId);

      if (!userFile) {
        // This is a common case: the file ID was scraped from a listing, but
        // the file itself is not retrievable (e.g. 404, or permissions)
        errorStack.stack_push("error", `File ID ${fileId} not found (404) or access denied (403).`);
        return null;
      }

      const blob: unknown = await userFile.getFileBlob();
      
      if (!blob) {
         errorStack.stack_push("error", `File ID ${fileId} exists but returned no content/blob.`);
         return null;
      }

      if (typeof blob === "string") {
        return Buffer.from(blob);
      } else if (Buffer.isBuffer(blob)) {
        // Already a Node.js Buffer
        return blob;
      } else if (blob instanceof ArrayBuffer) {
        return Buffer.from(blob);
      } else if (blob instanceof Blob) {
        const arrayBuffer = await blob.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } else {
        throw new Error(`Unexpected blob type: ${typeof blob}`);
      }
    } catch (error: unknown) {
      // Catch network errors, timeouts, or specific API error messages
      const msg = error instanceof Error ? error.message : String(error);
      errorStack.stack_push(
        "error",
        `Download failed for file ${fileId}: ${msg}`
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
      // ChRIS API expects paths WITHOUT leading slash
      // upload_path should be the FULL PATH including filename
      const normalizedUploadDir = uploadDir.startsWith('/') ? uploadDir.substring(1) : uploadDir;
      const fullPath = normalizedUploadDir.endsWith('/')
        ? normalizedUploadDir + filename
        : normalizedUploadDir + '/' + filename;

      const data: { upload_path: string } = {
        upload_path: fullPath,
      };

      let fileObj: Blob | File = fileBlob;
      if (typeof File !== 'undefined') {
        fileObj = new File([fileBlob], filename);
      }

      const uploadFileObj: { fname: Blob | File } = { fname: fileObj };

      const uploadPromise = client.uploadFile(data, uploadFileObj);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Upload timeout after 30s')), 30000)
      );

      await Promise.race([uploadPromise, timeoutPromise]);

      return true;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errorStack.stack_push(
        "error",
        `Failed to upload file ${filename} to ${uploadDir}: ${errorMsg}`
      );
      return false;
    }
  }

  /**
   * Creates a new folder in ChRIS at the specified path.
   *
   * @param folderPath - The path where the folder should be created.
   * @returns A Result containing true if created, false if already exists, or Err on error.
   *
   * @example
   * ```typescript
   * const result = await chrisIO.folder_create('/uploads/data');
   * if (result.ok && result.value) {
   *   console.log('Folder created successfully');
   * }
   * ```
   */
  async folder_create(folderPath: string): Promise<Result<boolean>> {
    const client: Client | null = await this.client_get();
    if (!client) {
      errorStack.stack_push("error", "ChRIS client is not initialized");
      return Err();
    }

    try {
      // Get the FileBrowserFolderList resource
      const folderList = await client.getFileBrowserFolders();

      // Use the post method to create the new folder
      const response = await folderList.post({ path: folderPath });

      if (response && response.data) {
        return Ok(true); // Folder created successfully
      } else {
        errorStack.stack_push("error", `Failed to create folder: ${folderPath}. No data in response.`);
        return Err();
      }
    } catch (error: unknown) {
      // Check if this is an "already exists" error (400 status with specific message)
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        error.response.status === 400 &&
        'data' in error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'path' in error.response.data &&
        Array.isArray(error.response.data.path) &&
        error.response.data.path[0] &&
        typeof error.response.data.path[0] === 'string' &&
        error.response.data.path[0].includes('already exists')
      ) {
        errorStack.stack_push("warning", `Folder '${folderPath}' already exists.`);
        return Ok(false); // Return false to indicate folder already existed
      }

      // Other errors
      const errorMessage: string = error instanceof Error ? error.message : String(error);
      errorStack.stack_push("error", `Error creating folder '${folderPath}': ${errorMessage}`);
      return Err();
    }
  }

  /**
   * Moves (renames) a folder in ChRIS by updating its path.
   * @param srcPath - The current folder path.
   * @param destPath - The new folder path.
   * @returns Promise resolving to true on success, false on failure.
   */
  async folder_moveByPath(srcPath: string, destPath: string): Promise<Result<boolean>> {
    const client: Client | null = await this.client_get();
    if (!client) {
      errorStack.stack_push("error", "ChRIS client is not initialized");
      return Err<boolean>();
    }

    try {
      const folder: FileBrowserFolder | null = await client.getFileBrowserFolderByPath(srcPath);
      if (!folder) {
        errorStack.stack_push("error", `Folder not found: ${srcPath}`);
        return Err<boolean>();
      }
      // chrisapi typings omit the path field, but API supports it for renames
      await (folder as unknown as { put(body: Record<string, unknown>): Promise<unknown> }).put({ path: destPath });
      return Ok(true);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errorStack.stack_push("error", `Failed to move folder ${srcPath} to ${destPath}: ${errorMsg}`);
      return Err<boolean>();
    }
  }

  /**
   * Moves (renames) a file in ChRIS by updating its path.
   * @param fileId - The file ID.
   * @param destPath - The target path including filename.
   * @returns Promise resolving to true on success, false on failure.
   */
  async file_moveById(fileId: number, destPath: string): Promise<Result<boolean>> {
    const client: Client | null = await this.client_get();
    if (!client) {
      errorStack.stack_push("error", "ChRIS client is not initialized");
      return Err<boolean>();
    }

    try {
      const userFile: UserFile | null = await client.getUserFile(fileId);
      if (!userFile) {
        errorStack.stack_push("error", `File not found with ID ${fileId}`);
        return Err<boolean>();
      }
      // chrisapi typings omit the path field, but API supports it for renames
      await (userFile as unknown as { put(body: Record<string, unknown>): Promise<unknown> }).put({ path: destPath });
      return Ok(true);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errorStack.stack_push("error", `Failed to move file ID ${fileId} to ${destPath}: ${errorMsg}`);
      return Err<boolean>();
    }
  }

  /**
   * Uploads a local directory or file to ChRIS recursively.
   * @param localPath - The path on the local filesystem.
   * @param remotePath - The destination path on ChRIS. For directories, follows Unix cp semantics:
   *                     the source directory name is appended to remotePath.
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
        // For directories, follow Unix cp semantics: append source dir basename to target
        // e.g., upload ~/test-upload /home/user -> /home/user/test-upload/
        const dirBasename: string = this.storageProvider.basename(localPath);
        const targetDir: string = remotePath.endsWith('/')
          ? remotePath + dirBasename
          : remotePath + '/' + dirBasename;

        const entries: string[] = await this.storageProvider.readdir(localPath);
        let success = true;

        for (const entry of entries) {
          const childLocal: string = this.storageProvider.join(localPath, entry);
          const childRemote: string = targetDir.endsWith('/')
             ? targetDir + entry
             : targetDir + '/' + entry;

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
        // Since remote path is ChRIS path (Unix-like), we split by last '/'
        const lastSlashIndex = remotePath.lastIndexOf('/');
        let dir = "";
        let name = remotePath;
        if (lastSlashIndex !== -1) {
          dir = remotePath.substring(0, lastSlashIndex);
          name = remotePath.substring(lastSlashIndex + 1);
        }

        // If dir is empty, use root
        if (!dir) dir = "/";

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

import { IStorageProvider } from "./io.js";

/**
 * An in-memory, non-persisting storage provider suitable for browser environments
 * where persistence is managed by the host application (GUI).
 *
 * This provider satisfies the `IStorageProvider` interface but does not
 * store any data persistently. All data is held in-memory and reset
 * when the application (e.g., browser tab) is refreshed.
 *
 * It effectively acts as a dummy or passthrough for storage operations,
 * relying on the external environment to provide necessary context.
 */
export class BrowserStorageProvider implements IStorageProvider {
  // A simple in-memory store for demonstration/testing purposes
  private store: Map<string, string> = new Map();

  constructor() {
    console.log("BrowserStorageProvider initialized (in-memory, non-persisting).");
  }

  /**
   * Reads data associated with a path from the in-memory store.
   *
   * @param path - The virtual path of the data.
   * @returns A Promise resolving to the data string or null if not found.
   */
  async read(path: string): Promise<string | null> {
    const data = this.store.get(path);
    return data === undefined ? null : data;
  }

  /**
   * Reads binary data associated with a path.
   *
   * @param path - The virtual path.
   * @returns A Promise resolving to ArrayBuffer or null.
   */
  async readBinary(path: string): Promise<ArrayBuffer | null> {
    console.warn("[BrowserStorageProvider] readBinary not implemented for in-memory store.");
    return null;
  }

  /**
   * Writes data to the in-memory store associated with a path.
   *
   * @param path - The virtual path to write to.
   * @param data - The string data to write.
   * @returns A Promise that resolves when the operation is complete.
   */
  async write(path: string, data: string): Promise<void> {
    this.store.set(path, data);
    console.debug(`[BrowserStorageProvider] Wrote to: ${path}`);
  }

  /**
   * Removes data associated with a path from the in-memory store.
   *
   * @param path - The virtual path to remove.
   * @returns A Promise that resolves when the operation is complete.
   */
  async remove(path: string): Promise<void> {
    this.store.delete(path);
    console.debug(`[BrowserStorageProvider] Removed: ${path}`);
  }

  /**
   * Creates a "directory" in the in-memory store.
   * For this non-persisting provider, this is a no-op as directories are not physically managed.
   *
   * @param path - The virtual path of the directory.
   * @param options - Optional recursive creation (ignored).
   * @returns A Promise that resolves when the operation is complete.
   */
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    // No-op for a non-persisting in-memory store
    console.debug(`[BrowserStorageProvider] mkdir (no-op): ${path}`);
  }

  /**
   * Checks if a path exists in the in-memory store.
   *
   * @param path - The virtual path to check.
   * @returns A Promise resolving to true if the path exists, false otherwise.
   */
  async exists(path: string): Promise<boolean> {
    return this.store.has(path);
  }

  /**
   * Reads the contents of a "directory" in the in-memory store.
   * For this non-persisting provider, it simulates by returning keys that start with the path prefix.
   * This is a simplified simulation and does not represent a true filesystem.
   *
   * @param path - The virtual path of the directory.
   * @returns A Promise resolving to an array of file/directory names within the path.
   */
  async readdir(path: string): Promise<string[]> {
    const prefixedPath = path.endsWith('/') ? path : `${path}/`;
    const entries: string[] = [];
    for (const key of this.store.keys()) {
        if (key.startsWith(prefixedPath)) {
            let relativePath = key.substring(prefixedPath.length);
            // Only add the immediate child part
            const firstSlashIndex = relativePath.indexOf('/');
            if (firstSlashIndex !== -1) {
                relativePath = relativePath.substring(0, firstSlashIndex);
            }
            if (!entries.includes(relativePath)) {
                entries.push(relativePath);
            }
        }
    }
    return entries;
  }

  /**
   * Checks if a path represents a "directory" in the in-memory store.
   * For this non-persisting provider, it checks if any keys start with the path as a prefix.
   *
   * @param path - The virtual path to check.
   * @returns A Promise resolving to true if it appears to be a directory, false otherwise.
   */
  async isDirectory(path: string): Promise<boolean> {
    const prefixedPath = path.endsWith('/') ? path : `${path}/`;
    for (const key of this.store.keys()) {
        if (key.startsWith(prefixedPath)) {
            return true;
        }
    }
    return false;
  }

  /**
   * Joins path segments.
   * @param paths - The path segments.
   * @returns Joined path.
   */
  join(...paths: string[]): string {
    return paths.join('/');
  }

  /**
   * Returns the last portion of a path.
   * @param path - The path to extract the basename from.
   * @returns The basename.
   */
  basename(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || '';
  }
}

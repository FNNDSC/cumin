/**
 * @file Node.js implementation of the Storage Provider interface.
 *
 * This module provides a concrete implementation of `IStorageProvider` using
 * Node.js's native `fs` module. It handles file system operations such as
 * reading, writing, listing directories, and checking file existence.
 *
 * @module
 */

import { IStorageProvider } from "./io.js";
import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Type guard for Node.js filesystem errors.
 */
function nodeError_is(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * NodeStorageProvider implements IStorageProvider using Node.js's native 'fs' module.
 * It handles file system operations for reading, writing, and removing files,
 * and creating directories.
 */
export class NodeStorageProvider implements IStorageProvider {
  private resolvePath(filepath: string): string {
    if (filepath.startsWith("~")) {
      return path.join(os.homedir(), filepath.slice(1));
    }
    return filepath;
  }

  async read(filepath: string): Promise<string | null> {
    const resolvedPath = this.resolvePath(filepath);
    try {
      if (await this.exists(resolvedPath)) {
        return await fs.readFile(resolvedPath, "utf-8");
      }
      return null;
    } catch (error: unknown) {
      if (nodeError_is(error) && error.code === "ENOENT") {
        return null; // File not found is not an error for read
      }
      const message = nodeError_is(error) ? error.message : String(error);
      throw new Error(`Failed to read file ${resolvedPath}: ${message}`);
    }
  }

  async readBinary(filepath: string): Promise<ArrayBuffer | null> {
    const resolvedPath = this.resolvePath(filepath);
    try {
      if (await this.exists(resolvedPath)) {
        const buffer = await fs.readFile(resolvedPath);
        // Convert Buffer to ArrayBuffer
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      }
      return null;
    } catch (error: unknown) {
      if (nodeError_is(error) && error.code === "ENOENT") {
        return null;
      }
      const message = nodeError_is(error) ? error.message : String(error);
      throw new Error(`Failed to read binary file ${resolvedPath}: ${message}`);
    }
  }

  async write(filepath: string, data: string): Promise<void> {
    const resolvedPath = this.resolvePath(filepath);
    const dir = path.dirname(resolvedPath);
    await this.mkdir(dir, { recursive: true });
    try {
      await fs.writeFile(resolvedPath, data, "utf-8");
    } catch (error: unknown) {
      const message = nodeError_is(error) ? error.message : String(error);
      throw new Error(`Failed to write file ${resolvedPath}: ${message}`);
    }
  }

  async remove(filepath: string): Promise<void> {
    const resolvedPath = this.resolvePath(filepath);
    try {
      if (await this.exists(resolvedPath)) {
        await fs.unlink(resolvedPath);
      }
    } catch (error: unknown) {
      const message = nodeError_is(error) ? error.message : String(error);
      throw new Error(
        `Failed to remove file ${resolvedPath}: ${message}`
      );
    }
  }

  async mkdir(filepath: string, options?: { recursive?: boolean }): Promise<void> {
    const resolvedPath = this.resolvePath(filepath);
    try {
      await fs.mkdir(resolvedPath, options);
    } catch (error: unknown) {
      if (!nodeError_is(error) || error.code !== "EEXIST") {
        const message = nodeError_is(error) ? error.message : String(error);
        throw new Error(
          `Failed to create directory ${resolvedPath}: ${message}`
        );
      }
    }
  }

  async exists(filepath: string): Promise<boolean> {
    const resolvedPath = this.resolvePath(filepath);
    try {
      await fs.access(resolvedPath);
      return true;
    } catch (error: unknown) {
      if (nodeError_is(error) && error.code === "ENOENT") {
        return false;
      }
      const message = nodeError_is(error) ? error.message : String(error);
      throw new Error(
        `Failed to check existence of ${resolvedPath}: ${message}`
      );
    }
  }

  async readdir(filepath: string): Promise<string[]> {
    const resolvedPath = this.resolvePath(filepath);
    try {
      return await fs.readdir(resolvedPath);
    } catch (error: unknown) {
      if (nodeError_is(error) && error.code === "ENOENT") {
        return [];
      }
      const message = nodeError_is(error) ? error.message : String(error);
      throw new Error(
        `Failed to read directory ${resolvedPath}: ${message}`
      );
    }
  }

  async isDirectory(filepath: string): Promise<boolean> {
    const resolvedPath = this.resolvePath(filepath);
    try {
      const stats = await fs.stat(resolvedPath);
      return stats.isDirectory();
    } catch (error: unknown) {
      if (nodeError_is(error) && error.code === "ENOENT") {
        return false;
      }
      const message = nodeError_is(error) ? error.message : String(error);
      throw new Error(
        `Failed to check if directory ${resolvedPath}: ${message}`
      );
    }
  }

  join(...paths: string[]): string {
    return path.join(...paths);
  }

  basename(filepath: string): string {
    return path.basename(filepath);
  }
}
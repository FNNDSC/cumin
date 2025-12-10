/**
 * @file ChRIS Pipeline Source File Operations
 *
 * This module provides functions for retrieving pipeline source files (YAML configuration files)
 * from the ChRIS backend. Pipeline files are stored under /PIPELINES/<owner>/<filename>.
 *
 * @module
 */

import Client, { PipelineSourceFile, PipelineSourceFileList } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";
import { errorStack } from "../error/errorStack.js";
import { Result, Ok, Err } from "../utils/result.js";

/**
 * Downloads a pipeline source file by path and returns the raw binary content.
 *
 * Pipeline source files are typically YAML configuration files stored under /PIPELINES/<owner>/<filename>.
 * The API returns fname as the full path like "PIPELINES/user/file.yml" (without leading slash).
 *
 * @param filePath - The full path to the pipeline file, e.g., /PIPELINES/user/pipeline.yml
 * @returns A Result containing the file content as a Buffer, or an error.
 *
 * @example
 * ```typescript
 * const result = await pipelineFile_getByPath('/PIPELINES/user/config.yml');
 * if (result.ok) {
 *   const buffer: Buffer = result.value;
 *   const yamlContent = buffer.toString('utf-8');
 * }
 * ```
 */
export async function pipelineFile_getByPath(filePath: string): Promise<Result<Buffer>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push("error", "Not connected to ChRIS. Cannot fetch pipeline file.");
    return Err();
  }

  // The API returns fname as the full path like "PIPELINES/sandip.samal/PHI_detection.yml"
  // So we need to match against the full path minus the leading slash
  const expectedFname: string = filePath.startsWith('/') ? filePath.substring(1) : filePath;

  try {
    // Query for all pipeline source files and filter client-side
    const pipelineSourceFileListResult: PipelineSourceFileList | null = await client.getPipelineSourceFiles();

    if (pipelineSourceFileListResult === null) {
      errorStack.stack_push("error", `Failed to retrieve pipeline source file list.`);
      return Err();
    }

    // Get all items from the list
    // @ts-ignore - chrisapi type definitions may not expose getItems()
    const allItems: PipelineSourceFile[] = pipelineSourceFileListResult.getItems();

    // Filter by full fname path (API returns full path like "PIPELINES/user/file.yml")
    // @ts-ignore - accessing data property which may not be in type definitions
    const matchingPipelineFiles: PipelineSourceFile[] = allItems.filter((item: PipelineSourceFile) => {
        const itemData = item.data as { fname: string };
        return itemData.fname === expectedFname;
    });

    if (matchingPipelineFiles.length === 0) {
      errorStack.stack_push("error", `Pipeline source file not found: ${filePath}`);
      return Err();
    }

    const pipelineSourceFile: PipelineSourceFile = matchingPipelineFiles[0]!;
    const blob: unknown = await pipelineSourceFile.getFileBlob();

    if (!blob) {
      errorStack.stack_push("error", `Pipeline source file ${filePath} exists but returned no content/blob.`);
      return Err();
    }

    // Convert blob to Buffer (handle different blob types)
    let buffer: Buffer;
    if (typeof blob === "string") {
      buffer = Buffer.from(blob);
    } else if (blob instanceof ArrayBuffer) {
      buffer = Buffer.from(blob);
    } else if (blob instanceof Blob) {
      const arrayBuffer: ArrayBuffer = await blob.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (Buffer.isBuffer(blob)) {
      buffer = blob;
    } else {
      throw new Error(`Unexpected blob type for pipeline file: ${typeof blob}`);
    }

    return Ok(buffer);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to fetch pipeline file for ${filePath}: ${msg}`);
    return Err();
  }
}

/**
 * Downloads a pipeline source file and returns it as a UTF-8 string.
 *
 * This is a convenience wrapper around `pipelineFile_getByPath()` that converts
 * the Buffer to a string. Suitable for YAML/text files.
 *
 * @param filePath - The full path to the pipeline file, e.g., /PIPELINES/user/pipeline.yml
 * @returns A Result containing the file content as a string, or an error.
 *
 * @example
 * ```typescript
 * const result = await pipelineFile_getTextByPath('/PIPELINES/user/config.yml');
 * if (result.ok) {
 *   const yamlContent: string = result.value;
 *   // Parse YAML content
 * }
 * ```
 */
export async function pipelineFile_getTextByPath(filePath: string): Promise<Result<string>> {
  const result: Result<Buffer> = await pipelineFile_getByPath(filePath);

  if (!result.ok) {
    return Err();
  }

  // Convert Buffer to UTF-8 string
  return Ok(result.value.toString('utf-8'));
}

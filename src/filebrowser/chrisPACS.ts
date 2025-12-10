/**
 * @file ChRIS PACS File Operations
 *
 * This module provides functions for retrieving PACS files (DICOM medical imaging files)
 * from the ChRIS backend. PACS files use a specialized API endpoint that differs from
 * regular file downloads.
 *
 * @module
 */

import Client, { PACSFile } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";
import { errorStack } from "../error/errorStack.js";
import { Result, Ok, Err } from "../utils/result.js";

/**
 * Downloads a PACS file (DICOM) by file ID and returns the raw binary content.
 *
 * PACS files must be downloaded using the PACSFile API instead of regular
 * file download endpoints. This function handles binary data correctly,
 * preserving DICOM file integrity.
 *
 * @param fileId - The numeric ID of the PACS file in ChRIS.
 * @returns A Result containing the file content as a Buffer, or an error.
 *
 * @example
 * ```typescript
 * const result = await pacsFile_getBlob(12345);
 * if (result.ok) {
 *   const buffer: Buffer = result.value;
 *   // Process DICOM data
 * }
 * ```
 */
export async function pacsFile_getBlob(fileId: number): Promise<Result<Buffer>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push("error", "Not connected to ChRIS. Cannot fetch PACS file.");
    return Err();
  }

  try {
    // Get the PACSFile resource using the file ID
    const pacsFile: PACSFile | null = await client.getPACSFile(fileId);

    if (!pacsFile) {
      errorStack.stack_push("error", `Could not retrieve PACSFile resource for ID ${fileId}`);
      return Err();
    }

    // Download the file blob using the PACS-specific method
    const blob: unknown = await pacsFile.getFileBlob();

    if (!blob) {
      errorStack.stack_push("error", `PACS file ID ${fileId} exists but returned no content/blob.`);
      return Err();
    }

    // Convert blob to Buffer (handle different blob types)
    // Note: In Node.js, chrisapi may return string/ArrayBuffer/Blob depending on axios config
    let buffer: Buffer;
    if (typeof blob === "string") {
      // Use 'binary' encoding to preserve binary data integrity
      // This handles the case where axios returns a string in Node.js
      buffer = Buffer.from(blob, 'binary');
    } else if (blob instanceof ArrayBuffer) {
      buffer = Buffer.from(blob);
    } else if (blob instanceof Blob) {
      const arrayBuffer: ArrayBuffer = await blob.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (Buffer.isBuffer(blob)) {
      buffer = blob;
    } else {
      throw new Error(`Unexpected blob type for PACS file: ${typeof blob}`);
    }

    return Ok(buffer);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to fetch PACS file for ID ${fileId}: ${msg}`);
    return Err();
  }
}

/**
 * Downloads a PACS file and returns it as a UTF-8 string.
 *
 * **WARNING:** This function converts binary DICOM data to a UTF-8 string,
 * which may corrupt the file if it contains non-text binary data.
 * Use `pacsFile_getBlob()` instead for DICOM files to preserve data integrity.
 *
 * This function is provided for legacy compatibility only.
 *
 * @param fileId - The numeric ID of the PACS file in ChRIS.
 * @returns A Result containing the file content as a string, or an error.
 */
export async function pacsFile_getText(fileId: number): Promise<Result<string>> {
  const result: Result<Buffer> = await pacsFile_getBlob(fileId);

  if (!result.ok) {
    return Err();
  }

  // Convert Buffer to UTF-8 string
  // WARNING: This may corrupt binary DICOM data
  return Ok(result.value.toString('utf-8'));
}

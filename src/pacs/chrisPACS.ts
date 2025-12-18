/**
 * @file ChRIS PACS Management
 *
 * Provides helpers to list PACS servers that the current CUBE knows about.
 *
 * @module
 */

import { errorStack } from "../error/errorStack.js";
import { Result, Ok, Err } from "../utils/result.js";
import { ChRISResourceGroup } from "../resources/chrisResourceGroup.js";
import { FilteredResourceData, ListOptions } from "../resources/chrisResources.js";
import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";
import zlib from "zlib";

/**
 * Minimal shape of a PACS server as returned by the ChRIS API.
 */
export interface PACSServer {
  id: number;
  identifier?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Options for listing PACS servers (passed directly to the API).
 */
export interface PACSServerListOptions {
  identifier?: string;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

/**
 * Group handler for PACS servers.
 */
export class ChRISPACSGroup extends ChRISResourceGroup {
  constructor() {
    super("PACS", "getPACSList");
  }
}

/**
 * Minimal shape of a PACS query record.
 */
export interface PACSQueryRecord {
  id: number;
  title?: string;
  status?: string;
  pacs_id?: number;
  result?: unknown;
  [key: string]: unknown;
}

/**
 * Options for listing PACS queries.
 */
export interface PACSQueryListOptions extends ListOptions {
  pacs_id?: number;
  pacs_identifier?: string;
}

/**
 * Group handler for PACS queries.
 */
export class ChRISPACSQueryGroup extends ChRISResourceGroup {
  constructor() {
    super("PACSQueries", "getPACSQueries");
  }
}

/**
 * Resolve a PACS server identifier or ID to an ID and identifier.
 *
 * @param pacsserver - Numeric ID or identifier string.
 * @returns Result containing { id, identifier? } or Err on failure/ambiguity.
 */
export async function pacsServer_resolve(
  pacsserver: string
): Promise<Result<{ id: number; identifier?: string }>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push("error", "Not connected to ChRIS. Please log in.");
    return Err();
  }

  if (/^\d+$/.test(pacsserver)) {
    const id: number = Number(pacsserver);
    return Ok({ id, identifier: undefined });
  }

  try {
    const list: { data?: PACSServer[] } = await client.getPACSList({
      identifier: pacsserver,
      limit: 5,
    });
    const matches: PACSServer[] = Array.isArray(list.data) ? list.data : [];
    if (matches.length === 1) {
      const match: PACSServer = matches[0];
      return Ok({ id: match.id, identifier: match.identifier });
    }
    if (matches.length === 0) {
      errorStack.stack_push("error", `No PACS server found for "${pacsserver}".`);
      return Err();
    }
    errorStack.stack_push(
      "error",
      `Multiple PACS servers matched "${pacsserver}". Please specify an ID or unique identifier.`
    );
    return Err();
  } catch (error: unknown) {
    const errorMessage: string =
      error instanceof Error ? error.message : String(error);
    errorStack.stack_push(
      "error",
      `Failed to resolve PACS server "${pacsserver}": ${errorMessage}`
    );
    return Err();
  }
}

/**
 * Fetch all PACS servers visible to the current ChRIS connection.
 *
 * @param options - Optional search/pagination parameters (identifier, limit, offset).
 * @returns Result containing an array of PACS server records, or Err on failure.
 */
export async function pacsServers_list(
  options: PACSServerListOptions = {}
): Promise<Result<PACSServer[]>> {
  try {
    const group: ChRISPACSGroup = new ChRISPACSGroup();
    const clientAvailable: unknown = await group.client_get();
    if (!clientAvailable) {
      errorStack.stack_push("error", "Not connected to ChRIS. Please log in.");
      return Err();
    }

    const listOptions: ListOptions = options as ListOptions;
    const filtered: FilteredResourceData | null = await group.asset.resources_getAll(
      listOptions
    );

    if (!filtered || !filtered.tableData) {
      return Ok([]);
    }

    const servers: PACSServer[] = filtered.tableData.map(
      (row: Record<string, unknown>): PACSServer => ({
        id: typeof row.id === "number" ? row.id : Number(row.id),
        identifier: (row.identifier as string) || (row.name as string) || undefined,
        name: (row.name as string) || undefined,
        description: (row.description as string) || undefined,
      })
    );
    return Ok(servers);
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to list PACS servers: ${errorMessage}`);
    return Err();
  }
}

/**
 * List PACS queries with optional filtering.
 *
 * @param options - Search/pagination options (pacs_id, pacs_identifier, limit, offset, etc.).
 * @returns Result containing filtered resource data or Err.
 */
export async function pacsQueries_list(
  options: PACSQueryListOptions = {}
): Promise<Result<FilteredResourceData | null>> {
  try {
    const group: ChRISPACSQueryGroup = new ChRISPACSQueryGroup();
    const filtered: FilteredResourceData | null =
      await group.asset.resources_listAndFilterByOptions(options);
    return Ok(filtered);
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to list PACS queries: ${errorMessage}`);
    return Err();
  }
}

/**
 * Data needed to create a PACS query.
 */
export interface PACSQueryCreateData {
  title: string;
  query: string;
  description?: string;
}

/**
 * Create a PACS query against a specific PACS server.
 *
 * @param pacsserver - PACS server ID or identifier.
 * @param data - Query creation data (title, query JSON string, optional description).
 * @returns Result containing a PACSQueryRecord or Err.
 */
export async function pacsQueries_create(
  pacsserver: string,
  data: PACSQueryCreateData
): Promise<Result<PACSQueryRecord>> {
  const resolved = await pacsServer_resolve(pacsserver);
  if (!resolved.ok) {
    return Err();
  }
  const { id } = resolved.value;

  try {
    const client: Client | null = await chrisConnection.client_get();
    if (!client) {
      errorStack.stack_push("error", "Not connected to ChRIS. Please log in.");
      return Err();
    }
    const query = await client.createPACSQuery(id, data);
    const record: PACSQueryRecord = {
      id: query.data?.id as number,
      title: query.data?.title as string,
      status: query.data?.status as string,
      pacs_id: query.data?.pacs_id as number,
      result: query.data?.result,
    };
    return Ok(record);
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to create PACS query: ${errorMessage}`);
    return Err();
  }
}

/**
 * Decoded PACS query result payload.
 */
export interface PACSQueryDecodedResult {
  raw: string;
  base64Decoded?: Buffer;
  zlibDecoded?: Buffer;
  gzipDecoded?: Buffer;
  text?: string;
  json?: unknown;
}

/**
 * Attempt to decode a PACS query result payload.
 *
 * @param queryId - PACS query ID.
 * @returns Result containing decoded forms (raw, decoded buffers, text, optional JSON) or Err on failure.
 */
export async function pacsQuery_resultDecode(
  queryId: number
): Promise<Result<PACSQueryDecodedResult>> {
  try {
    const client: Client | null = await chrisConnection.client_get();
    if (!client) {
      errorStack.stack_push("error", "Not connected to ChRIS. Please log in.");
      return Err();
    }

    const query = await client.getPACSQuery(queryId);
    if (!query || !query.data) {
      errorStack.stack_push("error", `PACS query ${queryId} not found.`);
      return Err();
    }

    const raw: string | undefined = (query.data as any).result as string | undefined;
    if (!raw || typeof raw !== "string") {
      errorStack.stack_push("error", `PACS query ${queryId} has no result payload.`);
      return Err();
    }

    const decoded: PACSQueryDecodedResult = { raw };

    let b64: Buffer | null = null;
    try {
      b64 = Buffer.from(raw, "base64");
      decoded.base64Decoded = b64;
    } catch (e: unknown) {
      errorStack.stack_push("warning", `Base64 decode failed for query ${queryId}: ${e}`);
    }

    if (b64) {
      try {
        decoded.zlibDecoded = Buffer.from(zlib.inflateSync(b64));
      } catch (e: unknown) {
        // Ignore; maybe not zlib
      }
      try {
        decoded.gzipDecoded = Buffer.from(zlib.gunzipSync(b64));
      } catch (e: unknown) {
        // Ignore; maybe not gzip
      }

      const textCandidate: Buffer | undefined =
        decoded.zlibDecoded || decoded.gzipDecoded || decoded.base64Decoded;
      if (textCandidate) {
        decoded.text = textCandidate.toString("utf-8");
        try {
          decoded.json = JSON.parse(decoded.text);
        } catch {
          // Not JSON; leave as text
        }
      }
    }

    return Ok(decoded);
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push(
      "error",
      `Failed to decode PACS query result for ${queryId}: ${errorMessage}`
    );
    return Err();
  }
}

/**
 * Minimal shape of a PACS retrieve record.
 */
export interface PACSRetrieveRecord {
  id: number;
  pacs_query_id?: number;
  status?: string;
  creation_date?: string;
  [key: string]: unknown;
}

/**
 * Group handler for PACS retrieves.
 */
export class ChRISPACSRetrieveGroup extends ChRISResourceGroup {
  constructor() {
    super("PACSRetrieves", "getPACSRetrieves");
  }
}

/**
 * Create a PACS retrieve for a given query.
 * This triggers the external service to pull DICOM data from PACS to ChRIS.
 *
 * @param queryId - PACS query ID to retrieve data for.
 * @returns Result containing a PACSRetrieveRecord or Err.
 */
export async function pacsRetrieve_create(
  queryId: number
): Promise<Result<PACSRetrieveRecord>> {
  try {
    const client: Client | null = await chrisConnection.client_get();
    if (!client) {
      errorStack.stack_push("error", "Not connected to ChRIS. Please log in.");
      return Err();
    }

    const retrieve = await client.createPACSRetrieve(queryId);
    const record: PACSRetrieveRecord = {
      id: retrieve.data?.id as number,
      pacs_query_id: queryId,
      status: retrieve.data?.status as string,
      creation_date: retrieve.data?.creation_date as string,
    };
    return Ok(record);
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to create PACS retrieve for query ${queryId}: ${errorMessage}`);
    return Err();
  }
}

/**
 * List all retrieves for a given PACS query.
 *
 * @param queryId - PACS query ID.
 * @param options - Optional list options.
 * @returns Result containing an array of PACSRetrieveRecord or Err.
 */
export async function pacsRetrieves_list(
  queryId: number,
  options: ListOptions = {}
): Promise<Result<PACSRetrieveRecord[]>> {
  try {
    const client: Client | null = await chrisConnection.client_get();
    if (!client) {
      errorStack.stack_push("error", "Not connected to ChRIS. Please log in.");
      return Err();
    }

    const query = await client.getPACSQuery(queryId);
    if (!query || !query.data) {
      errorStack.stack_push("error", `PACS query ${queryId} not found.`);
      return Err();
    }

    const retrieveList = await query.getRetrieves(options);
    const items = retrieveList.getItems();

    if (!items) {
      return Ok([]);
    }

    const records: PACSRetrieveRecord[] = items.map((item: any): PACSRetrieveRecord => ({
      id: item.data?.id as number,
      pacs_query_id: item.data?.pacs_query_id as number,
      status: item.data?.status as string,
      creation_date: item.data?.creation_date as string,
    }));

    return Ok(records);
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to list PACS retrieves for query ${queryId}: ${errorMessage}`);
    return Err();
  }
}

/**
 * Delete (cancel) a PACS retrieve.
 *
 * @param retrieveId - PACS retrieve ID to delete.
 * @returns Result containing void or Err.
 */
export async function pacsRetrieve_delete(
  retrieveId: number
): Promise<Result<void>> {
  try {
    const client: Client | null = await chrisConnection.client_get();
    if (!client) {
      errorStack.stack_push("error", "Not connected to ChRIS. Please log in.");
      return Err();
    }

    // Use the ChRIS API to delete the retrieve
    // The API typically has endpoints like /api/v1/pacsfiles/retrieves/{id}/
    // We need to construct the URL and make a DELETE request
    // For now, use a simple approach: we know retrieves exist, so direct delete via constructed object

    // Note: This is a simplified implementation
    // In a production system, you'd want to verify the retrieve exists first
    const baseUrl = (client as any).auth?.cubeUrl || "";
    if (!baseUrl) {
      errorStack.stack_push("error", "Could not determine CUBE URL for delete operation.");
      return Err();
    }

    const retrieveUrl = `${baseUrl}api/v1/pacsfiles/retrieves/${retrieveId}/`;
    const PACSRetrieve = (await import("@fnndsc/chrisapi")).PACSRetrieve;
    const retrieve = new PACSRetrieve(retrieveUrl, (client as any).auth);

    await retrieve.delete();
    return Ok(undefined);
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to delete PACS retrieve ${retrieveId}: ${errorMessage}`);
    return Err();
  }
}

/**
 * Status of a single series in the retrieve process.
 */
export interface SeriesRetrieveStatus {
  seriesInfo: Record<string, unknown>;
  seriesInstanceUID: string;
  seriesDescription?: string;
  expectedFiles: number;
  actualFiles: number;
  status: "pending" | "pulling" | "pulled" | "error";
}

/**
 * Study with series status information.
 */
export interface StudyRetrieveStatus {
  studyInfo: Record<string, unknown>;
  studyInstanceUID?: string;
  studyDescription?: string;
  series: SeriesRetrieveStatus[];
}

/**
 * Complete retrieve status report for a query.
 */
export interface PACSQueryStatusReport {
  queryId: number;
  retrieveStatus?: string;
  retrieveId?: number;
  studies: StudyRetrieveStatus[];
}

/**
 * Count PACSFiles for a given SeriesInstanceUID.
 *
 * @param seriesInstanceUID - The series instance UID to count files for.
 * @returns Result containing file count or Err.
 */
async function seriesFiles_count(
  seriesInstanceUID: string
): Promise<Result<number>> {
  try {
    const client: Client | null = await chrisConnection.client_get();
    if (!client) {
      return Ok(0);
    }

    // First get the PACSSeries record to find the folder_path
    const seriesList = await client.getPACSSeriesList({
      SeriesInstanceUID: seriesInstanceUID,
      limit: 1,
    });

    const seriesItems = seriesList.getItems();
    if (!seriesItems || seriesItems.length === 0) {
      return Ok(0); // No series record means no files pulled yet
    }

    const series = seriesItems[0];
    if (!series || !series.data) {
      return Ok(0);
    }

    const folderPath: string | undefined = series.data.folder_path as string | undefined;

    if (!folderPath) {
      return Ok(0);
    }

    // Count PACSFiles in that folder
    const filesList = await client.getPACSFiles({
      fname: folderPath,
      limit: 1000, // Reasonable limit for counting
    });

    const items = filesList.getItems();
    return Ok(filesList.totalCount || (items ? items.length : 0));
  } catch (error: unknown) {
    errorStack.stack_push("warning", `Failed to count files for series ${seriesInstanceUID}: ${error}`);
    return Ok(0); // Return 0 rather than failing the whole operation
  }
}

/**
 * Extract value from a DICOM tag object or return as-is.
 *
 * @param val - Potentially a tag object with {label, value} or a primitive.
 * @returns The extracted value.
 */
function tagValue_extract(val: unknown): unknown {
  if (val && typeof val === "object" && "value" in (val as Record<string, unknown>)) {
    const tagObj = val as { value?: unknown };
    return tagObj.value;
  }
  return val;
}

/**
 * Determine series status based on file counts.
 *
 * @param expected - Expected number of files.
 * @param actual - Actual number of files pulled.
 * @returns Status string.
 */
function seriesStatus_determine(
  expected: number,
  actual: number
): "pending" | "pulling" | "pulled" | "error" {
  if (actual === 0) {
    return "pending";
  }
  if (actual < expected) {
    return "pulling";
  }
  if (actual === expected) {
    return "pulled";
  }
  return "error"; // More files than expected
}

/**
 * Generate a complete status report for a PACS query retrieve.
 * This combines query decode results with actual file counts to show progress.
 *
 * @param queryId - PACS query ID.
 * @returns Result containing PACSQueryStatusReport or Err.
 */
export async function pacsRetrieve_statusForQuery(
  queryId: number
): Promise<Result<PACSQueryStatusReport>> {
  try {
    // Step 1: Decode query result to get series information
    const decodedResult = await pacsQuery_resultDecode(queryId);
    if (!decodedResult.ok) {
      return Err();
    }

    const decoded = decodedResult.value;
    if (!decoded.json) {
      errorStack.stack_push("error", `Query ${queryId} has no decoded JSON result.`);
      return Err();
    }

    // Step 2: Get retrieve records for this query
    const retrievesResult = await pacsRetrieves_list(queryId);
    let retrieveStatus: string | undefined;
    let retrieveId: number | undefined;

    if (retrievesResult.ok && retrievesResult.value.length > 0) {
      const latestRetrieve = retrievesResult.value[retrievesResult.value.length - 1];
      retrieveStatus = latestRetrieve.status;
      retrieveId = latestRetrieve.id;
    }

    // Step 3: Process the query result structure
    const payload: unknown = decoded.json;
    const studies: StudyRetrieveStatus[] = [];

    // Handle both array and object payloads
    const payloadArray: unknown[] = Array.isArray(payload) ? payload : [payload];

    for (const studyObj of payloadArray) {
      if (!studyObj || typeof studyObj !== "object") {
        continue;
      }

      const study = studyObj as Record<string, unknown>;
      const studyStatus: StudyRetrieveStatus = {
        studyInfo: study,
        studyInstanceUID: tagValue_extract(study.StudyInstanceUID) as string | undefined,
        studyDescription: tagValue_extract(study.StudyDescription) as string | undefined,
        series: [],
      };

      // Extract series array
      const seriesArray: unknown[] =
        Array.isArray(study.series) ? study.series :
        Array.isArray(study.Series) ? study.Series :
        Array.isArray(study.results) ? study.results :
        [];

      // Process each series
      for (const seriesObj of seriesArray) {
        if (!seriesObj || typeof seriesObj !== "object") {
          continue;
        }

        const series = seriesObj as Record<string, unknown>;
        const seriesUID = tagValue_extract(series.SeriesInstanceUID) as string | undefined;

        if (!seriesUID) {
          continue;
        }

        // Get expected file count
        const expectedFiles: number = Number(tagValue_extract(series.NumberOfSeriesRelatedInstances)) || 0;

        // Count actual files pulled to CUBE
        const actualFilesResult = await seriesFiles_count(seriesUID);
        const actualFiles: number = actualFilesResult.ok ? actualFilesResult.value : 0;

        // Determine status
        const status = seriesStatus_determine(expectedFiles, actualFiles);

        studyStatus.series.push({
          seriesInfo: series,
          seriesInstanceUID: seriesUID,
          seriesDescription: tagValue_extract(series.SeriesDescription) as string | undefined,
          expectedFiles,
          actualFiles,
          status,
        });
      }

      studies.push(studyStatus);
    }

    const report: PACSQueryStatusReport = {
      queryId,
      retrieveStatus,
      retrieveId,
      studies,
    };

    return Ok(report);
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to generate status report for query ${queryId}: ${errorMessage}`);
    return Err();
  }
}

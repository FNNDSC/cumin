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

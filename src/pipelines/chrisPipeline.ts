/**
 * @file ChRIS Pipeline and Workflow operations.
 *
 * Provides functions to list registered pipelines, resolve them by name or ID,
 * and create workflow instances (the runtime execution of a pipeline on a feed node).
 *
 * Terminology:
 *   Pipeline  — the registered DAG template in CUBE
 *   Workflow  — a pipeline instantiated on a specific plugin instance node
 *
 * @module
 */

import { chrisConnection } from "../connect/chrisConnection.js";
import { errorStack } from "../error/errorStack.js";
import { Result, Ok, Err } from "../utils/result.js";

/**
 * Minimal shape of a pipeline record as returned by the ChRIS API.
 */
export interface PipelineRecord {
  id: number;
  name: string;
  description?: string;
  authors?: string;
  category?: string;
  locked?: boolean;
  /** Filesystem-safe slug derived from the pipeline source filename (e.g. "Varus_valgus_full_4crg2N7"). */
  slug?: string;
  [key: string]: unknown;
}

/**
 * Per-node override for a workflow execution.
 * All fields are optional — omitted fields use the pipeline's defaults.
 */
export interface WorkflowNodeOverride {
  piping_id: number;
  compute_resource_name?: string;
  title?: string;
  plugin_parameter_defaults?: Array<{ name: string; default: unknown }>;
}

/**
 * Options for creating a workflow.
 */
export interface WorkflowCreateOptions {
  /** Numeric ID of the previous plugin instance to attach the workflow root to. */
  previousPluginInstId: number;
  /** Per-node overrides. If omitted, all nodes run with pipeline defaults. */
  nodeOverrides?: WorkflowNodeOverride[];
}

/**
 * Result of a successful workflow creation.
 */
export interface WorkflowResult {
  workflowId: number;
  /** Plugin instance IDs created by this workflow, in DAG order. */
  pluginInstanceIds: number[];
}

/**
 * Lists all registered pipelines, optionally filtered by name substring.
 *
 * @param search - Optional name substring filter.
 * @returns Result containing array of PipelineRecord on success.
 */
export async function pipelines_list(
  search?: string
): Promise<Result<PipelineRecord[]>> {
  const client = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push('error', 'Not connected to ChRIS');
    return Err();
  }

  try {
    const params: Record<string, unknown> = { limit: 1000 };
    if (search) params.name = search;

    const pipelineList = await client.getPipelines(params);
    if (!pipelineList) {
      return Ok([]);
    }

    const items = (pipelineList as unknown as { getItems(): unknown[] }).getItems();
    const records: PipelineRecord[] = items.map((item: unknown) => {
      const data = (item as { data: PipelineRecord }).data;
      return data;
    });

    return Ok(records);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push('error', `pipelines_list: ${msg}`);
    return Err();
  }
}

/**
 * Resolves a pipeline by name (exact match first, then substring) or numeric ID string.
 *
 * @param nameOrId - Pipeline name or numeric ID.
 * @returns Result containing the matched PipelineRecord.
 */
export async function pipeline_resolve(
  nameOrId: string
): Promise<Result<PipelineRecord>> {
  const numericId: number = parseInt(nameOrId, 10);
  if (!isNaN(numericId)) {
    const client = await chrisConnection.client_get();
    if (!client) {
      errorStack.stack_push('error', 'Not connected to ChRIS');
      return Err();
    }
    try {
      const pipeline = await client.getPipeline(numericId);
      if (!pipeline) {
        errorStack.stack_push('error', `Pipeline with ID ${numericId} not found`);
        return Err();
      }
      const data = (pipeline as unknown as { data: PipelineRecord }).data;
      return Ok(data);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errorStack.stack_push('error', `pipeline_resolve: ${msg}`);
      return Err();
    }
  }

  const listResult = await pipelines_list(nameOrId);
  if (!listResult.ok) return Err();

  const exact: PipelineRecord | undefined = listResult.value.find(
    (p: PipelineRecord) => p.name === nameOrId
  );
  if (exact) return Ok(exact);

  if (listResult.value.length === 1) return Ok(listResult.value[0]);

  if (listResult.value.length === 0) {
    const fallbackClient = await chrisConnection.client_get();
    if (fallbackClient) {
      // ID-suffix fallback: slug of form "{name}_id{N}" generated for pipelines without source files
      const idSuffixMatch: RegExpMatchArray | null = nameOrId.match(/_id(\d+)$/);
      if (idSuffixMatch) {
        const directId: number = parseInt(idSuffixMatch[1], 10);
        try {
          const pipeline = await fallbackClient.getPipeline(directId);
          if (pipeline) {
            return Ok((pipeline as unknown as { data: PipelineRecord }).data);
          }
        } catch (_e: unknown) {}
      }

      // Slug fallback: treat nameOrId as a source file fname fragment
      try {
        const sfList = await (fallbackClient as unknown as {
          getPipelineSourceFiles: (o: Record<string, unknown>) => Promise<{
            getItems: () => Array<{ data: { fname: string; pipeline_name?: string } }>;
          }>;
        }).getPipelineSourceFiles({ fname: nameOrId, limit: 1 });
        const sfItems = sfList.getItems().filter(
          (item: { data: { fname: string; pipeline_name?: string } }) => {
            const base: string = item.data.fname.split('/').pop() ?? '';
            return base.replace(/\.(ya?ml)$/i, '') === nameOrId;
          }
        );
        if (sfItems.length > 0 && sfItems[0].data.pipeline_name) {
          const byName: Result<PipelineRecord[]> = await pipelines_list(sfItems[0].data.pipeline_name);
          if (byName.ok) {
            const exactByName: PipelineRecord | undefined = byName.value.find(
              (p: PipelineRecord) => p.name === sfItems[0].data.pipeline_name
            );
            if (exactByName) return Ok(exactByName);
          }
        }
      } catch (_e: unknown) {}
    }
    errorStack.stack_push('error', `No pipeline matching '${nameOrId}'`);
    return Err();
  }

  errorStack.stack_push(
    'error',
    `Ambiguous: ${listResult.value.length} pipelines match '${nameOrId}'. Use ID or full name.`
  );
  return Err();
}

/**
 * Creates a workflow — instantiates a pipeline on a specific plugin instance node.
 *
 * @param pipelineId - Numeric ID of the registered pipeline.
 * @param options - Execution options including the previous node and optional overrides.
 * @returns Result containing workflow ID and created plugin instance IDs.
 */
export async function pipeline_createWorkflow(
  pipelineId: number,
  options: WorkflowCreateOptions
): Promise<Result<WorkflowResult>> {
  const client = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push('error', 'Not connected to ChRIS');
    return Err();
  }

  try {
    let nodes_info: WorkflowNodeOverride[];

    if (options.nodeOverrides && options.nodeOverrides.length > 0) {
      nodes_info = options.nodeOverrides;
    } else {
      const pipeline = await client.getPipeline(pipelineId);
      if (!pipeline) {
        errorStack.stack_push('error', `Pipeline ${pipelineId} not found`);
        return Err();
      }
      const pipelineWithPipings = pipeline as unknown as {
        data: { parameters?: unknown };
        getPluginPipings: (opts: Record<string, unknown>) => Promise<{
          getItems: () => unknown[];
        }>;
      };

      const pipingsResponse = await pipelineWithPipings.getPluginPipings({ limit: 1000 });
      const pipings = pipingsResponse.getItems() as Array<{ data: { id: number } }>;
      nodes_info = pipings.map((p: { data: { id: number } }) => ({ piping_id: p.data.id }));
    }

    const clientWithWorkflow = client as unknown as {
      createWorkflow: (
        pipelineId: number,
        data: { previous_plugin_inst_id: number; nodes_info: string },
        timeout?: number
      ) => Promise<unknown>;
    };

    const workflow = await clientWithWorkflow.createWorkflow(pipelineId, {
      previous_plugin_inst_id: options.previousPluginInstId,
      nodes_info: JSON.stringify(nodes_info),
    });

    if (!workflow) {
      errorStack.stack_push('error', 'createWorkflow returned empty response');
      return Err();
    }

    const workflowWithData = workflow as {
      data: { id: number };
      getPluginInstances: (opts: Record<string, unknown>) => Promise<{
        getItems: () => Array<{ data: { id: number } }>;
      }>;
    };

    const workflowId: number = workflowWithData.data.id;

    const instancesResponse = await workflowWithData.getPluginInstances({ limit: 1000 });
    const instances = instancesResponse.getItems();
    const pluginInstanceIds: number[] = instances.map(
      (inst: { data: { id: number } }) => inst.data.id
    );

    return Ok({ workflowId, pluginInstanceIds });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push('error', `pipeline_createWorkflow: ${msg}`);
    return Err();
  }
}

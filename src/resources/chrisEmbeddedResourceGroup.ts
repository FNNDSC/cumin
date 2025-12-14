/**
 * @file ChRIS Embedded Resource Group
 *
 * This module manages groups of ChRIS resources that are embedded within other resources
 * (e.g., files within a folder, parameters of a plugin). It handles context-aware initialization.
 *
 * @module
 */

import { ChRISResourceGroup } from "../resources/chrisResourceGroup.js";
import { chrisConnection } from "../connect/chrisConnection.js";
import { errorStack } from "../error/errorStack.js";
import Client from "@fnndsc/chrisapi";

/**
 * Error thrown when the ChRIS client is not connected.
 */
export class ChRISConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChRISConnectionError";
  }
}

/**
 * Error thrown when ChRIS initialization fails.
 */
export class ChRISInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChRISInitializationError";
  }
}

/**
 * Error thrown when a context specification is invalid.
 */
export class ChRISContextSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChRISContextSpecError";
  }
}

interface ContextSpec {
  type: string;
  value: string;
}

function context_split(context: unknown, delimiter: string = ":"): ContextSpec {
  if (typeof context !== "string") {
    throw new ChRISContextSpecError(
      `Invalid input: Expected a string, but received ${typeof context}`
    );
  }

  const parts: string[] = context.split(delimiter);
  if (parts.length !== 2) {
    throw new ChRISContextSpecError(
      `Invalid input string format: Expected a ${delimiter}-separated string, but got: ${context}`
    );
  }
  return { type: parts[0], value: parts[1] };
}

/**
 * Parameters for creating a ChRISEmbeddedResourceGroup.
 */
export interface ChRISEmbeddedResourceGroupParams<T = unknown> {
  resourceName: string;
  getMethod: string;
  chrisContext: T;
  context: string;
}

/**
 * Group of ChRIS resources embedded within a specific context.
 */
export class ChRISEmbeddedResourceGroup<T = unknown> extends ChRISResourceGroup {
  public readonly context: string;
  public readonly chrisContextObj: T;

  private constructor(params: ChRISEmbeddedResourceGroupParams<T>) {
    super(params.resourceName, params.getMethod, params.chrisContext);
    this.context = params.context;
    this.chrisContextObj = params.chrisContext;
  }

  public static async create<T = unknown>(
    resourceName: string,
    getMethod: string,
    context: string
  ): Promise<ChRISEmbeddedResourceGroup<T> | null> {
    let params: ChRISEmbeddedResourceGroupParams<T>;
    try {
      const chrisContextObj: T | null = await this.context_init<T>(
        context
      );
      if (!chrisContextObj) {
        errorStack.stack_push(
          "warning",
          `could not initialize context ${context} for ${resourceName}`
        );
        return null;
      }
      const params: ChRISEmbeddedResourceGroupParams<T> = {
        resourceName,
        getMethod,
        chrisContext: chrisContextObj,
        context,
      };
      return new ChRISEmbeddedResourceGroup<T>(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      //console.error(`DEBUG: create failed for ${resourceName}:`, errorMessage); // Added
      errorStack.stack_push(
        "error",
        `Error: ${context} seems invalid for resource ${resourceName}.`
      );
      return null;
    }
  }

  private static async context_init<T = unknown>(context: string): Promise<T | null> {
    const client: Client | null = await chrisConnection.client_get();
    if (!client) {
      throw new ChRISConnectionError("ChRIS client is not initialized");
    }

    let contextSpec: ContextSpec;
    try {
      contextSpec = context_split(context);
    } catch (error: unknown) {
      if (error instanceof ChRISContextSpecError) {
        console.error(error.message);
      }
      throw error;
    }

    let chrisContextObj: T | null = null;
    try {
      switch (contextSpec.type) {
        case "folder":
          chrisContextObj = (await client.getFileBrowserFolderByPath(
            contextSpec.value
          )) as T;
          break;
        case "plugin":
          chrisContextObj = (await client.getPlugin(
            Number(contextSpec.value)
          )) as T;
          break;
        case "feed":
          chrisContextObj = (await client.getFeed(
            Number(contextSpec.value)
          )) as T;
          break;
        default:
          throw new ChRISInitializationError(
            `Unknown context type: ${contextSpec.type}`
          );
      }
    } catch (error: unknown) {
      const errorMessage: string =
        error instanceof Error ? error.message : String(error);
      // console.error("DEBUG: initializeContext failed:", errorMessage); // Added for debugging
      errorStack.stack_push(
        "error",
        `Failed to get contextObject of type ${contextSpec.type} for value ${contextSpec.value}: ${errorMessage}`
      );
      return null;
    }

    if (!chrisContextObj) {
      errorStack.stack_push(
        "warning",
        `could not initialize contextObject of type ${contextSpec.type} for value ${contextSpec.value}`
      );
      return null;
    }

    return chrisContextObj;
  }
}

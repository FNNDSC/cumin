import { ChRISResourceGroup } from "../resources/chrisResourceGroup";
import { Plugin } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection";
import Client from "@fnndsc/chrisapi";

export class ChRISConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChRISConnectionError";
  }
}

export class ChRISInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChRISInitializationError";
  }
}

export abstract class ChRISPluginSystemGroup extends ChRISResourceGroup {
  protected _id: number;
  protected _pluginObj: Plugin | null = null;

  protected constructor(
    resourceName: string,
    getMethod: string,
    plugin: Plugin,
    id: number
  ) {
    super(resourceName, getMethod, plugin);
    this._id = id;
    this._pluginObj = plugin;
  }

  protected static async initializePluginContext(id: number): Promise<Plugin> {
    const client: Client | null = chrisConnection.getClient();
    if (!client) {
      throw new ChRISConnectionError("ChRIS client is not initialized");
    }

    let plugin: Plugin | null;
    try {
      plugin = await client.getPlugin(id);
    } catch (error) {
      throw new ChRISInitializationError(
        `Failed to get Plugin ID ${id}: ` +
          (error instanceof Error ? error.message : String(error))
      );
    }

    if (!plugin) {
      throw new ChRISInitializationError("Failed to initialize plugin context");
    }

    return plugin;
  }

  get id(): number {
    return this._id;
  }

  public get plugin(): Plugin | null {
    return this._pluginObj;
  }
}

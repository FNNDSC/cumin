import { ChRISPluginSystemGroup } from "./chrisPluginSystemGroup";
import { Plugin } from "@fnndsc/chrisapi";

export class PluginComputeResources extends ChRISPluginSystemGroup {
  constructor(chrisPlugin: Plugin, id: number) {
    super("Compute Resources", "getPluginComputeResources", chrisPlugin, id);
  }

  static async create(id: number): Promise<PluginComputeResources> {
    const chrisPlugin: Plugin =
      await ChRISPluginSystemGroup.initializePluginContext(id);
    return new PluginComputeResources(chrisPlugin, id);
  }
}

export class PluginInstances extends ChRISPluginSystemGroup {
  constructor(chrisPlugin: Plugin, id: number) {
    super("Plugin Instances", "getPluginInstances", chrisPlugin, id);
  }

  static async create(id: number): Promise<PluginInstances> {
    const chrisPlugin: Plugin =
      await ChRISPluginSystemGroup.initializePluginContext(id);
    return new PluginInstances(chrisPlugin, id);
  }
}

export class PluginParameters extends ChRISPluginSystemGroup {
  constructor(chrisPlugin: Plugin, id: number) {
    super("Plugin Parameters", "getPluginParameters", chrisPlugin, id);
  }

  static async create(id: number): Promise<PluginParameters> {
    const chrisPlugin: Plugin =
      await ChRISPluginSystemGroup.initializePluginContext(id);
    return new PluginParameters(chrisPlugin, id);
  }
}

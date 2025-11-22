import { ChRISResourceGroup } from "../resources/chrisResourceGroup";

/**
 * Group handler for ChRIS plugin metadata (PluginMeta).
 */
export class ChRISPluginMetaPluginGroup extends ChRISResourceGroup {
  constructor() {
    super("PluginMetaPlugins", "getPluginMetas");
  }
}

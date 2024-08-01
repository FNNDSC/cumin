import { ChRISResourceGroup } from "../resources/chrisResourceGroup";

export class ChRISPluginMetaPluginGroup extends ChRISResourceGroup {
  constructor() {
    super("PluginMetaPlugins", "getPluginMetas");
  }
}

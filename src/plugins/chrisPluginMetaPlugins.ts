/**
 * @file Resource group for the plugins belonging to a ChRIS plugin-meta.
 *
 * @module
 */

import { ChRISResourceGroup } from "../resources/chrisResourceGroup";

/**
 * Group handler for ChRIS plugin metadata (PluginMeta).
 */
export class ChRISPluginMetaPluginGroup extends ChRISResourceGroup {
  constructor() {
    super("PluginMetaPlugins", "getPluginMetas");
  }
}

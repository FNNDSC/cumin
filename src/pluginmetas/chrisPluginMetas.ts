/**
 * @file ChRIS PluginMeta resources.
 * @module
 */

import { ChRISResourceGroup } from '../resources/chrisResourceGroup.js';

/**
 * Group handler for ChRIS plugin metas.
 */
export class ChRISPluginMetaGroup extends ChRISResourceGroup {
  constructor() {
    super('PluginMetas', 'getPluginMetas');
  }
}

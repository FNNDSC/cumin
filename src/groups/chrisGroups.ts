/**
 * @file ChRIS Group resources.
 * @module
 */

import { ChRISResourceGroup } from '../resources/chrisResourceGroup.js';

/**
 * Group handler for ChRIS user groups.
 */
export class ChRISGroupGroup extends ChRISResourceGroup {
  constructor() {
    super('Groups', 'getGroups');
  }
}

/**
 * @file ChRIS Tag resources.
 * @module
 */

import { ChRISResourceGroup } from '../resources/chrisResourceGroup.js';

/**
 * Group handler for ChRIS tags.
 */
export class ChRISTagGroup extends ChRISResourceGroup {
  constructor() {
    super('Tags', 'getTags');
  }
}

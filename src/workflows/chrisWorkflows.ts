/**
 * @file ChRIS Workflow resources.
 * @module
 */

import { ChRISResourceGroup } from '../resources/chrisResourceGroup.js';

/**
 * Group handler for ChRIS workflows.
 */
export class ChRISWorkflowGroup extends ChRISResourceGroup {
  constructor() {
    super('Workflows', 'getWorkflows');
  }
}

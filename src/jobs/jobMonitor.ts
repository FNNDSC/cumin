/**
 * @file Background Job Monitor.
 *
 * Polls running jobs and notifies on status changes.
 */

import { ChRISJob, JobStatus, JobState } from './chrisJob.js';

type JobCallback = (instanceId: string, status: JobStatus) => void;

export class JobMonitor {
  private static instance: JobMonitor;
  private watchedJobs: Map<string, { lastState: JobState }> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private callbacks: JobCallback[] = [];

  static instance_get(): JobMonitor {
    if (!JobMonitor.instance) {
      JobMonitor.instance = new JobMonitor();
    }
    return JobMonitor.instance;
  }

  /**
   * Start watching a job for completion.
   */
  watch(instanceId: string): void {
    this.watchedJobs.set(instanceId, { lastState: 'scheduled' });
    this.polling_start();
  }

  /**
   * Stop watching a job.
   */
  unwatch(instanceId: string): void {
    this.watchedJobs.delete(instanceId);
    if (this.watchedJobs.size === 0) {
      this.polling_stop();
    }
  }
  
  /**
   * Get list of currently watched jobs (for prompt status)
   */
  watchedJobs_get(): Array<{id: string, progress: number}> {
      // This is a simplified view for the prompt
      // We don't store progress in watchedJobs map currently, only lastState.
      // We might want to expand the map value to include the full last status.
      // For now, just returning IDs.
      return Array.from(this.watchedJobs.keys()).map(id => ({id, progress: 0}));
  }

  /**
   * Register callback for status changes.
   */
  onChange(callback: JobCallback): void {
    this.callbacks.push(callback);
  }

  private polling_start(): void {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(() => {
      this.poll();  // Don't await - background task
    }, 10000);  // Poll every 10s
  }

  private polling_stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async poll(): Promise<void> {
    for (const [instanceId, watchData] of this.watchedJobs) {
      const job = new ChRISJob(instanceId);
      const statusResult = await job.status_get();

      if (!statusResult.ok) continue;

      const status = statusResult.value;

      // Check for state change
      if (status.state !== watchData.lastState) {
        watchData.lastState = status.state;

        // Notify callbacks
        for (const callback of this.callbacks) {
          callback(instanceId, status);
        }

        // Unwatch if terminal state
        if (['completed', 'error', 'cancelled'].includes(status.state)) {
          this.unwatch(instanceId);
        }
      }
    }
  }
}

export function jobMonitor_get(): JobMonitor {
  return JobMonitor.instance_get();
}

/**
 * @file Process Cache
 *
 * Session-scoped cache of ChRIS feed topology. Separates permanent data
 * (instance DAG structure) from volatile data (status — never stored).
 *
 * Design decisions:
 * - Topology (id, feedID, parentID, pluginName) is permanent once written.
 * - Status is always fetched live from the API — never stored here.
 * - Feed job counters (finishedJobs etc.) give aggregate feed status
 *   without per-instance API calls.
 * - topologyLoaded distinguishes "loaded but 0 instances" from "not yet loaded".
 * - loading map prevents duplicate API calls when background loader and
 *   user navigation race on the same feed.
 * - warmupComplete enables pure in-memory path for proc find <name>.
 *
 * @module
 */

/**
 * Feed-level metadata including job count fields for aggregate status.
 */
export interface ProcFeed {
  id: number;
  title: string;
  creationDate: string;   // ISO string — used to filter warmup to recent feeds
  finishedJobs: number;
  erroredJobs: number;
  startedJobs: number;
  scheduledJobs: number;
  cancelledJobs: number;
  createdJobs: number;
}

/**
 * Topology-only instance entry. Status is never stored — always fetched live.
 */
export interface ProcInstance {
  id: number;
  feedID: number;
  /** null for root nodes (direct children of a feed). */
  parentID: number | null;
  pluginName: string;
  /** null until first cat — immutable once populated. */
  params: Record<string, unknown> | null;
}

/**
 * Warm-up progress counters for the prompt indicator.
 */
export interface ProcWarmupProgress {
  loaded: number;
  total: number;
}

/**
 * Session-scoped cache of feed and instance topology.
 * Status is never stored — always fetched live from the API.
 */
export class ProcCache {
  private static _instance: ProcCache | null = null;

  private feeds: Map<number, ProcFeed> = new Map();
  private instances: Map<number, ProcInstance> = new Map();
  private feedRoots: Map<number, number[]> = new Map();
  private children: Map<number, number[]> = new Map();

  /** Feed IDs whose instance topology has been fully fetched. */
  private topologyLoaded: Set<number> = new Set();

  /** In-flight topology fetch promises — prevents duplicate API calls. */
  private loading: Map<number, Promise<void>> = new Map();

  /** True when background warm-up has finished all feeds. */
  private _warmupComplete: boolean = false;

  private _warmupProgress: ProcWarmupProgress = { loaded: 0, total: 0 };

  /** Whether initial feed index has been built. */
  private _built: boolean = false;

  private constructor() {}

  static instance_get(): ProcCache {
    if (!ProcCache._instance) {
      ProcCache._instance = new ProcCache();
    }
    return ProcCache._instance;
  }

  get built(): boolean { return this._built; }
  get warmupComplete(): boolean { return this._warmupComplete; }

  // ── Feed ──────────────────────────────────────────────────────────────────

  /**
   * Adds or updates a feed entry.
   */
  feed_add(feed: ProcFeed): void {
    this.feeds.set(feed.id, feed);
    if (!this.feedRoots.has(feed.id)) {
      this.feedRoots.set(feed.id, []);
    }
  }

  feed_get(feedID: number): ProcFeed | undefined {
    return this.feeds.get(feedID);
  }

  feedIDs_get(): number[] {
    return Array.from(this.feeds.keys());
  }

  feedRoots_get(feedID: number): number[] {
    return this.feedRoots.get(feedID) ?? [];
  }

  /**
   * Removes a feed and all its instances from the cache.
   */
  feed_remove(feedID: number): void {
    this.feeds.delete(feedID);
    this.topologyLoaded.delete(feedID);
    const allInstances: ProcInstance[] = Array.from(this.instances.values())
      .filter((i: ProcInstance) => i.feedID === feedID);
    for (const inst of allInstances) {
      this.instance_remove(inst.id);
    }
    this.feedRoots.delete(feedID);
  }

  // ── Instance ──────────────────────────────────────────────────────────────

  /**
   * Adds a plugin instance to the topology cache.
   */
  instance_add(inst: ProcInstance): void {
    this.instances.set(inst.id, inst);
    if (inst.parentID === null) {
      const roots: number[] = this.feedRoots.get(inst.feedID) ?? [];
      if (!roots.includes(inst.id)) {
        roots.push(inst.id);
        this.feedRoots.set(inst.feedID, roots);
      }
    } else {
      const kids: number[] = this.children.get(inst.parentID) ?? [];
      if (!kids.includes(inst.id)) {
        kids.push(inst.id);
        this.children.set(inst.parentID, kids);
      }
    }
  }

  instance_get(id: number): ProcInstance | undefined {
    return this.instances.get(id);
  }

  children_get(parentID: number): number[] {
    return this.children.get(parentID) ?? [];
  }

  /**
   * Removes an instance from the topology cache.
   */
  instance_remove(id: number): void {
    const inst: ProcInstance | undefined = this.instances.get(id);
    if (!inst) return;
    this.instances.delete(id);
    if (inst.parentID === null) {
      const roots: number[] = this.feedRoots.get(inst.feedID) ?? [];
      this.feedRoots.set(inst.feedID, roots.filter((r: number) => r !== id));
    } else {
      const kids: number[] = this.children.get(inst.parentID) ?? [];
      this.children.set(inst.parentID, kids.filter((k: number) => k !== id));
    }
  }

  /**
   * Updates cached params for an instance (on first cat).
   */
  params_update(id: number, params: Record<string, unknown>): void {
    const inst: ProcInstance | undefined = this.instances.get(id);
    if (inst) inst.params = params;
  }

  // ── Topology loaded tracking ───────────────────────────────────────────────

  topologyLoaded_mark(feedID: number): void {
    this.topologyLoaded.add(feedID);
  }

  topologyLoaded_has(feedID: number): boolean {
    return this.topologyLoaded.has(feedID);
  }

  // ── In-flight map ─────────────────────────────────────────────────────────

  loading_set(feedID: number, promise: Promise<void>): void {
    this.loading.set(feedID, promise);
  }

  loading_get(feedID: number): Promise<void> | undefined {
    return this.loading.get(feedID);
  }

  loading_clear(feedID: number): void {
    this.loading.delete(feedID);
  }

  // ── Warm-up state ─────────────────────────────────────────────────────────

  warmup_complete(): void {
    this._warmupComplete = true;
    this._warmupProgress = { loaded: this.feeds.size, total: this.feeds.size };
  }

  warmup_progress(loaded: number, total: number): void {
    this._warmupProgress = { loaded, total };
  }

  warmupProgress_get(): ProcWarmupProgress {
    return { ...this._warmupProgress };
  }

  // ── Path reconstruction ───────────────────────────────────────────────────

  /**
   * Reconstructs the full /proc/feeds path for a given instance ID.
   *
   * @param id - Instance ID.
   * @returns Full path string, or null if instance not in cache.
   *
   * @example
   * ```typescript
   * cache.path_build(64306)
   * // '/proc/feeds/feed_1107/pl-dircopy_64267/.../pl-neurofiles-push_64306'
   * ```
   */
  path_build(id: number): string | null {
    const inst: ProcInstance | undefined = this.instances.get(id);
    if (!inst) return null;
    const segments: string[] = [];
    let current: ProcInstance | undefined = inst;
    while (current) {
      segments.unshift(`${current.pluginName}_${current.id}`);
      if (current.parentID === null) break;
      current = this.instances.get(current.parentID);
    }
    return `/proc/feeds/feed_${inst.feedID}/${segments.join('/')}`;
  }

  /**
   * Searches cached instances by numeric ID or plugin name substring.
   */
  instances_find(term: string): ProcInstance[] {
    const numeric: number = parseInt(term, 10);
    const isID: boolean = !isNaN(numeric) && String(numeric) === term;
    if (isID) {
      const hit: ProcInstance | undefined = this.instances.get(numeric);
      return hit ? [hit] : [];
    }
    const lower: string = term.toLowerCase();
    return Array.from(this.instances.values())
      .filter((i: ProcInstance) => i.pluginName.toLowerCase().includes(lower));
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  built_set(): void {
    this._built = true;
  }

  /**
   * Clears all cache data. Called before a full rebuild.
   */
  cache_clear(): void {
    this.feeds.clear();
    this.instances.clear();
    this.feedRoots.clear();
    this.children.clear();
    this.topologyLoaded.clear();
    this.loading.clear();
    this._warmupComplete = false;
    this._warmupProgress = { loaded: 0, total: 0 };
    this._built = false;
  }
}

/**
 * Returns the singleton ProcCache instance.
 *
 * @example
 * ```typescript
 * const cache = procCache_get();
 * cache.instance_add({ id: 789, feedID: 123, parentID: 456,
 *                      pluginName: 'pl-fshack', params: null });
 * ```
 */
export function procCache_get(): ProcCache {
  return ProcCache.instance_get();
}

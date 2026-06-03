/**
 * @file Process Cache
 *
 * Session-scoped cache of all ChRIS plugin instances (jobs), organised as a
 * DAG mirroring the /proc/feeds/ virtual filesystem. Structure is permanent;
 * only status fields for non-terminal nodes are refreshed on access.
 *
 * @module
 */

/** Execution statuses that never change once reached. */
const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'finishedSuccessfully',
  'finishedWithError',
  'cancelled',
]);

/**
 * A single plugin instance entry in the proc cache.
 */
export interface ProcInstance {
  id: number;
  feedID: number;
  /** null for root nodes (direct children of a feed). */
  parentID: number | null;
  pluginName: string;
  status: string;
  statusIsTerminal: boolean;
  /** key=value pairs as run; null until populated from API data. */
  params: Record<string, unknown> | null;
}

/**
 * Feed-level metadata in the proc cache.
 */
export interface ProcFeed {
  id: number;
  title: string;
}

/**
 * Session-scoped cache of all visible plugin instances and their feeds.
 * Structured for O(1) lookup by ID and O(children) child listing.
 */
export class ProcCache {
  private static _instance: ProcCache | null = null;

  /** All instances keyed by instance ID. */
  private instances: Map<number, ProcInstance> = new Map();

  /** Root instance IDs per feed (parentID === null). */
  private feedRoots: Map<number, number[]> = new Map();

  /** Child instance IDs keyed by parent instance ID. */
  private children: Map<number, number[]> = new Map();

  /** Feed metadata keyed by feed ID. */
  private feeds: Map<number, ProcFeed> = new Map();

  /** Whether an initial build has completed. */
  private _built: boolean = false;

  private constructor() {}

  /**
   * Returns the singleton ProcCache instance.
   */
  static instance_get(): ProcCache {
    if (!ProcCache._instance) {
      ProcCache._instance = new ProcCache();
    }
    return ProcCache._instance;
  }

  /**
   * Whether the cache has been populated at least once.
   */
  get built(): boolean {
    return this._built;
  }

  /**
   * Adds or updates a feed entry.
   *
   * @param feed - Feed metadata to store.
   */
  feed_add(feed: ProcFeed): void {
    this.feeds.set(feed.id, feed);
    if (!this.feedRoots.has(feed.id)) {
      this.feedRoots.set(feed.id, []);
    }
  }

  /**
   * Adds or updates a plugin instance entry.
   *
   * @param inst - Instance data (statusIsTerminal is derived automatically).
   */
  instance_add(inst: Omit<ProcInstance, 'statusIsTerminal'>): void {
    const full: ProcInstance = {
      ...inst,
      statusIsTerminal: TERMINAL_STATUSES.has(inst.status),
    };
    this.instances.set(inst.id, full);

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

  /**
   * Updates only the status of an existing instance.
   *
   * @param id - Instance ID.
   * @param status - New status string.
   */
  status_update(id: number, status: string): void {
    const inst: ProcInstance | undefined = this.instances.get(id);
    if (inst) {
      inst.status = status;
      inst.statusIsTerminal = TERMINAL_STATUSES.has(status);
    }
  }

  /**
   * Removes an instance from the cache entirely.
   *
   * @param id - Instance ID to remove.
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
   * Removes a feed and all its instances from the cache.
   *
   * @param feedID - Feed ID to remove.
   */
  feed_remove(feedID: number): void {
    this.feeds.delete(feedID);
    const allInstances: ProcInstance[] = Array.from(this.instances.values())
      .filter((i: ProcInstance) => i.feedID === feedID);
    for (const inst of allInstances) {
      this.instance_remove(inst.id);
    }
    this.feedRoots.delete(feedID);
  }

  /**
   * Returns all feed IDs in the cache.
   */
  feedIDs_get(): number[] {
    return Array.from(this.feeds.keys());
  }

  /**
   * Returns feed metadata for a given feed ID, or undefined.
   *
   * @param feedID - Feed ID.
   */
  feed_get(feedID: number): ProcFeed | undefined {
    return this.feeds.get(feedID);
  }

  /**
   * Returns root instance IDs for a feed (nodes with no parent).
   *
   * @param feedID - Feed ID.
   */
  feedRoots_get(feedID: number): number[] {
    return this.feedRoots.get(feedID) ?? [];
  }

  /**
   * Returns child instance IDs for a given parent instance.
   *
   * @param parentID - Parent instance ID.
   */
  children_get(parentID: number): number[] {
    return this.children.get(parentID) ?? [];
  }

  /**
   * Returns a single instance by ID, or undefined.
   *
   * @param id - Instance ID.
   */
  instance_get(id: number): ProcInstance | undefined {
    return this.instances.get(id);
  }

  /**
   * Returns all non-terminal instances (candidates for status refresh).
   */
  nonTerminal_get(): ProcInstance[] {
    return Array.from(this.instances.values())
      .filter((i: ProcInstance) => !i.statusIsTerminal);
  }

  /**
   * Clears all cache data. Called before a full rebuild.
   */
  cache_clear(): void {
    this.instances.clear();
    this.feedRoots.clear();
    this.children.clear();
    this.feeds.clear();
    this._built = false;
  }

  /**
   * Marks the cache as fully built.
   */
  built_set(): void {
    this._built = true;
  }
}

/**
 * Returns the singleton ProcCache instance.
 *
 * @returns The ProcCache singleton.
 *
 * @example
 * ```typescript
 * const cache = procCache_get();
 * cache.instance_add({ id: 789, feedID: 123, parentID: 456, pluginName: 'pl-fshack', status: 'scheduled', params: null });
 * ```
 */
export function procCache_get(): ProcCache {
  return ProcCache.instance_get();
}

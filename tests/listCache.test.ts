/**
 * @file Unit tests for enhanced ListCache.
 *
 * Tests TTL expiration, dirty flag tracking, LRU eviction, and optimistic updates.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { listCache_get, ListCache } from '../src/cache/listCache.js';
import type { CacheResult, CacheStats } from '../src/cache/listCache.js';

/**
 * Helper to sleep for testing TTL expiration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('ListCache Enhanced', () => {
  let cache: ListCache;

  beforeEach(() => {
    cache = listCache_get();
    cache.stats_reset();
    cache.cache_invalidate();  // Clear all entries
  });

  describe('Singleton pattern', () => {
    it('should return same instance', () => {
      const cache1 = listCache_get();
      const cache2 = listCache_get();
      expect(cache1).toBe(cache2);
    });
  });

  describe('Basic get/set', () => {
    it('should store and retrieve data', () => {
      const testData = ['file1.txt', 'file2.txt'];
      cache.cache_set('/test', testData);

      const result = cache.cache_get('/test');
      expect(result).not.toBeNull();
      expect(result?.data).toEqual(testData);
    });

    it('should return null for cache miss', () => {
      const result = cache.cache_get('/nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('should return fresh=true within TTL', () => {
      cache.cache_set('/test', ['data'], { ttl: 1000 });
      const result = cache.cache_get('/test');

      expect(result).not.toBeNull();
      expect(result?.fresh).toBe(true);
    });

    it('should return fresh=false after TTL expires', async () => {
      cache.cache_set('/test', ['data'], { ttl: 100 });
      await sleep(150);

      const result = cache.cache_get('/test');
      expect(result).not.toBeNull();
      expect(result?.fresh).toBe(false);
      expect(result?.data).toEqual(['data']);  // Still serveable
    });

    it('should use default TTL for unconfigured paths', () => {
      cache.cache_set('/unconfigured/path', ['data']);
      const result = cache.cache_get('/unconfigured/path');

      expect(result).not.toBeNull();
      expect(result?.fresh).toBe(true);
      // Default TTL is 3 minutes, so should be fresh
    });

    it('should use path-specific TTL for /PUBLIC', () => {
      // /PUBLIC has 10 minute TTL
      cache.cache_set('/PUBLIC', ['data']);
      const result = cache.cache_get('/PUBLIC');

      expect(result).not.toBeNull();
      expect(result?.fresh).toBe(true);
      // Should use longer TTL (checked internally)
    });

    it('should use path-specific TTL for /bin', () => {
      // /bin has 1 hour TTL
      cache.cache_set('/bin', ['data']);
      const result = cache.cache_get('/bin');

      expect(result).not.toBeNull();
      expect(result?.fresh).toBe(true);
    });

    it('should use pattern matching for /feeds/* paths', () => {
      cache.cache_set('/feeds/123/nodes/45', ['data']);
      const result = cache.cache_get('/feeds/123/nodes/45');

      expect(result).not.toBeNull();
      expect(result?.fresh).toBe(true);
      // Should match /feeds/* pattern
    });

    it('should allow TTL override', async () => {
      cache.cache_set('/test', ['data'], { ttl: 50 });
      await sleep(75);

      const result = cache.cache_get('/test');
      expect(result?.fresh).toBe(false);
    });
  });

  describe('Dirty flag tracking', () => {
    it('should mark entry as dirty', () => {
      cache.cache_set('/test', ['data']);
      cache.cache_markDirty('/test');

      const result = cache.cache_get('/test');
      expect(result).not.toBeNull();
      expect(result?.fresh).toBe(false);  // Dirty = not fresh
    });

    it('should not fail if marking non-existent path', () => {
      expect(() => cache.cache_markDirty('/nonexistent')).not.toThrow();
    });

    it('should mark fresh entry as stale when dirty', () => {
      cache.cache_set('/test', ['data'], { ttl: 10000 });  // Long TTL
      const before = cache.cache_get('/test');
      expect(before?.fresh).toBe(true);

      cache.cache_markDirty('/test');
      const after = cache.cache_get('/test');
      expect(after?.fresh).toBe(false);
    });

    it('should allow marking dirty at creation time', () => {
      cache.cache_set('/test', ['data'], { dirty: true });
      const result = cache.cache_get('/test');

      expect(result).not.toBeNull();
      expect(result?.fresh).toBe(false);
    });
  });

  describe('Optimistic updates', () => {
    it('should update cached data with updater function', () => {
      cache.cache_set('/test', [1, 2, 3]);
      cache.cache_update('/test', (arr: number[]) => arr.filter((x: number) => x !== 2));

      const result = cache.cache_get('/test');
      expect(result?.data).toEqual([1, 3]);
    });

    it('should reset timestamp after update', async () => {
      cache.cache_set('/test', ['old'], { ttl: 100 });
      await sleep(75);  // Almost expired

      cache.cache_update('/test', () => ['new']);

      const result = cache.cache_get('/test');
      expect(result?.fresh).toBe(true);  // Fresh again after update
    });

    it('should clear dirty flag after update', () => {
      cache.cache_set('/test', ['data']);
      cache.cache_markDirty('/test');
      expect(cache.cache_get('/test')?.fresh).toBe(false);

      cache.cache_update('/test', (data: string[]) => data);

      const result = cache.cache_get('/test');
      expect(result?.fresh).toBe(true);  // Clean after update
    });

    it('should not fail if updating non-existent path', () => {
      expect(() => cache.cache_update('/nonexistent', (x: any) => x)).not.toThrow();
    });

    it('should support complex transformations', () => {
      interface Item { name: string; size: number }
      const items: Item[] = [
        { name: 'file1.txt', size: 100 },
        { name: 'file2.txt', size: 200 },
      ];

      cache.cache_set('/test', items);
      cache.cache_update('/test', (arr: Item[]) => {
        return arr.map(item => ({ ...item, size: item.size * 2 }));
      });

      const result = cache.cache_get('/test');
      expect(result?.data).toEqual([
        { name: 'file1.txt', size: 200 },
        { name: 'file2.txt', size: 400 },
      ]);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when maxEntries exceeded', () => {
      // Override maxEntries for testing
      (cache as any).maxEntries = 3;

      cache.cache_set('/a', 'a');
      cache.cache_set('/b', 'b');
      cache.cache_set('/c', 'c');
      cache.cache_set('/d', 'd');  // Should evict /a

      expect(cache.cache_get('/a')).toBeNull();
      expect(cache.cache_get('/d')).not.toBeNull();
    });

    it('should move accessed entries to end (LRU)', () => {
      (cache as any).maxEntries = 3;

      cache.cache_set('/a', 'a');
      cache.cache_set('/b', 'b');
      cache.cache_set('/c', 'c');
      cache.cache_get('/a');  // Access /a (move to end)
      cache.cache_set('/d', 'd');  // Should evict /b, not /a

      expect(cache.cache_get('/a')).not.toBeNull();
      expect(cache.cache_get('/b')).toBeNull();
      expect(cache.cache_get('/c')).not.toBeNull();
      expect(cache.cache_get('/d')).not.toBeNull();
    });

    it('should move re-set entries to end', () => {
      (cache as any).maxEntries = 3;

      cache.cache_set('/a', 'a');
      cache.cache_set('/b', 'b');
      cache.cache_set('/c', 'c');
      cache.cache_set('/a', 'a-updated');  // Re-set /a (move to end)
      cache.cache_set('/d', 'd');  // Should evict /b, not /a

      expect(cache.cache_get('/a')).not.toBeNull();
      expect(cache.cache_get('/a')?.data).toBe('a-updated');
      expect(cache.cache_get('/b')).toBeNull();
    });

    it('should track eviction count', () => {
      (cache as any).maxEntries = 2;

      cache.cache_set('/a', 'a');
      cache.cache_set('/b', 'b');
      cache.cache_set('/c', 'c');  // Evicts /a
      cache.cache_set('/d', 'd');  // Evicts /b

      const stats = cache.stats_get();
      expect(stats.evictions).toBe(2);
    });
  });

  describe('Statistics tracking', () => {
    it('should track hits for fresh cache', () => {
      cache.cache_set('/test', ['data']);
      cache.cache_get('/test');

      const stats = cache.stats_get();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
      expect(stats.staleHits).toBe(0);
    });

    it('should track misses', () => {
      cache.cache_get('/nonexistent');

      const stats = cache.stats_get();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
      expect(stats.staleHits).toBe(0);
    });

    it('should track stale hits', async () => {
      cache.cache_set('/test', ['data'], { ttl: 50 });
      await sleep(75);
      cache.cache_get('/test');  // Stale hit

      const stats = cache.stats_get();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.staleHits).toBe(1);
    });

    it('should track entries count', () => {
      // Reset maxEntries in case previous test modified it
      (cache as any).maxEntries = 100;

      cache.cache_set('/a', 'a');
      cache.cache_set('/b', 'b');
      cache.cache_set('/c', 'c');

      const stats = cache.stats_get();
      expect(stats.entries).toBe(3);
    });

    it('should estimate total size', () => {
      cache.cache_set('/test', ['file1.txt', 'file2.txt']);

      const stats = cache.stats_get();
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should reset statistics', () => {
      cache.cache_set('/test', ['data']);
      cache.cache_get('/test');
      cache.cache_get('/nonexistent');

      cache.stats_reset();

      const stats = cache.stats_get();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.staleHits).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate specific path', () => {
      cache.cache_set('/a', 'a');
      cache.cache_set('/b', 'b');

      cache.cache_invalidate('/a');

      expect(cache.cache_get('/a')).toBeNull();
      expect(cache.cache_get('/b')).not.toBeNull();
    });

    it('should clear entire cache when no path specified', () => {
      cache.cache_set('/a', 'a');
      cache.cache_set('/b', 'b');

      cache.cache_invalidate();

      expect(cache.cache_get('/a')).toBeNull();
      expect(cache.cache_get('/b')).toBeNull();
      expect(cache.stats_get().entries).toBe(0);
    });
  });

  describe('Backward compatibility - cwd_update', () => {
    it('should not crash when called (deprecated)', () => {
      cache.cache_set('/PUBLIC', ['data']);
      expect(() => cache.cwd_update('/home')).not.toThrow();

      // Cache should NOT be cleared (deprecated behavior)
      const result = cache.cache_get('/PUBLIC');
      expect(result).not.toBeNull();
    });
  });

  describe('CacheResult age tracking', () => {
    it('should return accurate age', async () => {
      cache.cache_set('/test', ['data']);
      await sleep(100);

      const result = cache.cache_get('/test');
      expect(result).not.toBeNull();
      expect(result!.age).toBeGreaterThanOrEqual(100);
      expect(result!.age).toBeLessThan(150);  // Allow some slack
    });

    it('should reset age after update', async () => {
      cache.cache_set('/test', ['data']);
      await sleep(100);

      cache.cache_update('/test', (data: string[]) => data);

      const result = cache.cache_get('/test');
      expect(result).not.toBeNull();
      expect(result!.age).toBeLessThan(50);  // Recently updated
    });
  });

  describe('Edge cases', () => {
    it('should handle empty data', () => {
      cache.cache_set('/empty', []);
      const result = cache.cache_get('/empty');

      expect(result).not.toBeNull();
      expect(result?.data).toEqual([]);
    });

    it('should handle null data', () => {
      cache.cache_set('/null', null);
      const result = cache.cache_get('/null');

      expect(result).not.toBeNull();
      expect(result?.data).toBeNull();
    });

    it('should handle complex nested objects', () => {
      const complexData = {
        files: [
          { name: 'file1.txt', metadata: { size: 100, owner: 'user1' } },
          { name: 'file2.txt', metadata: { size: 200, owner: 'user2' } },
        ],
        directories: ['dir1', 'dir2'],
      };

      cache.cache_set('/complex', complexData);
      const result = cache.cache_get('/complex');

      expect(result).not.toBeNull();
      expect(result?.data).toEqual(complexData);
    });

    it('should handle paths with special characters', () => {
      const specialPath = '/feeds/123/nodes/45-special_name';
      cache.cache_set(specialPath, ['data']);
      const result = cache.cache_get(specialPath);

      expect(result).not.toBeNull();
    });

    it('should handle very long TTL', () => {
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      cache.cache_set('/long-ttl', ['data'], { ttl: oneYear });

      const result = cache.cache_get('/long-ttl');
      expect(result?.fresh).toBe(true);
    });

    it('should handle zero TTL (immediate expiration)', () => {
      cache.cache_set('/immediate', ['data'], { ttl: 0 });

      const result = cache.cache_get('/immediate');
      expect(result).not.toBeNull();
      expect(result?.fresh).toBe(false);  // Already expired
    });
  });
});

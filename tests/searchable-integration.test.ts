/**
 * @file Searchable integration tests
 *
 * Tests the integration of Searchable class with ChRIS plugin and context operations.
 * These tests verify that the refactored code works correctly with both string and
 * Searchable object inputs.
 */

import { Searchable } from '../src/utils/searchable';
import { ChRISPlugin } from '../src/plugins/chrisPlugins';
import { QueryHits } from '../src/utils/keypair';

// Don't mock the ChRISPlugin module - we want to test the real methods
// jest.mock('../src/plugins/chrisPlugins');

// Mock the ChRIS connection
jest.mock('../src/connect/chrisConnection', () => ({
  chrisConnection: {
    client_get: jest.fn().mockResolvedValue({
      getPlugins: jest.fn(),
      createPluginInstance: jest.fn(),
    }),
  },
}));

// Mock the ChRIS context
jest.mock('../src/context/chrisContext', () => ({
  chrisContext: {
    ChRISplugin_get: jest.fn().mockResolvedValue('123'),
  },
  Context: {
    ChRISURL: 'URL',
    ChRISuser: 'user',
    ChRISfolder: 'folder',
    ChRISfeed: 'feed',
    ChRISplugin: 'plugin',
  },
}));

describe('Searchable Integration Tests', () => {
  describe('ChRISPlugin.pluginString_makeSearchable() - Backward Compatibility', () => {
    let plugin: ChRISPlugin;

    beforeEach(() => {
      plugin = new ChRISPlugin();
    });

    it('should convert plain string to "name:" format', () => {
      const result = plugin.pluginString_makeSearchable('pl-dircopy');
      expect(result).toBe('name: pl-dircopy');
    });

    it('should preserve string with colon as-is', () => {
      const result = plugin.pluginString_makeSearchable('name:pl-dircopy');
      expect(result).toBe('name:pl-dircopy');
    });

    it('should handle compound searchables', () => {
      const result = plugin.pluginString_makeSearchable('name:pl-dircopy,version:1.3.2');
      expect(result).toBe('name:pl-dircopy,version:1.3.2');
    });
  });

  describe('ChRISPlugin.pluginIDs_resolve() - String Input', () => {
    let plugin: ChRISPlugin;

    beforeEach(() => {
      plugin = new ChRISPlugin();
      // Mock the actual search to avoid real API calls
      jest.spyOn(plugin, 'pluginIDs_getFromSearchable').mockResolvedValue({
        hits: [123, 456],
      } as QueryHits);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should accept plain string and resolve', async () => {
      const result = await plugin.pluginIDs_resolve('pl-dircopy');
      expect(result).not.toBeNull();
      expect(result?.hits).toEqual([123, 456]);
    });

    it('should accept searchable string with colon', async () => {
      const result = await plugin.pluginIDs_resolve('name:pl-dircopy');
      expect(result).not.toBeNull();
      expect(result?.hits).toEqual([123, 456]);
    });

    it('should accept compound searchable string', async () => {
      const result = await plugin.pluginIDs_resolve('name:pl-dircopy,version:1.3.2');
      expect(result).not.toBeNull();
      expect(result?.hits).toEqual([123, 456]);
    });

    it('should reject invalid searchable string', async () => {
      const result = await plugin.pluginIDs_resolve('');
      expect(result).toBeNull();
    });

    it('should reject whitespace-only searchable', async () => {
      const result = await plugin.pluginIDs_resolve('   ');
      expect(result).toBeNull();
    });
  });

  describe('ChRISPlugin.pluginIDs_resolve() - Searchable Object Input', () => {
    let plugin: ChRISPlugin;

    beforeEach(() => {
      plugin = new ChRISPlugin();
      jest.spyOn(plugin, 'pluginIDs_getFromSearchable').mockResolvedValue({
        hits: [789],
      } as QueryHits);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should accept simple Searchable object', async () => {
      const searchable = Searchable.simple('pl-dircopy');
      const result = await plugin.pluginIDs_resolve(searchable);
      expect(result).not.toBeNull();
      expect(result?.hits).toEqual([789]);
    });

    it('should accept compound Searchable object', async () => {
      const searchable = Searchable.compound('name:pl-dircopy,version:1.3.2');
      const result = await plugin.pluginIDs_resolve(searchable);
      expect(result).not.toBeNull();
      expect(result?.hits).toEqual([789]);
    });

    it('should accept batch Searchable object', async () => {
      const searchable = Searchable.batch('id:77++id:33');
      const result = await plugin.pluginIDs_resolve(searchable);
      expect(result).not.toBeNull();
    });

    it('should reject invalid Searchable object', async () => {
      const searchable = Searchable.from('');
      const result = await plugin.pluginIDs_resolve(searchable);
      expect(result).toBeNull();
    });
  });

  describe('ChRISPlugin.pluginIDs_getFromSearchable() - String and Object', () => {
    let plugin: ChRISPlugin;

    beforeEach(() => {
      plugin = new ChRISPlugin();
      // Mock pluginData_getFromSearch to avoid real API calls
      jest.spyOn(plugin, 'pluginData_getFromSearch').mockResolvedValue({
        hits: [42],
      } as QueryHits);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should accept string input and convert internally', async () => {
      const result = await plugin.pluginIDs_getFromSearchable('pl-dircopy');
      expect(result).not.toBeNull();
      expect(result?.hits).toEqual([42]);
    });

    it('should accept Searchable object directly', async () => {
      const searchable = Searchable.from('name:pl-dircopy');
      const result = await plugin.pluginIDs_getFromSearchable(searchable);
      expect(result).not.toBeNull();
      expect(result?.hits).toEqual([42]);
    });

    it('should call toNormalizedString() on Searchable', async () => {
      const searchable = Searchable.simple('pl-dircopy');
      const spy = jest.spyOn(searchable, 'toNormalizedString');

      await plugin.pluginIDs_getFromSearchable(searchable);

      expect(spy).toHaveBeenCalled();
    });

    it('should handle simple searchable normalization', async () => {
      const searchable = Searchable.simple('pl-test');
      await plugin.pluginIDs_getFromSearchable(searchable);

      // Verify pluginData_getFromSearch was called with normalized string
      expect(plugin.pluginData_getFromSearch).toHaveBeenCalledWith(
        { search: 'name: pl-test' },
        'id'
      );
    });

    it('should preserve compound searchable format', async () => {
      const searchable = Searchable.compound('name:pl-test,version:1.0');
      await plugin.pluginIDs_getFromSearchable(searchable);

      expect(plugin.pluginData_getFromSearch).toHaveBeenCalledWith(
        { search: 'name:pl-test,version:1.0' },
        'id'
      );
    });
  });

  describe('Mixed String and Searchable Usage', () => {
    let plugin: ChRISPlugin;

    beforeEach(() => {
      plugin = new ChRISPlugin();
      jest.spyOn(plugin, 'pluginData_getFromSearch').mockResolvedValue({
        hits: [100, 200],
      } as QueryHits);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should produce same result for string vs Searchable', async () => {
      const stringResult = await plugin.pluginIDs_resolve('pl-dircopy');
      const searchableResult = await plugin.pluginIDs_resolve(Searchable.from('pl-dircopy'));

      expect(stringResult).toEqual(searchableResult);
    });

    it('should normalize both to same API call', async () => {
      const calls: any[] = [];
      jest.spyOn(plugin, 'pluginData_getFromSearch').mockImplementation((...args) => {
        calls.push(args);
        return Promise.resolve({ hits: [1] } as QueryHits);
      });

      await plugin.pluginIDs_getFromSearchable('pl-dircopy');
      await plugin.pluginIDs_getFromSearchable(Searchable.from('pl-dircopy'));

      // Both should result in the same normalized search string
      expect(calls[0][0].search).toBe('name: pl-dircopy');
      expect(calls[1][0].search).toBe('name: pl-dircopy');
    });
  });

  describe('Error Handling', () => {
    let plugin: ChRISPlugin;

    beforeEach(() => {
      plugin = new ChRISPlugin();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should handle empty search results', async () => {
      jest.spyOn(plugin, 'pluginIDs_getFromSearchable').mockResolvedValue({
        hits: [],
      } as QueryHits);

      const result = await plugin.pluginIDs_resolve('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle null search results', async () => {
      jest.spyOn(plugin, 'pluginIDs_getFromSearchable').mockResolvedValue(null);

      const result = await plugin.pluginIDs_resolve('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      jest.spyOn(plugin, 'pluginData_getFromSearch').mockRejectedValue(
        new Error('API Error')
      );

      await expect(
        plugin.pluginIDs_getFromSearchable('pl-test')
      ).rejects.toThrow('API Error');
    });
  });

  describe('Real-world Scenarios', () => {
    let plugin: ChRISPlugin;

    beforeEach(() => {
      plugin = new ChRISPlugin();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should handle plugin search by exact name', async () => {
      jest.spyOn(plugin, 'pluginData_getFromSearch').mockResolvedValue({
        hits: [42],
      } as QueryHits);

      const result = await plugin.pluginIDs_resolve('name_exact:pl-dircopy');
      expect(result?.hits).toEqual([42]);
    });

    it('should handle plugin search by version', async () => {
      jest.spyOn(plugin, 'pluginData_getFromSearch').mockResolvedValue({
        hits: [99],
      } as QueryHits);

      const searchable = Searchable.compound('name:pl-dircopy,version:2.1.1');
      const result = await plugin.pluginIDs_resolve(searchable);
      expect(result?.hits).toEqual([99]);
    });

    it('should handle multiple matches with warning', async () => {
      jest.spyOn(plugin, 'pluginData_getFromSearch').mockResolvedValue({
        hits: [1, 2, 3],
      } as QueryHits);

      const result = await plugin.pluginIDs_getFromSearchable('name:pl-simple');
      expect(result?.hits).toEqual([1, 2, 3]);
      expect(result?.hits.length).toBeGreaterThan(1);
    });

    it('should handle batch searchable components individually', async () => {
      const batch = Searchable.batch('id:77++id:33++name:pl-test');
      const parts = batch.toBatchSearchables();

      expect(parts).toHaveLength(3);

      // Each part should be usable independently
      for (const part of parts) {
        expect(part.validate()).toBe(true);
        expect(part.isBatch()).toBe(false);
      }
    });

    it('should handle context URI searchable format', async () => {
      jest.spyOn(plugin, 'pluginData_getFromSearch').mockResolvedValue({
        hits: [123],
      } as QueryHits);

      // Context URI might have: ?plugin=name_exact:pl-dircopy,version:1.3.2
      const searchable = Searchable.from('name_exact:pl-dircopy,version:1.3.2');
      const result = await plugin.pluginIDs_resolve(searchable);

      expect(result?.hits).toEqual([123]);
    });
  });

  describe('Type Safety', () => {
    it('should accept string literal types', async () => {
      const plugin = new ChRISPlugin();
      jest.spyOn(plugin, 'pluginIDs_getFromSearchable').mockResolvedValue({
        hits: [1],
      } as QueryHits);

      // TypeScript should allow string literals
      const str: string = 'pl-dircopy';
      await plugin.pluginIDs_resolve(str);

      const literal = 'pl-dircopy' as const;
      await plugin.pluginIDs_resolve(literal);
    });

    it('should accept Searchable type', async () => {
      const plugin = new ChRISPlugin();
      jest.spyOn(plugin, 'pluginIDs_getFromSearchable').mockResolvedValue({
        hits: [1],
      } as QueryHits);

      const searchable: Searchable = Searchable.from('test');
      await plugin.pluginIDs_resolve(searchable);
    });

    it('should accept union type string | Searchable', async () => {
      const plugin = new ChRISPlugin();
      jest.spyOn(plugin, 'pluginIDs_getFromSearchable').mockResolvedValue({
        hits: [1],
      } as QueryHits);

      const input: string | Searchable = Math.random() > 0.5
        ? 'pl-test'
        : Searchable.from('pl-test');

      await plugin.pluginIDs_resolve(input);
    });
  });
});

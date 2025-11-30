/**
 * @file Searchable class tests
 *
 * Comprehensive test coverage for the Searchable class and its integration
 * with ChRIS resource searching.
 */

import { Searchable, SearchableType } from '../src/utils/searchable';

describe('Searchable Class', () => {
  describe('Static Factory: Searchable.from()', () => {
    it('should detect simple searchable (plain name)', () => {
      const s = Searchable.from('pl-dircopy');
      expect(s.type).toBe('simple');
      expect(s.isSimple()).toBe(true);
      expect(s.isCompound()).toBe(false);
      expect(s.isBatch()).toBe(false);
    });

    it('should detect compound searchable (key:value)', () => {
      const s = Searchable.from('name:pl-dircopy');
      expect(s.type).toBe('compound');
      expect(s.isSimple()).toBe(false);
      expect(s.isCompound()).toBe(true);
      expect(s.isBatch()).toBe(false);
    });

    it('should detect batch searchable (++ separator)', () => {
      const s = Searchable.from('id:77++id:33');
      expect(s.type).toBe('batch');
      expect(s.isSimple()).toBe(false);
      expect(s.isCompound()).toBe(false);
      expect(s.isBatch()).toBe(true);
    });

    it('should trim whitespace from input', () => {
      const s = Searchable.from('  pl-dircopy  ');
      expect(s.raw).toBe('pl-dircopy');
    });

    it('should prioritize batch over compound (++ takes precedence)', () => {
      const s = Searchable.from('name:foo++id:123');
      expect(s.type).toBe('batch');
    });
  });

  describe('Static Factory: Searchable.simple()', () => {
    it('should create simple searchable from name', () => {
      const s = Searchable.simple('pl-dircopy');
      expect(s.type).toBe('simple');
      expect(s.raw).toBe('pl-dircopy');
    });

    it('should parse as name field', () => {
      const s = Searchable.simple('pl-dircopy');
      const params = s.toQueryParams();
      expect(params).toEqual({ name: 'pl-dircopy' });
    });

    it('should normalize to "name:" format', () => {
      const s = Searchable.simple('pl-dircopy');
      expect(s.toNormalizedString()).toBe('name: pl-dircopy');
    });

    it('should trim whitespace', () => {
      const s = Searchable.simple('  pl-test  ');
      expect(s.raw).toBe('pl-test');
    });
  });

  describe('Static Factory: Searchable.compound()', () => {
    it('should create compound searchable from key:value pairs', () => {
      const s = Searchable.compound('name:pl-dircopy,version:1.3.2');
      expect(s.type).toBe('compound');
    });

    it('should parse single key:value pair', () => {
      const s = Searchable.compound('id:123');
      const params = s.toQueryParams();
      expect(params).toEqual({ id: '123' });
    });

    it('should parse multiple key:value pairs', () => {
      const s = Searchable.compound('name:pl-dircopy,version:1.3.2');
      const params = s.toQueryParams();
      expect(params).toEqual({
        name: 'pl-dircopy',
        version: '1.3.2'
      });
    });

    it('should handle spaces around delimiters', () => {
      const s = Searchable.compound('name: pl-dircopy , version: 1.3.2');
      const params = s.toQueryParams();
      expect(params).toEqual({
        name: 'pl-dircopy',
        version: '1.3.2'
      });
    });

    it('should handle values with colons (URLs)', () => {
      const s = Searchable.compound('url:http://localhost:8000');
      const params = s.toQueryParams();
      expect(params).toEqual({ url: 'http://localhost:8000' });
    });

    it('should preserve raw input in toNormalizedString()', () => {
      const input = 'name:pl-dircopy,version:1.3.2';
      const s = Searchable.compound(input);
      expect(s.toNormalizedString()).toBe(input);
    });
  });

  describe('Static Factory: Searchable.batch()', () => {
    it('should create batch searchable from ++ separated values', () => {
      const s = Searchable.batch('id:77++id:33');
      expect(s.type).toBe('batch');
    });

    it('should preserve raw input', () => {
      const s = Searchable.batch('id:77++id:33++name:pl-test');
      expect(s.raw).toBe('id:77++id:33++name:pl-test');
    });

    it('should return placeholder in toQueryParams()', () => {
      const s = Searchable.batch('id:77++id:33');
      const params = s.toQueryParams();
      expect(params).toEqual({ _batch: 'id:77++id:33' });
    });
  });

  describe('Type Checking Methods', () => {
    it('isSimple() should return true only for simple searchables', () => {
      expect(Searchable.simple('foo').isSimple()).toBe(true);
      expect(Searchable.compound('name:foo').isSimple()).toBe(false);
      expect(Searchable.batch('id:1++id:2').isSimple()).toBe(false);
    });

    it('isCompound() should return true only for compound searchables', () => {
      expect(Searchable.simple('foo').isCompound()).toBe(false);
      expect(Searchable.compound('name:foo').isCompound()).toBe(true);
      expect(Searchable.batch('id:1++id:2').isCompound()).toBe(false);
    });

    it('isBatch() should return true only for batch searchables', () => {
      expect(Searchable.simple('foo').isBatch()).toBe(false);
      expect(Searchable.compound('name:foo').isBatch()).toBe(false);
      expect(Searchable.batch('id:1++id:2').isBatch()).toBe(true);
    });
  });

  describe('Conversion: toQueryParams()', () => {
    it('should convert simple to name parameter', () => {
      const s = Searchable.simple('pl-dircopy');
      expect(s.toQueryParams()).toEqual({ name: 'pl-dircopy' });
    });

    it('should convert compound to key-value parameters', () => {
      const s = Searchable.compound('name:pl-dircopy,version:1.3.2,owner:chris');
      expect(s.toQueryParams()).toEqual({
        name: 'pl-dircopy',
        version: '1.3.2',
        owner: 'chris'
      });
    });

    it('should return immutable copy (not reference)', () => {
      const s = Searchable.simple('test');
      const params1 = s.toQueryParams();
      const params2 = s.toQueryParams();
      expect(params1).not.toBe(params2); // Different objects
      expect(params1).toEqual(params2);  // Same values
    });

    it('should preserve special characters in values', () => {
      const s = Searchable.compound('pattern:test-*.txt');
      expect(s.toQueryParams()).toEqual({ pattern: 'test-*.txt' });
    });
  });

  describe('Conversion: toBatchSearchables()', () => {
    it('should split batch into individual searchables', () => {
      const s = Searchable.batch('id:77++id:33++name:pl-test');
      const parts = s.toBatchSearchables();

      expect(parts).toHaveLength(3);
      expect(parts[0].raw).toBe('id:77');
      expect(parts[1].raw).toBe('id:33');
      expect(parts[2].raw).toBe('name:pl-test');
    });

    it('should correctly type individual parts', () => {
      const s = Searchable.batch('pl-simple++name:pl-complex,version:1.0');
      const parts = s.toBatchSearchables();

      expect(parts[0].isSimple()).toBe(true);
      expect(parts[1].isCompound()).toBe(true);
    });

    it('should return single-item array for non-batch', () => {
      const s1 = Searchable.simple('foo');
      expect(s1.toBatchSearchables()).toEqual([s1]);

      const s2 = Searchable.compound('name:bar');
      expect(s2.toBatchSearchables()).toEqual([s2]);
    });

    it('should handle single item with ++ in it', () => {
      const s = Searchable.batch('id:77');
      const parts = s.toBatchSearchables();
      expect(parts).toHaveLength(1);
      expect(parts[0].raw).toBe('id:77');
    });

    it('should trim whitespace from split parts', () => {
      const s = Searchable.batch('id:77 ++ id:33 ++ name:test');
      const parts = s.toBatchSearchables();

      expect(parts[0].raw).toBe('id:77');
      expect(parts[1].raw).toBe('id:33');
      expect(parts[2].raw).toBe('name:test');
    });
  });

  describe('Conversion: toNormalizedString()', () => {
    it('should add "name:" prefix for simple searchables', () => {
      const s = Searchable.simple('pl-dircopy');
      expect(s.toNormalizedString()).toBe('name: pl-dircopy');
    });

    it('should preserve raw input for compound searchables', () => {
      const s = Searchable.compound('name:foo,version:1.0');
      expect(s.toNormalizedString()).toBe('name:foo,version:1.0');
    });

    it('should preserve raw input for batch searchables', () => {
      const s = Searchable.batch('id:1++id:2');
      expect(s.toNormalizedString()).toBe('id:1++id:2');
    });
  });

  describe('Validation: validate()', () => {
    it('should validate simple searchable with name', () => {
      const s = Searchable.simple('pl-dircopy');
      expect(s.validate()).toBe(true);
    });

    it('should validate compound searchable with pairs', () => {
      const s = Searchable.compound('name:foo,version:1.0');
      expect(s.validate()).toBe(true);
    });

    it('should validate batch searchable with valid parts', () => {
      const s = Searchable.batch('id:77++name:test');
      expect(s.validate()).toBe(true);
    });

    it('should invalidate empty string', () => {
      const s = Searchable.from('');
      expect(s.validate()).toBe(false);
    });

    it('should invalidate whitespace-only string', () => {
      const s = Searchable.from('   ');
      expect(s.validate()).toBe(false);
    });

    it('should invalidate compound with no valid pairs', () => {
      const s = Searchable.compound(':::');
      expect(s.validate()).toBe(false);
    });

    it('should invalidate batch with empty parts', () => {
      const s = Searchable.batch('++');
      expect(s.validate()).toBe(false);
    });

    it('should invalidate batch if any part is invalid', () => {
      const s = Searchable.batch('id:77++   ++name:test');
      expect(s.validate()).toBe(false);
    });
  });

  describe('Accessors', () => {
    it('raw should return original input', () => {
      const s = Searchable.from('pl-dircopy');
      expect(s.raw).toBe('pl-dircopy');
    });

    it('type should return searchable type', () => {
      expect(Searchable.simple('foo').type).toBe('simple');
      expect(Searchable.compound('name:foo').type).toBe('compound');
      expect(Searchable.batch('id:1++id:2').type).toBe('batch');
    });
  });

  describe('Serialization', () => {
    it('toString() should return description', () => {
      const s = Searchable.simple('pl-dircopy');
      const str = s.toString();
      expect(str).toContain('Searchable');
      expect(str).toContain('simple');
      expect(str).toContain('pl-dircopy');
    });

    it('toJSON() should return searchable data', () => {
      const s = Searchable.compound('name:foo,version:1.0');
      const json = s.toJSON();

      expect(json.raw).toBe('name:foo,version:1.0');
      expect(json.type).toBe('compound');
      expect(json.parsed).toEqual({ name: 'foo', version: '1.0' });
    });

    it('toJSON() should return immutable copy', () => {
      const s = Searchable.simple('test');
      const json1 = s.toJSON();
      const json2 = s.toJSON();

      expect(json1).not.toBe(json2);
      expect(json1).toEqual(json2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle plugin names with special characters', () => {
      const s = Searchable.simple('pl-test_v2.0-alpha');
      expect(s.toQueryParams()).toEqual({ name: 'pl-test_v2.0-alpha' });
    });

    it('should handle multiple colons in compound values', () => {
      const s = Searchable.compound('url:http://localhost:8000/api/v1');
      expect(s.toQueryParams()).toEqual({
        url: 'http://localhost:8000/api/v1'
      });
    });

    it('should handle empty batch part (consecutive ++)', () => {
      const s = Searchable.batch('id:77++++id:33');
      const parts = s.toBatchSearchables();
      // Should filter out empty strings
      expect(parts.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle numeric-looking strings', () => {
      const s = Searchable.simple('12345');
      expect(s.toQueryParams()).toEqual({ name: '12345' });
    });

    it('should handle very long searchable strings', () => {
      const longName = 'pl-' + 'a'.repeat(1000);
      const s = Searchable.simple(longName);
      expect(s.raw).toBe(longName);
      expect(s.validate()).toBe(true);
    });

    it('should handle searchable with only key, no value', () => {
      const s = Searchable.compound('name:');
      const params = s.toQueryParams();
      // keyPairString_parse should ignore empty values
      expect(Object.keys(params)).not.toContain('name');
    });

    it('should handle unicode characters', () => {
      const s = Searchable.simple('pl-测试-plugin');
      expect(s.toQueryParams()).toEqual({ name: 'pl-测试-plugin' });
    });

    it('should handle batch with one item', () => {
      const s = Searchable.batch('id:77');
      const parts = s.toBatchSearchables();
      expect(parts).toHaveLength(1);
      expect(parts[0].raw).toBe('id:77');
    });
  });

  describe('Real-world Use Cases', () => {
    it('should handle plugin search by name', () => {
      const s = Searchable.from('pl-dircopy');
      expect(s.toNormalizedString()).toBe('name: pl-dircopy');
    });

    it('should handle plugin search by ID', () => {
      const s = Searchable.from('id:123');
      expect(s.toQueryParams()).toEqual({ id: '123' });
    });

    it('should handle plugin search by name and version', () => {
      const s = Searchable.from('name:pl-dircopy,version:2.1.1');
      expect(s.toQueryParams()).toEqual({
        name: 'pl-dircopy',
        version: '2.1.1'
      });
    });

    it('should handle feed search by owner', () => {
      const s = Searchable.from('owner_username:chris');
      expect(s.toQueryParams()).toEqual({ owner_username: 'chris' });
    });

    it('should handle file search by pattern', () => {
      const s = Searchable.from('fname:data.txt');
      expect(s.toQueryParams()).toEqual({ fname: 'data.txt' });
    });

    it('should handle batch plugin deletion', () => {
      const s = Searchable.from('id:77++id:33++name:pl-test');
      const parts = s.toBatchSearchables();

      expect(parts).toHaveLength(3);
      expect(parts[0].toQueryParams()).toEqual({ id: '77' });
      expect(parts[1].toQueryParams()).toEqual({ id: '33' });
      expect(parts[2].toQueryParams()).toEqual({ name: 'pl-test' });
    });

    it('should handle context URI searchables', () => {
      const s = Searchable.from('name_exact:pl-dircopy,version:1.3.2');
      expect(s.toQueryParams()).toEqual({
        name_exact: 'pl-dircopy',
        version: '1.3.2'
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with plain strings (auto-detect)', () => {
      const inputs = [
        'pl-dircopy',
        'name:pl-dircopy',
        'id:77++id:33'
      ];

      inputs.forEach(input => {
        const s = Searchable.from(input);
        expect(s.validate()).toBe(true);
      });
    });

    it('should preserve behavior of old pluginString_makeSearchable', () => {
      // Old: if (plugin.includes(":")) return plugin; else return `name: ${plugin}`;

      const s1 = Searchable.from('pl-dircopy');
      expect(s1.toNormalizedString()).toBe('name: pl-dircopy');

      const s2 = Searchable.from('name:pl-dircopy');
      expect(s2.toNormalizedString()).toBe('name:pl-dircopy');
    });

    it('should work with old ++ splitting logic', () => {
      // Old: searchable.split("++").map((part) => part.trim())

      const s = Searchable.from('id:77++id:33++name:pl-test');
      const parts = s.toBatchSearchables();
      const raws = parts.map(p => p.raw);

      expect(raws).toEqual(['id:77', 'id:33', 'name:pl-test']);
    });
  });
});

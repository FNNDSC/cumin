import {
  dictionary_fromCLI,
  keyPairString_parse,
  keyPairParams_apply,
  params_fromOptions,
  record_extract,
  ChRISElementsGet
} from '../src/utils/keypair';

describe('Keypair Utilities', () => {
  describe('dictionary_fromCLI()', () => {
    it('should parse simple flag', () => {
      const result = dictionary_fromCLI('--verbose');
      expect(result).toEqual({ verbose: true });
    });

    it('should parse flag with value', () => {
      const result = dictionary_fromCLI('--user chris');
      expect(result).toEqual({ user: 'chris' });
    });

    it('should parse multiple flags', () => {
      const result = dictionary_fromCLI('--user chris --password secret');
      expect(result).toEqual({ user: 'chris', password: 'secret' });
    });

    it('should parse numeric values', () => {
      const result = dictionary_fromCLI('--port 8000 --timeout 30');
      expect(result).toEqual({ port: 8000, timeout: 30 });
    });

    it('should parse quoted strings', () => {
      const result = dictionary_fromCLI('--message "hello world"');
      expect(result).toEqual({ message: 'hello world' });
    });

    it('should parse single-quoted strings', () => {
      const result = dictionary_fromCLI("--message 'hello world'");
      expect(result).toEqual({ message: 'hello world' });
    });

    it('should handle single dash flags', () => {
      const result = dictionary_fromCLI('-v -l');
      expect(result).toEqual({ v: true, l: true });
    });

    it('should handle mixed single and double dash', () => {
      const result = dictionary_fromCLI('-v --long');
      expect(result).toEqual({ v: true, long: true });
    });

    it('should handle empty string', () => {
      const result = dictionary_fromCLI('');
      expect(result).toEqual({});
    });

    it('should handle flag at end without value', () => {
      const result = dictionary_fromCLI('--user chris --verbose');
      expect(result).toEqual({ user: 'chris', verbose: true });
    });
  });

  describe('keyPairString_parse()', () => {
    it('should parse single key-value pair', () => {
      const result = keyPairString_parse('name:chris');
      expect(result).toEqual({ name: 'chris' });
    });

    it('should parse multiple key-value pairs', () => {
      const result = keyPairString_parse('name:chris,age:30,city:Boston');
      expect(result).toEqual({ name: 'chris', age: '30', city: 'Boston' });
    });

    it('should handle spaces around delimiters', () => {
      const result = keyPairString_parse('name: chris , age: 30');
      expect(result).toEqual({ name: 'chris', age: '30' });
    });

    it('should handle values with colons', () => {
      const result = keyPairString_parse('url:http://localhost:8000');
      expect(result).toEqual({ url: 'http://localhost:8000' });
    });

    it('should ignore malformed pairs', () => {
      const result = keyPairString_parse('name:chris,invalid,age:30');
      expect(result).toEqual({ name: 'chris', age: '30' });
    });

    it('should handle empty key', () => {
      const result = keyPairString_parse(':value,name:chris');
      expect(result).toEqual({ name: 'chris' });
    });

    it('should handle empty value', () => {
      const result = keyPairString_parse('name:,age:30');
      expect(result).toEqual({ age: '30' });
    });

    it('should handle empty string', () => {
      const result = keyPairString_parse('');
      expect(result).toEqual({});
    });
  });

  describe('keyPairParams_apply()', () => {
    it('should merge search params into base params', () => {
      const baseParams = { limit: 10, offset: 0 };
      const result = keyPairParams_apply(baseParams, 'name:chris,status:active');
      expect(result).toEqual({
        limit: 10,
        offset: 0,
        name: 'chris',
        status: 'active'
      });
    });

    it('should override existing params', () => {
      const baseParams = { limit: 10, name: 'old' };
      const result = keyPairParams_apply(baseParams, 'name:new');
      expect(result).toEqual({ limit: 10, name: 'new' });
    });

    it('should return original params if no search string', () => {
      const baseParams = { limit: 10, offset: 0 };
      const result = keyPairParams_apply(baseParams);
      expect(result).toEqual(baseParams);
    });

    it('should return original params if search string is empty', () => {
      const baseParams = { limit: 10 };
      const result = keyPairParams_apply(baseParams, '');
      expect(result).toEqual(baseParams);
    });

    it('should handle undefined search string', () => {
      const baseParams = { limit: 10 };
      const result = keyPairParams_apply(baseParams, undefined);
      expect(result).toEqual(baseParams);
    });
  });

  describe('params_fromOptions()', () => {
    it('should set default limit and offset', () => {
      const options: ChRISElementsGet = {};
      const result = params_fromOptions(options);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should use page option for limit', () => {
      const options: ChRISElementsGet = { page: '50' };
      const result = params_fromOptions(options);
      expect(result.limit).toBe(50);
    });

    it('should preserve custom offset', () => {
      const options: ChRISElementsGet = { offset: 100 };
      const result = params_fromOptions(options);
      expect(result.offset).toBe(100);
    });

    it('should apply search key-pairs', () => {
      const options: ChRISElementsGet = { search: 'name:chris,status:active' };
      const result = params_fromOptions(options);
      expect(result.name).toBe('chris');
      expect(result.status).toBe('active');
    });

    it('should use custom key-pair field', () => {
      const options: ChRISElementsGet = { params: 'id:123' };
      const result = params_fromOptions(options, 'params');
      expect(result.id).toBe('123');
    });

    it('should handle returnFilter to extract specific fields', () => {
      const options: ChRISElementsGet = {
        name: 'chris',
        age: '30',
        city: 'Boston',
        returnFilter: 'name,age'
      };
      const result = params_fromOptions(options);
      expect(result.name).toBe('chris');
      expect(result.age).toBe('30');
      expect(result.city).toBeUndefined();
      expect(result.returnFilter).toBeUndefined();
    });

    it('should handle returnFilter with spaces', () => {
      const options: ChRISElementsGet = {
        name: 'chris',
        age: '30',
        returnFilter: 'name, age'
      };
      const result = params_fromOptions(options);
      expect(result.name).toBe('chris');
      expect(result.age).toBe('30');
    });

    it('should handle returnFilter with non-existent fields', () => {
      const options: ChRISElementsGet = {
        name: 'chris',
        returnFilter: 'name,missing'
      };
      const result = params_fromOptions(options);
      expect(result.name).toBe('chris');
      expect(result.missing).toBeUndefined();
    });

    it('should combine page, offset, and search', () => {
      const options: ChRISElementsGet = {
        page: '30',
        offset: 10,
        search: 'status:active'
      };
      const result = params_fromOptions(options);
      expect(result.limit).toBe(30);
      expect(result.offset).toBe(10);
      expect(result.status).toBe('active');
    });
  });

  describe('record_extract()', () => {
    it('should extract field from array of records', () => {
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ];
      const result = record_extract(data, 'name');
      expect(result.hits).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should extract id field', () => {
      const data = [
        { id: 101, value: 'a' },
        { id: 102, value: 'b' }
      ];
      const result = record_extract(data, 'id');
      expect(result.hits).toEqual([101, 102]);
    });

    it('should handle empty array', () => {
      const result = record_extract([], 'field');
      expect(result.hits).toEqual([]);
    });

    it('should handle non-existent field', () => {
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ];
      const result = record_extract(data, 'missing');
      expect(result.hits).toEqual([undefined, undefined]);
    });

    it('should extract undefined values', () => {
      const data = [
        { id: 1, value: 'a' },
        { id: 2 },
        { id: 3, value: 'c' }
      ];
      const result = record_extract(data, 'value');
      expect(result.hits).toEqual(['a', undefined, 'c']);
    });

    it('should preserve data types', () => {
      const data = [
        { value: 'string' },
        { value: 42 },
        { value: true },
        { value: null }
      ];
      const result = record_extract(data, 'value');
      expect(result.hits).toEqual(['string', 42, true, null]);
    });
  });
});

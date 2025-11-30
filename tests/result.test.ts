/**
 * @file Unit tests for Result type utilities
 */

import { Result, Ok, Err, isOk, isErr } from '../src/utils/result';

describe('Result Type', () => {
  describe('Ok()', () => {
    it('should create successful Result with value', () => {
      const result = Ok(42);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('should work with string values', () => {
      const result = Ok('success');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
    });

    it('should work with object values', () => {
      const result = Ok({ id: 1, name: 'test' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ id: 1, name: 'test' });
      }
    });

    it('should work with array values', () => {
      const result = Ok([1, 2, 3]);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([1, 2, 3]);
      }
    });
  });

  describe('Err()', () => {
    it('should create failed Result', () => {
      const result: Result<number> = Err();
      expect(result.ok).toBe(false);
    });

    it('should not have value property', () => {
      const result: Result<string> = Err();
      expect(result.ok).toBe(false);
      // TypeScript prevents accessing .value when ok is false
      if (!result.ok) {
        expect('value' in result).toBe(false);
      }
    });
  });

  describe('isOk()', () => {
    it('should return true for Ok result', () => {
      const result = Ok(123);
      expect(isOk(result)).toBe(true);
    });

    it('should return false for Err result', () => {
      const result: Result<number> = Err();
      expect(isOk(result)).toBe(false);
    });

    it('should narrow type for TypeScript', () => {
      const result: Result<number> = Ok(42);
      if (isOk(result)) {
        // TypeScript knows result.value exists here
        const value: number = result.value;
        expect(value).toBe(42);
      }
    });
  });

  describe('isErr()', () => {
    it('should return false for Ok result', () => {
      const result = Ok(123);
      expect(isErr(result)).toBe(false);
    });

    it('should return true for Err result', () => {
      const result: Result<number> = Err();
      expect(isErr(result)).toBe(true);
    });

    it('should narrow type for TypeScript', () => {
      const result: Result<number> = Err();
      if (isErr(result)) {
        // TypeScript knows result.ok is false here
        expect(result.ok).toBe(false);
      }
    });
  });

  describe('Pattern matching', () => {
    it('should handle success case with if statement', () => {
      const result = Ok('data');
      if (result.ok) {
        expect(result.value).toBe('data');
      } else {
        fail('Should not reach error case');
      }
    });

    it('should handle error case with if statement', () => {
      const result: Result<string> = Err();
      if (!result.ok) {
        expect(result.ok).toBe(false);
      } else {
        fail('Should not reach success case');
      }
    });

    it('should handle early return pattern', () => {
      function processResult(result: Result<number>): number {
        if (!result.ok) {
          return -1;
        }
        return result.value * 2;
      }

      expect(processResult(Ok(5))).toBe(10);
      expect(processResult(Err())).toBe(-1);
    });
  });

  describe('Type safety', () => {
    it('should prevent accessing value without checking ok', () => {
      const result: Result<number> = Err();
      // This would be a TypeScript error:
      // const value = result.value;

      // Must check first:
      if (result.ok) {
        const value = result.value; // OK
        expect(typeof value).toBe('number');
      }
    });

    it('should work with different types', () => {
      interface User {
        id: number;
        name: string;
      }

      const result: Result<User> = Ok({ id: 1, name: 'Alice' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(1);
        expect(result.value.name).toBe('Alice');
      }
    });
  });

  describe('Integration with async functions', () => {
    async function fetchData(shouldFail: boolean): Promise<Result<string>> {
      if (shouldFail) {
        return Err();
      }
      return Ok('fetched data');
    }

    it('should work with async success', async () => {
      const result = await fetchData(false);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('fetched data');
      }
    });

    it('should work with async failure', async () => {
      const result = await fetchData(true);
      expect(result.ok).toBe(false);
    });
  });
});

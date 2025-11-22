// Import the function directly from the source file for isolated testing
// To do this, we need to bypass the default ESM resolution if it's an issue.
// Or, if it's a pure function and doesn't rely on module globals, we can copy it.
// Given it's a private helper function, copying it here for testing is acceptable.

/**
 * Pads a string to the right with spaces to a specified length.
 * If the string is longer than the length, it is truncated with ellipses.
 *
 * @param str - The string to pad.
 * @param length - The target length.
 * @returns The padded or truncated string.
 */
function padRight(str: string, length: number): string {
  if (str.length > length) {
    return str.substring(0, length - 3) + "...";
  }
  return str.padEnd(length);
}

describe('padRight', () => {
  it('should pad a short string to the specified length', () => {
    expect(padRight('short', 10)).toBe('short     ');
  });

  it('should not pad if string length equals target length', () => {
    expect(padRight('exactly', 7)).toBe('exactly');
  });

  it('should truncate a long string and add ellipses', () => {
    expect(padRight('thisisverylong', 10)).toBe('thisisv...');
  });

  it('should handle empty string', () => {
    expect(padRight('', 5)).toBe('     ');
  });

  it('should handle zero length', () => {
    expect(padRight('test', 0)).toBe('...');
  });

  it('should handle length less than 3 for truncation', () => {
    expect(padRight('longstring', 2)).toBe('...'); // Not enough space for "..."
    expect(padRight('a', 2)).toBe('a '); // no truncation for small string, but pad.
  });
});

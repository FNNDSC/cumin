/**
 * @file Result Type for Explicit Error Handling
 *
 * Provides a type-safe Result type that forces explicit error checking.
 * Used in conjunction with errorStack for error accumulation and UI display.
 *
 * Pattern:
 * - Functions return Result<T> instead of T | null
 * - Errors are pushed to errorStack (for UI display)
 * - Result type forces caller to check .ok before accessing .value
 * - TypeScript prevents accessing .value when ok === false
 *
 * @module
 */

/**
 * Result type representing success or failure.
 *
 * @example
 * ```typescript
 * async function getData(): Promise<Result<Data>> {
 *   if (error) {
 *     errorStack.stack_push("error", "Failed to get data");
 *     return Err();
 *   }
 *   return Ok(data);
 * }
 *
 * const result = await getData();
 * if (!result.ok) {
 *   // Can't access result.value here - TypeScript error
 *   console.log(errorStack.stack_search("data"));
 *   return;
 * }
 * // TypeScript knows result.ok === true, so .value exists
 * useData(result.value);
 * ```
 */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false };

/**
 * Creates a successful Result containing a value.
 *
 * @param value - The success value to wrap
 * @returns A Result indicating success
 */
export function Ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

/**
 * Creates a failed Result.
 *
 * Note: Error details should be pushed to errorStack before calling this.
 *
 * @returns A Result indicating failure
 */
export function Err<T>(): Result<T> {
  return { ok: false };
}

/**
 * Type guard to check if a Result is successful.
 *
 * @param result - The Result to check
 * @returns True if the Result contains a value
 */
export function isOk<T>(result: Result<T>): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Type guard to check if a Result is a failure.
 *
 * @param result - The Result to check
 * @returns True if the Result is a failure
 */
export function isErr<T>(result: Result<T>): result is { ok: false } {
  return result.ok === false;
}

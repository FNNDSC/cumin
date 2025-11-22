// errorStack.ts

type MessageType = "error" | "warning";

/**
 * Represents a single message in the error stack.
 */
interface StackMessage {
  type: MessageType;
  message: string;
}

/**
 * Options for configuring the ErrorStack.
 */
interface ErrorStackOptions {
  functionNamePadWidth?: number;
}

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

/**
 * Retrieves the name of the function that called the current function.
 * Uses the error stack trace to parse the caller's name.
 *
 * @returns The name of the calling function, or a default string if not found.
 */
function getCurrentFunctionName(): string {
  const error = new Error();
  const stack = error.stack?.split("\n");

  if (!stack || stack.length < 4) {
    return "Unknown Function";
  }

  const callerLine = stack[3];
  const functionNameMatch = callerLine.match(/at\s+([\w\.<>]+)\s*\(/);

  return functionNameMatch ? functionNameMatch[1] : "Anonymous Function";
}

/**
 * Singleton class for managing a stack of error and warning messages.
 * Provides methods to push, pop, search, and filter messages.
 */
class ErrorStack {
  private static instance: ErrorStack;
  private stack: StackMessage[] = [];
  private functionNamePadWidth: number;

  private constructor(options: ErrorStackOptions = {}) {
    this.functionNamePadWidth = options.functionNamePadWidth || 45; // Default to 45 if not specified
  }

  /**
   * Get the singleton instance of the ErrorStack.
   *
   * @param options - Optional configuration options for the stack.
   * @returns The singleton ErrorStack instance.
   */
  public static instance_get(options?: ErrorStackOptions): ErrorStack {
    if (!ErrorStack.instance) {
      ErrorStack.instance = new ErrorStack(options);
    }
    return ErrorStack.instance;
  }

  /**
   * Push a new message onto the stack.
   *
   * Captures the calling function name and formats the message.
   *
   * @param type - The type of message ("error" or "warning").
   * @param message - The message string.
   */
  public stack_push(type: MessageType, message: string): void {
    const functionName = getCurrentFunctionName();
    const paddedFunctionName = padRight(
      functionName,
      this.functionNamePadWidth
    );
    const enhancedMessage = `[${paddedFunctionName}] | ${message}`;
    this.stack.push({ type, message: enhancedMessage });
  }

  /**
   * Pop the last message from the stack.
   *
   * @returns The last message object or undefined if the stack is empty.
   */
  public stack_pop(): StackMessage | undefined {
    return this.stack.pop();
  }

  /**
   * Get all messages in the stack.
   *
   * @returns A copy of the current stack.
   */
  public all_get(): StackMessage[] {
    return [...this.stack];
  }

  /**
   * Search the stack for messages containing a substring.
   *
   * @param substring - The string to search for (case-insensitive).
   * @returns An array of formatted strings matching the search.
   */
  public stack_search(substring: string): string[] {
    return this.stack
      .filter((item) =>
        item.message.toLowerCase().includes(substring.toLowerCase())
      )
      .map((item) => `${item.type}: ${item.message}`);
  }

  /**
   * Get all messages of a specific type.
   *
   * @param type - The message type to filter by.
   * @returns An array of message strings.
   */
  public allOfType_get(type: MessageType): string[] {
    return this.stack
      .filter((item) => item.type === type)
      .map((item) => item.message);
  }

  /**
   * Search for messages of a specific type containing a substring.
   *
   * @param type - The message type to filter by.
   * @param substring - The string to search for (case-insensitive).
   * @returns An array of matching message strings.
   */
  public messagesOfType_search(type: MessageType, substring: string): string[] {
    return this.stack
      .filter(
        (item) =>
          item.type === type &&
          item.message.toLowerCase().includes(substring.toLowerCase())
      )
      .map((item) => item.message);
  }

  /**
   * Clear all messages from the stack.
   */
  public stack_clear(): void {
    this.stack = [];
  }

  /**
   * Clear all messages of a specific type from the stack.
   *
   * @param type - The message type to clear.
   */
  public type_clear(type: MessageType): void {
    this.stack = this.stack.filter((item) => item.type !== type);
  }

  /**
   * Check if the stack contains any messages.
   *
   * @returns True if the stack is not empty, false otherwise.
   */
  public messages_checkExistence(): boolean {
    return this.stack.length > 0;
  }

  /**
   * Check if the stack contains any messages of a specific type.
   *
   * @param type - The message type to check for.
   * @returns True if messages of the given type exist, false otherwise.
   */
  public messagesOfType_checkExistence(type: MessageType): boolean {
    return this.stack.some((item) => item.type === type);
  }
}

/**
 * The global singleton instance of the ErrorStack.
 */
export const errorStack = ErrorStack.instance_get({ functionNamePadWidth: 40 });

/**
 * Reconfigures the error stack with new options.
 *
 * @param options - The new configuration options.
 */
export function errorStack_configure(options: ErrorStackOptions): void {
  ErrorStack.instance_get(options);
}

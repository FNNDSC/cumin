// errorStack.ts

type MessageType = "error" | "warning";

interface StackMessage {
  type: MessageType;
  message: string;
}

interface ErrorStackOptions {
  functionNamePadWidth?: number;
}

function padRight(str: string, length: number): string {
  if (str.length > length) {
    return str.substring(0, length - 3) + "...";
  }
  return str.padEnd(length);
}

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

class ErrorStack {
  private static instance: ErrorStack;
  private stack: StackMessage[] = [];
  private functionNamePadWidth: number;

  private constructor(options: ErrorStackOptions = {}) {
    this.functionNamePadWidth = options.functionNamePadWidth || 45; // Default to 45 if not specified
  }

  public static getInstance(options?: ErrorStackOptions): ErrorStack {
    if (!ErrorStack.instance) {
      ErrorStack.instance = new ErrorStack(options);
    }
    return ErrorStack.instance;
  }

  public push(type: MessageType, message: string): void {
    const functionName = getCurrentFunctionName();
    const paddedFunctionName = padRight(
      functionName,
      this.functionNamePadWidth
    );
    const enhancedMessage = `[${paddedFunctionName}] | ${message}`;
    this.stack.push({ type, message: enhancedMessage });
  }

  public pop(): StackMessage | undefined {
    return this.stack.pop();
  }

  public getAll(): StackMessage[] {
    return [...this.stack];
  }

  public searchStack(substring: string): string[] {
    return this.stack
      .filter((item) =>
        item.message.toLowerCase().includes(substring.toLowerCase())
      )
      .map((item) => `${item.type}: ${item.message}`);
  }

  public getAllOfType(type: MessageType): string[] {
    return this.stack
      .filter((item) => item.type === type)
      .map((item) => item.message);
  }

  public searchMessagesOfType(type: MessageType, substring: string): string[] {
    return this.stack
      .filter(
        (item) =>
          item.type === type &&
          item.message.toLowerCase().includes(substring.toLowerCase())
      )
      .map((item) => item.message);
  }

  public clear(): void {
    this.stack = [];
  }

  public clearType(type: MessageType): void {
    this.stack = this.stack.filter((item) => item.type !== type);
  }

  public hasMessages(): boolean {
    return this.stack.length > 0;
  }

  public hasMessagesOfType(type: MessageType): boolean {
    return this.stack.some((item) => item.type === type);
  }
}

// Create and export the singleton instance
export const errorStack = ErrorStack.getInstance({ functionNamePadWidth: 40 });

// Export a function to reconfigure the error stack if needed
export function configureErrorStack(options: ErrorStackOptions): void {
  ErrorStack.getInstance(options);
}

export class ChRISContextSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChRISContextSpecError";
  }
}

interface ContextSpec {
  type: string;
  value: string;
}

/**
 * Splits a context string into its type and value components on the first occurrence of a delimiter.
 * Copied from src/resources/chrisEmbeddedResourceGroup.ts for isolated unit testing.
 */
function context_split(context: unknown, delimiter: string = ":"): ContextSpec {
  if (typeof context !== "string") {
    throw new ChRISContextSpecError(
      `Invalid input: Expected a string, but received ${typeof context}`
    );
  }

  const delimiterIndex: number = context.indexOf(delimiter);
  if (delimiterIndex === -1) {
    throw new ChRISContextSpecError(
      `Invalid input string format: Expected a ${delimiter}-separated string, but got: ${context}`
    );
  }

  const type: string = context.slice(0, delimiterIndex);
  const value: string = context.slice(delimiterIndex + delimiter.length);

  return { type, value };
}

describe("context_split()", () => {
  it("should parse standard folder context", () => {
    const result = context_split("folder:/home/chris");
    expect(result).toEqual({
      type: "folder",
      value: "/home/chris",
    });
  });

  it("should parse standard plugin context", () => {
    const result = context_split("plugin:123");
    expect(result).toEqual({
      type: "plugin",
      value: "123",
    });
  });

  it("should parse standard feed context", () => {
    const result = context_split("feed:456");
    expect(result).toEqual({
      type: "feed",
      value: "456",
    });
  });

  it("should correctly handle context paths containing multiple colons (e.g. PACS query folders)", () => {
    const result = context_split(
      "folder:/pacs/queries/2601_AccessionNumber:22548684/Study_1.2.840_Outside"
    );
    expect(result).toEqual({
      type: "folder",
      value: "/pacs/queries/2601_AccessionNumber:22548684/Study_1.2.840_Outside",
    });
  });

  it("should throw ChRISContextSpecError if no delimiter is present in string", () => {
    expect(() => {
      context_split("folder_without_colon");
    }).toThrow(ChRISContextSpecError);
  });

  it("should throw ChRISContextSpecError if context input is not a string", () => {
    expect(() => {
      context_split(123);
    }).toThrow(ChRISContextSpecError);

    expect(() => {
      context_split(null);
    }).toThrow(ChRISContextSpecError);
  });
});

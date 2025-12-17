import { pacsQuery_resultDecode, pacsServer_resolve } from "../src/pacs/chrisPACS.js";
import { Result } from "../src/utils/result.js";
import { errorStack } from "../src/error/errorStack.js";

// Mock the chrisConnection to control client_get
const mockClient = {
  getPACSList: jest.fn(),
  getPACSQuery: jest.fn(),
};

jest.mock("../src/connect/chrisConnection", () => ({
  chrisConnection: {
    client_get: jest.fn(async () => mockClient),
  },
}));

describe("PACS helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    errorStack.stack_clear();
  });

  it("resolves identifier to PACS id", async () => {
    mockClient.getPACSList.mockResolvedValueOnce({
      data: [{ id: 7, identifier: "PACSDCM" }],
    });
    const resolved: Result<{ id: number; identifier?: string }> = await pacsServer_resolve("PACSDCM");
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.value.id).toBe(7);
      expect(resolved.value.identifier).toBe("PACSDCM");
    }
  });

  it("decodes base64 JSON result payload", async () => {
    const payload = { studies: [{ foo: "bar" }] };
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    mockClient.getPACSQuery.mockResolvedValueOnce({
      data: { result: encoded },
    });

    const decoded = await pacsQuery_resultDecode(1);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.value.json).toEqual(payload);
      expect(decoded.value.text).toContain("foo");
    }
  });
});

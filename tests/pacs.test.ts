import {
  pacsQuery_resultDecode,
  pacsServer_resolve,
  pacsRetrieve_create,
  pacsRetrieves_list,
  pacsRetrieve_statusForQuery,
} from "../src/pacs/chrisPACS.js";
import { Result } from "../src/utils/result.js";
import { errorStack } from "../src/error/errorStack.js";

// Mock the chrisConnection to control client_get
const mockClient = {
  getPACSList: jest.fn(),
  getPACSQuery: jest.fn(),
  createPACSRetrieve: jest.fn(),
  getPACSSeriesList: jest.fn(),
  getPACSFiles: jest.fn(),
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

  it("creates a PACS retrieve", async () => {
    mockClient.createPACSRetrieve.mockResolvedValueOnce({
      data: {
        id: 456,
        pacs_query_id: 123,
        status: "created",
        creation_date: "2025-01-15T10:00:00Z",
      },
    });

    const result = await pacsRetrieve_create(123);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(456);
      expect(result.value.pacs_query_id).toBe(123);
      expect(result.value.status).toBe("created");
    }
  });

  it("lists PACS retrieves for a query", async () => {
    const mockQuery = {
      data: { id: 123 },
      getRetrieves: jest.fn().mockResolvedValueOnce({
        getItems: () => [
          { data: { id: 456, pacs_query_id: 123, status: "sent" } },
          { data: { id: 457, pacs_query_id: 123, status: "succeeded" } },
        ],
      }),
    };

    mockClient.getPACSQuery.mockResolvedValueOnce(mockQuery);

    const result = await pacsRetrieves_list(123);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0].id).toBe(456);
      expect(result.value[1].status).toBe("succeeded");
    }
  });

  it("generates status report with series progress", async () => {
    const queryPayload = [
      {
        StudyInstanceUID: { value: "1.2.3.4" },
        StudyDescription: { value: "Test Study" },
        series: [
          {
            SeriesInstanceUID: { value: "1.2.3.4.5" },
            SeriesDescription: { value: "MPRAGE" },
            NumberOfSeriesRelatedInstances: { value: 220 },
          },
        ],
      },
    ];

    const encoded = Buffer.from(JSON.stringify(queryPayload), "utf8").toString("base64");

    // Mock for pacsQuery_resultDecode
    mockClient.getPACSQuery.mockResolvedValueOnce({
      data: { result: encoded },
    });

    // Mock for pacsRetrieves_list
    mockClient.getPACSQuery.mockResolvedValueOnce({
      data: { id: 123 },
      getRetrieves: jest.fn().mockResolvedValueOnce({
        getItems: () => [{ data: { id: 456, status: "sent", pacs_query_id: 123 } }],
      }),
    });

    mockClient.getPACSSeriesList.mockResolvedValueOnce({
      getItems: () => [
        {
          data: {
            SeriesInstanceUID: "1.2.3.4.5",
            folder_path: "SERVICES/PACS/PACSDCM/study/series",
          },
        },
      ],
    });

    mockClient.getPACSFiles.mockResolvedValueOnce({
      totalCount: 186,
      getItems: () => [],
    });

    const result = await pacsRetrieve_statusForQuery(123);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.queryId).toBe(123);
      expect(result.value.retrieveId).toBe(456);
      expect(result.value.studies).toHaveLength(1);
      expect(result.value.studies[0].series).toHaveLength(1);
      expect(result.value.studies[0].series[0].status).toBe("pulling");
      expect(result.value.studies[0].series[0].actualFiles).toBe(186);
      expect(result.value.studies[0].series[0].expectedFiles).toBe(220);
    }
  });
});

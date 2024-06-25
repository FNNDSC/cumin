import { jest } from "@jest/globals";
import { getChrisVersion } from "../src/index.js";
import Client from "@fnndsc/chrisapi";

jest.mock("@fnndsc/chrisapi");

describe("cumin utilities", () => {
  it("should get ChRIS version", async () => {
    const mockVersion = "1.0.0";
    // const mockClient = {
    //   getVersion: jest.fn().mockResolvedValue(mockVersion),
    // };
    // jest.spyOn(Client, "getClient").mockReturnValue(mockClient);
    //
    const version = await getChrisVersion("http://example.com");
    expect(version).toBe(mockVersion);
  });
});

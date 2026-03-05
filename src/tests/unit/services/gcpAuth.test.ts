const mockGetIdTokenClient = jest.fn();
const mockGetRequestHeaders = jest.fn();

jest.mock("google-auth-library", () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getIdTokenClient: mockGetIdTokenClient,
  })),
}));

jest.mock("../../../utils/logger");

let mockSkipAuth = false;
jest.mock("../../../config/environment", () => ({
  get config() {
    return {
      gcp: { skipAuth: mockSkipAuth },
    };
  },
}));

import { getGcpIdToken } from "../../../services/gcpAuth";
import { logger } from "../../../utils/logger";

const mockLogger = logger as jest.Mocked<typeof logger>;

describe("gcpAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSkipAuth = false;
    mockGetIdTokenClient.mockResolvedValue({
      getRequestHeaders: mockGetRequestHeaders,
    });
    mockGetRequestHeaders.mockResolvedValue({
      Authorization: "Bearer gcp-mock-token",
    });
  });

  afterEach(() => {
    jest.resetModules();
  });

  it("should return null when skipAuth is true (development)", async () => {
    mockSkipAuth = true;

    const result = await getGcpIdToken("https://db-gateway.run.app");

    expect(result).toBeNull();
    expect(mockGetIdTokenClient).not.toHaveBeenCalled();
  });

  it("should return GCP identity token for a given target URL", async () => {
    const result = await getGcpIdToken("https://db-gateway.run.app");

    expect(result).toBe("Bearer gcp-mock-token");
    expect(mockGetIdTokenClient).toHaveBeenCalledWith(
      "https://db-gateway.run.app",
    );
    expect(mockGetRequestHeaders).toHaveBeenCalledWith(
      "https://db-gateway.run.app",
    );
  });

  it("should cache the client and reuse it on subsequent calls", async () => {
    const url = "https://cache-test.run.app";
    await getGcpIdToken(url);
    await getGcpIdToken(url);

    expect(mockGetIdTokenClient).toHaveBeenCalledTimes(1);
    expect(mockGetRequestHeaders).toHaveBeenCalledTimes(2);
  });

  it("should create separate clients for different target URLs", async () => {
    const urlA = "https://separate-a.run.app";
    const urlB = "https://separate-b.run.app";
    await getGcpIdToken(urlA);
    await getGcpIdToken(urlB);

    expect(mockGetIdTokenClient).toHaveBeenCalledTimes(2);
    expect(mockGetIdTokenClient).toHaveBeenCalledWith(urlA);
    expect(mockGetIdTokenClient).toHaveBeenCalledWith(urlB);
  });

  it("should log when a new client is initialized", async () => {
    const url = "https://log-test.run.app";
    await getGcpIdToken(url);

    expect(mockLogger.info).toHaveBeenCalledWith(
      "GCP identity token client initialized",
      { targetUrl: url },
    );
  });

  it("should not log on subsequent calls with the same URL", async () => {
    const url = "https://no-log-test.run.app";
    await getGcpIdToken(url);
    mockLogger.info.mockClear();

    await getGcpIdToken(url);

    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it("should return null when headers lack Authorization", async () => {
    mockGetRequestHeaders.mockResolvedValue({});

    const result = await getGcpIdToken("https://db-gateway.run.app");

    expect(result).toBeNull();
  });
});

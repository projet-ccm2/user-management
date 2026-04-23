import { BucketManagerService } from "../../../services/bucketManagerService";

jest.mock("../../../config/environment", () => ({
  config: {
    bucketManager: { url: "http://localhost:3002" },
    gcp: { skipAuth: true },
    userManagement: { url: "http://localhost:3000" },
    token: { jwtExpiresInSeconds: 3600 },
  },
}));

jest.mock("../../../services/tokenClient", () => ({
  getVpcToken: jest.fn().mockResolvedValue("mock-vpc-token"),
}));

jest.mock("../../../services/gcpAuth", () => ({
  getGcpIdToken: jest.fn().mockResolvedValue(null),
}));

jest.mock("../../../utils/logger");

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("BucketManagerService", () => {
  let service: BucketManagerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BucketManagerService();
  });

  describe("getApkUrl", () => {
    it("should return APK URL on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          url: "https://storage.googleapis.com/bucket/apk/app.apk?token=abc",
        }),
      });

      const result = await service.getApkUrl();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3002/bucket/apk",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual({
        url: "https://storage.googleapis.com/bucket/apk/app.apk?token=abc",
      });
    });

    it("should throw CustomError when bucket manager returns HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: jest.fn().mockResolvedValueOnce("APK not found"),
      });

      await expect(service.getApkUrl()).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("should throw 502 CustomError on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("fetch failed"));

      await expect(service.getApkUrl()).rejects.toMatchObject({
        statusCode: 502,
        message: "Failed to retrieve APK download URL",
      });
    });

    it("should throw 502 CustomError on timeout", async () => {
      const abortError = new DOMException(
        "The operation was aborted",
        "AbortError",
      );
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(service.getApkUrl()).rejects.toMatchObject({
        statusCode: 502,
      });
    });

    it("should include VPC token in Authorization header in dev mode", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValueOnce({ url: "https://example.com/apk" }),
      });

      await service.getApkUrl();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer mock-vpc-token",
          }),
        }),
      );
    });
  });
});

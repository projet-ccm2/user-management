import { Request, Response } from "express";
import { getApkDownloadUrl } from "../../../controllers/apkController";
import { bucketManagerService } from "../../../services/bucketManagerService";

jest.mock("../../../services/bucketManagerService");

const mockBucketManagerService = bucketManagerService as jest.Mocked<
  typeof bucketManagerService
>;

describe("apkController", () => {
  let mockRequest: Partial<Request & { user?: object }>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockNext = jest.fn();
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      user: {
        opaqueUserId: "UABCD1234",
        userId: "12345",
        channelId: "12345",
        role: "viewer",
      },
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockBucketManagerService.getApkUrl = jest.fn().mockResolvedValue({
      url: "https://storage.googleapis.com/bucket/apk/app.apk?token=abc",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 with APK URL on success", async () => {
    await getApkDownloadUrl(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockBucketManagerService.getApkUrl).toHaveBeenCalledTimes(1);
    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({
      success: true,
      url: "https://storage.googleapis.com/bucket/apk/app.apk?token=abc",
    });
  });

  it("should call next with CustomError 401 when user is missing", async () => {
    mockRequest.user = undefined;

    await getApkDownloadUrl(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Authentication required",
        statusCode: 401,
      }),
    );
    expect(mockBucketManagerService.getApkUrl).not.toHaveBeenCalled();
  });

  it("should propagate errors from bucketManagerService", async () => {
    const serviceError = new Error("Service unavailable");
    mockBucketManagerService.getApkUrl = jest
      .fn()
      .mockRejectedValue(serviceError);

    await getApkDownloadUrl(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalledWith(serviceError);
  });
});

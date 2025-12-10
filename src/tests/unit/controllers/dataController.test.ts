import { Request, Response } from "express";
import { getUserById } from "../../../controllers/dataController";
import { dbGatewayService } from "../../../services/dbGatewayService";
import { logger } from "../../../utils/logger";
import { CustomError } from "../../../middlewares/errorHandler";
import User from "../../../models/user";

jest.mock("../../../services/dbGatewayService");
jest.mock("../../../utils/logger");

const mockDbGatewayService = dbGatewayService as jest.Mocked<
  typeof dbGatewayService
>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("dataController", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      params: {
        id: "user_123",
      },
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserById", () => {
    it("should successfully fetch and return user data", async () => {
      const mockUser = new User({
        username: "testuser",
        channel: {
          id: "user_123",
          username: "testuser",
          channelDescription: "Test description",
          profileImageUrl: "https://example.com/avatar.jpg",
        },
        channelsWhichIsMod: [],
      });

      mockDbGatewayService.getAllDataUserById = jest
        .fn()
        .mockResolvedValue(mockUser);

      await getUserById(mockRequest as Request, mockResponse as Response);

      expect(mockDbGatewayService.getAllDataUserById).toHaveBeenCalledWith(
        "user_123",
      );
      expect(mockLogger.info).toHaveBeenCalledWith("Fetching user data", {
        userId: "user_123",
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        "User data successfully retrieved",
        {
          userId: "user_123",
          username: "testuser",
        },
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockUser.getAllWithoutAuth());
    });

    it("should throw CustomError when id is missing", async () => {
      mockRequest.params = {};

      await expect(
        getUserById(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockDbGatewayService.getAllDataUserById).not.toHaveBeenCalled();
    });

    it("should throw CustomError when id is empty string", async () => {
      mockRequest.params = { id: "" };

      await expect(
        getUserById(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockDbGatewayService.getAllDataUserById).not.toHaveBeenCalled();
    });

    it("should rethrow CustomError instances", async () => {
      const customError = new CustomError("User not found", 404);
      mockDbGatewayService.getAllDataUserById = jest
        .fn()
        .mockRejectedValue(customError);

      await expect(
        getUserById(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(customError);

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should handle unknown error types", async () => {
      mockDbGatewayService.getAllDataUserById = jest
        .fn()
        .mockRejectedValue("String error");

      await expect(
        getUserById(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error while fetching user data",
        {
          error: "Unknown error",
          userId: "user_123",
        },
      );
    });

    it("should handle Error instances", async () => {
      const error = new Error("Network error");
      mockDbGatewayService.getAllDataUserById = jest
        .fn()
        .mockRejectedValue(error);

      await expect(
        getUserById(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow(CustomError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Unexpected error while fetching user data",
        {
          error: "Network error",
          userId: "user_123",
        },
      );
    });
  });
});

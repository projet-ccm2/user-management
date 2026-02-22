import { Request, Response } from "express";
import { bffAuthMiddleware } from "../../../middlewares/bffAuthMiddleware";

const mockNext = jest.fn();

jest.mock("../../../config/environment", () => ({
  config: {
    gcp: { skipAuth: false, serviceUrl: "https://user-mgmt.example.com" },
  },
}));

describe("bffAuthMiddleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call next with 401 error when Authorization header is missing", async () => {
    const req = { headers: {} } as Request;
    const res = {} as Response;

    await bffAuthMiddleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = mockNext.mock.calls[0][0];
    expect(error).toMatchObject({
      statusCode: 401,
      message: "Missing or invalid Authorization header",
    });
  });

  it("should call next with 401 error when Authorization header does not start with Bearer", async () => {
    const req = {
      headers: { authorization: "Basic xxx" },
    } as Request;
    const res = {} as Response;

    await bffAuthMiddleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    const error = mockNext.mock.calls[0][0];
    expect(error).toMatchObject({
      statusCode: 401,
      message: "Missing or invalid Authorization header",
    });
  });
});

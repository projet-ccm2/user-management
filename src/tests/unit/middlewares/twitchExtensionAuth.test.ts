import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { twitchExtensionAuth } from "../../../middlewares/twitchExtensionAuth";

const EXTENSION_SECRET_RAW = "mysecret";
const EXTENSION_SECRET_B64 =
  Buffer.from(EXTENSION_SECRET_RAW).toString("base64");

jest.mock("../../../config/environment", () => ({
  config: {
    twitch: { extensionSecret: Buffer.from("mysecret").toString("base64") },
  },
}));

jest.mock("../../../utils/logger");

function makeToken(
  payload: object,
  secret: string = EXTENSION_SECRET_RAW,
): string {
  return jwt.sign(payload, Buffer.from(secret), { algorithm: "HS256" });
}

describe("twitchExtensionAuth", () => {
  let mockNext: jest.Mock;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockNext = jest.fn();
    mockRes = {};
  });

  it("should call next with 401 when Authorization header is missing", () => {
    const req = { headers: {}, params: {} } as Request;
    twitchExtensionAuth(req, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it("should call next with 401 when header does not start with Bearer", () => {
    const req = {
      headers: { authorization: "Basic abc" },
      params: {},
    } as Request;
    twitchExtensionAuth(req, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it("should call next with 401 when token is invalid", () => {
    const req = {
      headers: { authorization: "Bearer invalidtoken" },
      params: {},
    } as Request;
    twitchExtensionAuth(req, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it("should call next and set req.user when JWT is valid (identity shared)", () => {
    const payload = {
      opaque_user_id: "UABCD1234",
      user_id: "123456789",
      channel_id: "987654321",
      role: "viewer",
    };
    const token = makeToken(payload);
    const req = {
      headers: { authorization: `Bearer ${token}` },
      params: { id: "CrleZDqkDy86j6v6llJk" },
    } as unknown as Request;

    twitchExtensionAuth(req, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).user).toEqual({
      opaqueUserId: "UABCD1234",
      userId: "123456789",
      channelId: "987654321",
      role: "viewer",
    });
  });

  it("should call next and set req.user when JWT is valid (identity not shared)", () => {
    const payload = {
      opaque_user_id: "AABCD1234",
      user_id: "",
      channel_id: "987654321",
      role: "viewer",
    };
    const token = makeToken(payload);
    const req = {
      headers: { authorization: `Bearer ${token}` },
      params: { id: "CrleZDqkDy86j6v6llJk" },
    } as unknown as Request;

    twitchExtensionAuth(req, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).user).toEqual({
      opaqueUserId: "AABCD1234",
      userId: "",
      channelId: "987654321",
      role: "viewer",
    });
  });

  it("should call next with 401 when token is signed with wrong secret", () => {
    const token = makeToken(
      { opaque_user_id: "UABCD1234", role: "viewer" },
      "wrongsecret",
    );
    const req = {
      headers: { authorization: `Bearer ${token}` },
      params: {},
    } as unknown as Request;

    twitchExtensionAuth(req, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });
});

import { Request, Response } from "express";
import { createToken } from "../../../controllers/tokenController";

jest.mock("../../../services/tokenService", () => ({
  generateVpcToken: jest.fn().mockReturnValue("mock-generated-jwt"),
}));

describe("tokenController", () => {
  describe("createToken", () => {
    it("should return 200 with token in JSON body", async () => {
      const req = {} as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await createToken(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ token: "mock-generated-jwt" });
    });
  });
});

import jwt from "jsonwebtoken";
import { generateVpcToken } from "../../../services/tokenService";

jest.mock("../../../config/environment", () => ({
  config: {
    token: {
      jwtSecret: "test-secret",
      jwtExpiresInSeconds: 3600,
    },
  },
}));

describe("tokenService", () => {
  describe("generateVpcToken", () => {
    it("should generate a valid JWT", () => {
      const token = generateVpcToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("should include aud claim for vpc-db-gateway", () => {
      const token = generateVpcToken();
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      expect(decoded).toBeDefined();
      expect(decoded.aud).toBe("vpc-db-gateway");
    });

    it("should include exp claim", () => {
      const token = generateVpcToken();
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      expect(decoded).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe("number");
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("should include iat claim", () => {
      const before = Math.floor(Date.now() / 1000);
      const token = generateVpcToken();
      const after = Math.floor(Date.now() / 1000);
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      expect(decoded).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.iat).toBe("number");
      expect(decoded.iat).toBeGreaterThanOrEqual(before);
      expect(decoded.iat).toBeLessThanOrEqual(after);
    });

    it("should produce tokens verifiable with the same secret", () => {
      const token = generateVpcToken();
      const decoded = jwt.verify(token, "test-secret") as jwt.JwtPayload;

      expect(decoded.aud).toBe("vpc-db-gateway");
      expect(decoded.exp).toBeDefined();
    });
  });
});

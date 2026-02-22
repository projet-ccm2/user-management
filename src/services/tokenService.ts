import jwt from "jsonwebtoken";
import { config } from "../config/environment";

const AUDIENCE = "vpc-db-gateway";

export function generateVpcToken(): string {
  const { jwtSecret, jwtExpiresInSeconds } = config.token;
  const payload = {
    aud: AUDIENCE,
    iat: Math.floor(Date.now() / 1000),
  };
  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiresInSeconds,
  });
}

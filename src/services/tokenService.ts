import jwt from "jsonwebtoken";
import { config } from "../config/environment";

const AUDIENCE = "vpc-db-gateway";

/**
 * Generates a JWT for VPC access (db gateway, etc.).
 * Used by tokenController when a bastion (user-management or second BFF) requests a token.
 *
 * @returns Signed JWT with exp and aud claims
 */
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

/**
 * Hocuspocus Authentication Extension
 *
 * Validates JWT tokens from Auth.js to authenticate WebSocket connections.
 * Uses the same AUTH_SECRET as the Next.js application.
 */

import { Extension, onAuthenticatePayload } from "@hocuspocus/server";
import * as jose from "jose";
import type { Logger } from "pino";
import type { AuthenticatedUser, JWTPayload } from "../types.js";

const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET) {
  throw new Error("AUTH_SECRET environment variable is required");
}

// Encode secret for jose
const secret = new TextEncoder().encode(AUTH_SECRET);

/**
 * Verify and decode a JWT token
 */
async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Authentication extension configuration
 */
export interface AuthExtensionConfig {
  logger: Logger;
}

/**
 * Create the authentication extension
 */
export function createAuthExtension(config: AuthExtensionConfig): Extension {
  const { logger } = config;

  return {
    async onAuthenticate(
      data: onAuthenticatePayload
    ): Promise<{ user: AuthenticatedUser }> {
      const { token, documentName } = data;

      // Log authentication attempt
      logger.debug({ documentName }, "Authentication attempt");

      // Token is required
      if (!token) {
        logger.warn({ documentName }, "Authentication failed: No token provided");
        throw new Error("Unauthorized: No token provided");
      }

      // Verify JWT token
      const payload = await verifyToken(token);

      if (!payload || !payload.sub) {
        logger.warn({ documentName }, "Authentication failed: Invalid token");
        throw new Error("Unauthorized: Invalid token");
      }

      // Extract user info from JWT payload
      const user: AuthenticatedUser = {
        id: payload.sub,
        name: payload.name ?? null,
        email: payload.email ?? "",
      };

      logger.info(
        { documentName, userId: user.id, userName: user.name },
        "User authenticated successfully"
      );

      // Return user context - will be available in other hooks
      return { user };
    },
  };
}

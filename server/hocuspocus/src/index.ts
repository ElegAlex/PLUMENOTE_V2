/**
 * PlumeNote Hocuspocus WebSocket Server
 *
 * Real-time collaboration server for Y.js document synchronization.
 * Features:
 * - JWT authentication (Auth.js compatible)
 * - PostgreSQL persistence via Prisma
 * - Structured logging with Pino
 *
 * @see https://tiptap.dev/docs/hocuspocus
 */

import { Server } from "@hocuspocus/server";
import pino from "pino";
import { createAuthExtension } from "./extensions/auth.js";
import {
  createDatabaseExtension,
  disconnectDatabase,
} from "./extensions/database.js";
import type { AuthenticatedUser } from "./types.js";

// ===========================================
// Configuration
// ===========================================

const PORT = parseInt(process.env.PORT || "1234", 10);
const NODE_ENV = process.env.NODE_ENV || "development";
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === "production" ? "info" : "debug");

// ===========================================
// Logger Setup
// ===========================================

const logger = pino({
  name: "plumenote-hocuspocus",
  level: LOG_LEVEL,
  ...(NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
});

// ===========================================
// Extensions
// ===========================================

const authExtension = createAuthExtension({ logger });
const databaseExtension = createDatabaseExtension({ logger });

// ===========================================
// Server Configuration
// ===========================================

const server = new Server({
  name: "plumenote-hocuspocus",
  port: PORT,

  // Extensions
  extensions: [databaseExtension],

  // Authentication hook from auth extension
  async onAuthenticate(data) {
    return authExtension.onAuthenticate!(data);
  },

  // Connection hooks
  async onConnect(data) {
    const user = data.context?.user as AuthenticatedUser | undefined;
    logger.info(
      {
        documentName: data.documentName,
        userId: user?.id,
        userName: user?.name,
        socketId: data.socketId,
      },
      "Client connected"
    );
  },

  async onDisconnect(data) {
    const user = data.context?.user as AuthenticatedUser | undefined;
    logger.info(
      {
        documentName: data.documentName,
        userId: user?.id,
        userName: user?.name,
        socketId: data.socketId,
      },
      "Client disconnected"
    );
  },

  // Document lifecycle hooks
  async onLoadDocument(data) {
    logger.debug(
      { documentName: data.documentName },
      "Document loading"
    );
  },

  async onStoreDocument(data) {
    logger.debug(
      { documentName: data.documentName },
      "Document stored"
    );
  },

  // Error handling
  async onRequest(data) {
    logger.debug(
      { method: data.request.method, url: data.request.url },
      "HTTP request received"
    );
  },
});

// ===========================================
// Server Startup
// ===========================================

async function startServer(): Promise<void> {
  try {
    await server.listen(PORT);
    logger.info(
      { port: PORT, env: NODE_ENV },
      "Hocuspocus server started"
    );
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

// ===========================================
// Graceful Shutdown
// ===========================================

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutdown signal received");

  try {
    // Stop accepting new connections
    await server.destroy();
    logger.info("Hocuspocus server stopped");

    // Disconnect database
    await disconnectDatabase();
    logger.info("Database connection closed");

    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Error during shutdown");
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception");
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled rejection");
  shutdown("unhandledRejection");
});

// Start the server
startServer();

/**
 * PlumeNote Hocuspocus WebSocket Server
 *
 * Placeholder server for real-time collaboration.
 * Will be fully implemented in Epic 4.
 */

import { Server } from "@hocuspocus/server";

const PORT = parseInt(process.env.PORT || "1234", 10);

const server = new Server({
  name: "plumenote-hocuspocus",

  async onConnect(data) {
    console.log(`[Hocuspocus] Client connected to document: ${data.documentName}`);
  },

  async onDisconnect(data) {
    console.log(`[Hocuspocus] Client disconnected from document: ${data.documentName}`);
  },
});

// Start the server
server.listen(PORT).then(() => {
  console.log(`[Hocuspocus] Server listening on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Hocuspocus] SIGTERM received, shutting down gracefully...");
  server.destroy();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[Hocuspocus] SIGINT received, shutting down gracefully...");
  server.destroy();
  process.exit(0);
});

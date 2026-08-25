import "dotenv/config";
import http from "http";
import app from "./app";
import { connectDB } from "./utils/db";
import { logger } from "./utils/logger";
import { initWebSocketServer } from "./websocket/wsServer";
import { startCorrelationEngine } from "./services/correlationEngine";

const PORT = parseInt(process.env.PORT || "4000", 10);

async function bootstrap() {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Create HTTP server wrapping Express
  const server = http.createServer(app);

  // 3. Attach WebSocket server to same HTTP server
  initWebSocketServer(server);

  // 4. Start the correlation / rule engine
  startCorrelationEngine();

  // 5. Listen
  server.listen(PORT, () => {
    logger.info(`🛡️  Sentinel SIEM backend running on http://localhost:${PORT}`);
    logger.info(`🔌  WebSocket server co-hosted on ws://localhost:${PORT}/ws`);
    logger.info(`🌍  Environment: ${process.env.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info("Shutting down gracefully…");
    server.close(() => {
      logger.info("HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap().catch((err) => {
  logger.error("Fatal startup error:", err);
  process.exit(1);
});

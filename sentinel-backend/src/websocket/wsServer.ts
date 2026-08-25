import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../utils/logger";
import { verifyToken } from "../utils/jwt";

interface WsMessage {
  type: string;
  payload?: unknown;
}

let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export function initWebSocketServer(server: HttpServer): void {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    // Optional JWT auth via query param: ws://host/ws?token=<jwt>
    const url = new URL(req.url || "", "http://localhost");
    const token = url.searchParams.get("token");

    if (token) {
      try {
        verifyToken(token);
      } catch {
        ws.close(4401, "Unauthorized");
        return;
      }
    }

    clients.add(ws);
    logger.info(`WS client connected. Total: ${clients.size}`);

    // Send welcome / current status
    send(ws, { type: "CONNECTED", payload: { message: "Sentinel SIEM real-time feed connected", ts: new Date() } });

    ws.on("message", (data) => {
      try {
        const msg: WsMessage = JSON.parse(data.toString());
        if (msg.type === "PING") send(ws, { type: "PONG" });
      } catch {
        // ignore malformed
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      logger.info(`WS client disconnected. Total: ${clients.size}`);
    });

    ws.on("error", (err) => {
      logger.error("WS error:", err);
      clients.delete(ws);
    });
  });

  // Heartbeat every 30 s
  setInterval(() => {
    broadcast({ type: "HEARTBEAT", payload: { ts: new Date(), clients: clients.size } });
  }, 30000);

  logger.info("🔌  WebSocket server initialised");
}

function send(ws: WebSocket, msg: WsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function broadcast(msg: WsMessage): void {
  const payload = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export function getConnectedCount(): number {
  return clients.size;
}

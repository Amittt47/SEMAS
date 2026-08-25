"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export interface WsMessage {
  type: string;
  payload?: any; // Changed from unknown to any for easier usage in components
}

interface UseWebSocketReturn {
  connected: boolean;
  lastMessage: WsMessage | null;
  send: (msg: WsMessage) => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws";

export function useWebSocket(onMessage?: (msg: WsMessage) => void): UseWebSocketReturn {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  
  // FIX: Added undefined as initial value
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef<boolean>(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const token = typeof window !== "undefined"
      ? localStorage.getItem("sentinel_token")
      : null;

    const url = token ? `${WS_URL}?token=${token}` : WS_URL;

    try {
      const socket = new WebSocket(url);
      ws.current = socket;

      socket.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      };

      socket.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg: WsMessage = JSON.parse(event.data);
          setLastMessage(msg);
          onMessage?.(msg);
        } catch { /* ignore malformed */ }
      };

      socket.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        // Reconnect after 3 s
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch (err) {
      console.error("WebSocket Connection Error:", err);
    }
  }, [onMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: WsMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  return { connected, lastMessage, send };
}
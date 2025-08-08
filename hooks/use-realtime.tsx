"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

type RealtimeContextType = {
  connected: boolean;
  send: (data: unknown) => void;
  lastMessage: unknown;
};

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== "undefined" ? `ws://${window.location.host}/ws` : "");
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (evt) => setLastMessage(evt.data);
      ws.onclose = () => setConnected(false);
      return () => ws.close();
    } catch {
      setConnected(false);
    }
  }, []);

  const send = (data: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  };

  return (
    <RealtimeContext.Provider value={{ connected, send, lastMessage }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within RealtimeProvider");
  return ctx;
};



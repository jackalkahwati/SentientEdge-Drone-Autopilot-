"use client";

import { useEffect, useRef, useState } from "react";

type Message = { id: string; user: string; text: string; ts: string };

export const MessageHistory = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setMessages([
      { id: "1", user: "Ops", text: "All units check-in", ts: new Date().toISOString() },
      { id: "2", user: "Eagle-02", text: "On station", ts: new Date().toISOString() },
    ]);
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-auto border-b">
      {messages.map((m) => (
        <div key={m.id} className="p-2 text-sm">
          <span className="font-medium mr-2">{m.user}</span>
          <span className="text-muted-foreground">{new Date(m.ts).toLocaleTimeString()}</span>
          <div>{m.text}</div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageHistory;



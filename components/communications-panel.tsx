"use client";

import { useState } from "react";

export const CommunicationsPanel = () => {
  const [text, setText] = useState("");
  const send = () => {
    setText("");
  };
  return (
    <div className="p-2 flex gap-2">
      <input
        className="flex-1 rounded-md border px-3 py-2 text-sm"
        placeholder="Type a message"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="rounded-md border px-3 text-sm" onClick={send} disabled={!text.trim()}>
        Send
      </button>
    </div>
  );
};

export default CommunicationsPanel;



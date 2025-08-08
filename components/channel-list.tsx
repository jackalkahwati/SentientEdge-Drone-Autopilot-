"use client";

import { useEffect, useState } from "react";

type Channel = { id: string; name: string; participants: number };

export const ChannelList = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  useEffect(() => {
    setChannels([
      { id: "c1", name: "Tactical Command", participants: 12 },
      { id: "c2", name: "Operations", participants: 8 },
      { id: "c3", name: "Intel", participants: 5 },
    ]);
  }, []);
  return (
    <div className="rounded-md border">
      {channels.map((c) => (
        <div key={c.id} className="flex items-center justify-between p-2 border-b last:border-b-0 text-sm">
          <div>{c.name}</div>
          <div className="text-xs text-muted-foreground">{c.participants} online</div>
        </div>
      ))}
    </div>
  );
};

export default ChannelList;



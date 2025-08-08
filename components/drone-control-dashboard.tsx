"use client";

export default function DroneControlDashboard({ onConnect, onDisconnect }: { onConnect?: () => void; onDisconnect?: () => void }) {
  return (
    <div className="container mx-auto p-4">
      <h2 className="text-xl font-semibold mb-2">Drone Control Dashboard</h2>
      <p className="text-sm text-muted-foreground">Connect to MAVLink and control drones in real time.</p>
      <div className="mt-3 flex gap-2">
        {onConnect && <button className="px-3 py-1 rounded-md border" onClick={onConnect}>Connect</button>}
        {onDisconnect && <button className="px-3 py-1 rounded-md border" onClick={onDisconnect}>Disconnect</button>}
      </div>
    </div>
  );
}



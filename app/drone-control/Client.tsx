"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useMAVLink } from '@/lib/mavlink';
import DroneControlDashboard from '@/components/drone-control-dashboard';

export default function DroneMissionClient() {
  const { connect, disconnect, isConnected } = useMAVLink();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConnected(isConnected());
    return () => {
      if (connected) {
        disconnect();
      }
    };
  }, [isConnected, disconnect, connected]);

  const handleConnect = () => {
    try {
      connect();
      setConnected(true);
      setError(null);
    } catch (err) {
      setError('Failed to connect to MAVLink server. Please check your connection.');
      console.error('Connection error:', err);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setConnected(false);
  };

  return (
    <div className="flex flex-col space-y-4 p-6">
      <div className="flex items-center space-x-2">
        <Link
          href="/tactical"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Tactical
        </Link>
        <h1 className="text-3xl font-semibold">Drone Control Interface</h1>
        <Badge variant={connected ? 'default' : 'outline'} className="ml-2">
          {connected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          Connect to ArduPilot drones via MAVLink protocol for real-time monitoring and control.
        </p>

        <div className="flex space-x-2">
          <Button variant={connected ? 'outline' : 'default'} onClick={handleConnect} disabled={connected}>
            Connect MAVLink
          </Button>
          <Button variant={connected ? 'default' : 'outline'} onClick={handleDisconnect} disabled={!connected}>
            Disconnect
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!connected && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>MAVLink Connection Required</AlertTitle>
          <AlertDescription>
            Connect to the MAVLink server to enable real-time drone control and telemetry.
          </AlertDescription>
        </Alert>
      )}

      <DroneControlDashboard onConnect={handleConnect} onDisconnect={handleDisconnect} />
    </div>
  );
} 
// ArduCopter SITL Browser-Safe Types and Interfaces
// This file contains only the types and interfaces that are safe to use in the browser

// SITL vehicle types supported by ArduCopter
export enum SITLVehicleType {
  QUADCOPTER = 'quad',
  HEXACOPTER = 'hexa',
  OCTOCOPTER = 'octa',
  COAXCOPTER = 'coax',
  SINGLE_COPTER = 'single',
  HELI = 'heli',
  QUAD_X = 'X',
  QUAD_PLUS = '+',
}

// SITL frame configuration
export interface SITLFrameConfig {
  type: SITLVehicleType;
  name: string;
  motorCount: number;
  description: string;
  recommendedParams?: { [key: string]: number };
}

// SITL configuration options
export interface SITLOptions {
  vehicle: SITLVehicleType;
  instance?: number;
  home?: {
    lat: number;
    lon: number;
    alt: number;
    heading: number;
  };
  speedup?: number;
  rate?: number;
  console?: boolean;
  map?: boolean;
  osd?: boolean;
  model?: string;
  fgview?: boolean;
  autostart?: boolean;
  wipeEEPROM?: boolean;
  additionalParams?: string[];
}

// SITL status information
export interface SITLStatus {
  isRunning: boolean;
  vehicle: SITLVehicleType;
  instance: number;
  startTime?: Date;
  pid?: number;
  mavlinkPort: number;
  simPort: number;
  home?: {
    lat: number;
    lon: number;
    alt: number;
    heading: number;
  };
}

// SITL telemetry data
export interface SITLTelemetry {
  timestamp: number;
  position: {
    lat: number;
    lon: number;
    alt: number;
  };
  attitude: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  velocity: {
    vx: number;
    vy: number;
    vz: number;
  };
  battery: {
    voltage: number;
    current: number;
    remaining: number;
  };
  mode: string;
  armed: boolean;
  gpsFix: number;
  satelliteCount: number;
}

// Export dummy client-side SITL manager
export class SITLManagerClient {
  async start(options: SITLOptions): Promise<{ success: boolean; message: string }> {
    // This would call an API endpoint in production
    const response = await fetch('/api/sitl/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    return response.json();
  }

  async stop(instance?: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch('/api/sitl/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instance })
    });
    return response.json();
  }

  async getStatus(): Promise<SITLStatus[]> {
    const response = await fetch('/api/sitl/status');
    return response.json();
  }

  async getTelemetry(instance: number): Promise<SITLTelemetry> {
    const response = await fetch(`/api/sitl/telemetry/${instance}`);
    return response.json();
  }
}
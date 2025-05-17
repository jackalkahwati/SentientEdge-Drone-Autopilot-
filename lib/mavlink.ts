// MAVLink protocol client for ArduPilot integration

import { Drone, DroneStatus, DroneType } from './types';
import { webSocketService } from './websocket';

// MAVLink message IDs (subset of what we need)
enum MAVLinkMessageID {
  HEARTBEAT = 0,
  SYS_STATUS = 1,
  PARAM_VALUE = 22,
  GPS_RAW_INT = 24,
  ATTITUDE = 30,
  GLOBAL_POSITION_INT = 33,
  RC_CHANNELS = 65,
  COMMAND_LONG = 76,
  MISSION_ITEM = 39,
  MISSION_ACK = 47,
}

// MAVLink command IDs
enum MAVCommand {
  NAV_WAYPOINT = 16,
  NAV_RETURN_TO_LAUNCH = 20,
  NAV_LAND = 21,
  CONDITION_YAW = 115,
  DO_SET_MODE = 176,
  DO_CHANGE_SPEED = 178,
  DO_SET_HOME = 179,
  DO_MOUNT_CONTROL = 205,
  DO_SET_SERVO = 183,
  DO_DIGICAM_CONTROL = 203,
  DO_MOUNT_CONFIGURE = 204,
  DO_FLIGHTTERMINATION = 185,
  COMPONENT_ARM_DISARM = 400,
}

// MAVLink modes
enum MAVMode {
  PREFLIGHT = 0,
  STABILIZE = 1,
  GUIDED = 2,
  AUTO = 3,
  RTL = 4,
  LOITER = 5,
  LAND = 6,
  TAKEOFF = 7,
}

// MAVLink state
enum MAVState {
  UNINIT = 0,
  BOOT = 1,
  CALIBRATING = 2,
  STANDBY = 3,
  ACTIVE = 4,
  CRITICAL = 5,
  EMERGENCY = 6,
  POWEROFF = 7,
}

// Result codes for command execution
enum MAVResult {
  ACCEPTED = 0,
  TEMPORARILY_REJECTED = 1,
  DENIED = 2,
  UNSUPPORTED = 3,
  FAILED = 4,
  IN_PROGRESS = 5,
}

interface MAVLinkMessage {
  id: MAVLinkMessageID;
  payload: any;
  sysid: number;
  compid: number;
}

interface MAVLinkHeartbeat {
  type: number;       // Type of the system (quadrotor, helicopter, etc.)
  autopilot: number;  // Autopilot type / class
  base_mode: number;  // System mode bitmap
  custom_mode: number;// Custom mode
  system_status: MAVState;
  mavlink_version: number;
}

interface MAVLinkGlobalPositionInt {
  time_boot_ms: number;
  lat: number;         // Latitude in 1E7 degrees
  lon: number;         // Longitude in 1E7 degrees
  alt: number;         // Altitude in mm
  relative_alt: number;// Relative altitude in mm
  vx: number;          // Ground X speed in cm/s
  vy: number;          // Ground Y speed in cm/s
  vz: number;          // Ground Z speed in cm/s
  hdg: number;         // Heading in cdeg (0-36000)
}

interface MAVLinkSysStatus {
  voltage_battery: number;   // Battery voltage in mV
  current_battery: number;   // Battery current in 10*mA
  battery_remaining: number; // Battery remaining percentage
  drop_rate_comm: number;    // Communication drop rate in percent
  errors_comm: number;       // Communication errors
  load: number;              // CPU load in percent
}

interface MAVLinkAttitude {
  time_boot_ms: number;
  roll: number;     // Roll angle in radians
  pitch: number;    // Pitch angle in radians
  yaw: number;      // Yaw angle in radians
  rollspeed: number;// Roll angular speed in rad/s
  pitchspeed: number;// Pitch angular speed in rad/s
  yawspeed: number; // Yaw angular speed in rad/s
}

// Class for managing MAVLink communication
export class MAVLinkClient {
  private static instance: MAVLinkClient;
  private connected: boolean = false;
  private drones: Map<number, Drone> = new Map();
  private listeners: Array<(drones: Drone[]) => void> = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private missionCommands: Map<number, (result: MAVResult) => void> = new Map();
  private commandSequence: number = 0;

  private constructor() {
    // Private constructor to enforce singleton
  }

  public static getInstance(): MAVLinkClient {
    if (!MAVLinkClient.instance) {
      MAVLinkClient.instance = new MAVLinkClient();
    }
    return MAVLinkClient.instance;
  }

  public connect(url: string = 'ws://localhost:5760'): void {
    if (webSocketService) {
      webSocketService.disconnect(); // Disconnect from any existing connection
      webSocketService.connect();
      
      // Subscribe to MAVLink messages
      webSocketService.subscribe('mavlink_message', (data) => this.handleMessage(data));
      
      // Set up heartbeat to keep connection alive
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
      }, 1000);
      
      this.connected = true;
    }
  }

  public disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (webSocketService) {
      webSocketService.disconnect();
    }
    
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getDrones(): Drone[] {
    return Array.from(this.drones.values());
  }

  public getDrone(id: string): Drone | undefined {
    // Find drone by string ID
    for (const drone of this.drones.values()) {
      if (drone.id === id) {
        return drone;
      }
    }
    return undefined;
  }

  public addListener(listener: (drones: Drone[]) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Command a drone to arm/disarm
  public armDisarm(droneId: string, arm: boolean): Promise<MAVResult> {
    const drone = this.getDrone(droneId);
    if (!drone) {
      return Promise.reject(new Error('Drone not found'));
    }
    
    const sysid = parseInt(droneId.split('-')[1], 10);
    return this.sendCommand(sysid, MAVCommand.COMPONENT_ARM_DISARM, [
      arm ? 1 : 0, // Arm if 1, disarm if 0
      0, // Force (0 = don't force)
      0, 0, 0, 0, 0 // Empty parameters
    ]);
  }

  // Command a drone to take off
  public takeoff(droneId: string, altitude: number): Promise<MAVResult> {
    const drone = this.getDrone(droneId);
    if (!drone) {
      return Promise.reject(new Error('Drone not found'));
    }
    
    const sysid = parseInt(droneId.split('-')[1], 10);
    // First set mode to GUIDED
    return this.setMode(droneId, MAVMode.GUIDED).then(() => {
      // Then command takeoff
      return this.sendCommand(sysid, MAVCommand.NAV_TAKEOFF, [
        0, 0, 0, 0, 0, 0, altitude
      ]);
    });
  }

  // Command a drone to land
  public land(droneId: string): Promise<MAVResult> {
    const drone = this.getDrone(droneId);
    if (!drone) {
      return Promise.reject(new Error('Drone not found'));
    }
    
    const sysid = parseInt(droneId.split('-')[1], 10);
    return this.sendCommand(sysid, MAVCommand.NAV_LAND, [
      0, 0, 0, 0, 0, 0, 0
    ]);
  }

  // Command a drone to return to launch
  public returnToLaunch(droneId: string): Promise<MAVResult> {
    const drone = this.getDrone(droneId);
    if (!drone) {
      return Promise.reject(new Error('Drone not found'));
    }
    
    const sysid = parseInt(droneId.split('-')[1], 10);
    return this.setMode(droneId, MAVMode.RTL);
  }

  // Set flight mode
  public setMode(droneId: string, mode: MAVMode): Promise<MAVResult> {
    const drone = this.getDrone(droneId);
    if (!drone) {
      return Promise.reject(new Error('Drone not found'));
    }
    
    const sysid = parseInt(droneId.split('-')[1], 10);
    return this.sendCommand(sysid, MAVCommand.DO_SET_MODE, [
      1, // Set mode
      mode, // Mode
      0, 0, 0, 0, 0 // Empty parameters
    ]);
  }

  // Go to a specific position
  public gotoPosition(droneId: string, lat: number, lon: number, alt: number): Promise<MAVResult> {
    const drone = this.getDrone(droneId);
    if (!drone) {
      return Promise.reject(new Error('Drone not found'));
    }
    
    const sysid = parseInt(droneId.split('-')[1], 10);
    // First set mode to GUIDED
    return this.setMode(droneId, MAVMode.GUIDED).then(() => {
      // Then command goto
      return this.sendCommand(sysid, MAVCommand.NAV_WAYPOINT, [
        0, // Hold time
        0, // Accept radius
        0, // Pass radius
        0, // Yaw
        lat, 
        lon, 
        alt
      ]);
    });
  }

  // Private methods for handling communication
  private handleMessage(data: MAVLinkMessage): void {
    // Process message based on ID
    switch (data.id) {
      case MAVLinkMessageID.HEARTBEAT:
        this.processHeartbeat(data.sysid, data.compid, data.payload);
        break;
      case MAVLinkMessageID.GLOBAL_POSITION_INT:
        this.processPosition(data.sysid, data.payload);
        break;
      case MAVLinkMessageID.SYS_STATUS:
        this.processSystemStatus(data.sysid, data.payload);
        break;
      case MAVLinkMessageID.ATTITUDE:
        this.processAttitude(data.sysid, data.payload);
        break;
      case MAVLinkMessageID.COMMAND_LONG:
        // This is a command being sent to us, not typically handled in client
        break;
      case MAVLinkMessageID.MISSION_ACK:
        // Handle mission command acknowledgement
        const cmdId = data.payload.target_component;
        const result = data.payload.result as MAVResult;
        const callback = this.missionCommands.get(cmdId);
        if (callback) {
          callback(result);
          this.missionCommands.delete(cmdId);
        }
        break;
    }
  }

  private processHeartbeat(sysid: number, compid: number, heartbeat: MAVLinkHeartbeat): void {
    // Create a unique ID for this drone
    const droneId = `drone-${sysid}-${compid}`;
    
    // Check if we already know about this drone
    let drone = this.drones.get(sysid);
    
    if (!drone) {
      // Create a new drone entry
      drone = {
        id: droneId,
        name: `Drone ${sysid}`,
        type: this.getDroneType(heartbeat.type),
        status: this.getDroneStatus(heartbeat.system_status),
        battery: 0,
        signal: 100,
        location: undefined,
        altitude: undefined,
        speed: undefined,
        heading: undefined,
        lastMission: undefined,
        missionCount: 0,
        nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        model: `ArduPilot ${heartbeat.autopilot}`,
        serialNumber: `SYS${sysid}COMP${compid}`,
      };
      
      this.drones.set(sysid, drone);
    } else {
      // Update existing drone
      drone.status = this.getDroneStatus(heartbeat.system_status);
    }
    
    // Notify listeners of update
    this.notifyListeners();
  }

  private processPosition(sysid: number, position: MAVLinkGlobalPositionInt): void {
    const drone = this.drones.get(sysid);
    if (drone) {
      // Convert position data
      drone.location = [position.lon / 10000000, position.lat / 10000000]; // Convert to decimal degrees
      drone.altitude = position.relative_alt / 1000; // Convert mm to meters
      drone.heading = position.hdg / 100; // Convert cdeg to degrees
      drone.speed = Math.sqrt(position.vx * position.vx + position.vy * position.vy) / 100; // Convert cm/s to m/s
      
      // Notify listeners of update
      this.notifyListeners();
    }
  }

  private processSystemStatus(sysid: number, status: MAVLinkSysStatus): void {
    const drone = this.drones.get(sysid);
    if (drone) {
      // Update battery and signal info
      drone.battery = status.battery_remaining;
      drone.signal = 100 - status.drop_rate_comm; // Invert drop rate for signal quality
      
      // Notify listeners of update
      this.notifyListeners();
    }
  }

  private processAttitude(sysid: number, attitude: MAVLinkAttitude): void {
    // Store attitude data if needed
    // This can be expanded later
  }

  private getDroneType(mavType: number): DroneType {
    // Map MAVLink drone types to our application types
    switch (mavType) {
      case 1: return 'multi'; // Generic multicopter
      case 2: return 'multi'; // Fixed wing
      case 3: return 'multi'; // Generic helicopter
      case 4: return 'surveillance'; // Generic mission
      case 5: return 'multi'; // Ground/rover
      case 6: return 'transport'; // Surface/boat
      case 7: return 'multi'; // Submarine
      default: return 'multi';
    }
  }

  private getDroneStatus(mavState: MAVState): DroneStatus {
    // Map MAVLink states to our application states
    switch (mavState) {
      case MAVState.UNINIT:
      case MAVState.BOOT:
      case MAVState.CALIBRATING:
        return 'maintenance';
      case MAVState.STANDBY:
        return 'idle';
      case MAVState.ACTIVE:
        return 'active';
      case MAVState.CRITICAL:
      case MAVState.EMERGENCY:
        return 'maintenance';
      case MAVState.POWEROFF:
        return 'offline';
      default:
        return 'offline';
    }
  }

  private notifyListeners(): void {
    const drones = this.getDrones();
    for (const listener of this.listeners) {
      listener(drones);
    }
  }

  private sendHeartbeat(): void {
    if (webSocketService) {
      // Send a simple heartbeat to keep the connection alive
      webSocketService.send('mavlink_message', {
        id: MAVLinkMessageID.HEARTBEAT,
        sysid: 255, // GCS system ID
        compid: 0,  // GCS component ID
        payload: {
          type: 6, // GCS
          autopilot: 8, // MAV_AUTOPILOT_INVALID
          base_mode: 0,
          custom_mode: 0,
          system_status: MAVState.ACTIVE,
          mavlink_version: 3
        }
      });
    }
  }

  private sendCommand(sysid: number, command: MAVCommand, params: number[]): Promise<MAVResult> {
    return new Promise((resolve, reject) => {
      if (!webSocketService) {
        reject(new Error('WebSocket service not available'));
        return;
      }
      
      // Generate a command sequence number
      this.commandSequence = (this.commandSequence + 1) % 255;
      
      // Store the callback for this command
      this.missionCommands.set(this.commandSequence, resolve);
      
      // Send the command
      webSocketService.send('mavlink_message', {
        id: MAVLinkMessageID.COMMAND_LONG,
        sysid: 255, // GCS system ID
        compid: this.commandSequence, // Use sequence as component ID for tracking
        payload: {
          target_system: sysid,
          target_component: 0, // Main component
          command: command,
          confirmation: 0,
          param1: params[0] || 0,
          param2: params[1] || 0,
          param3: params[2] || 0,
          param4: params[3] || 0,
          param5: params[4] || 0,
          param6: params[5] || 0,
          param7: params[6] || 0
        }
      });
      
      // Set a timeout to reject the promise if no response
      setTimeout(() => {
        if (this.missionCommands.has(this.commandSequence)) {
          this.missionCommands.delete(this.commandSequence);
          reject(new Error('Command timed out'));
        }
      }, 5000);
    });
  }
}

// React hook for using MAVLink
export function useMAVLink() {
  const client = MAVLinkClient.getInstance();
  
  return {
    connect: (url?: string) => client.connect(url),
    disconnect: () => client.disconnect(),
    isConnected: () => client.isConnected(),
    getDrones: () => client.getDrones(),
    getDrone: (id: string) => client.getDrone(id),
    addListener: (listener: (drones: Drone[]) => void) => client.addListener(listener),
    armDisarm: (droneId: string, arm: boolean) => client.armDisarm(droneId, arm),
    takeoff: (droneId: string, altitude: number) => client.takeoff(droneId, altitude),
    land: (droneId: string) => client.land(droneId),
    returnToLaunch: (droneId: string) => client.returnToLaunch(droneId),
    setMode: (droneId: string, mode: MAVMode) => client.setMode(droneId, mode),
    gotoPosition: (droneId: string, lat: number, lon: number, alt: number) => 
      client.gotoPosition(droneId, lat, lon, alt),
  };
}

// Export enums for use in components
export { MAVMode, MAVState, MAVResult };
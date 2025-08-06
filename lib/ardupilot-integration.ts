// Comprehensive ArduPilot Integration System
// Provides full integration with ArduPilot autopilot system including SITL, parameter management,
// flight mode translations, firmware management, and multi-vehicle support

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { webSocketService } from './websocket';

// ArduPilot vehicle types
export enum ArduPilotVehicleType {
  COPTER = 'ArduCopter',
  PLANE = 'ArduPlane',
  ROVER = 'Rover',
  SUB = 'ArduSub',
  BLIMP = 'Blimp',
  ANTENNA_TRACKER = 'AntennaTracker'
}

// ArduPilot flight modes per vehicle type
export const FLIGHT_MODES = {
  [ArduPilotVehicleType.COPTER]: {
    0: 'STABILIZE',
    1: 'ACRO',
    2: 'ALT_HOLD',
    3: 'AUTO',
    4: 'GUIDED',
    5: 'LOITER',
    6: 'RTL',
    7: 'CIRCLE',
    8: 'POSITION',
    9: 'LAND',
    10: 'OF_LOITER',
    11: 'DRIFT',
    13: 'SPORT',
    14: 'FLIP',
    15: 'AUTOTUNE',
    16: 'POSHOLD',
    17: 'BRAKE',
    18: 'THROW',
    19: 'AVOID_ADSB',
    20: 'GUIDED_NOGPS',
    21: 'SMART_RTL',
    22: 'FLOWHOLD',
    23: 'FOLLOW',
    24: 'ZIGZAG',
    25: 'SYSTEMID',
    26: 'AUTOROTATE',
    27: 'AUTO_RTL',
    28: 'TURTLE'
  },
  [ArduPilotVehicleType.PLANE]: {
    0: 'MANUAL',
    1: 'CIRCLE',
    2: 'STABILIZE',
    3: 'TRAINING',
    4: 'ACRO',
    5: 'FLY_BY_WIRE_A',
    6: 'FLY_BY_WIRE_B',
    7: 'CRUISE',
    8: 'AUTOTUNE',
    10: 'AUTO',
    11: 'RTL',
    12: 'LOITER',
    13: 'TAKEOFF',
    14: 'AVOID_ADSB',
    15: 'GUIDED',
    16: 'INITIALISING',
    17: 'QSTABILIZE',
    18: 'QHOVER',
    19: 'QLOITER',
    20: 'QLAND',
    21: 'QRTL',
    22: 'QAUTOTUNE',
    23: 'QACRO',
    24: 'THERMAL',
    25: 'LOITER_ALT_QLAND'
  },
  [ArduPilotVehicleType.ROVER]: {
    0: 'MANUAL',
    1: 'ACRO',
    3: 'STEERING',
    4: 'HOLD',
    5: 'LOITER',
    6: 'FOLLOW',
    7: 'SIMPLE',
    8: 'DOCK',
    10: 'AUTO',
    11: 'RTL',
    12: 'SMART_RTL',
    15: 'GUIDED',
    16: 'INITIALISING'
  },
  [ArduPilotVehicleType.SUB]: {
    0: 'STABILIZE',
    1: 'ACRO',
    2: 'ALT_HOLD',
    3: 'AUTO',
    4: 'GUIDED',
    7: 'CIRCLE',
    9: 'SURFACE',
    16: 'POSHOLD',
    19: 'MANUAL',
    20: 'MOTOR_DETECT',
    21: 'SURFTRAK'
  },
  [ArduPilotVehicleType.BLIMP]: {
    0: 'MANUAL',
    1: 'VELOCITY',
    2: 'LOITER',
    3: 'RTL',
    4: 'LAND'
  },
  [ArduPilotVehicleType.ANTENNA_TRACKER]: {
    0: 'MANUAL',
    1: 'STOP',
    2: 'SCAN',
    10: 'AUTO',
    16: 'INITIALISING'
  }
};

// ArduPilot parameter types
export interface ArduPilotParameter {
  name: string;
  value: number;
  type: 'REAL32' | 'UINT32' | 'INT32' | 'UINT16' | 'INT16' | 'UINT8' | 'INT8';
  description?: string;
  min?: number;
  max?: number;
  increment?: number;
  units?: string;
  bitmask?: string[];
  values?: { [key: number]: string };
}

// Vehicle configuration
export interface VehicleConfig {
  id: string;
  name: string;
  type: ArduPilotVehicleType;
  systemId: number;
  componentId: number;
  sitlEnabled: boolean;
  sitlPort: number;
  parameterFile?: string;
  firmwareVersion?: string;
  boardType?: string;
  customParameters?: { [key: string]: number };
}

// SITL configuration
export interface SITLConfig {
  vehicleType: ArduPilotVehicleType;
  instance: number;
  lat: number;
  lon: number;
  alt: number;
  heading: number;
  speedup: number;
  model?: string;
  home?: string;
  customArgs?: string[];
}

// Telemetry data structure
export interface VehicleTelemetry {
  systemId: number;
  componentId: number;
  timestamp: number;
  position?: {
    lat: number;
    lon: number;
    alt: number; // MSL altitude in meters
    relativeAlt: number; // Relative altitude in meters
  };
  attitude?: {
    roll: number; // radians
    pitch: number; // radians
    yaw: number; // radians
    rollSpeed: number; // rad/s
    pitchSpeed: number; // rad/s
    yawSpeed: number; // rad/s
  };
  velocity?: {
    vx: number; // m/s
    vy: number; // m/s
    vz: number; // m/s
    groundSpeed: number; // m/s
    airSpeed?: number; // m/s (for planes)
  };
  battery?: {
    voltage: number; // V
    current: number; // A
    remaining: number; // percentage
    consumed: number; // mAh
  };
  gps?: {
    fix: number;
    satellites: number;
    hdop: number;
    vdop: number;
  };
  system?: {
    mode: number;
    armed: boolean;
    status: number;
    load: number; // CPU load percentage
  };
  sensors?: {
    gyro: { x: number; y: number; z: number };
    accel: { x: number; y: number; z: number };
    mag: { x: number; y: number; z: number };
    baro: { pressure: number; temperature: number };
  };
}

// Mission item structure matching ArduPilot format
export interface MissionItem {
  seq: number;
  frame: number;
  command: number;
  current: boolean;
  autocontinue: boolean;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  x: number; // latitude or local x
  y: number; // longitude or local y
  z: number; // altitude or local z
}

class ArduPilotIntegration extends EventEmitter {
  private vehicles: Map<string, VehicleConfig> = new Map();
  private sitlProcesses: Map<string, ChildProcess> = new Map();
  private parameters: Map<string, Map<string, ArduPilotParameter>> = new Map();
  private telemetry: Map<string, VehicleTelemetry> = new Map();
  private ardupilotPath: string;
  private connected: boolean = false;

  constructor(ardupilotPath?: string) {
    super();
    this.ardupilotPath = ardupilotPath || path.join(process.cwd(), 'ardupilot');
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Verify ArduPilot installation
      await this.verifyArduPilotInstallation();
      
      // Load default vehicle configurations
      await this.loadDefaultConfigurations();
      
      // Set up WebSocket integration
      this.setupWebSocketIntegration();
      
      this.connected = true;
      this.emit('initialized');
      console.log('ArduPilot integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ArduPilot integration:', error);
      this.emit('error', error);
    }
  }

  private async verifyArduPilotInstallation(): Promise<void> {
    try {
      // Check if ArduPilot directory exists
      await fs.access(this.ardupilotPath);
      
      // Check for key directories
      const requiredDirs = ['ArduCopter', 'ArduPlane', 'Rover', 'ArduSub', 'Tools'];
      for (const dir of requiredDirs) {
        await fs.access(path.join(this.ardupilotPath, dir));
      }
      
      // Check if waf build system is available
      await fs.access(path.join(this.ardupilotPath, 'waf'));
      
      console.log('ArduPilot installation verified');
    } catch (error) {
      throw new Error(`ArduPilot installation not found or incomplete at ${this.ardupilotPath}`);
    }
  }

  private async loadDefaultConfigurations(): Promise<void> {
    // Load default configurations for each vehicle type
    const defaultConfigs: VehicleConfig[] = [
      {
        id: 'copter-1',
        name: 'Default Copter',
        type: ArduPilotVehicleType.COPTER,
        systemId: 1,
        componentId: 1,
        sitlEnabled: true,
        sitlPort: 5760
      },
      {
        id: 'plane-1',
        name: 'Default Plane',
        type: ArduPilotVehicleType.PLANE,
        systemId: 2,
        componentId: 1,
        sitlEnabled: true,
        sitlPort: 5761
      },
      {
        id: 'rover-1',
        name: 'Default Rover',
        type: ArduPilotVehicleType.ROVER,
        systemId: 3,
        componentId: 1,
        sitlEnabled: true,
        sitlPort: 5762
      },
      {
        id: 'sub-1',
        name: 'Default Sub',
        type: ArduPilotVehicleType.SUB,
        systemId: 4,
        componentId: 1,
        sitlEnabled: true,
        sitlPort: 5763
      }
    ];

    for (const config of defaultConfigs) {
      this.vehicles.set(config.id, config);
    }
  }

  private setupWebSocketIntegration(): void {
    if (webSocketService) {
      // Subscribe to MAVLink messages from the web interface
      webSocketService.subscribe('ardupilot_command', (data) => {
        this.handleWebCommand(data);
      });

      // Set up telemetry broadcasting
      setInterval(() => {
        this.broadcastTelemetry();
      }, 100); // 10Hz telemetry rate
    }
  }

  // SITL Management
  public async startSITL(vehicleId: string, config?: Partial<SITLConfig>): Promise<void> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) {
      throw new Error(`Vehicle ${vehicleId} not found`);
    }

    if (this.sitlProcesses.has(vehicleId)) {
      throw new Error(`SITL already running for vehicle ${vehicleId}`);
    }

    const sitlConfig: SITLConfig = {
      vehicleType: vehicle.type,
      instance: parseInt(vehicleId.split('-')[1]) || 0,
      lat: -35.363261,
      lon: 149.165230,
      alt: 584,
      heading: 353,
      speedup: 1,
      ...config
    };

    try {
      const process = await this.launchSITLProcess(vehicle, sitlConfig);
      this.sitlProcesses.set(vehicleId, process);
      
      // Set up process event handlers
      process.on('exit', (code) => {
        console.log(`SITL process for ${vehicleId} exited with code ${code}`);
        this.sitlProcesses.delete(vehicleId);
        this.emit('sitlExit', vehicleId, code);
      });

      process.on('error', (error) => {
        console.error(`SITL process error for ${vehicleId}:`, error);
        this.emit('sitlError', vehicleId, error);
      });

      this.emit('sitlStarted', vehicleId);
      console.log(`SITL started for vehicle ${vehicleId}`);
    } catch (error) {
      throw new Error(`Failed to start SITL for ${vehicleId}: ${error}`);
    }
  }

  private async launchSITLProcess(vehicle: VehicleConfig, config: SITLConfig): Promise<ChildProcess> {
    const simVehiclePath = path.join(this.ardupilotPath, 'Tools', 'autotest', 'sim_vehicle.py');
    
    const args = [
      '--vehicle', vehicle.type,
      '--instance', config.instance.toString(),
      '--speedup', config.speedup.toString(),
      '--sysid', vehicle.systemId.toString(),
      '--home', `${config.lat},${config.lon},${config.alt},${config.heading}`,
      '--out', `127.0.0.1:${vehicle.sitlPort}`,
      '--console'
    ];

    if (config.model) {
      args.push('--frame', config.model);
    }

    if (config.customArgs) {
      args.push(...config.customArgs);
    }

    console.log(`Launching SITL: python3 ${simVehiclePath} ${args.join(' ')}`);

    const process = spawn('python3', [simVehiclePath, ...args], {
      cwd: this.ardupilotPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: path.join(this.ardupilotPath, 'Tools/autotest') }
    });

    // Handle stdout/stderr
    process.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[SITL ${vehicle.id}] ${output}`);
      this.emit('sitlOutput', vehicle.id, output);
    });

    process.stderr?.on('data', (data) => {
      const error = data.toString();
      console.error(`[SITL ${vehicle.id} ERROR] ${error}`);
      this.emit('sitlError', vehicle.id, error);
    });

    return process;
  }

  public async stopSITL(vehicleId: string): Promise<void> {
    const process = this.sitlProcesses.get(vehicleId);
    if (!process) {
      throw new Error(`No SITL process running for vehicle ${vehicleId}`);
    }

    process.kill('SIGTERM');
    
    // Wait for graceful shutdown
    setTimeout(() => {
      if (this.sitlProcesses.has(vehicleId)) {
        process.kill('SIGKILL');
      }
    }, 5000);

    this.sitlProcesses.delete(vehicleId);
    this.emit('sitlStopped', vehicleId);
    console.log(`SITL stopped for vehicle ${vehicleId}`);
  }

  // Parameter Management
  public async loadParameters(vehicleId: string, parameterFile?: string): Promise<void> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) {
      throw new Error(`Vehicle ${vehicleId} not found`);
    }

    try {
      let paramFile = parameterFile;
      if (!paramFile) {
        // Use default parameter file based on vehicle type
        paramFile = path.join(this.ardupilotPath, 'Tools', 'Frame_params', this.getDefaultParameterFile(vehicle.type));
      }

      const parameters = await this.parseParameterFile(paramFile);
      this.parameters.set(vehicleId, parameters);
      
      this.emit('parametersLoaded', vehicleId, parameters.size);
      console.log(`Loaded ${parameters.size} parameters for vehicle ${vehicleId}`);
    } catch (error) {
      throw new Error(`Failed to load parameters for ${vehicleId}: ${error}`);
    }
  }

  private getDefaultParameterFile(vehicleType: ArduPilotVehicleType): string {
    switch (vehicleType) {
      case ArduPilotVehicleType.COPTER:
        return 'Holybro-S500.param';
      case ArduPilotVehicleType.PLANE:
        return 'SkyWalkerX8.param';
      case ArduPilotVehicleType.ROVER:
        return 'AION_R1_Rover.param';
      case ArduPilotVehicleType.SUB:
        return 'BlueROV2.param';
      default:
        return 'default.param';
    }
  }

  private async parseParameterFile(filePath: string): Promise<Map<string, ArduPilotParameter>> {
    const parameters = new Map<string, ArduPilotParameter>();
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [name, valueStr] = trimmed.split(',').map(s => s.trim());
          if (name && valueStr) {
            const value = parseFloat(valueStr);
            if (!isNaN(value)) {
              parameters.set(name, {
                name,
                value,
                type: this.inferParameterType(value)
              });
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to parse parameter file ${filePath}: ${error}`);
    }
    
    return parameters;
  }

  private inferParameterType(value: number): ArduPilotParameter['type'] {
    if (Number.isInteger(value)) {
      if (value >= -32768 && value <= 32767) return 'INT16';
      if (value >= 0 && value <= 65535) return 'UINT16';
      if (value >= -2147483648 && value <= 2147483647) return 'INT32';
      return 'UINT32';
    }
    return 'REAL32';
  }

  public getParameter(vehicleId: string, paramName: string): ArduPilotParameter | undefined {
    const vehicleParams = this.parameters.get(vehicleId);
    return vehicleParams?.get(paramName);
  }

  public async setParameter(vehicleId: string, paramName: string, value: number): Promise<void> {
    const vehicleParams = this.parameters.get(vehicleId);
    if (!vehicleParams) {
      throw new Error(`No parameters loaded for vehicle ${vehicleId}`);
    }

    const param = vehicleParams.get(paramName);
    if (!param) {
      throw new Error(`Parameter ${paramName} not found for vehicle ${vehicleId}`);
    }

    // Validate parameter value
    if (param.min !== undefined && value < param.min) {
      throw new Error(`Parameter ${paramName} value ${value} below minimum ${param.min}`);
    }
    if (param.max !== undefined && value > param.max) {
      throw new Error(`Parameter ${paramName} value ${value} above maximum ${param.max}`);
    }

    // Update parameter
    param.value = value;
    vehicleParams.set(paramName, param);

    // Send parameter to vehicle via MAVLink
    await this.sendParameterToVehicle(vehicleId, param);
    
    this.emit('parameterChanged', vehicleId, paramName, value);
    console.log(`Parameter ${paramName} set to ${value} for vehicle ${vehicleId}`);
  }

  private async sendParameterToVehicle(vehicleId: string, param: ArduPilotParameter): Promise<void> {
    if (webSocketService) {
      webSocketService.send('mavlink_message', {
        id: 23, // PARAM_SET
        sysid: 255, // GCS system ID
        compid: 0,
        payload: {
          target_system: this.vehicles.get(vehicleId)?.systemId || 1,
          target_component: this.vehicles.get(vehicleId)?.componentId || 1,
          param_id: param.name.padEnd(16, '\0'),
          param_value: param.value,
          param_type: this.getMAVParamType(param.type)
        }
      });
    }
  }

  private getMAVParamType(type: ArduPilotParameter['type']): number {
    switch (type) {
      case 'UINT8': return 1;
      case 'INT8': return 2;
      case 'UINT16': return 3;
      case 'INT16': return 4;
      case 'UINT32': return 5;
      case 'INT32': return 6;
      case 'REAL32': return 9;
      default: return 9;
    }
  }

  // Flight Mode Management
  public getFlightModeName(vehicleId: string, modeNumber: number): string {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return 'UNKNOWN';

    const modes = FLIGHT_MODES[vehicle.type];
    return modes[modeNumber] || 'UNKNOWN';
  }

  public getFlightModeNumber(vehicleId: string, modeName: string): number | undefined {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return undefined;

    const modes = FLIGHT_MODES[vehicle.type];
    const entry = Object.entries(modes).find(([_, name]) => name === modeName);
    return entry ? parseInt(entry[0]) : undefined;
  }

  public async setFlightMode(vehicleId: string, mode: string | number): Promise<void> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) {
      throw new Error(`Vehicle ${vehicleId} not found`);
    }

    let modeNumber: number;
    if (typeof mode === 'string') {
      const modeNum = this.getFlightModeNumber(vehicleId, mode);
      if (modeNum === undefined) {
        throw new Error(`Invalid flight mode '${mode}' for vehicle type ${vehicle.type}`);
      }
      modeNumber = modeNum;
    } else {
      modeNumber = mode;
    }

    // Send flight mode change command via MAVLink
    if (webSocketService) {
      webSocketService.send('mavlink_message', {
        id: 76, // COMMAND_LONG
        sysid: 255,
        compid: 0,
        payload: {
          target_system: vehicle.systemId,
          target_component: vehicle.componentId,
          command: 176, // MAV_CMD_DO_SET_MODE
          confirmation: 0,
          param1: 1, // Set mode
          param2: modeNumber,
          param3: 0,
          param4: 0,
          param5: 0,
          param6: 0,
          param7: 0
        }
      });
    }

    this.emit('flightModeChanged', vehicleId, modeNumber, this.getFlightModeName(vehicleId, modeNumber));
  }

  // Telemetry Processing
  public processTelemetryMessage(message: any): void {
    const vehicleId = `${message.payload?.vehicleType || 'copter'}-${message.sysid}`;
    
    let telemetry = this.telemetry.get(vehicleId);
    if (!telemetry) {
      telemetry = {
        systemId: message.sysid,
        componentId: message.compid,
        timestamp: Date.now()
      };
      this.telemetry.set(vehicleId, telemetry);
    }

    telemetry.timestamp = Date.now();

    // Process different message types
    switch (message.id) {
      case 0: // HEARTBEAT
        this.processHeartbeat(telemetry, message.payload);
        break;
      case 1: // SYS_STATUS
        this.processSystemStatus(telemetry, message.payload);
        break;
      case 24: // GPS_RAW_INT
        this.processGPSRaw(telemetry, message.payload);
        break;
      case 30: // ATTITUDE
        this.processAttitude(telemetry, message.payload);
        break;
      case 33: // GLOBAL_POSITION_INT
        this.processGlobalPosition(telemetry, message.payload);
        break;
      case 74: // VFR_HUD
        this.processVFRHUD(telemetry, message.payload);
        break;
      case 147: // BATTERY_STATUS
        this.processBatteryStatus(telemetry, message.payload);
        break;
    }

    this.emit('telemetryUpdate', vehicleId, telemetry);
  }

  private processHeartbeat(telemetry: VehicleTelemetry, payload: any): void {
    if (!telemetry.system) telemetry.system = { mode: 0, armed: false, status: 0, load: 0 };
    
    telemetry.system.mode = payload.custom_mode;
    telemetry.system.armed = (payload.base_mode & 128) !== 0; // MAV_MODE_FLAG_SAFETY_ARMED
    telemetry.system.status = payload.system_status;
  }

  private processSystemStatus(telemetry: VehicleTelemetry, payload: any): void {
    if (!telemetry.system) telemetry.system = { mode: 0, armed: false, status: 0, load: 0 };
    if (!telemetry.battery) telemetry.battery = { voltage: 0, current: 0, remaining: 0, consumed: 0 };
    
    telemetry.system.load = payload.load / 10; // Convert from permille to percentage
    telemetry.battery.voltage = payload.voltage_battery / 1000; // Convert mV to V
    telemetry.battery.current = payload.current_battery / 100; // Convert 10*mA to A
    telemetry.battery.remaining = payload.battery_remaining;
  }

  private processGPSRaw(telemetry: VehicleTelemetry, payload: any): void {
    if (!telemetry.gps) telemetry.gps = { fix: 0, satellites: 0, hdop: 0, vdop: 0 };
    
    telemetry.gps.fix = payload.fix_type;
    telemetry.gps.satellites = payload.satellites_visible;
    telemetry.gps.hdop = payload.eph / 100;
    telemetry.gps.vdop = payload.epv / 100;
  }

  private processAttitude(telemetry: VehicleTelemetry, payload: any): void {
    telemetry.attitude = {
      roll: payload.roll,
      pitch: payload.pitch,
      yaw: payload.yaw,
      rollSpeed: payload.rollspeed,
      pitchSpeed: payload.pitchspeed,
      yawSpeed: payload.yawspeed
    };
  }

  private processGlobalPosition(telemetry: VehicleTelemetry, payload: any): void {
    telemetry.position = {
      lat: payload.lat / 1e7,
      lon: payload.lon / 1e7,
      alt: payload.alt / 1000,
      relativeAlt: payload.relative_alt / 1000
    };

    if (!telemetry.velocity) telemetry.velocity = { vx: 0, vy: 0, vz: 0, groundSpeed: 0 };
    telemetry.velocity.vx = payload.vx / 100;
    telemetry.velocity.vy = payload.vy / 100;
    telemetry.velocity.vz = payload.vz / 100;
    telemetry.velocity.groundSpeed = Math.sqrt(telemetry.velocity.vx ** 2 + telemetry.velocity.vy ** 2);
  }

  private processVFRHUD(telemetry: VehicleTelemetry, payload: any): void {
    if (!telemetry.velocity) telemetry.velocity = { vx: 0, vy: 0, vz: 0, groundSpeed: 0 };
    
    telemetry.velocity.airSpeed = payload.airspeed;
    telemetry.velocity.groundSpeed = payload.groundspeed;
  }

  private processBatteryStatus(telemetry: VehicleTelemetry, payload: any): void {
    if (!telemetry.battery) telemetry.battery = { voltage: 0, current: 0, remaining: 0, consumed: 0 };
    
    if (payload.voltages && payload.voltages.length > 0) {
      telemetry.battery.voltage = payload.voltages[0] / 1000; // Convert mV to V
    }
    telemetry.battery.current = payload.current_battery / 100; // Convert 10*mA to A
    telemetry.battery.remaining = payload.battery_remaining;
    telemetry.battery.consumed = payload.current_consumed;
  }

  private broadcastTelemetry(): void {
    if (webSocketService && this.telemetry.size > 0) {
      const telemetryData = Object.fromEntries(this.telemetry.entries());
      webSocketService.send('ardupilot_telemetry', telemetryData);
    }
  }

  // Vehicle Management
  public addVehicle(config: VehicleConfig): void {
    this.vehicles.set(config.id, config);
    this.emit('vehicleAdded', config);
    console.log(`Added vehicle ${config.id} (${config.type})`);
  }

  public removeVehicle(vehicleId: string): void {
    // Stop SITL if running
    if (this.sitlProcesses.has(vehicleId)) {
      this.stopSITL(vehicleId);
    }

    // Clean up data
    this.vehicles.delete(vehicleId);
    this.parameters.delete(vehicleId);
    this.telemetry.delete(vehicleId);

    this.emit('vehicleRemoved', vehicleId);
    console.log(`Removed vehicle ${vehicleId}`);
  }

  public getVehicles(): VehicleConfig[] {
    return Array.from(this.vehicles.values());
  }

  public getVehicle(vehicleId: string): VehicleConfig | undefined {
    return this.vehicles.get(vehicleId);
  }

  public getTelemetry(vehicleId: string): VehicleTelemetry | undefined {
    return this.telemetry.get(vehicleId);
  }

  // Command handling from web interface
  private async handleWebCommand(data: any): Promise<void> {
    try {
      switch (data.command) {
        case 'start_sitl':
          await this.startSITL(data.vehicleId, data.config);
          break;
        case 'stop_sitl':
          await this.stopSITL(data.vehicleId);
          break;
        case 'set_parameter':
          await this.setParameter(data.vehicleId, data.paramName, data.value);
          break;
        case 'set_flight_mode':
          await this.setFlightMode(data.vehicleId, data.mode);
          break;
        case 'load_parameters':
          await this.loadParameters(data.vehicleId, data.parameterFile);
          break;
        default:
          console.warn(`Unknown ArduPilot command: ${data.command}`);
      }
    } catch (error) {
      console.error(`Error handling ArduPilot command ${data.command}:`, error);
      this.emit('commandError', data.command, error);
    }
  }

  // Cleanup
  public async shutdown(): Promise<void> {
    // Stop all SITL processes
    const stopPromises = Array.from(this.sitlProcesses.keys()).map(vehicleId => 
      this.stopSITL(vehicleId).catch(err => console.error(`Error stopping SITL for ${vehicleId}:`, err))
    );

    await Promise.all(stopPromises);

    this.connected = false;
    this.emit('shutdown');
    console.log('ArduPilot integration shut down');
  }
}

export { ArduPilotIntegration, VehicleConfig, SITLConfig, VehicleTelemetry, ArduPilotParameter, MissionItem };
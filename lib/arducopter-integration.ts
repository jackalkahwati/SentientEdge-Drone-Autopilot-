// ArduCopter Integration System
// Comprehensive integration between ArduCopter autopilot and web interface

import { Drone, DroneStatus, DroneType, Mission, MissionWaypoint } from './types';
import { MAVLinkClient, MAVMode, MAVState, MAVResult } from './mavlink';
import { webSocketService } from './websocket';

// ArduCopter-specific flight modes mapping
export enum CopterFlightMode {
  STABILIZE = 0,
  ACRO = 1,
  ALT_HOLD = 2,
  AUTO = 3,
  GUIDED = 4,
  LOITER = 5,
  RTL = 6,
  CIRCLE = 7,
  LAND = 9,
  DRIFT = 11,
  SPORT = 13,
  FLIP = 14,
  AUTOTUNE = 15,
  POSHOLD = 16,
  BRAKE = 17,
  THROW = 18,
  AVOID_ADSB = 19,
  GUIDED_NOGPS = 20,
  SMART_RTL = 21,
  FLOWHOLD = 22,
  FOLLOW = 23,
  ZIGZAG = 24,
  SYSTEMID = 25,
  AUTOROTATE = 26,
  AUTO_RTL = 27,
  TURTLE = 28,
}

// ArduCopter frame types
export enum CopterFrameType {
  UNDEFINED = 0,
  MULTICOPTER = 1,
  HELI = 2,
}

// ArduCopter parameter categories
export enum CopterParameterCategory {
  FLIGHT_MODES = 'flight_modes',
  PID_TUNING = 'pid_tuning',
  ATTITUDE_CONTROL = 'attitude_control',
  POSITION_CONTROL = 'position_control',
  MOTOR_OUTPUTS = 'motor_outputs',
  BATTERY_MONITOR = 'battery_monitor',
  COMPASS = 'compass',
  GPS = 'gps',
  RANGEFINDER = 'rangefinder',
  OPTICAL_FLOW = 'optical_flow',
  FAILSAFE = 'failsafe',
  GEOFENCE = 'geofence',
  LOG_SETTINGS = 'log_settings',
  ADVANCED = 'advanced',
}

// ArduCopter parameter definition
export interface CopterParameter {
  name: string;
  category: CopterParameterCategory;
  description: string;
  type: 'int' | 'float' | 'enum' | 'bitmask';
  unit?: string;
  min?: number;
  max?: number;
  increment?: number;
  enumValues?: { [key: number]: string };
  bitmaskValues?: { [key: number]: string };
  defaultValue: number;
  currentValue?: number;
  readonly?: boolean;
  requiresReboot?: boolean;
  safetyLevel: 'safe' | 'caution' | 'dangerous';
}

// Comprehensive ArduCopter parameter definitions
export const ARDUCOPTER_PARAMETERS: { [key: string]: CopterParameter } = {
  // Flight Mode Parameters
  'FLTMODE1': {
    name: 'FLTMODE1',
    category: CopterParameterCategory.FLIGHT_MODES,
    description: 'Flight mode for RC channel switch position 1',
    type: 'enum',
    enumValues: {
      0: 'Stabilize',
      1: 'Acro',
      2: 'AltHold',
      3: 'Auto',
      4: 'Guided',
      5: 'Loiter',
      6: 'RTL',
      7: 'Circle',
      9: 'Land',
      11: 'Drift',
      13: 'Sport',
      14: 'Flip',
      15: 'AutoTune',
      16: 'PosHold',
      17: 'Brake',
    },
    defaultValue: 0,
    safetyLevel: 'safe',
  },

  // PID Tuning Parameters
  'ATC_RAT_RLL_P': {
    name: 'ATC_RAT_RLL_P',
    category: CopterParameterCategory.PID_TUNING,
    description: 'Roll axis rate controller P gain',
    type: 'float',
    unit: '',
    min: 0.0,
    max: 0.50,
    increment: 0.001,
    defaultValue: 0.135,
    safetyLevel: 'caution',
  },
  
  'ATC_RAT_RLL_I': {
    name: 'ATC_RAT_RLL_I',
    category: CopterParameterCategory.PID_TUNING,
    description: 'Roll axis rate controller I gain',
    type: 'float',
    unit: '',
    min: 0.0,
    max: 0.50,
    increment: 0.001,
    defaultValue: 0.135,
    safetyLevel: 'caution',
  },

  'ATC_RAT_RLL_D': {
    name: 'ATC_RAT_RLL_D',
    category: CopterParameterCategory.PID_TUNING,
    description: 'Roll axis rate controller D gain',
    type: 'float',
    unit: '',
    min: 0.0,
    max: 0.02,
    increment: 0.0001,
    defaultValue: 0.0036,
    safetyLevel: 'caution',
  },

  'ATC_RAT_PIT_P': {
    name: 'ATC_RAT_PIT_P',
    category: CopterParameterCategory.PID_TUNING,
    description: 'Pitch axis rate controller P gain',
    type: 'float',
    unit: '',
    min: 0.0,
    max: 0.50,
    increment: 0.001,
    defaultValue: 0.135,
    safetyLevel: 'caution',
  },

  'ATC_RAT_YAW_P': {
    name: 'ATC_RAT_YAW_P',
    category: CopterParameterCategory.PID_TUNING,
    description: 'Yaw axis rate controller P gain',
    type: 'float',
    unit: '',
    min: 0.10,
    max: 2.50,
    increment: 0.001,
    defaultValue: 0.180,
    safetyLevel: 'caution',
  },

  // Motor Parameters
  'MOT_PWM_MIN': {
    name: 'MOT_PWM_MIN',
    category: CopterParameterCategory.MOTOR_OUTPUTS,
    description: 'Minimum PWM output to motors',
    type: 'int',
    unit: 'us',
    min: 800,
    max: 2200,
    increment: 1,
    defaultValue: 1000,
    safetyLevel: 'dangerous',
  },

  'MOT_PWM_MAX': {
    name: 'MOT_PWM_MAX',
    category: CopterParameterCategory.MOTOR_OUTPUTS,
    description: 'Maximum PWM output to motors',
    type: 'int',
    unit: 'us',
    min: 800,
    max: 2200,
    increment: 1,
    defaultValue: 2000,
    safetyLevel: 'dangerous',
  },

  'MOT_SPIN_ARMED': {
    name: 'MOT_SPIN_ARMED',
    category: CopterParameterCategory.MOTOR_OUTPUTS,
    description: 'Motor spin when armed',
    type: 'float',
    unit: '',
    min: 0.0,
    max: 0.5,
    increment: 0.01,
    defaultValue: 0.10,
    safetyLevel: 'caution',
  },

  // Battery Monitor Parameters
  'BATT_MONITOR': {
    name: 'BATT_MONITOR',
    category: CopterParameterCategory.BATTERY_MONITOR,
    description: 'Battery monitoring type',
    type: 'enum',
    enumValues: {
      0: 'Disabled',
      3: 'Analog Voltage Only',
      4: 'Analog Voltage and Current',
      5: 'Solo',
      6: 'Bebop',
      7: 'SMBus-Generic',
      8: 'DroneCAN-BatteryInfo',
      9: 'ESC',
      10: 'Sum Of Selected Monitors',
      11: 'FuelFlow',
      12: 'FuelLevelPWM',
      13: 'SMBUS-SUI3',
      14: 'SMBUS-SUI6',
      15: 'NeoDesign',
      16: 'SMBus-Maxell',
      17: 'Generator-Elec',
      18: 'Generator-Fuel',
      19: 'Rotoye',
      20: 'MPPT',
      21: 'INA2XX',
      22: 'LTC2946',
      23: 'Torqeedo',
      24: 'FuelLevelAnalog',
      25: 'Synthetic Current and Analog Voltage',
      26: 'INA239_SPI',
      27: 'EFI',
      28: 'AD7091R5',
      29: 'Scripting',
    },
    defaultValue: 0,
    safetyLevel: 'safe',
  },

  // Failsafe Parameters
  'FS_THR_ENABLE': {
    name: 'FS_THR_ENABLE',
    category: CopterParameterCategory.FAILSAFE,
    description: 'Throttle failsafe enable',
    type: 'enum',
    enumValues: {
      0: 'Disabled',
      1: 'Enabled Always RTL',
      2: 'Enabled Continue with Mission in Auto Mode', // Removed in ArduCopter 4.0+
      3: 'Enabled Always Land',
      4: 'Enabled Always SmartRTL or RTL',
      5: 'Enabled Always SmartRTL or Land',
      6: 'Enabled Always Land in Auto mode, otherwise RTL',
      7: 'Enabled Always Brake or Land',
    },
    defaultValue: 1,
    safetyLevel: 'safe',
  },

  'FS_GCS_ENABLE': {
    name: 'FS_GCS_ENABLE',
    category: CopterParameterCategory.FAILSAFE,
    description: 'Ground Control Station failsafe enable',
    type: 'enum',
    enumValues: {
      0: 'Disabled',
      1: 'Enabled Always RTL',
      2: 'Enabled Continue with Mission in Auto Mode', // Removed in ArduCopter 4.0+
      3: 'Enabled Always SmartRTL or RTL',
      4: 'Enabled Always SmartRTL or Land',
      5: 'Enabled Always Land',
      6: 'Enabled Always Land in Auto mode, otherwise RTL',
      7: 'Enabled Always Brake or Land',
    },
    defaultValue: 0,
    safetyLevel: 'safe',
  },

  // Geofence Parameters
  'FENCE_ENABLE': {
    name: 'FENCE_ENABLE',
    category: CopterParameterCategory.GEOFENCE,
    description: 'Fence enable/disable',
    type: 'bitmask',
    bitmaskValues: {
      1: 'Altitude Fence',
      2: 'Circle Fence',
      4: 'Polygon Fence',
    },
    defaultValue: 0,
    safetyLevel: 'safe',
  },

  'FENCE_ALT_MAX': {
    name: 'FENCE_ALT_MAX',
    category: CopterParameterCategory.GEOFENCE,
    description: 'Fence maximum altitude',
    type: 'float',
    unit: 'm',
    min: 10,
    max: 1000,
    increment: 1,
    defaultValue: 100,
    safetyLevel: 'safe',
  },
};

// ArduCopter telemetry data structure
export interface CopterTelemetry {
  systemId: number;
  componentId: number;
  flightMode: CopterFlightMode;
  flightModeString: string;
  armed: boolean;
  ekfOk: boolean;
  position: {
    lat: number;
    lon: number;
    alt: number;      // Altitude above MSL in meters
    relativeAlt: number; // Altitude above home in meters
  };
  attitude: {
    roll: number;     // degrees
    pitch: number;    // degrees
    yaw: number;      // degrees
  };
  velocity: {
    vx: number;       // m/s
    vy: number;       // m/s
    vz: number;       // m/s
    groundSpeed: number; // m/s
  };
  battery: {
    voltage: number;  // V
    current: number;  // A
    remaining: number; // %
  };
  motors: {
    armed: boolean;
    motorCount: number;
    motorOutputs: number[]; // PWM values
  };
  sensors: {
    gpsFixType: number;
    gpsNumSat: number;
    compassVariance: number;
    vibrationX: number;
    vibrationY: number;
    vibrationZ: number;
  };
  modes: {
    stabilize: boolean;
    guided: boolean;
    auto: boolean;
    rtl: boolean;
    land: boolean;
  };
  lastUpdate: number; // timestamp
}

// ArduCopter-specific integration class
export class ArduCopterIntegration {
  private static instance: ArduCopterIntegration;
  private mavlinkClient: MAVLinkClient;
  private parameters: Map<string, CopterParameter> = new Map();
  private telemetryData: Map<number, CopterTelemetry> = new Map();
  private listeners: Array<(data: CopterTelemetry[]) => void> = [];

  private constructor() {
    this.mavlinkClient = MAVLinkClient.getInstance();
    this.initializeParameters();
  }

  public static getInstance(): ArduCopterIntegration {
    if (!ArduCopterIntegration.instance) {
      ArduCopterIntegration.instance = new ArduCopterIntegration();
    }
    return ArduCopterIntegration.instance;
  }

  private initializeParameters(): void {
    Object.entries(ARDUCOPTER_PARAMETERS).forEach(([name, param]) => {
      this.parameters.set(name, { ...param, currentValue: param.defaultValue });
    });
  }

  // Flight mode translation methods
  public getFlightModeString(modeNumber: number): string {
    const modeNames: { [key: number]: string } = {
      [CopterFlightMode.STABILIZE]: 'Stabilize',
      [CopterFlightMode.ACRO]: 'Acro',
      [CopterFlightMode.ALT_HOLD]: 'Alt Hold',
      [CopterFlightMode.AUTO]: 'Auto',
      [CopterFlightMode.GUIDED]: 'Guided',
      [CopterFlightMode.LOITER]: 'Loiter',
      [CopterFlightMode.RTL]: 'RTL',
      [CopterFlightMode.CIRCLE]: 'Circle',
      [CopterFlightMode.LAND]: 'Land',
      [CopterFlightMode.DRIFT]: 'Drift',
      [CopterFlightMode.SPORT]: 'Sport',
      [CopterFlightMode.FLIP]: 'Flip',
      [CopterFlightMode.AUTOTUNE]: 'AutoTune',
      [CopterFlightMode.POSHOLD]: 'Position Hold',
      [CopterFlightMode.BRAKE]: 'Brake',
      [CopterFlightMode.THROW]: 'Throw',
      [CopterFlightMode.AVOID_ADSB]: 'Avoid ADSB',
      [CopterFlightMode.GUIDED_NOGPS]: 'Guided NoGPS',
      [CopterFlightMode.SMART_RTL]: 'Smart RTL',
      [CopterFlightMode.FLOWHOLD]: 'FlowHold',
      [CopterFlightMode.FOLLOW]: 'Follow',
      [CopterFlightMode.ZIGZAG]: 'ZigZag',
      [CopterFlightMode.SYSTEMID]: 'SystemID',
      [CopterFlightMode.AUTOROTATE]: 'AutoRotate',
      [CopterFlightMode.AUTO_RTL]: 'Auto RTL',
      [CopterFlightMode.TURTLE]: 'Turtle',
    };
    return modeNames[modeNumber] || `Unknown (${modeNumber})`;
  }

  public isManualMode(mode: CopterFlightMode): boolean {
    return [
      CopterFlightMode.STABILIZE,
      CopterFlightMode.ACRO,
      CopterFlightMode.ALT_HOLD,
      CopterFlightMode.SPORT,
      CopterFlightMode.DRIFT,
      CopterFlightMode.POSHOLD,
    ].includes(mode);
  }

  public isAutonomousMode(mode: CopterFlightMode): boolean {
    return [
      CopterFlightMode.AUTO,
      CopterFlightMode.GUIDED,
      CopterFlightMode.RTL,
      CopterFlightMode.SMART_RTL,
      CopterFlightMode.LAND,
      CopterFlightMode.CIRCLE,
      CopterFlightMode.BRAKE,
      CopterFlightMode.AUTO_RTL,
    ].includes(mode);
  }

  public requiresGPS(mode: CopterFlightMode): boolean {
    return [
      CopterFlightMode.AUTO,
      CopterFlightMode.GUIDED,
      CopterFlightMode.LOITER,
      CopterFlightMode.RTL,
      CopterFlightMode.CIRCLE,
      CopterFlightMode.SMART_RTL,
      CopterFlightMode.POSHOLD,
      CopterFlightMode.BRAKE,
      CopterFlightMode.FOLLOW,
      CopterFlightMode.ZIGZAG,
      CopterFlightMode.AUTO_RTL,
    ].includes(mode);
  }

  // Parameter management methods
  public getParameter(name: string): CopterParameter | undefined {
    return this.parameters.get(name);
  }

  public getParametersByCategory(category: CopterParameterCategory): CopterParameter[] {
    return Array.from(this.parameters.values()).filter(param => param.category === category);
  }

  public async setParameter(name: string, value: number): Promise<boolean> {
    const param = this.parameters.get(name);
    if (!param) {
      throw new Error(`Parameter ${name} not found`);
    }

    // Validate parameter value
    if (param.min !== undefined && value < param.min) {
      throw new Error(`Value ${value} below minimum ${param.min} for parameter ${name}`);
    }
    if (param.max !== undefined && value > param.max) {
      throw new Error(`Value ${value} above maximum ${param.max} for parameter ${name}`);
    }

    // Send parameter to ArduCopter via MAVLink
    try {
      if (webSocketService) {
        webSocketService.send('set_parameter', { name, value });
        param.currentValue = value;
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to set parameter ${name}:`, error);
      return false;
    }
  }

  public async loadParametersFromCopter(systemId: number): Promise<void> {
    // Request all parameters from the copter
    if (webSocketService) {
      webSocketService.send('request_parameters', { systemId });
    }
  }

  // Motor test and calibration
  public async testMotor(motorNumber: number, pwmValue: number, durationMs: number = 3000): Promise<boolean> {
    try {
      if (webSocketService) {
        webSocketService.send('motor_test', {
          motorNumber,
          pwm: pwmValue,
          duration: durationMs
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Motor test failed:', error);
      return false;
    }
  }

  public async calibrateESCs(): Promise<boolean> {
    try {
      if (webSocketService) {
        webSocketService.send('calibrate_escs', {});
        return true;
      }
      return false;
    } catch (error) {
      console.error('ESC calibration failed:', error);
      return false;
    }
  }

  // Safety features
  public async enableGeofence(altitudeMax: number, radiusMax?: number): Promise<boolean> {
    try {
      await this.setParameter('FENCE_ALT_MAX', altitudeMax);
      let fenceEnable = 1; // Altitude fence
      
      if (radiusMax) {
        await this.setParameter('FENCE_RADIUS', radiusMax);
        fenceEnable |= 2; // Circle fence
      }
      
      await this.setParameter('FENCE_ENABLE', fenceEnable);
      return true;
    } catch (error) {
      console.error('Failed to enable geofence:', error);
      return false;
    }
  }

  public async setFailsafeAction(type: 'throttle' | 'gcs', action: number): Promise<boolean> {
    try {
      const paramName = type === 'throttle' ? 'FS_THR_ENABLE' : 'FS_GCS_ENABLE';
      await this.setParameter(paramName, action);
      return true;
    } catch (error) {
      console.error(`Failed to set ${type} failsafe:`, error);
      return false;
    }
  }

  // Mission planning for copters
  public createCopterMission(waypoints: MissionWaypoint[]): Mission {
    // Convert waypoints to ArduCopter-specific mission format
    const copterWaypoints = waypoints.map((wp, index) => ({
      ...wp,
      command: this.getArduCopterCommand(wp.action),
      frame: 3, // MAV_FRAME_GLOBAL_RELATIVE_ALT_INT
      current: index === 0 ? 1 : 0,
      autocontinue: 1,
    }));

    return {
      id: `mission-${Date.now()}`,
      name: 'ArduCopter Mission',
      description: 'Auto-generated copter mission',
      status: 'draft',
      priority: 'medium',
      waypoints: copterWaypoints,
      assignedDrones: [],
      estimatedDuration: this.estimateMissionDuration(copterWaypoints),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private getArduCopterCommand(action: string): number {
    const commandMap: { [key: string]: number } = {
      'waypoint': 16,     // MAV_CMD_NAV_WAYPOINT
      'takeoff': 22,      // MAV_CMD_NAV_TAKEOFF
      'land': 21,         // MAV_CMD_NAV_LAND
      'rtl': 20,          // MAV_CMD_NAV_RETURN_TO_LAUNCH
      'loiter_time': 19,  // MAV_CMD_NAV_LOITER_TIME
      'loiter_turns': 18, // MAV_CMD_NAV_LOITER_TURNS
      'do_set_roi': 201,  // MAV_CMD_DO_SET_ROI
      'do_change_speed': 178, // MAV_CMD_DO_CHANGE_SPEED
    };
    return commandMap[action] || 16; // Default to waypoint
  }

  private estimateMissionDuration(waypoints: MissionWaypoint[]): number {
    // Simple duration estimation based on waypoint count and distances
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      totalDistance += this.calculateDistance(
        prev.location[1], prev.location[0],
        curr.location[1], curr.location[0]
      );
    }
    
    const averageSpeed = 10; // m/s
    return Math.ceil(totalDistance / averageSpeed / 60); // minutes
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Telemetry processing
  public processTelemetry(systemId: number, telemetryData: any): void {
    const existing = this.telemetryData.get(systemId);
    const telemetry: CopterTelemetry = {
      systemId,
      componentId: telemetryData.componentId || 1,
      flightMode: telemetryData.flightMode || CopterFlightMode.STABILIZE,
      flightModeString: this.getFlightModeString(telemetryData.flightMode || 0),
      armed: telemetryData.armed || false,
      ekfOk: telemetryData.ekfOk || false,
      position: {
        lat: telemetryData.position?.lat || 0,
        lon: telemetryData.position?.lon || 0,
        alt: telemetryData.position?.alt || 0,
        relativeAlt: telemetryData.position?.relativeAlt || 0,
      },
      attitude: {
        roll: telemetryData.attitude?.roll || 0,
        pitch: telemetryData.attitude?.pitch || 0,
        yaw: telemetryData.attitude?.yaw || 0,
      },
      velocity: {
        vx: telemetryData.velocity?.vx || 0,
        vy: telemetryData.velocity?.vy || 0,
        vz: telemetryData.velocity?.vz || 0,
        groundSpeed: telemetryData.velocity?.groundSpeed || 0,
      },
      battery: {
        voltage: telemetryData.battery?.voltage || 0,
        current: telemetryData.battery?.current || 0,
        remaining: telemetryData.battery?.remaining || 0,
      },
      motors: {
        armed: telemetryData.motors?.armed || false,
        motorCount: telemetryData.motors?.motorCount || 4,
        motorOutputs: telemetryData.motors?.motorOutputs || [],
      },
      sensors: {
        gpsFixType: telemetryData.sensors?.gpsFixType || 0,
        gpsNumSat: telemetryData.sensors?.gpsNumSat || 0,
        compassVariance: telemetryData.sensors?.compassVariance || 0,
        vibrationX: telemetryData.sensors?.vibrationX || 0,
        vibrationY: telemetryData.sensors?.vibrationY || 0,
        vibrationZ: telemetryData.sensors?.vibrationZ || 0,
      },
      modes: {
        stabilize: telemetryData.flightMode === CopterFlightMode.STABILIZE,
        guided: telemetryData.flightMode === CopterFlightMode.GUIDED,
        auto: telemetryData.flightMode === CopterFlightMode.AUTO,
        rtl: telemetryData.flightMode === CopterFlightMode.RTL,
        land: telemetryData.flightMode === CopterFlightMode.LAND,
      },
      lastUpdate: Date.now(),
    };

    this.telemetryData.set(systemId, telemetry);
    this.notifyTelemetryListeners();
  }

  public getTelemetryData(systemId?: number): CopterTelemetry[] {
    if (systemId) {
      const data = this.telemetryData.get(systemId);
      return data ? [data] : [];
    }
    return Array.from(this.telemetryData.values());
  }

  public addTelemetryListener(listener: (data: CopterTelemetry[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyTelemetryListeners(): void {
    const data = this.getTelemetryData();
    this.listeners.forEach(listener => listener(data));
  }

  // Utility methods
  public validateParameterValue(name: string, value: number): { valid: boolean; error?: string } {
    const param = this.parameters.get(name);
    if (!param) {
      return { valid: false, error: `Parameter ${name} not found` };
    }

    if (param.min !== undefined && value < param.min) {
      return { valid: false, error: `Value below minimum ${param.min}` };
    }

    if (param.max !== undefined && value > param.max) {
      return { valid: false, error: `Value above maximum ${param.max}` };
    }

    return { valid: true };
  }

  public getParameterCategories(): CopterParameterCategory[] {
    return Object.values(CopterParameterCategory);
  }

  public exportParameters(): { [key: string]: number } {
    const exported: { [key: string]: number } = {};
    this.parameters.forEach((param, name) => {
      if (param.currentValue !== undefined) {
        exported[name] = param.currentValue;
      }
    });
    return exported;
  }

  public async importParameters(params: { [key: string]: number }): Promise<void> {
    for (const [name, value] of Object.entries(params)) {
      try {
        await this.setParameter(name, value);
      } catch (error) {
        console.error(`Failed to import parameter ${name}:`, error);
      }
    }
  }
}

// React hook for ArduCopter integration
export function useArduCopter() {
  const integration = ArduCopterIntegration.getInstance();
  
  return {
    // Flight mode methods
    getFlightModeString: (mode: number) => integration.getFlightModeString(mode),
    isManualMode: (mode: CopterFlightMode) => integration.isManualMode(mode),
    isAutonomousMode: (mode: CopterFlightMode) => integration.isAutonomousMode(mode),
    requiresGPS: (mode: CopterFlightMode) => integration.requiresGPS(mode),
    
    // Parameter methods
    getParameter: (name: string) => integration.getParameter(name),
    getParametersByCategory: (category: CopterParameterCategory) => integration.getParametersByCategory(category),
    setParameter: (name: string, value: number) => integration.setParameter(name, value),
    loadParametersFromCopter: (systemId: number) => integration.loadParametersFromCopter(systemId),
    validateParameterValue: (name: string, value: number) => integration.validateParameterValue(name, value),
    exportParameters: () => integration.exportParameters(),
    importParameters: (params: { [key: string]: number }) => integration.importParameters(params),
    
    // Motor and calibration methods
    testMotor: (motorNumber: number, pwmValue: number, durationMs?: number) => 
      integration.testMotor(motorNumber, pwmValue, durationMs),
    calibrateESCs: () => integration.calibrateESCs(),
    
    // Safety methods
    enableGeofence: (altitudeMax: number, radiusMax?: number) => 
      integration.enableGeofence(altitudeMax, radiusMax),
    setFailsafeAction: (type: 'throttle' | 'gcs', action: number) => 
      integration.setFailsafeAction(type, action),
    
    // Mission methods
    createCopterMission: (waypoints: MissionWaypoint[]) => integration.createCopterMission(waypoints),
    
    // Telemetry methods
    getTelemetryData: (systemId?: number) => integration.getTelemetryData(systemId),
    addTelemetryListener: (listener: (data: CopterTelemetry[]) => void) => 
      integration.addTelemetryListener(listener),
    
    // Utility methods
    getParameterCategories: () => integration.getParameterCategories(),
  };
}

// Export types and enums
export type { CopterTelemetry, CopterParameter };
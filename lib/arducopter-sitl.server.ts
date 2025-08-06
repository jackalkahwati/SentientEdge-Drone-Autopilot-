// ArduCopter SITL (Software In The Loop) Integration
// Manages ArduCopter SITL simulation for testing and development

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync, writeFileSync, readFileSync } from 'fs';

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

// Predefined SITL frame configurations
export const SITL_FRAME_CONFIGS: { [key: string]: SITLFrameConfig } = {
  'quad': {
    type: SITLVehicleType.QUADCOPTER,
    name: 'Standard Quadcopter',
    motorCount: 4,
    description: 'Standard X-configuration quadcopter',
    recommendedParams: {
      'FRAME_CLASS': 1,
      'FRAME_TYPE': 1,
      'MOT_PWM_MIN': 1000,
      'MOT_PWM_MAX': 2000,
    },
  },
  'hexa': {
    type: SITLVehicleType.HEXACOPTER,
    name: 'Hexacopter',
    motorCount: 6,
    description: 'Six-motor hexacopter configuration',
    recommendedParams: {
      'FRAME_CLASS': 1,
      'FRAME_TYPE': 10,
      'MOT_PWM_MIN': 1000,
      'MOT_PWM_MAX': 2000,
    },
  },
  'octa': {
    type: SITLVehicleType.OCTOCOPTER,
    name: 'Octocopter',
    motorCount: 8,
    description: 'Eight-motor octocopter configuration',
    recommendedParams: {
      'FRAME_CLASS': 1,
      'FRAME_TYPE': 14,
      'MOT_PWM_MIN': 1000,
      'MOT_PWM_MAX': 2000,
    },
  },
  // Add more frame types as needed
};

// SITL configuration options
export interface SITLConfig {
  vehicleType: SITLVehicleType;
  homeLocation?: {
    lat: number;
    lon: number;
    alt: number;
    heading: number;
  };
  mavlinkPort?: number;
  fgviewPort?: number;
  speedup?: number;
  windSpeed?: number;
  windDirection?: number;
  paramFile?: string;
  customParams?: { [key: string]: number };
  instanceId?: number;
  debugLevel?: number;
  extraArgs?: string[];
}

// Default SITL configurations for different scenarios
export const DEFAULT_SITL_CONFIGS: { [key: string]: SITLConfig } = {
  'development': {
    vehicleType: SITLVehicleType.QUADCOPTER,
    homeLocation: {
      lat: 37.4239163,   // Googleplex
      lon: -122.0947209,
      alt: 0,
      heading: 0,
    },
    mavlinkPort: 5760,
    speedup: 1,
    windSpeed: 0,
    windDirection: 0,
    debugLevel: 1,
  },
  'testing': {
    vehicleType: SITLVehicleType.QUADCOPTER,
    homeLocation: {
      lat: 40.0150,      // Test location
      lon: -105.2705,
      alt: 1655,
      heading: 0,
    },
    mavlinkPort: 5761,
    speedup: 10,       // Faster simulation for testing
    windSpeed: 5,      // Some wind for realism
    windDirection: 270,
    debugLevel: 0,
  },
  'demo': {
    vehicleType: SITLVehicleType.QUADCOPTER,
    homeLocation: {
      lat: 51.5074,      // London
      lon: -0.1278,
      alt: 11,
      heading: 0,
    },
    mavlinkPort: 5762,
    speedup: 1,
    windSpeed: 2,
    windDirection: 180,
    debugLevel: 0,
  },
};

// SITL instance management
export class ArduCopterSITL {
  private static instances: Map<string, ArduCopterSITL> = new Map();
  private process: ChildProcess | null = null;
  private config: SITLConfig;
  private instanceId: string;
  private ardupilotPath: string;
  private isRunning: boolean = false;
  private startTime: number = 0;
  private listeners: Array<(event: string, data: any) => void> = [];

  constructor(instanceId: string, config: SITLConfig) {
    this.instanceId = instanceId;
    this.config = config;
    this.ardupilotPath = join(process.cwd(), 'ardupilot');
    
    // Validate ArduPilot path
    if (!existsSync(this.ardupilotPath)) {
      throw new Error(`ArduPilot directory not found at ${this.ardupilotPath}`);
    }
  }

  public static getInstance(instanceId: string, config?: SITLConfig): ArduCopterSITL {
    if (!ArduCopterSITL.instances.has(instanceId)) {
      if (!config) {
        throw new Error(`SITL instance ${instanceId} not found and no config provided`);
      }
      ArduCopterSITL.instances.set(instanceId, new ArduCopterSITL(instanceId, config));
    }
    return ArduCopterSITL.instances.get(instanceId)!;
  }

  public static getAllInstances(): ArduCopterSITL[] {
    return Array.from(ArduCopterSITL.instances.values());
  }

  public static getRunningInstances(): ArduCopterSITL[] {
    return Array.from(ArduCopterSITL.instances.values()).filter(instance => instance.isRunning);
  }

  // Start SITL simulation
  public async start(): Promise<boolean> {
    if (this.isRunning) {
      console.warn(`SITL instance ${this.instanceId} is already running`);
      return true;
    }

    try {
      // Build ArduCopter if needed
      await this.buildArduCopter();

      // Prepare SITL arguments
      const args = this.buildSITLArguments();
      
      // Start SITL process
      const sitlPath = join(this.ardupilotPath, 'build', 'sitl', 'bin', 'arducopter');
      
      console.log(`Starting SITL: ${sitlPath} ${args.join(' ')}`);
      
      this.process = spawn(sitlPath, args, {
        cwd: this.ardupilotPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.setupProcessHandlers();
      this.isRunning = true;
      this.startTime = Date.now();
      
      this.notifyListeners('started', { instanceId: this.instanceId, config: this.config });
      
      return true;
    } catch (error) {
      console.error(`Failed to start SITL instance ${this.instanceId}:`, error);
      return false;
    }
  }

  // Stop SITL simulation
  public async stop(): Promise<boolean> {
    if (!this.isRunning || !this.process) {
      console.warn(`SITL instance ${this.instanceId} is not running`);
      return true;
    }

    try {
      // Graceful shutdown
      this.process.kill('SIGTERM');
      
      // Wait for process to exit
      await new Promise<void>((resolve) => {
        if (this.process) {
          this.process.on('exit', () => resolve());
          
          // Force kill after 5 seconds
          setTimeout(() => {
            if (this.process && !this.process.killed) {
              this.process.kill('SIGKILL');
              resolve();
            }
          }, 5000);
        } else {
          resolve();
        }
      });

      this.cleanup();
      return true;
    } catch (error) {
      console.error(`Failed to stop SITL instance ${this.instanceId}:`, error);
      return false;
    }
  }

  // Build ArduCopter for SITL
  private async buildArduCopter(): Promise<void> {
    const buildPath = join(this.ardupilotPath, 'build', 'sitl', 'bin', 'arducopter');
    
    // Check if already built
    if (existsSync(buildPath)) {
      return;
    }

    console.log('Building ArduCopter for SITL...');
    
    return new Promise<void>((resolve, reject) => {
      const buildProcess = spawn('./waf', ['configure', '--board', 'sitl'], {
        cwd: this.ardupilotPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      buildProcess.on('exit', (configCode) => {
        if (configCode === 0) {
          // Configuration successful, now build
          const compileProcess = spawn('./waf', ['copter'], {
            cwd: this.ardupilotPath,
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          compileProcess.on('exit', (buildCode) => {
            if (buildCode === 0) {
              console.log('ArduCopter SITL build completed successfully');
              resolve();
            } else {
              reject(new Error(`ArduCopter build failed with code ${buildCode}`));
            }
          });

          compileProcess.on('error', (error) => {
            reject(new Error(`Build process error: ${error.message}`));
          });
        } else {
          reject(new Error(`ArduCopter configuration failed with code ${configCode}`));
        }
      });

      buildProcess.on('error', (error) => {
        reject(new Error(`Configuration process error: ${error.message}`));
      });
    });
  }

  // Build SITL command line arguments
  private buildSITLArguments(): string[] {
    const args: string[] = [];

    // Vehicle type and frame
    if (this.config.vehicleType) {
      args.push(`--frame=${this.config.vehicleType}`);
    }

    // Home location
    if (this.config.homeLocation) {
      const { lat, lon, alt, heading } = this.config.homeLocation;
      args.push(`--home=${lat},${lon},${alt},${heading}`);
    }

    // MAVLink port
    if (this.config.mavlinkPort) {
      args.push(`--out=udp:127.0.0.1:${this.config.mavlinkPort}`);
    }

    // FlightGear view port
    if (this.config.fgviewPort) {
      args.push(`--fgout=127.0.0.1:${this.config.fgviewPort}`);
    }

    // Speedup factor
    if (this.config.speedup) {
      args.push(`--speedup=${this.config.speedup}`);
    }

    // Wind simulation
    if (this.config.windSpeed && this.config.windDirection !== undefined) {
      args.push(`--wind=${this.config.windSpeed},${this.config.windDirection},0`);
    }

    // Instance ID for multiple instances
    if (this.config.instanceId !== undefined) {
      args.push(`--instance=${this.config.instanceId}`);
    }

    // Debug level
    if (this.config.debugLevel !== undefined) {
      args.push(`--debug=${this.config.debugLevel}`);
    }

    // Parameter file
    if (this.config.paramFile) {
      args.push(`--defaults=${this.config.paramFile}`);
    }

    // Custom parameters
    if (this.config.customParams) {
      Object.entries(this.config.customParams).forEach(([name, value]) => {
        args.push(`-p=${name}=${value}`);
      });
    }

    // Extra arguments
    if (this.config.extraArgs) {
      args.push(...this.config.extraArgs);
    }

    return args;
  }

  // Set up process event handlers
  private setupProcessHandlers(): void {
    if (!this.process) return;

    this.process.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[SITL ${this.instanceId}] ${output}`);
      this.notifyListeners('stdout', { instanceId: this.instanceId, data: output });
    });

    this.process.stderr?.on('data', (data) => {
      const output = data.toString();
      console.error(`[SITL ${this.instanceId}] ${output}`);
      this.notifyListeners('stderr', { instanceId: this.instanceId, data: output });
    });

    this.process.on('exit', (code, signal) => {
      console.log(`SITL instance ${this.instanceId} exited with code ${code}, signal ${signal}`);
      this.cleanup();
      this.notifyListeners('stopped', { instanceId: this.instanceId, code, signal });
    });

    this.process.on('error', (error) => {
      console.error(`SITL instance ${this.instanceId} error:`, error);
      this.cleanup();
      this.notifyListeners('error', { instanceId: this.instanceId, error: error.message });
    });
  }

  // Cleanup process resources
  private cleanup(): void {
    this.isRunning = false;
    this.process = null;
    this.startTime = 0;
  }

  // Get instance status
  public getStatus(): {
    instanceId: string;
    isRunning: boolean;
    config: SITLConfig;
    uptime: number;
    pid?: number;
  } {
    return {
      instanceId: this.instanceId,
      isRunning: this.isRunning,
      config: this.config,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      pid: this.process?.pid,
    };
  }

  // Update configuration
  public updateConfig(newConfig: Partial<SITLConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Event listener management
  public addListener(listener: (event: string, data: any) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => listener(event, data));
  }

  // Parameter file management
  public async saveParameterFile(filename: string, params: { [key: string]: number }): Promise<void> {
    const paramContent = Object.entries(params)
      .map(([name, value]) => `${name},${value}`)
      .join('\n');
    
    const paramPath = join(this.ardupilotPath, 'Tools', 'autotest', filename);
    writeFileSync(paramPath, paramContent);
  }

  public async loadParameterFile(filename: string): Promise<{ [key: string]: number }> {
    const paramPath = join(this.ardupilotPath, 'Tools', 'autotest', filename);
    
    if (!existsSync(paramPath)) {
      throw new Error(`Parameter file ${filename} not found`);
    }

    const content = readFileSync(paramPath, 'utf8');
    const params: { [key: string]: number } = {};
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [name, value] = trimmed.split(',');
        if (name && value) {
          params[name.trim()] = parseFloat(value.trim());
        }
      }
    });

    return params;
  }

  // Utility methods
  public static async createDefaultParameterFile(vehicleType: SITLVehicleType): Promise<string> {
    const frameConfig = Object.values(SITL_FRAME_CONFIGS).find(config => config.type === vehicleType);
    if (!frameConfig) {
      throw new Error(`No frame configuration found for vehicle type ${vehicleType}`);
    }

    const filename = `${vehicleType}-default.params`;
    const instance = new ArduCopterSITL('temp', { vehicleType });
    
    if (frameConfig.recommendedParams) {
      await instance.saveParameterFile(filename, frameConfig.recommendedParams);
    }

    return filename;
  }

  public static getAvailableFrameTypes(): SITLFrameConfig[] {
    return Object.values(SITL_FRAME_CONFIGS);
  }

  public static getDefaultConfig(scenario: string): SITLConfig | undefined {
    return DEFAULT_SITL_CONFIGS[scenario];
  }
}

// SITL Manager for handling multiple instances
export class SITLManager {
  private static instance: SITLManager;
  private listeners: Array<(event: string, data: any) => void> = [];

  private constructor() {}

  public static getInstance(): SITLManager {
    if (!SITLManager.instance) {
      SITLManager.instance = new SITLManager();
    }
    return SITLManager.instance;
  }

  // Create and start a new SITL instance
  public async createInstance(instanceId: string, config: SITLConfig): Promise<ArduCopterSITL> {
    const sitl = ArduCopterSITL.getInstance(instanceId, config);
    
    // Add listener to forward events
    sitl.addListener((event, data) => {
      this.notifyListeners(event, data);
    });

    return sitl;
  }

  // Get all instances
  public getAllInstances(): ArduCopterSITL[] {
    return ArduCopterSITL.getAllInstances();
  }

  // Get running instances
  public getRunningInstances(): ArduCopterSITL[] {
    return ArduCopterSITL.getRunningInstances();
  }

  // Stop all instances
  public async stopAllInstances(): Promise<void> {
    const instances = this.getRunningInstances();
    await Promise.all(instances.map(instance => instance.stop()));
  }

  // Event listener management
  public addListener(listener: (event: string, data: any) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => listener(event, data));
  }

  // Utility methods
  public async startDevelopmentInstance(): Promise<ArduCopterSITL> {
    const config = DEFAULT_SITL_CONFIGS.development;
    const sitl = await this.createInstance('development', config);
    await sitl.start();
    return sitl;
  }

  public async startTestingInstance(): Promise<ArduCopterSITL> {
    const config = DEFAULT_SITL_CONFIGS.testing;
    const sitl = await this.createInstance('testing', config);
    await sitl.start();
    return sitl;
  }

  public getInstanceStatus(): Array<{
    instanceId: string;
    isRunning: boolean;
    config: SITLConfig;
    uptime: number;
    pid?: number;
  }> {
    return this.getAllInstances().map(instance => instance.getStatus());
  }
}

// React hook for SITL management
export function useSITL() {
  const manager = SITLManager.getInstance();
  
  return {
    // Instance management
    createInstance: (instanceId: string, config: SITLConfig) => manager.createInstance(instanceId, config),
    getAllInstances: () => manager.getAllInstances(),
    getRunningInstances: () => manager.getRunningInstances(),
    stopAllInstances: () => manager.stopAllInstances(),
    getInstanceStatus: () => manager.getInstanceStatus(),
    
    // Quick start methods
    startDevelopmentInstance: () => manager.startDevelopmentInstance(),
    startTestingInstance: () => manager.startTestingInstance(),
    
    // Configuration helpers
    getAvailableFrameTypes: () => ArduCopterSITL.getAvailableFrameTypes(),
    getDefaultConfig: (scenario: string) => ArduCopterSITL.getDefaultConfig(scenario),
    createDefaultParameterFile: (vehicleType: SITLVehicleType) => 
      ArduCopterSITL.createDefaultParameterFile(vehicleType),
    
    // Event handling
    addListener: (listener: (event: string, data: any) => void) => manager.addListener(listener),
  };
}

// Export types and enums
export type { SITLConfig, SITLFrameConfig };
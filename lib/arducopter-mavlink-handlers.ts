// ArduCopter-specific MAVLink Message Handlers
// Enhanced message processing for copter-specific telemetry and commands

import { CopterTelemetry, CopterFlightMode, ArduCopterIntegration } from './arducopter-integration';
import { webSocketService } from './websocket';

// Extended MAVLink message IDs for ArduCopter
export enum CopterMAVLinkMessageID {
  // Standard messages
  HEARTBEAT = 0,
  SYS_STATUS = 1,
  SYSTEM_TIME = 2,
  PARAM_REQUEST_READ = 20,
  PARAM_REQUEST_LIST = 21,
  PARAM_VALUE = 22,
  PARAM_SET = 23,
  GPS_RAW_INT = 24,
  GPS_STATUS = 25,
  SCALED_IMU = 26,
  RAW_IMU = 27,
  RAW_PRESSURE = 28,
  SCALED_PRESSURE = 29,
  ATTITUDE = 30,
  ATTITUDE_QUATERNION = 31,
  LOCAL_POSITION_NED = 32,
  GLOBAL_POSITION_INT = 33,
  RC_CHANNELS_SCALED = 34,
  RC_CHANNELS_RAW = 35,
  SERVO_OUTPUT_RAW = 36,
  MISSION_REQUEST_PARTIAL_LIST = 37,
  MISSION_WRITE_PARTIAL_LIST = 38,
  MISSION_ITEM = 39,
  MISSION_REQUEST = 40,
  MISSION_SET_CURRENT = 41,
  MISSION_CURRENT = 42,
  MISSION_REQUEST_LIST = 43,
  MISSION_COUNT = 44,
  MISSION_CLEAR_ALL = 45,
  MISSION_ITEM_REACHED = 46,
  MISSION_ACK = 47,
  SET_GPS_GLOBAL_ORIGIN = 48,
  GPS_GLOBAL_ORIGIN = 49,
  PARAM_MAP_RC = 50,
  MISSION_REQUEST_INT = 51,
  SAFETY_SET_ALLOWED_AREA = 54,
  SAFETY_ALLOWED_AREA = 55,
  ATTITUDE_QUATERNION_COV = 61,
  NAV_CONTROLLER_OUTPUT = 62,
  GLOBAL_POSITION_INT_COV = 63,
  LOCAL_POSITION_NED_COV = 64,
  RC_CHANNELS = 65,
  REQUEST_DATA_STREAM = 66,
  DATA_STREAM = 67,
  MANUAL_CONTROL = 69,
  RC_CHANNELS_OVERRIDE = 70,
  MISSION_ITEM_INT = 73,
  VFR_HUD = 74,
  COMMAND_INT = 75,
  COMMAND_LONG = 76,
  COMMAND_ACK = 77,
  MANUAL_SETPOINT = 81,
  SET_ATTITUDE_TARGET = 82,
  ATTITUDE_TARGET = 83,
  SET_POSITION_TARGET_LOCAL_NED = 84,
  POSITION_TARGET_LOCAL_NED = 85,
  SET_POSITION_TARGET_GLOBAL_INT = 86,
  POSITION_TARGET_GLOBAL_INT = 87,
  LOCAL_POSITION_NED_SYSTEM_GLOBAL_OFFSET = 89,
  HIL_STATE = 90,
  HIL_CONTROLS = 91,
  HIL_RC_INPUTS_RAW = 92,
  HIL_ACTUATOR_CONTROLS = 93,
  OPTICAL_FLOW = 100,
  GLOBAL_VISION_POSITION_ESTIMATE = 101,
  VISION_POSITION_ESTIMATE = 102,
  VISION_SPEED_ESTIMATE = 103,
  VICON_POSITION_ESTIMATE = 104,
  HIGHRES_IMU = 105,
  OPTICAL_FLOW_RAD = 106,
  HIL_SENSOR = 107,
  SIM_STATE = 108,
  RADIO_STATUS = 109,
  FILE_TRANSFER_PROTOCOL = 110,
  TIMESYNC = 111,
  CAMERA_TRIGGER = 112,
  HIL_GPS = 113,
  HIL_OPTICAL_FLOW = 114,
  HIL_STATE_QUATERNION = 115,
  SCALED_IMU2 = 116,
  LOG_REQUEST_LIST = 117,
  LOG_ENTRY = 118,
  LOG_REQUEST_DATA = 119,
  LOG_DATA = 120,
  LOG_ERASE = 121,
  LOG_REQUEST_END = 122,
  GPS_INJECT_DATA = 123,
  GPS2_RAW = 124,
  POWER_STATUS = 125,
  SERIAL_CONTROL = 126,
  GPS_RTK = 127,
  GPS2_RTK = 128,
  SCALED_IMU3 = 129,
  DATA_TRANSMISSION_HANDSHAKE = 130,
  ENCAPSULATED_DATA = 131,
  DISTANCE_SENSOR = 132,
  TERRAIN_REQUEST = 133,
  TERRAIN_DATA = 134,
  TERRAIN_CHECK = 135,
  TERRAIN_REPORT = 136,
  SCALED_PRESSURE2 = 137,
  ATT_POS_MOCAP = 138,
  SET_ACTUATOR_CONTROL_TARGET = 139,
  ACTUATOR_CONTROL_TARGET = 140,
  ALTITUDE = 141,
  RESOURCE_REQUEST = 142,
  SCALED_PRESSURE3 = 143,
  FOLLOW_TARGET = 144,
  CONTROL_SYSTEM_STATE = 146,
  BATTERY_STATUS = 147,
  AUTOPILOT_VERSION = 148,
  LANDING_TARGET = 149,
  
  // ArduCopter-specific messages
  SENSOR_OFFSETS = 150,
  SET_MAG_OFFSETS = 151,
  MEMINFO = 152,
  AP_ADC = 153,
  DIGICAM_CONFIGURE = 154,
  DIGICAM_CONTROL = 155,
  MOUNT_CONFIGURE = 156,
  MOUNT_CONTROL = 157,
  MOUNT_STATUS = 158,
  FENCE_POINT = 160,
  FENCE_FETCH_POINT = 161,
  FENCE_STATUS = 162,
  AHRS = 163,
  SIMSTATE = 164,
  HWSTATUS = 165,
  RADIO = 166,
  LIMITS_STATUS = 167,
  WIND = 168,
  DATA16 = 169,
  DATA32 = 170,
  DATA64 = 171,
  DATA96 = 172,
  RANGEFINDER = 173,
  AIRSPEED_AUTOCAL = 174,
  RALLY_POINT = 175,
  RALLY_FETCH_POINT = 176,
  COMPASSMOT_STATUS = 177,
  AHRS2 = 178,
  CAMERA_STATUS = 179,
  CAMERA_FEEDBACK = 180,
  BATTERY2 = 181,
  AHRS3 = 182,
  AUTOPILOT_VERSION_REQUEST = 183,
  REMOTE_LOG_DATA_BLOCK = 184,
  REMOTE_LOG_BLOCK_STATUS = 185,
  LED_CONTROL = 186,
  MAG_CAL_PROGRESS = 191,
  MAG_CAL_REPORT = 192,
  EKF_STATUS_REPORT = 193,
  PID_TUNING = 194,
  DEEPSTALL = 195,
  GIMBAL_REPORT = 200,
  GIMBAL_CONTROL = 201,
  GIMBAL_TORQUE_CMD_REPORT = 214,
  GOPRO_HEARTBEAT = 215,
  GOPRO_GET_REQUEST = 216,
  GOPRO_GET_RESPONSE = 217,
  GOPRO_SET_REQUEST = 218,
  GOPRO_SET_RESPONSE = 219,
  RPM = 226,
  ESTIMATOR_STATUS = 230,
  WIND_COV = 231,
  GPS_INPUT = 232,
  GPS_RTCM_DATA = 233,
  HIGH_LATENCY = 234,
  HIGH_LATENCY2 = 235,
  VIBRATION = 241,
  HOME_POSITION = 242,
  SET_HOME_POSITION = 243,
  MESSAGE_INTERVAL = 244,
  EXTENDED_SYS_STATE = 245,
  ADSB_VEHICLE = 246,
  COLLISION = 247,
  V2_EXTENSION = 248,
  MEMORY_VECT = 249,
  DEBUG_VECT = 250,
  NAMED_VALUE_FLOAT = 251,
  NAMED_VALUE_INT = 252,
  STATUSTEXT = 253,
  DEBUG = 254,
  SETUP_SIGNING = 256,
  BUTTON_CHANGE = 257,
  PLAY_TUNE = 258,
  CAMERA_INFORMATION = 259,
  CAMERA_SETTINGS = 260,
  STORAGE_INFORMATION = 261,
  CAMERA_CAPTURE_STATUS = 262,
  CAMERA_IMAGE_CAPTURED = 263,
  FLIGHT_INFORMATION = 264,
  MOUNT_ORIENTATION = 265,
  LOGGING_DATA = 266,
  LOGGING_DATA_ACKED = 267,
  LOGGING_ACK = 268,
  VIDEO_STREAM_INFORMATION = 269,
  VIDEO_STREAM_STATUS = 270,
  CAMERA_FOV_STATUS = 271,
  CAMERA_TRACKING_IMAGE_STATUS = 275,
  CAMERA_TRACKING_GEO_STATUS = 276,
  GIMBAL_MANAGER_INFORMATION = 280,
  GIMBAL_MANAGER_STATUS = 281,
  GIMBAL_MANAGER_SET_ATTITUDE = 282,
  GIMBAL_DEVICE_INFORMATION = 283,
  GIMBAL_DEVICE_SET_ATTITUDE = 284,
  GIMBAL_DEVICE_ATTITUDE_STATUS = 285,
  AUTOPILOT_STATE_FOR_GIMBAL_DEVICE = 286,
  GIMBAL_MANAGER_SET_PITCHYAW = 287,
  GIMBAL_MANAGER_SET_MANUAL_CONTROL = 288,
  WIFI_CONFIG_AP = 299,
  PROTOCOL_VERSION = 300,
}

// ArduCopter-specific message payload interfaces
export interface CopterHeartbeat {
  type: number;
  autopilot: number;
  base_mode: number;
  custom_mode: number;
  system_status: number;
  mavlink_version: number;
}

export interface CopterSysStatus {
  onboard_control_sensors_present: number;
  onboard_control_sensors_enabled: number;
  onboard_control_sensors_health: number;
  load: number;
  voltage_battery: number;
  current_battery: number;
  battery_remaining: number;
  drop_rate_comm: number;
  errors_comm: number;
  errors_count1: number;
  errors_count2: number;
  errors_count3: number;
  errors_count4: number;
}

export interface CopterAttitude {
  time_boot_ms: number;
  roll: number;
  pitch: number;
  yaw: number;
  rollspeed: number;
  pitchspeed: number;
  yawspeed: number;
}

export interface CopterGlobalPositionInt {
  time_boot_ms: number;
  lat: number;
  lon: number;
  alt: number;
  relative_alt: number;
  vx: number;
  vy: number;
  vz: number;
  hdg: number;
}

export interface CopterRCChannels {
  time_boot_ms: number;
  chancount: number;
  chan1_raw: number;
  chan2_raw: number;
  chan3_raw: number;
  chan4_raw: number;
  chan5_raw: number;
  chan6_raw: number;
  chan7_raw: number;
  chan8_raw: number;
  chan9_raw: number;
  chan10_raw: number;
  chan11_raw: number;
  chan12_raw: number;
  chan13_raw: number;
  chan14_raw: number;
  chan15_raw: number;
  chan16_raw: number;
  chan17_raw: number;
  chan18_raw: number;
  rssi: number;
}

export interface CopterServoOutputRaw {
  time_usec: number;
  port: number;
  servo1_raw: number;
  servo2_raw: number;
  servo3_raw: number;
  servo4_raw: number;
  servo5_raw: number;
  servo6_raw: number;
  servo7_raw: number;
  servo8_raw: number;
  servo9_raw: number;
  servo10_raw: number;
  servo11_raw: number;
  servo12_raw: number;
  servo13_raw: number;
  servo14_raw: number;
  servo15_raw: number;
  servo16_raw: number;
}

export interface CopterVFRHUD {
  airspeed: number;
  groundspeed: number;
  heading: number;
  throttle: number;
  alt: number;
  climb: number;
}

export interface CopterBatteryStatus {
  id: number;
  battery_function: number;
  type: number;
  temperature: number;
  voltages: number[];
  current_battery: number;
  current_consumed: number;
  energy_consumed: number;
  battery_remaining: number;
  time_remaining: number;
  charge_state: number;
  voltages_ext: number[];
  mode: number;
  fault_bitmask: number;
}

export interface CopterVibration {
  time_usec: number;
  vibration_x: number;
  vibration_y: number;
  vibration_z: number;
  clipping_0: number;
  clipping_1: number;
  clipping_2: number;
}

export interface CopterEKFStatusReport {
  flags: number;
  velocity_variance: number;
  pos_horiz_variance: number;
  pos_vert_variance: number;
  compass_variance: number;
  terrain_alt_variance: number;
  airspeed_variance: number;
}

export interface CopterPIDTuning {
  axis: number;
  desired: number;
  achieved: number;
  FF: number;
  P: number;
  I: number;
  D: number;
}

export interface CopterRangefinder {
  time_usec: number;
  distance: number;
  voltage: number;
}

export interface CopterWindEstimation {
  time_usec: number;
  wind_x: number;
  wind_y: number;
  wind_z: number;
  var_horiz: number;
  var_vert: number;
  wind_alt: number;
  horiz_accuracy: number;
  vert_accuracy: number;
}

// ArduCopter MAVLink message handler class
export class ArduCopterMAVLinkHandler {
  private static instance: ArduCopterMAVLinkHandler;
  private integration: ArduCopterIntegration;
  private messageHandlers: Map<number, (sysid: number, compid: number, payload: any) => void> = new Map();
  private telemetryBuffer: Map<number, Partial<CopterTelemetry>> = new Map();
  private lastMessageTime: Map<number, number> = new Map();

  private constructor() {
    this.integration = ArduCopterIntegration.getInstance();
    this.setupMessageHandlers();
  }

  public static getInstance(): ArduCopterMAVLinkHandler {
    if (!ArduCopterMAVLinkHandler.instance) {
      ArduCopterMAVLinkHandler.instance = new ArduCopterMAVLinkHandler();
    }
    return ArduCopterMAVLinkHandler.instance;
  }

  private setupMessageHandlers(): void {
    // Core telemetry messages
    this.messageHandlers.set(CopterMAVLinkMessageID.HEARTBEAT, this.handleHeartbeat.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.SYS_STATUS, this.handleSysStatus.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.ATTITUDE, this.handleAttitude.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.GLOBAL_POSITION_INT, this.handleGlobalPositionInt.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.RC_CHANNELS, this.handleRCChannels.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.SERVO_OUTPUT_RAW, this.handleServoOutputRaw.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.VFR_HUD, this.handleVFRHUD.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.BATTERY_STATUS, this.handleBatteryStatus.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.VIBRATION, this.handleVibration.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.EKF_STATUS_REPORT, this.handleEKFStatusReport.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.PID_TUNING, this.handlePIDTuning.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.RANGEFINDER, this.handleRangefinder.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.WIND, this.handleWind.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.GPS_RAW_INT, this.handleGPSRawInt.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.PARAM_VALUE, this.handleParamValue.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.STATUSTEXT, this.handleStatusText.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.COMMAND_ACK, this.handleCommandAck.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.MISSION_ACK, this.handleMissionAck.bind(this));
    this.messageHandlers.set(CopterMAVLinkMessageID.MISSION_CURRENT, this.handleMissionCurrent.bind(this));
  }

  public handleMessage(msgId: number, sysid: number, compid: number, payload: any): void {
    const handler = this.messageHandlers.get(msgId);
    if (handler) {
      try {
        handler(sysid, compid, payload);
        this.lastMessageTime.set(sysid, Date.now());
      } catch (error) {
        console.error(`Error handling MAVLink message ${msgId} from system ${sysid}:`, error);
      }
    }
  }

  private handleHeartbeat(sysid: number, compid: number, payload: CopterHeartbeat): void {
    const telemetry = this.getOrCreateTelemetryBuffer(sysid);
    
    telemetry.systemId = sysid;
    telemetry.componentId = compid;
    telemetry.flightMode = payload.custom_mode as CopterFlightMode;
    telemetry.flightModeString = this.integration.getFlightModeString(payload.custom_mode);
    telemetry.armed = (payload.base_mode & 128) !== 0; // MAV_MODE_FLAG_SAFETY_ARMED
    
    // Update modes based on flight mode
    if (telemetry.modes) {
      telemetry.modes.stabilize = payload.custom_mode === CopterFlightMode.STABILIZE;
      telemetry.modes.guided = payload.custom_mode === CopterFlightMode.GUIDED;
      telemetry.modes.auto = payload.custom_mode === CopterFlightMode.AUTO;
      telemetry.modes.rtl = payload.custom_mode === CopterFlightMode.RTL;
      telemetry.modes.land = payload.custom_mode === CopterFlightMode.LAND;
    }

    this.updateTelemetry(sysid);
  }

  private handleSysStatus(sysid: number, compid: number, payload: CopterSysStatus): void {
    const telemetry = this.getOrCreateTelemetryBuffer(sysid);
    
    if (!telemetry.battery) telemetry.battery = { voltage: 0, current: 0, remaining: 0 };
    
    telemetry.battery.voltage = payload.voltage_battery / 1000; // mV to V
    telemetry.battery.current = payload.current_battery / 100; // 10*mA to A
    telemetry.battery.remaining = payload.battery_remaining;

    this.updateTelemetry(sysid);
  }

  private handleAttitude(sysid: number, compid: number, payload: CopterAttitude): void {
    const telemetry = this.getOrCreateTelemetryBuffer(sysid);
    
    if (!telemetry.attitude) telemetry.attitude = { roll: 0, pitch: 0, yaw: 0 };
    
    telemetry.attitude.roll = payload.roll * 180 / Math.PI; // rad to deg
    telemetry.attitude.pitch = payload.pitch * 180 / Math.PI; // rad to deg
    telemetry.attitude.yaw = payload.yaw * 180 / Math.PI; // rad to deg

    this.updateTelemetry(sysid);
  }

  private handleGlobalPositionInt(sysid: number, compid: number, payload: CopterGlobalPositionInt): void {
    const telemetry = this.getOrCreateTelemetryBuffer(sysid);
    
    if (!telemetry.position) telemetry.position = { lat: 0, lon: 0, alt: 0, relativeAlt: 0 };
    if (!telemetry.velocity) telemetry.velocity = { vx: 0, vy: 0, vz: 0, groundSpeed: 0 };
    
    telemetry.position.lat = payload.lat / 1e7; // 1E7 to decimal degrees
    telemetry.position.lon = payload.lon / 1e7; // 1E7 to decimal degrees
    telemetry.position.alt = payload.alt / 1000; // mm to m
    telemetry.position.relativeAlt = payload.relative_alt / 1000; // mm to m
    
    telemetry.velocity.vx = payload.vx / 100; // cm/s to m/s
    telemetry.velocity.vy = payload.vy / 100; // cm/s to m/s
    telemetry.velocity.vz = payload.vz / 100; // cm/s to m/s
    telemetry.velocity.groundSpeed = Math.sqrt(
      telemetry.velocity.vx ** 2 + telemetry.velocity.vy ** 2
    );

    this.updateTelemetry(sysid);
  }

  private handleRCChannels(sysid: number, compid: number, payload: CopterRCChannels): void {
    // Store RC channel data for diagnostics
    if (webSocketService) {
      webSocketService.send('copter_rc_channels', {
        systemId: sysid,
        channels: [
          payload.chan1_raw, payload.chan2_raw, payload.chan3_raw, payload.chan4_raw,
          payload.chan5_raw, payload.chan6_raw, payload.chan7_raw, payload.chan8_raw,
          payload.chan9_raw, payload.chan10_raw, payload.chan11_raw, payload.chan12_raw,
          payload.chan13_raw, payload.chan14_raw, payload.chan15_raw, payload.chan16_raw,
          payload.chan17_raw, payload.chan18_raw,
        ],
        rssi: payload.rssi,
        timestamp: Date.now(),
      });
    }
  }

  private handleServoOutputRaw(sysid: number, compid: number, payload: CopterServoOutputRaw): void {
    const telemetry = this.getOrCreateTelemetryBuffer(sysid);
    
    if (!telemetry.motors) telemetry.motors = { armed: false, motorCount: 4, motorOutputs: [] };
    
    telemetry.motors.motorOutputs = [
      payload.servo1_raw, payload.servo2_raw, payload.servo3_raw, payload.servo4_raw,
      payload.servo5_raw, payload.servo6_raw, payload.servo7_raw, payload.servo8_raw,
      payload.servo9_raw, payload.servo10_raw, payload.servo11_raw, payload.servo12_raw,
      payload.servo13_raw, payload.servo14_raw, payload.servo15_raw, payload.servo16_raw,
    ];

    this.updateTelemetry(sysid);
  }

  private handleVFRHUD(sysid: number, compid: number, payload: CopterVFRHUD): void {
    const telemetry = this.getOrCreateTelemetryBuffer(sysid);
    
    if (!telemetry.velocity) telemetry.velocity = { vx: 0, vy: 0, vz: 0, groundSpeed: 0 };
    if (!telemetry.position) telemetry.position = { lat: 0, lon: 0, alt: 0, relativeAlt: 0 };
    
    telemetry.velocity.groundSpeed = payload.groundspeed;
    telemetry.position.alt = payload.alt;

    this.updateTelemetry(sysid);
  }

  private handleBatteryStatus(sysid: number, compid: number, payload: CopterBatteryStatus): void {
    const telemetry = this.getOrCreateTelemetryBuffer(sysid);
    
    if (!telemetry.battery) telemetry.battery = { voltage: 0, current: 0, remaining: 0 };
    
    // Calculate total voltage from cell voltages
    if (payload.voltages && payload.voltages.length > 0) {
      telemetry.battery.voltage = payload.voltages.reduce((sum, v) => sum + (v > 0 ? v / 1000 : 0), 0);
    }
    
    telemetry.battery.current = payload.current_battery / 100; // 10*mA to A
    telemetry.battery.remaining = payload.battery_remaining;

    this.updateTelemetry(sysid);
  }

  private handleVibration(sysid: number, compid: number, payload: CopterVibration): void {
    const telemetry = this.getOrCreateTelemetryBuffer(sysid);
    
    if (!telemetry.sensors) {
      telemetry.sensors = {
        gpsFixType: 0,
        gpsNumSat: 0,
        compassVariance: 0,
        vibrationX: 0,
        vibrationY: 0,
        vibrationZ: 0,
      };
    }
    
    telemetry.sensors.vibrationX = payload.vibration_x;
    telemetry.sensors.vibrationY = payload.vibration_y;
    telemetry.sensors.vibrationZ = payload.vibration_z;

    this.updateTelemetry(sysid);
  }

  private handleEKFStatusReport(sysid: number, compid: number, payload: CopterEKFStatusReport): void {
    const telemetry = this.getOrCreateTelemetryBuffer(sysid);
    
    // EKF status flags indicate system health
    telemetry.ekfOk = (payload.flags & 0x01) !== 0; // EKF_ATTITUDE flag
    
    if (!telemetry.sensors) {
      telemetry.sensors = {
        gpsFixType: 0,
        gpsNumSat: 0,
        compassVariance: 0,
        vibrationX: 0,
        vibrationY: 0,
        vibrationZ: 0,
      };
    }
    
    telemetry.sensors.compassVariance = payload.compass_variance;

    this.updateTelemetry(sysid);
  }

  private handlePIDTuning(sysid: number, compid: number, payload: CopterPIDTuning): void {
    // Send PID tuning data for real-time monitoring
    if (webSocketService) {
      webSocketService.send('copter_pid_tuning', {
        systemId: sysid,
        axis: payload.axis, // 0=Roll, 1=Pitch, 2=Yaw
        desired: payload.desired,
        achieved: payload.achieved,
        FF: payload.FF,
        P: payload.P,
        I: payload.I,
        D: payload.D,
        timestamp: Date.now(),
      });
    }
  }

  private handleRangefinder(sysid: number, compid: number, payload: CopterRangefinder): void {
    // Send rangefinder data for obstacle avoidance visualization
    if (webSocketService) {
      webSocketService.send('copter_rangefinder', {
        systemId: sysid,
        distance: payload.distance,
        voltage: payload.voltage,
        timestamp: Date.now(),
      });
    }
  }

  private handleWind(sysid: number, compid: number, payload: CopterWindEstimation): void {
    // Send wind estimation for flight planning
    if (webSocketService) {
      webSocketService.send('copter_wind_estimation', {
        systemId: sysid,
        windX: payload.wind_x,
        windY: payload.wind_y,
        windZ: payload.wind_z,
        horizontalAccuracy: payload.horiz_accuracy,
        verticalAccuracy: payload.vert_accuracy,
        timestamp: Date.now(),
      });
    }
  }

  private handleGPSRawInt(sysid: number, compid: number, payload: any): void {
    const telemetry = this.getOrCreateTelemetryBuffer(sysid);
    
    if (!telemetry.sensors) {
      telemetry.sensors = {
        gpsFixType: 0,
        gpsNumSat: 0,
        compassVariance: 0,
        vibrationX: 0,
        vibrationY: 0,
        vibrationZ: 0,
      };
    }
    
    telemetry.sensors.gpsFixType = payload.fix_type;
    telemetry.sensors.gpsNumSat = payload.satellites_visible;

    this.updateTelemetry(sysid);
  }

  private handleParamValue(sysid: number, compid: number, payload: any): void {
    // Update parameter in integration system
    if (webSocketService) {
      webSocketService.send('copter_parameter_update', {
        systemId: sysid,
        paramName: payload.param_id,
        paramValue: payload.param_value,
        paramType: payload.param_type,
        paramIndex: payload.param_index,
        paramCount: payload.param_count,
        timestamp: Date.now(),
      });
    }
  }

  private handleStatusText(sysid: number, compid: number, payload: any): void {
    // Forward status messages to web interface
    if (webSocketService) {
      webSocketService.send('copter_status_message', {
        systemId: sysid,
        severity: payload.severity,
        text: payload.text,
        timestamp: Date.now(),
      });
    }
  }

  private handleCommandAck(sysid: number, compid: number, payload: any): void {
    // Handle command acknowledgments
    if (webSocketService) {
      webSocketService.send('copter_command_ack', {
        systemId: sysid,
        command: payload.command,
        result: payload.result,
        progress: payload.progress || 0,
        resultParam2: payload.result_param2 || 0,
        targetSystem: payload.target_system || 0,
        targetComponent: payload.target_component || 0,
        timestamp: Date.now(),
      });
    }
  }

  private handleMissionAck(sysid: number, compid: number, payload: any): void {
    // Handle mission acknowledgments
    if (webSocketService) {
      webSocketService.send('copter_mission_ack', {
        systemId: sysid,
        type: payload.type,
        result: payload.result || 0,
        timestamp: Date.now(),
      });
    }
  }

  private handleMissionCurrent(sysid: number, compid: number, payload: any): void {
    // Handle current mission item updates
    if (webSocketService) {
      webSocketService.send('copter_mission_current', {
        systemId: sysid,
        seq: payload.seq,
        timestamp: Date.now(),
      });
    }
  }

  private getOrCreateTelemetryBuffer(sysid: number): Partial<CopterTelemetry> {
    if (!this.telemetryBuffer.has(sysid)) {
      this.telemetryBuffer.set(sysid, {
        systemId: sysid,
        componentId: 1,
        flightMode: CopterFlightMode.STABILIZE,
        flightModeString: 'Stabilize',
        armed: false,
        ekfOk: false,
        position: { lat: 0, lon: 0, alt: 0, relativeAlt: 0 },
        attitude: { roll: 0, pitch: 0, yaw: 0 },
        velocity: { vx: 0, vy: 0, vz: 0, groundSpeed: 0 },
        battery: { voltage: 0, current: 0, remaining: 0 },
        motors: { armed: false, motorCount: 4, motorOutputs: [] },
        sensors: {
          gpsFixType: 0,
          gpsNumSat: 0,
          compassVariance: 0,
          vibrationX: 0,
          vibrationY: 0,
          vibrationZ: 0,
        },
        modes: {
          stabilize: false,
          guided: false,
          auto: false,
          rtl: false,
          land: false,
        },
        lastUpdate: Date.now(),
      });
    }
    return this.telemetryBuffer.get(sysid)!;
  }

  private updateTelemetry(sysid: number): void {
    const telemetryBuffer = this.telemetryBuffer.get(sysid);
    if (telemetryBuffer) {
      telemetryBuffer.lastUpdate = Date.now();
      this.integration.processTelemetry(sysid, telemetryBuffer);
    }
  }

  // Utility methods for sending commands
  public sendCommand(sysid: number, command: number, param1?: number, param2?: number, 
                    param3?: number, param4?: number, param5?: number, param6?: number, param7?: number): void {
    if (webSocketService) {
      webSocketService.send('send_mavlink_command', {
        targetSystem: sysid,
        targetComponent: 1,
        command,
        confirmation: 0,
        param1: param1 || 0,
        param2: param2 || 0,
        param3: param3 || 0,
        param4: param4 || 0,
        param5: param5 || 0,
        param6: param6 || 0,
        param7: param7 || 0,
      });
    }
  }

  public requestParameterList(sysid: number): void {
    if (webSocketService) {
      webSocketService.send('request_parameter_list', {
        targetSystem: sysid,
        targetComponent: 1,
      });
    }
  }

  public setParameter(sysid: number, paramName: string, paramValue: number, paramType: number = 9): void {
    if (webSocketService) {
      webSocketService.send('set_parameter', {
        targetSystem: sysid,
        targetComponent: 1,
        paramId: paramName,
        paramValue: paramValue,
        paramType: paramType, // MAV_PARAM_TYPE_REAL32
      });
    }
  }

  public requestDataStream(sysid: number, streamId: number, rate: number): void {
    if (webSocketService) {
      webSocketService.send('request_data_stream', {
        targetSystem: sysid,
        targetComponent: 1,
        reqStreamId: streamId,
        reqMessageRate: rate,
        startStop: 1, // Start stream
      });
    }
  }

  // Get connection status
  public getConnectionStatus(): { [sysid: number]: { lastSeen: number; connected: boolean } } {
    const status: { [sysid: number]: { lastSeen: number; connected: boolean } } = {};
    const now = Date.now();
    
    this.lastMessageTime.forEach((lastSeen, sysid) => {
      status[sysid] = {
        lastSeen,
        connected: (now - lastSeen) < 5000, // Consider connected if seen within 5 seconds
      };
    });
    
    return status;
  }

  // Cleanup disconnected systems
  public cleanupDisconnectedSystems(): void {
    const now = Date.now();
    const disconnectTimeout = 30000; // 30 seconds
    
    Array.from(this.lastMessageTime.entries()).forEach(([sysid, lastSeen]) => {
      if (now - lastSeen > disconnectTimeout) {
        this.telemetryBuffer.delete(sysid);
        this.lastMessageTime.delete(sysid);
        console.log(`Cleaned up disconnected system ${sysid}`);
      }
    });
  }
}

// Export message handler instance and types
export const copterMAVLinkHandler = ArduCopterMAVLinkHandler.getInstance();
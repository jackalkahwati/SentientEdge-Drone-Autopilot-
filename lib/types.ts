// Define core types for the application

// User and Authentication
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'analyst' | 'viewer';
  avatar?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Missions
export type MissionStatus = 'active' | 'scheduled' | 'completed' | 'archived';
export type ThreatLevel = 0 | 1 | 2 | 3 | 4; // 0: Minimal, 4: Critical

export interface Mission {
  id: string;
  name: string;
  description: string;
  status: MissionStatus;
  location: string;
  date: string;
  duration: string;
  progress: number;
  threatLevel: ThreatLevel;
  droneCount: number;
  teamSize: number;
  coordinates?: [number, number]; // [lng, lat]
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Drones
export type DroneStatus = 'active' | 'idle' | 'maintenance' | 'offline';
export type DroneType = 'surveillance' | 'attack' | 'recon' | 'transport' | 'multi';

export interface Drone {
  id: string;
  name: string;
  type: DroneType;
  status: DroneStatus;
  battery: number; // percentage
  signal: number; // percentage
  location?: [number, number]; // [lng, lat]
  altitude?: number;
  speed?: number;
  heading?: number;
  lastMission?: string;
  missionCount: number;
  nextMaintenance: string;
  model: string;
  serialNumber: string;
}

// Swarm
export type SwarmFormation = 'grid' | 'circle' | 'line' | 'vee' | 'diamond' | 'wedge' | 'echelon' | 'column' | 'custom';
export type SwarmBehavior = 'flocking' | 'consensus' | 'hierarchical' | 'distributed' | 'emergent';
export type SwarmCoordinationMode = 'leader_follower' | 'consensus_based' | 'distributed_autonomous' | 'hybrid';
export type SwarmStatus = 'forming' | 'active' | 'standby' | 'dispersing' | 'emergency' | 'reformed';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface SwarmParameters {
  spacing: number; // meters between drones
  altitude: number; // formation altitude
  speed: number; // formation speed
  cohesion: number; // 0-1, how tightly drones stick together
  separation: number; // minimum distance between drones
  alignment: number; // 0-1, how much drones align their movement
  adaptiveThreshold: number; // threshold for formation adaptation
  collisionAvoidanceRadius: number; // meters
  communicationRange: number; // meters
}

export interface SwarmFormationTemplate {
  formation: SwarmFormation;
  positions: Vector3D[]; // relative positions for each drone
  minDrones: number;
  maxDrones: number;
  parameters: SwarmParameters;
}

export interface SwarmCoordinationState {
  consensus: {
    leaderElection: boolean;
    votingInProgress: boolean;
    currentVote?: string;
    voteResults: Record<string, number>;
  };
  flocking: {
    cohesionWeight: number;
    separationWeight: number;
    alignmentWeight: number;
    centerOfMass: Vector3D;
    averageVelocity: Vector3D;
  };
  emergencyProtocols: {
    emergencyActive: boolean;
    emergencyType?: 'collision' | 'communication_loss' | 'weather' | 'threat' | 'equipment_failure';
    emergencyResponse: 'scatter' | 'rally' | 'land' | 'return_to_base';
    recoveryInProgress: boolean;
  };
}

export interface Swarm {
  id: string;
  name: string;
  drones: string[]; // Drone IDs
  formation: SwarmFormation;
  behavior: SwarmBehavior;
  coordinationMode: SwarmCoordinationMode;
  missionId?: string;
  status: SwarmStatus;
  leadDrone?: string; // Drone ID
  backupLeaders: string[]; // Backup leader drone IDs
  parameters: SwarmParameters;
  coordinationState: SwarmCoordinationState;
  createdAt: string;
  updatedAt: string;
  performance: {
    cohesionScore: number; // 0-1
    formationAccuracy: number; // 0-1
    communicationEfficiency: number; // 0-1
    missionProgress: number; // 0-1
  };
}

// Analytics
export interface AnalyticsData {
  missions: {
    total: number;
    active: number;
    completed: number;
    success: number;
    byMonth: { month: string; count: number }[];
  };
  drones: {
    total: number;
    active: number;
    maintenance: number;
    flightHours: number;
    byType: { type: DroneType; count: number }[];
  };
  threats: {
    detected: number;
    neutralized: number;
    byLevel: { level: ThreatLevel; count: number }[];
  };
}

// Tactical Map
export interface MapMarker {
  id: string;
  position: [number, number]; // [lng, lat]
  type: 'drone' | 'friendly' | 'enemy' | 'unknown' | 'waypoint';
  label?: string;
  data?: Record<string, any>;
}

export interface OperationalZone {
  id: string;
  name: string;
  center: [number, number]; // [lng, lat]
  radiusKm: number;
  type?: 'mission' | 'restricted' | 'surveillance';
}

// Communications
export interface Message {
  id: string;
  sender: string; // User ID or system
  text: string;
  timestamp: string;
  channel: string;
  read: boolean;
  priority?: 'normal' | 'urgent' | 'critical';
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  members: string[]; // User IDs
  missionId?: string;
  isSecure: boolean;
}

// AI Models
export type ModelStatus = 'training' | 'deployed' | 'evaluating' | 'failed';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  status: ModelStatus;
  version: string;
  accuracy?: number;
  trainingProgress?: number;
  lastTrained?: string;
  deployedAt?: string;
  type: 'detection' | 'classification' | 'prediction';
}

// Environmental Data
export interface EnvironmentalData {
  timestamp: string;
  location: [number, number]; // [lng, lat]
  wind: {
    speed: number; // knots
    direction: string; // e.g., "NE"
  };
  visibility: number; // km
  temperature: number; // Celsius
  precipitation: number; // percentage chance
  pressure: number; // hPa
  humidity: number; // percentage
}

// Swarm Communication
export interface SwarmMessage {
  id: string;
  senderId: string; // Drone ID
  receiverId?: string; // Specific drone ID, or undefined for broadcast
  type: SwarmMessageType;
  payload: any;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  encrypted: boolean;
  ackRequired: boolean;
  ttl: number; // time to live in seconds
}

export type SwarmMessageType = 
  | 'position_update'
  | 'formation_command'
  | 'leader_election'
  | 'consensus_vote'
  | 'emergency_alert'
  | 'collision_warning'
  | 'task_assignment'
  | 'status_report'
  | 'heartbeat'
  | 'formation_complete'
  | 'mission_update';

export interface SwarmCommunicationProtocol {
  broadcastInterval: number; // milliseconds
  heartbeatInterval: number; // milliseconds
  acknowledgmentTimeout: number; // milliseconds
  maxRetries: number;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
}

// Task Allocation
export interface SwarmTask {
  id: string;
  type: SwarmTaskType;
  priority: number; // 0-10
  requirements: {
    droneCount: number;
    droneTypes?: DroneType[];
    skills?: string[];
    location?: [number, number];
    duration?: number; // seconds
  };
  assignedDrones: string[]; // Drone IDs
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  deadline?: string;
  progress: number; // 0-1
}

export type SwarmTaskType = 
  | 'surveillance'
  | 'search_and_rescue'
  | 'reconnaissance'
  | 'patrol'
  | 'escort'
  | 'formation_flight'
  | 'area_denial'
  | 'perimeter_defense'
  | 'supply_delivery'
  | 'communication_relay';

// Swarm Intelligence Metrics
export interface SwarmIntelligenceMetrics {
  swarmId: string;
  timestamp: string;
  cohesion: number; // 0-1
  separation: number; // 0-1
  alignment: number; // 0-1
  formationError: number; // meters RMS error from ideal formation
  communicationLatency: number; // milliseconds average
  decisionMakingSpeed: number; // decisions per second
  adaptability: number; // 0-1, how well swarm adapts to changes
  resilience: number; // 0-1, how well swarm handles failures
  efficiency: number; // 0-1, resource utilization efficiency
}

// Electronic Warfare (EW) Types
export type ThreatType = 'jamming' | 'spoofing' | 'interference' | 'cyber' | 'unknown';
export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';
export type CountermeasureStatus = 'inactive' | 'active' | 'deploying' | 'failed';
export type SignalType = 'gps' | 'communication' | 'radar' | 'datalink' | 'telemetry';
export type FrequencyBand = 'vhf' | 'uhf' | 'lband' | 'sband' | 'cband' | 'xband' | 'kuband';

// GPS and GNSS related types
export interface GNSSConstellation {
  type: 'gps' | 'glonass' | 'galileo' | 'beidou' | 'qzss';
  satellites: number;
  signalStrength: number; // dBm
  accuracy: number; // meters
  lastUpdate: string;
}

export interface GPSSignalAnalysis {
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude: number;
  signalStrength: number; // dBm
  satelliteCount: number;
  hdop: number; // Horizontal Dilution of Precision
  vdop: number; // Vertical Dilution of Precision
  constellations: GNSSConstellation[];
  spoofingIndicators: {
    signalPowerAnomalies: boolean;
    clockBiasJumps: boolean;
    carrierPhaseInconsistencies: boolean;
    dopInconsistencies: boolean;
    multipleSignalSources: boolean;
  };
  confidenceScore: number; // 0-1, higher is more confident signal is genuine
}

// Signal Analysis and Spectrum Monitoring
export interface RFSignalData {
  id: string;
  timestamp: string;
  frequency: number; // MHz
  bandwidth: number; // MHz
  signalStrength: number; // dBm
  noiseFloor: number; // dBm
  snr: number; // Signal-to-Noise Ratio in dB
  modulation?: string;
  sourceLocation?: [number, number]; // [lng, lat] if triangulated
  classification: 'friendly' | 'hostile' | 'unknown' | 'neutral';
  signature?: string; // Electronic signature hash
}

export interface SpectrumAnalysis {
  timestamp: string;
  frequencyRange: [number, number]; // [start, end] in MHz
  sweepTime: number; // milliseconds
  signals: RFSignalData[];
  interferenceDetected: boolean;
  jammingDetected: boolean;
  anomalies: string[];
  backgroundNoise: number; // Average noise floor in dBm
}

// Electronic Warfare Threat Detection
export interface EWThreat {
  id: string;
  type: ThreatType;
  severity: ThreatSeverity;
  detectedAt: string;
  lastUpdated: string;
  source?: {
    location: [number, number]; // [lng, lat]
    altitude?: number;
    estimated: boolean;
  };
  affectedSystems: SignalType[];
  characteristics: {
    frequency?: number; // MHz
    bandwidth?: number; // MHz
    power?: number; // dBm
    modulation?: string;
    pulsePattern?: number[]; // Array of pulse timings in ms
    signature?: string; // Threat signature hash
  };
  impact: {
    dronesAffected: string[]; // Drone IDs
    communicationLoss: boolean;
    navigationDegraded: boolean;
    missionCompromised: boolean;
  };
  confidence: number; // 0-1, confidence in threat assessment
  countermeasuresDeployed: string[]; // IDs of active countermeasures
}

// Communication Analysis
export interface CommunicationHealth {
  droneId: string;
  timestamp: string;
  linkQuality: number; // 0-100
  signalStrength: number; // dBm
  packetLoss: number; // percentage
  latency: number; // milliseconds
  throughput: number; // bits per second
  errorRate: number; // bit error rate
  jamming: {
    detected: boolean;
    type?: 'barrage' | 'spot' | 'sweep' | 'pulse';
    strength?: number; // relative jamming strength
  };
  encryption: {
    active: boolean;
    algorithm?: string;
    keyRotationDue?: string;
  };
}

// Frequency Hopping and Anti-Jamming
export interface FrequencyHoppingPattern {
  id: string;
  name: string;
  frequencies: number[]; // Array of frequencies in MHz
  dwellTime: number; // milliseconds per frequency
  hopSequence: number[]; // Sequence of frequency indices
  syncWord: string; // Synchronization word for pattern
  encryptionKey?: string; // Optional encryption for hop pattern
  active: boolean;
}

export interface AntiJammingConfiguration {
  adaptivePowerControl: boolean;
  nullSteering: boolean;
  frequencyHopping: {
    enabled: boolean;
    patterns: string[]; // IDs of available patterns
    currentPattern?: string;
    autoSwitch: boolean;
  };
  spreadSpectrum: {
    enabled: boolean;
    chippingRate: number; // chips per second
    processingGain: number; // dB
  };
  interferenceRejection: {
    enabled: boolean;
    notchFilters: number[]; // Frequencies to notch in MHz
    adaptiveFiltering: boolean;
  };
}

// Electronic Countermeasures
export interface ElectronicCountermeasure {
  id: string;
  name: string;
  type: 'passive' | 'active';
  category: 'anti_jamming' | 'anti_spoofing' | 'signal_protection' | 'cyber_defense';
  status: CountermeasureStatus;
  deployedAt?: string;
  effectiveness: number; // 0-1
  resourceUsage: {
    cpu: number; // percentage
    memory: number; // MB
    power: number; // watts
  };
  configuration: Record<string, any>;
  triggers: {
    threatTypes: ThreatType[];
    severityThreshold: ThreatSeverity;
    automatic: boolean;
  };
  performance: {
    successRate: number; // 0-1
    avgResponseTime: number; // milliseconds
    lastActivation?: string;
  };
}

// Communication Fallback Systems
export interface CommunicationChannel {
  id: string;
  name: string;
  type: 'primary' | 'backup' | 'emergency';
  protocol: 'mavlink' | 'cyphal' | 'mesh' | 'satellite' | 'cellular';
  frequency: number; // MHz
  bandwidth: number; // MHz
  maxRange: number; // kilometers
  status: 'active' | 'standby' | 'failed' | 'jamming_detected';
  security: {
    encrypted: boolean;
    authentication: boolean;
    keyRotation: boolean;
  };
  performance: {
    latency: number; // milliseconds
    throughput: number; // bits per second
    reliability: number; // 0-1
  };
  lastUsed?: string;
}

export interface FallbackProtocol {
  id: string;
  name: string;
  priority: number; // 1-10, higher is higher priority
  channelSequence: string[]; // Ordered list of channel IDs to try
  switchCriteria: {
    signalThreshold: number; // dBm
    packetLossThreshold: number; // percentage
    latencyThreshold: number; // milliseconds
    jammingDetected: boolean;
  };
  automatic: boolean;
  manualOverride: boolean;
}

// Cyber Attack Detection
export interface CyberThreat {
  id: string;
  type: 'intrusion' | 'malware' | 'dos' | 'mitm' | 'replay' | 'injection';
  severity: ThreatSeverity;
  detectedAt: string;
  source?: {
    ip?: string;
    location?: [number, number]; // [lng, lat]
    fingerprint?: string;
  };
  target: {
    system: string;
    component: string;
    protocol?: string;
  };
  indicators: {
    anomalousTraffic: boolean;
    unauthorizedAccess: boolean;
    dataExfiltration: boolean;
    systemCompromise: boolean;
  };
  impact: {
    dataIntegrity: boolean;
    systemAvailability: boolean;
    confidentiality: boolean;
  };
  mitigated: boolean;
  mitigation?: {
    action: string;
    timestamp: string;
    success: boolean;
  };
}

// Electronic Attack Signatures
export interface AttackSignature {
  id: string;
  name: string;
  type: ThreatType;
  patterns: {
    frequency?: {
      center: number; // MHz
      bandwidth: number; // MHz
      tolerance: number; // ±MHz
    };
    power?: {
      level: number; // dBm
      variation: number; // dB
    };
    timing?: {
      pulseWidth: number; // microseconds
      pulseInterval: number; // microseconds
      pattern: number[]; // Pulse pattern
    };
    modulation?: {
      type: string;
      parameters: Record<string, number>;
    };
  };
  confidence: number; // 0-1, confidence in signature detection
  lastSeen?: string;
  threatLevel: ThreatSeverity;
  countermeasures: string[]; // IDs of recommended countermeasures
}

// EW System Status and Metrics
export interface EWSystemStatus {
  timestamp: string;
  overallThreatLevel: ThreatSeverity;
  activeThreatCount: number;
  countermeasuresActive: number;
  systemHealth: {
    signalAnalysis: 'operational' | 'degraded' | 'failed';
    threatDetection: 'operational' | 'degraded' | 'failed';
    countermeasures: 'operational' | 'degraded' | 'failed';
    communications: 'operational' | 'degraded' | 'failed';
  };
  performance: {
    detectionLatency: number; // milliseconds
    falseAlarmRate: number; // 0-1
    threatNeutralizationRate: number; // 0-1
    systemResponseTime: number; // milliseconds
  };
  resourceUtilization: {
    cpu: number; // percentage
    memory: number; // percentage
    bandwidth: number; // percentage of available
  };
}

// Real-time EW Events
export interface EWEvent {
  id: string;
  timestamp: string;
  type: 'threat_detected' | 'countermeasure_deployed' | 'signal_anomaly' | 'system_alert';
  severity: ThreatSeverity;
  message: string;
  details: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

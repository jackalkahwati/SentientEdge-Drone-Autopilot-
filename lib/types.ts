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
export type SwarmFormation = 'grid' | 'circle' | 'line' | 'vee' | 'custom';

export interface Swarm {
  id: string;
  name: string;
  drones: string[]; // Drone IDs
  formation: SwarmFormation;
  missionId?: string;
  status: 'active' | 'standby' | 'forming';
  leadDrone?: string; // Drone ID
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

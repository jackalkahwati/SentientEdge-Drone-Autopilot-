// Mock API service for development
import { User, Mission, Drone, MissionStatus, DroneStatus, AuthResponse, Swarm, AnalyticsData } from "@/lib/types";

// Sample users for testing
const users: User[] = [
  {
    id: "user-1",
    username: "admin",
    email: "admin@sentientedge.com",
    role: "admin",
    firstName: "Admin",
    lastName: "User",
    createdAt: "2025-01-15T12:00:00Z",
    lastLogin: "2025-03-24T08:30:00Z",
  },
  {
    id: "user-2",
    username: "operator",
    email: "operator@sentientedge.com",
    role: "operator",
    firstName: "Drone",
    lastName: "Operator",
    createdAt: "2025-01-20T14:30:00Z",
    lastLogin: "2025-03-23T16:45:00Z",
  },
];

// Sample missions
const missions: Mission[] = [
  {
    id: "mission-001",
    name: "Operation Eagle Eye",
    description: "Surveillance mission over northern sector",
    status: "active",
    location: "Northern Grid A-7",
    date: "2025-03-24",
    duration: "4h 32m",
    progress: 67,
    threatLevel: 2,
    droneCount: 48,
    teamSize: 6,
    coordinates: [-122.3965, 37.7915],
    createdBy: "user-1",
    createdAt: "2025-03-23T06:00:00Z",
    updatedAt: "2025-03-24T08:30:00Z",
  },
  {
    id: "mission-002",
    name: "Perimeter Defense",
    description: "Establish defensive perimeter around HQ",
    status: "active",
    location: "HQ Vicinity",
    date: "2025-03-24",
    duration: "24h 00m",
    progress: 32,
    threatLevel: 1,
    droneCount: 64,
    teamSize: 4,
    coordinates: [-122.3975, 37.7925],
    createdBy: "user-1",
    createdAt: "2025-03-24T00:00:00Z",
    updatedAt: "2025-03-24T06:15:00Z",
  },
  {
    id: "mission-003",
    name: "Resource Mapping",
    description: "Scanning resource deposits in eastern region",
    status: "active",
    location: "Eastern Grid C-3",
    date: "2025-03-23",
    duration: "8h 15m",
    progress: 89,
    threatLevel: 0,
    droneCount: 16,
    teamSize: 3,
    coordinates: [-122.3845, 37.7835],
    createdBy: "user-2",
    createdAt: "2025-03-23T08:00:00Z",
    updatedAt: "2025-03-24T10:45:00Z",
  },
  {
    id: "mission-004",
    name: "Deep Recon Alpha",
    description: "Deep reconnaissance of southern territory",
    status: "scheduled",
    location: "Southern Grid F-9",
    date: "2025-03-26",
    duration: "12h 00m",
    progress: 0,
    threatLevel: 3,
    droneCount: 32,
    teamSize: 8,
    coordinates: [-122.3995, 37.7855],
    createdBy: "user-1",
    createdAt: "2025-03-23T14:30:00Z",
    updatedAt: "2025-03-23T14:30:00Z",
  },
  {
    id: "mission-005",
    name: "Weather Pattern Analysis",
    description: "High-altitude weather data collection",
    status: "scheduled",
    location: "Grid Quadrant 2",
    date: "2025-03-27",
    duration: "6h 00m",
    progress: 0,
    threatLevel: 0,
    droneCount: 24,
    teamSize: 2,
    coordinates: [-122.4005, 37.7945],
    createdBy: "user-2",
    createdAt: "2025-03-24T09:15:00Z",
    updatedAt: "2025-03-24T09:15:00Z",
  },
  {
    id: "mission-006",
    name: "Supply Route Patrol",
    description: "Secure and monitor primary supply routes",
    status: "completed",
    location: "Routes B3-C7",
    date: "2025-03-20",
    duration: "48h 00m",
    progress: 100,
    threatLevel: 2,
    droneCount: 96,
    teamSize: 12,
    coordinates: [-122.3865, 37.7765],
    createdBy: "user-1",
    createdAt: "2025-03-18T00:00:00Z",
    updatedAt: "2025-03-22T00:00:00Z",
  },
  {
    id: "mission-007",
    name: "Communication Tower Inspection",
    description: "Assess integrity of comms infrastructure",
    status: "completed",
    location: "Grid Points T1-T8",
    date: "2025-03-22",
    duration: "5h 45m",
    progress: 100,
    threatLevel: 0,
    droneCount: 8,
    teamSize: 3,
    coordinates: [-122.3795, 37.7895],
    createdBy: "user-2",
    createdAt: "2025-03-22T06:00:00Z",
    updatedAt: "2025-03-22T11:45:00Z",
  },
  {
    id: "mission-008",
    name: "Operation Nightwatch",
    description: "Night surveillance training exercise",
    status: "archived",
    location: "Training Area Beta",
    date: "2025-03-15",
    duration: "8h 00m",
    progress: 100,
    threatLevel: 1,
    droneCount: 32,
    teamSize: 6,
    coordinates: [-122.4035, 37.7885],
    createdBy: "user-1",
    createdAt: "2025-03-15T18:00:00Z",
    updatedAt: "2025-03-16T02:00:00Z",
  },
];

// Sample drones
const drones: Drone[] = [
  {
    id: "drone-001",
    name: "Sentinel-1",
    type: "surveillance",
    status: "active",
    battery: 87,
    signal: 98,
    location: [-122.3965, 37.7915],
    altitude: 120,
    speed: 15,
    heading: 45,
    lastMission: "mission-001",
    missionCount: 42,
    nextMaintenance: "2025-04-15",
    model: "X2-Surveillance",
    serialNumber: "SV23-45678-A",
  },
  {
    id: "drone-002",
    name: "Interceptor-7",
    type: "attack",
    status: "active",
    battery: 92,
    signal: 95,
    location: [-122.3975, 37.7925],
    altitude: 150,
    speed: 28,
    heading: 270,
    lastMission: "mission-001",
    missionCount: 36,
    nextMaintenance: "2025-04-10",
    model: "A3-Attack",
    serialNumber: "AT23-12345-B",
  },
  {
    id: "drone-003",
    name: "Scout-12",
    type: "recon",
    status: "active",
    battery: 72,
    signal: 99,
    location: [-122.3985, 37.7945],
    altitude: 90,
    speed: 22,
    heading: 180,
    lastMission: "mission-002",
    missionCount: 58,
    nextMaintenance: "2025-03-30",
    model: "R1-Recon",
    serialNumber: "RC23-56789-C",
  },
  {
    id: "drone-004",
    name: "Carrier-3",
    type: "transport",
    status: "idle",
    battery: 100,
    signal: 97,
    location: [-122.3995, 37.7855],
    altitude: 0,
    speed: 0,
    heading: 0,
    lastMission: "mission-003",
    missionCount: 24,
    nextMaintenance: "2025-05-01",
    model: "T5-Transport",
    serialNumber: "TR23-34567-D",
  },
  {
    id: "drone-005",
    name: "Phantom-9",
    type: "multi",
    status: "maintenance",
    battery: 45,
    signal: 0,
    lastMission: "mission-006",
    missionCount: 67,
    nextMaintenance: "2025-03-25",
    model: "M2-Multi",
    serialNumber: "ML23-78901-E",
  },
];

// Sample swarms
const swarms: Swarm[] = [
  {
    id: "swarm-001",
    name: "Alpha Swarm",
    drones: ["drone-001", "drone-002", "drone-003"],
    formation: "vee",
    missionId: "mission-001",
    status: "active",
    leadDrone: "drone-001",
  },
  {
    id: "swarm-002",
    name: "Beta Swarm",
    drones: ["drone-004"],
    formation: "line",
    status: "standby",
  },
];

// Analytics data
const analyticsData: AnalyticsData = {
  missions: {
    total: 8,
    active: 3,
    completed: 2,
    success: 2,
    byMonth: [
      { month: "Jan", count: 12 },
      { month: "Feb", count: 18 },
      { month: "Mar", count: 8 },
    ],
  },
  drones: {
    total: 128,
    active: 96,
    maintenance: 12,
    flightHours: 1204,
    byType: [
      { type: "surveillance", count: 48 },
      { type: "attack", count: 32 },
      { type: "recon", count: 24 },
      { type: "transport", count: 16 },
      { type: "multi", count: 8 },
    ],
  },
  threats: {
    detected: 42,
    neutralized: 36,
    byLevel: [
      { level: 0, count: 12 },
      { level: 1, count: 18 },
      { level: 2, count: 8 },
      { level: 3, count: 4 },
      { level: 4, count: 0 },
    ],
  },
};

// ================= Mock API Functions =================

// Delay function to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Login with email and password
export async function loginMock(email: string, password: string): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
  await delay(800); // Simulate API delay
  
  // Simple validation
  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }
  
  // Hardcoded check for demo
  if (email === "admin@sentientedge.com" && password === "password123") {
    const user = users.find(u => u.email === email);
    
    if (user) {
      return {
        success: true,
        data: {
          user,
          token: "mock-jwt-token",
        },
      };
    }
  }
  
  if (email === "operator@sentientedge.com" && password === "password123") {
    const user = users.find(u => u.email === email);
    
    if (user) {
      return {
        success: true,
        data: {
          user,
          token: "mock-jwt-token",
        },
      };
    }
  }
  
  return { success: false, error: "Invalid email or password" };
}

// Register new user
export async function registerMock(userData: any): Promise<{ success: boolean; data?: AuthResponse; error?: string }> {
  await delay(1000); // Simulate API delay
  
  // Validate required fields
  if (!userData.email || !userData.password || !userData.username) {
    return { success: false, error: "Email, password, and username are required" };
  }
  
  // Check if email already exists
  if (users.some(u => u.email === userData.email)) {
    return { success: false, error: "Email already in use" };
  }
  
  // Create new user
  const newUser: User = {
    id: `user-${users.length + 1}`,
    username: userData.username,
    email: userData.email,
    role: "operator", // Default role for new users
    firstName: userData.firstName || "",
    lastName: userData.lastName || "",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
  
  // In a real API, we would persist this user
  // For the mock, we don't actually add it to our array
  
  return {
    success: true,
    data: {
      user: newUser,
      token: "mock-jwt-token",
    },
  };
}

// Get user profile
export async function getUserMock(): Promise<{ success: boolean; data?: User; error?: string }> {
  await delay(300);
  
  // In a real API, we would use the token to identify the user
  // For the mock, we'll just return the admin user
  return {
    success: true,
    data: users[0],
  };
}

// Get missions with optional status filter
export async function getMissionsMock(status?: MissionStatus): Promise<{ success: boolean; data?: Mission[]; error?: string }> {
  await delay(500);
  
  let filteredMissions = missions;
  
  if (status) {
    filteredMissions = missions.filter(mission => mission.status === status);
  }
  
  return {
    success: true,
    data: filteredMissions,
  };
}

// Get specific mission by ID
export async function getMissionMock(id: string): Promise<{ success: boolean; data?: Mission; error?: string }> {
  await delay(300);
  
  const mission = missions.find(m => m.id === id);
  
  if (!mission) {
    return { success: false, error: "Mission not found" };
  }
  
  return {
    success: true,
    data: mission,
  };
}

// Create a new mission
export async function createMissionMock(missionData: Partial<Mission>): Promise<{ success: boolean; data?: Mission; error?: string }> {
  await delay(800);
  
  // Validate required fields
  if (!missionData.name || !missionData.description || !missionData.location) {
    return { success: false, error: "Name, description, and location are required" };
  }
  
  // Create new mission with defaults
  const newMission: Mission = {
    id: `mission-${missions.length + 1}`.padStart(9, "0"),
    name: missionData.name,
    description: missionData.description,
    status: missionData.status || "scheduled",
    location: missionData.location,
    date: missionData.date || new Date().toISOString().split("T")[0],
    duration: missionData.duration || "0h 0m",
    progress: missionData.progress || 0,
    threatLevel: missionData.threatLevel || 0,
    droneCount: missionData.droneCount || 0,
    teamSize: missionData.teamSize || 1,
    coordinates: missionData.coordinates || [-122.4194, 37.7749],
    createdBy: "user-1", // Hardcoded for mock
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // In a real API, we would persist this mission
  // For the mock, we don't actually add it to our array
  
  return {
    success: true,
    data: newMission,
  };
}

// Update an existing mission
export async function updateMissionMock(id: string, missionData: Partial<Mission>): Promise<{ success: boolean; data?: Mission; error?: string }> {
  await delay(600);
  
  const missionIndex = missions.findIndex(m => m.id === id);
  
  if (missionIndex === -1) {
    return { success: false, error: "Mission not found" };
  }
  
  // In a real API, we would update the actual mission
  // For the mock, we'll create an updated version without modifying the original
  const updatedMission: Mission = {
    ...missions[missionIndex],
    ...missionData,
    updatedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: updatedMission,
  };
}

// Delete a mission
export async function deleteMissionMock(id: string): Promise<{ success: boolean; error?: string }> {
  await delay(500);
  
  const missionIndex = missions.findIndex(m => m.id === id);
  
  if (missionIndex === -1) {
    return { success: false, error: "Mission not found" };
  }
  
  // In a real API, we would delete the mission
  // For the mock, we pretend it was deleted
  
  return {
    success: true,
  };
}

// Get drones with optional status filter
export async function getDronesMock(status?: DroneStatus): Promise<{ success: boolean; data?: Drone[]; error?: string }> {
  await delay(500);
  
  let filteredDrones = drones;
  
  if (status) {
    filteredDrones = drones.filter(drone => drone.status === status);
  }
  
  return {
    success: true,
    data: filteredDrones,
  };
}

// Get specific drone by ID
export async function getDroneMock(id: string): Promise<{ success: boolean; data?: Drone; error?: string }> {
  await delay(300);
  
  const drone = drones.find(d => d.id === id);
  
  if (!drone) {
    return { success: false, error: "Drone not found" };
  }
  
  return {
    success: true,
    data: drone,
  };
}

// Update drone status
export async function updateDroneStatusMock(id: string, status: DroneStatus): Promise<{ success: boolean; data?: Drone; error?: string }> {
  await delay(400);
  
  const droneIndex = drones.findIndex(d => d.id === id);
  
  if (droneIndex === -1) {
    return { success: false, error: "Drone not found" };
  }
  
  // In a real API, we would update the actual drone
  // For the mock, we'll create an updated version without modifying the original
  const updatedDrone: Drone = {
    ...drones[droneIndex],
    status,
  };
  
  return {
    success: true,
    data: updatedDrone,
  };
}

// Assign drone to mission
export async function assignDroneToMissionMock(droneId: string, missionId: string): Promise<{ success: boolean; error?: string }> {
  await delay(600);
  
  const droneIndex = drones.findIndex(d => d.id === droneId);
  const missionIndex = missions.findIndex(m => m.id === missionId);
  
  if (droneIndex === -1) {
    return { success: false, error: "Drone not found" };
  }
  
  if (missionIndex === -1) {
    return { success: false, error: "Mission not found" };
  }
  
  // In a real API, we would update the drone's mission assignment
  // For the mock, we pretend it was updated
  
  return {
    success: true,
  };
}

// Get swarms
export async function getSwarmsMock(): Promise<{ success: boolean; data?: Swarm[]; error?: string }> {
  await delay(400);
  
  return {
    success: true,
    data: swarms,
  };
}

// Get analytics data
export async function getAnalyticsMock(): Promise<{ success: boolean; data?: AnalyticsData; error?: string }> {
  await delay(700);
  
  return {
    success: true,
    data: analyticsData,
  };
}

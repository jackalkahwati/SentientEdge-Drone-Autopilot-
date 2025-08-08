export type DroneStatus = "idle" | "in-flight" | "charging" | "maintenance";

export type Drone = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  status: DroneStatus;
};

export type MissionStatus = "active" | "scheduled" | "completed" | "archived";

export type Mission = {
  id: string;
  name: string;
  status: MissionStatus;
};



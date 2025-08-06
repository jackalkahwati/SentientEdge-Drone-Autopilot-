/**
 * Swarm-ArduPilot Integration Layer
 * 
 * Provides seamless integration between the advanced swarm coordination system
 * and ArduPilot autopilot systems. Handles MAVLink protocol communication,
 * mission command translation, and real-time telemetry synchronization.
 */

import {
  Swarm,
  SwarmMessage,
  SwarmParameters,
  SwarmFormationTemplate,
  Drone,
  Vector3D,
  SwarmTask
} from './types';

import {
  SwarmCoordinationEngine,
  FormationControlAlgorithm,
  Vector3
} from './swarm-algorithms';

import { FormationManager } from './formation-manager';
import { SwarmCommunicationManager } from './swarm-communication';

// ============================================================================
// MAVLINK PROTOCOL INTEGRATION
// ============================================================================

export interface MAVLinkCommand {
  command: number;
  target_system: number;
  target_component: number;
  confirmation: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  param5: number;
  param6: number;
  param7: number;
}

export interface MAVLinkTelemetry {
  system_id: number;
  component_id: number;
  message_type: string;
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
  gps: {
    fix_type: number;
    satellites_visible: number;
    hdop: number;
  };
  status: {
    mode: string;
    armed: boolean;
    ready: boolean;
  };
}

export class MAVLinkSwarmAdapter {
  private readonly MAVLINK_COMMANDS = {
    // Navigation commands
    NAV_WAYPOINT: 16,
    NAV_LOITER_UNLIM: 17,
    NAV_LOITER_TURNS: 18,
    NAV_LOITER_TIME: 19,
    NAV_RETURN_TO_LAUNCH: 20,
    NAV_LAND: 21,
    NAV_TAKEOFF: 22,
    NAV_CONTINUE_AND_CHANGE_ALT: 30,
    NAV_LOITER_TO_ALT: 31,
    NAV_SPLINE_WAYPOINT: 82,
    NAV_GUIDED_ENABLE: 92,
    NAV_DELAY: 93,
    
    // Condition commands  
    CONDITION_DELAY: 112,
    CONDITION_CHANGE_ALT: 113,
    CONDITION_DISTANCE: 114,
    CONDITION_YAW: 115,
    
    // Do commands
    DO_SET_MODE: 176,
    DO_JUMP: 177,
    DO_CHANGE_SPEED: 178,
    DO_SET_HOME: 179,
    DO_SET_PARAMETER: 180,
    DO_SET_RELAY: 181,
    DO_REPEAT_RELAY: 182,
    DO_SET_SERVO: 183,
    DO_REPEAT_SERVO: 184,
    DO_FLIGHTTERMINATION: 185,
    DO_CHANGE_ALTITUDE: 186,
    DO_LAND_START: 189,
    DO_RALLY_LAND: 190,
    DO_GO_AROUND: 191,
    DO_REPOSITION: 192,
    DO_PAUSE_CONTINUE: 193,
    DO_SET_REVERSE: 194,
    DO_SET_ROI_LOCATION: 195,
    DO_SET_ROI_WPNEXT_OFFSET: 196,
    DO_SET_ROI_NONE: 197,
    DO_CONTROL_VIDEO: 200,
    DO_SET_ROI: 201,
    DO_DIGICAM_CONFIGURE: 202,
    DO_DIGICAM_CONTROL: 203,
    DO_MOUNT_CONFIGURE: 204,
    DO_MOUNT_CONTROL: 205,
    DO_SET_CAM_TRIGG_DIST: 206,
    DO_FENCE_ENABLE: 207,
    DO_PARACHUTE: 208,
    DO_MOTOR_TEST: 209,
    DO_INVERTED_FLIGHT: 210,
    DO_GRIPPER: 211,
    DO_AUTOTUNE_ENABLE: 212,
    DO_SET_RESUME_REPEAT_DIST: 215,
    DO_SPRAYER: 216,
    DO_SEND_BANNER: 217,
    DO_SET_ROI_SYSID: 218,
    DO_REPEAT_COMMAND: 219,
    DO_GUIDED_LIMITS: 220,
    DO_ENGINE_CONTROL: 223,
    DO_SET_MISSION_CURRENT: 224,
    DO_LAST: 240,
    
    // Custom swarm commands
    SWARM_FORMATION_COMMAND: 50000,
    SWARM_COORDINATION_UPDATE: 50001,
    SWARM_EMERGENCY_COMMAND: 50002,
    SWARM_LEADER_ELECTION: 50003,
    SWARM_CONSENSUS_VOTE: 50004
  };

  private readonly FLIGHT_MODES = {
    STABILIZE: 0,
    ACRO: 1,
    ALT_HOLD: 2,
    AUTO: 3,
    GUIDED: 4,
    LOITER: 5,
    RTL: 6,
    CIRCLE: 7,
    POSITION: 8,
    LAND: 9,
    OF_LOITER: 10,
    DRIFT: 11,
    SPORT: 13,
    FLIP: 14,
    AUTOTUNE: 15,
    POSHOLD: 16,
    BRAKE: 17,
    THROW: 18,
    AVOID_ADSB: 19,
    GUIDED_NOGPS: 20,
    SMART_RTL: 21,
    FLOWHOLD: 22,
    FOLLOW: 23,
    ZIGZAG: 24,
    SYSTEMID: 25,
    AUTOROTATE: 26
  };

  /**
   * Convert swarm formation command to MAVLink waypoint mission
   */
  convertFormationToMission(
    swarm: Swarm,
    formationTemplate: SwarmFormationTemplate,
    basePosition: Vector3D,
    droneAssignments: Array<{ droneId: string; position: Vector3D; systemId: number }>
  ): Array<{ systemId: number; mission: MAVLinkCommand[] }> {
    const missions: Array<{ systemId: number; mission: MAVLinkCommand[] }> = [];

    for (const assignment of droneAssignments) {
      const mission: MAVLinkCommand[] = [];
      
      // Home position command
      mission.push({
        command: this.MAVLINK_COMMANDS.NAV_WAYPOINT,
        target_system: assignment.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 0, // Hold time
        param2: 0, // Acceptance radius
        param3: 0, // Pass through
        param4: 0, // Yaw
        param5: basePosition.x, // Latitude/X
        param6: basePosition.y, // Longitude/Y
        param7: basePosition.z  // Altitude/Z
      });

      // Formation position command
      const worldPosition = this.localToWorld(assignment.position, basePosition);
      mission.push({
        command: this.MAVLINK_COMMANDS.NAV_WAYPOINT,
        target_system: assignment.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 0, // Hold time
        param2: formationTemplate.parameters.spacing * 0.5, // Acceptance radius
        param3: 0, // Pass through
        param4: 0, // Yaw
        param5: worldPosition.x,
        param6: worldPosition.y,
        param7: worldPosition.z
      });

      // Speed setting command
      mission.push({
        command: this.MAVLINK_COMMANDS.DO_CHANGE_SPEED,
        target_system: assignment.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 1, // Speed type (1 = airspeed)
        param2: formationTemplate.parameters.speed,
        param3: -1, // Throttle (-1 = no change)
        param4: 0, // Relative (0 = absolute)
        param5: 0,
        param6: 0,
        param7: 0
      });

      missions.push({ systemId: assignment.systemId, mission });
    }

    return missions;
  }

  /**
   * Convert swarm coordination commands to MAVLink format
   */
  convertCoordinationCommand(
    swarmMessage: SwarmMessage,
    targetSystemId: number
  ): MAVLinkCommand | null {
    switch (swarmMessage.type) {
      case 'formation_command':
        return this.createFormationCommand(swarmMessage, targetSystemId);
      
      case 'leader_election':
        return this.createLeaderElectionCommand(swarmMessage, targetSystemId);
        
      case 'emergency_alert':
        return this.createEmergencyCommand(swarmMessage, targetSystemId);
        
      case 'collision_warning':
        return this.createCollisionAvoidanceCommand(swarmMessage, targetSystemId);
        
      default:
        return null;
    }
  }

  private createFormationCommand(message: SwarmMessage, systemId: number): MAVLinkCommand {
    const payload = message.payload;
    
    return {
      command: this.MAVLINK_COMMANDS.SWARM_FORMATION_COMMAND,
      target_system: systemId,
      target_component: 1,
      confirmation: 0,
      param1: this.encodeFormationType(payload.formation),
      param2: payload.spacing || 25,
      param3: payload.altitude || 100,
      param4: payload.speed || 15,
      param5: payload.targetPosition?.x || 0,
      param6: payload.targetPosition?.y || 0,
      param7: payload.targetPosition?.z || 0
    };
  }

  private createLeaderElectionCommand(message: SwarmMessage, systemId: number): MAVLinkCommand {
    return {
      command: this.MAVLINK_COMMANDS.SWARM_LEADER_ELECTION,
      target_system: systemId,
      target_component: 1,
      confirmation: 0,
      param1: message.payload.term || Date.now(),
      param2: message.payload.candidateScore || 0,
      param3: message.payload.vote ? 1 : 0,
      param4: 0,
      param5: 0,
      param6: 0,
      param7: 0
    };
  }

  private createEmergencyCommand(message: SwarmMessage, systemId: number): MAVLinkCommand {
    const severityMap = { low: 1, medium: 2, high: 3, critical: 4 };
    const responseMap = {
      continue_mission: 0,
      alter_course: 1,
      emergency_scatter: 2,
      emergency_land: 3,
      return_to_base: 4,
      form_defensive: 5
    };

    return {
      command: this.MAVLINK_COMMANDS.SWARM_EMERGENCY_COMMAND,
      target_system: systemId,
      target_component: 1,
      confirmation: 0,
      param1: severityMap[message.payload.severity as keyof typeof severityMap] || 2,
      param2: responseMap[message.payload.response as keyof typeof responseMap] || 0,
      param3: message.payload.timeToImpact || 0,
      param4: 0,
      param5: 0,
      param6: 0,
      param7: 0
    };
  }

  private createCollisionAvoidanceCommand(message: SwarmMessage, systemId: number): MAVLinkCommand {
    return {
      command: this.MAVLINK_COMMANDS.DO_REPOSITION,
      target_system: systemId,
      target_component: 1,
      confirmation: 0,
      param1: -1, // Ground speed (-1 = no change)
      param2: 1,  // Bitmask (1 = reposition)
      param3: 0,  // Reserved
      param4: 0,  // Yaw
      param5: message.payload.avoidanceVector?.x || 0,
      param6: message.payload.avoidanceVector?.y || 0,
      param7: message.payload.avoidanceVector?.z || 0
    };
  }

  private encodeFormationType(formation: string): number {
    const formationMap = {
      grid: 1,
      circle: 2,
      line: 3,
      vee: 4,
      diamond: 5,
      wedge: 6,
      echelon: 7,
      column: 8,
      custom: 9
    };
    return formationMap[formation as keyof typeof formationMap] || 1;
  }

  private localToWorld(localPos: Vector3D, basePos: Vector3D): Vector3D {
    return {
      x: basePos.x + localPos.x,
      y: basePos.y + localPos.y,
      z: basePos.z + localPos.z
    };
  }

  /**
   * Parse MAVLink telemetry into swarm-compatible format
   */
  parseTelemetry(mavlinkData: MAVLinkTelemetry): Partial<Drone> {
    return {
      location: [mavlinkData.position.lat, mavlinkData.position.lon],
      altitude: mavlinkData.position.alt,
      heading: mavlinkData.attitude.yaw * 180 / Math.PI, // Convert to degrees
      speed: Math.sqrt(
        mavlinkData.velocity.vx ** 2 + 
        mavlinkData.velocity.vy ** 2
      ),
      battery: mavlinkData.battery.remaining,
      signal: this.calculateSignalStrength(mavlinkData),
      status: this.mapArduPilotStatus(mavlinkData.status)
    };
  }

  private calculateSignalStrength(telemetry: MAVLinkTelemetry): number {
    // Estimate signal strength based on GPS quality and communication latency
    const gpsQuality = Math.min(telemetry.gps.satellites_visible / 10, 1) * 50;
    const hdopQuality = Math.max(0, (10 - telemetry.gps.hdop) / 10) * 30;
    const communicationQuality = 20; // Base communication quality
    
    return Math.min(100, gpsQuality + hdopQuality + communicationQuality);
  }

  private mapArduPilotStatus(status: { mode: string; armed: boolean; ready: boolean }): string {
    if (!status.ready) return 'offline';
    if (!status.armed) return 'idle';
    if (status.mode === 'AUTO' || status.mode === 'GUIDED') return 'active';
    return 'idle';
  }
}

// ============================================================================
// SWARM MISSION TRANSLATOR
// ============================================================================

export class SwarmMissionTranslator {
  private mavlinkAdapter: MAVLinkSwarmAdapter;

  constructor() {
    this.mavlinkAdapter = new MAVLinkSwarmAdapter();
  }

  /**
   * Translate swarm task into ArduPilot mission commands
   */
  translateSwarmTask(
    task: SwarmTask,
    assignedDrones: Array<{ droneId: string; systemId: number; drone: Drone }>,
    formationTemplate?: SwarmFormationTemplate
  ): Array<{ systemId: number; mission: MAVLinkCommand[] }> {
    const missions: Array<{ systemId: number; mission: MAVLinkCommand[] }> = [];

    switch (task.type) {
      case 'surveillance':
        return this.createSurveillanceMission(task, assignedDrones);
      
      case 'reconnaissance':
        return this.createReconnaissanceMission(task, assignedDrones);
        
      case 'search_and_rescue':
        return this.createSearchAndRescueMission(task, assignedDrones);
        
      case 'patrol':
        return this.createPatrolMission(task, assignedDrones);
        
      case 'escort':
        return this.createEscortMission(task, assignedDrones);
        
      case 'formation_flight':
        return this.createFormationFlightMission(task, assignedDrones, formationTemplate);
        
      default:
        return this.createGenericMission(task, assignedDrones);
    }
  }

  private createSurveillanceMission(
    task: SwarmTask,
    drones: Array<{ droneId: string; systemId: number; drone: Drone }>
  ): Array<{ systemId: number; mission: MAVLinkCommand[] }> {
    const missions: Array<{ systemId: number; mission: MAVLinkCommand[] }> = [];
    
    if (!task.requirements.location) {
      throw new Error('Surveillance task requires location');
    }

    const centerLat = task.requirements.location[0];
    const centerLon = task.requirements.location[1];
    const surveyRadius = 500; // 500 meter radius
    const altitude = 100; // meters

    drones.forEach((droneInfo, index) => {
      const mission: MAVLinkCommand[] = [];
      
      // Takeoff
      mission.push({
        command: 22, // NAV_TAKEOFF
        target_system: droneInfo.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 0, // Pitch
        param2: 0, // Empty
        param3: 0, // Empty
        param4: 0, // Yaw
        param5: centerLat,
        param6: centerLon,
        param7: altitude
      });

      // Create surveillance pattern (expanding square)
      const patternSize = surveyRadius / drones.length;
      const startRadius = patternSize * index;
      
      // Create waypoints for expanding square pattern
      for (let leg = 0; leg < 4; leg++) {
        const angle = (leg * 90) * Math.PI / 180;
        const wpLat = centerLat + Math.cos(angle) * startRadius / 111320; // Rough lat conversion
        const wpLon = centerLon + Math.sin(angle) * startRadius / (111320 * Math.cos(centerLat * Math.PI / 180));
        
        mission.push({
          command: 16, // NAV_WAYPOINT
          target_system: droneInfo.systemId,
          target_component: 1,
          confirmation: 0,
          param1: 0, // Hold time
          param2: 10, // Acceptance radius
          param3: 0, // Pass through
          param4: 0, // Yaw
          param5: wpLat,
          param6: wpLon,
          param7: altitude
        });
      }

      missions.push({ systemId: droneInfo.systemId, mission });
    });

    return missions;
  }

  private createReconnaissanceMission(
    task: SwarmTask,
    drones: Array<{ droneId: string; systemId: number; drone: Drone }>
  ): Array<{ systemId: number; mission: MAVLinkCommand[] }> {
    const missions: Array<{ systemId: number; mission: MAVLinkCommand[] }> = [];
    
    if (!task.requirements.location) {
      throw new Error('Reconnaissance task requires location');
    }

    const targetLat = task.requirements.location[0];
    const targetLon = task.requirements.location[1];
    const reconAltitude = 80; // Lower altitude for better detail

    drones.forEach((droneInfo, index) => {
      const mission: MAVLinkCommand[] = [];
      
      // Takeoff
      mission.push({
        command: 22, // NAV_TAKEOFF
        target_system: droneInfo.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 0,
        param2: 0,
        param3: 0,
        param4: 0,
        param5: targetLat,
        param6: targetLon,
        param7: reconAltitude
      });

      // Approach waypoint (offset for each drone)
      const approachOffset = (index - drones.length/2) * 0.001; // Spread drones
      mission.push({
        command: 16, // NAV_WAYPOINT
        target_system: droneInfo.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 30, // Loiter time
        param2: 5, // Acceptance radius
        param3: 0,
        param4: 0,
        param5: targetLat + approachOffset,
        param6: targetLon + approachOffset,
        param7: reconAltitude
      });

      missions.push({ systemId: droneInfo.systemId, mission });
    });

    return missions;
  }

  private createSearchAndRescueMission(
    task: SwarmTask,
    drones: Array<{ droneId: string; systemId: number; drone: Drone }>
  ): Array<{ systemId: number; mission: MAVLinkCommand[] }> {
    const missions: Array<{ systemId: number; mission: MAVLinkCommand[] }> = [];
    
    if (!task.requirements.location) {
      throw new Error('Search and rescue task requires location');
    }

    const searchLat = task.requirements.location[0];
    const searchLon = task.requirements.location[1];
    const searchAltitude = 60; // Lower for better visibility
    const searchRadius = 1000; // 1km search radius

    drones.forEach((droneInfo, index) => {
      const mission: MAVLinkCommand[] = [];
      
      // Takeoff
      mission.push({
        command: 22, // NAV_TAKEOFF
        target_system: droneInfo.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 0,
        param2: 0,
        param3: 0,
        param4: 0,
        param5: searchLat,
        param6: searchLon,
        param7: searchAltitude
      });

      // Create search pattern (parallel lines)
      const stripWidth = searchRadius * 2 / drones.length;
      const startY = -searchRadius + (index * stripWidth);
      
      // Search strips
      for (let x = -searchRadius; x <= searchRadius; x += 200) {
        const wpLat = searchLat + x / 111320;
        const wpLon = searchLon + startY / (111320 * Math.cos(searchLat * Math.PI / 180));
        
        mission.push({
          command: 16, // NAV_WAYPOINT
          target_system: droneInfo.systemId,
          target_component: 1,
          confirmation: 0,
          param1: 0,
          param2: 20, // Acceptance radius
          param3: 0,
          param4: 0,
          param5: wpLat,
          param6: wpLon,
          param7: searchAltitude
        });
      }

      missions.push({ systemId: droneInfo.systemId, mission });
    });

    return missions;
  }

  private createPatrolMission(
    task: SwarmTask,
    drones: Array<{ droneId: string; systemId: number; drone: Drone }>
  ): Array<{ systemId: number; mission: MAVLinkCommand[] }> {
    const missions: Array<{ systemId: number; mission: MAVLinkCommand[] }> = [];
    
    if (!task.requirements.location) {
      throw new Error('Patrol task requires location');
    }

    const patrolLat = task.requirements.location[0];
    const patrolLon = task.requirements.location[1];
    const patrolAltitude = 100;
    const patrolRadius = 800;

    drones.forEach((droneInfo, index) => {
      const mission: MAVLinkCommand[] = [];
      
      // Takeoff
      mission.push({
        command: 22, // NAV_TAKEOFF
        target_system: droneInfo.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 0,
        param2: 0,
        param3: 0,
        param4: 0,
        param5: patrolLat,
        param6: patrolLon,
        param7: patrolAltitude
      });

      // Create circular patrol pattern
      const numWaypoints = 8;
      const sectorAngle = (2 * Math.PI) / drones.length;
      const startAngle = index * sectorAngle;
      
      for (let i = 0; i < numWaypoints; i++) {
        const angle = startAngle + (i * sectorAngle * numWaypoints / drones.length);
        const wpLat = patrolLat + Math.cos(angle) * patrolRadius / 111320;
        const wpLon = patrolLon + Math.sin(angle) * patrolRadius / (111320 * Math.cos(patrolLat * Math.PI / 180));
        
        mission.push({
          command: 16, // NAV_WAYPOINT
          target_system: droneInfo.systemId,
          target_component: 1,
          confirmation: 0,
          param1: 0,
          param2: 15, // Acceptance radius
          param3: 0,
          param4: 0,
          param5: wpLat,
          param6: wpLon,
          param7: patrolAltitude
        });
      }

      // Return to start (looping patrol)
      mission.push({
        command: 177, // DO_JUMP
        target_system: droneInfo.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 2, // Jump to waypoint 2 (after takeoff)
        param2: -1, // Repeat indefinitely
        param3: 0,
        param4: 0,
        param5: 0,
        param6: 0,
        param7: 0
      });

      missions.push({ systemId: droneInfo.systemId, mission });
    });

    return missions;
  }

  private createEscortMission(
    task: SwarmTask,
    drones: Array<{ droneId: string; systemId: number; drone: Drone }>
  ): Array<{ systemId: number; mission: MAVLinkCommand[] }> {
    const missions: Array<{ systemId: number; mission: MAVLinkCommand[] }> = [];
    
    if (!task.requirements.location) {
      throw new Error('Escort task requires location');
    }

    const escortLat = task.requirements.location[0];
    const escortLon = task.requirements.location[1];
    const escortAltitude = 120;
    const formationSpacing = 50; // meters

    drones.forEach((droneInfo, index) => {
      const mission: MAVLinkCommand[] = [];
      
      // Takeoff
      mission.push({
        command: 22, // NAV_TAKEOFF
        target_system: droneInfo.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 0,
        param2: 0,
        param3: 0,
        param4: 0,
        param5: escortLat,
        param6: escortLon,
        param7: escortAltitude
      });

      // Escort formation positions (diamond pattern)
      const formationPositions = [
        { x: 0, y: formationSpacing },      // Front
        { x: -formationSpacing, y: 0 },     // Left
        { x: formationSpacing, y: 0 },      // Right
        { x: 0, y: -formationSpacing }      // Rear
      ];

      const position = formationPositions[index % formationPositions.length];
      const wpLat = escortLat + position.y / 111320;
      const wpLon = escortLon + position.x / (111320 * Math.cos(escortLat * Math.PI / 180));

      // Formation position
      mission.push({
        command: 16, // NAV_WAYPOINT
        target_system: droneInfo.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 0,
        param2: 25, // Acceptance radius
        param3: 0,
        param4: 0,
        param5: wpLat,
        param6: wpLon,
        param7: escortAltitude
      });

      // Loiter in formation
      mission.push({
        command: 17, // NAV_LOITER_UNLIM
        target_system: droneInfo.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 0,
        param2: 0,
        param3: 30, // Loiter radius
        param4: 0,
        param5: wpLat,
        param6: wpLon,
        param7: escortAltitude
      });

      missions.push({ systemId: droneInfo.systemId, mission });
    });

    return missions;
  }

  private createFormationFlightMission(
    task: SwarmTask,
    drones: Array<{ droneId: string; systemId: number; drone: Drone }>,
    formationTemplate?: SwarmFormationTemplate
  ): Array<{ systemId: number; mission: MAVLinkCommand[] }> {
    if (!formationTemplate) {
      return this.createGenericMission(task, drones);
    }

    const missions: Array<{ systemId: number; mission: MAVLinkCommand[] }> = [];
    const basePosition = task.requirements.location ? 
      { x: task.requirements.location[0], y: task.requirements.location[1], z: 100 } :
      { x: 0, y: 0, z: 100 };

    const droneAssignments = drones.map((droneInfo, index) => ({
      droneId: droneInfo.droneId,
      position: formationTemplate.positions[index % formationTemplate.positions.length],
      systemId: droneInfo.systemId
    }));

    return this.mavlinkAdapter.convertFormationToMission(
      {} as Swarm, // Temporary swarm object
      formationTemplate,
      basePosition,
      droneAssignments
    );
  }

  private createGenericMission(
    task: SwarmTask,
    drones: Array<{ droneId: string; systemId: number; drone: Drone }>
  ): Array<{ systemId: number; mission: MAVLinkCommand[] }> {
    const missions: Array<{ systemId: number; mission: MAVLinkCommand[] }> = [];
    
    const defaultLat = task.requirements.location?.[0] || 0;
    const defaultLon = task.requirements.location?.[1] || 0;
    const defaultAlt = 100;

    drones.forEach((droneInfo) => {
      const mission: MAVLinkCommand[] = [];
      
      // Takeoff
      mission.push({
        command: 22, // NAV_TAKEOFF
        target_system: droneInfo.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 0,
        param2: 0,
        param3: 0,
        param4: 0,
        param5: defaultLat,
        param6: defaultLon,
        param7: defaultAlt
      });

      // Hold position
      mission.push({
        command: 17, // NAV_LOITER_UNLIM
        target_system: droneInfo.systemId,
        target_component: 1,
        confirmation: 0,
        param1: 0,
        param2: 0,
        param3: 50, // Loiter radius
        param4: 0,
        param5: defaultLat,
        param6: defaultLon,
        param7: defaultAlt
      });

      missions.push({ systemId: droneInfo.systemId, mission });
    });

    return missions;
  }
}

// ============================================================================
// SWARM-ARDUPILOT INTEGRATION MANAGER
// ============================================================================

export class SwarmArduPilotIntegrationManager {
  private mavlinkAdapter: MAVLinkSwarmAdapter;
  private missionTranslator: SwarmMissionTranslator;
  private formationManager: FormationManager;
  private communicationManager: SwarmCommunicationManager;
  private telemetrySubscriptions: Map<number, (telemetry: MAVLinkTelemetry) => void> = new Map();
  private systemIdMapping: Map<string, number> = new Map(); // droneId -> systemId

  constructor(
    formationManager: FormationManager,
    communicationManager: SwarmCommunicationManager
  ) {
    this.mavlinkAdapter = new MAVLinkSwarmAdapter();
    this.missionTranslator = new SwarmMissionTranslator();
    this.formationManager = formationManager;
    this.communicationManager = communicationManager;
  }

  /**
   * Initialize integration with ArduPilot systems
   */
  async initializeIntegration(
    swarm: Swarm,
    drones: Drone[],
    systemIdMappings: Array<{ droneId: string; systemId: number }>
  ): Promise<boolean> {
    try {
      // Store system ID mappings
      systemIdMappings.forEach(mapping => {
        this.systemIdMapping.set(mapping.droneId, mapping.systemId);
      });

      // Initialize telemetry subscriptions
      for (const mapping of systemIdMappings) {
        await this.subscribeTelemetry(mapping.systemId, mapping.droneId);
      }

      // Send initial swarm configuration to all systems
      await this.sendSwarmConfiguration(swarm, drones);

      console.log(`Swarm-ArduPilot integration initialized for ${systemIdMappings.length} drones`);
      return true;
    } catch (error) {
      console.error('Failed to initialize swarm-ArduPilot integration:', error);
      return false;
    }
  }

  /**
   * Execute swarm formation using ArduPilot autopilots
   */
  async executeSwarmFormation(
    swarm: Swarm,
    drones: Drone[],
    centerPosition: Vector3D
  ): Promise<boolean> {
    try {
      // Get current formation template
      const formationTemplate = this.formationManager.getFormationStatus().currentFormation;
      if (!formationTemplate) {
        throw new Error('No formation template available');
      }

      // Create drone assignments with system IDs
      const droneAssignments = swarm.drones
        .map((droneId, index) => ({
          droneId,
          position: formationTemplate.positions[index % formationTemplate.positions.length],
          systemId: this.systemIdMapping.get(droneId) || 0
        }))
        .filter(assignment => assignment.systemId > 0);

      // Convert to MAVLink missions
      const missions = this.mavlinkAdapter.convertFormationToMission(
        swarm,
        formationTemplate,
        centerPosition,
        droneAssignments
      );

      // Send missions to each drone
      const missionPromises = missions.map(async (missionData) => {
        return await this.sendMissionToArduPilot(missionData.systemId, missionData.mission);
      });

      const results = await Promise.all(missionPromises);
      const successCount = results.filter(r => r).length;

      console.log(`Formation execution: ${successCount}/${missions.length} drones received missions`);
      return successCount === missions.length;
    } catch (error) {
      console.error('Failed to execute swarm formation:', error);
      return false;
    }
  }

  /**
   * Execute swarm task using ArduPilot systems
   */
  async executeSwarmTask(
    task: SwarmTask,
    assignedDrones: Drone[]
  ): Promise<boolean> {
    try {
      // Create drone assignments with system IDs
      const droneAssignments = assignedDrones
        .map(drone => ({
          droneId: drone.id,
          systemId: this.systemIdMapping.get(drone.id) || 0,
          drone
        }))
        .filter(assignment => assignment.systemId > 0);

      if (droneAssignments.length === 0) {
        throw new Error('No valid drone assignments found');
      }

      // Translate task to ArduPilot missions
      const missions = this.missionTranslator.translateSwarmTask(
        task,
        droneAssignments
      );

      // Send missions to each drone
      const missionPromises = missions.map(async (missionData) => {
        return await this.sendMissionToArduPilot(missionData.systemId, missionData.mission);
      });

      const results = await Promise.all(missionPromises);
      const successCount = results.filter(r => r).length;

      console.log(`Task execution: ${successCount}/${missions.length} drones received missions`);
      return successCount === missions.length;
    } catch (error) {
      console.error('Failed to execute swarm task:', error);
      return false;
    }
  }

  /**
   * Send swarm coordination message to ArduPilot system
   */
  async sendCoordinationMessage(
    message: SwarmMessage,
    targetDroneId: string
  ): Promise<boolean> {
    try {
      const systemId = this.systemIdMapping.get(targetDroneId);
      if (!systemId) {
        console.warn(`No system ID found for drone ${targetDroneId}`);
        return false;
      }

      const mavlinkCommand = this.mavlinkAdapter.convertCoordinationCommand(message, systemId);
      if (!mavlinkCommand) {
        console.warn(`Unable to convert message type ${message.type} to MAVLink`);
        return false;
      }

      return await this.sendCommandToArduPilot(systemId, mavlinkCommand);
    } catch (error) {
      console.error('Failed to send coordination message:', error);
      return false;
    }
  }

  /**
   * Handle emergency response through ArduPilot systems
   */
  async handleEmergencyResponse(
    emergencyType: string,
    affectedDrones: string[],
    response: string
  ): Promise<boolean> {
    try {
      const emergencyCommands: Promise<boolean>[] = [];

      for (const droneId of affectedDrones) {
        const systemId = this.systemIdMapping.get(droneId);
        if (!systemId) continue;

        let command: MAVLinkCommand;

        switch (response) {
          case 'emergency_land':
            command = {
              command: 21, // NAV_LAND
              target_system: systemId,
              target_component: 1,
              confirmation: 0,
              param1: 0, // Abort alt
              param2: 0, // Precision land mode
              param3: 0, // Empty
              param4: 0, // Yaw angle
              param5: 0, // Latitude
              param6: 0, // Longitude
              param7: 0  // Altitude
            };
            break;

          case 'return_to_base':
            command = {
              command: 20, // NAV_RETURN_TO_LAUNCH
              target_system: systemId,
              target_component: 1,
              confirmation: 0,
              param1: 0,
              param2: 0,
              param3: 0,
              param4: 0,
              param5: 0,
              param6: 0,
              param7: 0
            };
            break;

          case 'emergency_scatter':
            // Use guided mode to scatter
            command = {
              command: 92, // NAV_GUIDED_ENABLE
              target_system: systemId,
              target_component: 1,
              confirmation: 0,
              param1: 1, // Enable guided mode
              param2: 0,
              param3: 0,
              param4: 0,
              param5: 0,
              param6: 0,
              param7: 0
            };
            break;

          default:
            continue; // Skip unknown responses
        }

        emergencyCommands.push(this.sendCommandToArduPilot(systemId, command));
      }

      const results = await Promise.all(emergencyCommands);
      const successCount = results.filter(r => r).length;

      console.log(`Emergency response: ${successCount}/${emergencyCommands.length} commands sent`);
      return successCount > 0;
    } catch (error) {
      console.error('Failed to handle emergency response:', error);
      return false;
    }
  }

  /**
   * Update swarm parameters in ArduPilot systems
   */
  async updateSwarmParameters(
    swarm: Swarm,
    newParameters: Partial<SwarmParameters>
  ): Promise<boolean> {
    try {
      const parameterCommands: Promise<boolean>[] = [];

      for (const droneId of swarm.drones) {
        const systemId = this.systemIdMapping.get(droneId);
        if (!systemId) continue;

        // Send parameter updates
        if (newParameters.speed !== undefined) {
          const speedCommand = {
            command: 178, // DO_CHANGE_SPEED
            target_system: systemId,
            target_component: 1,
            confirmation: 0,
            param1: 1, // Speed type (airspeed)
            param2: newParameters.speed,
            param3: -1, // No throttle change
            param4: 0, // Absolute speed
            param5: 0,
            param6: 0,
            param7: 0
          };
          parameterCommands.push(this.sendCommandToArduPilot(systemId, speedCommand));
        }

        if (newParameters.altitude !== undefined) {
          const altCommand = {
            command: 186, // DO_CHANGE_ALTITUDE
            target_system: systemId,
            target_component: 1,
            confirmation: 0,
            param1: newParameters.altitude,
            param2: 0, // Frame (relative to home)
            param3: 0,
            param4: 0,
            param5: 0,
            param6: 0,
            param7: 0
          };
          parameterCommands.push(this.sendCommandToArduPilot(systemId, altCommand));
        }
      }

      const results = await Promise.all(parameterCommands);
      const successCount = results.filter(r => r).length;

      console.log(`Parameter update: ${successCount}/${parameterCommands.length} commands sent`);
      return successCount > 0;
    } catch (error) {
      console.error('Failed to update swarm parameters:', error);
      return false;
    }
  }

  private async subscribeTelemetry(systemId: number, droneId: string): Promise<void> {
    // This would integrate with actual MAVLink telemetry stream
    // For now, we'll simulate the subscription
    const callback = (telemetry: MAVLinkTelemetry) => {
      const droneUpdate = this.mavlinkAdapter.parseTelemetry(telemetry);
      // Update drone state in the system
      this.handleTelemetryUpdate(droneId, droneUpdate);
    };

    this.telemetrySubscriptions.set(systemId, callback);
    console.log(`Subscribed to telemetry for system ${systemId} (drone ${droneId})`);
  }

  private handleTelemetryUpdate(droneId: string, update: Partial<Drone>): void {
    // This would update the drone state in the main system
    // Could emit events or call callbacks to update the UI
    console.log(`Telemetry update for ${droneId}:`, update);
  }

  private async sendSwarmConfiguration(swarm: Swarm, drones: Drone[]): Promise<void> {
    // Send swarm parameters to all drones
    for (const droneId of swarm.drones) {
      const systemId = this.systemIdMapping.get(droneId);
      if (!systemId) continue;

      // Send swarm ID and parameters
      const configCommand = {
        command: 50001, // Custom SWARM_COORDINATION_UPDATE
        target_system: systemId,
        target_component: 1,
        confirmation: 0,
        param1: parseInt(swarm.id.slice(-6), 16) || 0, // Swarm ID as number
        param2: swarm.parameters.spacing,
        param3: swarm.parameters.altitude,
        param4: swarm.parameters.speed,
        param5: swarm.parameters.cohesion,
        param6: swarm.parameters.communicationRange,
        param7: 0
      };

      await this.sendCommandToArduPilot(systemId, configCommand);
    }
  }

  private async sendMissionToArduPilot(systemId: number, mission: MAVLinkCommand[]): Promise<boolean> {
    try {
      // This would send the mission to the ArduPilot system
      // Implementation would use MAVLink protocol over UDP/TCP
      console.log(`Sending mission with ${mission.length} commands to system ${systemId}`);
      
      // Simulate mission upload
      for (const command of mission) {
        await this.sendCommandToArduPilot(systemId, command);
      }

      return true;
    } catch (error) {
      console.error(`Failed to send mission to system ${systemId}:`, error);
      return false;
    }
  }

  private async sendCommandToArduPilot(systemId: number, command: MAVLinkCommand): Promise<boolean> {
    try {
      // This would send individual MAVLink commands
      // Implementation would serialize the command and send via MAVLink protocol
      console.log(`Sending command ${command.command} to system ${systemId}`);
      
      // Simulate command sending
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return true;
    } catch (error) {
      console.error(`Failed to send command to system ${systemId}:`, error);
      return false;
    }
  }

  /**
   * Get integration status and statistics
   */
  getIntegrationStatus(): {
    connectedSystems: number;
    activeTelemetryStreams: number;
    lastCommandSent: number;
    systemIdMappings: Array<{ droneId: string; systemId: number }>;
  } {
    return {
      connectedSystems: this.systemIdMapping.size,
      activeTelemetryStreams: this.telemetrySubscriptions.size,
      lastCommandSent: Date.now(), // Would track actual last command time
      systemIdMappings: Array.from(this.systemIdMapping.entries()).map(([droneId, systemId]) => ({
        droneId,
        systemId
      }))
    };
  }
}

export default {
  MAVLinkSwarmAdapter,
  SwarmMissionTranslator,
  SwarmArduPilotIntegrationManager
};
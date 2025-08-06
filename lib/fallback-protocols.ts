// Secure Communication Fallback Protocols
// Multi-layered communication resilience system for drone operations

import { 
  CommunicationChannel,
  FallbackProtocol,
  CommunicationHealth,
  EWThreat,
  ThreatSeverity,
  EWEvent
} from './types';
import { webSocketService } from './websocket';

// Communication protocol definitions
const PROTOCOL_CONFIGURATIONS = {
  mavlink: {
    defaultFreq: 915, // MHz
    bandwidth: 26,
    maxRange: 40, // km
    latencyTarget: 50, // ms
    reliability: 0.95
  },
  cyphal: {
    defaultFreq: 2400,
    bandwidth: 80,
    maxRange: 20,
    latencyTarget: 30,
    reliability: 0.98
  },
  mesh: {
    frequencies: [868, 915, 2400], // Multiple frequency options
    bandwidth: 125,
    maxRange: 5, // km per hop
    latencyTarget: 100,
    reliability: 0.90
  },
  satellite: {
    frequencies: [1600, 2000], // L-band
    bandwidth: 500,
    maxRange: 1000, // km
    latencyTarget: 500, // Higher latency
    reliability: 0.99
  },
  cellular: {
    frequencies: [700, 850, 1900, 2100], // Various bands
    bandwidth: 20000, // 20 MHz
    maxRange: 50,
    latencyTarget: 80,
    reliability: 0.95
  }
};

// Fallback decision thresholds
const FALLBACK_THRESHOLDS = {
  SIGNAL_QUALITY: {
    CRITICAL: 30,   // Below 30% triggers immediate fallback
    WARNING: 60,    // Below 60% prepares fallback
    GOOD: 80        // Above 80% is considered good
  },
  PACKET_LOSS: {
    CRITICAL: 0.25, // 25% packet loss
    WARNING: 0.10,  // 10% packet loss
    ACCEPTABLE: 0.02 // 2% packet loss
  },
  LATENCY: {
    CRITICAL: 1000, // 1000ms
    WARNING: 500,   // 500ms
    ACCEPTABLE: 100 // 100ms
  },
  JAMMING_STRENGTH: {
    CRITICAL: 0.8,  // 80% jamming strength
    WARNING: 0.5,   // 50% jamming strength
    ACCEPTABLE: 0.1 // 10% jamming strength
  }
};

export class FallbackProtocolSystem {
  private static instance: FallbackProtocolSystem;
  private isActive: boolean = false;
  private availableChannels: Map<string, CommunicationChannel> = new Map();
  private fallbackProtocols: Map<string, FallbackProtocol> = new Map();
  private droneChannelStates: Map<string, {
    primaryChannel: string;
    activeChannel: string;
    backupChannels: string[];
    failureCount: number;
    lastSwitch: number;
    switchHistory: Array<{ timestamp: number; from: string; to: string; reason: string }>;
  }> = new Map();
  private channelHealth: Map<string, CommunicationHealth> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private fallbackCallbacks: Array<(event: any) => void> = [];

  private constructor() {
    this.initializeDefaultChannels();
    this.initializeDefaultProtocols();
    this.setupWebSocketHandlers();
  }

  public static getInstance(): FallbackProtocolSystem {
    if (!FallbackProtocolSystem.instance) {
      FallbackProtocolSystem.instance = new FallbackProtocolSystem();
    }
    return FallbackProtocolSystem.instance;
  }

  private setupWebSocketHandlers(): void {
    if (webSocketService) {
      // Listen for communication health updates
      webSocketService.subscribe('communication_health_update', (data) => {
        this.updateChannelHealth(data);
      });

      // Listen for channel switch requests
      webSocketService.subscribe('request_channel_switch', (data) => {
        this.handleChannelSwitchRequest(data);
      });

      // Listen for backup channel activation
      webSocketService.subscribe('activate_backup_channels', (data) => {
        this.activateBackupChannels(data);
      });

      // Listen for jamming threats
      webSocketService.subscribe('jamming_threat_detected', (data) => {
        this.handleJammingThreat(data);
      });

      // Listen for channel status updates
      webSocketService.subscribe('channel_status_update', (data) => {
        this.updateChannelStatus(data);
      });
    }
  }

  public startFallbackMonitoring(): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log('Fallback Protocol System activated');

    // Start continuous monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
      this.evaluateFallbackConditions();
    }, 2000); // Check every 2 seconds

    this.emitEvent('system_alert', 'low', 'Fallback Protocol System activated');
  }

  public stopFallbackMonitoring(): void {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Fallback Protocol System deactivated');
    this.emitEvent('system_alert', 'low', 'Fallback Protocol System deactivated');
  }

  public addFallbackCallback(callback: (event: any) => void): () => void {
    this.fallbackCallbacks.push(callback);
    return () => {
      this.fallbackCallbacks = this.fallbackCallbacks.filter(cb => cb !== callback);
    };
  }

  public registerDrone(droneId: string, primaryChannelId: string, backupChannelIds: string[]): boolean {
    const primaryChannel = this.availableChannels.get(primaryChannelId);
    if (!primaryChannel) {
      console.error(`Primary channel ${primaryChannelId} not found`);
      return false;
    }

    // Validate backup channels
    const validBackups = backupChannelIds.filter(id => this.availableChannels.has(id));
    if (validBackups.length !== backupChannelIds.length) {
      console.warn(`Some backup channels not found for drone ${droneId}`);
    }

    this.droneChannelStates.set(droneId, {
      primaryChannel: primaryChannelId,
      activeChannel: primaryChannelId,
      backupChannels: validBackups,
      failureCount: 0,
      lastSwitch: 0,
      switchHistory: []
    });

    console.log(`Registered drone ${droneId} with primary channel ${primaryChannelId} and ${validBackups.length} backup channels`);
    return true;
  }

  public createChannel(config: Omit<CommunicationChannel, 'id' | 'lastUsed'>): string {
    const channelId = `channel_${Date.now()}`;
    
    const channel: CommunicationChannel = {
      id: channelId,
      ...config,
      performance: {
        latency: PROTOCOL_CONFIGURATIONS[config.protocol]?.latencyTarget || 100,
        throughput: this.calculateThroughput(config.bandwidth),
        reliability: PROTOCOL_CONFIGURATIONS[config.protocol]?.reliability || 0.9
      }
    };

    this.availableChannels.set(channelId, channel);
    console.log(`Created communication channel: ${channel.name} (${channelId})`);

    return channelId;
  }

  public createFallbackProtocol(config: Omit<FallbackProtocol, 'id'>): string {
    const protocolId = `protocol_${Date.now()}`;
    
    const protocol: FallbackProtocol = {
      id: protocolId,
      ...config
    };

    // Validate channel sequence
    const validChannels = protocol.channelSequence.filter(id => 
      this.availableChannels.has(id)
    );

    if (validChannels.length !== protocol.channelSequence.length) {
      console.warn(`Some channels in protocol ${protocolId} are not available`);
      protocol.channelSequence = validChannels;
    }

    this.fallbackProtocols.set(protocolId, protocol);
    console.log(`Created fallback protocol: ${protocol.name} (${protocolId})`);

    return protocolId;
  }

  public switchChannel(droneId: string, targetChannelId: string, reason: string = 'manual'): boolean {
    const droneState = this.droneChannelStates.get(droneId);
    const targetChannel = this.availableChannels.get(targetChannelId);

    if (!droneState || !targetChannel) {
      console.error(`Cannot switch channel for drone ${droneId}: invalid drone or channel`);
      return false;
    }

    if (droneState.activeChannel === targetChannelId) {
      console.log(`Drone ${droneId} already using channel ${targetChannelId}`);
      return true;
    }

    // Check if target channel is available
    if (targetChannel.status === 'failed') {
      console.error(`Cannot switch to failed channel ${targetChannelId}`);
      return false;
    }

    const previousChannel = droneState.activeChannel;
    
    // Perform the switch
    const switchSuccess = this.performChannelSwitch(droneId, targetChannelId);
    
    if (switchSuccess) {
      droneState.activeChannel = targetChannelId;
      droneState.lastSwitch = Date.now();
      droneState.switchHistory.push({
        timestamp: Date.now(),
        from: previousChannel,
        to: targetChannelId,
        reason
      });

      // Update channel usage
      targetChannel.lastUsed = new Date().toISOString();

      console.log(`Successfully switched drone ${droneId} from ${previousChannel} to ${targetChannelId} (reason: ${reason})`);
      
      this.notifyChannelSwitch(droneId, previousChannel, targetChannelId, reason);
      return true;
    }

    console.error(`Failed to switch drone ${droneId} to channel ${targetChannelId}`);
    return false;
  }

  public getDroneChannelStatus(droneId: string): any {
    const droneState = this.droneChannelStates.get(droneId);
    if (!droneState) return null;

    const activeChannel = this.availableChannels.get(droneState.activeChannel);
    const primaryChannel = this.availableChannels.get(droneState.primaryChannel);

    return {
      droneId,
      primaryChannel: {
        id: droneState.primaryChannel,
        name: primaryChannel?.name,
        status: primaryChannel?.status
      },
      activeChannel: {
        id: droneState.activeChannel,
        name: activeChannel?.name,
        status: activeChannel?.status,
        isBackup: droneState.activeChannel !== droneState.primaryChannel
      },
      backupChannels: droneState.backupChannels.map(id => {
        const channel = this.availableChannels.get(id);
        return {
          id,
          name: channel?.name,
          status: channel?.status
        };
      }),
      failureCount: droneState.failureCount,
      lastSwitch: droneState.lastSwitch,
      switchHistory: droneState.switchHistory.slice(-10) // Last 10 switches
    };
  }

  public getAvailableChannels(): CommunicationChannel[] {
    return Array.from(this.availableChannels.values());
  }

  public getFallbackProtocols(): FallbackProtocol[] {
    return Array.from(this.fallbackProtocols.values());
  }

  public testChannelConnectivity(channelId: string, droneId?: string): Promise<boolean> {
    return new Promise((resolve) => {
      const channel = this.availableChannels.get(channelId);
      if (!channel) {
        resolve(false);
        return;
      }

      // Send test message via WebSocket
      if (webSocketService) {
        const testId = `test_${Date.now()}`;
        const timeout = setTimeout(() => {
          resolve(false);
        }, 5000); // 5 second timeout

        // Listen for test response
        const unsubscribe = webSocketService.subscribe('channel_test_response', (data) => {
          if (data.testId === testId) {
            clearTimeout(timeout);
            unsubscribe();
            resolve(data.success || false);
          }
        });

        webSocketService.send('test_channel_connectivity', {
          testId,
          channelId,
          droneId,
          timestamp: Date.now()
        });
      } else {
        resolve(false);
      }
    });
  }

  private initializeDefaultChannels(): void {
    // Create default communication channels
    
    // Primary MAVLink channel
    this.createChannel({
      name: 'MAVLink Primary',
      type: 'primary',
      protocol: 'mavlink',
      frequency: 915,
      bandwidth: 26,
      maxRange: 40,
      status: 'active',
      security: {
        encrypted: true,
        authentication: true,
        keyRotation: true
      }
    });

    // Backup MAVLink channel (different frequency)
    this.createChannel({
      name: 'MAVLink Backup',
      type: 'backup',
      protocol: 'mavlink',
      frequency: 868,
      bandwidth: 26,
      maxRange: 35,
      status: 'standby',
      security: {
        encrypted: true,
        authentication: true,
        keyRotation: true
      }
    });

    // Cyphal/UAVCAN channel
    this.createChannel({
      name: 'Cyphal Primary',
      type: 'backup',
      protocol: 'cyphal',
      frequency: 2400,
      bandwidth: 80,
      maxRange: 20,
      status: 'standby',
      security: {
        encrypted: true,
        authentication: true,
        keyRotation: true
      }
    });

    // Mesh network channel
    this.createChannel({
      name: 'Mesh Network',
      type: 'backup',
      protocol: 'mesh',
      frequency: 2400,
      bandwidth: 125,
      maxRange: 10,
      status: 'standby',
      security: {
        encrypted: true,
        authentication: true,
        keyRotation: false
      }
    });

    // Satellite communication (emergency)
    this.createChannel({
      name: 'Satellite Emergency',
      type: 'emergency',
      protocol: 'satellite',
      frequency: 1600,
      bandwidth: 500,
      maxRange: 1000,
      status: 'standby',
      security: {
        encrypted: true,
        authentication: true,
        keyRotation: true
      }
    });

    console.log(`Initialized ${this.availableChannels.size} default communication channels`);
  }

  private initializeDefaultProtocols(): void {
    // Create default fallback protocols
    
    const channelIds = Array.from(this.availableChannels.keys());
    
    // Standard fallback protocol
    this.createFallbackProtocol({
      name: 'Standard Fallback',
      priority: 5,
      channelSequence: channelIds.slice(0, 3), // Primary + 2 backups
      switchCriteria: {
        signalThreshold: -80, // dBm
        packetLossThreshold: 0.15, // 15%
        latencyThreshold: 500, // ms
        jammingDetected: true
      },
      automatic: true,
      manualOverride: true
    });

    // Emergency fallback protocol
    this.createFallbackProtocol({
      name: 'Emergency Fallback',
      priority: 10,
      channelSequence: channelIds, // All available channels
      switchCriteria: {
        signalThreshold: -90, // More aggressive
        packetLossThreshold: 0.10, // Lower tolerance
        latencyThreshold: 300,
        jammingDetected: true
      },
      automatic: true,
      manualOverride: false
    });

    // Anti-jamming protocol
    this.createFallbackProtocol({
      name: 'Anti-Jamming Protocol',
      priority: 8,
      channelSequence: channelIds.filter(id => {
        const channel = this.availableChannels.get(id);
        return channel && (channel.protocol === 'mesh' || channel.protocol === 'satellite');
      }),
      switchCriteria: {
        signalThreshold: -70,
        packetLossThreshold: 0.05,
        latencyThreshold: 1000, // More tolerant for jamming scenarios
        jammingDetected: true
      },
      automatic: true,
      manualOverride: true
    });

    console.log(`Initialized ${this.fallbackProtocols.size} default fallback protocols`);
  }

  private updateChannelHealth(healthData: CommunicationHealth): void {
    const droneId = healthData.droneId;
    const droneState = this.droneChannelStates.get(droneId);
    
    if (!droneState) return;

    const activeChannelId = droneState.activeChannel;
    this.channelHealth.set(`${droneId}-${activeChannelId}`, healthData);

    // Update channel status based on health
    const channel = this.availableChannels.get(activeChannelId);
    if (channel) {
      if (healthData.jamming.detected) {
        channel.status = 'jamming_detected';
      } else if (healthData.linkQuality < FALLBACK_THRESHOLDS.SIGNAL_QUALITY.CRITICAL) {
        channel.status = 'failed';
      } else if (healthData.linkQuality < FALLBACK_THRESHOLDS.SIGNAL_QUALITY.WARNING) {
        // Keep as active but mark as degraded
        channel.performance.reliability = healthData.linkQuality / 100;
      } else {
        channel.status = 'active';
      }
    }
  }

  private updateChannelStatus(data: any): void {
    const { channelId, status, reason } = data;
    const channel = this.availableChannels.get(channelId);
    
    if (channel) {
      const oldStatus = channel.status;
      channel.status = status;
      
      console.log(`Channel ${channelId} status changed from ${oldStatus} to ${status}: ${reason}`);
      
      // If a channel failed, trigger fallback for affected drones
      if (status === 'failed') {
        this.handleChannelFailure(channelId, reason);
      }
    }
  }

  private handleChannelSwitchRequest(data: any): void {
    const { droneId, targetChannelId, reason } = data;
    this.switchChannel(droneId, targetChannelId, reason || 'requested');
  }

  private activateBackupChannels(data: any): void {
    const { threatId, affectedDrones, primaryChannelAffected } = data;
    
    affectedDrones.forEach((droneId: string) => {
      const droneState = this.droneChannelStates.get(droneId);
      if (!droneState) return;

      // Find best backup channel
      const bestBackup = this.findBestBackupChannel(droneId, primaryChannelAffected);
      if (bestBackup) {
        this.switchChannel(droneId, bestBackup, `threat_${threatId}`);
      }
    });
  }

  private handleJammingThreat(threat: EWThreat): void {
    if (threat.type !== 'jamming') return;

    const affectedFrequency = threat.characteristics.frequency;
    if (!affectedFrequency) return;

    // Find channels that might be affected by this jamming
    const affectedChannels = Array.from(this.availableChannels.values())
      .filter(channel => 
        Math.abs(channel.frequency - affectedFrequency) < channel.bandwidth
      );

    // Switch drones away from affected channels
    this.droneChannelStates.forEach((droneState, droneId) => {
      const activeChannel = this.availableChannels.get(droneState.activeChannel);
      if (activeChannel && affectedChannels.includes(activeChannel)) {
        const unaffectedBackup = this.findUnaffectedBackupChannel(droneId, affectedFrequency);
        if (unaffectedBackup) {
          this.switchChannel(droneId, unaffectedBackup, `jamming_avoidance_${threat.id}`);
        }
      }
    });
  }

  private performHealthChecks(): void {
    if (!this.isActive) return;

    // Request health updates for all active channels
    this.droneChannelStates.forEach((droneState, droneId) => {
      if (webSocketService) {
        webSocketService.send('request_communication_health', {
          droneId,
          channelId: droneState.activeChannel,
          timestamp: Date.now()
        });
      }
    });
  }

  private evaluateFallbackConditions(): void {
    if (!this.isActive) return;

    this.droneChannelStates.forEach((droneState, droneId) => {
      const healthKey = `${droneId}-${droneState.activeChannel}`;
      const health = this.channelHealth.get(healthKey);
      
      if (!health) return;

      // Check if fallback conditions are met
      const fallbackNeeded = this.shouldTriggerFallback(health);
      
      if (fallbackNeeded.required) {
        const protocol = this.selectFallbackProtocol(droneId, fallbackNeeded.reason);
        if (protocol) {
          this.executeFallbackProtocol(droneId, protocol, fallbackNeeded.reason);
        }
      }
    });
  }

  private shouldTriggerFallback(health: CommunicationHealth): { required: boolean; reason: string } {
    // Check signal quality
    if (health.linkQuality < FALLBACK_THRESHOLDS.SIGNAL_QUALITY.CRITICAL) {
      return { required: true, reason: 'signal_quality_critical' };
    }

    // Check packet loss
    if (health.packetLoss > FALLBACK_THRESHOLDS.PACKET_LOSS.CRITICAL) {
      return { required: true, reason: 'packet_loss_critical' };
    }

    // Check latency
    if (health.latency > FALLBACK_THRESHOLDS.LATENCY.CRITICAL) {
      return { required: true, reason: 'latency_critical' };
    }

    // Check jamming
    if (health.jamming.detected && 
        health.jamming.strength && 
        health.jamming.strength > FALLBACK_THRESHOLDS.JAMMING_STRENGTH.CRITICAL) {
      return { required: true, reason: 'jamming_critical' };
    }

    return { required: false, reason: '' };
  }

  private selectFallbackProtocol(droneId: string, reason: string): FallbackProtocol | null {
    // Select the highest priority protocol that applies to this situation
    const applicableProtocols = Array.from(this.fallbackProtocols.values())
      .filter(protocol => protocol.automatic)
      .sort((a, b) => b.priority - a.priority);

    for (const protocol of applicableProtocols) {
      if (this.protocolApplies(protocol, reason)) {
        return protocol;
      }
    }

    return null;
  }

  private protocolApplies(protocol: FallbackProtocol, reason: string): boolean {
    // Check if protocol is applicable based on the reason for fallback
    if (reason.includes('jamming') && protocol.name.includes('Anti-Jamming')) {
      return true;
    }
    
    if (reason.includes('critical') && protocol.name.includes('Emergency')) {
      return true;
    }

    // Default protocols apply to general conditions
    if (protocol.name.includes('Standard')) {
      return true;
    }

    return false;
  }

  private executeFallbackProtocol(droneId: string, protocol: FallbackProtocol, reason: string): void {
    const droneState = this.droneChannelStates.get(droneId);
    if (!droneState) return;

    console.log(`Executing fallback protocol "${protocol.name}" for drone ${droneId} (reason: ${reason})`);

    // Try channels in the protocol sequence
    for (const channelId of protocol.channelSequence) {
      if (channelId === droneState.activeChannel) {
        continue; // Skip current channel
      }

      const channel = this.availableChannels.get(channelId);
      if (channel && channel.status === 'active' || channel?.status === 'standby') {
        const switchSuccess = this.switchChannel(droneId, channelId, `protocol_${protocol.name}`);
        if (switchSuccess) {
          break; // Successfully switched, stop trying
        }
      }
    }

    this.notifyFallbackExecution(droneId, protocol, reason);
  }

  private handleChannelFailure(channelId: string, reason: string): void {
    console.log(`Handling channel failure: ${channelId} (${reason})`);

    // Find all drones using this channel and switch them
    this.droneChannelStates.forEach((droneState, droneId) => {
      if (droneState.activeChannel === channelId) {
        droneState.failureCount++;
        
        const backupChannel = this.findBestBackupChannel(droneId, channelId);
        if (backupChannel) {
          this.switchChannel(droneId, backupChannel, `channel_failure_${reason}`);
        } else {
          console.error(`No backup channel available for drone ${droneId}`);
          this.emitEvent('system_alert', 'critical', 
            `No backup communication available for drone ${droneId}`);
        }
      }
    });
  }

  private findBestBackupChannel(droneId: string, excludeChannelId?: string): string | null {
    const droneState = this.droneChannelStates.get(droneId);
    if (!droneState) return null;

    // Get available backup channels
    const availableBackups = droneState.backupChannels
      .filter(id => id !== excludeChannelId)
      .map(id => this.availableChannels.get(id))
      .filter((channel): channel is CommunicationChannel => 
        channel !== undefined && 
        (channel.status === 'active' || channel.status === 'standby')
      );

    if (availableBackups.length === 0) return null;

    // Sort by priority: primary > backup > emergency, then by reliability
    availableBackups.sort((a, b) => {
      const priorityOrder = { 'primary': 3, 'backup': 2, 'emergency': 1 };
      const aPriority = priorityOrder[a.type];
      const bPriority = priorityOrder[b.type];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.performance.reliability - a.performance.reliability;
    });

    return availableBackups[0].id;
  }

  private findUnaffectedBackupChannel(droneId: string, jammingFrequency: number): string | null {
    const droneState = this.droneChannelStates.get(droneId);
    if (!droneState) return null;

    // Find backup channels not affected by jamming frequency
    const unaffectedBackups = droneState.backupChannels
      .map(id => this.availableChannels.get(id))
      .filter((channel): channel is CommunicationChannel => 
        channel !== undefined && 
        (channel.status === 'active' || channel.status === 'standby') &&
        Math.abs(channel.frequency - jammingFrequency) > channel.bandwidth * 2 // 2x bandwidth separation
      );

    if (unaffectedBackups.length === 0) return null;

    // Return the most reliable unaffected channel
    unaffectedBackups.sort((a, b) => b.performance.reliability - a.performance.reliability);
    return unaffectedBackups[0].id;
  }

  private performChannelSwitch(droneId: string, targetChannelId: string): boolean {
    // Send channel switch command via WebSocket
    if (webSocketService) {
      webSocketService.sendSecure('execute_channel_switch', {
        droneId,
        targetChannelId,
        timestamp: Date.now()
      });
      
      // In a real implementation, this would wait for confirmation
      // For now, we'll assume success
      return true;
    }
    
    return false;
  }

  private calculateThroughput(bandwidth: number): number {
    // Simplified throughput calculation (bits per second)
    // Real calculation would consider modulation, coding, etc.
    return bandwidth * 1000000 * 0.8; // 80% efficiency
  }

  private notifyChannelSwitch(droneId: string, fromChannel: string, toChannel: string, reason: string): void {
    const switchEvent = {
      type: 'channel_switch',
      droneId,
      fromChannel,
      toChannel,
      reason,
      timestamp: Date.now()
    };

    this.fallbackCallbacks.forEach(callback => {
      try {
        callback(switchEvent);
      } catch (error) {
        console.error('Error in fallback callback:', error);
      }
    });

    if (webSocketService) {
      webSocketService.send('channel_switch_notification', switchEvent);
    }
  }

  private notifyFallbackExecution(droneId: string, protocol: FallbackProtocol, reason: string): void {
    const fallbackEvent = {
      type: 'fallback_executed',
      droneId,
      protocol: protocol.name,
      reason,
      timestamp: Date.now()
    };

    this.fallbackCallbacks.forEach(callback => {
      try {
        callback(fallbackEvent);
      } catch (error) {
        console.error('Error in fallback callback:', error);
      }
    });

    if (webSocketService) {
      webSocketService.send('fallback_execution_notification', fallbackEvent);
    }
  }

  private emitEvent(type: EWEvent['type'], severity: ThreatSeverity, message: string): void {
    const event: EWEvent = {
      id: `fallback-event-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      details: {},
      acknowledged: false
    };

    if (webSocketService) {
      webSocketService.send('ew_event', event);
    }
  }
}

// Export singleton instance and hook
export const fallbackProtocols = FallbackProtocolSystem.getInstance();

export function useFallbackProtocols() {
  const system = FallbackProtocolSystem.getInstance();
  
  return {
    startFallbackMonitoring: () => system.startFallbackMonitoring(),
    stopFallbackMonitoring: () => system.stopFallbackMonitoring(),
    registerDrone: (droneId: string, primaryChannelId: string, backupChannelIds: string[]) => 
      system.registerDrone(droneId, primaryChannelId, backupChannelIds),
    switchChannel: (droneId: string, targetChannelId: string, reason?: string) => 
      system.switchChannel(droneId, targetChannelId, reason),
    createChannel: (config: Omit<CommunicationChannel, 'id' | 'lastUsed'>) => 
      system.createChannel(config),
    createFallbackProtocol: (config: Omit<FallbackProtocol, 'id'>) => 
      system.createFallbackProtocol(config),
    getDroneChannelStatus: (droneId: string) => system.getDroneChannelStatus(droneId),
    getAvailableChannels: () => system.getAvailableChannels(),
    getFallbackProtocols: () => system.getFallbackProtocols(),
    testChannelConnectivity: (channelId: string, droneId?: string) => 
      system.testChannelConnectivity(channelId, droneId),
    addFallbackCallback: (callback: (event: any) => void) => 
      system.addFallbackCallback(callback),
  };
}
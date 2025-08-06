// Frequency Hopping Spread Spectrum (FHSS) Protocol Implementation
// Military-grade frequency hopping for secure drone communications

import { 
  FrequencyHoppingPattern, 
  AntiJammingConfiguration,
  EWThreat,
  ThreatSeverity,
  EWEvent 
} from './types';
import { webSocketService } from './websocket';

// Frequency allocation for different regions and bands
const FREQUENCY_BANDS = {
  ISM_915: { start: 902, end: 928, spacing: 0.5 }, // MHz, 915MHz ISM band
  ISM_2400: { start: 2402, end: 2480, spacing: 1.0 }, // 2.4GHz ISM band
  ISM_5800: { start: 5725, end: 5875, spacing: 5.0 }, // 5.8GHz ISM band
  UHF_MILITARY: { start: 225, end: 400, spacing: 0.025 }, // Military UHF
  VHF_MILITARY: { start: 30, end: 88, spacing: 0.025 }   // Military VHF
};

// Cryptographic constants for secure hopping sequences
const LFSR_POLYNOMIALS = {
  7: 0x48,   // x^7 + x^6 + x^3 + 1
  11: 0x500, // x^11 + x^10 + x^8 + 1
  15: 0x6000, // x^15 + x^14 + x^13 + 1
  23: 0x420000 // x^23 + x^22 + x^18 + 1
};

export class FrequencyHoppingSystem {
  private static instance: FrequencyHoppingSystem;
  private isActive: boolean = false;
  private currentPattern: FrequencyHoppingPattern | null = null;
  private availablePatterns: Map<string, FrequencyHoppingPattern> = new Map();
  private activeDrones: Map<string, { 
    pattern: string; 
    currentFreq: number; 
    nextHopTime: number;
    syncStatus: 'synced' | 'syncing' | 'lost';
  }> = new Map();
  private hoppingInterval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private performanceMetrics: Map<string, {
    hopCount: number;
    collisions: number;
    syncLosses: number;
    avgDwellTime: number;
    lastHop: number;
  }> = new Map();

  private constructor() {
    this.initializeDefaultPatterns();
    this.setupWebSocketHandlers();
  }

  public static getInstance(): FrequencyHoppingSystem {
    if (!FrequencyHoppingSystem.instance) {
      FrequencyHoppingSystem.instance = new FrequencyHoppingSystem();
    }
    return FrequencyHoppingSystem.instance;
  }

  private setupWebSocketHandlers(): void {
    if (webSocketService) {
      // Listen for frequency hopping commands
      webSocketService.subscribe('activate_frequency_hopping', (data) => {
        this.handleFrequencyHoppingActivation(data);
      });

      // Listen for sync requests
      webSocketService.subscribe('fhss_sync_request', (data) => {
        this.handleSyncRequest(data);
      });

      // Listen for pattern updates
      webSocketService.subscribe('fhss_pattern_update', (data) => {
        this.handlePatternUpdate(data);
      });

      // Listen for hop acknowledgments
      webSocketService.subscribe('fhss_hop_ack', (data) => {
        this.handleHopAcknowledgment(data);
      });
    }
  }

  public startFrequencyHopping(patternId: string, droneIds: string[]): boolean {
    const pattern = this.availablePatterns.get(patternId);
    if (!pattern) {
      console.error(`Frequency hopping pattern ${patternId} not found`);
      return false;
    }

    this.isActive = true;
    this.currentPattern = pattern;

    // Initialize drones with the pattern
    droneIds.forEach(droneId => {
      this.initializeDroneForHopping(droneId, pattern);
    });

    // Start hopping timer
    this.startHoppingTimer();

    // Start sync monitoring
    this.startSyncMonitoring();

    console.log(`Frequency hopping activated with pattern ${patternId} for ${droneIds.length} drones`);
    this.emitEvent('system_alert', 'low', `Frequency hopping activated: ${patternId}`);

    return true;
  }

  public stopFrequencyHopping(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.currentPattern = null;

    // Stop timers
    if (this.hoppingInterval) {
      clearInterval(this.hoppingInterval);
      this.hoppingInterval = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Notify all drones to stop hopping
    this.activeDrones.forEach((droneState, droneId) => {
      this.sendHopCommand(droneId, null, 'stop');
    });

    this.activeDrones.clear();
    console.log('Frequency hopping deactivated');
    this.emitEvent('system_alert', 'low', 'Frequency hopping deactivated');
  }

  public addDroneToHopping(droneId: string, patternId?: string): boolean {
    if (!this.isActive) {
      console.warn('Frequency hopping not active');
      return false;
    }

    const pattern = patternId ? 
      this.availablePatterns.get(patternId) : 
      this.currentPattern;

    if (!pattern) {
      console.error('No valid hopping pattern available');
      return false;
    }

    this.initializeDroneForHopping(droneId, pattern);
    console.log(`Added drone ${droneId} to frequency hopping`);
    return true;
  }

  public removeDroneFromHopping(droneId: string): void {
    if (this.activeDrones.has(droneId)) {
      this.sendHopCommand(droneId, null, 'stop');
      this.activeDrones.delete(droneId);
      this.performanceMetrics.delete(droneId);
      console.log(`Removed drone ${droneId} from frequency hopping`);
    }
  }

  public createHoppingPattern(
    name: string,
    band: keyof typeof FREQUENCY_BANDS,
    dwellTime: number,
    sequenceLength: number,
    seed?: number
  ): string {
    const patternId = `pattern_${Date.now()}`;
    const frequencyBand = FREQUENCY_BANDS[band];
    
    // Generate frequency list for the band
    const frequencies: number[] = [];
    for (let freq = frequencyBand.start; freq <= frequencyBand.end; freq += frequencyBand.spacing) {
      frequencies.push(Number(freq.toFixed(3)));
    }

    // Generate pseudo-random hopping sequence
    const hopSequence = this.generateHoppingSequence(frequencies.length, sequenceLength, seed);
    
    // Create synchronization word
    const syncWord = this.generateSyncWord();

    const pattern: FrequencyHoppingPattern = {
      id: patternId,
      name,
      frequencies,
      dwellTime,
      hopSequence,
      syncWord,
      encryptionKey: this.generateEncryptionKey(),
      active: false
    };

    this.availablePatterns.set(patternId, pattern);
    console.log(`Created frequency hopping pattern ${name} with ${frequencies.length} frequencies`);

    return patternId;
  }

  public switchPattern(newPatternId: string, droneIds?: string[]): boolean {
    const newPattern = this.availablePatterns.get(newPatternId);
    if (!newPattern) {
      console.error(`Pattern ${newPatternId} not found`);
      return false;
    }

    const targetDrones = droneIds || Array.from(this.activeDrones.keys());
    
    // Coordinate pattern switch
    this.coordinatePatternSwitch(newPattern, targetDrones);
    
    if (!droneIds) {
      // Switching all drones to new pattern
      this.currentPattern = newPattern;
    }

    console.log(`Switched to pattern ${newPatternId} for ${targetDrones.length} drones`);
    return true;
  }

  public getPatternPerformance(droneId: string): any {
    const metrics = this.performanceMetrics.get(droneId);
    const droneState = this.activeDrones.get(droneId);
    
    if (!metrics || !droneState) {
      return null;
    }

    const now = Date.now();
    const uptime = now - (metrics.lastHop || now);
    
    return {
      droneId,
      pattern: droneState.pattern,
      currentFrequency: droneState.currentFreq,
      syncStatus: droneState.syncStatus,
      hopCount: metrics.hopCount,
      collisionRate: metrics.hopCount > 0 ? metrics.collisions / metrics.hopCount : 0,
      syncLossRate: metrics.hopCount > 0 ? metrics.syncLosses / metrics.hopCount : 0,
      avgDwellTime: metrics.avgDwellTime,
      uptime,
      nextHopIn: Math.max(0, droneState.nextHopTime - now)
    };
  }

  public getActivePatterns(): FrequencyHoppingPattern[] {
    return Array.from(this.availablePatterns.values()).filter(p => p.active);
  }

  public detectCollisions(): { frequency: number; droneIds: string[] }[] {
    const frequencyMap = new Map<number, string[]>();
    
    // Group drones by current frequency
    this.activeDrones.forEach((state, droneId) => {
      if (!frequencyMap.has(state.currentFreq)) {
        frequencyMap.set(state.currentFreq, []);
      }
      frequencyMap.get(state.currentFreq)!.push(droneId);
    });

    // Find frequencies with multiple drones (collisions)
    const collisions: { frequency: number; droneIds: string[] }[] = [];
    frequencyMap.forEach((droneIds, frequency) => {
      if (droneIds.length > 1) {
        collisions.push({ frequency, droneIds });
      }
    });

    return collisions;
  }

  private initializeDefaultPatterns(): void {
    // Create default patterns for different scenarios
    
    // Anti-jamming pattern for ISM 915MHz band
    this.createHoppingPattern('Anti-Jam ISM915', 'ISM_915', 50, 64, 0x12345);
    
    // High-speed pattern for 2.4GHz
    this.createHoppingPattern('Fast-Hop ISM2400', 'ISM_2400', 20, 128, 0x67890);
    
    // Military UHF pattern
    this.createHoppingPattern('Military UHF', 'UHF_MILITARY', 100, 256, 0xABCDE);
    
    // Wide-band 5.8GHz pattern
    this.createHoppingPattern('Wideband 5800', 'ISM_5800', 30, 64, 0xFEDCB);
  }

  private initializeDroneForHopping(droneId: string, pattern: FrequencyHoppingPattern): void {
    // Calculate initial frequency and hop time
    const initialIndex = this.calculateInitialHopIndex(droneId, pattern);
    const initialFreq = pattern.frequencies[pattern.hopSequence[initialIndex]];
    const nextHopTime = Date.now() + pattern.dwellTime;

    this.activeDrones.set(droneId, {
      pattern: pattern.id,
      currentFreq: initialFreq,
      nextHopTime,
      syncStatus: 'syncing'
    });

    // Initialize performance metrics
    this.performanceMetrics.set(droneId, {
      hopCount: 0,
      collisions: 0,
      syncLosses: 0,
      avgDwellTime: pattern.dwellTime,
      lastHop: Date.now()
    });

    // Send initial hop command
    this.sendHopCommand(droneId, initialFreq, 'start', pattern);
  }

  private generateHoppingSequence(numFreqs: number, length: number, seed?: number): number[] {
    // Use Linear Feedback Shift Register (LFSR) for pseudo-random sequence
    const lfsr = new LFSR(seed || Math.floor(Math.random() * 0xFFFFFF));
    const sequence: number[] = [];

    for (let i = 0; i < length; i++) {
      const value = lfsr.next();
      sequence.push(value % numFreqs);
    }

    return sequence;
  }

  private generateSyncWord(): string {
    // Generate a unique synchronization word for pattern identification
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let syncWord = '';
    for (let i = 0; i < 8; i++) {
      syncWord += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return syncWord;
  }

  private generateEncryptionKey(): string {
    // Generate a cryptographic key for hop pattern encryption
    const key = new Uint8Array(32); // 256-bit key
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(key);
    } else {
      // Fallback for Node.js environment
      for (let i = 0; i < key.length; i++) {
        key[i] = Math.floor(Math.random() * 256);
      }
    }
    return Buffer.from(key).toString('hex');
  }

  private calculateInitialHopIndex(droneId: string, pattern: FrequencyHoppingPattern): number {
    // Calculate deterministic but unique starting position for each drone
    const hash = this.simpleHash(droneId + pattern.syncWord);
    return hash % pattern.hopSequence.length;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private startHoppingTimer(): void {
    if (!this.currentPattern) return;

    // Use a high-precision timer for accurate hopping
    const baseInterval = Math.min(...Array.from(this.availablePatterns.values()).map(p => p.dwellTime));
    
    this.hoppingInterval = setInterval(() => {
      this.performHoppingCycle();
    }, baseInterval / 4); // Check 4 times per smallest dwell time
  }

  private startSyncMonitoring(): void {
    this.syncInterval = setInterval(() => {
      this.checkSynchronization();
    }, 1000); // Check sync every second
  }

  private performHoppingCycle(): void {
    const now = Date.now();
    
    this.activeDrones.forEach((droneState, droneId) => {
      if (now >= droneState.nextHopTime) {
        this.performHop(droneId, droneState);
      }
    });
  }

  private performHop(droneId: string, droneState: any): void {
    const pattern = this.availablePatterns.get(droneState.pattern);
    if (!pattern) return;

    const metrics = this.performanceMetrics.get(droneId);
    if (!metrics) return;

    // Calculate next frequency
    const currentHopIndex = (metrics.hopCount) % pattern.hopSequence.length;
    const nextFreqIndex = pattern.hopSequence[currentHopIndex];
    const nextFreq = pattern.frequencies[nextFreqIndex];

    // Check for potential collisions
    const collisions = this.detectCollisions();
    const hasCollision = collisions.some(c => c.frequency === nextFreq);
    
    if (hasCollision) {
      metrics.collisions++;
      // Implement collision avoidance if needed
      console.warn(`Frequency collision detected at ${nextFreq}MHz for drone ${droneId}`);
    }

    // Update drone state
    droneState.currentFreq = nextFreq;
    droneState.nextHopTime = Date.now() + pattern.dwellTime;

    // Update metrics
    metrics.hopCount++;
    metrics.lastHop = Date.now();

    // Send hop command
    this.sendHopCommand(droneId, nextFreq, 'hop');

    console.log(`Drone ${droneId} hopped to ${nextFreq}MHz (hop #${metrics.hopCount})`);
  }

  private sendHopCommand(droneId: string, frequency: number | null, command: 'start' | 'hop' | 'stop', pattern?: FrequencyHoppingPattern): void {
    if (!webSocketService) return;

    const hopCommand = {
      droneId,
      command,
      frequency,
      timestamp: Date.now(),
      sequenceNumber: this.performanceMetrics.get(droneId)?.hopCount || 0,
      pattern: pattern ? {
        id: pattern.id,
        syncWord: pattern.syncWord,
        dwellTime: pattern.dwellTime
      } : undefined
    };

    webSocketService.sendSecure('fhss_hop_command', hopCommand);
  }

  private checkSynchronization(): void {
    this.activeDrones.forEach((droneState, droneId) => {
      const now = Date.now();
      const timeSinceLastHop = now - (this.performanceMetrics.get(droneId)?.lastHop || now);
      
      const pattern = this.availablePatterns.get(droneState.pattern);
      if (!pattern) return;

      // Check if drone is synchronized (within acceptable timing window)
      const maxDelay = pattern.dwellTime * 0.1; // 10% tolerance
      
      if (timeSinceLastHop > pattern.dwellTime + maxDelay) {
        if (droneState.syncStatus === 'synced') {
          droneState.syncStatus = 'lost';
          const metrics = this.performanceMetrics.get(droneId);
          if (metrics) {
            metrics.syncLosses++;
          }
          
          console.warn(`Sync lost for drone ${droneId}`);
          this.initiateResync(droneId);
        }
      } else if (droneState.syncStatus === 'syncing' && timeSinceLastHop < maxDelay) {
        droneState.syncStatus = 'synced';
        console.log(`Sync established for drone ${droneId}`);
      }
    });
  }

  private initiateResync(droneId: string): void {
    const droneState = this.activeDrones.get(droneId);
    if (!droneState) return;

    const pattern = this.availablePatterns.get(droneState.pattern);
    if (!pattern) return;

    // Send resync command with current pattern state
    if (webSocketService) {
      webSocketService.sendSecure('fhss_resync_command', {
        droneId,
        pattern: {
          id: pattern.id,
          syncWord: pattern.syncWord,
          currentSequencePosition: this.performanceMetrics.get(droneId)?.hopCount || 0
        },
        timestamp: Date.now()
      });
    }

    droneState.syncStatus = 'syncing';
  }

  private coordinatePatternSwitch(newPattern: FrequencyHoppingPattern, droneIds: string[]): void {
    // Coordinate simultaneous pattern switch across multiple drones
    const switchTime = Date.now() + 5000; // Switch in 5 seconds
    
    droneIds.forEach(droneId => {
      if (webSocketService) {
        webSocketService.sendSecure('fhss_pattern_switch', {
          droneId,
          newPattern: {
            id: newPattern.id,
            syncWord: newPattern.syncWord,
            frequencies: newPattern.frequencies,
            hopSequence: newPattern.hopSequence,
            dwellTime: newPattern.dwellTime
          },
          switchTime,
          timestamp: Date.now()
        });
      }
    });

    // Update internal state after switch time
    setTimeout(() => {
      droneIds.forEach(droneId => {
        const droneState = this.activeDrones.get(droneId);
        if (droneState) {
          droneState.pattern = newPattern.id;
          droneState.syncStatus = 'syncing';
        }
      });
    }, switchTime - Date.now() + 100); // Small delay to ensure switch completion
  }

  private handleFrequencyHoppingActivation(data: any): void {
    const { threatId, affectedDrones, pattern, autoSwitch } = data;
    
    if (affectedDrones && affectedDrones.length > 0) {
      const patternId = pattern || Array.from(this.availablePatterns.keys())[0];
      this.startFrequencyHopping(patternId, affectedDrones);
      
      console.log(`Frequency hopping activated for threat ${threatId}`);
    }
  }

  private handleSyncRequest(data: any): void {
    const { droneId } = data;
    
    if (this.activeDrones.has(droneId)) {
      this.initiateResync(droneId);
    }
  }

  private handlePatternUpdate(data: any): void {
    const { patternId, droneIds } = data;
    
    if (droneIds && droneIds.length > 0) {
      this.switchPattern(patternId, droneIds);
    }
  }

  private handleHopAcknowledgment(data: any): void {
    const { droneId, sequenceNumber, success } = data;
    
    const droneState = this.activeDrones.get(droneId);
    if (droneState) {
      if (success) {
        droneState.syncStatus = 'synced';
      } else {
        console.warn(`Hop acknowledgment failed for drone ${droneId}, sequence ${sequenceNumber}`);
      }
    }
  }

  private emitEvent(type: EWEvent['type'], severity: ThreatSeverity, message: string): void {
    const event: EWEvent = {
      id: `fhss-event-${Date.now()}`,
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

// Linear Feedback Shift Register for pseudo-random sequence generation
class LFSR {
  private state: number;
  private polynomial: number;

  constructor(seed: number, bits: number = 23) {
    this.state = seed & ((1 << bits) - 1); // Ensure seed fits in specified bits
    this.polynomial = LFSR_POLYNOMIALS[bits as keyof typeof LFSR_POLYNOMIALS] || LFSR_POLYNOMIALS[23];
    
    // Ensure non-zero state
    if (this.state === 0) {
      this.state = 1;
    }
  }

  next(): number {
    const feedback = this.state & 1;
    this.state >>>= 1;
    
    if (feedback) {
      this.state ^= this.polynomial;
    }
    
    return this.state;
  }
}

// Export singleton instance and hook
export const frequencyHopping = FrequencyHoppingSystem.getInstance();

export function useFrequencyHopping() {
  const system = FrequencyHoppingSystem.getInstance();
  
  return {
    startFrequencyHopping: (patternId: string, droneIds: string[]) => 
      system.startFrequencyHopping(patternId, droneIds),
    stopFrequencyHopping: () => system.stopFrequencyHopping(),
    addDroneToHopping: (droneId: string, patternId?: string) => 
      system.addDroneToHopping(droneId, patternId),
    removeDroneFromHopping: (droneId: string) => 
      system.removeDroneFromHopping(droneId),
    createHoppingPattern: (name: string, band: keyof typeof FREQUENCY_BANDS, 
                          dwellTime: number, sequenceLength: number, seed?: number) => 
      system.createHoppingPattern(name, band, dwellTime, sequenceLength, seed),
    switchPattern: (newPatternId: string, droneIds?: string[]) => 
      system.switchPattern(newPatternId, droneIds),
    getPatternPerformance: (droneId: string) => system.getPatternPerformance(droneId),
    getActivePatterns: () => system.getActivePatterns(),
    detectCollisions: () => system.detectCollisions(),
  };
}
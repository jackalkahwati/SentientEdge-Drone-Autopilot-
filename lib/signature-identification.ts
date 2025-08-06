// Electronic Attack Signature Identification System
// Advanced pattern recognition and threat signature analysis

import { 
  AttackSignature,
  RFSignalData,
  EWThreat,
  ThreatType,
  ThreatSeverity,
  SpectrumAnalysis,
  GPSSignalAnalysis,
  CommunicationHealth,
  EWEvent
} from './types';
import { webSocketService } from './websocket';

// Machine learning-style pattern recognition constants
const SIGNATURE_MATCHING = {
  FREQUENCY_TOLERANCE: 0.02,     // 2% frequency tolerance
  POWER_TOLERANCE: 5,            // 5dB power tolerance
  BANDWIDTH_TOLERANCE: 0.25,     // 25% bandwidth tolerance
  TEMPORAL_WINDOW: 60000,        // 60 second analysis window
  MIN_CONFIDENCE: 0.7,           // 70% minimum confidence
  PATTERN_HISTORY_SIZE: 1000,    // Keep last 1000 patterns
  LEARNING_RATE: 0.1             // Adaptive learning rate
};

// Known attack signature database
const KNOWN_SIGNATURES = new Map<string, AttackSignature>([
  // GPS Spoofing Signatures
  ['gps_spoofer_civilian', {
    id: 'gps_spoofer_civilian',
    name: 'Civilian GPS Spoofer',
    type: 'spoofing',
    patterns: {
      frequency: { center: 1575.42, bandwidth: 2, tolerance: 0.1 },
      power: { level: -125, variation: 3 },
      timing: { pulseWidth: 1, pulseInterval: 1, pattern: [1] },
      modulation: { type: 'BPSK', parameters: { chipRate: 1023000 } }
    },
    confidence: 0.85,
    threatLevel: 'medium',
    countermeasures: ['gps_authentication', 'multi_constellation']
  }],

  ['gps_spoofer_military', {
    id: 'gps_spoofer_military',
    name: 'Military-Grade GPS Spoofer',
    type: 'spoofing',
    patterns: {
      frequency: { center: 1575.42, bandwidth: 20, tolerance: 1.0 },
      power: { level: -120, variation: 8 },
      timing: { pulseWidth: 1, pulseInterval: 1, pattern: [1] }
    },
    confidence: 0.9,
    threatLevel: 'critical',
    countermeasures: ['advanced_gps_auth', 'ins_fallback', 'terrain_nav']
  }],

  // Communication Jamming Signatures
  ['barrage_jammer_basic', {
    id: 'barrage_jammer_basic',
    name: 'Basic Barrage Jammer',
    type: 'jamming',
    patterns: {
      frequency: { center: 915, bandwidth: 100, tolerance: 10 },
      power: { level: -50, variation: 10 },
      modulation: { type: 'NOISE', parameters: {} }
    },
    confidence: 0.8,
    threatLevel: 'high',
    countermeasures: ['frequency_hopping', 'power_increase', 'directional_antenna']
  }],

  ['sweep_jammer_advanced', {
    id: 'sweep_jammer_advanced',
    name: 'Advanced Sweep Jammer',
    type: 'jamming',
    patterns: {
      frequency: { center: 1000, bandwidth: 2000, tolerance: 100 },
      power: { level: -60, variation: 15 },
      timing: { pulseWidth: 100, pulseInterval: 1000, pattern: [100, 900, 100, 900] }
    },
    confidence: 0.75,
    threatLevel: 'high',
    countermeasures: ['frequency_hopping', 'null_steering', 'spread_spectrum']
  }],

  ['spot_jammer_precise', {
    id: 'spot_jammer_precise',
    name: 'Precision Spot Jammer',
    type: 'jamming',
    patterns: {
      frequency: { center: 915, bandwidth: 5, tolerance: 0.5 },
      power: { level: -40, variation: 3 },
      modulation: { type: 'CW', parameters: {} }
    },
    confidence: 0.9,
    threatLevel: 'medium',
    countermeasures: ['notch_filter', 'frequency_shift', 'channel_switch']
  }],

  // Cyber Attack Signatures
  ['mavlink_injection', {
    id: 'mavlink_injection',
    name: 'MAVLink Command Injection',
    type: 'cyber',
    patterns: {
      frequency: { center: 915, bandwidth: 26, tolerance: 1 },
      // Pattern would include packet structure analysis
    },
    confidence: 0.95,
    threatLevel: 'critical',
    countermeasures: ['packet_filtering', 'authentication', 'command_whitelist']
  }]
]);

// Pattern learning and adaptation
interface PatternLearning {
  signatureId: string;
  observedPatterns: Array<{
    timestamp: number;
    frequency: number;
    power: number;
    bandwidth: number;
    modulation?: string;
    confidence: number;
  }>;
  adaptedThresholds: {
    frequencyTolerance: number;
    powerTolerance: number;
    bandwidthTolerance: number;
  };
  falsePositiveRate: number;
  truePositiveRate: number;
}

export class SignatureIdentificationSystem {
  private static instance: SignatureIdentificationSystem;
  private isActive: boolean = false;
  private knownSignatures: Map<string, AttackSignature> = new Map(KNOWN_SIGNATURES);
  private patternHistory: Array<{
    timestamp: number;
    source: 'rf' | 'gps' | 'comm' | 'cyber';
    data: any;
    detectedSignatures: string[];
  }> = [];
  private learningData: Map<string, PatternLearning> = new Map();
  private detectionCallbacks: Array<(signature: AttackSignature, confidence: number) => void> = [];
  private analysisInterval: NodeJS.Timeout | null = null;
  private detectionStats: {
    totalAnalyses: number;
    signaturesDetected: number;
    falsePositives: number;
    truePositives: number;
    unknownPatterns: number;
  } = {
    totalAnalyses: 0,
    signaturesDetected: 0,
    falsePositives: 0,
    truePositives: 0,
    unknownPatterns: 0
  };

  private constructor() {
    this.initializeLearningData();
    this.setupWebSocketHandlers();
  }

  public static getInstance(): SignatureIdentificationSystem {
    if (!SignatureIdentificationSystem.instance) {
      SignatureIdentificationSystem.instance = new SignatureIdentificationSystem();
    }
    return SignatureIdentificationSystem.instance;
  }

  private setupWebSocketHandlers(): void {
    if (webSocketService) {
      // Listen for RF signal data
      webSocketService.subscribe('rf_signal_data', (data) => {
        this.analyzeRFSignature(data);
      });

      // Listen for spectrum analysis
      webSocketService.subscribe('spectrum_analysis', (data) => {
        this.analyzeSpectrumSignatures(data);
      });

      // Listen for GPS signal analysis
      webSocketService.subscribe('gps_signal_analysis', (data) => {
        this.analyzeGPSSignature(data);
      });

      // Listen for communication health data
      webSocketService.subscribe('communication_health', (data) => {
        this.analyzeCommunicationSignature(data);
      });

      // Listen for signature verification requests
      webSocketService.subscribe('verify_signature', (data) => {
        this.handleSignatureVerification(data);
      });

      // Listen for signature learning feedback
      webSocketService.subscribe('signature_feedback', (data) => {
        this.processFeedback(data);
      });
    }
  }

  public startSignatureIdentification(): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log('Signature Identification System activated');

    // Start continuous pattern analysis
    this.analysisInterval = setInterval(() => {
      this.performPatternAnalysis();
      this.updateLearningModels();
    }, 10000); // Analyze every 10 seconds

    this.emitEvent('system_alert', 'low', 'Signature Identification System activated');
  }

  public stopSignatureIdentification(): void {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    console.log('Signature Identification System deactivated');
    this.emitEvent('system_alert', 'low', 'Signature Identification System deactivated');
  }

  public addDetectionCallback(callback: (signature: AttackSignature, confidence: number) => void): () => void {
    this.detectionCallbacks.push(callback);
    return () => {
      this.detectionCallbacks = this.detectionCallbacks.filter(cb => cb !== callback);
    };
  }

  public addSignature(signature: AttackSignature): void {
    this.knownSignatures.set(signature.id, signature);
    
    // Initialize learning data for new signature
    this.learningData.set(signature.id, {
      signatureId: signature.id,
      observedPatterns: [],
      adaptedThresholds: {
        frequencyTolerance: SIGNATURE_MATCHING.FREQUENCY_TOLERANCE,
        powerTolerance: SIGNATURE_MATCHING.POWER_TOLERANCE,
        bandwidthTolerance: SIGNATURE_MATCHING.BANDWIDTH_TOLERANCE
      },
      falsePositiveRate: 0,
      truePositiveRate: 0
    });

    console.log(`Added signature: ${signature.name} (${signature.id})`);
  }

  public removeSignature(signatureId: string): boolean {
    const removed = this.knownSignatures.delete(signatureId);
    this.learningData.delete(signatureId);
    
    if (removed) {
      console.log(`Removed signature: ${signatureId}`);
    }
    
    return removed;
  }

  public getKnownSignatures(): AttackSignature[] {
    return Array.from(this.knownSignatures.values());
  }

  public getDetectionStatistics(): typeof this.detectionStats {
    return { ...this.detectionStats };
  }

  public analyzeUnknownPattern(data: any): {
    isNovel: boolean;
    similarPatterns: string[];
    confidence: number;
    recommendations: string[];
  } {
    const analysis = {
      isNovel: false,
      similarPatterns: [] as string[],
      confidence: 0,
      recommendations: [] as string[]
    };

    // Extract key features from the data
    const features = this.extractFeatures(data);
    if (!features) return analysis;

    // Compare against known signatures
    const similarities = this.calculateSimilarities(features);
    
    // Determine if this is a novel pattern
    const maxSimilarity = Math.max(...similarities.map(s => s.similarity));
    
    if (maxSimilarity < 0.6) { // Less than 60% similarity to any known pattern
      analysis.isNovel = true;
      analysis.confidence = 1 - maxSimilarity;
      analysis.recommendations = [
        'Create new signature from this pattern',
        'Increase monitoring for similar patterns',
        'Request expert analysis for classification'
      ];
    } else {
      analysis.similarPatterns = similarities
        .filter(s => s.similarity > 0.6)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3)
        .map(s => s.signatureId);
      
      analysis.confidence = maxSimilarity;
      analysis.recommendations = [
        'Consider variant of existing signature',
        'Monitor for pattern evolution',
        'Update existing signature thresholds'
      ];
    }

    return analysis;
  }

  public generateSignatureFromPattern(patternData: any, name: string, type: ThreatType): AttackSignature | null {
    const features = this.extractFeatures(patternData);
    if (!features) return null;

    const signatureId = `generated_${Date.now()}`;
    
    const signature: AttackSignature = {
      id: signatureId,
      name,
      type,
      patterns: {
        frequency: features.frequency ? {
          center: features.frequency,
          bandwidth: features.bandwidth || 10,
          tolerance: features.bandwidth ? features.bandwidth * 0.1 : 1
        } : undefined,
        power: features.power ? {
          level: features.power,
          variation: 5 // Default 5dB variation
        } : undefined,
        timing: features.timing ? {
          pulseWidth: features.timing.pulseWidth,
          pulseInterval: features.timing.pulseInterval,
          pattern: features.timing.pattern
        } : undefined,
        modulation: features.modulation ? {
          type: features.modulation,
          parameters: features.modulationParams || {}
        } : undefined
      },
      confidence: 0.7, // Start with moderate confidence
      threatLevel: 'medium', // Default threat level
      countermeasures: this.suggestCountermeasures(type)
    };

    this.addSignature(signature);
    console.log(`Generated new signature: ${name} from observed pattern`);
    
    return signature;
  }

  private analyzeRFSignature(data: RFSignalData): void {
    if (!this.isActive) return;

    this.detectionStats.totalAnalyses++;
    
    const detectedSignatures = this.matchSignatures('rf', data);
    
    this.storePatternHistory('rf', data, detectedSignatures);
    
    detectedSignatures.forEach(match => {
      this.reportSignatureDetection(match.signature, match.confidence, data);
    });
  }

  private analyzeSpectrumSignatures(data: SpectrumAnalysis): void {
    if (!this.isActive) return;

    // Analyze each signal in the spectrum
    data.signals.forEach(signal => {
      this.analyzeRFSignature(signal);
    });

    // Look for multi-signal patterns (coordinated attacks)
    const coordinatedPatterns = this.detectCoordinatedPatterns(data.signals);
    coordinatedPatterns.forEach(pattern => {
      console.log(`Detected coordinated attack pattern: ${pattern.type}`);
    });
  }

  private analyzeGPSSignature(data: GPSSignalAnalysis): void {
    if (!this.isActive) return;

    this.detectionStats.totalAnalyses++;
    
    // Convert GPS data to analyzable format
    const rfEquivalent = {
      id: `gps_${Date.now()}`,
      timestamp: data.timestamp,
      frequency: 1575.42, // GPS L1
      bandwidth: 2,
      signalStrength: data.signalStrength,
      noiseFloor: data.signalStrength - 20, // Estimate
      snr: 20, // Estimate
      classification: data.confidenceScore > 0.8 ? 'friendly' : 'unknown'
    } as RFSignalData;

    const detectedSignatures = this.matchSignatures('gps', rfEquivalent);
    
    this.storePatternHistory('gps', data, detectedSignatures);
    
    detectedSignatures.forEach(match => {
      this.reportSignatureDetection(match.signature, match.confidence, data);
    });
  }

  private analyzeCommunicationSignature(data: CommunicationHealth): void {
    if (!this.isActive) return;

    // Analyze communication patterns for attack signatures
    if (data.jamming.detected) {
      const jammingSignature = this.identifyJammingType(data);
      if (jammingSignature) {
        this.reportSignatureDetection(jammingSignature.signature, jammingSignature.confidence, data);
      }
    }

    // Look for cyber attack patterns in communication anomalies
    const cyberPatterns = this.analyzeCyberPatterns(data);
    cyberPatterns.forEach(pattern => {
      this.reportSignatureDetection(pattern.signature, pattern.confidence, data);
    });
  }

  private matchSignatures(source: string, data: any): Array<{ signature: AttackSignature; confidence: number }> {
    const matches: Array<{ signature: AttackSignature; confidence: number }> = [];
    
    this.knownSignatures.forEach((signature, id) => {
      const confidence = this.calculateSignatureMatch(signature, data);
      
      if (confidence >= SIGNATURE_MATCHING.MIN_CONFIDENCE) {
        matches.push({ signature, confidence });
        
        // Update learning data
        this.updatePatternLearning(id, data, confidence);
      }
    });

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return matches;
  }

  private calculateSignatureMatch(signature: AttackSignature, data: any): number {
    let totalScore = 0;
    let totalWeight = 0;

    // Frequency matching
    if (signature.patterns.frequency && data.frequency !== undefined) {
      const freqDiff = Math.abs(data.frequency - signature.patterns.frequency.center);
      const freqTolerance = signature.patterns.frequency.tolerance;
      
      if (freqDiff <= freqTolerance) {
        const freqScore = 1 - (freqDiff / freqTolerance);
        totalScore += freqScore * 0.3; // 30% weight
      }
      totalWeight += 0.3;
    }

    // Power matching
    if (signature.patterns.power && data.signalStrength !== undefined) {
      const powerDiff = Math.abs(data.signalStrength - signature.patterns.power.level);
      const powerTolerance = signature.patterns.power.variation;
      
      if (powerDiff <= powerTolerance) {
        const powerScore = 1 - (powerDiff / powerTolerance);
        totalScore += powerScore * 0.25; // 25% weight
      }
      totalWeight += 0.25;
    }

    // Bandwidth matching
    if (signature.patterns.frequency?.bandwidth && data.bandwidth !== undefined) {
      const bwDiff = Math.abs(data.bandwidth - signature.patterns.frequency.bandwidth);
      const bwTolerance = signature.patterns.frequency.bandwidth * SIGNATURE_MATCHING.BANDWIDTH_TOLERANCE;
      
      if (bwDiff <= bwTolerance) {
        const bwScore = 1 - (bwDiff / bwTolerance);
        totalScore += bwScore * 0.2; // 20% weight
      }
      totalWeight += 0.2;
    }

    // Modulation matching
    if (signature.patterns.modulation && data.modulation !== undefined) {
      if (data.modulation === signature.patterns.modulation.type) {
        totalScore += 0.15; // 15% weight
      }
      totalWeight += 0.15;
    }

    // Temporal pattern matching (if available)
    if (signature.patterns.timing && data.timing !== undefined) {
      const timingScore = this.matchTimingPattern(signature.patterns.timing, data.timing);
      totalScore += timingScore * 0.1; // 10% weight
      totalWeight += 0.1;
    }

    // Return normalized confidence score
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private matchTimingPattern(expectedTiming: any, observedTiming: any): number {
    // Simple timing pattern matching
    if (!expectedTiming.pattern || !observedTiming.pattern) return 0;
    
    const expectedPattern = expectedTiming.pattern;
    const observedPattern = observedTiming.pattern;
    
    if (expectedPattern.length !== observedPattern.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < expectedPattern.length; i++) {
      const tolerance = expectedPattern[i] * 0.1; // 10% tolerance
      if (Math.abs(expectedPattern[i] - observedPattern[i]) <= tolerance) {
        matches++;
      }
    }
    
    return matches / expectedPattern.length;
  }

  private identifyJammingType(health: CommunicationHealth): { signature: AttackSignature; confidence: number } | null {
    // Identify jamming signature based on communication health patterns
    const jammingType = health.jamming.type;
    const jammingStrength = health.jamming.strength || 0;
    
    let bestMatch: { signature: AttackSignature; confidence: number } | null = null;
    
    this.knownSignatures.forEach((signature) => {
      if (signature.type === 'jamming') {
        let confidence = 0.5; // Base confidence for jamming detection
        
        // Match jamming type
        if (jammingType === 'barrage' && signature.id.includes('barrage')) {
          confidence += 0.3;
        } else if (jammingType === 'spot' && signature.id.includes('spot')) {
          confidence += 0.3;
        } else if (jammingType === 'sweep' && signature.id.includes('sweep')) {
          confidence += 0.3;
        }
        
        // Factor in jamming strength
        if (jammingStrength > 0.8) {
          confidence += 0.2;
        } else if (jammingStrength > 0.5) {
          confidence += 0.1;
        }
        
        if (confidence > (bestMatch?.confidence || 0)) {
          bestMatch = { signature, confidence };
        }
      }
    });
    
    return bestMatch;
  }

  private analyzeCyberPatterns(health: CommunicationHealth): Array<{ signature: AttackSignature; confidence: number }> {
    const patterns: Array<{ signature: AttackSignature; confidence: number }> = [];
    
    // Look for patterns indicating cyber attacks
    if (health.errorRate > 0.1 && health.packetLoss > 0.2) {
      // High error rate + packet loss might indicate injection attacks
      const cyberSignatures = Array.from(this.knownSignatures.values())
        .filter(sig => sig.type === 'cyber');
      
      cyberSignatures.forEach(signature => {
        patterns.push({ signature, confidence: 0.6 });
      });
    }
    
    return patterns;
  }

  private detectCoordinatedPatterns(signals: RFSignalData[]): Array<{ type: string; signals: RFSignalData[]; confidence: number }> {
    const coordinatedPatterns: Array<{ type: string; signals: RFSignalData[]; confidence: number }> = [];
    
    // Look for multiple signals with similar characteristics (coordinated jamming)
    const groupedByFreq = new Map<number, RFSignalData[]>();
    
    signals.forEach(signal => {
      const freqGroup = Math.floor(signal.frequency / 10) * 10; // Group by 10MHz bands
      if (!groupedByFreq.has(freqGroup)) {
        groupedByFreq.set(freqGroup, []);
      }
      groupedByFreq.get(freqGroup)!.push(signal);
    });
    
    groupedByFreq.forEach((groupSignals, freq) => {
      if (groupSignals.length > 3) { // Multiple signals in same band
        const avgPower = groupSignals.reduce((sum, s) => sum + s.signalStrength, 0) / groupSignals.length;
        
        if (avgPower > -70) { // High power coordinated signals
          coordinatedPatterns.push({
            type: 'coordinated_jamming',
            signals: groupSignals,
            confidence: Math.min(0.9, groupSignals.length / 10)
          });
        }
      }
    });
    
    return coordinatedPatterns;
  }

  private extractFeatures(data: any): any {
    // Extract key features from various data types
    if (data.frequency !== undefined) {
      return {
        frequency: data.frequency,
        bandwidth: data.bandwidth,
        power: data.signalStrength,
        modulation: data.modulation,
        timing: data.timing
      };
    }
    
    if (data.linkQuality !== undefined) {
      // Communication health data
      return {
        linkQuality: data.linkQuality,
        packetLoss: data.packetLoss,
        latency: data.latency,
        jamming: data.jamming
      };
    }
    
    return null;
  }

  private calculateSimilarities(features: any): Array<{ signatureId: string; similarity: number }> {
    const similarities: Array<{ signatureId: string; similarity: number }> = [];
    
    this.knownSignatures.forEach((signature, id) => {
      const similarity = this.calculateFeatureSimilarity(features, signature);
      similarities.push({ signatureId: id, similarity });
    });
    
    return similarities;
  }

  private calculateFeatureSimilarity(features: any, signature: AttackSignature): number {
    let similarity = 0;
    let comparisons = 0;
    
    // Compare frequency features
    if (features.frequency && signature.patterns.frequency) {
      const freqSim = 1 - Math.abs(features.frequency - signature.patterns.frequency.center) / signature.patterns.frequency.center;
      similarity += Math.max(0, freqSim);
      comparisons++;
    }
    
    // Compare power features
    if (features.power && signature.patterns.power) {
      const powerSim = 1 - Math.abs(features.power - signature.patterns.power.level) / 100; // Normalize by 100dB range
      similarity += Math.max(0, powerSim);
      comparisons++;
    }
    
    // Compare bandwidth features
    if (features.bandwidth && signature.patterns.frequency?.bandwidth) {
      const bwSim = 1 - Math.abs(features.bandwidth - signature.patterns.frequency.bandwidth) / signature.patterns.frequency.bandwidth;
      similarity += Math.max(0, bwSim);
      comparisons++;
    }
    
    return comparisons > 0 ? similarity / comparisons : 0;
  }

  private suggestCountermeasures(type: ThreatType): string[] {
    const countermeasures = {
      'jamming': ['frequency_hopping', 'power_increase', 'null_steering', 'spread_spectrum'],
      'spoofing': ['signal_authentication', 'multi_constellation', 'ins_backup'],
      'interference': ['notch_filtering', 'adaptive_filtering', 'channel_switch'],
      'cyber': ['packet_filtering', 'authentication', 'encryption', 'intrusion_prevention'],
      'unknown': ['monitoring', 'analysis', 'expert_review']
    };
    
    return countermeasures[type] || countermeasures['unknown'];
  }

  private updatePatternLearning(signatureId: string, data: any, confidence: number): void {
    const learning = this.learningData.get(signatureId);
    if (!learning) return;

    // Add observed pattern
    learning.observedPatterns.push({
      timestamp: Date.now(),
      frequency: data.frequency || 0,
      power: data.signalStrength || 0,
      bandwidth: data.bandwidth || 0,
      modulation: data.modulation,
      confidence
    });

    // Keep only recent patterns
    if (learning.observedPatterns.length > SIGNATURE_MATCHING.PATTERN_HISTORY_SIZE) {
      learning.observedPatterns.shift();
    }

    // Update adaptive thresholds based on observed patterns
    this.adaptThresholds(learning);
  }

  private adaptThresholds(learning: PatternLearning): void {
    if (learning.observedPatterns.length < 10) return; // Need sufficient data

    const recentPatterns = learning.observedPatterns.slice(-50); // Last 50 patterns
    
    // Calculate standard deviations for adaptive thresholds
    const frequencies = recentPatterns.map(p => p.frequency).filter(f => f > 0);
    const powers = recentPatterns.map(p => p.power).filter(p => p !== 0);
    const bandwidths = recentPatterns.map(p => p.bandwidth).filter(b => b > 0);
    
    if (frequencies.length > 5) {
      const freqStd = this.calculateStandardDeviation(frequencies);
      learning.adaptedThresholds.frequencyTolerance = Math.max(
        SIGNATURE_MATCHING.FREQUENCY_TOLERANCE,
        freqStd * 2 // 2 standard deviations
      );
    }
    
    if (powers.length > 5) {
      const powerStd = this.calculateStandardDeviation(powers);
      learning.adaptedThresholds.powerTolerance = Math.max(
        SIGNATURE_MATCHING.POWER_TOLERANCE,
        powerStd * 2
      );
    }
    
    if (bandwidths.length > 5) {
      const bwStd = this.calculateStandardDeviation(bandwidths);
      learning.adaptedThresholds.bandwidthTolerance = Math.max(
        SIGNATURE_MATCHING.BANDWIDTH_TOLERANCE,
        bwStd / (bandwidths.reduce((sum, bw) => sum + bw, 0) / bandwidths.length) // Relative tolerance
      );
    }
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(variance);
  }

  private performPatternAnalysis(): void {
    if (!this.isActive) return;

    // Analyze recent pattern history for trends
    const recentPatterns = this.patternHistory.filter(p => 
      Date.now() - p.timestamp <= SIGNATURE_MATCHING.TEMPORAL_WINDOW
    );

    // Look for emerging patterns
    const patternCounts = new Map<string, number>();
    recentPatterns.forEach(pattern => {
      pattern.detectedSignatures.forEach(sigId => {
        patternCounts.set(sigId, (patternCounts.get(sigId) || 0) + 1);
      });
    });

    // Identify frequently occurring patterns
    patternCounts.forEach((count, sigId) => {
      if (count > 5) { // Pattern seen more than 5 times recently
        console.log(`Frequent pattern detected: ${sigId} (${count} occurrences)`);
      }
    });

    // Clean up old pattern history
    this.patternHistory = this.patternHistory.filter(p => 
      Date.now() - p.timestamp <= SIGNATURE_MATCHING.TEMPORAL_WINDOW * 10
    );
  }

  private updateLearningModels(): void {
    // Update learning models based on accumulated data
    this.learningData.forEach((learning, sigId) => {
      if (learning.observedPatterns.length > 20) {
        this.adaptThresholds(learning);
      }
    });
  }

  private storePatternHistory(source: 'rf' | 'gps' | 'comm' | 'cyber', data: any, detectedSignatures: Array<{ signature: AttackSignature; confidence: number }>): void {
    this.patternHistory.push({
      timestamp: Date.now(),
      source,
      data,
      detectedSignatures: detectedSignatures.map(d => d.signature.id)
    });
  }

  private reportSignatureDetection(signature: AttackSignature, confidence: number, sourceData: any): void {
    this.detectionStats.signaturesDetected++;
    
    console.log(`Signature detected: ${signature.name} (confidence: ${(confidence * 100).toFixed(1)}%)`);
    
    // Notify callbacks
    this.detectionCallbacks.forEach(callback => {
      try {
        callback(signature, confidence);
      } catch (error) {
        console.error('Error in signature detection callback:', error);
      }
    });

    // Send detection via WebSocket
    if (webSocketService) {
      webSocketService.sendSecure('signature_detected', {
        signature,
        confidence,
        sourceData,
        timestamp: Date.now()
      });
    }

    this.emitEvent('threat_detected', signature.threatLevel,
      `Attack signature detected: ${signature.name} (${(confidence * 100).toFixed(1)}% confidence)`);
  }

  private handleSignatureVerification(data: any): void {
    const { signatureId, isCorrect, feedback } = data;
    
    // Process verification feedback for learning
    const learning = this.learningData.get(signatureId);
    if (learning) {
      if (isCorrect) {
        learning.truePositiveRate = (learning.truePositiveRate * 0.9) + (1 * 0.1);
        this.detectionStats.truePositives++;
      } else {
        learning.falsePositiveRate = (learning.falsePositiveRate * 0.9) + (1 * 0.1);
        this.detectionStats.falsePositives++;
      }
    }
    
    console.log(`Signature verification for ${signatureId}: ${isCorrect ? 'correct' : 'incorrect'}`);
  }

  private processFeedback(data: any): void {
    const { signatureId, adjustments, notes } = data;
    
    // Apply feedback to improve signature matching
    const signature = this.knownSignatures.get(signatureId);
    if (signature && adjustments) {
      // Update signature based on feedback
      if (adjustments.frequencyTolerance) {
        if (signature.patterns.frequency) {
          signature.patterns.frequency.tolerance = adjustments.frequencyTolerance;
        }
      }
      
      if (adjustments.powerTolerance) {
        if (signature.patterns.power) {
          signature.patterns.power.variation = adjustments.powerTolerance;
        }
      }
      
      console.log(`Applied feedback to signature ${signatureId}: ${notes}`);
    }
  }

  private initializeLearningData(): void {
    // Initialize learning data for all known signatures
    this.knownSignatures.forEach((signature, id) => {
      this.learningData.set(id, {
        signatureId: id,
        observedPatterns: [],
        adaptedThresholds: {
          frequencyTolerance: SIGNATURE_MATCHING.FREQUENCY_TOLERANCE,
          powerTolerance: SIGNATURE_MATCHING.POWER_TOLERANCE,
          bandwidthTolerance: SIGNATURE_MATCHING.BANDWIDTH_TOLERANCE
        },
        falsePositiveRate: 0,
        truePositiveRate: 0
      });
    });
  }

  private emitEvent(type: EWEvent['type'], severity: ThreatSeverity, message: string): void {
    const event: EWEvent = {
      id: `signature-event-${Date.now()}`,
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
export const signatureIdentification = SignatureIdentificationSystem.getInstance();

export function useSignatureIdentification() {
  const system = SignatureIdentificationSystem.getInstance();
  
  return {
    startSignatureIdentification: () => system.startSignatureIdentification(),
    stopSignatureIdentification: () => system.stopSignatureIdentification(),
    addDetectionCallback: (callback: (signature: AttackSignature, confidence: number) => void) => 
      system.addDetectionCallback(callback),
    addSignature: (signature: AttackSignature) => system.addSignature(signature),
    removeSignature: (signatureId: string) => system.removeSignature(signatureId),
    getKnownSignatures: () => system.getKnownSignatures(),
    getDetectionStatistics: () => system.getDetectionStatistics(),
    analyzeUnknownPattern: (data: any) => system.analyzeUnknownPattern(data),
    generateSignatureFromPattern: (patternData: any, name: string, type: ThreatType) => 
      system.generateSignatureFromPattern(patternData, name, type),
  };
}
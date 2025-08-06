// Signal Analysis and RF Spectrum Monitoring System
// Military-grade RF signal analysis and spectrum surveillance

import { 
  RFSignalData, 
  SpectrumAnalysis, 
  AttackSignature,
  EWThreat,
  ThreatSeverity,
  FrequencyBand,
  EWEvent 
} from './types';
import { webSocketService } from './websocket';

// RF signal classification parameters
const SIGNAL_CLASSIFICATION = {
  FRIENDLY_SIGNATURES: new Map([
    ['mavlink', { freq: 915, bw: 26, power: [-80, -60], modulation: 'FSK' }],
    ['cyphal', { freq: 2400, bw: 80, power: [-75, -55], modulation: 'OFDM' }],
    ['gps_l1', { freq: 1575.42, bw: 2, power: [-130, -120], modulation: 'BPSK' }],
    ['cellular', { freq: 1900, bw: 200, power: [-70, -50], modulation: 'OFDMA' }]
  ]),
  
  THREAT_INDICATORS: {
    HIGH_POWER_THRESHOLD: -40, // dBm - unusually high power
    WIDE_BANDWIDTH_RATIO: 5,   // Bandwidth much wider than expected
    RAPID_FREQUENCY_CHANGE: 10, // MHz/s frequency drift rate
    SUSPICIOUS_MODULATION: ['NOISE', 'CW', 'SWEEP'],
    ANOMALOUS_DUTY_CYCLE: [0.8, 1.0] // Near 100% duty cycle (always on)
  },

  FREQUENCY_BANDS: {
    vhf: { start: 30, end: 300 },      // MHz
    uhf: { start: 300, end: 3000 },
    lband: { start: 1000, end: 2000 },
    sband: { start: 2000, end: 4000 },
    cband: { start: 4000, end: 8000 },
    xband: { start: 8000, end: 12000 },
    kuband: { start: 12000, end: 18000 }
  }
};

// Known threat signatures database
const THREAT_SIGNATURES = new Map<string, AttackSignature>([
  ['gps_spoofer_type1', {
    id: 'gps_spoofer_type1',
    name: 'GPS Spoofer Type 1',
    type: 'spoofing',
    patterns: {
      frequency: { center: 1575.42, bandwidth: 2, tolerance: 0.1 },
      power: { level: -125, variation: 5 },
      modulation: { type: 'BPSK', parameters: { chipRate: 1023000 } }
    },
    confidence: 0.85,
    threatLevel: 'high',
    countermeasures: ['gps_anti_spoof', 'ins_backup']
  }],
  
  ['comm_jammer_barrage', {
    id: 'comm_jammer_barrage',
    name: 'Barrage Communication Jammer',
    type: 'jamming',
    patterns: {
      frequency: { center: 915, bandwidth: 100, tolerance: 10 },
      power: { level: -50, variation: 10 },
      modulation: { type: 'NOISE', parameters: {} }
    },
    confidence: 0.9,
    threatLevel: 'critical',
    countermeasures: ['frequency_hopping', 'power_increase', 'backup_channel']
  }],

  ['sweep_jammer', {
    id: 'sweep_jammer',
    name: 'Frequency Sweep Jammer',
    type: 'jamming',
    patterns: {
      frequency: { center: 1000, bandwidth: 2000, tolerance: 100 },
      power: { level: -60, variation: 15 },
      timing: { pulseWidth: 1000, pulseInterval: 5000, pattern: [1000, 4000, 1000, 4000] }
    },
    confidence: 0.8,
    threatLevel: 'high',
    countermeasures: ['frequency_hopping', 'null_steering']
  }]
]);

export class SignalAnalysisSystem {
  private static instance: SignalAnalysisSystem;
  private isActive: boolean = false;
  private spectrumHistory: SpectrumAnalysis[] = [];
  private signalDatabase: Map<string, RFSignalData[]> = new Map();
  private threatSignatures: Map<string, AttackSignature> = new Map(THREAT_SIGNATURES);
  private detectedThreats: Map<string, EWThreat> = new Map();
  private analysisCallbacks: Array<(analysis: SpectrumAnalysis) => void> = [];
  private threatCallbacks: Array<(threat: EWThreat) => void> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private currentSweepParams: {
    startFreq: number;
    endFreq: number;
    stepSize: number;
    dwellTime: number;
  } = {
    startFreq: 30,    // 30 MHz
    endFreq: 6000,    // 6 GHz
    stepSize: 1,      // 1 MHz steps
    dwellTime: 10     // 10ms dwell time
  };

  private constructor() {
    this.setupWebSocketHandlers();
  }

  public static getInstance(): SignalAnalysisSystem {
    if (!SignalAnalysisSystem.instance) {
      SignalAnalysisSystem.instance = new SignalAnalysisSystem();
    }
    return SignalAnalysisSystem.instance;
  }

  private setupWebSocketHandlers(): void {
    if (webSocketService) {
      // Listen for spectrum analysis data
      webSocketService.subscribe('spectrum_sweep_data', (data) => {
        this.processSpectrumSweep(data);
      });

      // Listen for individual signal reports
      webSocketService.subscribe('rf_signal_report', (data) => {
        this.processSignalReport(data);
      });

      // Listen for direction finding data
      webSocketService.subscribe('df_bearing_data', (data) => {
        this.processDirectionFindingData(data);
      });

      // Listen for analysis requests
      webSocketService.subscribe('request_spectrum_analysis', (data) => {
        this.handleAnalysisRequest(data);
      });
    }
  }

  public startMonitoring(): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log('Signal Analysis System activated');

    // Start continuous spectrum monitoring
    this.monitoringInterval = setInterval(() => {
      this.performContinuousAnalysis();
    }, 5000); // Analyze every 5 seconds

    // Request initial spectrum sweep
    this.requestSpectrumSweep();

    this.emitEvent('system_alert', 'low', 'Signal Analysis System activated');
  }

  public stopMonitoring(): void {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Signal Analysis System deactivated');
    this.emitEvent('system_alert', 'low', 'Signal Analysis System deactivated');
  }

  public addAnalysisCallback(callback: (analysis: SpectrumAnalysis) => void): () => void {
    this.analysisCallbacks.push(callback);
    return () => {
      this.analysisCallbacks = this.analysisCallbacks.filter(cb => cb !== callback);
    };
  }

  public addThreatCallback(callback: (threat: EWThreat) => void): () => void {
    this.threatCallbacks.push(callback);
    return () => {
      this.threatCallbacks = this.threatCallbacks.filter(cb => cb !== callback);
    };
  }

  public configureSweepParameters(params: Partial<typeof this.currentSweepParams>): void {
    this.currentSweepParams = { ...this.currentSweepParams, ...params };
    console.log('Spectrum sweep parameters updated:', this.currentSweepParams);
  }

  public addThreatSignature(signature: AttackSignature): void {
    this.threatSignatures.set(signature.id, signature);
    console.log(`Added threat signature: ${signature.name}`);
  }

  public getSpectrumHistory(limit: number = 10): SpectrumAnalysis[] {
    return this.spectrumHistory.slice(-limit);
  }

  public getSignalDatabase(): Map<string, RFSignalData[]> {
    return new Map(this.signalDatabase);
  }

  public analyzeSignalPattern(signals: RFSignalData[], timeWindow: number = 60000): {
    patterns: any[];
    anomalies: string[];
    threatLevel: ThreatSeverity;
  } {
    const patterns: any[] = [];
    const anomalies: string[] = [];
    let threatLevel: ThreatSeverity = 'low';

    // Filter signals within time window
    const now = Date.now();
    const recentSignals = signals.filter(signal => 
      now - new Date(signal.timestamp).getTime() <= timeWindow
    );

    // 1. Frequency Pattern Analysis
    const freqPattern = this.analyzeFrequencyPatterns(recentSignals);
    if (freqPattern.suspicious) {
      patterns.push(freqPattern);
      anomalies.push('Suspicious frequency patterns detected');
      threatLevel = this.escalateThreatLevel(threatLevel, 'medium');
    }

    // 2. Power Level Analysis
    const powerPattern = this.analyzePowerPatterns(recentSignals);
    if (powerPattern.suspicious) {
      patterns.push(powerPattern);
      anomalies.push('Abnormal power level patterns');
      threatLevel = this.escalateThreatLevel(threatLevel, 'medium');
    }

    // 3. Temporal Pattern Analysis
    const temporalPattern = this.analyzeTemporalPatterns(recentSignals);
    if (temporalPattern.suspicious) {
      patterns.push(temporalPattern);
      anomalies.push('Suspicious temporal patterns');
      threatLevel = this.escalateThreatLevel(threatLevel, 'high');
    }

    // 4. Bandwidth Analysis
    const bandwidthPattern = this.analyzeBandwidthPatterns(recentSignals);
    if (bandwidthPattern.suspicious) {
      patterns.push(bandwidthPattern);
      anomalies.push('Abnormal bandwidth characteristics');
      threatLevel = this.escalateThreatLevel(threatLevel, 'medium');
    }

    return { patterns, anomalies, threatLevel };
  }

  private processSpectrumSweep(data: SpectrumAnalysis): void {
    if (!this.isActive) return;

    // Store spectrum data
    this.spectrumHistory.push(data);
    
    // Keep only recent history (last 100 sweeps)
    if (this.spectrumHistory.length > 100) {
      this.spectrumHistory.shift();
    }

    // Analyze spectrum for threats
    this.analyzeSpectrum(data);

    // Store individual signals in database
    data.signals.forEach(signal => {
      this.storeSignalData(signal);
    });

    // Notify callbacks
    this.analysisCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in spectrum analysis callback:', error);
      }
    });

    console.log(`Processed spectrum sweep: ${data.signals.length} signals, ` +
                `jamming: ${data.jammingDetected}, interference: ${data.interferenceDetected}`);
  }

  private processSignalReport(data: RFSignalData): void {
    if (!this.isActive) return;

    // Store signal data
    this.storeSignalData(data);

    // Analyze individual signal for threats
    const threat = this.analyzeSignalForThreats(data);
    if (threat) {
      this.reportThreat(threat);
    }
  }

  private processDirectionFindingData(data: {
    signalId: string;
    bearing: number;
    confidence: number;
    location?: [number, number];
  }): void {
    // Update signal with direction finding information
    const signalHistory = this.signalDatabase.get(data.signalId);
    if (signalHistory && signalHistory.length > 0) {
      const latestSignal = signalHistory[signalHistory.length - 1];
      if (data.location) {
        latestSignal.sourceLocation = data.location;
      }
      
      console.log(`Direction finding update for signal ${data.signalId}: ` +
                  `bearing ${data.bearing}°, confidence ${data.confidence}`);
    }
  }

  private analyzeSpectrum(spectrum: SpectrumAnalysis): void {
    // 1. Check for jamming signatures
    const jammingThreats = this.detectJammingSignatures(spectrum);
    jammingThreats.forEach(threat => this.reportThreat(threat));

    // 2. Check for spoofing signatures
    const spoofingThreats = this.detectSpoofingSignatures(spectrum);
    spoofingThreats.forEach(threat => this.reportThreat(threat));

    // 3. Analyze signal density and interference
    this.analyzeSignalDensity(spectrum);

    // 4. Detect unknown or suspicious signals
    const unknownThreats = this.detectUnknownSignatures(spectrum);
    unknownThreats.forEach(threat => this.reportThreat(threat));
  }

  private detectJammingSignatures(spectrum: SpectrumAnalysis): EWThreat[] {
    const threats: EWThreat[] = [];

    spectrum.signals.forEach(signal => {
      // Check against known jamming signatures
      this.threatSignatures.forEach((signature, id) => {
        if (signature.type === 'jamming' && this.matchesSignature(signal, signature)) {
          const threat = this.createThreatFromSignature(signal, signature);
          threats.push(threat);
        }
      });

      // Check for general jamming characteristics
      if (this.isLikelyJammer(signal)) {
        const threat = this.createGenericJammingThreat(signal);
        threats.push(threat);
      }
    });

    return threats;
  }

  private detectSpoofingSignatures(spectrum: SpectrumAnalysis): EWThreat[] {
    const threats: EWThreat[] = [];

    spectrum.signals.forEach(signal => {
      // Focus on GPS and navigation frequencies
      if (this.isNavigationFrequency(signal.frequency)) {
        // Check for spoofing characteristics
        if (this.isSpoofingSignal(signal)) {
          const threat = this.createSpoofingThreat(signal);
          threats.push(threat);
        }
      }
    });

    return threats;
  }

  private detectUnknownSignatures(spectrum: SpectrumAnalysis): EWThreat[] {
    const threats: EWThreat[] = [];

    spectrum.signals.forEach(signal => {
      // Check if signal matches any known friendly signatures
      const isFriendly = this.isFriendlySignal(signal);
      
      if (!isFriendly && this.isSuspiciousSignal(signal)) {
        const threat = this.createUnknownThreat(signal);
        threats.push(threat);
      }
    });

    return threats;
  }

  private matchesSignature(signal: RFSignalData, signature: AttackSignature): boolean {
    let matchScore = 0;
    let totalChecks = 0;

    // Check frequency match
    if (signature.patterns.frequency) {
      totalChecks++;
      const freqPattern = signature.patterns.frequency;
      const freqDiff = Math.abs(signal.frequency - freqPattern.center);
      if (freqDiff <= freqPattern.tolerance) {
        matchScore++;
      }
    }

    // Check power match
    if (signature.patterns.power) {
      totalChecks++;
      const powerPattern = signature.patterns.power;
      const powerDiff = Math.abs(signal.signalStrength - powerPattern.level);
      if (powerDiff <= powerPattern.variation) {
        matchScore++;
      }
    }

    // Check bandwidth match
    if (signature.patterns.frequency?.bandwidth) {
      totalChecks++;
      const expectedBw = signature.patterns.frequency.bandwidth;
      const bwRatio = signal.bandwidth / expectedBw;
      if (bwRatio >= 0.5 && bwRatio <= 2.0) { // Within factor of 2
        matchScore++;
      }
    }

    // Calculate match confidence
    const confidence = totalChecks > 0 ? matchScore / totalChecks : 0;
    return confidence >= 0.7; // 70% match threshold
  }

  private isLikelyJammer(signal: RFSignalData): boolean {
    // High power signal
    if (signal.signalStrength > SIGNAL_CLASSIFICATION.THREAT_INDICATORS.HIGH_POWER_THRESHOLD) {
      return true;
    }

    // Very wide bandwidth (possible barrage jammer)
    if (signal.bandwidth > 100) { // 100 MHz bandwidth
      return true;
    }

    // Low SNR with high power (noise-like)
    if (signal.snr < -5 && signal.signalStrength > -70) {
      return true;
    }

    // In communication bands with hostile classification
    if (signal.classification === 'hostile' && this.isCommunicationFrequency(signal.frequency)) {
      return true;
    }

    return false;
  }

  private isSpoofingSignal(signal: RFSignalData): boolean {
    // GPS L1 frequency with abnormal characteristics
    if (Math.abs(signal.frequency - 1575.42) < 1) {
      // GPS signals should be weak (-130 to -120 dBm)
      if (signal.signalStrength > -120) {
        return true; // Too strong for genuine GPS
      }
    }

    // Multiple signals at same frequency (possible spoofer)
    const sameFreqSignals = this.spectrumHistory
      .flatMap(s => s.signals)
      .filter(s => Math.abs(s.frequency - signal.frequency) < 0.1);
    
    if (sameFreqSignals.length > 3) {
      return true;
    }

    return false;
  }

  private isFriendlySignal(signal: RFSignalData): boolean {
    // Check against known friendly signatures
    for (const [name, friendly] of SIGNAL_CLASSIFICATION.FRIENDLY_SIGNATURES) {
      const freqMatch = Math.abs(signal.frequency - friendly.freq) < friendly.bw / 2;
      const powerMatch = signal.signalStrength >= friendly.power[0] && 
                        signal.signalStrength <= friendly.power[1];
      
      if (freqMatch && powerMatch) {
        return true;
      }
    }

    // Explicitly classified as friendly
    return signal.classification === 'friendly';
  }

  private isSuspiciousSignal(signal: RFSignalData): boolean {
    // High power in sensitive bands
    if (signal.signalStrength > -60 && this.isSensitiveFrequency(signal.frequency)) {
      return true;
    }

    // Unknown or hostile classification
    if (signal.classification === 'hostile' || signal.classification === 'unknown') {
      return true;
    }

    // Rapid frequency changes (if we have timing data)
    // This would require historical analysis

    return false;
  }

  private isNavigationFrequency(frequency: number): boolean {
    const navFreqs = [
      1575.42, // GPS L1
      1227.60, // GPS L2
      1176.45, // GPS L5, Galileo E5a
      1602.0,  // GLONASS L1
      1246.0   // GLONASS L2
    ];

    return navFreqs.some(navFreq => Math.abs(frequency - navFreq) < 5);
  }

  private isCommunicationFrequency(frequency: number): boolean {
    const commBands = [
      [902, 928],   // ISM 915
      [2400, 2485], // ISM 2.4GHz
      [5725, 5875], // ISM 5.8GHz
      [433, 434],   // 433MHz
      [1200, 1300]  // 1.2GHz video
    ];

    return commBands.some(([start, end]) => frequency >= start && frequency <= end);
  }

  private isSensitiveFrequency(frequency: number): boolean {
    return this.isNavigationFrequency(frequency) || 
           this.isCommunicationFrequency(frequency);
  }

  private analyzeSignalDensity(spectrum: SpectrumAnalysis): void {
    const freqRange = spectrum.frequencyRange[1] - spectrum.frequencyRange[0];
    const signalDensity = spectrum.signals.length / freqRange; // signals per MHz

    if (signalDensity > 1.0) { // More than 1 signal per MHz
      console.warn(`High signal density detected: ${signalDensity.toFixed(2)} signals/MHz`);
    }

    // Check for clustering in specific bands
    const bands = this.groupSignalsByBand(spectrum.signals);
    bands.forEach((signals, band) => {
      if (signals.length > 10) {
        console.warn(`Signal clustering in ${band} band: ${signals.length} signals`);
      }
    });
  }

  private groupSignalsByBand(signals: RFSignalData[]): Map<FrequencyBand, RFSignalData[]> {
    const bands = new Map<FrequencyBand, RFSignalData[]>();

    signals.forEach(signal => {
      const band = this.classifyFrequencyBand(signal.frequency);
      if (!bands.has(band)) {
        bands.set(band, []);
      }
      bands.get(band)!.push(signal);
    });

    return bands;
  }

  private classifyFrequencyBand(frequency: number): FrequencyBand {
    const bandRanges = SIGNAL_CLASSIFICATION.FREQUENCY_BANDS;
    
    for (const [band, range] of Object.entries(bandRanges)) {
      if (frequency >= range.start && frequency <= range.end) {
        return band as FrequencyBand;
      }
    }
    
    return 'uhf'; // Default band
  }

  private analyzeFrequencyPatterns(signals: RFSignalData[]): { suspicious: boolean; pattern?: any } {
    if (signals.length < 3) return { suspicious: false };

    const frequencies = signals.map(s => s.frequency).sort((a, b) => a - b);
    
    // Check for regular spacing (possible hopping pattern)
    const spacings = [];
    for (let i = 1; i < frequencies.length; i++) {
      spacings.push(frequencies[i] - frequencies[i - 1]);
    }

    const avgSpacing = spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
    const spacingVariance = spacings.reduce((sum, s) => sum + Math.pow(s - avgSpacing, 2), 0) / spacings.length;
    
    // Regular spacing might indicate coordinated frequency hopping
    if (spacingVariance < 1.0 && avgSpacing > 1.0) {
      return {
        suspicious: true,
        pattern: {
          type: 'regular_spacing',
          avgSpacing,
          variance: spacingVariance,
          signalCount: signals.length
        }
      };
    }

    return { suspicious: false };
  }

  private analyzePowerPatterns(signals: RFSignalData[]): { suspicious: boolean; pattern?: any } {
    if (signals.length < 3) return { suspicious: false };

    const powers = signals.map(s => s.signalStrength);
    const avgPower = powers.reduce((sum, p) => sum + p, 0) / powers.length;
    const maxPower = Math.max(...powers);
    
    // All signals unusually strong
    if (avgPower > -50) {
      return {
        suspicious: true,
        pattern: {
          type: 'high_power_cluster',
          avgPower,
          maxPower,
          signalCount: signals.length
        }
      };
    }

    // Large power variations (possible sweep jammer)
    const powerRange = Math.max(...powers) - Math.min(...powers);
    if (powerRange > 30) { // 30dB range
      return {
        suspicious: true,
        pattern: {
          type: 'large_power_variation',
          range: powerRange,
          avgPower,
          signalCount: signals.length
        }
      };
    }

    return { suspicious: false };
  }

  private analyzeTemporalPatterns(signals: RFSignalData[]): { suspicious: boolean; pattern?: any } {
    if (signals.length < 5) return { suspicious: false };

    // Sort by timestamp
    const sortedSignals = signals.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Check for rapid signal appearance (possible attack)
    const timeSpan = new Date(sortedSignals[sortedSignals.length - 1].timestamp).getTime() - 
                    new Date(sortedSignals[0].timestamp).getTime();
    
    if (timeSpan < 5000 && signals.length > 10) { // Many signals in < 5 seconds
      return {
        suspicious: true,
        pattern: {
          type: 'rapid_appearance',
          timeSpan,
          signalCount: signals.length,
          rate: signals.length / (timeSpan / 1000) // signals per second
        }
      };
    }

    return { suspicious: false };
  }

  private analyzeBandwidthPatterns(signals: RFSignalData[]): { suspicious: boolean; pattern?: any } {
    if (signals.length < 3) return { suspicious: false };

    const bandwidths = signals.map(s => s.bandwidth);
    const avgBandwidth = bandwidths.reduce((sum, bw) => sum + bw, 0) / bandwidths.length;
    
    // Unusually wide bandwidth signals
    if (avgBandwidth > 50) { // 50 MHz average
      return {
        suspicious: true,
        pattern: {
          type: 'wide_bandwidth',
          avgBandwidth,
          maxBandwidth: Math.max(...bandwidths),
          signalCount: signals.length
        }
      };
    }

    return { suspicious: false };
  }

  private createThreatFromSignature(signal: RFSignalData, signature: AttackSignature): EWThreat {
    return {
      id: `signature-threat-${Date.now()}`,
      type: signature.type,
      severity: signature.threatLevel,
      detectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      source: signal.sourceLocation ? {
        location: signal.sourceLocation,
        estimated: true
      } : undefined,
      affectedSystems: this.determineAffectedSystems(signal.frequency),
      characteristics: {
        frequency: signal.frequency,
        bandwidth: signal.bandwidth,
        power: signal.signalStrength,
        signature: signature.id
      },
      impact: {
        dronesAffected: [],
        communicationLoss: signature.type === 'jamming',
        navigationDegraded: signature.type === 'spoofing',
        missionCompromised: signature.threatLevel === 'critical'
      },
      confidence: signature.confidence,
      countermeasuresDeployed: []
    };
  }

  private createGenericJammingThreat(signal: RFSignalData): EWThreat {
    const severity: ThreatSeverity = signal.signalStrength > -40 ? 'critical' : 
                                   signal.signalStrength > -60 ? 'high' : 'medium';

    return {
      id: `generic-jamming-${Date.now()}`,
      type: 'jamming',
      severity,
      detectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      source: signal.sourceLocation ? {
        location: signal.sourceLocation,
        estimated: true
      } : undefined,
      affectedSystems: this.determineAffectedSystems(signal.frequency),
      characteristics: {
        frequency: signal.frequency,
        bandwidth: signal.bandwidth,
        power: signal.signalStrength,
        signature: signal.signature
      },
      impact: {
        dronesAffected: [],
        communicationLoss: true,
        navigationDegraded: false,
        missionCompromised: severity === 'critical'
      },
      confidence: 0.7,
      countermeasuresDeployed: []
    };
  }

  private createSpoofingThreat(signal: RFSignalData): EWThreat {
    return {
      id: `spoofing-threat-${Date.now()}`,
      type: 'spoofing',
      severity: 'high',
      detectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      source: signal.sourceLocation ? {
        location: signal.sourceLocation,
        estimated: true
      } : undefined,
      affectedSystems: ['gps'],
      characteristics: {
        frequency: signal.frequency,
        bandwidth: signal.bandwidth,
        power: signal.signalStrength,
        signature: signal.signature
      },
      impact: {
        dronesAffected: [],
        communicationLoss: false,
        navigationDegraded: true,
        missionCompromised: true
      },
      confidence: 0.8,
      countermeasuresDeployed: []
    };
  }

  private createUnknownThreat(signal: RFSignalData): EWThreat {
    return {
      id: `unknown-threat-${Date.now()}`,
      type: 'unknown',
      severity: 'medium',
      detectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      source: signal.sourceLocation ? {
        location: signal.sourceLocation,
        estimated: true
      } : undefined,
      affectedSystems: this.determineAffectedSystems(signal.frequency),
      characteristics: {
        frequency: signal.frequency,
        bandwidth: signal.bandwidth,
        power: signal.signalStrength,
        signature: signal.signature
      },
      impact: {
        dronesAffected: [],
        communicationLoss: false,
        navigationDegraded: false,
        missionCompromised: false
      },
      confidence: 0.6,
      countermeasuresDeployed: []
    };
  }

  private determineAffectedSystems(frequency: number): Array<'gps' | 'communication' | 'radar' | 'datalink' | 'telemetry'> {
    const affected: Array<'gps' | 'communication' | 'radar' | 'datalink' | 'telemetry'> = [];

    if (this.isNavigationFrequency(frequency)) affected.push('gps');
    if (this.isCommunicationFrequency(frequency)) affected.push('communication');
    if (frequency >= 400 && frequency <= 470) affected.push('telemetry');

    return affected.length > 0 ? affected : ['communication'];
  }

  private analyzeSignalForThreats(signal: RFSignalData): EWThreat | null {
    // Check against known threat signatures
    for (const [id, signature] of this.threatSignatures) {
      if (this.matchesSignature(signal, signature)) {
        return this.createThreatFromSignature(signal, signature);
      }
    }

    // Check for generic threat characteristics
    if (this.isLikelyJammer(signal)) {
      return this.createGenericJammingThreat(signal);
    }

    if (this.isNavigationFrequency(signal.frequency) && this.isSpoofingSignal(signal)) {
      return this.createSpoofingThreat(signal);
    }

    return null;
  }

  private storeSignalData(signal: RFSignalData): void {
    if (!this.signalDatabase.has(signal.id)) {
      this.signalDatabase.set(signal.id, []);
    }

    const history = this.signalDatabase.get(signal.id)!;
    history.push(signal);

    // Keep only recent history (last 50 reports per signal)
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  private performContinuousAnalysis(): void {
    // Request new spectrum sweep
    this.requestSpectrumSweep();

    // Analyze recent signal trends
    this.analyzeSignalTrends();

    // Clean up old data
    this.cleanupOldData();
  }

  private requestSpectrumSweep(): void {
    if (webSocketService) {
      webSocketService.send('request_spectrum_sweep', {
        startFreq: this.currentSweepParams.startFreq,
        endFreq: this.currentSweepParams.endFreq,
        stepSize: this.currentSweepParams.stepSize,
        dwellTime: this.currentSweepParams.dwellTime,
        priority: 'normal',
        timestamp: new Date().toISOString()
      });
    }
  }

  private analyzeSignalTrends(): void {
    // Analyze trends across all signals in database
    this.signalDatabase.forEach((history, signalId) => {
      if (history.length > 5) {
        const recentSignals = history.slice(-5);
        const trendAnalysis = this.analyzeSignalPattern(recentSignals, 60000);
        
        if (trendAnalysis.threatLevel !== 'low') {
          console.log(`Signal trend analysis for ${signalId}:`, {
            threatLevel: trendAnalysis.threatLevel,
            anomalies: trendAnalysis.anomalies
          });
        }
      }
    });
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    // Clean up spectrum history
    this.spectrumHistory = this.spectrumHistory.filter(spectrum => 
      now - new Date(spectrum.timestamp).getTime() <= maxAge
    );

    // Clean up signal database
    this.signalDatabase.forEach((history, signalId) => {
      const filteredHistory = history.filter(signal => 
        now - new Date(signal.timestamp).getTime() <= maxAge
      );
      
      if (filteredHistory.length === 0) {
        this.signalDatabase.delete(signalId);
      } else {
        this.signalDatabase.set(signalId, filteredHistory);
      }
    });

    // Clean up old threats
    this.detectedThreats.forEach((threat, id) => {
      const age = now - new Date(threat.detectedAt).getTime();
      if (age > maxAge) {
        this.detectedThreats.delete(id);
      }
    });
  }

  private reportThreat(threat: EWThreat): void {
    this.detectedThreats.set(threat.id, threat);
    
    // Notify threat callbacks
    this.threatCallbacks.forEach(callback => {
      try {
        callback(threat);
      } catch (error) {
        console.error('Error in signal analysis threat callback:', error);
      }
    });

    // Send threat via WebSocket
    if (webSocketService) {
      webSocketService.sendSecure('ew_threat_detected', threat);
    }

    this.emitEvent('threat_detected', threat.severity,
      `Signal analysis detected ${threat.type} threat at ${threat.characteristics.frequency}MHz`);
  }

  private handleAnalysisRequest(data: any): void {
    const { frequencyRange, priority, analysisType } = data;
    
    if (frequencyRange) {
      this.configureSweepParameters({
        startFreq: frequencyRange[0],
        endFreq: frequencyRange[1]
      });
    }

    // Perform immediate analysis if high priority
    if (priority === 'high') {
      this.requestSpectrumSweep();
    }
  }

  private escalateThreatLevel(current: ThreatSeverity, candidate: ThreatSeverity): ThreatSeverity {
    const levels = { 'low': 0, 'medium': 1, 'high': 2, 'critical': 3 };
    const currentLevel = levels[current];
    const candidateLevel = levels[candidate];
    
    return candidateLevel > currentLevel ? candidate : current;
  }

  private emitEvent(type: EWEvent['type'], severity: ThreatSeverity, message: string): void {
    const event: EWEvent = {
      id: `signal-analysis-event-${Date.now()}`,
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
export const signalAnalysis = SignalAnalysisSystem.getInstance();

export function useSignalAnalysis() {
  const system = SignalAnalysisSystem.getInstance();
  
  return {
    startMonitoring: () => system.startMonitoring(),
    stopMonitoring: () => system.stopMonitoring(),
    addAnalysisCallback: (callback: (analysis: SpectrumAnalysis) => void) => 
      system.addAnalysisCallback(callback),
    addThreatCallback: (callback: (threat: EWThreat) => void) => 
      system.addThreatCallback(callback),
    configureSweepParameters: (params: any) => system.configureSweepParameters(params),
    addThreatSignature: (signature: AttackSignature) => system.addThreatSignature(signature),
    getSpectrumHistory: (limit?: number) => system.getSpectrumHistory(limit),
    getSignalDatabase: () => system.getSignalDatabase(),
    analyzeSignalPattern: (signals: RFSignalData[], timeWindow?: number) => 
      system.analyzeSignalPattern(signals, timeWindow),
  };
}
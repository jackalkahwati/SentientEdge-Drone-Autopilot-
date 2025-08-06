// Electronic Warfare Testing and Validation System
// Comprehensive testing framework for all EW countermeasures

import { 
  EWThreat,
  ThreatSeverity,
  RFSignalData,
  GPSSignalAnalysis,
  CommunicationHealth,
  AttackSignature,
  ElectronicCountermeasure,
  EWEvent
} from './types';
import { webSocketService } from './websocket';
import { ewIntegration, useAllEWCountermeasures } from './ew-integration';

// Test scenario definitions
interface TestScenario {
  id: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'stress' | 'endurance' | 'scenario';
  duration: number; // milliseconds
  parameters: Record<string, any>;
  expectedResults: {
    threatsDetected: number;
    countermeasuresDeployed: number;
    maxResponseTime: number;
    minEffectiveness: number;
  };
}

interface TestResult {
  scenarioId: string;
  testId: string;
  timestamp: string;
  duration: number;
  success: boolean;
  metrics: {
    threatsDetected: number;
    countermeasuresDeployed: number;
    averageResponseTime: number;
    effectiveness: number;
    falsePositives: number;
    falseNegatives: number;
  };
  errors: string[];
  details: Record<string, any>;
}

// Pre-defined test scenarios
const TEST_SCENARIOS: TestScenario[] = [
  // GPS Spoofing Tests
  {
    id: 'gps_spoof_basic',
    name: 'Basic GPS Spoofing Detection',
    description: 'Test detection of civilian GPS spoofer',
    type: 'unit',
    duration: 30000, // 30 seconds
    parameters: {
      spoofFrequency: 1575.42,
      spoofPower: -125,
      targetDrones: ['drone-1']
    },
    expectedResults: {
      threatsDetected: 1,
      countermeasuresDeployed: 1,
      maxResponseTime: 5000,
      minEffectiveness: 0.8
    }
  },
  
  {
    id: 'gps_spoof_military',
    name: 'Military GPS Spoofing Attack',
    description: 'Test against sophisticated military-grade GPS spoofer',
    type: 'integration',
    duration: 60000, // 60 seconds
    parameters: {
      spoofFrequency: 1575.42,
      spoofPower: -120,
      bandwidth: 20,
      multiConstellation: true,
      targetDrones: ['drone-1', 'drone-2', 'drone-3']
    },
    expectedResults: {
      threatsDetected: 1,
      countermeasuresDeployed: 3,
      maxResponseTime: 10000,
      minEffectiveness: 0.7
    }
  },

  // Jamming Tests
  {
    id: 'barrage_jamming',
    name: 'Barrage Jamming Attack',
    description: 'Test response to wideband barrage jamming',
    type: 'integration',
    duration: 45000,
    parameters: {
      jammerFrequency: 915,
      jammerPower: -50,
      bandwidth: 100,
      targetDrones: ['drone-1', 'drone-2']
    },
    expectedResults: {
      threatsDetected: 1,
      countermeasuresDeployed: 2,
      maxResponseTime: 8000,
      minEffectiveness: 0.75
    }
  },

  {
    id: 'sweep_jamming',
    name: 'Frequency Sweep Jamming',
    description: 'Test against frequency sweeping jammer',
    type: 'integration',
    duration: 90000,
    parameters: {
      sweepStart: 800,
      sweepEnd: 1000,
      sweepRate: 10, // MHz/second
      jammerPower: -60,
      targetDrones: ['drone-1']
    },
    expectedResults: {
      threatsDetected: 1,
      countermeasuresDeployed: 2,
      maxResponseTime: 15000,
      minEffectiveness: 0.6
    }
  },

  // Multi-threat scenarios
  {
    id: 'coordinated_attack',
    name: 'Coordinated EW Attack',
    description: 'Simultaneous GPS spoofing and communication jamming',
    type: 'scenario',
    duration: 120000, // 2 minutes
    parameters: {
      gpsSpoof: { frequency: 1575.42, power: -125 },
      commJammer: { frequency: 915, power: -55, bandwidth: 50 },
      cyberAttack: { type: 'intrusion', target: 'mavlink' },
      targetDrones: ['drone-1', 'drone-2', 'drone-3']
    },
    expectedResults: {
      threatsDetected: 3,
      countermeasuresDeployed: 5,
      maxResponseTime: 20000,
      minEffectiveness: 0.65
    }
  },

  // Stress Tests
  {
    id: 'high_threat_density',
    name: 'High Threat Density Stress Test',
    description: 'Multiple simultaneous threats to test system limits',
    type: 'stress',
    duration: 180000, // 3 minutes
    parameters: {
      threatCount: 10,
      threatTypes: ['jamming', 'spoofing', 'cyber'],
      rapidSequence: true,
      targetDrones: ['drone-1', 'drone-2', 'drone-3', 'drone-4', 'drone-5']
    },
    expectedResults: {
      threatsDetected: 8, // Allow some missed in stress test
      countermeasuresDeployed: 10,
      maxResponseTime: 30000,
      minEffectiveness: 0.5
    }
  },

  // Endurance Tests
  {
    id: 'extended_operation',
    name: 'Extended Operation Test',
    description: 'Long-term operation with periodic threats',
    type: 'endurance',
    duration: 3600000, // 1 hour
    parameters: {
      threatInterval: 300000, // 5 minutes
      threatVariety: true,
      resourceMonitoring: true,
      targetDrones: ['drone-1', 'drone-2']
    },
    expectedResults: {
      threatsDetected: 10,
      countermeasuresDeployed: 12,
      maxResponseTime: 15000,
      minEffectiveness: 0.7
    }
  }
];

export class EWTestingSystem {
  private static instance: EWTestingSystem;
  private isActive: boolean = false;
  private activeTests: Map<string, {
    scenario: TestScenario;
    startTime: number;
    metrics: TestResult['metrics'];
    errors: string[];
  }> = new Map();
  private testResults: TestResult[] = [];
  private mockDataGenerators: Map<string, () => any> = new Map();
  private testCallbacks: Array<(result: TestResult) => void> = [];

  private constructor() {
    this.setupMockDataGenerators();
    this.setupWebSocketHandlers();
  }

  public static getInstance(): EWTestingSystem {
    if (!EWTestingSystem.instance) {
      EWTestingSystem.instance = new EWTestingSystem();
    }
    return EWTestingSystem.instance;
  }

  private setupWebSocketHandlers(): void {
    if (webSocketService) {
      // Listen for test execution requests
      webSocketService.subscribe('execute_ew_test', (data) => {
        this.executeTest(data.scenarioId, data.parameters);
      });

      // Listen for test suite requests
      webSocketService.subscribe('execute_ew_test_suite', (data) => {
        this.executeTestSuite(data.scenarioIds || []);
      });

      // Listen for stress test requests
      webSocketService.subscribe('execute_stress_test', (data) => {
        this.executeStressTest(data.parameters);
      });
    }
  }

  public async runAllTests(): Promise<TestResult[]> {
    console.log('Starting comprehensive EW system testing');
    
    const results: TestResult[] = [];
    
    for (const scenario of TEST_SCENARIOS) {
      try {
        console.log(`Running test: ${scenario.name}`);
        const result = await this.executeTest(scenario.id);
        results.push(result);
        
        // Wait between tests to allow system recovery
        await this.delay(5000);
        
      } catch (error) {
        console.error(`Test ${scenario.id} failed:`, error);
        results.push(this.createFailedResult(scenario, error as string));
      }
    }
    
    // Generate summary report
    this.generateTestReport(results);
    
    return results;
  }

  public async executeTest(scenarioId: string, overrideParams?: Record<string, any>): Promise<TestResult> {
    const scenario = TEST_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Test scenario not found: ${scenarioId}`);
    }

    const testId = `test_${Date.now()}`;
    const startTime = Date.now();
    
    console.log(`Executing test: ${scenario.name} (${testId})`);
    
    // Initialize test tracking
    this.activeTests.set(testId, {
      scenario,
      startTime,
      metrics: {
        threatsDetected: 0,
        countermeasuresDeployed: 0,
        averageResponseTime: 0,
        effectiveness: 0,
        falsePositives: 0,
        falseNegatives: 0
      },
      errors: []
    });

    try {
      // Start EW systems if not already running
      await this.ensureSystemsRunning();

      // Set up test monitoring
      this.setupTestMonitoring(testId);

      // Execute test scenario
      await this.runTestScenario(scenario, overrideParams || {});

      // Wait for test duration
      await this.delay(scenario.duration);

      // Collect results
      const result = await this.collectTestResults(testId, scenario);
      
      this.testResults.push(result);
      this.activeTests.delete(testId);
      
      console.log(`Test completed: ${scenario.name} - ${result.success ? 'PASSED' : 'FAILED'}`);
      
      // Notify callbacks
      this.testCallbacks.forEach(callback => {
        try {
          callback(result);
        } catch (error) {
          console.error('Error in test callback:', error);
        }
      });
      
      return result;
      
    } catch (error) {
      console.error(`Test execution failed: ${scenario.name}`, error);
      this.activeTests.delete(testId);
      throw error;
    }
  }

  public async executeTestSuite(scenarioIds: string[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    for (const scenarioId of scenarioIds) {
      try {
        const result = await this.executeTest(scenarioId);
        results.push(result);
        
        // Brief pause between tests
        await this.delay(2000);
        
      } catch (error) {
        console.error(`Test suite execution failed for ${scenarioId}:`, error);
      }
    }
    
    return results;
  }

  public async executeStressTest(parameters: any): Promise<TestResult> {
    const stressScenario = TEST_SCENARIOS.find(s => s.id === 'high_threat_density');
    if (!stressScenario) {
      throw new Error('Stress test scenario not found');
    }

    // Override parameters for custom stress test
    const customParameters = {
      ...stressScenario.parameters,
      ...parameters
    };

    return this.executeTest(stressScenario.id, customParameters);
  }

  public getTestResults(): TestResult[] {
    return [...this.testResults];
  }

  public getTestStatistics(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageResponseTime: number;
    averageEffectiveness: number;
  } {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.success).length;
    const failed = total - passed;
    
    const avgResponseTime = total > 0 ? 
      this.testResults.reduce((sum, r) => sum + r.metrics.averageResponseTime, 0) / total : 0;
    
    const avgEffectiveness = total > 0 ?
      this.testResults.reduce((sum, r) => sum + r.metrics.effectiveness, 0) / total : 0;

    return {
      totalTests: total,
      passedTests: passed,
      failedTests: failed,
      averageResponseTime: avgResponseTime,
      averageEffectiveness: avgEffectiveness
    };
  }

  public addTestCallback(callback: (result: TestResult) => void): () => void {
    this.testCallbacks.push(callback);
    return () => {
      this.testCallbacks = this.testCallbacks.filter(cb => cb !== callback);
    };
  }

  public clearTestResults(): void {
    this.testResults = [];
    console.log('Test results cleared');
  }

  private setupMockDataGenerators(): void {
    // GPS Signal Generator
    this.mockDataGenerators.set('gps_signal', () => ({
      timestamp: new Date().toISOString(),
      latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
      altitude: 100 + Math.random() * 50,
      signalStrength: -130 + Math.random() * 10,
      satelliteCount: 8 + Math.floor(Math.random() * 4),
      hdop: 1.0 + Math.random() * 2.0,
      vdop: 1.0 + Math.random() * 2.0,
      constellations: [
        { type: 'gps', satellites: 8, signalStrength: -130, accuracy: 3, lastUpdate: new Date().toISOString() }
      ],
      spoofingIndicators: {
        signalPowerAnomalies: false,
        clockBiasJumps: false,
        carrierPhaseInconsistencies: false,
        dopInconsistencies: false,
        multipleSignalSources: false
      },
      confidenceScore: 0.9
    }));

    // RF Signal Generator
    this.mockDataGenerators.set('rf_signal', () => ({
      id: `signal_${Date.now()}`,
      timestamp: new Date().toISOString(),
      frequency: 915 + Math.random() * 50,
      bandwidth: 10 + Math.random() * 40,
      signalStrength: -80 + Math.random() * 30,
      noiseFloor: -100 + Math.random() * 10,
      snr: 10 + Math.random() * 20,
      modulation: 'FSK',
      classification: 'unknown'
    }));

    // Communication Health Generator
    this.mockDataGenerators.set('comm_health', () => ({
      droneId: 'test-drone-1',
      timestamp: new Date().toISOString(),
      linkQuality: 80 + Math.random() * 20,
      signalStrength: -70 + Math.random() * 20,
      packetLoss: Math.random() * 0.05,
      latency: 50 + Math.random() * 100,
      throughput: 1000000 + Math.random() * 500000,
      errorRate: Math.random() * 0.01,
      jamming: {
        detected: false,
        type: undefined,
        strength: undefined
      },
      encryption: {
        active: true,
        algorithm: 'AES-256-GCM'
      }
    }));
  }

  private async ensureSystemsRunning(): Promise<void> {
    try {
      // Check if systems are running
      const status = ewIntegration.getSystemStatus();
      
      if (status.systemHealth.signalAnalysis === 'failed' || 
          status.systemHealth.threatDetection === 'failed') {
        console.log('Starting EW systems for testing');
        await ewIntegration.startAllSystems();
        
        // Wait for systems to fully initialize
        await this.delay(10000);
      }
    } catch (error) {
      console.error('Failed to ensure EW systems are running:', error);
      throw error;
    }
  }

  private setupTestMonitoring(testId: string): void {
    const testData = this.activeTests.get(testId);
    if (!testData) return;

    // Monitor threat detections
    const ewSystems = useAllEWCountermeasures();
    
    // Set up callbacks to track test progress
    const unsubscribeFunctions: Array<() => void> = [];

    // GPS Anti-Spoofing monitoring
    const unsubGPS = ewSystems.gpsAntiSpoofing.addDetectionCallback((threat) => {
      testData.metrics.threatsDetected++;
    });
    unsubscribeFunctions.push(unsubGPS);

    // Jamming Detection monitoring
    const unsubJamming = ewSystems.jammingDetection.addDetectionCallback((threat) => {
      testData.metrics.threatsDetected++;
    });
    unsubscribeFunctions.push(unsubJamming);

    // Countermeasure Deployment monitoring
    const unsubCountermeasures = ewSystems.countermeasureDeployment.addDeploymentCallback((event) => {
      if (event.type === 'countermeasures_deployed') {
        testData.metrics.countermeasuresDeployed += event.countermeasures.length;
      }
    });
    unsubscribeFunctions.push(unsubCountermeasures);

    // Clean up monitoring when test completes
    setTimeout(() => {
      unsubscribeFunctions.forEach(unsub => unsub());
    }, testData.scenario.duration + 5000);
  }

  private async runTestScenario(scenario: TestScenario, parameters: Record<string, any>): Promise<void> {
    const mergedParams = { ...scenario.parameters, ...parameters };

    switch (scenario.type) {
      case 'unit':
        await this.runUnitTest(scenario, mergedParams);
        break;
      case 'integration':
        await this.runIntegrationTest(scenario, mergedParams);
        break;
      case 'stress':
        await this.runStressTest(scenario, mergedParams);
        break;
      case 'endurance':
        await this.runEnduranceTest(scenario, mergedParams);
        break;
      case 'scenario':
        await this.runScenarioTest(scenario, mergedParams);
        break;
    }
  }

  private async runUnitTest(scenario: TestScenario, params: any): Promise<void> {
    // Generate and inject specific test data
    switch (scenario.id) {
      case 'gps_spoof_basic':
        await this.injectGPSSpoofingData(params);
        break;
      default:
        console.log(`Running generic unit test: ${scenario.id}`);
    }
  }

  private async runIntegrationTest(scenario: TestScenario, params: any): Promise<void> {
    // Run more complex scenarios involving multiple systems
    switch (scenario.id) {
      case 'gps_spoof_military':
        await this.injectAdvancedGPSSpoofing(params);
        break;
      case 'barrage_jamming':
        await this.injectBarrageJamming(params);
        break;
      case 'sweep_jamming':
        await this.injectSweepJamming(params);
        break;
      default:
        console.log(`Running generic integration test: ${scenario.id}`);
    }
  }

  private async runStressTest(scenario: TestScenario, params: any): Promise<void> {
    // Generate high-volume threat data
    const threatCount = params.threatCount || 10;
    const interval = scenario.duration / threatCount;

    for (let i = 0; i < threatCount; i++) {
      // Generate random threat
      await this.injectRandomThreat(params);
      
      if (i < threatCount - 1) {
        await this.delay(interval);
      }
    }
  }

  private async runEnduranceTest(scenario: TestScenario, params: any): Promise<void> {
    // Generate periodic threats over long duration
    const threatInterval = params.threatInterval || 300000; // 5 minutes
    const endTime = Date.now() + scenario.duration;

    while (Date.now() < endTime) {
      await this.injectRandomThreat(params);
      await this.delay(threatInterval);
    }
  }

  private async runScenarioTest(scenario: TestScenario, params: any): Promise<void> {
    // Run coordinated attack scenario
    if (scenario.id === 'coordinated_attack') {
      // Start with GPS spoofing
      await this.injectGPSSpoofingData(params.gpsSpoof);
      
      // Add communication jamming after 10 seconds
      setTimeout(() => {
        this.injectBarrageJamming(params.commJammer);
      }, 10000);
      
      // Add cyber attack after 20 seconds
      setTimeout(() => {
        this.injectCyberAttack(params.cyberAttack);
      }, 20000);
    }
  }

  private async injectGPSSpoofingData(params: any): Promise<void> {
    const spoofedSignal: GPSSignalAnalysis = {
      ...this.mockDataGenerators.get('gps_signal')!(),
      signalStrength: params.spoofPower || -125,
      spoofingIndicators: {
        signalPowerAnomalies: true,
        clockBiasJumps: true,
        carrierPhaseInconsistencies: false,
        dopInconsistencies: false,
        multipleSignalSources: true
      },
      confidenceScore: 0.3 // Low confidence indicates spoofing
    };

    if (webSocketService) {
      webSocketService.send('gps_signal_analysis', spoofedSignal);
    }
  }

  private async injectAdvancedGPSSpoofing(params: any): Promise<void> {
    // Inject multiple spoofed signals with varying characteristics
    for (let i = 0; i < 3; i++) {
      const spoofedSignal: GPSSignalAnalysis = {
        ...this.mockDataGenerators.get('gps_signal')!(),
        signalStrength: params.spoofPowerBase + (i * 2),
        spoofingIndicators: {
          signalPowerAnomalies: true,
          clockBiasJumps: true,
          carrierPhaseInconsistencies: true,
          dopInconsistencies: i === 0, // Only first signal has DOP issues
          multipleSignalSources: true
        },
        confidenceScore: 0.2
      };

      if (webSocketService) {
        webSocketService.send('gps_signal_analysis', spoofedSignal);
      }
      
      await this.delay(1000); // 1 second between injections
    }
  }

  private async injectBarrageJamming(params: any): Promise<void> {
    // Create high-power wideband jamming signal
    const jammingSignal: RFSignalData = {
      id: `jammer_${Date.now()}`,
      timestamp: new Date().toISOString(),
      frequency: params.jammerFrequency || 915,
      bandwidth: params.bandwidth || 100,
      signalStrength: params.jammerPower || -50,
      noiseFloor: -110,
      snr: -15, // Poor SNR indicates jamming
      modulation: 'NOISE',
      classification: 'hostile'
    };

    if (webSocketService) {
      webSocketService.send('rf_signal_data', jammingSignal);
    }

    // Also inject degraded communication health
    const degradedComm: CommunicationHealth = {
      ...this.mockDataGenerators.get('comm_health')!(),
      linkQuality: 20, // Severely degraded
      packetLoss: 0.4, // 40% packet loss
      latency: 500, // High latency
      jamming: {
        detected: true,
        type: 'barrage',
        strength: 0.8
      }
    };

    if (webSocketService) {
      webSocketService.send('communication_health', degradedComm);
    }
  }

  private async injectSweepJamming(params: any): Promise<void> {
    const sweepStart = params.sweepStart || 800;
    const sweepEnd = params.sweepEnd || 1000;
    const sweepRate = params.sweepRate || 10; // MHz/second
    const duration = (sweepEnd - sweepStart) / sweepRate * 1000; // milliseconds

    const steps = 20; // Number of sweep steps
    const stepSize = (sweepEnd - sweepStart) / steps;
    const stepDuration = duration / steps;

    for (let i = 0; i < steps; i++) {
      const frequency = sweepStart + (i * stepSize);
      
      const sweepSignal: RFSignalData = {
        id: `sweep_${Date.now()}_${i}`,
        timestamp: new Date().toISOString(),
        frequency,
        bandwidth: 5,
        signalStrength: params.jammerPower || -60,
        noiseFloor: -105,
        snr: -10,
        modulation: 'CW',
        classification: 'hostile'
      };

      if (webSocketService) {
        webSocketService.send('rf_signal_data', sweepSignal);
      }

      await this.delay(stepDuration);
    }
  }

  private async injectCyberAttack(params: any): Promise<void> {
    // Simulate cyber attack by sending malicious MAVLink messages
    if (webSocketService) {
      webSocketService.send('security_event', {
        eventType: 'unauthorized_access',
        severity: 'high',
        source: 'test_attacker',
        details: {
          attackType: params.type || 'intrusion',
          target: params.target || 'mavlink',
          timestamp: Date.now()
        }
      });
    }
  }

  private async injectRandomThreat(params: any): Promise<void> {
    const threatTypes = params.threatTypes || ['jamming', 'spoofing'];
    const randomType = threatTypes[Math.floor(Math.random() * threatTypes.length)];

    switch (randomType) {
      case 'jamming':
        await this.injectBarrageJamming({
          jammerFrequency: 900 + Math.random() * 100,
          jammerPower: -60 + Math.random() * 20,
          bandwidth: 20 + Math.random() * 60
        });
        break;
      case 'spoofing':
        await this.injectGPSSpoofingData({
          spoofPower: -130 + Math.random() * 10
        });
        break;
      case 'cyber':
        await this.injectCyberAttack({
          type: 'intrusion',
          target: 'mavlink'
        });
        break;
    }
  }

  private async collectTestResults(testId: string, scenario: TestScenario): Promise<TestResult> {
    const testData = this.activeTests.get(testId);
    if (!testData) {
      throw new Error(`Test data not found for ${testId}`);
    }

    const duration = Date.now() - testData.startTime;
    
    // Calculate effectiveness based on expected vs actual results
    const effectiveness = this.calculateTestEffectiveness(testData.metrics, scenario.expectedResults);
    
    // Determine if test passed
    const success = (
      testData.metrics.threatsDetected >= scenario.expectedResults.threatsDetected &&
      testData.metrics.countermeasuresDeployed >= scenario.expectedResults.countermeasuresDeployed &&
      testData.metrics.averageResponseTime <= scenario.expectedResults.maxResponseTime &&
      effectiveness >= scenario.expectedResults.minEffectiveness
    );

    return {
      scenarioId: scenario.id,
      testId,
      timestamp: new Date().toISOString(),
      duration,
      success,
      metrics: {
        ...testData.metrics,
        effectiveness,
        averageResponseTime: testData.metrics.averageResponseTime || duration / 2
      },
      errors: testData.errors,
      details: {
        scenario: scenario.name,
        expectedResults: scenario.expectedResults,
        parameters: scenario.parameters
      }
    };
  }

  private calculateTestEffectiveness(actual: TestResult['metrics'], expected: TestScenario['expectedResults']): number {
    let score = 0;
    let maxScore = 4;

    // Threats detected score
    if (actual.threatsDetected >= expected.threatsDetected) {
      score += 1;
    } else {
      score += actual.threatsDetected / expected.threatsDetected;
    }

    // Countermeasures deployed score
    if (actual.countermeasuresDeployed >= expected.countermeasuresDeployed) {
      score += 1;
    } else {
      score += actual.countermeasuresDeployed / expected.countermeasuresDeployed;
    }

    // Response time score (lower is better)
    if (actual.averageResponseTime <= expected.maxResponseTime) {
      score += 1;
    } else {
      score += Math.max(0, 1 - (actual.averageResponseTime - expected.maxResponseTime) / expected.maxResponseTime);
    }

    // False positive/negative score
    const errorRate = (actual.falsePositives + actual.falseNegatives) / Math.max(actual.threatsDetected, 1);
    score += Math.max(0, 1 - errorRate);

    return score / maxScore;
  }

  private createFailedResult(scenario: TestScenario, error: string): TestResult {
    return {
      scenarioId: scenario.id,
      testId: `failed_${Date.now()}`,
      timestamp: new Date().toISOString(),
      duration: 0,
      success: false,
      metrics: {
        threatsDetected: 0,
        countermeasuresDeployed: 0,
        averageResponseTime: 0,
        effectiveness: 0,
        falsePositives: 0,
        falseNegatives: 0
      },
      errors: [error],
      details: {
        scenario: scenario.name,
        expectedResults: scenario.expectedResults,
        parameters: scenario.parameters
      }
    };
  }

  private generateTestReport(results: TestResult[]): void {
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;
    const passRate = (passed / results.length) * 100;

    console.log('\n=== EW SYSTEM TEST REPORT ===');
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Pass Rate: ${passRate.toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`- ${result.details.scenario}: ${result.errors.join(', ')}`);
      });
    }

    // Send report via WebSocket
    if (webSocketService) {
      webSocketService.send('ew_test_report', {
        summary: {
          totalTests: results.length,
          passed,
          failed,
          passRate
        },
        results
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance and hook
export const ewTesting = EWTestingSystem.getInstance();

export function useEWTesting() {
  const system = EWTestingSystem.getInstance();
  
  return {
    runAllTests: () => system.runAllTests(),
    executeTest: (scenarioId: string, parameters?: Record<string, any>) => 
      system.executeTest(scenarioId, parameters),
    executeTestSuite: (scenarioIds: string[]) => system.executeTestSuite(scenarioIds),
    executeStressTest: (parameters: any) => system.executeStressTest(parameters),
    getTestResults: () => system.getTestResults(),
    getTestStatistics: () => system.getTestStatistics(),
    addTestCallback: (callback: (result: TestResult) => void) => 
      system.addTestCallback(callback),
    clearTestResults: () => system.clearTestResults(),
  };
}
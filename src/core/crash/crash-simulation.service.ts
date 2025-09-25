import { Injectable, Logger } from '@nestjs/common';

export interface CrashScenario {
  name: string;
  description: string;
  type: 'memory' | 'network' | 'file' | 'process' | 'timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-1
}

export interface CrashResult {
  scenario: string;
  crashed: boolean;
  error?: string;
  recoveryTime?: number;
  dataLost?: boolean;
}

@Injectable()
export class CrashSimulationService {
  private readonly logger = new Logger(CrashSimulationService.name);
  private readonly CRASH_SCENARIOS: CrashScenario[] = [
    {
      name: 'memory_exhaustion',
      description: 'Simulate memory exhaustion crash',
      type: 'memory',
      severity: 'critical',
      probability: 0.1
    },
    {
      name: 'network_timeout',
      description: 'Simulate network timeout crash',
      type: 'network',
      severity: 'high',
      probability: 0.3
    },
    {
      name: 'file_system_error',
      description: 'Simulate file system error crash',
      type: 'file',
      severity: 'high',
      probability: 0.2
    },
    {
      name: 'process_signal',
      description: 'Simulate process signal crash (SIGTERM, SIGKILL)',
      type: 'process',
      severity: 'critical',
      probability: 0.05
    },
    {
      name: 'infinite_loop',
      description: 'Simulate infinite loop timeout',
      type: 'timeout',
      severity: 'medium',
      probability: 0.15
    }
  ];

  /**
   * Simulate a random crash scenario
   */
  async simulateRandomCrash(): Promise<CrashResult> {
    const scenario = this.selectRandomScenario();
    this.logger.warn(`🎭 Simulating crash scenario: ${scenario.name}`);
    
    return await this.executeCrashScenario(scenario);
  }

  /**
   * Simulate specific crash scenario
   */
  async simulateCrash(scenarioName: string): Promise<CrashResult> {
    const scenario = this.CRASH_SCENARIOS.find(s => s.name === scenarioName);
    if (!scenario) {
      throw new Error(`Unknown crash scenario: ${scenarioName}`);
    }

    this.logger.warn(`🎭 Simulating specific crash: ${scenario.name}`);
    return await this.executeCrashScenario(scenario);
  }

  /**
   * Get all available crash scenarios
   */
  getAvailableScenarios(): CrashScenario[] {
    return this.CRASH_SCENARIOS;
  }

  /**
   * Select random scenario based on probability
   */
  private selectRandomScenario(): CrashScenario {
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const scenario of this.CRASH_SCENARIOS) {
      cumulativeProbability += scenario.probability;
      if (random <= cumulativeProbability) {
        return scenario;
      }
    }

    // Fallback to first scenario
    return this.CRASH_SCENARIOS[0];
  }

  /**
   * Execute crash scenario
   */
  private async executeCrashScenario(scenario: CrashScenario): Promise<CrashResult> {
    const startTime = Date.now();
    
    try {
      switch (scenario.type) {
        case 'memory':
          return await this.simulateMemoryCrash(scenario);
        case 'network':
          return await this.simulateNetworkCrash(scenario);
        case 'file':
          return await this.simulateFileCrash(scenario);
        case 'process':
          return await this.simulateProcessCrash(scenario);
        case 'timeout':
          return await this.simulateTimeoutCrash(scenario);
        default:
          throw new Error(`Unknown crash type: ${scenario.type}`);
      }
    } catch (error) {
      const recoveryTime = Date.now() - startTime;
      return {
        scenario: scenario.name,
        crashed: true,
        error: error.message,
        recoveryTime,
        dataLost: scenario.severity === 'critical'
      };
    }
  }

  /**
   * Simulate memory exhaustion crash
   */
  private async simulateMemoryCrash(scenario: CrashScenario): Promise<CrashResult> {
    this.logger.warn('💥 Simulating memory exhaustion...');
    
    // Allocate memory until crash
    const arrays: any[] = [];
    try {
      while (true) {
        arrays.push(new Array(1000000).fill('crash'));
        if (arrays.length % 100 === 0) {
          this.logger.debug(`Allocated ${arrays.length}MB of memory`);
        }
      }
    } catch (error) {
      this.logger.error('💥 Memory exhaustion crash simulated');
      return {
        scenario: scenario.name,
        crashed: true,
        error: 'Out of memory',
        dataLost: true
      };
    }
  }

  /**
   * Simulate network timeout crash
   */
  private async simulateNetworkCrash(scenario: CrashScenario): Promise<CrashResult> {
    this.logger.warn('🌐 Simulating network timeout...');
    
    // Simulate network timeout
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('Network timeout - connection lost');
  }

  /**
   * Simulate file system error crash
   */
  private async simulateFileCrash(scenario: CrashScenario): Promise<CrashResult> {
    this.logger.warn('📁 Simulating file system error...');
    
    // Simulate file system error
    throw new Error('ENOSPC: No space left on device');
  }

  /**
   * Simulate process signal crash
   */
  private async simulateProcessCrash(scenario: CrashScenario): Promise<CrashResult> {
    this.logger.warn('⚡ Simulating process signal crash...');
    
    // Simulate process crash
    process.exit(1);
  }

  /**
   * Simulate timeout crash
   */
  private async simulateTimeoutCrash(scenario: CrashScenario): Promise<CrashResult> {
    this.logger.warn('⏰ Simulating timeout crash...');
    
    // Simulate infinite loop timeout
    const startTime = Date.now();
    while (Date.now() - startTime < 5000) {
      // Busy wait
    }
    
    throw new Error('Operation timeout - process hung');
  }
}

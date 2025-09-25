import { Injectable } from '@nestjs/common';
import { CrashSimulationOptions } from '../../shared/interfaces/app.interfaces';
import { CrashType } from '../../shared/enums/app.enums';
import { AppLoggerService } from '../../shared/services/logger.service';

/**
 * Crash simulation service for testing recovery mechanisms
 */
@Injectable()
export class CrashService {
  private readonly logger = new AppLoggerService(CrashService.name);

  async simulateCrash(options: CrashSimulationOptions): Promise<void> {
    this.logger.log(`Simulating crash: ${options.type}`);

    switch (options.type) {
      case CrashType.MEMORY_EXHAUSTION:
        await this.simulateMemoryExhaustion(options.intensity || 1000);
        break;
      case CrashType.NETWORK_TIMEOUT:
        await this.simulateNetworkTimeout(options.delay || 5000);
        break;
      case CrashType.FILE_SYSTEM_ERROR:
        await this.simulateFileSystemError();
        break;
      case CrashType.PROCESS_SIGNAL:
        await this.simulateProcessSignal();
        break;
      case CrashType.INFINITE_LOOP:
        await this.simulateInfiniteLoop();
        break;
      case CrashType.RANDOM:
        await this.simulateRandomCrash();
        break;
      default:
        throw new Error(`Unknown crash type: ${options.type}`);
    }
  }

  private async simulateMemoryExhaustion(intensity: number): Promise<void> {
    this.logger.log('Simulating memory exhaustion');
    
    const arrays: any[] = [];
    try {
      for (let i = 0; i < intensity; i++) {
        arrays.push(new Array(1024 * 1024).fill('memory-exhaustion-test'));
        if (i % 100 === 0) {
          this.logger.debug(`Allocated ${i} MB of memory`);
        }
      }
    } catch (error) {
      this.logger.log('Memory exhaustion simulation completed');
      throw new Error('Memory exhaustion simulated');
    }
  }

  private async simulateNetworkTimeout(delay: number): Promise<void> {
    this.logger.log('Simulating network timeout');
    
    return new Promise((_, reject) => {
      setTimeout(() => {
        this.logger.log('Network timeout simulation completed');
        reject(new Error('Network timeout simulated'));
      }, delay);
    });
  }

  private async simulateFileSystemError(): Promise<void> {
    this.logger.log('Simulating file system error');
    
    try {
      // Try to access a non-existent file in a non-existent directory
      const fs = require('fs');
      const path = require('path');
      
      const invalidPath = path.join('/non-existent-directory', 'non-existent-file.txt');
      fs.readFileSync(invalidPath);
    } catch (error) {
      this.logger.log('File system error simulation completed');
      throw new Error('File system error simulated');
    }
  }

  private async simulateProcessSignal(): Promise<void> {
    this.logger.log('Simulating process signal');
    
    // Send SIGTERM to current process
    process.kill(process.pid, 'SIGTERM');
  }

  private async simulateInfiniteLoop(): Promise<void> {
    this.logger.log('Simulating infinite loop');
    
    // Create an infinite loop that will eventually cause issues
    let counter = 0;
    while (true) {
      counter++;
      if (counter % 1000000 === 0) {
        this.logger.debug(`Infinite loop iteration: ${counter}`);
      }
      
      if (counter > 10000000) {
        this.logger.log('Infinite loop simulation completed');
        throw new Error('Infinite loop simulated');
      }
    }
  }

  private async simulateRandomCrash(): Promise<void> {
    this.logger.log('Simulating random crash');
    
    const crashTypes = Object.values(CrashType).filter(type => type !== CrashType.RANDOM);
    const randomType = crashTypes[Math.floor(Math.random() * crashTypes.length)];
    
    this.logger.log(`Selected random crash type: ${randomType}`);
    
    await this.simulateCrash({ type: randomType });
  }

  async testCrashRecovery(): Promise<{ success: boolean; results: any[] }> {
    this.logger.log('Starting crash recovery testing');
    
    const results: any[] = [];
    const crashTypes = Object.values(CrashType);

    for (const crashType of crashTypes) {
      try {
        this.logger.log(`Testing crash recovery for: ${crashType}`);
        
        // Simulate crash
        await this.simulateCrash({ type: crashType });
        
        results.push({
          crashType,
          simulated: true,
          recovered: false,
          error: 'Crash simulation succeeded (unexpected)',
        });
      } catch (error) {
        // Expected - crash simulation should throw
        results.push({
          crashType,
          simulated: true,
          recovered: true,
          error: error.message,
        });
        
        this.logger.log(`Crash recovery test completed for: ${crashType}`);
      }
    }

    const success = results.every(r => r.simulated && r.recovered);
    
    this.logger.log(`Crash recovery testing completed: ${success ? 'SUCCESS' : 'FAILED'}`);

    return { success, results };
  }

  getAvailableCrashTypes(): string[] {
    return Object.values(CrashType);
  }

  validateCrashType(type: string): boolean {
    return Object.values(CrashType).includes(type as CrashType);
  }
}

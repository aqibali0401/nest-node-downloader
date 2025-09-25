#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CrashSimulationService } from '../core/crash/crash-simulation.service';

async function simulateCrash() {
  const scenario = process.argv[2];
  
  console.log('💥 Node Process Crash Simulation');
  console.log('================================');
  console.log('');
  
  if (!scenario) {
    console.log('Available crash scenarios:');
    console.log('==========================');
    console.log('');
    console.log('• memory_exhaustion    - Simulate memory exhaustion crash');
    console.log('• network_timeout      - Simulate network timeout crash');
    console.log('• file_system_error    - Simulate file system error crash');
    console.log('• process_signal      - Simulate process signal crash');
    console.log('• infinite_loop       - Simulate timeout crash');
    console.log('• random              - Simulate random crash scenario');
    console.log('');
    console.log('Usage: npm run crash:simulate <scenario>');
    console.log('Example: npm run crash:simulate memory_exhaustion');
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const crashService = app.get(CrashSimulationService);

  try {
    console.log(`🎭 Simulating crash scenario: ${scenario}`);
    console.log('==========================================');
    console.log('');
    
    let crashResult;
    
    if (scenario === 'random') {
      console.log('🎲 Running random crash simulation...');
      crashResult = await crashService.simulateRandomCrash();
    } else {
      console.log(`💥 Executing specific crash: ${scenario}`);
      crashResult = await crashService.simulateCrash(scenario);
    }
    
    console.log('\n📊 Crash Simulation Results:');
    console.log('=============================');
    console.log(`Scenario: ${crashResult.scenario}`);
    console.log(`Crashed: ${crashResult.crashed ? '✅ YES' : '❌ NO'}`);
    console.log(`Recovery Time: ${crashResult.recoveryTime || 0}ms`);
    console.log(`Data Lost: ${crashResult.dataLost ? '✅ YES' : '❌ NO'}`);
    
    if (crashResult.error) {
      console.log(`Error: ${crashResult.error}`);
    }
    
    console.log('\n💡 What happened:');
    console.log('==================');
    
    switch (crashResult.scenario) {
      case 'memory_exhaustion':
        console.log('🧠 Memory exhaustion occurred');
        console.log('• Process ran out of available memory');
        console.log('• Node.js garbage collector couldn\'t free enough memory');
        console.log('• Process was terminated by the OS');
        break;
      case 'network_timeout':
        console.log('🌐 Network timeout occurred');
        console.log('• Network request timed out');
        console.log('• Connection was lost or unresponsive');
        console.log('• Process hung waiting for network response');
        break;
      case 'file_system_error':
        console.log('📁 File system error occurred');
        console.log('• Disk space exhausted');
        console.log('• File system permissions denied');
        console.log('• Disk I/O error');
        break;
      case 'process_signal':
        console.log('⚡ Process signal received');
        console.log('• SIGTERM or SIGKILL signal sent to process');
        console.log('• Process was forcefully terminated');
        console.log('• No graceful shutdown possible');
        break;
      case 'infinite_loop':
        console.log('⏰ Timeout due to infinite loop');
        console.log('• Process entered infinite loop');
        console.log('• CPU usage reached 100%');
        console.log('• Process was terminated due to timeout');
        break;
      default:
        console.log('❓ Unknown crash scenario');
    }
    
    console.log('\n🔄 Recovery Recommendations:');
    console.log('============================');
    console.log('• Implement process monitoring');
    console.log('• Add automatic restart mechanisms');
    console.log('• Use process managers (PM2, systemd)');
    console.log('• Implement health checks');
    console.log('• Add circuit breakers for external dependencies');
    console.log('• Use graceful shutdown handlers');
    
  } catch (error) {
    console.error('❌ Crash simulation failed:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run if called directly
if (require.main === module) {
  simulateCrash();
}

export { simulateCrash };

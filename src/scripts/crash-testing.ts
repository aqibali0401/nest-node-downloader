#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CrashSimulationService } from '../core/crash/crash-simulation.service';
import { ProcessRecoveryService } from '../core/recovery/process-recovery.service';
import { SimpleDownloaderService } from '../modules/downloader/services/simple-downloader.service';

interface TestResult {
  testName: string;
  scenario: string;
  crashed: boolean;
  recovered: boolean;
  recoveryTime: number;
  dataLost: boolean;
  error?: string;
}

async function runCrashTests() {
  console.log('💥 Node Process Crash Testing Suite');
  console.log('====================================');
  console.log('');
  console.log('This suite tests various crash scenarios and recovery mechanisms.');
  console.log('');

  const app = await NestFactory.createApplicationContext(AppModule);
  const crashService = app.get(CrashSimulationService);
  const recoveryService = app.get(ProcessRecoveryService);
  const downloaderService = app.get(SimpleDownloaderService);

  const testResults: TestResult[] = [];

  try {
    // Test 1: Memory Exhaustion Crash
    console.log('🧪 Test 1: Memory Exhaustion Crash');
    console.log('==================================');
    await runCrashTest('memory_exhaustion', crashService, recoveryService, testResults);

    // Test 2: Network Timeout Crash
    console.log('\n🧪 Test 2: Network Timeout Crash');
    console.log('=================================');
    await runCrashTest('network_timeout', crashService, recoveryService, testResults);

    // Test 3: File System Error Crash
    console.log('\n🧪 Test 3: File System Error Crash');
    console.log('===================================');
    await runCrashTest('file_system_error', crashService, recoveryService, testResults);

    // Test 4: Process Signal Crash
    console.log('\n🧪 Test 4: Process Signal Crash');
    console.log('================================');
    await runCrashTest('process_signal', crashService, recoveryService, testResults);

    // Test 5: Timeout Crash
    console.log('\n🧪 Test 5: Timeout Crash');
    console.log('========================');
    await runCrashTest('infinite_loop', crashService, recoveryService, testResults);

    // Test 6: Random Crash Simulation
    console.log('\n🧪 Test 6: Random Crash Simulation');
    console.log('===================================');
    await runRandomCrashTest(crashService, recoveryService, testResults);

    // Test 7: Recovery Without Crash
    console.log('\n🧪 Test 7: Recovery Without Crash');
    console.log('=================================');
    await runRecoveryTest(recoveryService, testResults);

    // Display Results Summary
    displayTestResults(testResults);

  } catch (error) {
    console.error('❌ Crash testing failed:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

async function runCrashTest(
  scenarioName: string,
  crashService: CrashSimulationService,
  recoveryService: ProcessRecoveryService,
  testResults: TestResult[]
) {
  const startTime = Date.now();
  
  try {
    console.log(`🎭 Simulating crash: ${scenarioName}`);
    
    // Create process state before crash
    const processState = recoveryService.createProcessState(
      `test-${scenarioName}-${Date.now()}`,
      'crash-testing'
    );
    await recoveryService.saveProcessState(processState);
    
    // Simulate crash
    const crashResult = await crashService.simulateCrash(scenarioName);
    console.log(`💥 Crash result: ${crashResult.crashed ? 'CRASHED' : 'NO CRASH'}`);
    
    if (crashResult.crashed) {
      console.log(`⏱️ Recovery time: ${crashResult.recoveryTime}ms`);
      console.log(`📊 Data lost: ${crashResult.dataLost ? 'YES' : 'NO'}`);
      
      // Attempt recovery
      console.log('🔄 Attempting recovery...');
      const recoveryResult = await recoveryService.attemptRecovery();
      
      testResults.push({
        testName: `Crash Test: ${scenarioName}`,
        scenario: scenarioName,
        crashed: crashResult.crashed,
        recovered: recoveryResult.success,
        recoveryTime: Date.now() - startTime,
        dataLost: crashResult.dataLost,
        error: crashResult.error
      });
      
      console.log(`✅ Recovery result: ${recoveryResult.success ? 'SUCCESS' : 'FAILED'}`);
      if (recoveryResult.error) {
        console.log(`❌ Recovery error: ${recoveryResult.error}`);
      }
    } else {
      console.log('ℹ️ No crash occurred');
      testResults.push({
        testName: `Crash Test: ${scenarioName}`,
        scenario: scenarioName,
        crashed: false,
        recovered: true,
        recoveryTime: 0,
        dataLost: false
      });
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    testResults.push({
      testName: `Crash Test: ${scenarioName}`,
      scenario: scenarioName,
      crashed: true,
      recovered: false,
      recoveryTime: Date.now() - startTime,
      dataLost: true,
      error: error.message
    });
  }
}

async function runRandomCrashTest(
  crashService: CrashSimulationService,
  recoveryService: ProcessRecoveryService,
  testResults: TestResult[]
) {
  const startTime = Date.now();
  
  try {
    console.log('🎲 Running random crash simulation...');
    
    const crashResult = await crashService.simulateRandomCrash();
    console.log(`💥 Random crash: ${crashResult.crashed ? 'CRASHED' : 'NO CRASH'}`);
    
    if (crashResult.crashed) {
      console.log(`📊 Scenario: ${crashResult.scenario}`);
      console.log(`⏱️ Recovery time: ${crashResult.recoveryTime}ms`);
      
      // Attempt recovery
      const recoveryResult = await recoveryService.attemptRecovery();
      
      testResults.push({
        testName: 'Random Crash Test',
        scenario: crashResult.scenario,
        crashed: crashResult.crashed,
        recovered: recoveryResult.success,
        recoveryTime: Date.now() - startTime,
        dataLost: crashResult.dataLost,
        error: crashResult.error
      });
      
      console.log(`✅ Recovery: ${recoveryResult.success ? 'SUCCESS' : 'FAILED'}`);
    } else {
      console.log('ℹ️ No random crash occurred');
      testResults.push({
        testName: 'Random Crash Test',
        scenario: 'none',
        crashed: false,
        recovered: true,
        recoveryTime: 0,
        dataLost: false
      });
    }
    
  } catch (error) {
    console.error(`❌ Random crash test failed: ${error.message}`);
    testResults.push({
      testName: 'Random Crash Test',
      scenario: 'error',
      crashed: true,
      recovered: false,
      recoveryTime: Date.now() - startTime,
      dataLost: true,
      error: error.message
    });
  }
}

async function runRecoveryTest(
  recoveryService: ProcessRecoveryService,
  testResults: TestResult[]
) {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Testing recovery without crash...');
    
    // Create a completed process state
    const processState = recoveryService.createProcessState(
      `recovery-test-${Date.now()}`,
      'recovery-testing'
    );
    processState.status = 'completed';
    await recoveryService.saveProcessState(processState);
    
    // Attempt recovery
    const recoveryResult = await recoveryService.attemptRecovery();
    
    testResults.push({
      testName: 'Recovery Test (No Crash)',
      scenario: 'none',
      crashed: false,
      recovered: recoveryResult.success,
      recoveryTime: Date.now() - startTime,
      dataLost: false
    });
    
    console.log(`✅ Recovery test: ${recoveryResult.success ? 'SUCCESS' : 'FAILED'}`);
    
  } catch (error) {
    console.error(`❌ Recovery test failed: ${error.message}`);
    testResults.push({
      testName: 'Recovery Test (No Crash)',
      scenario: 'error',
      crashed: false,
      recovered: false,
      recoveryTime: Date.now() - startTime,
      dataLost: false,
      error: error.message
    });
  }
}

function displayTestResults(testResults: TestResult[]) {
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log('');
  
  const totalTests = testResults.length;
  const crashedTests = testResults.filter(t => t.crashed).length;
  const recoveredTests = testResults.filter(t => t.recovered).length;
  const failedTests = testResults.filter(t => !t.recovered && t.crashed).length;
  
  console.log(`📈 Total Tests: ${totalTests}`);
  console.log(`💥 Crashed Tests: ${crashedTests}`);
  console.log(`✅ Recovered Tests: ${recoveredTests}`);
  console.log(`❌ Failed Tests: ${failedTests}`);
  console.log(`📊 Recovery Rate: ${((recoveredTests / crashedTests) * 100).toFixed(1)}%`);
  console.log('');
  
  console.log('📋 Detailed Results:');
  console.log('===================');
  
  testResults.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.testName}`);
    console.log(`   Scenario: ${result.scenario}`);
    console.log(`   Crashed: ${result.crashed ? '✅' : '❌'}`);
    console.log(`   Recovered: ${result.recovered ? '✅' : '❌'}`);
    console.log(`   Recovery Time: ${result.recoveryTime}ms`);
    console.log(`   Data Lost: ${result.dataLost ? '✅' : '❌'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('\n🎯 Recommendations:');
  console.log('==================');
  
  if (failedTests > 0) {
    console.log('⚠️ Some tests failed - review error handling');
    console.log('🔧 Improve recovery mechanisms');
    console.log('📊 Add more robust state persistence');
  } else {
    console.log('✅ All tests passed - system is robust');
    console.log('🚀 Ready for production deployment');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('===============');
  console.log('• Implement automatic retry mechanisms');
  console.log('• Add process monitoring and health checks');
  console.log('• Set up alerting for critical failures');
  console.log('• Create backup and restore procedures');
}

// Run if called directly
if (require.main === module) {
  runCrashTests();
}

export { runCrashTests };

#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NetworkService } from '../core/network/network.service';

async function checkNetworkStatus() {
  console.log('🌐 IoT Device Network Status Check');
  console.log('==================================');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const networkService = app.get(NetworkService);

  try {
    console.log('\n📊 Comprehensive Network Analysis:');
    console.log('==================================');
    
    const status = await networkService.getNetworkStatus();
    
    // General connectivity
    console.log('\n🌍 General Internet Connectivity:');
    if (status.isOnline) {
      console.log(`✅ Status: ONLINE`);
      console.log(`⏱️  Latency: ${status.latency}ms`);
    } else {
      console.log(`❌ Status: OFFLINE`);
      console.log(`📡 Failed URLs: ${status.failedUrls.join(', ')}`);
    }
    console.log(`🕐 Tested: ${status.timestamp}`);
    
    // Test results summary
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Successful tests: ${status.details?.successfulTests || 0}`);
    console.log(`❌ Failed tests: ${status.details?.failedTests || 0}`);
    console.log(`📡 Tested URLs: ${status.testedUrls.join(', ')}`);
    if (status.failedUrls.length > 0) {
      console.log(`🚫 Failed URLs: ${status.failedUrls.join(', ')}`);
    }
    
    // Overall assessment
    console.log('\n📋 IoT Device Assessment:');
    console.log('========================');
    
    const isFullyOnline = status.isOnline && status.status === 'online';
    const isPartiallyOnline = status.isOnline && status.status === 'partially_online';
    
    if (isFullyOnline) {
      console.log('🟢 Device Status: FULLY ONLINE');
      console.log('✅ All network services are reachable');
      console.log('✅ Ready for software updates');
      console.log('✅ Download operations can proceed');
    } else if (isPartiallyOnline) {
      console.log('🟡 Device Status: PARTIALLY ONLINE');
      console.log('⚠️  Some network services are unreachable');
      console.log('⚠️  Download operations may fail');
      console.log('⚠️  Check network configuration');
    } else {
      console.log('🔴 Device Status: OFFLINE');
      console.log('❌ No network connectivity detected');
      console.log('❌ Cannot perform download operations');
      console.log('❌ Check network connection and try again');
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('===================');
    
    if (!status.isOnline) {
      console.log('🔧 Check network cable/WiFi connection');
      console.log('🔧 Verify router/internet gateway is working');
      console.log('🔧 Check firewall settings');
      console.log('🔧 Verify DNS configuration');
    } else if (status.status === 'partially_online') {
      console.log('🔧 Check DNS resolution');
      console.log('🔧 Verify firewall allows HTTPS traffic');
      console.log('🔧 Check proxy settings if applicable');
    } else {
      console.log('✅ Network is healthy - no action needed');
    }

  } catch (error) {
    console.error('❌ Error checking network status:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run if called directly
if (require.main === module) {
  checkNetworkStatus();
}

export { checkNetworkStatus };

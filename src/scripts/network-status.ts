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
    if (status.general.isOnline) {
      console.log(`✅ Status: ONLINE`);
      console.log(`⏱️  Latency: ${status.general.latency}ms`);
    } else {
      console.log(`❌ Status: OFFLINE`);
      console.log(`📡 Error: ${status.general.error}`);
    }
    console.log(`🕐 Tested: ${status.general.testedAt}`);
    
    // Google connectivity
    console.log('\n🔍 Google Services:');
    if (status.google.isOnline) {
      console.log(`✅ Status: REACHABLE`);
      console.log(`⏱️  Latency: ${status.google.latency}ms`);
    } else {
      console.log(`❌ Status: UNREACHABLE`);
      console.log(`📡 Error: ${status.google.error}`);
    }
    console.log(`🕐 Tested: ${status.google.testedAt}`);
    
    // Cloudflare connectivity
    console.log('\n☁️  Cloudflare Services:');
    if (status.cloudflare.isOnline) {
      console.log(`✅ Status: REACHABLE`);
      console.log(`⏱️  Latency: ${status.cloudflare.latency}ms`);
    } else {
      console.log(`❌ Status: UNREACHABLE`);
      console.log(`📡 Error: ${status.cloudflare.error}`);
    }
    console.log(`🕐 Tested: ${status.cloudflare.testedAt}`);
    
    // Overall assessment
    console.log('\n📋 IoT Device Assessment:');
    console.log('========================');
    
    const isFullyOnline = status.general.isOnline && status.google.isOnline && status.cloudflare.isOnline;
    const isPartiallyOnline = status.general.isOnline || status.google.isOnline || status.cloudflare.isOnline;
    
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
    
    if (!status.general.isOnline) {
      console.log('🔧 Check network cable/WiFi connection');
      console.log('🔧 Verify router/internet gateway is working');
      console.log('🔧 Check firewall settings');
      console.log('🔧 Verify DNS configuration');
    } else if (!status.google.isOnline || !status.cloudflare.isOnline) {
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

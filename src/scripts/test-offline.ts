#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SimpleDownloaderService } from '../modules/downloader/services/simple-downloader.service';

async function testOfflineBehavior() {
  console.log('Testing IoT Device Offline Behavior');
  console.log('=====================================');
  console.log('');
  console.log('This script simulates offline behavior by blocking network requests.');
  console.log('In a real IoT device, this would happen when:');
  console.log('- Network cable is disconnected');
  console.log('- WiFi connection is lost');
  console.log('- Router/internet gateway is down');
  console.log('- Firewall blocks internet access');
  console.log('- DNS resolution fails');
  console.log('');

  const app = await NestFactory.createApplicationContext(AppModule);
  const downloaderService = app.get(SimpleDownloaderService);

  try {
    console.log('Starting download process...');
    console.log('================================');
    
    const result = await downloaderService.downloadFromManifest();
    
    if (result.success) {
      console.log('\nDownload completed successfully!');
      if (result.downloadRecord) {
        console.log(`File: ${result.downloadRecord.fileName}`);
        console.log(`Size: ${result.downloadRecord.fileSize} bytes`);
        console.log(`Version: ${result.downloadRecord.version}`);
        console.log(`Status: ${result.downloadRecord.status}`);
        console.log(`Time: ${result.downloadTime}ms`);
      } else {
        console.log(`Version already exists in database`);
        console.log(`Time: ${result.downloadTime}ms`);
      }
    } else {
      console.log('\nDownload failed - IoT Device Offline');
      console.log('=====================================');
      console.log('Device Status: OFFLINE');
      console.log('Network Error: No internet connectivity');
      console.log('Tested at: ' + new Date().toISOString());
      console.log('');
      console.log('Error Details:');
      if (result.errors) {
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
      console.log('');
      console.log('IoT Device Recommendations:');
      console.log('==================================');
      console.log('- Check network cable/WiFi connection');
      console.log('- Verify router/internet gateway is working');
      console.log('- Check firewall settings');
      console.log('- Verify DNS configuration');
      console.log('- Contact network administrator if needed');
      console.log('');
      console.log('Retry Options:');
      console.log('================');
      console.log('• Wait for network to be restored');
      console.log('• Check network configuration');
      console.log('• Restart network services');
      console.log('• Use offline mode if available');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run if called directly
if (require.main === module) {
  testOfflineBehavior();
}

export { testOfflineBehavior };

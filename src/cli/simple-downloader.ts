#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SimpleDownloaderService } from '../modules/downloader/services/simple-downloader.service';

/**
 * Simple CLI for the Downloader
 * 
 * Usage:
 *   npm run download              - Download from manifest
 *   npm run download:clean       - Clean database and downloads
 *   npm run download:stats       - Show database statistics
 *   npm run download:debug       - Download with debug logging
 */

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const downloader = app.get(SimpleDownloaderService);

  const command = process.argv[2];

  try {
    console.log('Simple Downloader CLI');
    console.log('========================');
    console.log('');

    switch (command) {
      case 'clean':
        await downloader.cleanDatabase();
        break;

      case 'download':
      default:
        const result = await downloader.downloadFromManifest();

        if (result.success) {
          // Show mode-specific messages
          if (result.mode === 'OFFLINE') {
            console.log('\nAIO Device Status: OFFLINE MODE');
            console.log('=====================================');
            console.log('Device is running with cached resources');
            console.log(`Version: ${result.manifest.version}`);
            console.log(`Time: ${result.downloadTime}ms`);
            
            if (result.errors && result.errors.length > 0) {
              console.log('\nStatus Information:');
              result.errors.forEach(error => console.log(`  ${error}`));
            }
          } else {
            console.log('\nDownload completed successfully!');
            
            // Only display download record details if a download actually occurred
            if (result.downloadRecord) {
              console.log(`File: ${result.downloadRecord.fileName}`);
              console.log(`Size: ${result.downloadRecord.fileSize} bytes`);
              console.log(`Version: ${result.downloadRecord.version}`);
              console.log(`Status: ${result.downloadRecord.status}`);
              console.log(`Time: ${result.downloadTime}ms`);
            } else {
              // Version already exists, show different message
              console.log(`Version ${result.manifest.version} already exists in database`);
              console.log(`Time: ${result.downloadTime}ms`);
            }
            
            if (result.errors && result.errors.length > 0) {
              console.log('\nWARNINGS:');
              result.errors.forEach(error => console.log(`  - ${error}`));
            }
          }
        } else {
          console.log('\nDownload failed');
          
          // Show mode-specific error messages
          if (result.mode === 'OFFLINE') {
            console.log('AIO Device Status: OFFLINE - No internet connection');
            console.log('==================================================');
          }
          
          if (result.errors) {
            result.errors.forEach(error => console.log(`  - ${error}`));
          }
          process.exit(1);
        }
        break;
    }
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

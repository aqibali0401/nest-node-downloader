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
    console.log('🚀 Simple Downloader CLI');
    console.log('========================');
    console.log('');

    switch (command) {
      case 'clean':
        await downloader.cleanDatabase();
        break;

      case 'stats':
        await downloader.showStats();
        break;

      case 'download':
      default:
        const result = await downloader.downloadFromManifest();

        if (result.success) {
          console.log('\n🎉 Download completed successfully!');
          console.log(`📊 File: ${result.downloadRecord.fileName}`);
          console.log(`📊 Size: ${result.downloadRecord.fileSize} bytes`);
          console.log(`🏷️  Version: ${result.downloadRecord.version}`);
          console.log(`🔍 Status: ${result.downloadRecord.status}`);
          console.log(`⏱️  Time: ${result.downloadTime}ms`);
          
          if (result.errors && result.errors.length > 0) {
            console.log('\n⚠️  Some warnings:');
            result.errors.forEach(error => console.log(`  - ${error}`));
          }
        } else {
          console.log('\n❌ Download failed');
          if (result.errors) {
            result.errors.forEach(error => console.log(`  - ${error}`));
          }
          process.exit(1);
        }
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

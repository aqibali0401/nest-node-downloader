#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseService } from '../core/database/database.service';

async function viewDatabase() {
  console.log('📊 SQLite Database Viewer');
  console.log('==========================');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const databaseService = app.get(DatabaseService);

  try {
    // Initialize database
    await databaseService.initialize();

    // Get metadata
    console.log('\n📋 Database Metadata:');
    console.log('====================');
    const metadata = await databaseService.getMetadata();
    console.log(`📅 Created: ${metadata.created}`);
    console.log(`📅 Last Updated: ${metadata.lastUpdated}`);
    console.log(`📊 Total Downloads: ${metadata.totalDownloads}`);
    console.log(`🏷️  Current Version: ${metadata.currentVersion || 'None'}`);

    // Get all downloads
    console.log('\n📥 Download Records:');
    console.log('====================');
    const downloads = await databaseService.getAllDownloads();
    
    if (downloads.length === 0) {
      console.log('📭 No downloads found');
    } else {
      downloads.forEach((download, index) => {
        console.log(`\n📄 Download #${index + 1}:`);
        console.log(`   🆔 ID: ${download.id}`);
        console.log(`   🏷️  Version: ${download.version}`);
        console.log(`   📁 File: ${download.fileName}`);
        console.log(`   📊 Size: ${download.fileSize} bytes`);
        console.log(`   🔍 Status: ${download.status}`);
        console.log(`   📅 Downloaded: ${download.downloadedAt}`);
        console.log(`   🔗 Artifact: ${download.artifact}`);
        console.log(`   📝 Description: ${download.description}`);
        console.log(`   ✅ Expected Checksum: ${download.expectedChecksum}`);
        console.log(`   🔍 Actual Checksum: ${download.actualChecksum}`);
      });
    }

    // Summary by version
    console.log('\n📈 Summary by Version:');
    console.log('======================');
    const versionSummary = downloads.reduce((acc, download) => {
      if (!acc[download.version]) {
        acc[download.version] = { count: 0, statuses: {} };
      }
      acc[download.version].count++;
      acc[download.version].statuses[download.status] = (acc[download.version].statuses[download.status] || 0) + 1;
      return acc;
    }, {} as Record<string, { count: number; statuses: Record<string, number> }>);

    Object.entries(versionSummary).forEach(([version, data]) => {
      console.log(`\n🏷️  Version ${version}:`);
      console.log(`   📊 Total Downloads: ${data.count}`);
      Object.entries(data.statuses).forEach(([status, count]) => {
        console.log(`   ${status === 'verified' ? '✅' : status === 'checksum_mismatch' ? '⚠️' : '❌'} ${status}: ${count}`);
      });
    });

  } catch (error) {
    console.error('❌ Error viewing database:', error.message);
    process.exit(1);
  } finally {
    await databaseService.close();
    await app.close();
  }
}

// Run if called directly
if (require.main === module) {
  viewDatabase();
}

export { viewDatabase };

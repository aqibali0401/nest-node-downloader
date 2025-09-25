#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseService } from '../core/database/database.service';
import { readFileSync, existsSync } from 'fs';

interface LegacyDatabase {
  downloads: any[];
  metadata: {
    created: string;
    lastUpdated: string;
    totalDownloads: number;
    currentVersion: string | null;
  };
}

async function migrateToSqlite() {
  console.log('🔄 Starting migration from JSON to SQLite...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const databaseService = app.get(DatabaseService);

  try {
    // Initialize SQLite database
    console.log('📊 Initializing SQLite database...');
    await databaseService.initialize();

    // Check if legacy JSON database exists
    const legacyDbPath = './database.json';
    if (!existsSync(legacyDbPath)) {
      console.log('ℹ️  No legacy database found, skipping migration');
      return;
    }

    // Load legacy data
    console.log('📋 Loading legacy JSON database...');
    const legacyData: LegacyDatabase = JSON.parse(readFileSync(legacyDbPath, 'utf8'));
    
    console.log(`📊 Found ${legacyData.downloads.length} downloads in legacy database`);

    // Migrate downloads
    if (legacyData.downloads.length > 0) {
      console.log('📥 Migrating download records...');
      for (const download of legacyData.downloads) {
        await databaseService.addDownload(download);
      }
      console.log(`✅ Migrated ${legacyData.downloads.length} download records`);
    }

    // Update current version if exists
    if (legacyData.metadata.currentVersion) {
      console.log(`🏷️  Setting current version to: ${legacyData.metadata.currentVersion}`);
      await databaseService.updateCurrentVersion(legacyData.metadata.currentVersion);
    }

    // Show final statistics
    const metadata = await databaseService.getMetadata();
    console.log('\n📊 Migration completed successfully!');
    console.log(`📈 Total downloads: ${metadata.totalDownloads}`);
    console.log(`🏷️  Current version: ${metadata.currentVersion || 'None'}`);
    console.log(`📅 Last updated: ${metadata.lastUpdated}`);

    console.log('\n💡 You can now safely remove database.json file');
    console.log('💡 SQLite database is located at: database.sqlite');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await databaseService.close();
    await app.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToSqlite();
}

export { migrateToSqlite };

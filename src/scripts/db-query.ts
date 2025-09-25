#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DatabaseService } from '../core/database/database.service';

async function runQuery() {
  const query = process.argv[2];
  
  if (!query) {
    console.log('📊 SQLite Query Tool');
    console.log('====================');
    console.log('');
    console.log('Usage: npm run db:query "SELECT * FROM downloads"');
    console.log('');
    console.log('Available tables:');
    console.log('- downloads');
    console.log('- metadata');
    console.log('');
    console.log('Example queries:');
    console.log('- npm run db:query "SELECT * FROM downloads ORDER BY downloadedAt DESC"');
    console.log('- npm run db:query "SELECT version, COUNT(*) as count FROM downloads GROUP BY version"');
    console.log('- npm run db:query "SELECT * FROM metadata"');
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const databaseService = app.get(DatabaseService);

  try {
    await databaseService.initialize();
    
    console.log(`🔍 Running Query: ${query}`);
    console.log('==================');
    
    // Execute raw query
    const { promisify } = require('util');
    const db = (databaseService as any).db;
    const all = promisify(db.all.bind(db));
    
    const results = await all(query);
    
    if (results.length === 0) {
      console.log('📭 No results found');
    } else {
      console.log(`📊 Found ${results.length} result(s):`);
      console.log('');
      console.table(results);
    }
    
  } catch (error) {
    console.error('❌ Query Error:', error.message);
    process.exit(1);
  } finally {
    await databaseService.close();
    await app.close();
  }
}

// Run if called directly
if (require.main === module) {
  runQuery();
}

export { runQuery };

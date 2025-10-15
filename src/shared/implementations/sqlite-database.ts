/**
 * SQLite Database Implementation
 * Extends BaseDatabase for SQLite-specific operations
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseDatabase } from '../abstract/base.database';
import { DownloadRecord, DatabaseMetadata } from '../interfaces/app.interfaces';
import * as sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { APP_CONSTANTS, ENV_VARS, DB_TABLES } from '../constants/app.constants';
import { DownloadStatus } from '../enums/app.enums';

@Injectable()
export class SqliteDatabase extends BaseDatabase {
  private db: sqlite3.Database;
  private readonly runAsync: (sql: string, params?: any[]) => Promise<any>;
  private readonly getAsync: (sql: string, params?: any[]) => Promise<any>;
  private readonly allAsync: (sql: string, params?: any[]) => Promise<any[]>;

  constructor(private readonly configService: ConfigService) {
    const databaseFile = configService.get<string>(
      ENV_VARS.DATABASE_FILE, 
      APP_CONSTANTS.DATABASE_FILE
    );
    super('SqliteDatabase', databaseFile);
    
    // Promisify SQLite methods
    this.runAsync = promisify(sqlite3.Database.prototype.run.bind(this.db));
    this.getAsync = promisify(sqlite3.Database.prototype.get.bind(this.db));
    this.allAsync = promisify(sqlite3.Database.prototype.all.bind(this.db));
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.databaseFile, (err) => {
        if (err) {
          this.logger.error('Failed to connect to database:', err.message);
          reject(err);
        } else {
          this.logger.log(`Connected to SQLite database: ${this.databaseFile}`);
          this.createTables().then(() => {
            this.isInitialized = true;
            resolve();
          }).catch(reject);
        }
      });
    });
  }

  /**
   * Add download record
   */
  async addDownload(record: DownloadRecord): Promise<void> {
    try {
      const sql = `
        INSERT INTO ${DB_TABLES.DOWNLOADS} (
          id, version, artifact, expected_checksum, actual_checksum,
          file_path, file_name, file_size, downloaded_at, status, description, type, platform
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        record.id,
        record.version,
        record.artifact,
        record.expectedChecksum,
        record.actualChecksum,
        record.filePath,
        record.fileName,
        record.fileSize,
        record.downloadedAt,
        record.status,
        record.description,
        record.type || null,
        record.platform || null
      ];
      
      await this.runAsync(sql, params);
      this.logger.log(`Download record added: ${record.id}`);
    } catch (error) {
      this.logger.error(`Failed to add download record: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get database metadata
   */
  async getMetadata(): Promise<DatabaseMetadata> {
    try {
      // Get total downloads count
      const countResult = await this.getAsync(`SELECT COUNT(*) as count FROM ${DB_TABLES.DOWNLOADS}`);
      const totalDownloads = countResult?.count || 0;
      
      // Get current version
      const versionResult = await this.getAsync(`SELECT value FROM ${DB_TABLES.METADATA} WHERE key = 'current_version'`);
      const currentVersion = versionResult?.value || null;
      
      // Get database version
      const dbVersionResult = await this.getAsync(`SELECT value FROM ${DB_TABLES.METADATA} WHERE key = 'database_version'`);
      const databaseVersion = dbVersionResult?.value || '1.0.0';
      
      // Get creation and last update times
      const createdResult = await this.getAsync(`SELECT value FROM ${DB_TABLES.METADATA} WHERE key = 'created'`);
      const lastUpdatedResult = await this.getAsync(`SELECT value FROM ${DB_TABLES.METADATA} WHERE key = 'last_updated'`);
      
      return {
        created: createdResult?.value || new Date().toISOString(),
        lastUpdated: lastUpdatedResult?.value || new Date().toISOString(),
        totalDownloads,
        currentVersion,
        databaseVersion
      };
    } catch (error) {
      this.logger.error(`Failed to get metadata: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update current version
   */
  async updateCurrentVersion(version: string): Promise<void> {
    try {
      const sql = `
        INSERT OR REPLACE INTO ${DB_TABLES.METADATA} (key, value, updated_at)
        VALUES ('current_version', ?, datetime('now'))
      `;
      
      await this.runAsync(sql, [version]);
      this.logger.log(`Current version updated to: ${version}`);
    } catch (error) {
      this.logger.error(`Failed to update current version: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Clean all downloads
   */
  async cleanAllDownloads(): Promise<void> {
    try {
      await this.runAsync(`DELETE FROM ${DB_TABLES.DOWNLOADS}`);
      await this.runAsync(`DELETE FROM ${DB_TABLES.METADATA} WHERE key = 'current_version'`);
      this.logger.log('All downloads cleaned from database');
    } catch (error) {
      this.logger.error(`Failed to clean downloads: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    try {
      // Create downloads table
      const createDownloadsTable = `
        CREATE TABLE IF NOT EXISTS ${DB_TABLES.DOWNLOADS} (
          id TEXT PRIMARY KEY,
          version TEXT NOT NULL,
          artifact TEXT NOT NULL,
          expected_checksum TEXT NOT NULL,
          actual_checksum TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          downloaded_at TEXT NOT NULL,
          status TEXT NOT NULL,
          description TEXT,
          type TEXT,
          platform TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Create metadata table
      const createMetadataTable = `
        CREATE TABLE IF NOT EXISTS ${DB_TABLES.METADATA} (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await this.runAsync(createDownloadsTable);
      await this.runAsync(createMetadataTable);
      
      // Insert initial metadata
      await this.runAsync(`
        INSERT OR IGNORE INTO ${DB_TABLES.METADATA} (key, value)
        VALUES ('database_version', '1.0.0'), ('created', datetime('now'))
      `);
      
      this.logger.log('Database tables created successfully');
    } catch (error) {
      this.logger.error(`Failed to create tables: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Initialize the database
   */
  protected async onInitialize(): Promise<void> {
    this.logger.log('SQLite Database initializing...');
    // Database initialization is handled in the initialize() method
  }

  /**
   * Shutdown the database
   */
  protected async onShutdown(): Promise<void> {
    this.logger.log('SQLite Database shutting down...');
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            this.logger.error(`Error closing database: ${err.message}`);
          } else {
            this.logger.log('Database connection closed');
          }
          this.isInitialized = false;
          resolve();
        });
      });
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sqlite3 from 'sqlite3';
import { promisify } from 'util';

export interface DownloadRecord {
  id: string;
  version: string;
  artifact: string;
  expectedChecksum: string;
  actualChecksum: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  downloadedAt: string;
  status: 'verified' | 'checksum_mismatch' | 'failed';
  description: string;
}

export interface DatabaseMetadata {
  created: string;
  lastUpdated: string;
  totalDownloads: number;
  currentVersion: string | null;
}

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private db: sqlite3.Database;
  private readonly DATABASE_FILE: string;

  constructor(private readonly configService: ConfigService) {
    this.DATABASE_FILE = this.configService.get<string>('DATABASE_FILE', './database.sqlite');
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.DATABASE_FILE, (err) => {
        if (err) {
          this.logger.error('Failed to connect to database:', err.message);
          reject(err);
        } else {
          this.logger.log(`Connected to SQLite database: ${this.DATABASE_FILE}`);
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));

    try {
      // Create downloads table
      await run(`
        CREATE TABLE IF NOT EXISTS downloads (
          id TEXT PRIMARY KEY,
          version TEXT NOT NULL,
          artifact TEXT NOT NULL,
          expectedChecksum TEXT NOT NULL,
          actualChecksum TEXT NOT NULL,
          filePath TEXT NOT NULL,
          fileName TEXT NOT NULL,
          fileSize INTEGER NOT NULL,
          downloadedAt TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('verified', 'checksum_mismatch', 'failed')),
          description TEXT
        )
      `);

      // Create metadata table
      await run(`
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // Initialize metadata if not exists
      const get = promisify(this.db.get.bind(this.db));
      const existingMetadata = await get('SELECT COUNT(*) as count FROM metadata');
      
      if (existingMetadata.count === 0) {
        const now = new Date().toISOString();
        await run(`INSERT INTO metadata (key, value) VALUES ('created', ?)`, [now]);
        await run(`INSERT INTO metadata (key, value) VALUES ('lastUpdated', ?)`, [now]);
        await run(`INSERT INTO metadata (key, value) VALUES ('totalDownloads', '0')`);
        await run(`INSERT INTO metadata (key, value) VALUES ('currentVersion', '')`);
      }

      this.logger.log('Database tables created/verified successfully');
    } catch (error) {
      this.logger.error('Error creating tables:', error.message);
      throw error;
    }
  }

  /**
   * Get all downloads
   */
  async getAllDownloads(): Promise<DownloadRecord[]> {
    const all = promisify(this.db.all.bind(this.db));
    try {
      const rows = await all('SELECT * FROM downloads ORDER BY downloadedAt DESC');
      return rows as DownloadRecord[];
    } catch (error) {
      this.logger.error('Error getting all downloads:', error.message);
      throw error;
    }
  }

  /**
   * Get latest download
   */
  async getLatestDownload(): Promise<DownloadRecord | null> {
    const get = promisify(this.db.get.bind(this.db));
    try {
      const row = await get('SELECT * FROM downloads ORDER BY downloadedAt DESC LIMIT 1');
      return row as DownloadRecord | null;
    } catch (error) {
      this.logger.error('Error getting latest download:', error.message);
      throw error;
    }
  }

  /**
   * Get downloads by version
   */
  async getDownloadsByVersion(version: string): Promise<DownloadRecord[]> {
    const all = promisify(this.db.all.bind(this.db));
    try {
      const rows = await all('SELECT * FROM downloads WHERE version = ? ORDER BY downloadedAt DESC', [version]);
      return rows as DownloadRecord[];
    } catch (error) {
      this.logger.error('Error getting downloads by version:', error.message);
      throw error;
    }
  }

  /**
   * Add new download record
   */
  async addDownload(download: DownloadRecord): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run(`
        INSERT INTO downloads (
          id, version, artifact, expectedChecksum, actualChecksum,
          filePath, fileName, fileSize, downloadedAt, status, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        download.id, download.version, download.artifact, download.expectedChecksum,
        download.actualChecksum, download.filePath, download.fileName, download.fileSize,
        download.downloadedAt, download.status, download.description
      ]);

      // Update metadata
      await this.updateMetadata();
      this.logger.log(`Download record added: ${download.fileName}`);
    } catch (error) {
      this.logger.error('Error adding download:', error.message);
      throw error;
    }
  }

  /**
   * Get database metadata
   */
  async getMetadata(): Promise<DatabaseMetadata> {
    const all = promisify(this.db.all.bind(this.db));
    try {
      const rows = await all('SELECT key, value FROM metadata');
      const metadata: any = {};
      
      rows.forEach((row: any) => {
        metadata[row.key] = row.value;
      });

      // Get total downloads count
      const get = promisify(this.db.get.bind(this.db));
      const countResult = await get('SELECT COUNT(*) as totalDownloads FROM downloads');
      metadata.totalDownloads = countResult.totalDownloads;

      return {
        created: metadata.created || new Date().toISOString(),
        lastUpdated: metadata.lastUpdated || new Date().toISOString(),
        totalDownloads: metadata.totalDownloads || 0,
        currentVersion: metadata.currentVersion === '' ? null : metadata.currentVersion
      };
    } catch (error) {
      this.logger.error('Error getting metadata:', error.message);
      throw error;
    }
  }

  /**
   * Update current version in metadata
   */
  async updateCurrentVersion(version: string): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run('UPDATE metadata SET value = ? WHERE key = ?', [version, 'currentVersion']);
      await run('UPDATE metadata SET value = ? WHERE key = ?', [new Date().toISOString(), 'lastUpdated']);
      this.logger.log(`Current version updated to: ${version}`);
    } catch (error) {
      this.logger.error('Error updating current version:', error.message);
      throw error;
    }
  }

  /**
   * Update metadata (total downloads, last updated)
   */
  private async updateMetadata(): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run('UPDATE metadata SET value = ? WHERE key = ?', [new Date().toISOString(), 'lastUpdated']);
    } catch (error) {
      this.logger.error('Error updating metadata:', error.message);
      throw error;
    }
  }

  /**
   * Clean all downloads
   */
  async cleanAllDownloads(): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));
    try {
      await run('DELETE FROM downloads');
      await run('UPDATE metadata SET value = ? WHERE key = ?', ['0', 'totalDownloads']);
      await run('UPDATE metadata SET value = ? WHERE key = ?', ['', 'currentVersion']);
      await run('UPDATE metadata SET value = ? WHERE key = ?', [new Date().toISOString(), 'lastUpdated']);
      this.logger.log('All downloads cleaned from database');
    } catch (error) {
      this.logger.error('Error cleaning downloads:', error.message);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            this.logger.error('Error closing database:', err.message);
            reject(err);
          } else {
            this.logger.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

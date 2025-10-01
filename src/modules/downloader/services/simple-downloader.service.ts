import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, createReadStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { DatabaseService } from '../../../core/database/database.service';
import { NetworkService } from '../../../core/network/network.service';
import { IoTUpdateService } from '../../../core/iot-update/iot-update.service';
import { DownloadRecord, DatabaseMetadata, ConnectivityResult } from '../../../shared/interfaces/app.interfaces';

export interface Manifest {
  version: string;
  artifact: string;
  checksum: string;
  description: string;
  lastUpdated: string;
  size: number;
  format: string;
  targetApp?: string;
  targetPath?: string;
}

// DownloadRecord and DatabaseMetadata are now imported from DatabaseService

@Injectable()
export class SimpleDownloaderService {
  private readonly logger = new Logger(SimpleDownloaderService.name);
  private readonly MAX_REDIRECTS = 10;
  private readonly DEBUG = process.env.DEBUG === 'true';
  private readonly MANIFEST_FILE: string;
  private readonly DOWNLOADS_DIR: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly networkService: NetworkService,
    private readonly iotUpdateService: IoTUpdateService
  ) {
    this.MANIFEST_FILE = this.configService.get<string>('MANIFEST_FILE', './manifest.json');
    this.DOWNLOADS_DIR = this.configService.get<string>('DOWNLOAD_DIR', './downloads');
    this.ensureDirectories();
  }

  /**
   * Main method to process manifest and download artifact
   */
  async downloadFromManifest(): Promise<{
    success: boolean;
    manifest: Manifest;
    downloadRecord: DownloadRecord;
    totalSize: number;
    downloadTime: number;
    errors?: string[];
    mode?: 'ONLINE' | 'OFFLINE' | 'LIMITED';
  }> {
    const startTime = Date.now();
    const errors: string[] = [];

    this.logger.log('AIO Device Downloader');
    this.logger.log('=========================');

    try {
      // Initialize database first (always available)
      await this.databaseService.initialize();
      
      // Check what we have locally first
      this.logger.log('Checking local resources...');
      const localResources = await this.checkLocalResources();
      
      // Try internet connectivity
      this.logger.log('Checking internet connectivity...');
      const connectivityResult = await this.networkService.testConnectivity();
      
      if (!connectivityResult.isOnline) {
        // No internet - try offline mode
        return await this.handleOfflineMode(startTime, localResources);
      }
      
      this.logger.log(`Internet connectivity confirmed (${connectivityResult.latency}ms)`);
      
      // Load manifest
      this.logger.log('Loading manifest...');
      const manifest = this.loadManifest();
      this.logger.log(`Manifest loaded - Version: ${manifest.version}`);
      
      // Load database metadata
      this.logger.log('Loading database...');
      const metadata = await this.databaseService.getMetadata();
      this.logger.log(`Database loaded - Total downloads: ${metadata.totalDownloads}`);
      
      // Check if current version already exists
      if (metadata.currentVersion === manifest.version) {
        this.logger.log(`Version ${manifest.version} already downloaded`);
        this.logger.log(`Current version in database: ${metadata.currentVersion}`);
        this.logger.log(`Manifest version: ${manifest.version}`);
        this.logger.log('This version already downloaded, skipping download');
        
        return {
          success: true,
          manifest,
          downloadRecord: null as any,
          totalSize: 0,
          downloadTime: Date.now() - startTime,
          errors: undefined
        };
      }
      
      // Ensure downloads directory exists
      await this.ensureDownloadDirectory();
      this.debugLog(`Downloads directory ensured: ${this.DOWNLOADS_DIR}`);
      
      // Clean up old downloads
      this.logger.log('Cleaning up old downloads...');
      await this.cleanupOldDownloads(manifest.version);
      
      // Generate output filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `artifact-v${manifest.version}-${timestamp}.${manifest.format}`;
      const outputPath = join(this.DOWNLOADS_DIR, filename);
      
      // Download the artifact
      this.logger.log('Downloading artifact...');
      const downloadResult = await this.downloadFile(manifest.artifact, outputPath);
      
      // Calculate checksum
      this.logger.log('Verifying checksum...');
      const actualChecksum = await this.calculateChecksum(outputPath, 'sha256');
      const expectedChecksum = manifest.checksum.replace('sha256:', '');
      
      this.debugLog(`Expected checksum: ${expectedChecksum}`);
      this.debugLog(`Actual checksum: ${actualChecksum}`);
      
      // Verify checksum
      let status: 'verified' | 'checksum_mismatch' | 'failed' = 'verified';
      if (actualChecksum !== expectedChecksum) {
        this.logger.warn('WARNING: Checksum mismatch!');
        this.logger.warn(`Expected: ${expectedChecksum}`);
        this.logger.warn(`Actual: ${actualChecksum}`);
        status = 'checksum_mismatch';
      } else {
        this.logger.log('Checksum verified successfully');
      }
      
      // Create download record
      const downloadRecord: DownloadRecord = {
        id: this.generateUUID(),
        version: manifest.version,
        artifact: manifest.artifact,
        expectedChecksum: expectedChecksum,
        actualChecksum: actualChecksum,
        filePath: outputPath,
        fileName: filename,
        fileSize: downloadResult.bytes,
        downloadedAt: new Date().toISOString(),
        status: status as any,
        description: manifest.description || 'No description'
      };
      
      // Save to database
      this.logger.log('Saving download details...');
      await this.databaseService.addDownload(downloadRecord);
      await this.databaseService.updateCurrentVersion(manifest.version);
      
      // Update IoT application if this is a ZIP file and target is specified
      if (manifest.format === 'zip' && manifest.targetApp && manifest.targetPath) {
        this.logger.log('Updating IoT Application...');
        
        try {
          const updateResult = await this.iotUpdateService.updateIoTApp(
            outputPath,
            manifest.targetApp,
            manifest.targetPath
          );

          if (updateResult.success) {
            this.logger.log(`IoT App Updated - ${updateResult.extractedFiles.length} files extracted`);
          } else {
            this.logger.error('ERROR: IoT App Update Failed');
            if (updateResult.errors) {
              updateResult.errors.forEach(error => this.logger.error(`  - ${error}`));
            }
            errors.push('IoT application update failed');
          }
        } catch (updateError) {
          this.logger.error('ERROR: IoT Update Error:', updateError.message);
          errors.push(`IoT update error: ${updateError.message}`);
        }
      }
      
      const downloadTime = Date.now() - startTime;
      const totalSize = downloadRecord.fileSize;
      
      // Display results
      this.logger.log('\nDownload Summary:');
      this.logger.log(`File: ${downloadRecord.fileName}`);
      this.logger.log(`Size: ${downloadRecord.fileSize} bytes`);
      this.logger.log(`Version: ${downloadRecord.version}`);
      this.logger.log(`Checksum: ${downloadRecord.actualChecksum}`);
      this.logger.log(`Status: ${downloadRecord.status}`);
      this.logger.log(`Downloaded: ${downloadRecord.downloadedAt}`);
      
      this.logger.log('\nDownload completed successfully!');
      this.logger.log(`Total size downloaded: ${this.formatBytes(totalSize)}`);
      this.logger.log(`Total time: ${downloadTime}ms`);
      
      return {
        success: true,
        manifest,
        downloadRecord,
        totalSize,
        downloadTime,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      const downloadTime = Date.now() - startTime;
      this.logger.error('ERROR: Error processing manifest:', error.message);
      this.debugLog(`Full error:`, error);
      
      return {
        success: false,
        manifest: null as any,
        downloadRecord: null as any,
        totalSize: 0,
        downloadTime,
        errors: [error.message]
      };
    }
  }

  /**
   * Load manifest from file
   */
  private loadManifest(): Manifest {
    try {
      this.debugLog(`Loading manifest from: ${this.MANIFEST_FILE}`);
      const { readFileSync } = require('fs');
      const manifestData = readFileSync(this.MANIFEST_FILE, 'utf8');
      const manifest = JSON.parse(manifestData);
      this.debugLog(`Manifest loaded:`, manifest);
      return manifest;
    } catch (error) {
      this.debugLog(`Error loading manifest: ${error.message}`);
      throw new Error(`Failed to load manifest: ${error.message}`);
    }
  }

  /**
   * Download file from URL with Google Docs support and redirect handling
   */
  private async downloadFile(url: string, outputPath: string): Promise<{ path: string; bytes: number }> {
    this.debugLog(`Starting download: ${url} -> ${outputPath}`);
    
    const { exportUrl, docId } = this.toGoogleExportUrl(url, 'pdf');
    let redirects = 0;
    
    return new Promise((resolve, reject) => {
      const requestOnce = (currentUrl: string) => {
        this.debugLog(`Making request to: ${currentUrl}`);
        
        const u = new URL(currentUrl);
        const mod = this.getProtocolModule(u);
        
        const req = mod.get({
          hostname: u.hostname,
          path: u.pathname + u.search,
          headers: { 
            'User-Agent': 'Simple-Downloader/1.0.0', 
            Accept: '*/*' 
          },
        }, (res) => {
          this.debugLog(`Response received - Status: ${res.statusCode}`);
          
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            if (redirects++ >= this.MAX_REDIRECTS) {
              this.debugLog(`Too many redirects (${redirects}), rejecting`);
              return reject(new Error('Too many redirects'));
            }
            
            const next = new URL(res.headers.location, u).toString();
            this.debugLog(`Following redirect to: ${next}`);
            res.resume();
            return requestOnce(next);
          }
          
          if (res.statusCode >= 400) {
            this.debugLog(`HTTP error: ${res.statusCode}`);
            return reject(new Error(`Request failed: ${res.statusCode}`));
          }

          const total = Number(res.headers['content-length'] || 0);
          let downloaded = 0;
          
          this.logger.log(`Downloading: ${outputPath.split('/').pop()}`);
          this.debugLog(`Content-Length: ${total} bytes`);

          const ws = createWriteStream(outputPath);
          
          res.on('data', (chunk) => {
            downloaded += chunk.length;
            
            if (total) {
              const percentage = Math.round((downloaded / total) * 100);
              process.stdout.write(`\r${percentage}% (${downloaded}/${total} bytes)`);
            } else {
              const kb = (downloaded / 1024).toFixed(0);
              process.stdout.write(`\r${kb} KB downloaded`);
            }
          });

          res.pipe(ws);

          ws.on('finish', async () => {
            ws.close();
            process.stdout.write('\nDownload completed\n');
            this.debugLog(`Download completed: ${outputPath} (${downloaded} bytes)`);
            resolve({ path: outputPath, bytes: downloaded });
          });

          ws.on('error', (err) => {
            this.debugLog(`Write stream error: ${err.message}`);
            reject(err);
          });
        });

        req.on('error', (err) => {
          this.debugLog(`Request error: ${err.message}`);
          reject(err);
        });
      };
      
      requestOnce(exportUrl);
    });
  }

  /**
   * Convert Google Docs edit/share URLs to export URLs
   */
  private toGoogleExportUrl(inputUrl: string, format: string = 'pdf'): { exportUrl: string; docId: string | null } {
    this.debugLog(`Converting Google Docs URL: ${inputUrl} to format: ${format}`);
    
    try {
      const u = new URL(inputUrl);
      
      if (u.hostname.includes('docs.google.com')) {
        this.debugLog(`Detected Google Docs URL, extracting document ID`);
        
        const m = u.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (m) {
          const id = m[1];
          const exportUrl = `https://docs.google.com/document/d/${id}/export?format=${format}`;
          
          this.debugLog(`Converted to export URL: ${exportUrl}`);
          return { exportUrl, docId: id };
        }
      }
    } catch (e) {
      this.debugLog(`Error parsing URL: ${e.message}`);
    }
    
    this.debugLog(`Using original URL: ${inputUrl}`);
    return { exportUrl: inputUrl, docId: null };
  }

  /**
   * Get the appropriate HTTP module based on URL protocol
   */
  private getProtocolModule(url: URL): typeof http | typeof https {
    this.debugLog(`Determining protocol for: ${url.protocol}`);
    return url.protocol === 'https:' ? https : http;
  }

  /**
   * Calculate file checksum
   */
  private async calculateChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    return new Promise((resolve, reject) => {
      this.debugLog(`Calculating ${algorithm} checksum for: ${filePath}`);
      
      const hash = createHash(algorithm);
      const stream = createReadStream(filePath);
      
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => {
        const checksum = hash.digest('hex');
        this.debugLog(`Checksum calculated: ${checksum}`);
        resolve(checksum);
      });
      stream.on('error', (error) => {
        this.debugLog(`Error calculating checksum: ${error.message}`);
        reject(error);
      });
    });
  }

  /**
   * Clean up old downloads - keep only the latest download
   */
  private async cleanupOldDownloads(currentVersion: string): Promise<void> {
    this.debugLog(`Cleaning up old downloads, keeping only latest version: ${currentVersion}`);
    
    if (!existsSync(this.DOWNLOADS_DIR)) {
      this.debugLog(`Downloads directory doesn't exist: ${this.DOWNLOADS_DIR}`);
      return;
    }
    
    try {
      const { readdirSync, statSync, unlinkSync } = require('fs');
      const files = readdirSync(this.DOWNLOADS_DIR);
      let removedCount = 0;
      
      // Get all files in downloads directory
      const allFiles = files.filter(file => {
        const filePath = join(this.DOWNLOADS_DIR, file);
        const stats = statSync(filePath);
        return stats.isFile();
      });
      
      this.debugLog(`Found ${allFiles.length} files in downloads directory`);
      
      // If we have more than 1 file, keep only the most recent one
      if (allFiles.length > 1) {
        // Sort files by modification time (newest first)
        const sortedFiles = allFiles.sort((a, b) => {
          const aPath = join(this.DOWNLOADS_DIR, a);
          const bPath = join(this.DOWNLOADS_DIR, b);
          const aTime = statSync(aPath).mtime.getTime();
          const bTime = statSync(bPath).mtime.getTime();
          return bTime - aTime; // Newest first
        });
        
        // Keep the newest file, remove all others
        const filesToRemove = sortedFiles.slice(1); // All except the first (newest)
        
        filesToRemove.forEach(file => {
          const filePath = join(this.DOWNLOADS_DIR, file);
          this.debugLog(`Removing old file: ${file}`);
          unlinkSync(filePath);
          removedCount++;
        });
        
        this.logger.log(`Cleaned up ${removedCount} old files (kept latest: ${sortedFiles[0]})`);
        this.debugLog(`Cleanup completed: ${removedCount} files removed, kept: ${sortedFiles[0]}`);
      } else {
        this.debugLog(`No cleanup needed - only ${allFiles.length} file(s) found`);
      }
      
    } catch (error) {
      this.debugLog(`Error during cleanup: ${error.message}`);
      this.logger.warn(`WARNING: Cleanup warning: ${error.message}`);
    }
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    if (!existsSync(this.DOWNLOADS_DIR)) {
      mkdirSync(this.DOWNLOADS_DIR, { recursive: true });
      this.logger.log(`Created download directory: ${this.DOWNLOADS_DIR}`);
    }
  }

  /**
   * Ensure download directory exists
   */
  private async ensureDownloadDirectory(): Promise<void> {
    if (!existsSync(this.DOWNLOADS_DIR)) {
      mkdirSync(this.DOWNLOADS_DIR, { recursive: true });
      this.debugLog(`Downloads directory ensured: ${this.DOWNLOADS_DIR}`);
    }
  }

  /**
   * Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clean database and downloads folder
   */
  async cleanDatabase(): Promise<void> {
    this.logger.log('Cleaning Database and Downloads');
    this.logger.log('==================================');

    try {
      // Initialize database if not already done
      await this.databaseService.initialize();

      // Clean downloads folder
      if (existsSync(this.DOWNLOADS_DIR)) {
        const { readdirSync, statSync, unlinkSync } = require('fs');
        const files = readdirSync(this.DOWNLOADS_DIR);
        let removedCount = 0;

        files.forEach(file => {
          const filePath = join(this.DOWNLOADS_DIR, file);
          const stats = statSync(filePath);
          
          if (stats.isFile()) {
            this.debugLog(`Removing file: ${file}`);
            unlinkSync(filePath);
            removedCount++;
          }
        });

        this.logger.log(`Removed ${removedCount} files from downloads folder`);
      } else {
        this.logger.log('Downloads directory does not exist');
      }

      // Clean SQLite database
      await this.databaseService.cleanAllDownloads();
      this.logger.log('Cleaned SQLite database');

      this.logger.log('Database and downloads cleaned successfully!');

    } catch (error) {
      this.logger.error('ERROR: Error cleaning database:', error.message);
      throw error;
    }
  }

  /**
   * Handle offline mode when no internet connection
   */
  private async handleOfflineMode(startTime: number, localResources: any): Promise<{
    success: boolean;
    manifest: Manifest;
    downloadRecord: DownloadRecord;
    totalSize: number;
    downloadTime: number;
    errors?: string[];
    mode: 'OFFLINE';
  }> {
    this.logger.log('No internet connection - entering OFFLINE mode');
    this.logger.log('AIO Device Status: OFFLINE');
    
    // Check if we have any local resources
    if (localResources.hasDownloadedFiles) {
      this.logger.log('Found cached files - running in offline mode');
      this.logger.log(`Available files: ${localResources.availableFiles.length}`);
      this.logger.log(`Current version: ${localResources.currentVersion || 'Unknown'}`);
      this.logger.log(`Last sync: ${localResources.lastSyncTime || 'Never'}`);
      
      // Create a mock manifest for offline mode
      const offlineManifest: Manifest = {
        version: localResources.currentVersion || 'offline',
        artifact: 'cached-file',
        checksum: 'offline-mode',
        description: 'Offline cached resource',
        lastUpdated: localResources.lastSyncTime || new Date().toISOString(),
        size: 0,
        format: 'cached'
      };

      return {
        success: true,
        manifest: offlineManifest,
        downloadRecord: null as any,
        totalSize: 0,
        downloadTime: Date.now() - startTime,
        mode: 'OFFLINE',
        errors: [
          'Running in OFFLINE mode',
          'Using cached resources',
          'Will sync when internet available',
          'Limited functionality available'
        ]
      };
    } else {
      // No local resources available
      this.logger.error('ERROR: No cached resources available');
      this.logger.error('Device needs internet connection for initial setup');
      
      return {
        success: false,
        manifest: null as any,
        downloadRecord: null as any,
        totalSize: 0,
        downloadTime: Date.now() - startTime,
        mode: 'OFFLINE',
        errors: [
          'No internet connection available',
          'No cached resources found',
          'AIO Device needs internet for initial setup',
          'Please connect to internet and try again',
          'Device will work offline after initial download'
        ]
      };
    }
  }

  /**
   * Check local resources available
   */
  private async checkLocalResources(): Promise<{
    hasDownloadedFiles: boolean;
    availableFiles: string[];
    currentVersion?: string;
    lastSyncTime?: string;
  }> {
    let hasDownloadedFiles = false;
    let availableFiles: string[] = [];
    let currentVersion: string | undefined;
    let lastSyncTime: string | undefined;

    // Check downloads directory
    if (existsSync(this.DOWNLOADS_DIR)) {
      try {
        const { readdirSync, statSync } = require('fs');
        const files = readdirSync(this.DOWNLOADS_DIR);
        
        availableFiles = files.filter(file => {
          const filePath = join(this.DOWNLOADS_DIR, file);
          const stats = statSync(filePath);
          return stats.isFile() && stats.size > 0;
        });
        
        hasDownloadedFiles = availableFiles.length > 0;
      } catch (error) {
        this.debugLog(`Error checking downloads directory: ${error.message}`);
      }
    }

    // Check database for metadata
    if (hasDownloadedFiles) {
      try {
        const metadata = await this.databaseService.getMetadata();
        currentVersion = metadata.currentVersion;
        lastSyncTime = metadata.lastUpdated;
      } catch (error) {
        this.debugLog(`Error reading database metadata: ${error.message}`);
      }
    }

    return {
      hasDownloadedFiles,
      availableFiles,
      currentVersion,
      lastSyncTime
    };
  }

  /**
   * Debug logging utility
   */
  private debugLog(message: string, data?: any): void {
    if (this.DEBUG) {
      const timestamp = new Date().toISOString();
      this.logger.debug(`[DEBUG ${timestamp}] ${message}`);
      if (data) {
        this.logger.debug(`[DEBUG] Data:`, JSON.stringify(data, null, 2));
      }
    }
  }
}

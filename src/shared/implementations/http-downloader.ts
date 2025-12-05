/**
 * HTTP Downloader Implementation
 * Extends BaseDownloader for HTTP-based downloads
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseDownloader } from '../abstract/base.downloader';
import { Manifest, DownloadRecord } from '../interfaces/app.interfaces';
import { DownloadResult } from '../interfaces/base.interfaces';
import { DownloadStatus } from '../enums/app.enums';
import { DatabaseService } from '../../core/database/database.service';
import { NetworkService } from '../../core/network/network.service';
import { IoTUpdateService } from '../../core/iot-update/iot-update.service';
import { NssmService } from '../../core/service/nssm.service';
import { EventNotificationService } from '../services/event-notification.service';
import { RateLimiterService } from '../services/rate-limiter.service';
import * as fs from 'fs';
import { join } from 'path';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

@Injectable()
export class HttpDownloader extends BaseDownloader {
  private readonly MANIFEST_FILE: string;
  private readonly TARGET_PATH: string;
  private readonly MANIFEST_URL: string;
  private readonly DOWNLOADS_DIR: string;
  private readonly DEBUG: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly networkService: NetworkService,
    private readonly iotUpdateService: IoTUpdateService,
    private readonly nssmService: NssmService,
    private readonly eventNotificationService: EventNotificationService,
    private readonly rateLimiterService: RateLimiterService,
  ) {
    super('HttpDownloader');

    this.MANIFEST_FILE = this.configService.get<string>('MANIFEST_FILE', './manifest.json');
    this.MANIFEST_URL = this.configService.get<string>('MANIFEST_URL', '');
    this.TARGET_PATH = this.configService.get<string>('TARGET_PATH', '');
    this.DOWNLOADS_DIR = this.configService.get<string>('DOWNLOAD_DIR', './downloads');
    this.DEBUG = process.env.DEBUG === 'true';

    this.ensureDirectories();
  }

  /**
   * Initialize the downloader
   */
  protected async onInitialize(): Promise<void> {
    this.logger.log('HTTP Downloader initializing...');
    await this.databaseService.initialize();
    this.logger.log('HTTP Downloader initialized successfully');
  }

  /**
   * Shutdown the downloader
   */
  protected async onShutdown(): Promise<void> {
    this.logger.log('HTTP Downloader shutting down...');
    // Cleanup if needed
  }

  /**
   * Main download method
   */
  async download(url: string, destination: string): Promise<DownloadResult> {
    const startTime = Date.now();
    const MAX_RETRY_DELAY = 60000;
    const BASE_RETRY_DELAY = 2000;
    let attempt = 0;

    this.logger.log(`Starting download with infinite retry: ${url} -> ${destination}`);

    try {
      return await this.rateLimiterService.executeWithRateLimit(
        `download:${url}`,
        async () => {
          while (true) {
            attempt++;

            try {
              this.isDownloading = true;
              this.logger.log(`Download attempt ${attempt}: ${url}`);

              const downloadUrl = this.convertToDirectDownloadUrl(url);
              const { exportUrl } = this.convertGoogleDocsUrl(downloadUrl, 'pdf');

              this.ensureDirectoryExists(destination);

              const result = await this.downloadFile(exportUrl, destination);

              const duration = Date.now() - startTime;
              this.isDownloading = false;

              this.logger.log(`Download SUCCESS on attempt ${attempt} in ${duration}ms`);

              return {
                success: true,
                filePath: destination,
                bytesDownloaded: result.bytes,
                duration
              };
            } catch (error) {
              this.isDownloading = false;

              const errorMessage = error instanceof Error ? error.message : String(error);
              this.logger.error(`Download attempt ${attempt} failed: ${errorMessage}`);

              if (errorMessage.includes('ECONNREFUSED')) {
                this.logger.warn(`Connection refused. Server may be down.`);
              } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
                this.logger.warn(`Connection timeout. Network may be slow.`);
              } else if (errorMessage.includes('ENOTFOUND')) {
                this.logger.warn(`DNS resolution failed. Check URL: ${url}`);
              }

              const delay = Math.min(BASE_RETRY_DELAY * Math.pow(1.5, Math.min(attempt - 1, 10)), MAX_RETRY_DELAY);
              this.logger.log(`Retrying in ${(delay / 1000).toFixed(1)}s...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
        },
        'normal'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Rate limited download failed: ${error.message}`, error.stack);

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Main method to process manifest and download artifact
   */
  async downloadFromManifest(manifestOverride?: Manifest): Promise<{
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
      // Check local resources first
      this.logger.log('Checking local resources...');
      const localResources = await this.checkLocalResources();

      // Try internet connectivity
      this.logger.log('Checking internet connectivity...');
      const connectivityResult = await this.networkService.testConnectivity();

      if (!connectivityResult.isOnline) {
        return await this.handleOfflineMode(startTime, localResources);
      }

      this.logger.log(`Internet connectivity confirmed (${connectivityResult.latency}ms)`);

      // Load manifest - use override if provided, otherwise load from file
      let manifest: Manifest;
      if (manifestOverride) {
        this.logger.log('Using manifest from gateway...');
        manifest = manifestOverride;
      } else {
        this.logger.log('Loading manifest...');
        manifest = await this.loadManifest();
      }
      this.logger.log(`Manifest loaded - Version: ${manifest.version}`);

      // Load database metadata
      this.logger.log('Loading database...');
      const metadata = await this.databaseService.getMetadata();
      this.logger.log(`Database loaded - Total downloads: ${metadata.totalDownloads}`);

      // Check if current version already exists
      if (metadata.currentVersion === manifest.version) {
        // Check if extraction folder exists, if not, extract again
        const extractionPath = this.TARGET_PATH
          ? join(this.TARGET_PATH, manifest.version)
          : join(process.cwd(), 'agent', manifest.version);

        const extractionExists = fs.existsSync(extractionPath);

        if (extractionExists) {
          this.logger.log(`Version ${manifest.version} already downloaded and extracted`);
          return {
            success: true,
            manifest,
            downloadRecord: null as any,
            totalSize: 0,
            downloadTime: Date.now() - startTime,
            errors: undefined,
          };
        } else {
          this.logger.log(`Version ${manifest.version} downloaded but not extracted, extracting now...`);
          // Continue to extraction below
        }
      }

      // Ensure downloads directory exists
      await this.ensureDownloadDirectory();
      this.debugLog(`Downloads directory ensured: ${this.DOWNLOADS_DIR}`);

      // Clean up old downloads
      this.logger.log('Cleaning up old downloads...');
      await this.cleanupOldDownloads(manifest.version);

      // Generate output filename with timestamp
      const filename = this.generateFilename(`artifact.${manifest.format}`, manifest.version);
      const outputPath = join(this.DOWNLOADS_DIR, filename);

      // Download the artifact
      this.logger.log('Downloading artifact...');
      const downloadResult = await this.download(manifest.artifact, outputPath);

      if (!downloadResult.success) {
        throw new Error(downloadResult.error || 'Download failed');
      }

      // Calculate checksum
      this.logger.log('Verifying checksum...');
      const actualChecksum = await this.calculateChecksum(outputPath, 'sha256');
      const expectedChecksum = manifest.checksum.replace('sha256:', '');

      this.debugLog(`Expected checksum: ${expectedChecksum}`);
      this.debugLog(`Actual checksum: ${actualChecksum}`);

      // Verify checksum
      let status: DownloadStatus = DownloadStatus.VERIFIED;
      if (actualChecksum !== expectedChecksum) {
        this.logger.warn('WARNING: Checksum mismatch!');
        this.logger.warn(`Expected: ${expectedChecksum}`);
        this.logger.warn(`Actual: ${actualChecksum}`);
        status = DownloadStatus.CHECKSUM_MISMATCH;

        const downloadRecord: DownloadRecord = {
          id: this.generateUUID(),
          version: manifest.version,
          artifact: manifest.artifact,
          expectedChecksum: expectedChecksum,
          actualChecksum: actualChecksum,
          filePath: outputPath,
          fileName: filename,
          fileSize: downloadResult.bytesDownloaded || 0,
          downloadedAt: new Date().toISOString(),
          status: status,
          description: manifest.description || 'No description',
        };

        await this.databaseService.addDownload(downloadRecord);

        // Send checksum mismatch notification
        await this.eventNotificationService.notifyChecksumMismatch({
          deviceId: this.configService.get<string>('DEVICE_ID', 'unknown-device'),
          version: manifest.version,
          artifact: manifest.artifact,
          expectedChecksum: expectedChecksum,
          actualChecksum: actualChecksum,
          timestamp: new Date().toISOString(),
          severity: 'ERROR'
        });

        this.logger.error('Download failed due to checksum mismatch. No further processing will occur.');
        return {
          success: false,
          manifest,
          downloadRecord,
          totalSize: downloadResult.bytesDownloaded || 0,
          downloadTime: Date.now() - startTime,
          errors: ['Checksum mismatch - download integrity verification failed'],
        };
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
        fileSize: downloadResult.bytesDownloaded || 0,
        downloadedAt: new Date().toISOString(),
        status: status,
        description: manifest.description || 'No description',
      };

      // Save to database
      this.logger.log('Saving download details...');
      await this.databaseService.addDownload(downloadRecord);
      await this.databaseService.updateCurrentVersion(manifest.version);

      // Update IoT application if this is a ZIP file - extract to agent folder
      // Always extract if format is zip, even if targetApp is not specified
      if (manifest.format === 'zip') {
        try {
          // Use TARGET_PATH + version for extraction (e.g., C:\Users\amriks\Desktop\QSC\agent\1.0.1)
          const finalPath = this.TARGET_PATH
            ? join(this.TARGET_PATH, manifest.version)
            : join(process.cwd(), 'agent', manifest.version);

          this.logger.log(`Extracting to: ${finalPath}`);

          const existingVersion = metadata.currentVersion;
          const existingPath = metadata?.currentVersion && this.TARGET_PATH
            ? join(this.TARGET_PATH, metadata.currentVersion)
            : null;

          const targetApp = manifest.targetApp || 'agent';

          const updateResult = await this.iotUpdateService.updateIoTApp(
            outputPath,
            targetApp,
            finalPath,
          );

          if (updateResult.success) {
            this.logger.log(`Files extracted successfully to: ${finalPath}`);
            this.logger.log(`Extracted ${updateResult.extractedFiles.length} files`);

            // Auto-install Windows service after successful extraction (if targetApp specified)
            if (manifest.targetApp) {
              await this.autoInstallService(
                manifest.targetApp,
                finalPath,
                manifest.version,
                existingVersion,
                existingPath,
              );
            }
          } else {
            this.logger.error('ERROR: Extraction Failed');
            if (updateResult.errors) {
              updateResult.errors.forEach((error) =>
                this.logger.error(`  - ${error}`),
              );
            }
            errors.push('File extraction failed');
          }
        } catch (updateError) {
          this.logger.error('ERROR: Extraction Error:', updateError.message);
          errors.push(`Extraction error: ${updateError.message}`);
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
        errors: errors.length > 0 ? errors : undefined,
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
        errors: [error.message],
      };
    }
  }

  /**
   * Download file from URL with redirect handling and resume support
   */
  private async downloadFile(url: string, outputPath: string): Promise<{ path: string; bytes: number }> {
    this.debugLog(`Starting download: ${url} -> ${outputPath}`);

    const partialFile = `${outputPath}.partial`;

    let resumeFrom = 0;
    let totalBytesDownloaded = 0;

    if (fs.existsSync(partialFile)) {
      try {
        const stats = fs.statSync(partialFile);
        resumeFrom = stats.size;
        totalBytesDownloaded = resumeFrom;
        this.logger.log(`Resuming download from ${resumeFrom} bytes`);
      } catch (error) {
        this.logger.warn(`Error reading partial file: ${error.message}, starting fresh`);
        fs.unlinkSync(partialFile);
        resumeFrom = 0;
      }
    }

    let redirects = 0;

    return new Promise((resolve, reject) => {
      const requestOnce = (currentUrl: string) => {
        this.debugLog(`Making request to: ${currentUrl}`);

        const u = new URL(currentUrl);
        const mod = this.getProtocolModule(u);

        const headers: any = {
          'User-Agent': this.userAgent,
          Accept: '*/*',
        };

        if (resumeFrom > 0) {
          headers['Range'] = `bytes=${resumeFrom}-`;
          this.debugLog(`Adding Range header: bytes=${resumeFrom}-`);
        }

        const req = mod.get(
          {
            hostname: u.hostname,
            path: u.pathname + u.search,
            headers,
          },
          async (res) => {
            this.debugLog(`Response received - Status: ${res.statusCode}`);

            if (
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              if (redirects++ >= this.maxRedirects) {
                this.debugLog(`Too many redirects (${redirects}), rejecting`);
                return reject(new Error('Too many redirects'));
              }

              const next = new URL(res.headers.location, u).toString();
              this.debugLog(`Following redirect to: ${next}`);
              res.resume();
              return requestOnce(next);
            }

            if (res.statusCode === 416) {
              this.logger.warn('Range not satisfiable, starting fresh download');
              if (fs.existsSync(partialFile)) {
                fs.unlinkSync(partialFile);
              }
              resumeFrom = 0;
              totalBytesDownloaded = 0;
              return requestOnce(currentUrl);
            }

            if (res.statusCode >= 400) {
              this.debugLog(`HTTP error: ${res.statusCode}`);
              return reject(new Error(`Request failed: ${res.statusCode}`));
            }

            const isPartialContent = res.statusCode === 206;
            const contentLength = Number(res.headers['content-length'] || 0);
            const total = isPartialContent ? resumeFrom + contentLength : contentLength;
            let currentDownloaded = 0;

            this.logger.log(`Downloading: ${outputPath.split('/').pop()} ${isPartialContent ? '(Resuming)' : ''}`);
            this.debugLog(`Content-Length: ${contentLength} bytes, Total: ${total} bytes`);

            const ws = fs.createWriteStream(partialFile, { flags: resumeFrom > 0 ? 'a' : 'w' });

            res.on('data', (chunk) => {
              currentDownloaded += chunk.length;
              totalBytesDownloaded += chunk.length;

              if (total) {
                const percentage = Math.round((totalBytesDownloaded / total) * 100);
                process.stdout.write(
                  `\r${percentage}% (${totalBytesDownloaded}/${total} bytes)`,
                );
              } else {
                process.stdout.write(`\r${totalBytesDownloaded} bytes downloaded`);
              }
            });

            res.pipe(ws);

            ws.on('finish', () => {
              ws.close();
              process.stdout.write('\nDownload completed\n');

              try {
                if (fs.existsSync(outputPath)) {
                  fs.unlinkSync(outputPath);
                }
                fs.renameSync(partialFile, outputPath);
              } catch (error) {
                this.logger.warn(`Error finalizing download: ${error.message}`);
              }

              this.debugLog(`Download completed: ${outputPath} (${totalBytesDownloaded} bytes)`);
              resolve({ path: outputPath, bytes: totalBytesDownloaded });
            });

            ws.on('error', (err) => {
              this.debugLog(`Write stream error: ${err.message}`);
              reject(err);
            });
          },
        );

        req.on('error', (err) => {
          this.debugLog(`Request error: ${err.message}`);
          reject(err);
        });
      };

      requestOnce(url);
    });
  }

  /**
   * Get the appropriate HTTP module based on URL protocol
   */
  private getProtocolModule(url: URL): typeof http | typeof https {
    this.debugLog(`Determining protocol for: ${url.protocol}`);
    return url.protocol === 'https:' ? https : http;
  }

  /**
   * Load manifest from URL or file
   */
  private async loadManifest(): Promise<Manifest> {
    try {
      if (this.MANIFEST_URL) {
        this.logger.log(`Fetching manifest from URL: ${this.MANIFEST_URL}`);
        return await this.fetchManifestFromUrl(this.MANIFEST_URL);
      }

      this.debugLog(`Loading manifest from local file: ${this.MANIFEST_FILE}`);
      const manifestData = fs.readFileSync(this.MANIFEST_FILE, 'utf8');
      const manifest = JSON.parse(manifestData);
      this.debugLog(`Manifest loaded:`, manifest);
      return manifest;
    } catch (error) {
      this.debugLog(`Error loading manifest: ${error.message}`);
      throw new Error(`Failed to load manifest: ${error.message}`);
    }
  }

  /**
   * Fetch manifest from URL
   */
  private async fetchManifestFromUrl(url: string): Promise<Manifest> {
    return new Promise((resolve, reject) => {
      try {
        const downloadUrl = this.convertToDirectDownloadUrl(url);
        this.debugLog(`Fetching manifest from: ${downloadUrl}`);

        const u = new URL(downloadUrl);
        const mod = this.getProtocolModule(u);
        let redirects = 0;

        const requestOnce = (currentUrl: string) => {
          const parsedUrl = new URL(currentUrl);
          const protocol = this.getProtocolModule(parsedUrl);

          const req = protocol.get(
            {
              hostname: parsedUrl.hostname,
              path: parsedUrl.pathname + parsedUrl.search,
              headers: {
                'User-Agent': this.userAgent,
                Accept: 'application/json, text/plain, */*',
              },
            },
            (res) => {
              this.debugLog(`Response received - Status: ${res.statusCode}`);

              if (
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location
              ) {
                if (redirects++ >= this.maxRedirects) {
                  return reject(
                    new Error('Too many redirects while fetching manifest'),
                  );
                }

                const next = new URL(
                  res.headers.location,
                  parsedUrl,
                ).toString();
                this.debugLog(`Following redirect to: ${next}`);
                res.resume();
                return requestOnce(next);
              }

              if (res.statusCode >= 400) {
                return reject(
                  new Error(`Failed to fetch manifest: HTTP ${res.statusCode}`),
                );
              }

              let data = '';
              res.on('data', (chunk) => {
                data += chunk.toString();
              });

              res.on('end', () => {
                try {
                  this.debugLog(`Manifest data received, parsing JSON...`);
                  const manifest = JSON.parse(data);
                  this.debugLog(`Manifest parsed successfully:`, manifest);
                  this.logger.log(`Manifest fetched successfully from URL`);
                  resolve(manifest);
                } catch (parseError) {
                  this.debugLog(
                    `Error parsing manifest JSON: ${parseError.message}`,
                  );
                  reject(
                    new Error(
                      `Failed to parse manifest JSON: ${parseError.message}`,
                    ),
                  );
                }
              });
            },
          );

          req.on('error', (err) => {
            this.debugLog(`Request error: ${err.message}`);
            reject(new Error(`Failed to fetch manifest: ${err.message}`));
          });
        };

        requestOnce(downloadUrl);
      } catch (error) {
        this.debugLog(`Error in fetchManifestFromUrl: ${error.message}`);
        reject(
          new Error(`Failed to fetch manifest from URL: ${error.message}`),
        );
      }
    });
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    if (!fs.existsSync(this.DOWNLOADS_DIR)) {
      fs.mkdirSync(this.DOWNLOADS_DIR, { recursive: true });
      this.logger.log(`Created download directory: ${this.DOWNLOADS_DIR}`);
    }
  }

  /**
   * Ensure download directory exists
   */
  private async ensureDownloadDirectory(): Promise<void> {
    if (!fs.existsSync(this.DOWNLOADS_DIR)) {
      fs.mkdirSync(this.DOWNLOADS_DIR, { recursive: true });
      this.debugLog(`Downloads directory ensured: ${this.DOWNLOADS_DIR}`);
    }
  }

  /**
   * Clean up old downloads
   */
  private async cleanupOldDownloads(currentVersion: string): Promise<void> {
    this.debugLog(
      `Cleaning up old downloads, keeping only latest version: ${currentVersion}`,
    );

    if (!fs.existsSync(this.DOWNLOADS_DIR)) {
      this.debugLog(`Downloads directory doesn't exist: ${this.DOWNLOADS_DIR}`);
      return;
    }

    try {
      const files = fs.readdirSync(this.DOWNLOADS_DIR);
      let removedCount = 0;

      const allFiles = files.filter((file) => {
        const filePath = join(this.DOWNLOADS_DIR, file);
        const stats = fs.statSync(filePath);
        return stats.isFile();
      });

      this.debugLog(`Found ${allFiles.length} files in downloads directory`);

      if (allFiles.length > 1) {
        const sortedFiles = allFiles.sort((a, b) => {
          const aPath = join(this.DOWNLOADS_DIR, a);
          const bPath = join(this.DOWNLOADS_DIR, b);
          const aTime = fs.statSync(aPath).mtime.getTime();
          const bTime = fs.statSync(bPath).mtime.getTime();
          return bTime - aTime;
        });

        const filesToRemove = sortedFiles.slice(1);

        filesToRemove.forEach((file) => {
          const filePath = join(this.DOWNLOADS_DIR, file);
          this.debugLog(`Removing old file: ${file}`);
          fs.unlinkSync(filePath);
          removedCount++;
        });

        this.logger.log(
          `Cleaned up ${removedCount} old files (kept latest: ${sortedFiles[0]})`,
        );
      }
    } catch (error) {
      this.debugLog(`Error during cleanup: ${error.message}`);
      this.logger.warn(`WARNING: Cleanup warning: ${error.message}`);
    }
  }

  /**
   * Handle offline mode
   */
  private async handleOfflineMode(startTime: number, localResources: any): Promise<any> {
    this.logger.log('No internet connection - entering OFFLINE mode');
    this.logger.log('AIO Device Status: OFFLINE');

    if (localResources.hasDownloadedFiles) {
      this.logger.log('Found cached files - running in offline mode');
      this.logger.log(`Available files: ${localResources.availableFiles.length}`);
      this.logger.log(`Current version: ${localResources.currentVersion || 'Unknown'}`);
      this.logger.log(`Last sync: ${localResources.lastSyncTime || 'Never'}`);

      const offlineManifest: Manifest = {
        version: localResources.currentVersion || 'offline',
        artifact: 'cached-file',
        checksum: 'offline-mode',
        description: 'Offline cached resource',
        lastUpdated: localResources.lastSyncTime || new Date().toISOString(),
        size: 0,
        format: 'zip' as any, // Using zip as fallback for cached format
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
          'Limited functionality available',
        ],
      };
    } else {
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
          'Device will work offline after initial download',
        ],
      };
    }
  }

  /**
   * Check local resources
   */
  private async checkLocalResources(): Promise<any> {
    let hasDownloadedFiles = false;
    let availableFiles: string[] = [];
    let currentVersion: string | undefined;
    let lastSyncTime: string | undefined;

    if (fs.existsSync(this.DOWNLOADS_DIR)) {
      try {
        const files = fs.readdirSync(this.DOWNLOADS_DIR);

        availableFiles = files.filter((file) => {
          const filePath = join(this.DOWNLOADS_DIR, file);
          const stats = fs.statSync(filePath);
          return stats.isFile() && stats.size > 0;
        });

        hasDownloadedFiles = availableFiles.length > 0;
      } catch (error) {
        this.debugLog(`Error checking downloads directory: ${error.message}`);
      }
    }

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
      lastSyncTime,
    };
  }

  /**
   * Auto-install Windows service
   */
  private async autoInstallService(
    targetApp: string,
    targetPath: string,
    manifestVersion: string,
    existingVersion: string | null,
    existingPath: string,
  ): Promise<void> {
    try {
      this.logger.log('🚀 Auto-installing Windows service...');

      const serviceName = `agent_${manifestVersion}`;
      const existingServiceName = existingVersion
        ? `agent_${existingVersion}`
        : null;
      const appDirectory = require('path').resolve(targetPath);
      const existingAppDirectory = existingVersion
        ? require('path').resolve(existingPath)
        : null;

      this.logger.log(`Service Name: ${serviceName}`);
      this.logger.log(`App Directory: ${appDirectory}`);

      const installResult = this.nssmService.installService(
        serviceName,
        appDirectory,
      );
      if (installResult.success) {
        this.logger.log(`Service '${serviceName}' installed successfully`);

        const startResult = this.nssmService.startService(
          serviceName,
          existingServiceName,
          existingPath,
        );
        if (startResult.success) {
          this.logger.log(`Service '${serviceName}' started successfully`);
          this.logger.log(`Application is now running as Windows service`);
        } else {
          this.logger.warn(
            `Service installed but failed to start: ${startResult.message}`,
          );
        }
      } else {
        this.logger.error(
          `Failed to install service: ${installResult.message}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error in auto-install service: ${error.message}`);
    }
  }

  /**
   * Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
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
      if (fs.existsSync(this.DOWNLOADS_DIR)) {
        const files = fs.readdirSync(this.DOWNLOADS_DIR);
        let removedCount = 0;

        files.forEach((file) => {
          const filePath = join(this.DOWNLOADS_DIR, file);
          const stats = fs.statSync(filePath);

          if (stats.isFile()) {
            this.debugLog(`Removing file: ${file}`);
            fs.unlinkSync(filePath);
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

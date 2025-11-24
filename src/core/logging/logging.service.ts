import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as util from 'util';
import { AppLoggerService } from '../../shared/services/logger.service';

const gzip = util.promisify(zlib.gzip);

export interface LogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'VERBOSE';
  context: string;
  message: string;
  metadata?: Record<string, any>;
  deviceId?: string;
}

export interface LogFile {
  filename: string;
  filepath: string;
  size: number;
  createdAt: Date;
  isCompressed: boolean;
}

export interface SyncStatus {
  syncId: string;
  startTime: Date;
  endTime?: Date;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  filesAttempted: number;
  filesSucceeded: number;
  filesFailed: number;
  totalBytes: number;
  errors?: string[];
}

@Injectable()
export class LoggingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new AppLoggerService(LoggingService.name);
  private readonly logDir: string;
  private readonly currentLogFile: string;
  private writeStream: fs.WriteStream | null = null;
  private currentFileSize: number = 0;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private lastSyncStatus: SyncStatus | null = null;

  private readonly config = {
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 10,
    azureSyncEnabled: false,
    storageAccountName: '',
    containerName: 'app-logs',
    sasToken: '',
    syncIntervalMinutes: 30,
    retryAttempts: 5,
    retryDelayMs: 2000,
    deleteAfterSync: true,
    retentionDays: 7,
  };

  constructor(private readonly configService: ConfigService) {
    this.logDir = this.configService.get<string>('LOG_DIR', './logs');
    this.currentLogFile = path.join(this.logDir, 'app.log');
    
    this.config.maxFileSize = this.configService.get<number>('LOG_MAX_FILE_SIZE', this.config.maxFileSize);
    this.config.maxFiles = this.configService.get<number>('LOG_MAX_FILES', this.config.maxFiles);
    this.config.azureSyncEnabled = this.configService.get<boolean>('AZURE_LOG_SYNC_ENABLED', false);
    this.config.storageAccountName = this.configService.get<string>('AZURE_STORAGE_ACCOUNT_NAME', '');
    this.config.containerName = this.configService.get<string>('AZURE_LOG_CONTAINER_NAME', 'app-logs');
    this.config.sasToken = this.configService.get<string>('AZURE_STORAGE_SAS_TOKEN', '');
    this.config.syncIntervalMinutes = this.configService.get<number>('AZURE_LOG_SYNC_INTERVAL', 30);
    this.config.retryAttempts = this.configService.get<number>('AZURE_LOG_RETRY_ATTEMPTS', 5);
    this.config.retryDelayMs = this.configService.get<number>('AZURE_LOG_RETRY_DELAY', 2000);
    this.config.deleteAfterSync = this.configService.get<boolean>('LOG_DELETE_AFTER_SYNC', true);
    this.config.retentionDays = this.configService.get<number>('LOG_RETENTION_DAYS', 7);

    this.initialize();
  }

  async onModuleInit() {
    if (this.isAzureSyncEnabled()) {
      const syncIntervalMs = this.config.syncIntervalMinutes * 60 * 1000;
      this.logger.log(`Starting log sync scheduler (${this.config.syncIntervalMinutes} min interval)`);

      this.syncInterval = setInterval(() => {
        this.performSync().catch(error => this.logger.error('Sync failed:', error.message));
      }, syncIntervalMs);

      setTimeout(() => {
        this.performSync().catch(error => this.logger.error('Initial sync failed:', error.message));
      }, 30000);
    }
  }

  async onModuleDestroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.writeStream) {
      await new Promise<void>((resolve) => this.writeStream!.end(() => resolve()));
    }
  }

  private initialize(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      this.createWriteStream();
      if (fs.existsSync(this.currentLogFile)) {
        this.currentFileSize = fs.statSync(this.currentLogFile).size;
      }
      this.logger.log('Logging service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize logging:', error.message);
    }
  }

  private createWriteStream(): void {
    if (this.writeStream) {
      this.writeStream.end();
    }
    this.writeStream = fs.createWriteStream(this.currentLogFile, { flags: 'a', encoding: 'utf8' });
    this.writeStream.on('error', (error) => this.logger.error('Write stream error:', error.message));
  }

  async writeLog(entry: LogEntry): Promise<void> {
    try {
      const logLine = JSON.stringify({ ...entry, timestamp: entry.timestamp || new Date().toISOString() });
      const lineBytes = Buffer.byteLength(logLine, 'utf8');

      if (this.currentFileSize + lineBytes > this.config.maxFileSize) {
        await this.rotateLog();
        this.currentFileSize = 0;
      }

      if (this.writeStream && this.writeStream.writable) {
        this.writeStream.write(logLine + '\n');
        this.currentFileSize += lineBytes + 1;
      }
    } catch (error) {
      this.logger.error('Failed to write log:', error.message);
    }
  }

  private async rotateLog(): Promise<void> {
    try {
      if (this.writeStream) {
        await new Promise<void>((resolve) => this.writeStream!.end(() => resolve()));
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFilename = `app-${timestamp}.log`;
      const rotatedFilepath = path.join(this.logDir, rotatedFilename);

      if (fs.existsSync(this.currentLogFile)) {
        fs.renameSync(this.currentLogFile, rotatedFilepath);
        this.logger.log(`Rotated log: ${rotatedFilename}`);
      }

      await this.cleanupOldLogFiles();
      this.createWriteStream();
      this.currentFileSize = 0;
    } catch (error) {
      this.logger.error('Rotation failed:', error.message);
      this.createWriteStream();
    }
  }

  private async cleanupOldLogFiles(): Promise<void> {
    try {
      const logFiles = this.getLogFiles();
      logFiles.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      const filesToRemove = logFiles.length - this.config.maxFiles;
      if (filesToRemove > 0) {
        for (let i = 0; i < filesToRemove; i++) {
          fs.unlinkSync(logFiles[i].filepath);
        }
      }
    } catch (error) {
      this.logger.error('Cleanup failed:', error.message);
    }
  }

  private getLogFiles(): LogFile[] {
    try {
      const files = fs.readdirSync(this.logDir);
      const logFiles: LogFile[] = [];

      for (const filename of files) {
        if (filename === 'app.log' || (!filename.endsWith('.log') && !filename.endsWith('.log.gz'))) {
          continue;
        }

        const filepath = path.join(this.logDir, filename);
        const stats = fs.statSync(filepath);

        logFiles.push({
          filename,
          filepath,
          size: stats.size,
          createdAt: stats.birthtime,
          isCompressed: filename.endsWith('.gz'),
        });
      }

      return logFiles;
    } catch (error) {
      return [];
    }
  }

  private async compressLogFile(filepath: string): Promise<string | null> {
    try {
      if (filepath.endsWith('.gz')) return filepath;

      const fileContent = fs.readFileSync(filepath);
      const compressed = await gzip(fileContent, { level: zlib.constants.Z_BEST_COMPRESSION });
      const compressedPath = `${filepath}.gz`;
      
      fs.writeFileSync(compressedPath, compressed);
      fs.unlinkSync(filepath);

      const ratio = ((1 - compressed.length / fileContent.length) * 100).toFixed(1);
      this.logger.log(`Compressed ${path.basename(filepath)} (${ratio}% reduction)`);

      return compressedPath;
    } catch (error) {
      this.logger.error(`Compression failed for ${filepath}:`, error.message);
      return null;
    }
  }

  private async uploadToAzure(filepath: string): Promise<boolean> {
    if (!this.isAzureSyncEnabled()) return false;

    const filename = path.basename(filepath);
    const deviceId = this.configService.get<string>('DEVICE_ID', 'unknown-device');
    const blobPath = `${deviceId}/${filename}`;
    const baseUrl = `https://${this.config.storageAccountName}.blob.core.windows.net`;
    const uploadUrl = `${baseUrl}/${this.config.containerName}/${blobPath}${this.config.sasToken}`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const fileContent = fs.readFileSync(filepath);
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'x-ms-blob-type': 'BlockBlob',
            'Content-Type': 'application/x-gzip',
            'Content-Length': fileContent.length.toString(),
          },
          body: fileContent,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (attempt > 1) {
          this.logger.log(`Upload successful after ${attempt} attempts: ${filename}`);
        }
        return true;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(`Upload failed for ${filename}: ${lastError?.message}`);
    return false;
  }

  private async performSync(): Promise<SyncStatus> {
    if (this.isSyncing) {
      this.logger.warn('Sync already in progress');
      return this.lastSyncStatus!;
    }

    this.isSyncing = true;
    const syncId = `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const startTime = new Date();

    const syncStatus: SyncStatus = {
      syncId,
      startTime,
      status: 'IN_PROGRESS',
      filesAttempted: 0,
      filesSucceeded: 0,
      filesFailed: 0,
      totalBytes: 0,
      errors: [],
    };

    try {
      this.logger.log(`[${syncId}] Starting sync...`);

      const uncompressedFiles = this.getLogFiles().filter(f => !f.isCompressed);
      const compressedPaths: string[] = [];

      for (const file of uncompressedFiles) {
        const compressed = await this.compressLogFile(file.filepath);
        if (compressed) compressedPaths.push(compressed);
      }

      const allCompressedFiles = this.getLogFiles().filter(f => f.isCompressed);
      const filesToUpload = allCompressedFiles.map(f => f.filepath);

      if (filesToUpload.length === 0) {
        syncStatus.status = 'SUCCESS';
        syncStatus.endTime = new Date();
        this.lastSyncStatus = syncStatus;
        this.isSyncing = false;
        return syncStatus;
      }

      syncStatus.filesAttempted = filesToUpload.length;

      for (const filepath of filesToUpload) {
        const success = await this.uploadToAzure(filepath);
        if (success) {
          syncStatus.filesSucceeded++;
          syncStatus.totalBytes += fs.statSync(filepath).size;
          
          if (this.config.deleteAfterSync) {
            try {
              fs.unlinkSync(filepath);
            } catch (error) {
              this.logger.error(`Failed to delete ${filepath}:`, error.message);
            }
          }
        } else {
          syncStatus.filesFailed++;
          syncStatus.errors!.push(`Upload failed: ${path.basename(filepath)}`);
        }
      }

      await this.applyRetentionPolicy();

      if (syncStatus.filesFailed === 0) {
        syncStatus.status = 'SUCCESS';
      } else if (syncStatus.filesSucceeded > 0) {
        syncStatus.status = 'PARTIAL';
      } else {
        syncStatus.status = 'FAILED';
      }

      syncStatus.endTime = new Date();
      const duration = syncStatus.endTime.getTime() - syncStatus.startTime.getTime();

      this.logger.log(
        `[${syncId}] Sync ${syncStatus.status}: ${syncStatus.filesSucceeded}/${syncStatus.filesAttempted} uploaded in ${duration}ms`
      );

      await this.recordSyncStatus(syncStatus);

    } catch (error) {
      syncStatus.status = 'FAILED';
      syncStatus.endTime = new Date();
      syncStatus.errors!.push(error.message);
      this.logger.error(`[${syncId}] Sync failed:`, error.message);
      await this.recordSyncStatus(syncStatus);
    } finally {
      this.isSyncing = false;
      this.lastSyncStatus = syncStatus;
    }

    return syncStatus;
  }

  private async applyRetentionPolicy(): Promise<void> {
    try {
      const logFiles = this.getLogFiles();
      const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - retentionMs);

      for (const file of logFiles) {
        if (file.createdAt < cutoffDate) {
          try {
            fs.unlinkSync(file.filepath);
          } catch (error) {
            this.logger.error(`Failed to delete old log ${file.filename}:`, error.message);
          }
        }
      }
    } catch (error) {
      this.logger.error('Retention policy failed:', error.message);
    }
  }

  private async recordSyncStatus(status: SyncStatus): Promise<void> {
    try {
      await this.writeLog({
        timestamp: new Date().toISOString(),
        level: status.status === 'SUCCESS' ? 'INFO' : status.status === 'PARTIAL' ? 'WARN' : 'ERROR',
        context: 'LogSync',
        message: `Sync ${status.status}`,
        metadata: {
          syncId: status.syncId,
          filesAttempted: status.filesAttempted,
          filesSucceeded: status.filesSucceeded,
          filesFailed: status.filesFailed,
          totalBytes: status.totalBytes,
          duration: status.endTime ? status.endTime.getTime() - status.startTime.getTime() : 0,
        },
      });
    } catch (error) {
      this.logger.error('Failed to record sync status:', error.message);
    }
  }

  private isAzureSyncEnabled(): boolean {
    return (
      this.config.azureSyncEnabled &&
      this.config.storageAccountName !== '' &&
      this.config.sasToken !== ''
    );
  }

  async triggerManualSync(): Promise<SyncStatus> {
    this.logger.log('Manual sync triggered');
    return await this.performSync();
  }

  getLastSyncStatus(): SyncStatus | null {
    return this.lastSyncStatus;
  }
}


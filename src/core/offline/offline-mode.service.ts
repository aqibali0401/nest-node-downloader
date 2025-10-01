import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DatabaseService } from '../database/database.service';

export interface LocalManifest {
  version: string;
  artifact: string;
  checksum: string;
  description: string;
  lastUpdated: string;
  size: number;
  format: string;
  cachedAt: string;
  isLocal: boolean;
}

export interface OfflineResources {
  hasLocalManifest: boolean;
  hasDownloadedFiles: boolean;
  currentVersion?: string;
  availableFiles: string[];
  canRunOffline: boolean;
  lastSyncTime?: string;
}

@Injectable()
export class OfflineModeService {
  private readonly logger = new Logger(OfflineModeService.name);
  private readonly LOCAL_MANIFEST_FILE: string;
  private readonly DOWNLOADS_DIR: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService
  ) {
    this.LOCAL_MANIFEST_FILE = this.configService.get<string>('LOCAL_MANIFEST_FILE', './local-manifest.json');
    this.DOWNLOADS_DIR = this.configService.get<string>('DOWNLOAD_DIR', './downloads');
  }

  /**
   * Check what local resources are available
   */
  async checkLocalResources(): Promise<OfflineResources> {
    this.logger.log('Checking local resources...');
    
    const hasLocalManifest = this.hasLocalManifest();
    const hasDownloadedFiles = this.hasDownloadedFiles();
    const availableFiles = this.getAvailableFiles();
    
    let currentVersion: string | undefined;
    let lastSyncTime: string | undefined;

    if (hasDownloadedFiles) {
      try {
        await this.databaseService.initialize();
        const metadata = await this.databaseService.getMetadata();
        currentVersion = metadata.currentVersion;
        lastSyncTime = metadata.lastUpdated;
      } catch (error) {
        this.logger.warn('Could not read database metadata:', error.message);
      }
    }

    const canRunOffline = hasLocalManifest || hasDownloadedFiles;

    return {
      hasLocalManifest,
      hasDownloadedFiles,
      currentVersion,
      availableFiles,
      canRunOffline,
      lastSyncTime
    };
  }

  /**
   * Check if local manifest exists
   */
  private hasLocalManifest(): boolean {
    return existsSync(this.LOCAL_MANIFEST_FILE);
  }

  /**
   * Check if downloaded files exist
   */
  private hasDownloadedFiles(): boolean {
    if (!existsSync(this.DOWNLOADS_DIR)) {
      return false;
    }

    try {
      const { readdirSync, statSync } = require('fs');
      const files = readdirSync(this.DOWNLOADS_DIR);
      
      return files.some(file => {
        const filePath = join(this.DOWNLOADS_DIR, file);
        const stats = statSync(filePath);
        return stats.isFile() && stats.size > 0;
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Get list of available files
   */
  private getAvailableFiles(): string[] {
    if (!existsSync(this.DOWNLOADS_DIR)) {
      return [];
    }

    try {
      const { readdirSync, statSync } = require('fs');
      const files = readdirSync(this.DOWNLOADS_DIR);
      
      return files.filter(file => {
        const filePath = join(this.DOWNLOADS_DIR, file);
        const stats = statSync(filePath);
        return stats.isFile() && stats.size > 0;
      });
    } catch (error) {
      return [];
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import * as cron from 'node-cron';
import { SimpleDownloaderService } from '../../modules/downloader/services/simple-downloader.service';
import { AppLoggerService } from '../../shared/services/logger.service';

@Injectable()
export class PollingService {
  private readonly logger = new AppLoggerService(PollingService.name);
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor(
    private readonly downloaderService: SimpleDownloaderService,
  ) {}

  /**
   * Start polling for manifest updates every minute
   */
  startPolling(): void {
    if (this.isRunning) {
      this.logger.warn('Polling is already running');
      return;
    }

    this.logger.log('🔄 Starting manifest polling service (every minute)');
    
    // Run every minute: '0 * * * * *'
    this.cronJob = cron.schedule('0 * * * * *', async () => {
      await this.checkForUpdates();
    });

    this.cronJob.start();
    this.isRunning = true;
    
    // Run initial check immediately
    this.checkForUpdates();
  }

  /**
   * Stop polling service
   */
  stopPolling(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
      this.cronJob = null;
    }
    this.isRunning = false;
    this.logger.log('🛑 Polling service stopped');
  }

  /**
   * Check for manifest updates
   */
  private async checkForUpdates(): Promise<void> {
    try {
      this.logger.log('🔍 Checking for manifest updates...');
      
      const result = await this.downloaderService.downloadFromManifest();
      
      if (result && result.success) {
        // Check if there was actually a new download (downloadRecord exists)
        if (result.downloadRecord && result.downloadRecord.fileName) {
          this.logger.log('✅ New updates found and downloaded successfully!');
          this.logger.log(`📁 Downloaded file: ${result.downloadRecord.fileName}`);
          this.logger.log(`📊 File size: ${result.downloadRecord.fileSize} bytes`);
          this.logger.log(`🏷️  Version: ${result.downloadRecord.version}`);
          this.logger.log(`⏱️  Time: ${result.downloadTime}ms`);
        } else {
          // No new updates available
          this.logger.log('ℹ️  No updates available - already up to date');
        }
        
        if (result.errors && result.errors.length > 0) {
          this.logger.warn('⚠️  Some warnings during update:');
          result.errors.forEach(error => this.logger.warn(`   - ${error}`));
        }
      } else {
        this.logger.log('ℹ️  No updates available or download failed');
        if (result && result.errors) {
          result.errors.forEach(error => this.logger.warn(`   - ${error}`));
        }
      }
    } catch (error) {
      this.logger.error('💥 Error checking for updates:', error.message);
    }
  }

  /**
   * Get polling status
   */
  getStatus(): { isRunning: boolean; nextRun?: Date } {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? new Date(Date.now() + 60000) : undefined // Approximate next run in 1 minute
    };
  }
}

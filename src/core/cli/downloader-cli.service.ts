import { Injectable, Logger } from '@nestjs/common';
import { SimpleDownloaderService } from '../../modules/downloader/services/simple-downloader.service';

@Injectable()
export class DownloaderCliService {
  private readonly logger = new Logger(DownloaderCliService.name);

  constructor(
    private readonly downloaderService: SimpleDownloaderService,
  ) {}

  /**
   * Run downloader functionality
   */
  async runDownloader(): Promise<void> {
    this.logger.log('Starting download process...');

    try {
      // Start download process
      const result = await this.downloaderService.downloadFromManifest();

      if (result.success) {
        this.logger.log('Download completed successfully');
        
        // Only log download details if there was an actual download
        if (result.downloadRecord && result.downloadRecord.fileName) {
          this.logger.log(`Downloaded file: ${result.downloadRecord.fileName}`);
          this.logger.log(`File size: ${result.downloadRecord.fileSize} bytes`);
          this.logger.log(`Version: ${result.downloadRecord.version}`);
          this.logger.log(`Status: ${result.downloadRecord.status}`);
        } else {
          this.logger.log('No new download - already up to date');
        }
        
        this.logger.log(`Time: ${result.downloadTime}ms`);
        
        if (result.errors && result.errors.length > 0) {
          this.logger.warn('Some warnings:');
          result.errors.forEach(error => this.logger.warn(`   - ${error}`));
        }
      } else {
        this.logger.error('Download failed');
        if (result.errors) {
          result.errors.forEach(error => this.logger.error(`   - ${error}`));
        }
        // Don't exit on failure, let the application continue running
        this.logger.warn('Continuing application despite download failure...');
      }

    } catch (error) {
      this.logger.error('Download error:', error.message);
      // Don't exit on error, let the application continue running
      this.logger.warn('Continuing application despite download error...');
    }
  }
}

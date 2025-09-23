import { Injectable, Logger } from '@nestjs/common';
import { DownloaderOrchestratorService } from '../../modules/downloader/services/downloader-orchestrator.service';
import { CliOptions, DownloadProgress } from '../../shared/types/cli.types';
import { formatBytes, formatTime } from '../../shared/utils/format.utils';

@Injectable()
export class DownloaderCliService {
  private readonly logger = new Logger(DownloaderCliService.name);

  constructor(
    private readonly downloaderService: DownloaderOrchestratorService,
  ) {}

  /**
   * Run downloader functionality
   */
  async runDownloader(options: CliOptions): Promise<void> {
    this.logger.log('📦 Starting download process...');
    this.logger.log('📋 Download Options:', options);

    // Progress callback for download updates
    const onProgress = (artifactId: string, progress: DownloadProgress) => {
      const speed = formatBytes(progress.speed);
      const eta = formatTime(progress.eta);
      this.logger.log(
        `📥 ${artifactId}: ${progress.percentage}% (${formatBytes(progress.downloaded)}/${formatBytes(progress.total)}) - ${speed}/s - ETA: ${eta}`
      );
    };

    try {
      // Start download process
      let result;
      if (options.artifacts && options.artifacts.length > 0) {
        this.logger.log(`🎯 Downloading specific artifacts: ${options.artifacts.join(', ')}`);
        result = await this.downloaderService.downloadSpecific(options.artifacts, onProgress);
      } else {
        this.logger.log('📦 Downloading latest artifacts from manifest...');
        result = await this.downloaderService.downloadLatest(options, onProgress);
      }

      // Display results
      const stats = this.downloaderService.getDownloadStats(result);
      this.logger.log('📊 Download Statistics:', stats);

      if (result.success) {
        this.logger.log('✅ Download completed successfully!');
        this.logger.log(`📁 Downloaded files location: ${process.env.DOWNLOAD_DIR || './downloads'}`);
      } else {
        this.logger.error('❌ Download failed!');
        if (result.errors) {
          result.errors.forEach(error => this.logger.error(`   - ${error}`));
        }
        process.exit(1);
      }

    } catch (error) {
      this.logger.error('💥 Download error:', error.message);
      process.exit(1);
    }
  }
}

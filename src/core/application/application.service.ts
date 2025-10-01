import { Injectable } from '@nestjs/common';
import { CliService } from '../cli/cli.service';
import { DownloaderCliService } from '../cli/downloader-cli.service';
import { DeviceInfoService } from '../device/device-info.service';
import { AppLoggerService } from '../../shared/services/logger.service';

@Injectable()
export class ApplicationService {
  private readonly logger = new AppLoggerService(ApplicationService.name);

  constructor(
    private readonly cliService: CliService,
    private readonly downloaderCliService: DownloaderCliService,
    private readonly deviceInfoService: DeviceInfoService,
  ) {}

  /**
   * Main application entry point
   */
  async run(): Promise<void> {
    this.logger.log('Starting EdgeSDM Application...');

    // Collect device information first
    try {
      await this.deviceInfoService.collectDeviceInfo();
      const deviceSummary = this.deviceInfoService.getDeviceSummary();
      this.logger.log(`Running on: ${deviceSummary?.hostname} (${deviceSummary?.platform})`);
      this.logger.log(`CPU: ${deviceSummary?.cpu}`);
      this.logger.log(`Memory: ${deviceSummary?.memory}`);
    } catch (error) {
      this.logger.warn('Could not collect device information:', error.message);
    }

    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = this.cliService.parseCommandLineArgs(args);

    // Handle help command
    if (options.help) {
      this.cliService.showHelp();
      process.exit(0);
    }

    // If download options are provided, run downloader
    if (this.cliService.hasDownloadOptions(options)) {
      await this.downloaderCliService.runDownloader();
    } else {
      this.logger.log('EdgeSDM Application started successfully!');
      this.logger.log('Ready for development and testing');
      this.logger.log('Use --help to see download options');
    }
  }
}

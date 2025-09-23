import { Injectable, Logger } from '@nestjs/common';
import { CliService } from '../cli/cli.service';
import { DownloaderCliService } from '../cli/downloader-cli.service';

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(
    private readonly cliService: CliService,
    private readonly downloaderCliService: DownloaderCliService,
  ) {}

  /**
   * Main application entry point
   */
  async run(): Promise<void> {
    this.logger.log('🚀 Starting EdgeSDM Application...');

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
      await this.downloaderCliService.runDownloader(options);
    } else {
      this.logger.log('✅ EdgeSDM Application started successfully!');
      this.logger.log('📝 Ready for development and testing');
      this.logger.log('💡 Use --help to see download options');
    }
  }
}

import { Injectable } from '@nestjs/common';
import { CliOptions } from '../../shared/interfaces/app.interfaces';
import { AppLoggerService } from '../../shared/services/logger.service';

@Injectable()
export class CliService {
  private readonly logger = new AppLoggerService(CliService.name);

  /**
   * Parse command line arguments
   */
  parseCommandLineArgs(args: string[]): CliOptions {
    const options: CliOptions = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--types':
          options.artifactTypes = args[++i]?.split(',') as any[] || [];
          break;
        case '--platform':
          options.targetPlatform = args[++i] as any;
          break;
        case '--concurrent':
          options.maxConcurrentDownloads = parseInt(args[++i]) || 3;
          break;
        case '--validate-signatures':
          options.validateSignatures = true;
          break;
        case '--artifacts':
          options.artifacts = args[++i]?.split(',') || [];
          break;
        case '--help':
          options.help = true;
          break;
      }
    }

    return options;
  }

  /**
   * Check if download options are provided
   */
  hasDownloadOptions(options: CliOptions): boolean {
    return !!(options.artifactTypes || options.targetPlatform || options.artifacts || 
             options.maxConcurrentDownloads || options.validateSignatures);
  }

  /**
   * Show help information
   */
  showHelp(): void {
    console.log(`
EdgeSDM - Edge Software Deployment Manager

Usage: npm run start [options]

Options:
  --types <types>           Comma-separated list of artifact types to download
  --platform <platform>     Target platform filter
  --concurrent <number>     Maximum concurrent downloads (default: 3)
  --validate-signatures     Validate manifest signatures
  --artifacts <ids>         Comma-separated list of specific artifact IDs to download
  --help                    Show this help message

Environment Variables:
  MANIFEST_URL              URL to fetch the manifest from (default: mock)
  DOWNLOAD_DIR              Directory to save downloaded files (default: ./downloads)

Examples:
  npm run start                                    # Start application
  npm run start -- --types binary,library         # Download only binary and library artifacts
  npm run start -- --artifacts artifact1,artifact2 # Download specific artifacts
  npm run start -- --platform linux --concurrent 5 # Download for Linux platform with 5 concurrent downloads
`);
  }
}

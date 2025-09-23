import { Module } from '@nestjs/common';
import { CliService } from './cli.service';
import { DownloaderCliService } from './downloader-cli.service';
import { DownloaderModule } from '../../modules/downloader/downloader.module';

@Module({
  imports: [DownloaderModule],
  providers: [CliService, DownloaderCliService],
  exports: [CliService, DownloaderCliService],
})
export class CliModule {}

import { Module } from '@nestjs/common';
import { PollingService } from './polling.service';
import { DownloaderModule } from '../../modules/downloader/downloader.module';

@Module({
  imports: [DownloaderModule],
  providers: [PollingService],
  exports: [PollingService],
})
export class PollingModule {}

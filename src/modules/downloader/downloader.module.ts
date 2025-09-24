import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SimpleDownloaderService } from './services/simple-downloader.service';

@Module({
  imports: [ConfigModule],
  providers: [
    SimpleDownloaderService,
  ],
  exports: [
    SimpleDownloaderService,
  ],
})
export class DownloaderModule {}
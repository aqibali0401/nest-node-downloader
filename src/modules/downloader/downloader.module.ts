import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SimpleDownloaderService } from './services/simple-downloader.service';
import { DatabaseModule } from '../../core/database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    SimpleDownloaderService,
  ],
  exports: [
    SimpleDownloaderService,
  ],
})
export class DownloaderModule {}
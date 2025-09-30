import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SimpleDownloaderService } from './services/simple-downloader.service';
import { DatabaseModule } from '../../core/database/database.module';
import { NetworkModule } from '../../core/network/network.module';
import { IoTUpdateModule } from '../../core/iot-update/iot-update.module';

@Module({
  imports: [ConfigModule, DatabaseModule, NetworkModule, IoTUpdateModule],
  providers: [
    SimpleDownloaderService,
  ],
  exports: [
    SimpleDownloaderService,
  ],
})
export class DownloaderModule {}
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SimpleDownloaderService } from './services/simple-downloader.service';
import { DatabaseModule } from '../../core/database/database.module';
import { NetworkModule } from '../../core/network/network.module';
import { IoTUpdateModule } from '../../core/iot-update/iot-update.module';
import { ServiceModule } from '../../core/service/service.module';
import { AzureStorageService } from '../../azure_storage/azure_storage.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    NetworkModule,
    IoTUpdateModule,
    ServiceModule,
  ],
  providers: [SimpleDownloaderService, AzureStorageService],
  exports: [SimpleDownloaderService],
})
export class DownloaderModule {}

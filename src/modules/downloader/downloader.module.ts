import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SimpleDownloaderService } from './services/simple-downloader.service';
import { DatabaseModule } from '../../core/database/database.module';
import { NetworkModule } from '../../core/network/network.module';
import { IoTUpdateModule } from '../../core/iot-update/iot-update.module';
import { ServiceModule } from '../../core/service/service.module';
import { EventNotificationService } from '../../shared/services/event-notification.service';
import { RateLimiterService } from '../../shared/services/rate-limiter.service';

@Module({
  imports: [ConfigModule, DatabaseModule, NetworkModule, IoTUpdateModule, ServiceModule],
  providers: [
    SimpleDownloaderService,
    EventNotificationService,
    RateLimiterService,
  ],
  exports: [
    SimpleDownloaderService,
  ],
})
export class DownloaderModule {}
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApplicationModule } from './core/application/application.module';
import { AppConfigService } from './core/config/app.config';
import { DatabaseModule } from './core/database/database.module';
import { NetworkModule } from './core/network/network.module';
import { CrashModule } from './core/crash/crash.module';
import { RecoveryModule } from './core/recovery/recovery.module';
import { DeviceModule } from './core/device/device.module';
import { SharedModule } from './shared/shared.module';
import { DownloaderModule } from './modules/downloader/downloader.module';
import { OfflineModule } from './core/offline/offline.module';
import { IoTUpdateModule } from './core/iot-update/iot-update.module';
import { ServiceModule } from './core/service/service.module';
import { AuthModule } from './auth/auth.module';
import { AzureGatewayModule } from './core/azure-gateway/azure-gateway.module';
import { LoggingModule } from './core/logging/logging.module';
import { NotificationModule } from './notifications/notification.module';

@Module({
  imports: [
    SharedModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      expandVariables: true,
    }),
    LoggingModule,
    DatabaseModule,
    NetworkModule,
    CrashModule,
    RecoveryModule,
    DeviceModule,
    OfflineModule,
    ApplicationModule,
    DownloaderModule,
    IoTUpdateModule,
    ServiceModule,
    AuthModule,
    AzureGatewayModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [AppConfigService],
})
export class AppModule {}

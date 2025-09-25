import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApplicationModule } from './core/application/application.module';
import { AppConfigService } from './core/config/app.config';
import { DatabaseModule } from './core/database/database.module';
import { NetworkModule } from './core/network/network.module';
import { CrashModule } from './core/crash/crash.module';
import { RecoveryModule } from './core/recovery/recovery.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    SharedModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      expandVariables: true,
    }),
    DatabaseModule,
    NetworkModule,
    CrashModule,
    RecoveryModule,
    ApplicationModule,
  ],
  controllers: [],
  providers: [AppConfigService],
})
export class AppModule {}

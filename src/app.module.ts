import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApplicationModule } from './core/application/application.module';
import { AppConfigService } from './core/config/app.config';
import { DatabaseModule } from './core/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    ApplicationModule,
  ],
  controllers: [],
  providers: [AppConfigService],
})
export class AppModule {}

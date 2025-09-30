import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IoTUpdateService } from './iot-update.service';

@Module({
  imports: [ConfigModule],
  providers: [IoTUpdateService],
  exports: [IoTUpdateService],
})
export class IoTUpdateModule {}

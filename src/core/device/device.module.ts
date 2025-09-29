import { Module } from '@nestjs/common';
import { DeviceInfoService } from './device-info.service';

@Module({
  providers: [DeviceInfoService],
  exports: [DeviceInfoService],
})
export class DeviceModule {}

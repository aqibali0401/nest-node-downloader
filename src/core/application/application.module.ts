import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { CliModule } from '../cli/cli.module';
import { DeviceModule } from '../device/device.module';

@Module({
  imports: [CliModule, DeviceModule],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}

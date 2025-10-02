import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { CliModule } from '../cli/cli.module';
import { DeviceModule } from '../device/device.module';
import { PollingModule } from '../polling/polling.module';

@Module({
  imports: [CliModule, DeviceModule, PollingModule],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}

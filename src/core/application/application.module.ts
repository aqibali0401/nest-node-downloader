import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { CliModule } from '../cli/cli.module';

@Module({
  imports: [CliModule],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}

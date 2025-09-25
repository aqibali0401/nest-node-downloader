import { Module } from '@nestjs/common';
import { CrashService } from './crash.service';

/**
 * Crash simulation module for testing recovery mechanisms
 */
@Module({
  providers: [CrashService],
  exports: [CrashService],
})
export class CrashModule {}
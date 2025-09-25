import { Module } from '@nestjs/common';
import { CrashService } from './crash.service';
import { CrashSimulationService } from './crash-simulation.service';

/**
 * Crash simulation module for testing recovery mechanisms
 */
@Module({
  providers: [CrashService, CrashSimulationService],
  exports: [CrashService, CrashSimulationService],
})
export class CrashModule {}
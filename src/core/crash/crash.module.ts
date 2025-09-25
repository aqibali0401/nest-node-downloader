import { Module } from '@nestjs/common';
import { CrashSimulationService } from './crash-simulation.service';

@Module({
  providers: [CrashSimulationService],
  exports: [CrashSimulationService],
})
export class CrashModule {}

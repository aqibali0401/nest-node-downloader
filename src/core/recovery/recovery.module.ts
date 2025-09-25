import { Module } from '@nestjs/common';
import { RecoveryService } from './recovery.service';

/**
 * Recovery module for process recovery and state persistence
 */
@Module({
  providers: [RecoveryService],
  exports: [RecoveryService],
})
export class RecoveryModule {}
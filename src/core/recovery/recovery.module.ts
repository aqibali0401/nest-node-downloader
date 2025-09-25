import { Module } from '@nestjs/common';
import { RecoveryService } from './recovery.service';
import { ProcessRecoveryService } from './process-recovery.service';
import { DatabaseModule } from '../database/database.module';
import { NetworkModule } from '../network/network.module';

/**
 * Recovery module for process recovery and state persistence
 */
@Module({
  imports: [DatabaseModule, NetworkModule],
  providers: [RecoveryService, ProcessRecoveryService],
  exports: [RecoveryService, ProcessRecoveryService],
})
export class RecoveryModule {}
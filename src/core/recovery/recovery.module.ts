import { Module } from '@nestjs/common';
import { ProcessRecoveryService } from './process-recovery.service';
import { DatabaseModule } from '../database/database.module';
import { NetworkModule } from '../network/network.module';

@Module({
  imports: [DatabaseModule, NetworkModule],
  providers: [ProcessRecoveryService],
  exports: [ProcessRecoveryService],
})
export class RecoveryModule {}

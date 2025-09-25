import { Module } from '@nestjs/common';
import { OfflineModeService } from './offline-mode.service';
import { DatabaseModule } from '../database/database.module';

/**
 * Offline mode module for handling cached resources and offline operations
 */
@Module({
  imports: [DatabaseModule],
  providers: [OfflineModeService],
  exports: [OfflineModeService],
})
export class OfflineModule {}

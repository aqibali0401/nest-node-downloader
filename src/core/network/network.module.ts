import { Module } from '@nestjs/common';
import { NetworkService } from './network.service';

/**
 * Network module for connectivity testing and monitoring
 */
@Module({
  providers: [NetworkService],
  exports: [NetworkService],
})
export class NetworkModule {}
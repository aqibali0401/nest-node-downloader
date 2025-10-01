import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NssmService } from './nssm.service';

@Module({
  imports: [ConfigModule],
  providers: [NssmService],
  exports: [NssmService],
})
export class ServiceModule {}

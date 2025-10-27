import { Module } from '@nestjs/common';
import { AzureGatewayClientService } from './azure-gateway-client.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [AzureGatewayClientService],
  exports: [AzureGatewayClientService],
})
export class AzureGatewayModule {}

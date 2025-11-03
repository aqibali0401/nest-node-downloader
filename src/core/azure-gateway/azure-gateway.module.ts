import { Module } from '@nestjs/common';
import { AzureGatewayClientService } from './azure-gateway-client.service';
import { AuthModule } from '../../auth/auth.module';
import { KeyVaultModule } from '../keyvault/keyvault.module';

@Module({
  imports: [AuthModule, KeyVaultModule],
  providers: [AzureGatewayClientService],
  exports: [AzureGatewayClientService],
})
export class AzureGatewayModule {}

import { Module } from '@nestjs/common';
import { AzureKeyVaultService } from './keyvault.service';

@Module({
  providers: [AzureKeyVaultService],
  exports: [AzureKeyVaultService],
})
export class KeyVaultModule {}



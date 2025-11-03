import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential, ManagedIdentityCredential, ClientSecretCredential } from '@azure/identity';
import { AppLoggerService } from '../../shared/services/logger.service';

export interface KeyVaultConfig {
  vaultUrl: string;
  enabled: boolean;
  credentialType: 'default' | 'managed-identity' | 'client-secret';
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
}

@Injectable()
export class AzureKeyVaultService implements OnModuleInit {
  private readonly logger = new AppLoggerService(AzureKeyVaultService.name);
  private secretClient: SecretClient | null = null;
  private readonly config: KeyVaultConfig;
  private secretsCache: Map<string, { value: string; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

  constructor(private readonly configService: ConfigService) {
    this.config = {
      vaultUrl: this.configService.get<string>('AZURE_KEY_VAULT_URL', ''),
      enabled: this.configService.get<boolean>('AZURE_KEY_VAULT_ENABLED', false),
      credentialType: this.configService.get<string>('AZURE_KEY_VAULT_CREDENTIAL_TYPE', 'default') as 'default' | 'managed-identity' | 'client-secret',
      tenantId: this.configService.get<string>('AZURE_KEY_VAULT_TENANT_ID', ''),
      clientId: this.configService.get<string>('AZURE_KEY_VAULT_CLIENT_ID', ''),
      clientSecret: this.configService.get<string>('AZURE_KEY_VAULT_CLIENT_SECRET', ''),
    };
  }

  async onModuleInit() {
    if (this.config.enabled && this.config.vaultUrl) {
      try {
        await this.initialize();
        this.logger.log('Azure Key Vault initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Azure Key Vault:', error.message);
        this.logger.warn('Application will continue without Key Vault integration');
      }
    } else {
      this.logger.log('Azure Key Vault is disabled or not configured');
    }
  }

  /**
   * Initialize Azure Key Vault client
   */
  private async initialize(): Promise<void> {
    if (!this.config.vaultUrl) {
      throw new Error('Azure Key Vault URL is not configured');
    }

    try {
      let credential;

      switch (this.config.credentialType) {
        case 'managed-identity':
          if (!this.config.clientId) {
            throw new Error('Client ID is required for managed identity authentication');
          }
          credential = new ManagedIdentityCredential({
            clientId: this.config.clientId,
          });
          this.logger.log('Using Managed Identity authentication for Key Vault');
          break;

        case 'client-secret':
          if (!this.config.tenantId || !this.config.clientId || !this.config.clientSecret) {
            throw new Error('Tenant ID, Client ID, and Client Secret are required for client secret authentication');
          }
          credential = new ClientSecretCredential(
            this.config.tenantId,
            this.config.clientId,
            this.config.clientSecret,
          );
          this.logger.log('Using Client Secret authentication for Key Vault');
          break;

        case 'default':
        default:
          // DefaultAzureCredential tries multiple authentication methods:
          // 1. Environment variables (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID)
          // 2. Managed Identity (if running on Azure)
          // 3. Azure CLI (if logged in)
          credential = new DefaultAzureCredential();
          this.logger.log('Using Default Azure Credential for Key Vault');
          break;
      }

      this.secretClient = new SecretClient(this.config.vaultUrl, credential);
      
      // Test connection by getting vault URL
      this.logger.log(`Connected to Azure Key Vault: ${this.config.vaultUrl}`);
    } catch (error) {
      this.logger.error('Failed to initialize Azure Key Vault client:', error.message);
      throw error;
    }
  }

  /**
   * Get secret from Azure Key Vault
   * @param secretName Name of the secret
   * @param useCache Whether to use cached value (default: true)
   * @returns Secret value or null if not found
   */
  async getSecret(secretName: string, useCache: boolean = true): Promise<string | null> {
    if (!this.config.enabled || !this.secretClient) {
      this.logger.warn(`Key Vault is not enabled or initialized. Cannot fetch secret: ${secretName}`);
      return null;
    }

    // Check cache first
    if (useCache) {
      const cached = this.secretsCache.get(secretName);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.debug(`Retrieved secret '${secretName}' from cache`);
        return cached.value;
      }
    }

    try {
      this.logger.debug(`Fetching secret '${secretName}' from Azure Key Vault`);
      const secret = await this.secretClient.getSecret(secretName);
      
      if (secret && secret.value) {
        // Cache the secret
        this.secretsCache.set(secretName, {
          value: secret.value,
          expiresAt: Date.now() + this.CACHE_TTL_MS,
        });
        
        this.logger.debug(`Successfully retrieved secret '${secretName}' from Key Vault`);
        return secret.value;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get secret '${secretName}' from Key Vault:`, error.message);
      
      // If secret not found, return null (don't throw)
      if (error.statusCode === 404) {
        this.logger.warn(`Secret '${secretName}' not found in Key Vault`);
        return null;
      }
      
      throw error;
    }
  }

  /**
   * Get multiple secrets from Azure Key Vault
   * @param secretNames Array of secret names
   * @returns Map of secret names to their values
   */
  async getSecrets(secretNames: string[]): Promise<Map<string, string>> {
    const secrets = new Map<string, string>();
    
    if (!this.config.enabled || !this.secretClient) {
      this.logger.warn('Key Vault is not enabled or initialized');
      return secrets;
    }

    const promises = secretNames.map(async (name) => {
      const value = await this.getSecret(name);
      if (value) {
        secrets.set(name, value);
      }
    });

    await Promise.all(promises);
    return secrets;
  }

  /**
   * Set secret in Azure Key Vault
   * @param secretName Name of the secret
   * @param secretValue Value of the secret
   */
  async setSecret(secretName: string, secretValue: string): Promise<void> {
    if (!this.config.enabled || !this.secretClient) {
      throw new Error('Key Vault is not enabled or initialized');
    }

    try {
      this.logger.log(`Setting secret '${secretName}' in Azure Key Vault`);
      await this.secretClient.setSecret(secretName, secretValue);
      
      // Update cache
      this.secretsCache.set(secretName, {
        value: secretValue,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });
      
      this.logger.log(`Successfully set secret '${secretName}' in Key Vault`);
    } catch (error) {
      this.logger.error(`Failed to set secret '${secretName}' in Key Vault:`, error.message);
      throw error;
    }
  }

  /**
   * Delete secret from Azure Key Vault
   * @param secretName Name of the secret
   */
  async deleteSecret(secretName: string): Promise<void> {
    if (!this.config.enabled || !this.secretClient) {
      throw new Error('Key Vault is not enabled or initialized');
    }

    try {
      this.logger.log(`Deleting secret '${secretName}' from Azure Key Vault`);
      await this.secretClient.beginDeleteSecret(secretName);
      
      // Remove from cache
      this.secretsCache.delete(secretName);
      
      this.logger.log(`Successfully deleted secret '${secretName}' from Key Vault`);
    } catch (error) {
      this.logger.error(`Failed to delete secret '${secretName}' from Key Vault:`, error.message);
      throw error;
    }
  }

  /**
   * Clear secrets cache
   */
  clearCache(): void {
    this.secretsCache.clear();
    this.logger.debug('Secrets cache cleared');
  }

  /**
   * Check if Key Vault is enabled and initialized
   */
  isEnabled(): boolean {
    return this.config.enabled && this.secretClient !== null;
  }

  /**
   * Get Key Vault configuration
   */
  getConfig(): KeyVaultConfig {
    return { ...this.config };
  }
}



import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '../../auth/jwt.service';
import { AppLoggerService } from '../../shared/services/logger.service';
import { AzureKeyVaultService } from '../keyvault/keyvault.service';
import { APP_CONSTANTS } from '../../shared/constants/app.constants';
import { FileFormat } from '../../shared/enums/app.enums';

export interface AzureGatewayConfig {
  baseUrl: string;
  subscriptionKey: string;
  deviceId: string;
  deviceToken: string;
  azureAuthToken?: string; // Optional Azure AD token or SAS token
}

/**
 * Gateway Manifest Schema
 * Standardized format for manifest files from Azure Gateway
 */
export interface GatewayManifest {
  version: string;
  artifact: string;
  checksum: string;
  description: string;
  lastUpdated: string;
  size: number;
  format: FileFormat;
  targetApp?: string;
}

@Injectable()
export class AzureGatewayClientService implements OnModuleInit {
  private readonly logger = new AppLoggerService(AzureGatewayClientService.name);
  private config: AzureGatewayConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly keyVaultService: AzureKeyVaultService,
  ) {
    // Initialize with default values, will be updated in onModuleInit if Key Vault is enabled
    const deviceId = this.configService.get<string>('DEVICE_ID', 'device-' + Date.now());
    const providedToken = this.configService.get<string>('DEVICE_TOKEN', '');
    const deviceToken = providedToken || this.generateDeviceToken(deviceId);
    
    this.config = {
      baseUrl: this.configService.get<string>('AZURE_GATEWAY_URL', 'https://qsc-gateway-apim.azure-api.net'),
      subscriptionKey: this.configService.get<string>('AZURE_SUBSCRIPTION_KEY', ''),
      deviceId,
      deviceToken,
      azureAuthToken: this.configService.get<string>('AZURE_AUTH_TOKEN', ''),
    };
  }

  async onModuleInit() {
    // Load secrets from Key Vault if enabled
    if (this.keyVaultService.isEnabled()) {
      await this.loadSecretsFromKeyVault();
    } else {
      this.logger.log('Azure Key Vault is disabled, using environment variables');
    }
  }

  /**
   * Load secrets from Azure Key Vault
   * Secrets are loaded from Key Vault and override environment variables
   */
  private async loadSecretsFromKeyVault(): Promise<void> {
    try {
      this.logger.log('Loading secrets from Azure Key Vault...');

      // Key Vault secret names (can be configured via env vars)
      const secretNames = {
        subscriptionKey: this.configService.get<string>('AZURE_KV_SECRET_SUBSCRIPTION_KEY', 'azure-subscription-key'),
        authToken: this.configService.get<string>('AZURE_KV_SECRET_AUTH_TOKEN', 'azure-auth-token'),
        gatewayUrl: this.configService.get<string>('AZURE_KV_SECRET_GATEWAY_URL', 'azure-gateway-url'),
      };

      // Fetch secrets from Key Vault (non-blocking - fallback to env vars if not found)
      const [subscriptionKey, authToken, gatewayUrl] = await Promise.all([
        this.keyVaultService.getSecret(secretNames.subscriptionKey),
        this.keyVaultService.getSecret(secretNames.authToken),
        this.keyVaultService.getSecret(secretNames.gatewayUrl),
      ]);

      // Update config with Key Vault secrets (only if found)
      if (subscriptionKey) {
        this.config.subscriptionKey = subscriptionKey;
        this.logger.log('Loaded Azure Subscription Key from Key Vault');
      }

      if (authToken) {
        this.config.azureAuthToken = authToken;
        this.logger.log('Loaded Azure Auth Token from Key Vault');
      }

      if (gatewayUrl) {
        this.config.baseUrl = gatewayUrl;
        this.logger.log('Loaded Azure Gateway URL from Key Vault');
      }

      this.logger.log('Successfully loaded secrets from Azure Key Vault');
    } catch (error) {
      this.logger.error('Failed to load secrets from Key Vault:', error.message);
      this.logger.warn('Continuing with environment variables');
    }
  }

  private generateDeviceToken(deviceId: string): string {
    const payload = {
      deviceId,
      timestamp: Date.now(),
      type: 'device',
      version: '1.0.0'
    };
    
    return this.jwtService.generateToken(payload);
  }

  /**
   * Validate authentication token before manifest access
   * Checks token validity and expiry
   */
  private validateToken(): void {
    // Validate subscription key (required)
    if (!this.config.subscriptionKey || this.config.subscriptionKey.trim() === '') {
      this.logger.error('[AUTH_VALIDATION] Subscription key is missing');
      throw new Error('Unauthorized: Subscription key is required');
    }

    // Validate Azure Auth Token if provided
    if (this.config.azureAuthToken) {
      try {
        // Try to decode and validate JWT token if it's a JWT
        const decoded = this.jwtService.decodeToken(this.config.azureAuthToken);
        
        if (decoded && decoded.exp) {
          // Check if token is expired
          const currentTime = Math.floor(Date.now() / 1000);
          if (decoded.exp < currentTime) {
            this.logger.error('[AUTH_VALIDATION] Token has expired');
            throw new Error('Unauthorized: Token has expired');
          }
        }

        // Verify token signature if it's a JWT
        try {
          this.jwtService.verifyToken(this.config.azureAuthToken);
        } catch (verifyError) {
          // If verification fails, it might be a non-JWT token (like Azure AD token)
          // In that case, we'll let the gateway validate it
          this.logger.debug('[AUTH_VALIDATION] Token is not a JWT, will be validated by gateway');
        }
      } catch (error) {
        if (error.message.includes('expired') || error.message.includes('Unauthorized')) {
          throw error;
        }
        // If decode fails, it might be a non-JWT token, continue
        this.logger.debug('[AUTH_VALIDATION] Token validation skipped (non-JWT token)');
      }
    }

    this.logger.debug('[AUTH_VALIDATION] Token validation passed');
  }

  /**
   * Build authentication headers for Azure API Management requests
   */
  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Azure API Management subscription key if provided
    // This is the PRIMARY authentication method for Azure API Management
    if (this.config.subscriptionKey) {
      headers['Ocp-Apim-Subscription-Key'] = this.config.subscriptionKey;
    }

    // Only add Authorization header if Azure Auth Token is explicitly provided
    // Do NOT use deviceToken as Authorization header - it causes 403 errors
    // Azure API Management expects proper Azure AD token or SAS token, not custom JWT
    if (this.config.azureAuthToken) {
      headers['Authorization'] = `Bearer ${this.config.azureAuthToken}`;
    }
    // Note: If azureAuthToken is not provided, we rely on subscription key only
    // This is the standard way to authenticate with Azure API Management

    return headers;
  }

  /**
   * Fetch manifest from Azure Gateway with retry mechanism
   * Logs every manifest fetch request
   */
  async fetchManifest(maxRetries: number = APP_CONSTANTS.MAX_RETRY_ATTEMPTS): Promise<{ success: boolean; manifest: GatewayManifest; requestId: string; responseTime: number }> {
    const requestId = this.generateRequestId();
    const url = `${this.config.baseUrl}/manifest-updated.json`;
    let lastError: Error | null = null;

    // Validate token before manifest access
    this.validateToken();

    this.logger.log(`[MANIFEST_FETCH] Request ID: ${requestId}, Fetching manifest from Azure Gateway (max retries: ${maxRetries})...`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();

      try {
        const headers = this.buildAuthHeaders();

        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          
          // Reject unauthorized access with error
          if (response.status === 401 || response.status === 403) {
            lastError = new Error(`Unauthorized: ${errorMessage}`);
            this.logger.error(`[MANIFEST_FETCH] Request ID: ${requestId}, Unauthorized access rejected: ${errorMessage}, Response Time: ${responseTime}ms`);
            throw lastError;
          }
          
          lastError = new Error(errorMessage);
          this.logger.error(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}/${maxRetries} Failed: ${errorMessage}, Response Time: ${responseTime}ms`);

          if (attempt < maxRetries) {
            const delay = attempt * APP_CONSTANTS.RETRY_DELAY_MS;
            this.logger.log(`[MANIFEST_FETCH] Request ID: ${requestId}, Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw lastError;
        }

        const manifest = await response.json() as GatewayManifest;

        this.logger.log(`[MANIFEST_FETCH] Request ID: ${requestId}, Success: Version ${manifest.version}, Response Time: ${responseTime}ms, Attempt: ${attempt}`);

        return {
          success: true,
          manifest: manifest,
          requestId,
          responseTime,
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}/${maxRetries} Error: ${lastError.message}, Response Time: ${responseTime}ms`);

        if (attempt < maxRetries) {
          const delay = attempt * APP_CONSTANTS.RETRY_DELAY_MS;
          this.logger.log(`[MANIFEST_FETCH] Request ID: ${requestId}, Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          this.logger.error(`[MANIFEST_FETCH] Request ID: ${requestId}, All ${maxRetries} attempts failed`);
          throw lastError;
        }
      }
    }

    throw lastError || new Error('Failed to fetch manifest');
  }

  /**
   * Force manual refresh of manifest from gateway
   */
  async forceRefreshManifest(): Promise<{ success: boolean; manifest: GatewayManifest; requestId: string; responseTime: number }> {
    this.logger.log('[MANIFEST_REFRESH] Manual manifest refresh triggered');
    return await this.fetchManifest();
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Request approval for manifest update
   */
  async requestApproval(manifestId: string): Promise<any> {
    try {
      this.logger.log(`Requesting approval for manifest: ${manifestId}`);
      
      const url = `${this.config.baseUrl}/qsc-gateway/approval/request`;
      const headers = this.buildAuthHeaders();

      const body = {
        manifestId,
        userId: this.config.deviceId,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.logger.log('Approval request submitted successfully');
      
      return result;
    } catch (error) {
      this.logger.error('Failed to request approval:', error.message);
      throw error;
    }
  }

  /**
   * Check approval status
   */
  async checkApprovalStatus(manifestId: string): Promise<any> {
    try {
      this.logger.log(`Checking approval status for manifest: ${manifestId}`);
      
      const url = `${this.config.baseUrl}/qsc-gateway/approval?manifestId=${manifestId}`;
      const headers = this.buildAuthHeaders();

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.logger.log('Approval status checked successfully');
      
      return result;
    } catch (error) {
      this.logger.error('Failed to check approval status:', error.message);
      throw error;
    }
  }

  /**
   * Execute rollback
   */
  async executeRollback(targetVersion: string): Promise<any> {
    try {
      this.logger.log(`Executing rollback to version: ${targetVersion}`);
      
      const url = `${this.config.baseUrl}/qsc-gateway/rollback/execute`;
      const headers = this.buildAuthHeaders();

      const body = {
        deviceId: this.config.deviceId,
        targetVersion,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.logger.log('Rollback executed successfully');
      
      return result;
    } catch (error) {
      this.logger.error('Failed to execute rollback:', error.message);
      throw error;
    }
  }

  /**
   * Get device configuration
   */
  getConfig(): AzureGatewayConfig {
    return this.config;
  }

  /**
   * Test Azure Gateway connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      this.logger.log('Testing Azure Gateway connectivity...');
      
      const url = `${this.config.baseUrl}/manifest (1).json`;
      const headers = this.buildAuthHeaders();

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      // Even if we get 401/403, it means gateway is reachable
      const isReachable = response.status !== 0 && response.status < 500;
      
      this.logger.log(`Azure Gateway connectivity test: ${isReachable ? 'SUCCESS' : 'FAILED'}`);
      
      return isReachable;
    } catch (error) {
      this.logger.error('Azure Gateway connectivity test failed:', error.message);
      return false;
    }
  }
}

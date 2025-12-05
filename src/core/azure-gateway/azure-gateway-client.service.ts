import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '../../auth/jwt.service';
import { AppLoggerService } from '../../shared/services/logger.service';
import { AzureKeyVaultService } from '../keyvault/keyvault.service';
import { APP_CONSTANTS } from '../../shared/constants/app.constants';
import { FileFormat } from '../../shared/enums/app.enums';
import { NotificationService } from '../../notifications/notification.service';
import { NotificationEventType } from '../../notifications/interfaces/notification.interface';

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
  targetApp: string; // Required: Target application name (e.g., "agent-v1.0.1-2025-11-03T12:58-06-848Z")
  targetPath?: string; // Optional: Target installation/extraction path for the artifact
}

@Injectable()
export class AzureGatewayClientService implements OnModuleInit {
  private readonly logger = new AppLoggerService(AzureGatewayClientService.name);
  private config: AzureGatewayConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly keyVaultService: AzureKeyVaultService,
    private readonly notificationService: NotificationService,
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
   * Validate manifest structure and required fields
   * Checks for missing or invalid fields according to acceptance criteria
   */
  private validateManifest(manifest: any): void {
    const requiredFields = ['version', 'checksum', 'artifact', 'targetApp'];
    const missingFields: string[] = [];
    const invalidFields: string[] = [];

    // Check for missing required fields
    for (const field of requiredFields) {
      if (!manifest[field]) {
        missingFields.push(field);
      }
    }

    // Check for invalid field values
    if (manifest.version && typeof manifest.version !== 'string') {
      invalidFields.push('version (must be string)');
    }

    if (manifest.checksum && typeof manifest.checksum !== 'string') {
      invalidFields.push('checksum (must be string)');
    }

    if (manifest.artifact && typeof manifest.artifact !== 'string') {
      invalidFields.push('artifact (must be string URL)');
    }

    if (manifest.size && typeof manifest.size !== 'number') {
      invalidFields.push('size (must be number)');
    }

    if (manifest.format && !['zip', 'tar', 'exe', 'msi', 'deb', 'rpm'].includes(manifest.format)) {
      invalidFields.push('format (must be valid format: zip, tar, exe, msi, deb, rpm)');
    }

    // Report validation errors
    if (missingFields.length > 0 || invalidFields.length > 0) {
      let errorMessage = '[MANIFEST_VALIDATION] Manifest validation failed:\n';
      
      if (missingFields.length > 0) {
        errorMessage += `  Missing required fields: ${missingFields.join(', ')}\n`;
      }
      
      if (invalidFields.length > 0) {
        errorMessage += `  Invalid fields: ${invalidFields.join(', ')}\n`;
      }

      this.logger.error(errorMessage);
      throw new Error(`Invalid Manifest: ${missingFields.length > 0 ? 'Missing fields: ' + missingFields.join(', ') : 'Invalid field values'}`);
    }

    this.logger.debug('[MANIFEST_VALIDATION] Manifest validation passed');
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
   * Fetch manifest from Azure Gateway with infinite retry mechanism
   * First validates authentication (throws error if invalid)
   * Then retries manifest fetch indefinitely until success
   * Uses exponential backoff with a maximum delay cap
   */
  async fetchManifest(): Promise<{ success: boolean; manifest: GatewayManifest; requestId: string; responseTime: number }> {
    const requestId = this.generateRequestId();
    const url = `${this.config.baseUrl}/manifest-updated.json`;
    const MAX_RETRY_DELAY = 60000; // Max 60 seconds between retries
    const BASE_RETRY_DELAY = APP_CONSTANTS.RETRY_DELAY_MS || 2000; // Base delay (2 seconds)
    let attempt = 0;

    // ========================================
    // STEP 1: STRICT AUTHENTICATION VALIDATION
    // ========================================
    // This must pass before we start infinite retries
    // If authentication fails, throw error and stop
    this.logger.log(`[AUTH_CHECK] Request ID: ${requestId}, Validating authentication credentials...`);
    try {
      this.validateToken();
      this.logger.log(`[AUTH_CHECK] Request ID: ${requestId}, ✓ Authentication validation passed`);
    } catch (error) {
      this.logger.error(`[AUTH_CHECK] Request ID: ${requestId}, ✗ Authentication validation FAILED: ${error.message}`);
      this.logger.error(`[AUTH_CHECK] Request ID: ${requestId}, Cannot proceed without valid authentication`);
      
      this.notificationService.sendFailureNotification(
        NotificationEventType.AUTHENTICATION_FAILED,
        error,
        { requestId, gatewayUrl: this.config.baseUrl },
      ).catch(() => {});
      
      throw new Error(`Authentication Failed: ${error.message}`);
    }

    // ========================================
    // STEP 2: INFINITE RETRY FOR MANIFEST FETCH
    // ========================================
    // Authentication passed, now retry manifest fetch forever
    this.logger.log(`[MANIFEST_FETCH] Request ID: ${requestId}, Authentication successful! Starting infinite retry mechanism for manifest fetch...`);

    // Infinite retry loop - never give up!
    while (true) {
      attempt++;
      const startTime = Date.now();

      try {
        const headers = this.buildAuthHeaders();

        this.logger.log(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}: Fetching manifest from ${url}...`);

        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          
          // Log unauthorized access (shouldn't happen since we validated auth)
          if (response.status === 401 || response.status === 403) {
            this.logger.error(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}: Unauthorized access - ${errorMessage}, Response Time: ${responseTime}ms`);
            this.logger.warn(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}: Gateway rejected request. Token may have expired. Will retry...`);
          } else {
            this.logger.error(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}: Failed - ${errorMessage}, Response Time: ${responseTime}ms`);
          }
          
          // Calculate exponential backoff delay with cap
          const delay = Math.min(BASE_RETRY_DELAY * Math.pow(1.5, Math.min(attempt - 1, 10)), MAX_RETRY_DELAY);
          this.logger.log(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}: Retrying in ${(delay / 1000).toFixed(1)}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        const manifest = await response.json() as GatewayManifest;

        // Validate manifest structure and required fields
        try {
          this.validateManifest(manifest);
        } catch (validationError) {
          this.logger.error(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}: Manifest validation failed - ${validationError.message}`);
          
          this.notificationService.sendFailureNotification(
            NotificationEventType.VALIDATION_FAILED,
            validationError,
            { requestId, attempt, manifest },
          ).catch(() => {});
          
          throw new Error(`Manifest Validation Failed: ${validationError.message}`);
        }

        this.logger.log(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}: SUCCESS! Version ${manifest.version}, Response Time: ${responseTime}ms`);

        this.notificationService.sendMonitoringNotification(
          NotificationEventType.DOWNLOAD_STARTED,
          `Manifest fetched: ${manifest.version}`,
          { requestId, version: manifest.version, responseTime },
        ).catch(() => {});

        return {
          success: true,
          manifest: manifest,
          requestId,
          responseTime,
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        this.logger.error(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}: Error - ${errorMessage}, Response Time: ${responseTime}ms`);
        
        // Log additional context for common errors
        if (errorMessage.includes('ECONNREFUSED')) {
          this.logger.warn(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}: Connection refused. Gateway may be down or unreachable.`);
        } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
          this.logger.warn(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}: Connection timeout. Network may be slow or unstable.`);
        } else if (errorMessage.includes('ENOTFOUND')) {
          this.logger.warn(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}: DNS resolution failed. Check gateway URL: ${this.config.baseUrl}`);
        }

        // Calculate exponential backoff delay with cap
        const delay = Math.min(BASE_RETRY_DELAY * Math.pow(1.5, Math.min(attempt - 1, 10)), MAX_RETRY_DELAY);
        this.logger.log(`[MANIFEST_FETCH] Request ID: ${requestId}, Attempt ${attempt}: Retrying in ${(delay / 1000).toFixed(1)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
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

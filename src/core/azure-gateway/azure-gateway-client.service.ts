import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '../../auth/jwt.service';
import { AppLoggerService } from '../../shared/services/logger.service';

export interface AzureGatewayConfig {
  baseUrl: string;
  subscriptionKey: string;
  deviceId: string;
  deviceToken: string;
}

@Injectable()
export class AzureGatewayClientService {
  private readonly logger = new AppLoggerService(AzureGatewayClientService.name);
  private readonly config: AzureGatewayConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    const deviceId = this.configService.get<string>('DEVICE_ID', 'device-' + Date.now());
    
    // Generate device token if not provided
    const providedToken = this.configService.get<string>('DEVICE_TOKEN', '');
    const deviceToken = providedToken || this.generateDeviceToken(deviceId);
    
    this.config = {
      baseUrl: this.configService.get<string>('AZURE_GATEWAY_URL', 'https://qsc-gateway-apim.azure-api.net'),
      subscriptionKey: this.configService.get<string>('AZURE_SUBSCRIPTION_KEY', ''),
      deviceId,
      deviceToken,
    };
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
   * Fetch manifest from Azure Gateway
   */
  async fetchManifest(): Promise<any> {
    try {
      this.logger.log('Fetching manifest from Azure Gateway...');
      
      const url = `${this.config.baseUrl}/qsc-gateway/manifest`;
      const headers = {
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'Authorization': `Bearer ${this.config.deviceToken}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const manifest = await response.json();
      this.logger.log('Manifest fetched successfully from Azure Gateway');
      
      return manifest;
    } catch (error) {
      this.logger.error('Failed to fetch manifest from Azure Gateway:', error.message);
      throw error;
    }
  }

  /**
   * Request approval for manifest update
   */
  async requestApproval(manifestId: string): Promise<any> {
    try {
      this.logger.log(`Requesting approval for manifest: ${manifestId}`);
      
      const url = `${this.config.baseUrl}/qsc-gateway/approval/request`;
      const headers = {
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'Authorization': `Bearer ${this.config.deviceToken}`,
        'Content-Type': 'application/json',
      };

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
      const headers = {
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'Authorization': `Bearer ${this.config.deviceToken}`,
        'Content-Type': 'application/json',
      };

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
      const headers = {
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'Authorization': `Bearer ${this.config.deviceToken}`,
        'Content-Type': 'application/json',
      };

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
      
      const url = `${this.config.baseUrl}/qsc-gateway/manifest`;
      const headers = {
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'Authorization': `Bearer ${this.config.deviceToken}`,
        'Content-Type': 'application/json',
      };

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

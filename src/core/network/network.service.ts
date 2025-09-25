import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface ConnectivityResult {
  isOnline: boolean;
  latency?: number;
  error?: string;
  testedAt: string;
}

@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);
  private readonly TIMEOUT = 10000; // 10 seconds timeout
  private readonly TEST_URLS = [
    'https://www.google.com',
    'https://www.cloudflare.com',
    'https://httpbin.org/get'
  ];

  /**
   * Check internet connectivity
   */
  async checkConnectivity(): Promise<ConnectivityResult> {
    this.logger.log('🌐 Checking internet connectivity...');
    
    const startTime = Date.now();
    const testedAt = new Date().toISOString();

    for (const testUrl of this.TEST_URLS) {
      try {
        await this.testUrl(testUrl);
        const latency = Date.now() - startTime;
        
        this.logger.log(`✅ Internet connectivity confirmed (${latency}ms)`);
        return {
          isOnline: true,
          latency,
          testedAt
        };
      } catch (error) {
        this.debugLog(`❌ Failed to reach ${testUrl}: ${error.message}`);
        continue;
      }
    }

    this.logger.warn('❌ No internet connectivity detected');
    return {
      isOnline: false,
      error: 'Unable to reach any test servers',
      testedAt
    };
  }

  /**
   * Test specific URL for connectivity
   */
  private async testUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        timeout: this.TIMEOUT,
        headers: {
          'User-Agent': 'IoT-Downloader/1.0.0'
        }
      };

      const req = client.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.setTimeout(this.TIMEOUT);
      req.end();
    });
  }

  /**
   * Check if specific domain is reachable
   */
  async checkDomainConnectivity(domain: string): Promise<ConnectivityResult> {
    this.logger.log(`🔍 Checking connectivity to: ${domain}`);
    
    const startTime = Date.now();
    const testedAt = new Date().toISOString();

    try {
      await this.testUrl(`https://${domain}`);
      const latency = Date.now() - startTime;
      
      this.logger.log(`✅ Domain ${domain} is reachable (${latency}ms)`);
      return {
        isOnline: true,
        latency,
        testedAt
      };
    } catch (error) {
      this.logger.warn(`❌ Domain ${domain} is not reachable: ${error.message}`);
      return {
        isOnline: false,
        error: error.message,
        testedAt
      };
    }
  }

  /**
   * Get network status summary
   */
  async getNetworkStatus(): Promise<{
    general: ConnectivityResult;
    google: ConnectivityResult;
    cloudflare: ConnectivityResult;
  }> {
    this.logger.log('📊 Getting comprehensive network status...');

    const [general, google, cloudflare] = await Promise.all([
      this.checkConnectivity(),
      this.checkDomainConnectivity('google.com'),
      this.checkDomainConnectivity('cloudflare.com')
    ]);

    return {
      general,
      google,
      cloudflare
    };
  }

  /**
   * Debug logging utility
   */
  private debugLog(message: string): void {
    if (process.env.DEBUG === 'true') {
      this.logger.debug(`[NETWORK DEBUG] ${message}`);
    }
  }
}

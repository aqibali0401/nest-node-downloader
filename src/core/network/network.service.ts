import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { 
  ConnectivityResult, 
  NetworkTestResult
} from '../../shared/interfaces/app.interfaces';
import { NetworkStatus } from '../../shared/enums/app.enums';
import { APP_CONSTANTS } from '../../shared/constants/app.constants';
import { AppLoggerService } from '../../shared/services/logger.service';

/**
 * Network service for connectivity testing and monitoring
 */
@Injectable()
export class NetworkService {
  private readonly logger = new AppLoggerService(NetworkService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Test internet connectivity
   */
  async testConnectivity(): Promise<ConnectivityResult> {
    const startTime = Date.now();
    const testUrls = APP_CONSTANTS.NETWORK_TEST_URLS;
    const results: NetworkTestResult[] = [];

    this.logger.logNetworkEvent('Starting connectivity test');

    // Test each URL
    for (const url of testUrls) {
      try {
        const result = await this.testUrl(url);
        results.push(result);
        this.logger.debug(`Tested ${url}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        results.push({
          url,
          success: false,
          latency: 0,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        this.logger.debug(`Tested ${url}: FAILED`);
      }
    }

    // Analyze results
    const successfulTests = results.filter(r => r.success);
    const failedTests = results.filter(r => !r.success);
    const averageLatency = successfulTests.length > 0 
      ? successfulTests.reduce((sum, r) => sum + r.latency, 0) / successfulTests.length 
      : 0;

    let status: NetworkStatus;
    if (successfulTests.length === 0) {
      status = NetworkStatus.OFFLINE;
    } else if (successfulTests.length === testUrls.length) {
      status = NetworkStatus.ONLINE;
    } else {
      status = NetworkStatus.PARTIALLY_ONLINE;
    }

    const connectivityResult: ConnectivityResult = {
      isOnline: successfulTests.length > 0,
      status,
      latency: Math.round(averageLatency),
      testedUrls: [...testUrls],
      failedUrls: failedTests.map(r => r.url),
      timestamp: new Date().toISOString(),
      details: {
        totalTests: testUrls.length,
        successfulTests: successfulTests.length,
        failedTests: failedTests.length,
        averageLatency: Math.round(averageLatency),
        testDuration: Date.now() - startTime,
      }
    };

    this.logger.logNetworkEvent(`Connectivity test completed: ${connectivityResult.status}`);

    return connectivityResult;
  }

  /**
   * Test a specific URL
   */
  private async testUrl(url: string): Promise<NetworkTestResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: APP_CONSTANTS.NETWORK_TIMEOUT,
        headers: {
          'User-Agent': APP_CONSTANTS.USER_AGENT,
        },
      };

      const req = client.request(options, (res) => {
        const latency = Date.now() - startTime;
        resolve({
          url,
          success: res.statusCode >= 200 && res.statusCode < 400,
          latency,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString(),
        });
      });

      req.on('error', (error) => {
        const latency = Date.now() - startTime;
        resolve({
          url,
          success: false,
          latency,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const latency = Date.now() - startTime;
        resolve({
          url,
          success: false,
          latency,
          error: 'Request timeout',
          timestamp: new Date().toISOString(),
        });
      });

      req.end();
    });
  }

  /**
   * Check if system is online
   */
  async isOnline(): Promise<boolean> {
    const result = await this.testConnectivity();
    return result.isOnline;
  }

  /**
   * Get network status with details
   */
  async getNetworkStatus(): Promise<ConnectivityResult> {
    return this.testConnectivity();
  }

  /**
   * Check connectivity (alias for testConnectivity)
   */
  async checkConnectivity(): Promise<ConnectivityResult> {
    return this.testConnectivity();
  }

  /**
   * Test specific URL with retry logic
   */
  async testUrlWithRetry(url: string, maxRetries: number = APP_CONSTANTS.NETWORK_RETRY_ATTEMPTS): Promise<NetworkTestResult> {
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.testUrl(url);
        if (result.success) {
          this.logger.debug(`URL test successful on attempt ${attempt}`);
          return result;
        }
        lastError = result.error || 'Unknown error';
        this.logger.debug(`URL test failed on attempt ${attempt}`);
      } catch (error) {
        lastError = error.message;
        this.logger.debug(`URL test exception on attempt ${attempt}`);
      }

      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Exponential backoff
        this.logger.debug(`Retrying URL test in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.logger.warn(`URL test failed after ${maxRetries} attempts`);
    return {
      url,
      success: false,
      latency: 0,
      error: `Failed after ${maxRetries} attempts: ${lastError}`,
      timestamp: new Date().toISOString(),
    };
  }
}
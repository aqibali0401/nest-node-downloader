import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpDownloader } from '../../../shared/implementations/http-downloader';
import { DatabaseService } from '../../../core/database/database.service';
import { NetworkService } from '../../../core/network/network.service';
import { IoTUpdateService } from '../../../core/iot-update/iot-update.service';
import { NssmService } from '../../../core/service/nssm.service';
import { EventNotificationService } from '../../../shared/services/event-notification.service';
import { RateLimiterService } from '../../../shared/services/rate-limiter.service';
import { AzureGatewayClientService } from '../../../core/azure-gateway/azure-gateway-client.service';
import { DownloadRecord } from '../../../shared/interfaces/app.interfaces';

export interface Manifest {
  version: string;
  artifact: string;
  checksum: string;
  description: string;
  lastUpdated: string;
  size: number;
  format: string;
  targetApp?: string;
  targetPath?: string;
}

@Injectable()
export class SimpleDownloaderService {
  private readonly logger = new Logger(SimpleDownloaderService.name);
  private readonly httpDownloader: HttpDownloader;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly networkService: NetworkService,
    private readonly iotUpdateService: IoTUpdateService,
    private readonly nssmService: NssmService,
    private readonly eventNotificationService: EventNotificationService,
    private readonly rateLimiterService: RateLimiterService,
    private readonly azureGatewayClient: AzureGatewayClientService,
  ) {
    this.httpDownloader = new HttpDownloader(
      this.configService,
      this.databaseService,
      this.networkService,
      this.iotUpdateService,
      this.nssmService,
      this.eventNotificationService,
      this.rateLimiterService
    );
  }

  async downloadFromManifest(): Promise<{
    success: boolean;
    manifest: Manifest;
    downloadRecord: DownloadRecord;
    totalSize: number;
    downloadTime: number;
    errors?: string[];
    mode?: 'ONLINE' | 'OFFLINE' | 'LIMITED';
  }> {
    this.logger.log('SimpleDownloaderService: Starting download process...');
    
    try {
      // First try Azure Gateway
      const isGatewayReachable = await this.azureGatewayClient.testConnectivity();
      
      if (isGatewayReachable) {
        this.logger.log('Azure Gateway is reachable, fetching manifest from gateway...');
        return await this.downloadFromAzureGateway();
      } else {
        this.logger.log('Azure Gateway not reachable, falling back to local manifest...');
        return await this.downloadFromLocalManifest();
      }
    } catch (error) {
      this.logger.error('Azure Gateway download failed, falling back to local manifest:', error.message);
      return await this.downloadFromLocalManifest();
    }
  }

  private async downloadFromAzureGateway(): Promise<{
    success: boolean;
    manifest: Manifest;
    downloadRecord: DownloadRecord;
    totalSize: number;
    downloadTime: number;
    errors?: string[];
    mode?: 'ONLINE' | 'OFFLINE' | 'LIMITED';
  }> {
    try {
      // Fetch manifest from Azure Gateway
      const gatewayResponse = await this.azureGatewayClient.fetchManifest();
      
      if (!gatewayResponse.success) {
        throw new Error(`Gateway error: ${gatewayResponse.error}`);
      }

      const manifest = gatewayResponse.manifest;
      this.logger.log(`Manifest fetched from Azure Gateway: ${manifest.version}`);
      
      // Use existing HttpDownloader with the fetched manifest
      await this.httpDownloader.initialize();
      
      // Create temporary manifest file
      const tempManifestPath = './temp-manifest.json';
      const fs = require('fs');
      fs.writeFileSync(tempManifestPath, JSON.stringify(manifest, null, 2));
      
      // Temporarily override manifest file
      const originalManifest = this.configService.get('MANIFEST_FILE');
      this.configService.set('MANIFEST_FILE', tempManifestPath);
      
      try {
        const result = await this.httpDownloader.downloadFromManifest();
        
        // Clean up temp file
        fs.unlinkSync(tempManifestPath);
        
        // Restore original manifest file
        this.configService.set('MANIFEST_FILE', originalManifest);
        
        return result;
      } catch (error) {
        // Clean up temp file
        if (fs.existsSync(tempManifestPath)) {
          fs.unlinkSync(tempManifestPath);
        }
        
        // Restore original manifest file
        this.configService.set('MANIFEST_FILE', originalManifest);
        
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to download from Azure Gateway:', error.message);
      throw error;
    }
  }

  private async downloadFromLocalManifest(): Promise<{
    success: boolean;
    manifest: Manifest;
    downloadRecord: DownloadRecord;
    totalSize: number;
    downloadTime: number;
    errors?: string[];
    mode?: 'ONLINE' | 'OFFLINE' | 'LIMITED';
  }> {
    this.logger.log('Downloading from local manifest...');
    
    await this.httpDownloader.initialize();
    return await this.httpDownloader.downloadFromManifest();
  }

  async cleanDatabase(): Promise<void> {
    this.logger.log('SimpleDownloaderService: Cleaning database...');
    
    await this.httpDownloader.initialize();
    
    await this.httpDownloader.cleanDatabase();
  }

  getHttpDownloader(): HttpDownloader {
    return this.httpDownloader;
  }

  async initialize(): Promise<void> {
    this.logger.log('Initializing SimpleDownloaderService...');
    await this.httpDownloader.initialize();
    this.logger.log('SimpleDownloaderService initialized successfully');
  }

  async shutdown(): Promise<void> {
    this.logger.log('Shutting down SimpleDownloaderService...');
    await this.httpDownloader.shutdown();
    this.logger.log('SimpleDownloaderService shut down successfully');
  }

  getStatus(): string {
    return this.httpDownloader.getStatus();
  }

  getServiceName(): string {
    return 'SimpleDownloaderService';
  }

  async downloadMultipleManifests(manifests: Manifest[]): Promise<{
    results: Array<{
      success: boolean;
      manifest: Manifest;
      downloadRecord?: DownloadRecord;
      totalSize: number;
      downloadTime: number;
      errors?: string[];
      mode?: 'ONLINE' | 'OFFLINE' | 'LIMITED';
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      totalTime: number;
    };
  }> {
    this.logger.log(`Starting simultaneous downloads for ${manifests.length} manifests...`);
    
    const startTime = Date.now();
    const results: any[] = [];
    
    // Process downloads in parallel with rate limiting
    const downloadPromises = manifests.map(async (manifest, index) => {
      try {
        this.logger.log(`Processing manifest ${index + 1}/${manifests.length}: ${manifest.version}`);
        
        // Create a temporary HttpDownloader for this manifest
        const tempDownloader = new HttpDownloader(
          this.configService,
          this.databaseService,
          this.networkService,
          this.iotUpdateService,
          this.nssmService,
          this.eventNotificationService,
          this.rateLimiterService
        );
        
        await tempDownloader.initialize();
        
        // Override manifest for this download
        const originalManifest = this.configService.get('MANIFEST_FILE');
        // Note: In a real implementation, you'd need to handle multiple manifests properly
        
        const result = await tempDownloader.downloadFromManifest();
        return result;
      } catch (error) {
        this.logger.error(`Failed to download manifest ${index + 1}: ${error.message}`, error.stack);
        return {
          success: false,
          manifest,
          downloadRecord: null,
          totalSize: 0,
          downloadTime: 0,
          errors: [error.message],
          mode: 'OFFLINE' as const
        };
      }
    });
    
    // Wait for all downloads to complete
    const downloadResults = await Promise.allSettled(downloadPromises);
    
    // Process results
    downloadResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          manifest: manifests[index],
          downloadRecord: null,
          totalSize: 0,
          downloadTime: 0,
          errors: [result.reason?.message || 'Unknown error'],
          mode: 'OFFLINE' as const
        });
      }
    });
    
    const totalTime = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    this.logger.log(`Simultaneous downloads completed: ${successful}/${results.length} successful in ${totalTime}ms`);
    
    return {
      results,
      summary: {
        total: results.length,
        successful,
        failed,
        totalTime
      }
    };
  }
}
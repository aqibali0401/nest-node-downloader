import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpDownloader } from '../../../shared/implementations/http-downloader';
import { DatabaseService } from '../../../core/database/database.service';
import { NetworkService } from '../../../core/network/network.service';
import { IoTUpdateService } from '../../../core/iot-update/iot-update.service';
import { NssmService } from '../../../core/service/nssm.service';
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
  ) {
    this.httpDownloader = new HttpDownloader(
      this.configService,
      this.databaseService,
      this.networkService,
      this.iotUpdateService,
      this.nssmService
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
    this.logger.log('SimpleDownloaderService: Delegating to HttpDownloader...');
    
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
}
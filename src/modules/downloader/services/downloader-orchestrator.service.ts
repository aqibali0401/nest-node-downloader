import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ManifestService } from './manifest.service';
import { ArtifactDownloaderService } from './artifact-downloader.service';
import { Manifest, Artifact } from '../interfaces/manifest.interface';
import { DownloadProgress, DownloadResult } from '../../../shared/types/cli.types';

@Injectable()
export class DownloaderOrchestratorService {
  private readonly logger = new Logger(DownloaderOrchestratorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly manifestService: ManifestService,
    private readonly artifactDownloader: ArtifactDownloaderService,
  ) {}

  /**
   * Main orchestration method - fetches manifest and downloads required artifacts
   */
  async downloadLatest(
    options: any = {},
    onProgress?: (artifactId: string, progress: DownloadProgress) => void
  ): Promise<DownloadResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    this.logger.log('Starting download orchestration...');

    try {
      // Step 1: Fetch latest manifest
      this.logger.log('Step 1: Fetching latest manifest...');
      const manifest = await this.manifestService.fetchLatestManifest();

      // Step 3: Filter artifacts based on options
      this.logger.log('Step 3: Filtering artifacts...');
      const filteredArtifacts = this.filterArtifacts(manifest, options);
      
      if (filteredArtifacts.length === 0) {
        this.logger.warn('No artifacts match the specified criteria');
        return {
          manifest,
          downloadedArtifacts: new Map(),
          totalSize: 0,
          downloadTime: Date.now() - startTime,
          success: true,
        };
      }

      // Step 4: Download artifacts
      this.logger.log(`Step 4: Downloading ${filteredArtifacts.length} artifacts...`);
      const downloadedArtifacts = await this.artifactDownloader.downloadArtifacts(
        filteredArtifacts,
        options.maxConcurrentDownloads || 3,
        onProgress
      );

      const downloadTime = Date.now() - startTime;
      const totalSize = this.manifestService.getTotalSize(manifest);

      this.logger.log(`Download orchestration completed successfully in ${downloadTime}ms`);

      return {
        manifest,
        downloadedArtifacts,
        totalSize,
        downloadTime,
        success: true,
      };

    } catch (error) {
      const downloadTime = Date.now() - startTime;
      errors.push(error.message);
      
      this.logger.error(`Download orchestration failed: ${error.message}`);

      return {
        manifest: null as any, // Will be set if manifest was fetched
        downloadedArtifacts: new Map(),
        totalSize: 0,
        downloadTime,
        success: false,
        errors,
      };
    }
  }

  /**
   * Download specific artifacts by IDs
   */
  async downloadSpecific(
    artifactIds: string[],
    onProgress?: (artifactId: string, progress: DownloadProgress) => void
  ): Promise<DownloadResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    this.logger.log(`Starting download of specific artifacts: ${artifactIds.join(', ')}`);

    try {
      // Fetch manifest to get artifact details
      const manifest = await this.manifestService.fetchLatestManifest();
      
      // Find artifacts by IDs
      const artifacts = manifest.artifacts.filter(artifact => 
        artifactIds.includes(artifact.id)
      );

      if (artifacts.length !== artifactIds.length) {
        const foundIds = artifacts.map(a => a.id);
        const missingIds = artifactIds.filter(id => !foundIds.includes(id));
        throw new Error(`Artifacts not found: ${missingIds.join(', ')}`);
      }

      // Download artifacts
      const downloadedArtifacts = await this.artifactDownloader.downloadArtifacts(
        artifacts,
        3, // max concurrent
        onProgress
      );

      const downloadTime = Date.now() - startTime;
      const totalSize = artifacts.reduce((sum, artifact) => sum + artifact.size, 0);

      this.logger.log(`Specific artifact download completed successfully in ${downloadTime}ms`);

      return {
        manifest,
        downloadedArtifacts,
        totalSize,
        downloadTime,
        success: true,
      };

    } catch (error) {
      const downloadTime = Date.now() - startTime;
      errors.push(error.message);
      
      this.logger.error(`Specific artifact download failed: ${error.message}`);

      return {
        manifest: null as any,
        downloadedArtifacts: new Map(),
        totalSize: 0,
        downloadTime,
        success: false,
        errors,
      };
    }
  }

  /**
   * Get download statistics
   */
  getDownloadStats(result: DownloadResult): any {
    return {
      success: result.success,
      totalArtifacts: result.downloadedArtifacts.size,
      totalSize: this.formatBytes(result.totalSize),
      downloadTime: `${result.downloadTime}ms`,
      downloadSpeed: result.downloadTime > 0 ? 
        this.formatBytes((result.totalSize * 1000) / result.downloadTime) + '/s' : 'N/A',
      errors: result.errors || [],
    };
  }

  /**
   * Filter artifacts based on download options
   */
  private filterArtifacts(manifest: Manifest, options: any): Artifact[] {
    let artifacts = manifest.artifacts;

    // Filter by artifact type
    if (options.artifactTypes && options.artifactTypes.length > 0) {
      artifacts = artifacts.filter(artifact => 
        options.artifactTypes!.includes(artifact.type)
      );
    }

    // Filter by target platform
    if (options.targetPlatform) {
      artifacts = this.manifestService.getArtifactsByPlatform(manifest, options.targetPlatform);
    }

    return artifacts;
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
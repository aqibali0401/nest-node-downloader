import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Manifest, Artifact } from '../interfaces/manifest.interface';

@Injectable()
export class ManifestService {
  private readonly logger = new Logger(ManifestService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Fetch the latest manifest from the CDN
   */
  async fetchLatestManifest(): Promise<Manifest> {
    const manifestUrl = this.configService.get<string>('MANIFEST_URL', 'mock');
    this.logger.log(`Fetching latest manifest from: ${manifestUrl}`);

    try {
      let manifestData: Manifest;
      
      if (manifestUrl === 'mock' || manifestUrl.includes('mock')) {
        this.logger.log('Using mock manifest for testing');
        manifestData = this.getMockManifest();
      } else {
        manifestData = await this.fetchFromUrl(manifestUrl);
      }
      
      // Validate manifest structure
      this.validateManifestStructure(manifestData);
      
      this.logger.log(`Successfully fetched manifest version: ${manifestData.version}`);
      return manifestData;
    } catch (error) {
      this.logger.error(`Failed to fetch manifest: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get artifacts filtered by type
   */
  getArtifactsByType(manifest: Manifest, type: string): Artifact[] {
    return manifest.artifacts.filter(artifact => artifact.type === type);
  }

  /**
   * Get artifacts filtered by platform
   */
  getArtifactsByPlatform(manifest: Manifest, platform: string): Artifact[] {
    return manifest.artifacts.filter(artifact => 
      manifest.metadata?.targetPlatform === platform || 
      artifact.platform === platform
    );
  }

  /**
   * Get total size of all artifacts
   */
  getTotalSize(manifest: Manifest): number {
    return manifest.artifacts.reduce((total, artifact) => total + artifact.size, 0);
  }

  /**
   * Fetch manifest from URL
   */
  private async fetchFromUrl(manifestUrl: string): Promise<Manifest> {
    const response = await fetch(manifestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EdgeSDM-Downloader/1.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get mock manifest for testing
   */
  private getMockManifest(): Manifest {
    return {
      id: 'mock-manifest-1',
      version: '1.0.0',
      releaseDate: new Date().toISOString(),
      description: 'Mock manifest for testing EdgeSDM Downloader',
      artifacts: [
        {
          id: 'test-binary-1',
          name: 'test-binary.bin',
          url: 'https://httpbin.org/bytes/1024',
          checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          checksumType: 'sha256',
          size: 1024,
          type: 'binary',
          version: '1.0.0',
          platform: 'test-platform',
        },
        {
          id: 'test-config-1',
          name: 'test-config.json',
          url: 'https://httpbin.org/json',
          checksum: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
          checksumType: 'sha256',
          size: 512,
          type: 'config',
          version: '1.0.0',
          platform: 'test-platform',
        }
      ],
      metadata: {
        buildNumber: '1000',
        environment: 'test',
        targetPlatform: 'test-platform',
        dependencies: []
      }
    };
  }

  /**
   * Validate manifest structure
   */
  private validateManifestStructure(manifest: any): asserts manifest is Manifest {
    const requiredFields = ['id', 'version', 'releaseDate', 'artifacts'];
    
    for (const field of requiredFields) {
      if (!manifest[field]) {
        throw new Error(`Invalid manifest: missing required field '${field}'`);
      }
    }

    if (!Array.isArray(manifest.artifacts)) {
      throw new Error('Invalid manifest: artifacts must be an array');
    }

    // Validate each artifact
    manifest.artifacts.forEach((artifact: any, index: number) => {
      const requiredArtifactFields = ['id', 'name', 'url', 'checksum', 'checksumType', 'size'];
      
      for (const field of requiredArtifactFields) {
        if (!artifact[field]) {
          throw new Error(`Invalid artifact at index ${index}: missing required field '${field}'`);
        }
      }

      if (!['sha256', 'md5', 'sha1'].includes(artifact.checksumType)) {
        throw new Error(`Invalid artifact at index ${index}: unsupported checksum type '${artifact.checksumType}'`);
      }
    });
  }
}
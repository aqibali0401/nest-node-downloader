export interface Artifact {
  id: string;
  name: string;
  url: string;
  checksum: string;
  checksumType: 'sha256' | 'md5' | 'sha1';
  size: number;
  type: 'binary' | 'library' | 'config' | 'package';
  version: string;
  platform?: string;
}

export interface Manifest {
  id: string;
  version: string;
  releaseDate: string;
  description: string;
  artifacts: Artifact[];
  metadata: {
    buildNumber: string;
    environment: string;
    targetPlatform: string;
    dependencies?: string[];
  };
}

export interface DownloadProgress {
  artifactId: string;
  downloaded: number;
  total: number;
  percentage: number;
  speed: number;
  eta: number;
}

export interface DownloadResult {
  manifest: Manifest;
  downloadedArtifacts: Map<string, string>;
  totalSize: number;
  downloadTime: number;
  success: boolean;
  errors?: string[];
}

export interface DownloadOptions {
  artifactTypes?: string[];
  targetPlatform?: string;
  maxConcurrentDownloads?: number;
  validateSignatures?: boolean;
}

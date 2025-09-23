export interface CliOptions {
  artifactTypes?: string[];
  targetPlatform?: string;
  maxConcurrentDownloads?: number;
  validateSignatures?: boolean;
  artifacts?: string[];
  help?: boolean;
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
  manifest: any;
  downloadedArtifacts: Map<string, string>;
  totalSize: number;
  downloadTime: number;
  success: boolean;
  errors?: string[];
}

/**
 * Application-wide interfaces for better type safety
 */

import { DownloadStatus, ArtifactType, Platform, FileFormat, NetworkStatus, RecoveryStatus } from '../enums/app.enums';

/**
 * CLI Options interface
 */
export interface CliOptions {
  artifactTypes?: ArtifactType[];
  targetPlatform?: Platform;
  maxConcurrentDownloads?: number;
  validateSignatures?: boolean;
  artifacts?: string[];
  help?: boolean;
  clean?: boolean;
  debug?: boolean;
}

/**
 * Download Progress interface
 */
export interface DownloadProgress {
  artifactId: string;
  downloaded: number;
  total: number;
  percentage: number;
  speed: number;
  eta: number;
  status: 'downloading' | 'completed' | 'failed' | 'paused';
}

/**
 * Download Result interface
 */
export interface DownloadResult {
  manifest: Manifest;
  downloadedArtifacts: Map<string, string>;
  totalSize: number;
  downloadTime: number;
  success: boolean;
  errors?: string[];
}

/**
 * Manifest interface
 */
export interface Manifest {
  version: string;
  artifact: string;
  checksum: string;
  description: string;
  lastUpdated: string;
  size: number;
  format: FileFormat;
  type?: ArtifactType;
  platform?: Platform;
  signature?: string;
  targetApp?: string;
  targetPath?: string;
}

/**
 * Download Record interface
 */
export interface DownloadRecord {
  id: string;
  version: string;
  artifact: string;
  expectedChecksum: string;
  actualChecksum: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  downloadedAt: string;
  status: DownloadStatus;
  description: string;
  type?: ArtifactType;
  platform?: Platform;
}

/**
 * Database Metadata interface
 */
export interface DatabaseMetadata {
  created: string;
  lastUpdated: string;
  totalDownloads: number;
  currentVersion: string | null;
  databaseVersion: string;
}

/**
 * Application Configuration interface
 */
export interface AppConfig {
  port: number;
  environment: string;
  logLevel: string;
  databaseFile: string;
  downloadDir: string;
  manifestFile: string;
  maxConcurrentDownloads: number;
  debug: boolean;
}

/**
 * Error Response interface
 */
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: any;
}

/**
 * Success Response interface
 */
export interface SuccessResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

/**
 * Validation Error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * File Info interface
 */
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  checksum: string;
  format: FileFormat;
  lastModified: Date;
}

/**
 * Database Query Options interface
 */
export interface DatabaseQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

/**
 * Network Connectivity Result interface
 */
export interface ConnectivityResult {
  isOnline: boolean;
  status: NetworkStatus;
  latency: number;
  testedUrls: string[];
  failedUrls: string[];
  timestamp: string;
  details?: any;
}

/**
 * Recovery State interface
 */
export interface RecoveryState {
  processId: string;
  state: RecoveryStatus;
  lastOperation: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  timestamp: string;
  data?: any;
}

/**
 * Crash Simulation Options interface
 */
export interface CrashSimulationOptions {
  type: string;
  delay?: number;
  intensity?: number;
  customData?: any;
}

/**
 * Network Test Result interface
 */
export interface NetworkTestResult {
  url: string;
  success: boolean;
  latency: number;
  statusCode?: number;
  error?: string;
  timestamp: string;
}

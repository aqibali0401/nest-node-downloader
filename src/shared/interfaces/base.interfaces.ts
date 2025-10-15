import { DownloadRecord, DatabaseMetadata, DownloadProgress, Manifest } from './app.interfaces';

export type { DownloadRecord, DatabaseMetadata, DownloadProgress, Manifest };

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  bytesDownloaded?: number;
  checksum?: string;
  error?: string;
  duration?: number;
}

export interface ConnectivityResult {
  isOnline: boolean;
  status: string;
  latency: number;
  testedUrls: string[];
  failedUrls: string[];
  timestamp: string;
}

export interface IBaseService {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getStatus(): ServiceStatus;
  getServiceName(): string;
}

export enum ServiceStatus {
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}

export interface IBaseDownloader extends IBaseService {
  download(url: string, destination: string): Promise<DownloadResult>;
  verifyChecksum(filePath: string, expectedChecksum: string): Promise<boolean>;
  getDownloadProgress(): DownloadProgress;
}

export interface IBaseDatabase extends IBaseService {
  initialize(): Promise<void>;
  addDownload(record: DownloadRecord): Promise<void>;
  getMetadata(): Promise<DatabaseMetadata>;
  updateCurrentVersion(version: string): Promise<void>;
  cleanAllDownloads(): Promise<void>;
}

export interface IBaseNetwork extends IBaseService {
  testConnectivity(): Promise<ConnectivityResult>;
  checkInternetConnection(): Promise<boolean>;
  getLatency(): Promise<number>;
}

export interface IBaseRecovery extends IBaseService {
  saveState(state: any): Promise<void>;
  loadState(): Promise<any>;
  recoverFromCrash(): Promise<boolean>;
}

export interface IBaseServiceManager extends IBaseService {
  installService(serviceName: string, appPath: string): Promise<ServiceResult>;
  startService(serviceName: string): Promise<ServiceResult>;
  stopService(serviceName: string): Promise<ServiceResult>;
  getServiceStatus(serviceName: string): Promise<ServiceStatus>;
}

export interface ServiceResult {
  success: boolean;
  message?: string;
  error?: string;
  duration?: number;
}

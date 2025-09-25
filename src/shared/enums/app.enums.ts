/**
 * Application enums for better type safety
 */

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

export enum DownloadStatus {
  VERIFIED = 'verified',
  CHECKSUM_MISMATCH = 'checksum_mismatch',
  FAILED = 'failed',
}

export enum NetworkStatus {
  ONLINE = 'online',
  PARTIALLY_ONLINE = 'partially_online',
  OFFLINE = 'offline',
}

export enum RecoveryStatus {
  NORMAL = 'normal',
  RECOVERING = 'recovering',
  FAILED = 'failed',
}

export enum ArtifactType {
  BINARY = 'binary',
  LIBRARY = 'library',
  CONFIG = 'config',
  DOCUMENTATION = 'documentation',
}

export enum Platform {
  WINDOWS = 'windows',
  LINUX = 'linux',
  MACOS = 'macos',
  ANDROID = 'android',
  IOS = 'ios',
}

export enum FileFormat {
  PDF = 'pdf',
  ZIP = 'zip',
  TAR_GZ = 'tar.gz',
  EXE = 'exe',
  DMG = 'dmg',
  DEB = 'deb',
  RPM = 'rpm',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export enum DatabaseOperation {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum CrashType {
  MEMORY_EXHAUSTION = 'memory_exhaustion',
  NETWORK_TIMEOUT = 'network_timeout',
  FILE_SYSTEM_ERROR = 'file_system_error',
  PROCESS_SIGNAL = 'process_signal',
  INFINITE_LOOP = 'infinite_loop',
  RANDOM = 'random',
}

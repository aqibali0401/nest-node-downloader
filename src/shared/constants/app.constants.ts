/**
 * Application-wide constants
 */
export const APP_CONSTANTS = {
  // Application Info
  APP_NAME: 'EdgeSDM',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'Edge Software Deployment Manager',

  // Database
  DATABASE_FILE: 'database.sqlite',
  MAX_REDIRECTS: 10,

  // Download
  DEFAULT_DOWNLOAD_DIR: './downloads',
  DEFAULT_MANIFEST_FILE: './manifest.json',
  DEFAULT_MAX_CONCURRENT_DOWNLOADS: 3,

  // File Operations
  SUPPORTED_FORMATS: ['pdf', 'zip', 'tar.gz', 'exe', 'dmg'],
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB

  // Logging
  DEFAULT_LOG_LEVEL: 'info',
  DEBUG_ENV_VAR: 'DEBUG',

  // HTTP
  USER_AGENT: 'EdgeSDM/1.0.0',
  REQUEST_TIMEOUT: 30000, // 30 seconds

  // Validation
  MIN_PORT: 1,
  MAX_PORT: 65535,

  // Network
  NETWORK_TEST_URLS: [
    'https://www.google.com',
    'https://www.cloudflare.com',
    'https://httpbin.org/get',
  ],
  NETWORK_TIMEOUT: 5000,
  NETWORK_RETRY_ATTEMPTS: 3,

  // Recovery
  RECOVERY_STATE_FILE: './recovery-state.json',
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

/**
 * Environment variable names
 */
export const ENV_VARS = {
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  LOG_LEVEL: 'LOG_LEVEL',
  DEBUG: 'DEBUG',
  DATABASE_FILE: 'DATABASE_FILE',
  DOWNLOAD_DIR: 'DOWNLOAD_DIR',
  MANIFEST_FILE: 'MANIFEST_FILE',
  MANIFEST_URL: 'MANIFEST_URL',
  NSSM_PATH: 'NSSM_PATH',
  SERVICE_NAME: 'SERVICE_NAME',
  APP_DIRECTORY: 'APP_DIRECTORY',
  NODE_PATH: 'NODE_PATH',
  NPM_PATH: 'NPM_PATH',
  TARGET_PATH: 'TARGET_PATH',
  AZURE_STORAGE_ACCOUNT_CONN_STRING: 'AZURE_STORAGE_ACCOUNT_CONN_STRING',
  AZURE_CONTAINER_NAME: 'AZURE_CONTAINER_NAME',
  MANIFEST_MEDIA: 'MANIFEST_MEDIA'
} as const;

/**
 * Database table names
 */
export const DB_TABLES = {
  DOWNLOADS: 'downloads',
  METADATA: 'metadata',
  RECOVERY_STATE: 'recovery_state',
} as const;

/**
 * Download status types
 */
export const DOWNLOAD_STATUS = {
  VERIFIED: 'verified',
  CHECKSUM_MISMATCH: 'checksum_mismatch',
  FAILED: 'failed',
} as const;

/**
 * Network status types
 */
export const NETWORK_STATUS = {
  ONLINE: 'online',
  PARTIALLY_ONLINE: 'partially_online',
  OFFLINE: 'offline',
} as const;

/**
 * Recovery status types
 */
export const RECOVERY_STATUS = {
  NORMAL: 'normal',
  RECOVERING: 'recovering',
  FAILED: 'failed',
} as const;

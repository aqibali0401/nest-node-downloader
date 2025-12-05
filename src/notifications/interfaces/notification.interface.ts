export enum NotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum NotificationEventType {
  UPDATE_STARTED = 'update_started',
  DOWNLOAD_STARTED = 'download_started',
  DOWNLOAD_COMPLETED = 'download_completed',
  INSTALLATION_STARTED = 'installation_started',
  INSTALLATION_COMPLETED = 'installation_completed',
  UPDATE_COMPLETED = 'update_completed',
  DOWNLOAD_FAILED = 'download_failed',
  INSTALLATION_FAILED = 'installation_failed',
  VALIDATION_FAILED = 'validation_failed',
  AUTHENTICATION_FAILED = 'authentication_failed',
  MANIFEST_FETCH_FAILED = 'manifest_fetch_failed',
  CHECKSUM_MISMATCH = 'checksum_mismatch',
  NETWORK_ERROR = 'network_error',
  SYSTEM_ERROR = 'system_error',
}

export interface NotificationPayload {
  severity: NotificationSeverity;
  eventType: NotificationEventType;
  title: string;
  message: string;
  deviceId?: string;
  version?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  recipients: string[];
}

export interface INotificationService {
  sendMonitoringNotification(
    eventType: NotificationEventType,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<void>;

  sendFailureNotification(
    eventType: NotificationEventType,
    error: Error,
    context?: Record<string, any>,
  ): Promise<void>;

  sendNotification(payload: NotificationPayload): Promise<void>;
}

export interface INotificationProvider {
  readonly name: string;
  send(payload: NotificationPayload): Promise<void>;
  isEnabled(): boolean;
}


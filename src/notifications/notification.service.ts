import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '../shared/services/logger.service';
import {
  INotificationService,
  NotificationPayload,
  NotificationEventType,
  NotificationSeverity,
} from './interfaces/notification.interface';
import { EmailNotificationProvider } from './providers/email-notification.provider';
import { AzureNotificationProvider } from './providers/azure-notification.provider';

@Injectable()
export class NotificationService implements INotificationService {
  private readonly logger = new AppLoggerService(NotificationService.name);
  private readonly deviceId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailProvider: EmailNotificationProvider,
    private readonly azureProvider: AzureNotificationProvider,
  ) {
    this.deviceId = this.configService.get<string>('DEVICE_ID', 'unknown-device');
    const enabled = [this.emailProvider, this.azureProvider]
      .filter(p => p.isEnabled())
      .map(p => p.name)
      .join(', ');
    
    if (enabled) {
      this.logger.log(`Notifications enabled: ${enabled}`);
    }
  }

  async sendMonitoringNotification(
    eventType: NotificationEventType,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.sendNotification({
      severity: NotificationSeverity.INFO,
      eventType,
      title: this.formatTitle(eventType),
      message,
      deviceId: this.deviceId,
      timestamp: new Date(),
      metadata,
    });
  }

  async sendFailureNotification(
    eventType: NotificationEventType,
    error: Error,
    context?: Record<string, any>,
  ): Promise<void> {
    await this.sendNotification({
      severity: this.determineSeverity(eventType),
      eventType,
      title: this.formatTitle(eventType),
      message: error.message,
      deviceId: this.deviceId,
      timestamp: new Date(),
      metadata: context,
      error: {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      },
    });
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    if (!payload.deviceId) payload.deviceId = this.deviceId;

    const providers = [this.emailProvider, this.azureProvider].filter(p => p.isEnabled());
    
    await Promise.allSettled(
      providers.map(provider =>
        provider.send(payload).catch(err =>
          this.logger.error(`${provider.name} failed:`, err.message)
        )
      )
    );
  }

  private formatTitle(eventType: NotificationEventType): string {
    return eventType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private determineSeverity(eventType: NotificationEventType): NotificationSeverity {
    if ([NotificationEventType.AUTHENTICATION_FAILED, NotificationEventType.CHECKSUM_MISMATCH, NotificationEventType.SYSTEM_ERROR].includes(eventType)) {
      return NotificationSeverity.CRITICAL;
    }
    if ([NotificationEventType.DOWNLOAD_FAILED, NotificationEventType.INSTALLATION_FAILED, NotificationEventType.VALIDATION_FAILED, NotificationEventType.MANIFEST_FETCH_FAILED].includes(eventType)) {
      return NotificationSeverity.ERROR;
    }
    if (eventType === NotificationEventType.NETWORK_ERROR) {
      return NotificationSeverity.WARNING;
    }
    return NotificationSeverity.INFO;
  }
}


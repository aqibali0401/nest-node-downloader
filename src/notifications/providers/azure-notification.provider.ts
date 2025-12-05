import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '../../shared/services/logger.service';
import {
  INotificationProvider,
  NotificationPayload,
  NotificationSeverity,
} from '../interfaces/notification.interface';

@Injectable()
export class AzureNotificationProvider implements INotificationProvider {
  readonly name = 'AzureProvider';
  private readonly logger = new AppLoggerService(AzureNotificationProvider.name);
  private enabled: boolean;
  private appInsightsClient: any = null;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('AZURE_NOTIFICATIONS_ENABLED', 'false') === 'true';
    const appInsightsKey = this.configService.get<string>('AZURE_APP_INSIGHTS_KEY', '');

    if (this.enabled && appInsightsKey) {
      try {
        const appInsights = require('applicationinsights');
        appInsights.setup(appInsightsKey).start();
        this.appInsightsClient = appInsights.defaultClient;
        this.logger.log('Azure Application Insights initialized');
      } catch (error) {
        this.logger.warn('Application Insights not available - install: npm install applicationinsights');
      }
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.appInsightsClient !== null;
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const properties = {
        eventType: payload.eventType,
        severity: payload.severity,
        deviceId: payload.deviceId,
        version: payload.version,
        ...payload.metadata,
      };

      this.appInsightsClient.trackEvent({ name: payload.eventType, properties });
      
      if (payload.error) {
        const error = new Error(payload.error.message);
        error.stack = payload.error.stack;
        this.appInsightsClient.trackException({ exception: error, properties });
      }

      this.appInsightsClient.flush();
    } catch (error) {
      this.logger.error('Azure notification failed:', error.message);
    }
  }
}


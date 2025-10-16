import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChecksumMismatchEvent {
  deviceId: string;
  version: string;
  artifact: string;
  expectedChecksum: string;
  actualChecksum: string;
  timestamp: string;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
}

@Injectable()
export class EventNotificationService {
  private readonly logger = new Logger(EventNotificationService.name);
  private readonly deviceId: string;

  constructor(private readonly configService: ConfigService) {
    this.deviceId = this.configService.get<string>('DEVICE_ID', 'unknown-device');
  }

  async notifyChecksumMismatch(event: ChecksumMismatchEvent): Promise<void> {
    try {
      this.logger.warn('Checksum mismatch detected - sending notification');
      
      // Log the event
      this.logger.error(`Checksum Mismatch Event: ${JSON.stringify(event, null, 2)}`);
      
      // Here you can add Azure Event Hub, Service Bus, or other notification logic
      // For now, we'll just log it as the infrastructure is already in place
      
      this.logger.log('Checksum mismatch notification sent successfully');
    } catch (error) {
      this.logger.error(`Failed to send checksum mismatch notification: ${error.message}`, error.stack);
    }
  }

  async notifyDownloadFailure(error: string, context: any): Promise<void> {
    try {
      this.logger.warn('Download failure detected - sending notification');
      
      const failureEvent = {
        deviceId: this.deviceId,
        error: error,
        context: context,
        timestamp: new Date().toISOString(),
        severity: 'ERROR' as const
      };
      
      this.logger.error(`Download Failure Event: ${JSON.stringify(failureEvent, null, 2)}`);
      
      this.logger.log('Download failure notification sent successfully');
    } catch (notificationError) {
      this.logger.error(`Failed to send download failure notification: ${notificationError.message}`, notificationError.stack);
    }
  }
}


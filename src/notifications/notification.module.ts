import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { EmailNotificationProvider } from './providers/email-notification.provider';
import { AzureNotificationProvider } from './providers/azure-notification.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    NotificationService,
    EmailNotificationProvider,
    AzureNotificationProvider,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}





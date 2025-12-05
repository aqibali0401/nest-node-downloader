import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AppLoggerService } from '../../shared/services/logger.service';
import {
  INotificationProvider,
  NotificationPayload,
  NotificationSeverity,
  EmailConfig,
} from '../interfaces/notification.interface';

@Injectable()
export class EmailNotificationProvider implements INotificationProvider {
  readonly name = 'EmailProvider';
  private readonly logger = new AppLoggerService(EmailNotificationProvider.name);
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      enabled: this.configService.get<string>('EMAIL_NOTIFICATIONS_ENABLED', 'false') === 'true',
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: parseInt(this.configService.get<string>('SMTP_PORT', '587'), 10),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      user: this.configService.get<string>('SMTP_USER', ''),
      password: this.configService.get<string>('SMTP_PASSWORD', ''),
      from: this.configService.get<string>('SMTP_FROM', 'installer@qsc.com'),
      recipients: this.configService.get<string>('NOTIFICATION_EMAILS', '').split(',').filter(e => e.trim()),
    };

    if (this.isEnabled()) {
      this.initializeTransporter();
    } else {
      this.logger.log('Email notifications are disabled');
    }
  }

  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.password,
        },
      });

      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', error.message);
      this.transporter = null;
    }
  }

  isEnabled(): boolean {
    return this.config.enabled && 
           this.config.user !== '' && 
           this.config.password !== '' &&
           this.config.recipients.length > 0;
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!this.isEnabled() || !this.transporter) {
      this.logger.debug('[EMAIL] Email provider is disabled or not configured, skipping email notification');
      return;
    }

    try {
      const subject = this.formatSubject(payload);
      const body = this.formatBody(payload);

      const mailOptions = {
        from: this.config.from,
        to: this.config.recipients.join(', '),
        subject,
        html: body,
      };

      await this.transporter.sendMail(mailOptions);

      this.logger.log(`[EMAIL] Notification sent successfully: ${payload.title}`);
    } catch (error) {
      this.logger.error('[EMAIL] Failed to send email notification:', error.message);
      throw error;
    }
  }

  private formatSubject(payload: NotificationPayload): string {
    const severityIcon = this.getSeverityIcon(payload.severity);
    return `${severityIcon} [QSC Installer] ${payload.title}`;
  }

  private formatBody(payload: NotificationPayload): string {
    const severityColor = this.getSeverityColor(payload.severity);
    const severityLabel = payload.severity.toUpperCase();

    let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${severityColor}; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
    .footer { background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px; }
    .detail-row { margin: 10px 0; }
    .detail-label { font-weight: bold; display: inline-block; width: 120px; }
    .detail-value { display: inline-block; }
    .error-box { background-color: #ffe6e6; border-left: 4px solid #ff0000; padding: 10px; margin: 15px 0; }
    .metadata-box { background-color: #e6f3ff; border-left: 4px solid #0066cc; padding: 10px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">[${severityLabel}] ${payload.title}</h2>
    </div>
    <div class="content">
      <p><strong>Message:</strong> ${payload.message}</p>
      
      <div class="detail-row">
        <span class="detail-label">Event Type:</span>
        <span class="detail-value">${payload.eventType}</span>
      </div>
      
      <div class="detail-row">
        <span class="detail-label">Timestamp:</span>
        <span class="detail-value">${payload.timestamp.toISOString()}</span>
      </div>
`;

    if (payload.deviceId) {
      html += `
      <div class="detail-row">
        <span class="detail-label">Device ID:</span>
        <span class="detail-value">${payload.deviceId}</span>
      </div>
`;
    }

    if (payload.version) {
      html += `
      <div class="detail-row">
        <span class="detail-label">Version:</span>
        <span class="detail-value">${payload.version}</span>
      </div>
`;
    }

    if (payload.error) {
      html += `
      <div class="error-box">
        <h4 style="margin-top: 0;">Error Details</h4>
        <p><strong>Message:</strong> ${payload.error.message}</p>
        ${payload.error.code ? `<p><strong>Code:</strong> ${payload.error.code}</p>` : ''}
        ${payload.error.stack ? `<pre style="overflow-x: auto; font-size: 11px;">${payload.error.stack}</pre>` : ''}
      </div>
`;
    }

    if (payload.metadata && Object.keys(payload.metadata).length > 0) {
      html += `
      <div class="metadata-box">
        <h4 style="margin-top: 0;">Additional Information</h4>
        <pre style="overflow-x: auto; font-size: 12px;">${JSON.stringify(payload.metadata, null, 2)}</pre>
      </div>
`;
    }

    html += `
    </div>
    <div class="footer">
      <p>This is an automated notification from QSC Installer Application</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>
`;

    return html;
  }

  private getSeverityIcon(severity: NotificationSeverity): string {
    const icons = {
      [NotificationSeverity.INFO]: 'ℹ️',
      [NotificationSeverity.WARNING]: '⚠️',
      [NotificationSeverity.ERROR]: '❌',
      [NotificationSeverity.CRITICAL]: '🚨',
    };
    return icons[severity] || 'ℹ️';
  }

  private getSeverityColor(severity: NotificationSeverity): string {
    const colors = {
      [NotificationSeverity.INFO]: '#0066cc',
      [NotificationSeverity.WARNING]: '#ff9900',
      [NotificationSeverity.ERROR]: '#cc0000',
      [NotificationSeverity.CRITICAL]: '#8b0000',
    };
    return colors[severity] || '#0066cc';
  }
}





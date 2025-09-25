import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { APP_CONSTANTS } from '../constants/app.constants';

/**
 * Enhanced logging service with structured logging
 */
@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly context: string;
  private readonly isDebugMode: boolean;

  constructor(context: string = 'AppLogger') {
    this.context = context;
    this.isDebugMode = process.env[APP_CONSTANTS.DEBUG_ENV_VAR] === 'true';
  }

  /**
   * Log a message with context
   */
  log(message: string, context?: string): void {
    this.logMessage('log', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, trace?: string, context?: string): void {
    this.logMessage('error', message, context, { trace });
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string): void {
    this.logMessage('warn', message, context);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: string): void {
    if (this.isDebugMode) {
      this.logMessage('debug', message, context);
    }
  }

  /**
   * Log a verbose message
   */
  verbose(message: string, context?: string): void {
    if (this.isDebugMode) {
      this.logMessage('verbose', message, context);
    }
  }

  logStructured(level: LogLevel, message: string, data: any, context?: string): void {
    const logContext = context || this.context;
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] [${level.toUpperCase()}] [${logContext}] ${message}`);
    if (data) {
      console.log(`[${logContext}] Data:`, data);
    }
  }

  logPerformance(operation: string, duration: number, context?: string): void {
    const logContext = context || this.context;
    this.logStructured('log', `Performance: ${operation} - ${duration}ms`, null, logContext);
  }

  logDownloadProgress(
    artifactId: string,
    downloaded: number,
    total: number,
    speed: number,
    context?: string
  ): void {
    const percentage = total > 0 ? Math.round((downloaded / total) * 100) : 0;
    const logContext = context || this.context;
    
    this.logStructured('log', `Download Progress: ${artifactId} - ${percentage}% (${speed} bytes/s)`, null, logContext);
  }

  logDatabaseOperation(operation: string, table: string, recordId?: string, context?: string): void {
    const logContext = context || this.context;
    const recordInfo = recordId ? ` (${recordId})` : '';
    this.logStructured('log', `Database: ${operation} on ${table}${recordInfo}`, null, logContext);
  }

  logHttpRequest(method: string, url: string, statusCode: number, duration: number, context?: string): void {
    const logContext = context || this.context;
    this.logStructured('log', `HTTP: ${method} ${url} - ${statusCode} (${duration}ms)`, null, logContext);
  }

  logLifecycleEvent(event: string, data?: any, context?: string): void {
    const logContext = context || this.context;
    this.logStructured('log', `Lifecycle: ${event}`, data, logContext);
  }

  logNetworkEvent(event: string, data?: any, context?: string): void {
    const logContext = context || this.context;
    this.logStructured('log', `Network: ${event}`, data, logContext);
  }

  logRecoveryEvent(event: string, data?: any, context?: string): void {
    const logContext = context || this.context;
    this.logStructured('log', `Recovery: ${event}`, data, logContext);
  }

  logSecurityEvent(event: string, details: any, context?: string): void {
    const logContext = context || this.context;
    this.logStructured('warn', `Security: ${event}`, details, logContext);
  }

  private logMessage(level: LogLevel, message: string, context?: string, additionalData?: any): void {
    const logContext = context || this.context;
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${logContext}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        if (additionalData?.trace) {
          console.error(`[${logContext}] Stack Trace:`, additionalData.trace);
        }
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'debug':
      case 'verbose':
        if (this.isDebugMode) {
          console.debug(formattedMessage);
        }
        break;
      default:
        console.log(formattedMessage);
        break;
    }
  }

  createChildLogger(context: string): AppLoggerService {
    return new AppLoggerService(`${this.context}:${context}`);
  }

  setLogLevel(level: LogLevel): void {
    // Handled by isDebugMode flag
  }
}

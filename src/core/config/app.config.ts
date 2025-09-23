import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Application configuration service
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get application configuration
   */
  getConfig(): any {
    return {
      port: this.getPort(),
      environment: this.getEnvironment(),
      logLevel: this.getLogLevel(),
    };
  }

  /**
   * Validate configuration
   */
  validate(): boolean {
    try {
      const config = this.getConfig();
      
      // Validate required fields
      if (!config.port || config.port <= 0) {
        throw new Error('Invalid port configuration');
      }

      if (!config.environment) {
        throw new Error('Environment not specified');
      }

      return true;
    } catch (error) {
      console.error('Configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Get application port
   */
  private getPort(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  /**
   * Get environment
   */
  private getEnvironment(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  /**
   * Get log level
   */
  private getLogLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'info');
  }
}

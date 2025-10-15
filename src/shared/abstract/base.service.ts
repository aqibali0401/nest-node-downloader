import { IBaseService, ServiceStatus } from '../interfaces/base.interfaces';
import { AppLoggerService } from '../services/logger.service';

export abstract class BaseService implements IBaseService {
  protected readonly logger: AppLoggerService;
  protected status: ServiceStatus = ServiceStatus.STOPPED;
  protected readonly serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = new AppLoggerService(serviceName);
  }

  async initialize(): Promise<void> {
    try {
      this.status = ServiceStatus.INITIALIZING;
      this.logger.log(`Initializing ${this.serviceName}...`);
      
      await this.onInitialize();
      
      this.status = ServiceStatus.RUNNING;
      this.logger.log(`${this.serviceName} initialized successfully`);
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.logger.error(`Failed to initialize ${this.serviceName}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.status = ServiceStatus.STOPPING;
      this.logger.log(`Shutting down ${this.serviceName}...`);
      
      await this.onShutdown();
      
      this.status = ServiceStatus.STOPPED;
      this.logger.log(`${this.serviceName} shut down successfully`);
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.logger.error(`Failed to shutdown ${this.serviceName}: ${error.message}`, error.stack);
      throw error;
    }
  }

  getStatus(): ServiceStatus {
    return this.status;
  }

  getServiceName(): string {
    return this.serviceName;
  }

  isRunning(): boolean {
    return this.status === ServiceStatus.RUNNING;
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onShutdown(): Promise<void>;
}

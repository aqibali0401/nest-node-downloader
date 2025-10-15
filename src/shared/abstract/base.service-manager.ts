import { BaseService } from './base.service';
import { IBaseServiceManager, ServiceResult, ServiceStatus } from '../interfaces/base.interfaces';

export abstract class BaseServiceManager extends BaseService implements IBaseServiceManager {
  protected readonly platform: string;
  protected readonly managedServices: Map<string, ServiceStatus> = new Map();

  constructor(serviceName: string, platform: string) {
    super(serviceName);
    this.platform = platform;
  }

  abstract installService(serviceName: string, appPath: string): Promise<ServiceResult>;
  abstract startService(serviceName: string): Promise<ServiceResult>;
  abstract stopService(serviceName: string): Promise<ServiceResult>;
  abstract getServiceStatus(serviceName: string): Promise<ServiceStatus>;
  abstract uninstallService(serviceName: string): Promise<ServiceResult>;

  getPlatform(): string {
    return this.platform;
  }

  getManagedServices(): Map<string, ServiceStatus> {
    return new Map(this.managedServices);
  }

  isServiceManaged(serviceName: string): boolean {
    return this.managedServices.has(serviceName);
  }

  protected addManagedService(serviceName: string, status: ServiceStatus): void {
    this.managedServices.set(serviceName, status);
    this.logger.log(`Added service to managed list: ${serviceName} (${status})`);
  }

  protected removeManagedService(serviceName: string): void {
    this.managedServices.delete(serviceName);
    this.logger.log(`Removed service from managed list: ${serviceName}`);
  }

  protected updateServiceStatus(serviceName: string, status: ServiceStatus): void {
    this.managedServices.set(serviceName, status);
    this.logger.debug(`Updated service status: ${serviceName} -> ${status}`);
  }

  getServiceCount(): number {
    return this.managedServices.size;
  }

  getRunningServicesCount(): number {
    let count = 0;
    for (const status of this.managedServices.values()) {
      if (status === ServiceStatus.RUNNING) {
        count++;
      }
    }
    return count;
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onShutdown(): Promise<void>;
}

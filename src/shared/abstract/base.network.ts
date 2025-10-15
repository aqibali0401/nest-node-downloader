import { BaseService } from './base.service';
import { IBaseNetwork, ConnectivityResult } from '../interfaces/base.interfaces';

export abstract class BaseNetwork extends BaseService implements IBaseNetwork {
  protected readonly testUrls: string[] = [
    'https://www.google.com',
    'https://www.microsoft.com',
    'https://www.cloudflare.com'
  ];
  protected timeout: number = 10000;
  protected lastConnectivityResult: ConnectivityResult | null = null;

  constructor(serviceName: string) {
    super(serviceName);
  }

  abstract testConnectivity(): Promise<ConnectivityResult>;

  async checkInternetConnection(): Promise<boolean> {
    try {
      const result = await this.testConnectivity();
      return result.isOnline;
    } catch (error) {
      this.logger.error(`Internet connection check failed: ${error.message}`, error.stack);
      return false;
    }
  }

  async getLatency(): Promise<number> {
    try {
      const result = await this.testConnectivity();
      return result.latency;
    } catch (error) {
      this.logger.error(`Latency check failed: ${error.message}`, error.stack);
      return -1;
    }
  }

  getLastConnectivityResult(): ConnectivityResult | null {
    return this.lastConnectivityResult;
  }

  setTestUrls(urls: string[]): void {
    this.testUrls.splice(0, this.testUrls.length, ...urls);
    this.logger.log(`Updated test URLs: ${this.testUrls.join(', ')}`);
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
    this.logger.log(`Updated timeout: ${timeout}ms`);
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onShutdown(): Promise<void>;
}

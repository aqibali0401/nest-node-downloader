import { BaseService } from './base.service';
import { IBaseDatabase } from '../interfaces/base.interfaces';
import { DownloadRecord, DatabaseMetadata } from '../interfaces/app.interfaces';

export abstract class BaseDatabase extends BaseService implements IBaseDatabase {
  protected readonly databaseFile: string;
  protected isInitialized: boolean = false;

  constructor(serviceName: string, databaseFile: string) {
    super(serviceName);
    this.databaseFile = databaseFile;
  }

  abstract initialize(): Promise<void>;
  abstract addDownload(record: DownloadRecord): Promise<void>;
  abstract getMetadata(): Promise<DatabaseMetadata>;
  abstract updateCurrentVersion(version: string): Promise<void>;
  abstract cleanAllDownloads(): Promise<void>;

  isDbInitialized(): boolean {
    return this.isInitialized;
  }

  getDatabaseFile(): string {
    return this.databaseFile;
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onShutdown(): Promise<void>;
}

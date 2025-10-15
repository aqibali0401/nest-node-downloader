import { BaseService } from './base.service';
import { IBaseDownloader, DownloadResult } from '../interfaces/base.interfaces';
import { DownloadProgress } from '../interfaces/app.interfaces';
import { createWriteStream, createReadStream, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

export abstract class BaseDownloader extends BaseService implements IBaseDownloader {
  protected readonly maxRedirects: number = 10;
  protected readonly userAgent: string = 'EdgeSDM/1.0.0';
  protected downloadProgress: DownloadProgress | null = null;
  protected isDownloading: boolean = false;

  constructor(serviceName: string) {
    super(serviceName);
  }

  abstract download(url: string, destination: string): Promise<DownloadResult>;

  async verifyChecksum(filePath: string, expectedChecksum: string, algorithm: string = 'sha256'): Promise<boolean> {
    try {
      this.logger.log(`Verifying ${algorithm} checksum for: ${filePath}`);
      
      const actualChecksum = await this.calculateChecksum(filePath, algorithm);
      const cleanExpectedChecksum = expectedChecksum.replace(`${algorithm}:`, '');
      
      const isValid = actualChecksum === cleanExpectedChecksum;
      
      if (isValid) {
        this.logger.log('Checksum verification successful');
      } else {
        this.logger.warn(`Checksum mismatch - Expected: ${cleanExpectedChecksum}, Actual: ${actualChecksum}`);
      }
      
      return isValid;
    } catch (error) {
      this.logger.error(`Checksum verification failed: ${error.message}`, error.stack);
      return false;
    }
  }

  getDownloadProgress(): DownloadProgress {
    return this.downloadProgress || {
      artifactId: '',
      downloaded: 0,
      total: 0,
      percentage: 0,
      speed: 0,
      eta: 0,
      status: 'paused'
    };
  }

  protected async calculateChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!existsSync(filePath)) {
        reject(new Error(`File not found: ${filePath}`));
        return;
      }

      const hash = createHash(algorithm);
      const stream = createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => {
        const checksum = hash.digest('hex');
        this.logger.debug(`Calculated ${algorithm} checksum: ${checksum}`);
        resolve(checksum);
      });
      stream.on('error', (error) => {
        this.logger.error(`Error calculating checksum: ${error.message}`, error.stack);
        reject(error);
      });
    });
  }

  protected ensureDirectoryExists(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      this.logger.debug(`Created directory: ${dir}`);
    }
  }

  protected convertToDirectDownloadUrl(url: string): string {
    try {
      if (
        url.includes('sharepoint.com/:u:') ||
        url.includes('sharepoint.com/:b:') ||
        url.includes('sharepoint.com/:t:')
      ) {
        this.logger.debug('Detected SharePoint sharing URL, converting to direct download link');

        const urlPattern = /https:\/\/([^\/]+)\/:.:\/g\/personal\/([^\/]+)\/([A-Za-z0-9_-]+)/;
        const match = url.match(urlPattern);

        if (match) {
          const [, domain, userPath, uniqueId] = match;
          const eParam = new URL(url).searchParams.get('e');

          if (eParam) {
            const directUrl = `https://${domain}/personal/${userPath}/_layouts/15/download.aspx?share=${uniqueId}`;
            this.logger.debug(`Converted to direct download URL: ${directUrl}`);
            return directUrl;
          }

          const directUrl = `https://${domain}/personal/${userPath}/_layouts/15/download.aspx?UniqueId=${uniqueId}`;
          this.logger.debug(`Converted to direct download URL: ${directUrl}`);
          return directUrl;
        }

        const modifiedUrl = url
          .replace('/:u:/g/personal/', '/personal/')
          .replace(/\?e=.*$/, '?download=1');
        this.logger.debug(`Converted to direct download URL: ${modifiedUrl}`);
        return modifiedUrl;
      }

      return url;
    } catch (error) {
      this.logger.warn(`Error converting URL: ${error.message}, using original URL`);
      return url;
    }
  }

  protected convertGoogleDocsUrl(inputUrl: string, format: string = 'pdf'): { exportUrl: string; docId: string | null } {
    try {
      const u = new URL(inputUrl);

      if (u.hostname.includes('docs.google.com')) {
        this.logger.debug('Detected Google Docs URL, extracting document ID');

        const m = u.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (m) {
          const id = m[1];
          const exportUrl = `https://docs.google.com/document/d/${id}/export?format=${format}`;
          this.logger.debug(`Converted to export URL: ${exportUrl}`);
          return { exportUrl, docId: id };
        }
      }
    } catch (error) {
      this.logger.debug(`Error parsing URL: ${error.message}`);
    }

    return { exportUrl: inputUrl, docId: null };
  }

  protected updateProgress(artifactId: string, downloaded: number, total: number, speed: number): void {
    const percentage = total > 0 ? Math.round((downloaded / total) * 100) : 0;
    const eta = speed > 0 ? Math.round((total - downloaded) / speed) : 0;

    this.downloadProgress = {
      artifactId,
      downloaded,
      total,
      percentage,
      speed,
      eta,
      status: 'downloading'
    };

    if (percentage % 10 === 0 && percentage > 0) {
      this.logger.log(`Download progress: ${percentage}% (${this.formatBytes(downloaded)}/${this.formatBytes(total)})`);
    }
  }

  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  protected generateFilename(originalName: string, version?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = originalName.split('.').pop() || '';
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    
    if (version) {
      return `${baseName}-v${version}-${timestamp}.${extension}`;
    }
    
    return `${baseName}-${timestamp}.${extension}`;
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onShutdown(): Promise<void>;
}

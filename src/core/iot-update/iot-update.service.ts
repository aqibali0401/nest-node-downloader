import { Injectable, Logger } from '@nestjs/common';
import { createWriteStream, mkdirSync, existsSync, readdirSync, statSync, unlinkSync, rmdirSync } from 'fs';
import { join, resolve } from 'path';
import * as yauzl from 'yauzl';

export interface IoTUpdateResult {
  success: boolean;
  extractedFiles: string[];
  targetPath: string;
  errors?: string[];
}

@Injectable()
export class IoTUpdateService {
  private readonly logger = new Logger(IoTUpdateService.name);

  /**
   * Update IoT application by extracting ZIP file to target directory
   */
  async updateIoTApp(
    zipFilePath: string,
    targetApp: string,
    targetPath: string
  ): Promise<IoTUpdateResult> {
    this.logger.log('🔄 Updating IoT Application...');

    try {
      const absoluteTargetPath = resolve(targetPath);
      
      if (!existsSync(zipFilePath)) {
        throw new Error(`ZIP file not found: ${zipFilePath}`);
      }

      // Clear target directory
      await this.clearTargetDirectory(absoluteTargetPath);

      // Extract ZIP file
      const extractedFiles = await this.extractZipFile(zipFilePath, absoluteTargetPath);

      this.logger.log(`✅ Extracted ${extractedFiles.length} files to ${absoluteTargetPath}`);

      return {
        success: true,
        extractedFiles,
        targetPath: absoluteTargetPath
      };

    } catch (error) {
      this.logger.error('❌ IoT Update Failed:', error.message);
      return {
        success: false,
        extractedFiles: [],
        targetPath: targetPath,
        errors: [error.message]
      };
    }
  }

  /**
   * Clear all contents of target directory
   */
  private async clearTargetDirectory(targetPath: string): Promise<void> {
    if (!existsSync(targetPath)) {
      mkdirSync(targetPath, { recursive: true });
      return;
    }

    try {
      const items = readdirSync(targetPath);
      for (const item of items) {
        const itemPath = join(targetPath, item);
        const stats = statSync(itemPath);

        if (stats.isDirectory()) {
          await this.removeDirectoryRecursive(itemPath);
        } else {
          unlinkSync(itemPath);
        }
      }
    } catch (error) {
      this.logger.warn(`Warning clearing directory: ${error.message}`);
    }
  }

  /**
   * Recursively remove directory and all contents
   */
  private async removeDirectoryRecursive(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) return;

    const items = readdirSync(dirPath);
    for (const item of items) {
      const itemPath = join(dirPath, item);
      const stats = statSync(itemPath);

      if (stats.isDirectory()) {
        await this.removeDirectoryRecursive(itemPath);
      } else {
        unlinkSync(itemPath);
      }
    }
    rmdirSync(dirPath);
  }

  /**
   * Extract ZIP file to target directory
   */
  private async extractZipFile(zipFilePath: string, targetPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const extractedFiles: string[] = [];

      yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);

        zipfile.readEntry();
        
        zipfile.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            zipfile.readEntry();
            return;
          }

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              zipfile.readEntry();
              return;
            }

            // Remove first folder from path if it exists (e.g., node-js-sample-master/file.txt -> file.txt)
            const fileName = entry.fileName.includes('/') ? entry.fileName.split('/').slice(1).join('/') : entry.fileName;
            const outputPath = join(targetPath, fileName);
            const outputDir = join(outputPath, '..');

            if (!existsSync(outputDir)) {
              mkdirSync(outputDir, { recursive: true });
            }

            const writeStream = createWriteStream(outputPath);
            readStream.pipe(writeStream);

            writeStream.on('close', () => {
              extractedFiles.push(fileName);
              zipfile.readEntry();
            });

            writeStream.on('error', () => {
              zipfile.readEntry();
            });
          });
        });

        zipfile.on('end', () => {
          resolve(extractedFiles);
        });

        zipfile.on('error', reject);
      });
    });
  }
}

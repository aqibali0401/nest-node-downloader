import { Injectable, Logger } from '@nestjs/common';
import {
  createReadStream,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
  unlinkSync,
  rmdirSync,
} from 'fs';
import { join, resolve } from 'path';
import * as unzipper from 'unzipper';

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
    targetPath: string,
  ): Promise<IoTUpdateResult> {
    this.logger.log('Updating IoT Application...');

    try {
      const absoluteTargetPath = resolve(targetPath);

      if (!existsSync(zipFilePath)) {
        throw new Error(`ZIP file not found: ${zipFilePath}`);
      }

      // Clear target directory
      await this.clearTargetDirectory(absoluteTargetPath);

      // Extract ZIP file
      const extractedFiles = await this.extractZipFile(
        zipFilePath,
        absoluteTargetPath,
      );

      this.logger.log(
        `Extracted ${extractedFiles.length} files to ${absoluteTargetPath}`,
      );

      return {
        success: true,
        extractedFiles,
        targetPath: absoluteTargetPath,
      };
    } catch (error) {
      this.logger.error('ERROR: IoT Update Failed:', error.message);
      return {
        success: false,
        extractedFiles: [],
        targetPath: targetPath,
        errors: [error.message],
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
  private async extractZipFile(
    zipFilePath: string,
    targetPath: string,
  ): Promise<string[]> {
    const extractedFiles: string[] = [];

    return new Promise((resolve, reject) => {
      const readStream = unzipper.Extract({ path: targetPath });

      readStream.on('close', () => {
        resolve(extractedFiles);
      });

      readStream.on('error', reject);

      // Track files as they are written
      readStream.on('entry', (entry) => {
        const outputPath = join(targetPath, entry.path);
        extractedFiles.push(entry.path);
        entry.autodrain(); // safely consume entry stream
      });

      // Pipe zip file into extractor
      createReadStream(zipFilePath).pipe(readStream);
    });
  }
}

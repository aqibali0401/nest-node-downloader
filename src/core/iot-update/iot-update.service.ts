import { Injectable, Logger } from '@nestjs/common';
import {
  createReadStream,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
  unlinkSync,
  rmdirSync,
  createWriteStream,
} from 'fs';
import { dirname, join, resolve } from 'path';
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
    const corruptedFiles: string[] = [];

    if (!existsSync(targetPath)) mkdirSync(targetPath, { recursive: true });

    try {
      const directory = await unzipper.Open.file(zipFilePath);

      for (const entry of directory.files) {
        const filePath = join(targetPath, entry.path);
        
        try {
          if (entry.type === 'Directory') {
            mkdirSync(filePath, { recursive: true });
            continue;
          }
          
          mkdirSync(dirname(filePath), { recursive: true });

          // Check if file is corrupted before extraction
          if (this.isFileCorrupted(entry)) {
            this.logger.warn(`Skipping corrupted file: ${entry.path}`);
            corruptedFiles.push(entry.path);
            continue;
          }

          await new Promise<void>((resolve, reject) => {
            const writeStream = createWriteStream(filePath);
            let bytesWritten = 0;
            
            entry
              .stream()
              .on('data', (chunk) => {
                bytesWritten += chunk.length;
              })
              .pipe(writeStream)
              .on('finish', async () => {
                // Verify file integrity after extraction
                const isValid = await this.verifyExtractedFile(filePath, entry.uncompressedSize);
                if (isValid) {
                  resolve();
                } else {
                  reject(new Error(`File verification failed: ${entry.path}`));
                }
              })
              .on('error', (error) => {
                this.logger.error(`Extraction error for ${entry.path}: ${error.message}`);
                corruptedFiles.push(entry.path);
                reject(error);
              });
          });

          extractedFiles.push(entry.path);
        } catch (error) {
          this.logger.error(`Failed to extract ${entry.path}: ${error.message}`);
          corruptedFiles.push(entry.path);
          
          // Clean up partial file
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        }
      }

      if (corruptedFiles.length > 0) {
        this.logger.warn(`Extraction completed with ${corruptedFiles.length} corrupted files skipped`);
        this.logger.warn(`Corrupted files: ${corruptedFiles.join(', ')}`);
      }

    } catch (error) {
      this.logger.error(`ZIP file extraction failed: ${error.message}`, error.stack);
      throw new Error(`Failed to extract ZIP file: ${error.message}`);
    }

    return extractedFiles;
  }

  private isFileCorrupted(entry: any): boolean {
    try {
      // Check for common corruption indicators
      if (entry.uncompressedSize === 0 && entry.compressedSize > 0) {
        return true; // Suspicious: compressed but no uncompressed size
      }
      
      if (entry.uncompressedSize < 0 || entry.compressedSize < 0) {
        return true; // Negative sizes indicate corruption
      }
      
      // Check for extremely large files (potential corruption)
      if (entry.uncompressedSize > 100 * 1024 * 1024) { // 100MB limit
        this.logger.warn(`Large file detected: ${entry.path} (${entry.uncompressedSize} bytes)`);
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error checking file corruption for ${entry.path}: ${error.message}`);
      return true; // Assume corrupted if we can't check
    }
  }

  private async verifyExtractedFile(filePath: string, expectedSize: number): Promise<boolean> {
    try {
      if (!existsSync(filePath)) {
        return false;
      }
      
      const stats = statSync(filePath);
      
      // Check if file size matches expected size
      if (stats.size !== expectedSize) {
        this.logger.warn(`File size mismatch: ${filePath} (expected: ${expectedSize}, actual: ${stats.size})`);
        return false;
      }
      
      // Check if file is readable
      const testStream = createReadStream(filePath, { start: 0, end: 0 });
      return new Promise<boolean>((resolve) => {
        testStream.on('error', () => resolve(false));
        testStream.on('data', () => resolve(true));
        testStream.on('end', () => resolve(true));
      }).catch(() => false);
    } catch (error) {
      this.logger.error(`File verification failed for ${filePath}: ${error.message}`);
      return false;
    }
  }
}

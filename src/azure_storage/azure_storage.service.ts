import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import * as path from 'path';

@Injectable()
export class AzureStorageService implements OnModuleInit {
  private readonly logger = new Logger(AzureStorageService.name);

  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private containerName = process.env.AZURE_CONTAINER_NAME || 'uploads';

  async onModuleInit(): Promise<void> {
    const connStr = process.env.AZURE_STORAGE_ACCOUNT_CONN_STRING;
    if (!connStr) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is missing');
    }
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
    this.containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    // Ensure container exists
    await this.containerClient.createIfNotExists();
  }

  async downloadToBuffer(downloadPath: string, blobName: string) {
    this.logger.log(`Download Path: ${downloadPath}`);
    this.logger.log(`Blob Path: ${blobName}`);
    const blobClient = this.containerClient.getBlobClient(blobName);
    const finalDownloadPath = path.join(downloadPath, 'manifest.json');
    await blobClient.downloadToFile(finalDownloadPath);
    return finalDownloadPath;
  }

  private async streamToBuffer(readable: NodeJS.ReadableStream) {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      readable.on('data', (data) => chunks.push(Buffer.from(data)));
      readable.on('end', () => resolve(Buffer.concat(chunks)));
      readable.on('error', reject);
    });
  }

  async deleteBlob(blobName: string) {
    const blobClient = this.containerClient.getBlobClient(blobName);
    await blobClient.deleteIfExists();
  }
}

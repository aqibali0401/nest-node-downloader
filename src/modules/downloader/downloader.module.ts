import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ManifestService } from './services/manifest.service';
import { ArtifactDownloaderService } from './services/artifact-downloader.service';
import { DownloaderOrchestratorService } from './services/downloader-orchestrator.service';

@Module({
  imports: [ConfigModule],
  providers: [
    ManifestService,
    ArtifactDownloaderService,
    DownloaderOrchestratorService,
  ],
  exports: [
    ManifestService,
    ArtifactDownloaderService,
    DownloaderOrchestratorService,
  ],
})
export class DownloaderModule {}
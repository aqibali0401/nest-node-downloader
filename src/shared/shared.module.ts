import { Global, Module } from '@nestjs/common';
import { ErrorHandlerService } from './services/error-handler.service';
import { AppLoggerService } from './services/logger.service';

/**
 * Global shared module
 * Provides common services and utilities throughout the application
 */
@Global()
@Module({
  providers: [
    ErrorHandlerService,
    AppLoggerService,
  ],
  exports: [
    ErrorHandlerService,
    AppLoggerService,
  ],
})
export class SharedModule {}

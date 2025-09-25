import { Global, Module } from '@nestjs/common';
import { ErrorHandlerService } from './services/error-handler.service';

/**
 * Global shared module
 * Provides common services and utilities throughout the application
 */
@Global()
@Module({
  providers: [
    ErrorHandlerService,
  ],
  exports: [
    ErrorHandlerService,
  ],
})
export class SharedModule {}

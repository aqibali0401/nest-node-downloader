import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApplicationService } from './core/application/application.service';
import { AppLoggerService } from './shared/services/logger.service';
import { ErrorHandlerService } from './shared/services/error-handler.service';
import './scripts/ws'

async function bootstrap() {
  const logger = AppLoggerService.create('Bootstrap');
  const errorHandler = new ErrorHandlerService();
  
  try {
    logger.log('🚀 Starting EdgeSDM Application...');
    
    const app = await NestFactory.createApplicationContext(AppModule);
    const applicationService = app.get(ApplicationService);
    
    await applicationService.run();
    await app.close();
    
    logger.log('✅ Application completed successfully');
  } catch (error) {
    const errorResponse = errorHandler.handleError(error, 'Bootstrap');
    logger.error('💥 Fatal error:', errorResponse.message);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  const logger = AppLoggerService.create('UncaughtException');
  logger.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const logger = AppLoggerService.create('UnhandledRejection');
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('💥 Unhandled Promise Rejection:', error.message);
  process.exit(1);
});

process.on('SIGTERM', () => {
  const logger = AppLoggerService.create('SIGTERM');
  logger.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  const logger = AppLoggerService.create('SIGINT');
  logger.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

bootstrap();

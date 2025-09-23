import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApplicationService } from './core/application/application.service';

async function bootstrap() {
  const logger = new Logger('EdgeSDM');
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const applicationService = app.get(ApplicationService);
    
    await applicationService.run();
  } catch (error) {
    logger.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

bootstrap();

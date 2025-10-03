#!/usr/bin/env node

/**
 * Windows Service Management CLI
 *
 * Usage:
 *   npm run service:install    - Install as Windows service
 *   npm run service:start      - Start service
 *   npm run service:stop       - Stop service
 *   npm run service:restart    - Restart service
 *   npm run service:status     - Check service status
 *   npm run service:uninstall - Remove service
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NssmService } from '../core/service/nssm.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const nssmService = app.get(NssmService);

  const command = process.argv[2];

  console.log('Windows Service Management CLI');
  console.log('==============================');
  console.log('');

  try {
    switch (command) {
      case 'install':
        console.log('Installing Windows service...');
        const serviceName = process.argv[3] || 'EdgeSDM';
        const appDirectory = process.argv[4] || process.cwd();
        const installResult = nssmService.installService(
          serviceName,
          appDirectory,
        );
        if (installResult.success) {
          console.log('Service installed successfully');
          console.log('Service will start automatically on system boot.');
        } else {
          console.log('Failed to install service:', installResult.message);
          process.exit(1);
        }
        break;

      case 'start':
        console.log('Starting service...');
        const startServiceName = process.argv[3] || 'EdgeSDM';
        const startResult = nssmService.startService(
          startServiceName,
          null,
          null,
        );
        if (startResult.success) {
          console.log('Service started successfully');
        } else {
          console.log('Failed to start service:', startResult.message);
          process.exit(1);
        }
        break;

      case 'stop':
        console.log('Stopping service...');
        const stopServiceName = process.argv[3] || 'EdgeSDM';
        const stopResult = nssmService.stopService(stopServiceName);
        if (stopResult.success) {
          console.log('Service stopped successfully');
        } else {
          console.log('Failed to stop service:', stopResult.message);
          process.exit(1);
        }
        break;

      case 'restart':
        console.log('Restarting service...');
        const restartServiceName = process.argv[3] || 'EdgeSDM';
        const restartResult = nssmService.restartService(restartServiceName);
        if (restartResult.success) {
          console.log('Service restarted successfully');
        } else {
          console.log('Failed to restart service:', restartResult.message);
          process.exit(1);
        }
        break;

      case 'status':
        console.log('Checking service status...');
        const statusServiceName = process.argv[3] || 'EdgeSDM';
        const statusResult = nssmService.getServiceStatus(statusServiceName);
        console.log(`Service Status: ${statusResult.status}`);
        console.log(`Message: ${statusResult.message}`);
        break;

      case 'uninstall':
        console.log('Uninstalling service...');
        const uninstallServiceName = process.argv[3] || 'EdgeSDM';
        const uninstallResult =
          nssmService.uninstallService(uninstallServiceName);
        if (uninstallResult.success) {
          this.logger.log(
            `Service "${uninstallServiceName}" uninstalled successfully`,
          );
        } else {
          this.logger.error(
            `Failed to uninstall service: ${uninstallResult.message}`,
          );
          process.exit(1);
        }
        break;

      case 'check':
        console.log('Checking NSSM availability...');
        const checkResult = nssmService.checkNssmAvailability();
        if (checkResult.available) {
          console.log('NSSM is available and working');
        } else {
          console.log('NSSM not available:', checkResult.message);
          console.log('');
          console.log('To install NSSM:');
          console.log('1. Download from: https://nssm.cc/download');
          console.log('2. Extract to C:\\nssm\\');
          console.log('3. Run this command again');
          process.exit(1);
        }
        break;

      default:
        console.log('Usage: npm run service:<command>');
        console.log('');
        console.log('Available commands:');
        console.log('  install    - Install as Windows service');
        console.log('  start      - Start service');
        console.log('  stop       - Stop service');
        console.log('  restart    - Restart service');
        console.log('  status     - Check service status');
        console.log('  uninstall  - Remove service');
        console.log('  check      - Check NSSM availability');
        console.log('');
        console.log('Examples:');
        console.log('  npm run service:install');
        console.log('  npm run service:status');
        console.log('  npm run service:uninstall');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

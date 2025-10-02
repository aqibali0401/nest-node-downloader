import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'child_process';
import * as path from 'path';

@Injectable()
export class NssmService {
  private readonly logger = new Logger(NssmService.name);
  private readonly nssmPath: string;

  constructor(private readonly configService: ConfigService) {
    this.nssmPath = this.configService.get<string>('NSSM_PATH', 'C:\\nssm\\win64\\nssm.exe');
  }

  /**
   * Install the application as a Windows service using NSSM
   */
  installService(serviceName: string, appDirectory: string): { success: boolean; message: string } {
    try {
      this.logger.log('Installing Windows service...');

      const nodePath = this.configService.get<string>('NODE_PATH', 'C:\\Program Files\\nodejs\\node.exe');
      //  const npmPath = this.configService.get<string>('NPM_PATH', 'C:\\Program Files\\nodejs\\npm.cmd');
      const scriptPath = path.resolve(appDirectory, 'dist', 'main.js');

      this.logger.log(`Service Name: ${serviceName}`);
      this.logger.log(`Node Path: ${nodePath}`);
      this.logger.log(`Script Path: ${scriptPath}`);
      this.logger.log(`Working Directory: ${appDirectory}`);

      // 1. Install the service
      // execSync(
      //       `"${npmPath}" ci"`,
      //       { stdio: 'inherit' }
      //     );

      this.logger.log('Step 1: Installing service...');
      execSync(
        `"${this.nssmPath}" install ${serviceName} "${nodePath}" "${scriptPath}"`,
        { stdio: 'inherit' }
      );

      // 2. Configure working directory
      this.logger.log('Step 2: Setting working directory...');
      execSync(
        `"${this.nssmPath}" set ${serviceName} AppDirectory "${appDirectory}"`,
        { stdio: 'inherit' }
      );

      // 3. Configure logging
      this.logger.log('Step 3: Configuring logging...');
      const logDir = path.join(appDirectory, 'nssm_logs');

      // Create logs directory if it doesn't exist
      try {
        execSync(`mkdir "${logDir}"`, { stdio: 'pipe' });
      } catch (error) {
        // Directory might already exist, ignore error
      }

      execSync(
        `"${this.nssmPath}" set ${serviceName} AppStdout "${path.join(logDir, `${serviceName}-out.log`)}"`,
        { stdio: 'inherit' }
      );
      execSync(
        `"${this.nssmPath}" set ${serviceName} AppStderr "${path.join(logDir, `${serviceName}-err.log`)}"`,
        { stdio: 'inherit' }
      );

      // 4. Enable log rotation (10 MB per file)
      this.logger.log('Step 4: Configuring log rotation...');
      execSync(
        `"${this.nssmPath}" set ${serviceName} AppRotateFiles 1`,
        { stdio: 'inherit' }
      );
      execSync(
        `"${this.nssmPath}" set ${serviceName} AppRotateBytes 10485760`,
        { stdio: 'inherit' }
      );

      // 5. Set service to start automatically
      this.logger.log('Step 6: Setting auto-start...');
      execSync(
        `"${this.nssmPath}" set ${serviceName} Start SERVICE_AUTO_START`,
        { stdio: 'inherit' }
      );

      this.logger.log(`Service '${serviceName}' installed successfully`);
      return {
        success: true,
        message: `Service '${serviceName}' installed successfully`
      };

    } catch (error) {
      this.logger.error(`Failed to install service: ${error.message}`);
      return {
        success: false,
        message: `Failed to install service: ${error.message}`
      };
    }
  }

  /**
   * Start the Windows service
   */
  startService(serviceName: string): { success: boolean; message: string } {
    try {
      this.logger.log(`Starting service '${serviceName}'...`);
      execSync(`"${this.nssmPath}" start ${serviceName}`, { stdio: 'inherit' });
      this.logger.log(`Service '${serviceName}' started successfully`);

      const output = execSync(`"${this.nssmPath}" status ${serviceName}`, {
        stdio: 'pipe',
        encoding: 'utf8'
      });
      console.log(output, "outputoutput")
      return {
        success: true,
        message: `Service '${serviceName}' started successfully`
      };
    } catch (error) {
      this.logger.error(`Failed to start service: ${error.message}`);
      return {
        success: false,
        message: `Failed to start service: ${error.message}`
      };
    }
  }

  /**
   * Stop the Windows service
   */
  stopService(serviceName: string): { success: boolean; message: string } {
    try {
      this.logger.log(`Stopping service '${serviceName}'...`);
      execSync(`"${this.nssmPath}" stop ${serviceName}`, { stdio: 'inherit' });
      this.logger.log(`Service '${serviceName}' stopped successfully`);
      return {
        success: true,
        message: `Service '${serviceName}' stopped successfully`
      };
    } catch (error) {
      this.logger.error(`Failed to stop service: ${error.message}`);
      return {
        success: false,
        message: `Failed to stop service: ${error.message}`
      };
    }
  }

  /**
   * Restart the Windows service
   */
  restartService(serviceName: string): { success: boolean; message: string } {
    try {
      this.logger.log(`Restarting service '${serviceName}'...`);
      execSync(`"${this.nssmPath}" restart ${serviceName}`, { stdio: 'inherit' });
      this.logger.log(`Service '${serviceName}' restarted successfully`);
      return {
        success: true,
        message: `Service '${serviceName}' restarted successfully`
      };
    } catch (error) {
      this.logger.error(`Failed to restart service: ${error.message}`);
      return {
        success: false,
        message: `Failed to restart service: ${error.message}`
      };
    }
  }

  /**
   * Get service status
   */
  getServiceStatus(serviceName: string): { status: string; message: string } {
    try {
      const output = execSync(`"${this.nssmPath}" status ${serviceName}`, {
        stdio: 'pipe',
        encoding: 'utf8'
      });

      return {
        status: output.trim(),
        message: `Service status retrieved successfully`
      };
    } catch (error) {
      return {
        status: 'UNKNOWN',
        message: `Failed to get service status: ${error.message}`
      };
    }
  }

  /**
   * Uninstall the Windows service
   */
  uninstallService(serviceName: string): { success: boolean; message: string } {
    try {
      this.logger.log(`Uninstalling service '${serviceName}'...`);

      // Stop service first
      try {
        execSync(`"${this.nssmPath}" stop ${serviceName}`, { stdio: 'pipe' });
      } catch (error) {
        // Service might not be running, continue
      }

      // Remove service
      execSync(`"${this.nssmPath}" remove ${serviceName} confirm`, {
        stdio: 'inherit',
      });

      this.logger.log(`Service '${serviceName}' uninstalled successfully`);
      return {
        success: true,
        message: `Service '${serviceName}' uninstalled successfully`
      };
    } catch (error) {
      this.logger.error(`Failed to uninstall service: ${error.message}`);
      return {
        success: false,
        message: `Failed to uninstall service: ${error.message}`
      };
    }
  }

  /**
   * Check if NSSM is available
   */
  checkNssmAvailability(): { available: boolean; message: string } {
    try {
      execSync(`"${this.nssmPath}" version`, { stdio: 'pipe' });
      return {
        available: true,
        message: 'NSSM is available and working'
      };
    } catch (error) {
      return {
        available: false,
        message: `NSSM not found at ${this.nssmPath}. Please install NSSM first.`
      };
    }
  }
}

import { Injectable } from '@nestjs/common';
import * as si from 'systeminformation';
import * as os from 'os';
import { AppLoggerService } from '../../shared/services/logger.service';

@Injectable()
export class DeviceInfoService {
  private readonly logger = new AppLoggerService(DeviceInfoService.name);
  private deviceInfo: any = null;

  /**
   * Collect comprehensive device information
   * Based on Azure IoT Device Monitoring code
   */
  async collectDeviceInfo() {
    try {
      this.logger.log('Collecting device information...');

      const [cpu, mem, osInfo, system, networkInterfaces, disk] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.osInfo(),
        si.system(),
        si.networkInterfaces(),
        si.diskLayout(),
      ]);

      this.deviceInfo = {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: os.uptime(),
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          cores: cpu.cores,
          physicalCores: cpu.physicalCores,
          speed: cpu.speed,
        },
        memory: {
          total: mem.total,
          available: mem.available,
        },
        os: {
          distro: osInfo.distro,
          release: osInfo.release,
          codename: osInfo.codename,
          kernel: osInfo.kernel,
          arch: osInfo.arch,
        },
        system: {
          manufacturer: system.manufacturer,
          model: system.model,
          version: system.version,
          serial: system.serial,
          uuid: system.uuid,
        },
        network: networkInterfaces.map((iface) => ({
          iface: iface.iface,
          type: iface.type,
          mac: iface.mac,
          ip4: iface.ip4,
          ip6: iface.ip6,
        })),
        storage: disk.map((d) => ({
          type: d.type,
          name: d.name,
          size: d.size,
          vendor: d.vendor,
        })),
      };

      this.logger.log('Device information collected successfully');
      return this.deviceInfo;
    } catch (error) {
      this.logger.error('Failed to collect device information:', error);
      throw error;
    }
  }

  /**
   * Get device summary for logging
   */
  getDeviceSummary() {
    if (!this.deviceInfo) {
      return null;
    }

    return {
      hostname: this.deviceInfo.hostname,
      platform: this.deviceInfo.platform,
      cpu: this.deviceInfo.cpu.brand,
      memory: `${(this.deviceInfo.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB`,
    };
  }
}

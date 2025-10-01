#!/usr/bin/env ts-node

/**
 * Simple Device Information Script
 * Based on Azure IoT Device Monitoring code
 */

const si = require('systeminformation');
const os = require('os');

async function collectDeviceInfo() {
  try {
    console.log('Collecting device information...\n');

    const [cpu, mem, osInfo, system, networkInterfaces, disk] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.system(),
      si.networkInterfaces(),
      si.diskLayout(),
    ]);

    const deviceInfo = {
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

    // Display the information
    console.log('DEVICE INFORMATION');
    console.log('=====================');
    console.log(`Hostname: ${deviceInfo.hostname}`);
    console.log(`Platform: ${deviceInfo.platform}`);
    console.log(`Architecture: ${deviceInfo.arch}`);
    console.log(`Release: ${deviceInfo.release}`);
    console.log(`Uptime: ${Math.floor(deviceInfo.uptime / 3600)} hours\n`);

    console.log('CPU INFORMATION');
    console.log('==================');
    console.log(`Manufacturer: ${deviceInfo.cpu.manufacturer}`);
    console.log(`Brand: ${deviceInfo.cpu.brand}`);
    console.log(`Cores: ${deviceInfo.cpu.cores} (${deviceInfo.cpu.physicalCores} physical)`);
    console.log(`Speed: ${deviceInfo.cpu.speed} MHz\n`);

    console.log('MEMORY INFORMATION');
    console.log('=====================');
    console.log(`Total: ${(deviceInfo.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`Available: ${(deviceInfo.memory.available / 1024 / 1024 / 1024).toFixed(2)} GB\n`);

    console.log('OPERATING SYSTEM');
    console.log('=====================');
    console.log(`Distribution: ${deviceInfo.os.distro}`);
    console.log(`Release: ${deviceInfo.os.release}`);
    console.log(`Kernel: ${deviceInfo.os.kernel}\n`);

    console.log('SYSTEM INFORMATION');
    console.log('======================');
    console.log(`Manufacturer: ${deviceInfo.system.manufacturer}`);
    console.log(`Model: ${deviceInfo.system.model}`);
    console.log(`Serial: ${deviceInfo.system.serial}\n`);

    console.log('NETWORK INTERFACES');
    console.log('====================');
    deviceInfo.network.forEach((iface, index) => {
      console.log(`Interface ${index + 1}: ${iface.iface}`);
      console.log(`  MAC: ${iface.mac}`);
      console.log(`  IPv4: ${iface.ip4}`);
      console.log('');
    });

    console.log('STORAGE DEVICES');
    console.log('==================');
    deviceInfo.storage.forEach((device, index) => {
      console.log(`Device ${index + 1}: ${device.name}`);
      console.log(`  Size: ${(device.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`  Vendor: ${device.vendor}`);
      console.log('');
    });

    console.log('Device information collected successfully!');
    return deviceInfo;

  } catch (error) {
    console.error('Failed to collect device information:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  collectDeviceInfo().catch(console.error);
}

export { collectDeviceInfo };

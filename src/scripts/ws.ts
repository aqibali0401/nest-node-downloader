#!/usr/bin/env node

/**
 * Simple WebSocket Client
 * Connects to WebSocket server and sends device info every 5 seconds
 */

import { WebSocket } from 'ws';
import { collectDeviceInfo } from './device-info-simple';

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('App A connected to App B');

  // Send device registration
  // ws.send(JSON.stringify({ deviceId: 'my-device' }));

  // Send telemetry every 5 seconds
  (async () => {
    try {
      console.log('Collecting device information...');
      const deviceInfo = await collectDeviceInfo();
      console.log(deviceInfo,"+++++++++++++++")
      const telemetryData = {
        deviceId: deviceInfo?.system?.serial,
        timestamp: new Date().toISOString(),
        deviceInfo: deviceInfo,
        status: 'online'
      };

      ws.send(JSON.stringify(telemetryData));
      console.log('Sent telemetry data');
    } catch (error) {
      console.error('Failed to collect device info:', error);
    }
  })();

  ws.on('message', (data) => {
    const dataString = data?.toString();
    const cmd = JSON.parse(dataString);
    console.log('Received command from App B:', cmd);
  });
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nClosing WebSocket connection...');
  ws.close();
  process.exit(0);
});

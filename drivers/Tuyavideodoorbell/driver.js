const Homey = require('homey');
const TuyAPI = require('tuyapi');
const net = require('net');
const os = require('os');

class MyDriver extends Homey.Driver {
  async onInit() {
    this.homey.app.log('Tuya Doorbell Driver initialized');
  }

  async onPair(session) {
    let pairingDevice = {};
    
    // Show the first view
    session.showView('start');

    // Handle manual settings input
    session.setHandler('manual_settings', async (data) => {
      this.homey.app.log('Received manual settings:', data);
      
      pairingDevice = {
        name: 'Tuya Doorbell',
        data: {
          id: data.deviceId
        },
        settings: {
          deviceId: data.deviceId,
          localKey: data.localKey,
          ipAddress: data.ipAddress,
          port: data.port || 6668
        }
      };
      
      // Proceed to device validation
      session.emit('list_devices', [pairingDevice]);
    });

    // Handle discovered devices list
    session.setHandler('list_devices', async (devices) => {
      console.log('List devices handler called with:', devices);
      return devices || [pairingDevice];
    });

    // Start discovery when entering automatic search
    session.setHandler('search_auto', async (data) => {
      console.log("Starting discovery with credentials:", { deviceId: data.deviceId, key: '[hidden]' });
      try {
        // First scan network for devices on port 6668
        console.log("Scanning network for open port 6668...");
        const ips = await this.scanNetwork();
        console.log("Found devices:", ips);

        // Try each IP with the provided credentials
        for (const ip of ips) {
          try {
            console.log(`Trying to connect to ${ip} with provided credentials...`);
            const device = new TuyAPI({
              id: data.deviceId,
              key: data.localKey,
              ip: ip,
              version: '3.3'
            });

            console.log(`Attempting to connect to device at ${ip}...`);
            await device.connect();
            console.log(`Successfully connected to device at ${ip}`);
            
            // Get device info before disconnecting
            const status = await device.get({schema: true});
            console.log(`Got device status:`, status);
            
            await device.disconnect();
            console.log(`Disconnected from device at ${ip}`);

            const discoveredDevice = {
              name: 'Tuya Doorbell',
              data: {
                id: data.deviceId
              },
              settings: {
                deviceId: data.deviceId,
                localKey: data.localKey,
                ipAddress: ip,
                port: 6668,
                gwID: device.gwID,
                productKey: device.productKey,
                mac: device.mac || await this.getMacFromDevice(device)
              }
            };

            return [discoveredDevice];
          } catch (err) {
            console.log(`Failed to connect to ${ip}:`, err.message);
            continue;
          }
        }

        console.log("No matching device found");
        return [];
      } catch (error) {
        console.error("Discovery failed:", error);
        return [];
      }
    });

    // Validate credentials before adding device
    session.setHandler('validate', async (device) => {
      try {
        const testDevice = new TuyAPI({
          id: device.settings.deviceId,
          key: device.settings.localKey,
          ip: device.settings.ipAddress,
          port: device.settings.port,
          version: '3.3'
        });
        
        await testDevice.connect();
        await testDevice.disconnect();
        return true;
      } catch (error) {
        this.homey.app.log('Validation failed:', error);
        throw new Error(this.homey.__('pair.validation_failed'));
      }
    });
  }

  async scanNetwork() {
    return new Promise(async (resolve) => {
      const foundIPs = [];
      const baseAddr = '192.168.113';
      const scanPromises = [];

      console.log("Starting port scan on network:", baseAddr);

      for (let i = 1; i < 255; i++) {
        const ip = `${baseAddr}.${i}`;
        scanPromises.push(
          new Promise((resolveIP) => {
            const socket = new net.Socket();
            socket.setTimeout(500);

            socket.on('connect', () => {
              console.log(`Found device at ${ip}`);
              foundIPs.push(ip);
              socket.destroy();
              resolveIP();
            });

            socket.on('error', () => {
              socket.destroy();
              resolveIP();
            });

            socket.on('timeout', () => {
              socket.destroy();
              resolveIP();
            });

            socket.connect(6668, ip);
          })
        );
      }

      await Promise.all(scanPromises);
      console.log(`Found ${foundIPs.length} devices listening on port 6668`);
      resolve(foundIPs);
    });
  }

  async getMacFromDevice(device) {
    try {
      const status = await device.get();
      if (status && status.mac) {
        return status.mac;
      }
      // Try to get MAC from device info
      const info = await device.get({schema: true});
      return info.mac || null;
    } catch (error) {
      console.log('Failed to get MAC address:', error);
      return null;
    }
  }
}

module.exports = MyDriver;

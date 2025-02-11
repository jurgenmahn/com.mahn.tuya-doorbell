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
    session.setHandler('list_devices', async () => {
      console.log('List devices handler called with pairingDevice:', pairingDevice);
      return [pairingDevice];
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
            
            // Get device info with timeout
            const status = await Promise.race([
              device.get({schema: true}),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Device info timeout')), 5000)
              )
            ]);
            console.log(`Got device status:`, status);

            // Verify this is the correct device by checking the device ID
            if (status && status.dps && (status.dps['101'] !== undefined || status.dps['103'] !== undefined)) {
              console.log('Found matching doorbell device');
              
              // Get MAC address
              const mac = await this.getMacFromDevice(device);
              console.log('Device MAC:', mac);
              
              await device.disconnect();
              console.log(`Disconnected from device at ${ip}`);

              // Store the discovered device and return immediately
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

            pairingDevice = discoveredDevice;
            return [discoveredDevice]; // This will resolve the promise
          } catch (err) {
            console.log(`Failed to connect to ${ip}:`, err.message);
            continue;
          }
        }

        throw new Error(this.homey.__('errors.no_devices_found'));
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
      // Try different methods to get MAC address
      const methods = [
        async () => {
          const status = await device.get();
          return status?.mac;
        },
        async () => {
          const info = await device.get({schema: true});
          return info?.mac;
        },
        async () => {
          // Try to get MAC from device info response
          const response = await device.get({dps: ['101', '103']});
          return response?.mac || response?.cid;
        }
      ];

      for (const method of methods) {
        try {
          const mac = await method();
          if (mac) {
            console.log('Found MAC address:', mac);
            return mac;
          }
        } catch (err) {
          console.log('MAC retrieval method failed:', err.message);
        }
      }

      console.log('Could not retrieve MAC address');
      return null;
    } catch (error) {
      console.log('Failed to get MAC address:', error);
      return null;
    }
  }
}

module.exports = MyDriver;

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
              version: 3.3,
              nullPayloadOnJSONError: true,
              issueGetOnConnect: false,  // Don't auto-request on connect
              issueRefreshOnConnect: false, // Don't auto-refresh on connect
              port: 6668
            });

            // Set up error handler before connecting
            device.on('error', (err) => {
              console.log('Device error:', err);
              // Error is handled, prevent it from bubbling up
            });

            console.log(`Attempting to connect to device at ${ip}...`);
            await device.connect();
            console.log(`Successfully connected to device at ${ip}`);
            
            // Get device info with increased timeout and retries
            let status;
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                console.log(`Attempt ${attempt} to get device info...`);
                status = await Promise.race([
                  device.get({schema: true}),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Device info timeout')), 15000)
                  )
                ]);
                break; // If successful, exit the retry loop
              } catch (err) {
                if (attempt === 3) throw err; // Rethrow on final attempt
                console.log(`Attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
              }
            }
            console.log(`Got device status:`, status);

            // Verify this is the correct device by checking the device ID
            if (status && status.dps && (status.dps['101'] !== undefined || status.dps['103'] !== undefined)) {
              console.log('Found matching doorbell device');
              
              try {
                // Get MAC address using ARP
                const mac = await this.getMacFromDevice(ip);
                console.log('Device MAC:', mac);
                
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
              } finally {
                // Ensure device is disconnected
                try {
                  await device.disconnect();
                  console.log(`Disconnected from device at ${ip}`);
                } catch (disconnectErr) {
                  console.log(`Error during disconnect:`, disconnectErr.message);
                }
              }
            }
            // Not a matching device, disconnect and continue
            await device.disconnect();
            console.log(`Not a matching device at ${ip}, continuing search...`);
          } catch (err) {
            console.log(`Failed to connect to ${ip}:`, err.message);
            try {
              await device.disconnect();
            } catch (disconnectErr) {
              console.log(`Error during disconnect:`, disconnectErr.message);
            }
            continue;
          }
        }

        // If we get here, no device was found
        throw new Error(this.homey.__('errors.no_devices_found'));
      } catch (error) {
        console.error("Discovery failed:", error);
        throw error; // Propagate error to frontend
      }
    });

    // Handle add device
    session.setHandler('add_device', async (device) => {
      try {
        console.log('Add device handler called with:', device);
        
        // Store the device data for pairing
        const deviceToAdd = {
          name: device.name || 'Tuya Doorbell',
          data: {
            id: device.settings.deviceId // This is required for device identification
          },
          settings: {
            deviceId: device.settings.deviceId,
            localKey: device.settings.localKey,
            ipAddress: device.settings.ipAddress,
            port: device.settings.port || 6668
          },
          store: {
            mac: device.settings.mac || null
          },
          capabilities: [
            'button',
            'alarm_motion',
            'alarm_problem',
            'volume_set'
          ]
        };

        // Validate the device before adding
        await this.validateDevice(deviceToAdd);
        
        console.log('Device validated and ready to add:', deviceToAdd);
        return deviceToAdd;
      } catch (error) {
        console.error('Add device failed:', error);
        throw new Error(this.homey.__('errors.invalid_credentials'));
      }
    });

  }

  // Validate credentials before adding device
  async validateDevice(device) {
    try {
      console.log('Validating device:', device);
      const testDevice = new TuyAPI({
        id: device.settings.deviceId,
        key: device.settings.localKey,
        ip: device.settings.ipAddress,
        port: device.settings.port,
        version: 3.3,
        nullPayloadOnJSONError: true
      });

      // Set up error handler
      testDevice.on('error', err => {
        console.log('Validation device error:', err);
      });
      
      console.log('Attempting to connect to device...');
      await testDevice.connect();
      console.log('Connected successfully');
      
      // Try to get device info
      const status = await Promise.race([
        testDevice.get({schema: true}),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Validation timeout')), 5000)
        )
      ]);
      console.log('Got device status:', status);

      await testDevice.disconnect();
      console.log('Validation successful');
      return true;
    } catch (error) {
      this.homey.app.log('Validation failed:', error);
      throw new Error(this.homey.__('pair.validation_failed'));
    }
  }

  async scanNetwork() {
    const foundIPs = [];
    const baseAddr = '192.168.113';
    const BATCH_SIZE = 25;
    let scannedCount = 0;

    console.log("Starting port scan on network:", baseAddr);

    // Scan in batches to avoid overwhelming the network
    for (let start = 1; start < 255; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE, 255);
      const batchPromises = [];
      
      for (let i = start; i < end; i++) {
        const ip = `${baseAddr}.${i}`;
        batchPromises.push(
        new Promise((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(1000); // Increase timeout for more reliable detection

          socket.on('connect', () => {
            console.log(`Found device at ${ip}`);
            foundIPs.push(ip);
            socket.destroy();
            resolve();
          });

          socket.on('error', () => {
            socket.destroy();
            resolve();
          });

          socket.on('timeout', () => {
            socket.destroy();
            resolve();
          });

          socket.connect(6668, ip);
        })
      );
    }

      await Promise.all(batchPromises);
      scannedCount += BATCH_SIZE;
      console.log(`Scanned ${scannedCount}/254 addresses...`);
    }
    console.log(`Found ${foundIPs.length} devices listening on port 6668`);
    return foundIPs;
  }

  async getMacFromDevice(ip) {
    try {
      const { execSync } = require('child_process');
      // Run arp -a to get MAC addresses
      const arpOutput = execSync('arp -a').toString();
      
      // Parse the output to find MAC for our IP
      const lines = arpOutput.split('\n');
      for (const line of lines) {
        if (line.includes(ip)) {
          const match = line.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/);
          if (match) {
            const mac = match[0].toLowerCase();
            console.log(`Found MAC address for ${ip}:`, mac);
            return mac;
          }
        }
      }
      console.log(`No MAC address found for ${ip}`);
      return null;
    } catch (error) {
      console.log('Failed to get MAC address:', error);
      return null;
    }
  }
}

module.exports = MyDriver;

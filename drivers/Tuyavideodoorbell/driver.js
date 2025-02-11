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
      return [pairingDevice];
    });

    // Start discovery when entering automatic search
    session.setHandler('search_auto', async () => {
      const discoveryResult = await this.discoverDevices(session);
      console.log("Discovery done");
      return discoveryResult;
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

  async discoverDevices(session) {
    console.log("=== Device discovery started ===");
    const devices = [];
    const net = require('net');
    const os = require('os');
    
    console.log("Getting network interfaces...");
    // Hardcoded network range for debugging
    const baseAddr = '192.168.113';
    console.log("Using hardcoded network range for debug:", baseAddr);
    console.log("Base network address:", baseAddr);
    const scanPromises = [];

    console.log("Starting IP range scan...");
    // Scan IP range
    for (let i = 1; i < 255; i++) {
      const ip = `${baseAddr}.${i}`;
      scanPromises.push(this.checkDevice(ip, devices, session));
    }

    try {
      await Promise.all(scanPromises);
      
      if (devices.length === 0) {
        console.log("No devices found");
        session.emit('no_devices', []);
        session.showView('no_devices');
      }
      
      return devices;
    } catch (error) {
      console.log('Discovery failed:', error);
      session.emit('no_devices', []);
      session.showView('no_devices');
      return [];
    }
  }

  checkDevice(ip, devices, session) {
    return new Promise((resolve) => {
      console.log(`Checking IP: ${ip}`);
      const socket = new net.Socket();
      const timeout = 500; // 500ms timeout per device

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        console.log(`=== Found device at ${ip} ===`);
        console.log("Sending Tuya handshake...");
        
        // Send initial Tuya handshake (0x000055aa00000000000000070000000000000000aa55)
        const handshake = Buffer.from('000055aa00000000000000070000000000000000aa55', 'hex');
        console.log("Sending handshake:", handshake);
        socket.write(handshake);

        // Set up response handling
        socket.on('data', (data) => {
            console.log(`Raw response from ${ip}:`, data);
            
            // Check if response starts with 55aa (valid Tuya device)
            if (data.length >= 2 && data[0] === 0x55 && data[1] === 0xaa) {
                console.log(`Found Tuya device at ${ip}`);
                
                // If we have enough data for a complete message
                if (data.length >= 16) {
                    // Extract payload length from bytes 8-12
                    const length = data.readUInt32BE(8);
                    console.log(`Message payload length: ${length}`);
                    
                    if (data.length >= 16 + length + 6) {
                        const payload = data.slice(16, 16 + length);
                        console.log(`Message payload: ${payload}`);
                        
                        // Add confirmed Tuya device
                        const device = {
                            name: 'Tuya Doorbell',
                            data: {
                                id: ip.replace(/\./g, '')
                            },
                            settings: {
                                ipAddress: ip,
                                port: 6668
                            }
                        };

                        if (!devices.find(d => d.data.id === device.data.id)) {
                            devices.push(device);
                            session.emit('list_devices', devices);
                        }
                    }
                }
            } else {
                console.log(`Device at ${ip} is not a Tuya device`);
            }
        });

        // Add potential device
        const device = {
          name: 'Tuya Device',
          data: {
            id: ip.replace(/\./g, '') // Temporary ID based on IP
          },
          settings: {
            ipAddress: ip,
            port: 6668
          }
        };

        if (!devices.find(d => d.data.id === device.data.id)) {
          devices.push(device);
          session.emit('list_devices', devices);
        }
      });

      socket.on('error', (err) => {
        console.log(`Socket error for ${ip}:`, err.message);
        socket.destroy();
        resolve();
      });

      socket.on('timeout', () => {
        console.log(`Connection timeout for ${ip}`);
        socket.destroy();
        resolve();
      });

      socket.on('data', (data) => {
        console.log(`Received data from ${ip}:`, data);
      });

      socket.connect(6668, ip);
    });
  }
}

module.exports = MyDriver;

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
    // Get local network interfaces
    const interfaces = os.networkInterfaces();
    const networks = [];
    
    // Find all IPv4 addresses
    console.log("Available interfaces:", interfaces);
    Object.values(interfaces).forEach(iface => {
      iface.forEach(addr => {
        if (addr.family === 'IPv4' && !addr.internal) {
          console.log("Found network interface:", addr.address);
          networks.push(addr.address);
        }
      });
    });
    console.log("Valid networks found:", networks);

    if (networks.length === 0) {
      console.log('No network interfaces found');
      session.emit('no_devices', []);
      session.showView('no_devices');
      return [];
    }

    // Get the network base address (assuming /24 subnet)
    const baseAddr = networks[0].split('.').slice(0, 3).join('.');
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
        console.log("Preparing Tuya handshake message...");
        // Send Tuya protocol handshake
        const prefix = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        const command = JSON.stringify({ cmd: 'query' });
        const suffix = Buffer.from([0x00]);
        const message = Buffer.concat([prefix, Buffer.from(command), suffix]);
        
        console.log("Sending handshake message:", message);
        socket.write(message);

        // Add potential device
        const device = {
          name: 'Tuya Doorbell',
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

const Homey = require('homey');
const TuyAPI = require('tuyapi');
const net = require('net');

class TuyaLocalDriver extends Homey.Driver {
  async onInit() {
    this.homey.app.log('Tuya Doorbell Driver initialized');
  }

  async onPair(session) {
    let pairingDevice = {};

    session.setHandler('search_device', async (data) => {
      this.homey.app.log('Received settings:', data);

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
        },
        icon: "/img/devices/doorbell.svg"
      };

      let ips = [];
      if (pairingDevice.settings.ipAddress != "") {
        ips = [pairingDevice.settings.ipAddress];
      } else {
        this.homey.app.log("No ipaddress received, scanning network for open port " + pairingDevice.settings.port);
        ips = await this.scanNetwork(pairingDevice.settings.port);
        this.homey.app.log("Found devices:", ips);
      }

      let deviceFound = false;
      for (const ip of ips) {
        pairingDevice.settings.ipAddress = ip;
        if (await this.validateDevice(pairingDevice)) {
          this.homey.app.log("Doorbell found");
          this.homey.app.log('get device MACaddress');
          pairingDevice.data.id = await this.homey.arp.getMAC(ip);
          deviceFound = true;
          session.showView('list_devices');
          break;
        }
      }

      if (!deviceFound) {
        session.showView('start');
        throw new Error(this.homey.__('errors.no_devices_found'));
      }

    });

    // Handle discovered devices list
    session.setHandler('list_devices', async () => {
      this.homey.app.log('List devices handler called with pairingDevice:', pairingDevice);
      if (!pairingDevice || Object.keys(pairingDevice).length === 0) {
        throw new Error(this.homey.__('errors.no_devices_found'));
      }
      return [pairingDevice];
    });

    session.setHandler('add_device', async (data) => {
      console.log("add_device, data:")
      console.log(data)

      const devices = this.getDevices();

      // Find the device by its ID
      const device = devices.find(device => device.getData().id === data.data.id);
  
      if (device) {
        this.log(`Device found: ${device.getName()}`);
        device.onInit();
      } else {
        this.log('Device not found');
      } 
    });       

  }

  async validateDevice(device) {
    try {
      this.homey.app.log('Validating device:', device);
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
        this.homey.app.log('Validation device error:', err);
      });

      this.homey.app.log('Attempting to connect to device...');
      await testDevice.connect();
      this.homey.app.log('Connected successfully');

      // Try to get device info
      const status = await Promise.race([
        testDevice.get({
          schema: true
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Validation timeout')), 5000)
        )
      ]);
      this.homey.app.log('Got device status:', status);

      if (status && status.dps && (status.dps['101'] !== undefined || status.dps['103'] !== undefined)) {
        this.homey.app.log('Found matching doorbell device');
      } else {
        this.homey.app.log('Found a tuya device, but not a supported doorbell');
        this.homey.app.log('Validation failed');
        await testDevice.disconnect();
        return false;
      }

      await testDevice.disconnect();
      this.homey.app.log('Validation successful');
      return true;
    } catch (error) {
      this.homey.app.log('Validation failed:', error);
      return false;
    }
  }

  async scanNetwork(port, baseAddr = '192.168.113') {
    const foundIPs = [];
    const BATCH_SIZE = 25;
    let scannedCount = 0;

    this.homey.app.log("Starting port scan on network:", baseAddr);

    // Scan in batches to avoid overwhelming the network
    for (let start = 1; start < 255; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE, 255);
      const batchPromises = [];

      for (let i = start; i < end; i++) {
        const ip = `${baseAddr}.${i}`;
        batchPromises.push(
          new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(1000);

            socket.on('connect', () => {
              this.homey.app.log(`Found device at ${ip}`);
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

            socket.connect(port, ip);
          })
        );
      }

      await Promise.all(batchPromises);
      scannedCount += BATCH_SIZE;
      this.homey.app.log(`Scanned ${scannedCount}/254 addresses...`);
    }
    this.homey.app.log(`Found ${foundIPs.length} devices listening on port ${port}`);
    return foundIPs;
  }

}

module.exports = TuyaLocalDriver;
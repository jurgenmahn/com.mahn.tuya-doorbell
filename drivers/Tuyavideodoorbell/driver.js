const Homey = require('homey');
const TuyAPI = require('tuyapi');

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
      await this.discoverDevices(session);
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
    try {
      const devices = [];
      const dgram = require('dgram');
      const socket = dgram.createSocket('udp4');
      
      socket.on('error', (err) => {
        this.log('Socket error:', err);
        socket.close();
      });

      socket.on('listening', () => {
        socket.setBroadcast(true);
        const discoveryMessage = Buffer.from('{"t": "scan"}');
        socket.send(discoveryMessage, 0, discoveryMessage.length, 6668, '255.255.255.255');
      });
      
      socket.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.gwId) {
            const device = {
              name: 'Tuya Doorbell',
              data: {
                id: data.gwId
              },
              settings: {
                deviceId: data.gwId,
                ipAddress: rinfo.address,
                port: 6668
              }
            };
            if (!devices.find(d => d.data.id === device.data.id)) {
              devices.push(device);
              session.emit('list_devices', devices);
            }
          }
        } catch (err) {
          this.log('Error parsing device response:', err);
        }
      });

      socket.bind();

      // Close socket after 30 seconds
      setTimeout(() => {
        socket.close();
        if (devices.length === 0) {
          session.emit('list_devices', []);
        }
      }, 30000);
    } catch (error) {
      this.log('Discovery failed:', error);
      session.emit('list_devices', []);
    }
  }
}

module.exports = MyDriver;

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
    console.log("Device discovery started");
    try {
      const devices = [];
      const dgram = require('dgram');
      const socket = dgram.createSocket('udp4');
      
      socket.on('error', (err) => {
        console.log('Socket error:', err);
        socket.close();
      });

      socket.on('listening', () => {
        socket.setBroadcast(true);
        const discoveryMessage = Buffer.from('{"t": "scan"}');
        socket.send(discoveryMessage, 0, discoveryMessage.length, 6668, '255.255.255.255');
      });
      console.log("listening for broadcast reply");
      socket.on('message', (msg, rinfo) => {
        try {
          console.log("received answer");
          const data = JSON.parse(msg.toString());
          if (data.gwId) {
            console.log("Got answer from a tuya device");
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
              console.log("listing devices");
              devices.push(device);
              session.emit('list_devices', devices);
              session.showView('list_devices');
            }
          }
        } catch (err) {
          this.log('Error parsing device response:', err);
        }
      });

      console.log("Binding to socket");
      socket.bind();

      // Close socket after 30 seconds
      setTimeout(() => {
        socket.close();
        if (devices.length === 0) {
          console.log("timeout reached, no devices found");
          session.emit('no_devices', []);
          session.showView('no_devices');
        }
      }, 30000);
    } catch (error) {
      console.log('Discovery failed:', error);
      session.emit('no_devices', []);
      session.showView('no_devices');
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        socket.close();
        if (devices.length === 0) {
          console.log("timeout reached, no devices found");
          session.emit('no_devices', []);
          session.showView('no_devices');
        }
        resolve(devices);
      }, 30000);
    });
  }
}

module.exports = MyDriver;

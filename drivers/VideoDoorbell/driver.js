const Homey = require('homey');
const TuyAPI = require('tuyapi');

class VideoDoorbellDriver extends Homey.Driver {
  async onInit() {
    this.homey.app.log('Tuya Doorbell Driver initialized');
  }

  async onPair(session) {
    let pairingDevice = {};

    session.setHandler('manual_input', () => {
      session.showView('manual_settings');
    });

    session.setHandler('auto_search', () => {
      session.showView('auto_search');
      this.discoverDevices(session);
    });

    session.setHandler('manual_settings', async (settings) => {
      pairingDevice = {
        name: 'Tuya Doorbell',
        data: {
          id: settings.deviceId
        },
        settings: {
          deviceId: settings.deviceId,
          localKey: settings.localKey,
          ipAddress: settings.ipAddress,
          port: settings.port
        }
      };
      await session.showView('list_devices');
      session.emit('list_devices', [pairingDevice]);
    });

    session.setHandler('list_devices', async () => {
      if (pairingDevice.data) {
        return [pairingDevice];
      }
      return [];
    });
  }

  async discoverDevices(session) {
    try {
      const devices = [];
      const dgram = require('dgram');
      const socket = dgram.createSocket('udp4');
      
      socket.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.gwId) {
            devices.push({
              name: 'Tuya Doorbell',
              data: {
                id: data.gwId
              },
              settings: {
                deviceId: data.gwId,
                ipAddress: rinfo.address,
                port: 6668
              }
            });
            session.emit('list_devices', devices);
          }
        } catch (err) {
          this.log('Error parsing device response:', err);
        }
      });

      // Broadcast discovery message
      const discoveryMessage = Buffer.from('{"t": "scan"}');
      socket.send(discoveryMessage, 0, discoveryMessage.length, 6668, '255.255.255.255');

      // Close socket after 10 seconds
      setTimeout(() => {
        socket.close();
        if (devices.length === 0) {
          session.emit('list_devices', []);
        }
      }, 10000);
    } catch (error) {
      this.log('Discovery failed:', error);
      session.emit('list_devices', []);
    }
  }
}

module.exports = VideoDoorbellDriver;

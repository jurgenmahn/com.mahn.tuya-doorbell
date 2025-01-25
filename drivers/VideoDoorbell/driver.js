const Homey = require('homey');
const TuyAPI = require('tuyapi');

class VideoDoorbellDriver extends Homey.Driver {
  async onInit() {
    this.homey.app.log('Tuya Doorbell Driver initialized');
  }

  async onPairListDevices() {
    try {
      const discoveryStrategy = this.getDiscoveryStrategy();
      const results = await discoveryStrategy.discover();
      
      return Object.values(results).map(device => ({
        name: device.productName,
        data: {
          id: device.id
        },
        settings: {
          ipAddress: device.ip,
          localKey: device.key,
          deviceId: device.id,
          port: 6668
        }
      }));
    } catch (error) {
      this.homey.app.log('Discovery failed:', error);
      throw new Error(this.homey.__('errors.discovery_failed'));
    }
  }

  getDiscoveryStrategy() {
    return this.homey.discovery.getStrategy('tuya');
  }
}

module.exports = VideoDoorbellDriver;

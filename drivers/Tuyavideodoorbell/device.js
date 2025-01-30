const Homey = require('homey');
const TuyAPI = require('tuyapi');

class MyDevice extends Homey.Device {
  async onInit() {
    this.initializeTuyaDevice();
    this.registerCapabilities();
    this.log('Tuya Doorbell initialized');
  }

  initializeTuyaDevice() {
    const settings = this.getSettings();
    
    this.tuyaDevice = new TuyAPI({
      id: settings.deviceId,
      key: settings.localKey,
      ip: settings.ipAddress,
      port: settings.port,
      version: '3.3'
    });

    // Setup device event listeners
    this.tuyaDevice
      .on('connected', () => {
        this.log('Connected to device');
        this.homey.app.log('Doorbell connected');
        this.setAvailable();
      })
      .on('disconnected', () => {
        this.log('Disconnected from device');
        this.homey.app.log('Doorbell disconnected');
        this.setUnavailable();
      })
      .on('error', error => {
        this.log('Device error:', error);
        this.homey.app.log('Doorbell error:', error);
      })
      .on('data', data => this.handleDeviceData(data));
  }

  registerCapabilities() {
    this.registerCapabilityListener('button', async () => {
      await this.tuyaDevice.set({dps: 1, set: true});
    });
  }

  handleDeviceData(data) {
    // Doorbell button press (DPS 1)
    if (data.dps['1']) {
      this.triggerFlow('doorbell_pressed');
      this.setCapabilityValue('button', true)
        .then(() => this.setCapabilityValue('button', false));
    }
    
    // Motion detection (DPS 2)
    if (data.dps['2']) {
      this.triggerFlow('motion_detected');
      this.setCapabilityValue('alarm_motion', data.dps['2']);
    }

    // Doorbell ring with media payload (DPS 185)
    if (data.dps['185']) {
      try {
        const buffer = Buffer.from(data.dps['185'], 'base64');
        const responseData = JSON.parse(buffer.toString('utf-8'));
        
        if (responseData.cmd === 'ipc_doorbell') {
          this.homey.app.log('Doorbell ring event with media:', responseData.files);
          this.triggerFlow('doorbell_pressed', {
            images: responseData.files.map(file => ({
              path: file[0],
              id: file[1],
              url: `https://${responseData.bucket}.oss-us-west-1.aliyuncs.com${file[0]}`
            }))
          });
        }
      } catch (error) {
        this.log('Error processing media payload:', error);
      }
    }
  }

  triggerFlow(flowId) {
    const triggerCard = this.homey.flow.getDeviceTriggerCard(flowId);
    if (triggerCard) {
      triggerCard.trigger(this)
        .catch(error => this.log('Flow trigger error:', error));
    } else {
      this.log(`Trigger card ${flowId} not found`);
    }
  }

  async onSettings(oldSettings, newSettings) {
    if (newSettings.ipAddress !== oldSettings.ipAddress || 
        newSettings.port !== oldSettings.port) {
      this.initializeTuyaDevice();
    }
    return super.onSettings(oldSettings, newSettings);
  }

  async onDeleted() {
    this.tuyaDevice.disconnect();
    super.onDeleted();
  }
}

module.exports = MyDevice;

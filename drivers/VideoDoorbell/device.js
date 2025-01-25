const Homey = require('homey');
const TuyAPI = require('tuyapi');

class VideoDoorbellDevice extends Homey.Device {
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

    this.tuyaDevice.on('connected', () => this.log('Connected to device'));
    this.tuyaDevice.on('disconnected', () => this.log('Disconnected from device'));
    this.tuyaDevice.on('error', error => this.log('Device error:', error));
    this.tuyaDevice.on('data', data => this.handleDeviceData(data));
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
    
    // Battery level (DPS 3 - example only)
    // if (data.dps['3']) {
    //   this.setCapabilityValue('measure_battery', data.dps['3']);
    // }
  }

  triggerFlow(flowId) {
    this.homey.flow.getTriggerCard(flowId)
      .trigger(this)
      .catch(error => this.log('Flow trigger error:', error));
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

module.exports = VideoDoorbellDevice;

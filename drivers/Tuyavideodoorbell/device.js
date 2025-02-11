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
    this.log('Received device data:', data);

    if (!data || !data.dps) return;

    // Handle each DPS value
    Object.entries(data.dps).forEach(([key, value]) => {
      switch (key) {
        case '1': // Doorbell button press
          if (value) {
            this.log('Doorbell button pressed');
            this.triggerFlow('doorbell_pressed');
            this.setCapabilityValue('button', true)
              .then(() => this.setCapabilityValue('button', false))
              .catch(this.error);
          }
          break;

        case '2': // Motion detection
          this.log('Motion detection state changed:', value);
          this.triggerFlow('motion_detected');
          this.setCapabilityValue('alarm_motion', !!value)
            .catch(this.error);
          break;

        case '3': // Error/Alarm state
          this.log('Device alarm state changed:', value);
          this.triggerFlow('device_error');
          this.setCapabilityValue('alarm_problem', !!value)
            .catch(this.error);
          break;

        case '101': // Video settings
          this.log('Video settings changed:', value);
          this.triggerFlow('video_settings_changed', { settings: value });
          break;

        case '102': // Audio settings
          this.log('Audio settings changed:', value);
          if (typeof value === 'number') {
            this.triggerFlow('volume_changed', { volume: value });
            this.setCapabilityValue('volume_set', value / 100)
              .catch(this.error);
          }
          break;

        case '103': // Motion detection settings
          this.log('Motion detection settings changed:', value);
          this.triggerFlow('motion_settings_changed', { settings: value });
          break;

        case '185': // Media payload
          try {
            const buffer = Buffer.from(value, 'base64');
            const responseData = JSON.parse(buffer.toString('utf-8'));
            
            if (responseData.cmd === 'ipc_doorbell') {
              this.log('Doorbell ring event with media:', responseData.files);
              this.triggerFlow('doorbell_pressed', {
                images: responseData.files.map(file => ({
                  path: file[0],
                  id: file[1],
                  url: `https://${responseData.bucket}.oss-us-west-1.aliyuncs.com${file[0]}`
                }))
              });
            }
          } catch (error) {
            this.error('Error processing media payload:', error);
          }
          break;

        default:
          this.log(`Unhandled DPS key ${key}:`, value);
      }
    });
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

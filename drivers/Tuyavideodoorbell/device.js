const Homey = require('homey');
const TuyAPI = require('tuyapi');

class MyDevice extends Homey.Device {
  async onInit() {
    await this.initializeTuyaDevice();
    this.homey.app.log('Tuya Doorbell initialized');
  }

  async onDeleted() {
    this.tuyaDevice.disconnect();
    this.tuyaDevice = null;
  }  

  async initializeTuyaDevice() {
    const settings = this.getSettings();

    this.homey.app.log("Device settings");
    this.homey.app.log(settings);
    
    this.tuyaDevice = new TuyAPI({
      id: settings.deviceId,
      key: settings.localKey,
      ip: settings.ipAddress,
      port: settings.port,
      version: '3.3',
      nullPayloadOnJSONError: true
    });

    // Setup device event listeners
    this.tuyaDevice
      .on('connected', () => {
        this.homey.app.log('Doorbell connected event fired');
        this.setAvailable();
      })
      .on('disconnected', () => {
        this.homey.app.log('Doorbell disconnected event fired');
        this.setUnavailable();
        
        // Implement reconnection strategy with exponential backoff
        let retryCount = 0;
        const maxRetries = 10;
        const baseDelay = 1000 * 10; // Start with 10 second delay
        
        const attemptReconnect = async () => {
          if (retryCount >= maxRetries) {
            this.homey.app.log('Max reconnection attempts reached');
            return;
          }
          
          const delay = baseDelay * Math.pow(2, retryCount);
          this.homey.app.log(`Attempting to reconnect in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          try {
            await this.tuyaDevice.connect();
            this.homey.app.log('Reconnection successful');
            retryCount = 0; // Reset counter on successful connection
          } catch (error) {
            this.homey.app.log('Reconnection failed:', error);
            retryCount++;
            attemptReconnect(); // Try again with increased delay
          }
        };
        
        attemptReconnect();
      })
      .on('error', error => {
        this.homey.app.log('Doorbell error event fired:', error);
      })
      .on('data', data => this.handleDeviceData(data))
      .on('heartbeat', () => {
        this.homey.app.log('Received doorbell heartbeat');
      })   
      .on('dp-refresh', data => {
        this.homey.app.log('dp-refresh event fired', data);
      })   
      
      this.homey.app.log('Attempting to connect to device...');
      await this.tuyaDevice.connect();    
      
      const status = await Promise.race([
        this.tuyaDevice.get({
          schema: true
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Validation timeout')), 5000)
        )
      ]);

  }

  handleDeviceData(data) {
    this.homey.app.log('Received device data:', data);

    if (!data || !data.dps) {
      this.homey.app.log('Unexpected data or no data received');
      return;
    }

    // dps: {
    //   '1': null,
    //   '2': null,
    //   '3': null,
    //   '101': null,
    //   '102': null,
    //   '103': null
    // }


    // Motion event
    // [Tuya Doorbell] dp-refresh event fired {
    //   dps: {
    //     '115': 'eyJ2IjoiMy4wIiwiYnVja2V0IjoidHktdXMtc3RvcmFnZTMwLXBpYyIsImZpbGVzIjpbWyIvYWNjODRlLTUzNDA0NTQ0LXBwMDFlMjVhMGVmODIzMDExODgyL2RldGVjdC8xNzM5NDg3MDc2LmpwZWciLCIyZTczNDA3NDkzYjNjNGJjIl1dfQ=='
    //   },
    //   t: 1739487077
    // }
    // [Tuya Doorbell] dp-refresh event fired { dps: { '244': '1' }, t: 1739487077 }    
    // Decoded: {"v":"3.0","bucket":"ty-us-storage30-pic","files":[["/acc84e-53404544-pp01e25a0ef823011882/detect/1739486999.jpeg","6d6c8b49348930e5"]]}

    // Button pressed
    // [Tuya Doorbell] dp-refresh event fired {
    //   dps: {
    //     '185': 'eyJ2IjoiMy4wIiwiYnVja2V0IjoidHktdXMtc3RvcmFnZTMwLXBpYyIsImNtZCI6ImlwY19kb29yYmVsbCIsInR5cGUiOiJpbWFnZSIsIndpdGgiOiJyZXNvdXJjZXMiLCJmaWxlcyI6W1siL2FjYzg0ZS01MzQwNDU0NC1wcDAxZTI1YTBlZjgyMzAxMTg4Mi9kZXRlY3QvMTczOTQ4NzMwNC5qcGVnIiwiYmIxNjI1YTg1MGI2ZmU4MCJdXX0='
    //   },
    //   t: 1739487306
    // }
    // [Tuya Doorbell] dp-refresh event fired { dps: { '244': '0' }, t: 1739487306 }    
    // Decoded: {"v":"3.0","bucket":"ty-us-storage30-pic","cmd":"ipc_doorbell","type":"image","with":"resources","files":[["/acc84e-53404544-pp01e25a0ef823011882/detect/1739487304.jpeg","bb1625a850b6fe80"]]}

    // Handle each DPS value
    Object.entries(data.dps).forEach(([key, value]) => {
      switch (key) {
        case '1': // Doorbell button press
          if (value) {
            this.homey.app.log('Doorbell button pressed');
            this.triggerFlow('doorbell_pressed');
            this.setCapabilityValue('button', true)
              .then(() => this.setCapabilityValue('button', false))
              .catch(this.error);
          }
          break;

        case '115': // Motion detection
          try {
            const buffer = Buffer.from(value, 'base64');
            const motionData = JSON.parse(buffer.toString('utf-8'));
            this.homey.app.log('Motion detection data:', motionData);
            this.triggerFlow('motion_detected');
            this.setCapabilityValue('alarm_motion', true)
              .then(() => this.setCapabilityValue('alarm_motion', false))
              .catch(this.error);
          } catch (error) {
            this.error('Error decoding motion detection data:', error);
            this.setCapabilityValue('alarm_motion', !!value)
              .catch(this.error);
          }
          break;

        case '185': // Media payload
          try {
            const buffer = Buffer.from(value, 'base64');
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
              this.setCapabilityValue('button', true)
              .then(() => this.setCapabilityValue('button', false))
              .catch(this.error);              
            }
          } catch (error) {
            this.error('Error processing media payload:', error);
          }
          break;

        default:
          this.homey.app.log(`Unhandled DPS key ${key}:`, value);
      }
    });
  }

  triggerFlow(flowId) {
    const triggerCard = this.homey.flow.getDeviceTriggerCard(flowId);
    if (triggerCard) {
      triggerCard.trigger(this)
        .catch(error => this.homey.app.log('Flow trigger error:', error));
    } else {
      this.homey.app.log(`Trigger card ${flowId} not found`);
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

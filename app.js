'use strict';

const Homey = require('homey');

module.exports = class TuyaDoorbellApp extends Homey.App {
  async onInit() {
    this.log('Tuya Doorbell App has been initialized');
    
    // Register flow cards
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // When doorbell is pressed
    this.homey.flow.getDeviceTriggerCard('doorbell_pressed')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // When motion is detected  
    this.homey.flow.getDeviceTriggerCard('motion_detected')
      .registerRunListener(async (args, state) => {
        return true;
      });
  }

  log(...args) {
    console.log('[Tuya Doorbell]', ...args);
  }

  error(...args) {
    console.error('[Tuya Doorbell]', ...args);
  }
};

'use strict';

const Homey = require('homey');

module.exports = class TuyaDoorbellApp extends Homey.App {
  async onInit() {
    this.log('Tuya Doorbell App has been initialized');
    
    // Register flow cards
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // Register flow trigger cards
    this.doorbellPressedTrigger = this.homey.flow.getDeviceTriggerCard('doorbell_pressed');
    this.motionDetectedTrigger = this.homey.flow.getDeviceTriggerCard('motion_detected');
  }

  log(...args) {
    console.log('[Tuya Doorbell]', ...args);
  }

  error(...args) {
    console.error('[Tuya Doorbell]', ...args);
  }
};

const Homey = require('homey');
require('events').EventEmitter.defaultMaxListeners = 100;

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
    this.connectedTrigger = this.homey.flow.getDeviceTriggerCard('doorbell_connected');
    this.disconnectedTrigger = this.homey.flow.getDeviceTriggerCard('doorbell_disconnected');
  }

  log(...args) {
    console.log('[Tuya Doorbell]', ...args);
  }

  error(...args) {
    console.error('[Tuya Doorbell]', ...args);
  }
};

"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Homey = require('homey');

var TuyAPI = require('tuyapi');

var MyDevice =
/*#__PURE__*/
function (_Homey$Device) {
  _inherits(MyDevice, _Homey$Device);

  function MyDevice() {
    _classCallCheck(this, MyDevice);

    return _possibleConstructorReturn(this, _getPrototypeOf(MyDevice).apply(this, arguments));
  }

  _createClass(MyDevice, [{
    key: "onInit",
    value: function onInit() {
      return regeneratorRuntime.async(function onInit$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return regeneratorRuntime.awrap(this.initializeTuyaDevice());

            case 2:
              this.homey.app.log('Tuya Doorbell initialized');

            case 3:
            case "end":
              return _context.stop();
          }
        }
      }, null, this);
    }
  }, {
    key: "onDeleted",
    value: function onDeleted() {
      return regeneratorRuntime.async(function onDeleted$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              this.tuyaDevice.disconnect();
              this.tuyaDevice = null;

            case 2:
            case "end":
              return _context2.stop();
          }
        }
      }, null, this);
    }
  }, {
    key: "initializeTuyaDevice",
    value: function initializeTuyaDevice() {
      var _this = this;

      var settings, status;
      return regeneratorRuntime.async(function initializeTuyaDevice$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              settings = this.getSettings();
              this.homey.app.log("Device settings");
              this.homey.app.log(settings);
              this.tuyaDevice = new TuyAPI({
                id: settings.deviceId,
                key: settings.localKey,
                ip: settings.ipAddress,
                port: settings.port,
                version: '3.3',
                nullPayloadOnJSONError: true
              }); // Setup device event listeners

              this.tuyaDevice.on('connected', function () {
                _this.homey.app.log('Doorbell connected event fired');

                _this.setAvailable();
              }).on('disconnected', function () {
                _this.homey.app.log('Doorbell disconnected event fired');

                _this.setUnavailable();
              }).on('error', function (error) {
                _this.homey.app.log('Doorbell error event fired:', error);
              }).on('data', function (data) {
                return _this.handleDeviceData(data);
              }).on('heartbeat', function () {
                _this.homey.app.log('Received doorbell heartbeat');
              }).on('dp-refresh', function (data) {
                _this.homey.app.log('dp-refresh event fired', data);
              });
              this.homey.app.log('Attempting to connect to device...');
              _context3.next = 8;
              return regeneratorRuntime.awrap(this.tuyaDevice.connect());

            case 8:
              _context3.next = 10;
              return regeneratorRuntime.awrap(Promise.race([this.tuyaDevice.get({
                schema: true
              }), new Promise(function (_, reject) {
                return setTimeout(function () {
                  return reject(new Error('Validation timeout'));
                }, 5000);
              })]));

            case 10:
              status = _context3.sent;

            case 11:
            case "end":
              return _context3.stop();
          }
        }
      }, null, this);
    }
  }, {
    key: "handleDeviceData",
    value: function handleDeviceData(data) {
      var _this2 = this;

      this.homey.app.log('Received device data:', data);

      if (!data || !data.dps) {
        this.homey.app.log('Unexpected data or no data received');
        return;
      } // dps: {
      //   '1': null,
      //   '2': null,
      //   '3': null,
      //   '101': null,
      //   '102': null,
      //   '103': null
      // }
      // Handle each DPS value


      Object.entries(data.dps).forEach(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            key = _ref2[0],
            value = _ref2[1];

        switch (key) {
          case '1':
            // Doorbell button press
            if (value) {
              _this2.homey.app.log('Doorbell button pressed');

              _this2.triggerFlow('doorbell_pressed');

              _this2.setCapabilityValue('button', true).then(function () {
                return _this2.setCapabilityValue('button', false);
              })["catch"](_this2.error);
            }

            break;

          case '2':
            // Motion detection
            _this2.homey.app.log('Motion detection state changed:', value);

            _this2.triggerFlow('motion_detected');

            _this2.setCapabilityValue('alarm_motion', !!value)["catch"](_this2.error);

            break;

          case '185':
            // Media payload
            try {
              var buffer = Buffer.from(value, 'base64');
              var responseData = JSON.parse(buffer.toString('utf-8'));

              if (responseData.cmd === 'ipc_doorbell') {
                _this2.homey.app.log('Doorbell ring event with media:', responseData.files);

                _this2.triggerFlow('doorbell_pressed', {
                  images: responseData.files.map(function (file) {
                    return {
                      path: file[0],
                      id: file[1],
                      url: "https://".concat(responseData.bucket, ".oss-us-west-1.aliyuncs.com").concat(file[0])
                    };
                  })
                });

                _this2.setCapabilityValue('button', true).then(function () {
                  return _this2.setCapabilityValue('button', false);
                })["catch"](_this2.error);
              }
            } catch (error) {
              _this2.error('Error processing media payload:', error);
            }

            break;

          default:
            _this2.homey.app.log("Unhandled DPS key ".concat(key, ":"), value);

        }
      });
    }
  }, {
    key: "triggerFlow",
    value: function triggerFlow(flowId) {
      var _this3 = this;

      var triggerCard = this.homey.flow.getDeviceTriggerCard(flowId);

      if (triggerCard) {
        triggerCard.trigger(this)["catch"](function (error) {
          return _this3.homey.app.log('Flow trigger error:', error);
        });
      } else {
        this.homey.app.log("Trigger card ".concat(flowId, " not found"));
      }
    }
  }, {
    key: "onSettings",
    value: function onSettings(oldSettings, newSettings) {
      return regeneratorRuntime.async(function onSettings$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              if (newSettings.ipAddress !== oldSettings.ipAddress || newSettings.port !== oldSettings.port) {
                this.initializeTuyaDevice();
              }

              return _context4.abrupt("return", _get(_getPrototypeOf(MyDevice.prototype), "onSettings", this).call(this, oldSettings, newSettings));

            case 2:
            case "end":
              return _context4.stop();
          }
        }
      }, null, this);
    }
  }, {
    key: "onDeleted",
    value: function onDeleted() {
      return regeneratorRuntime.async(function onDeleted$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              this.tuyaDevice.disconnect();

              _get(_getPrototypeOf(MyDevice.prototype), "onDeleted", this).call(this);

            case 2:
            case "end":
              return _context5.stop();
          }
        }
      }, null, this);
    }
  }]);

  return MyDevice;
}(Homey.Device);

module.exports = MyDevice;
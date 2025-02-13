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
      return regeneratorRuntime.async(function initializeTuyaDevice$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
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

                _this.setUnavailable(); // Implement reconnection strategy with exponential backoff


                var retryCount = 0;
                var maxRetries = 10;
                var baseDelay = 1000 * 10; // Start with 10 second delay

                var attemptReconnect = function attemptReconnect() {
                  var delay;
                  return regeneratorRuntime.async(function attemptReconnect$(_context3) {
                    while (1) {
                      switch (_context3.prev = _context3.next) {
                        case 0:
                          if (!(retryCount >= maxRetries)) {
                            _context3.next = 3;
                            break;
                          }

                          _this.homey.app.log('Max reconnection attempts reached');

                          return _context3.abrupt("return");

                        case 3:
                          delay = baseDelay * Math.pow(2, retryCount);

                          _this.homey.app.log("Attempting to reconnect in ".concat(delay, "ms (attempt ").concat(retryCount + 1, "/").concat(maxRetries, ")"));

                          _context3.next = 7;
                          return regeneratorRuntime.awrap(new Promise(function (resolve) {
                            return setTimeout(resolve, delay);
                          }));

                        case 7:
                          _context3.prev = 7;
                          _context3.next = 10;
                          return regeneratorRuntime.awrap(_this.tuyaDevice.connect());

                        case 10:
                          _this.homey.app.log('Reconnection successful');

                          retryCount = 0; // Reset counter on successful connection

                          _context3.next = 19;
                          break;

                        case 14:
                          _context3.prev = 14;
                          _context3.t0 = _context3["catch"](7);

                          _this.homey.app.log('Reconnection failed:', _context3.t0);

                          retryCount++;
                          attemptReconnect(); // Try again with increased delay

                        case 19:
                        case "end":
                          return _context3.stop();
                      }
                    }
                  }, null, null, [[7, 14]]);
                };

                attemptReconnect();
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
              _context4.next = 8;
              return regeneratorRuntime.awrap(this.tuyaDevice.connect());

            case 8:
              _context4.next = 10;
              return regeneratorRuntime.awrap(Promise.race([this.tuyaDevice.get({
                schema: true
              }), new Promise(function (_, reject) {
                return setTimeout(function () {
                  return reject(new Error('Validation timeout'));
                }, 5000);
              })]));

            case 10:
              status = _context4.sent;

            case 11:
            case "end":
              return _context4.stop();
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


      Object.entries(data.dps).forEach(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            key = _ref2[0],
            value = _ref2[1];

        switch (key) {
          case '115':
            // Motion detection
            try {
              var buffer = Buffer.from(value, 'base64');
              var responseData = JSON.parse(buffer.toString('utf-8'));

              _this2.homey.app.log('Motion detection event with media:', responseData);

              _this2.triggerFlow('motion_detected', {
                images: responseData.files.map(function (file) {
                  return {
                    path: file[0],
                    id: file[1],
                    url: "https://".concat(responseData.bucket, ".oss-us-west-1.aliyuncs.com").concat(file[0])
                  };
                })
              });

              _this2.setCapabilityValue('alarm_motion', true).then(function () {
                return _this2.setCapabilityValue('alarm_motion', false);
              })["catch"](_this2.error);
            } catch (error) {
              _this2.error('Error processing media payload:', error);
            }

            break;

          case '185':
            // Button pressed
            try {
              var _buffer = Buffer.from(value, 'base64');

              var _responseData = JSON.parse(_buffer.toString('utf-8'));

              _this2.homey.app.log('Doorbell ring event with media:', _responseData.files);

              _this2.triggerFlow('doorbell_pressed', {
                images: _responseData.files.map(function (file) {
                  return {
                    path: file[0],
                    id: file[1],
                    url: "https://".concat(_responseData.bucket, ".oss-us-west-1.aliyuncs.com").concat(file[0])
                  };
                })
              });

              _this2.setCapabilityValue('button', true).then(function () {
                return _this2.setCapabilityValue('button', false);
              })["catch"](_this2.error);
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
      return regeneratorRuntime.async(function onSettings$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              if (newSettings.ipAddress !== oldSettings.ipAddress || newSettings.port !== oldSettings.port) {
                this.initializeTuyaDevice();
              }

              return _context5.abrupt("return", _get(_getPrototypeOf(MyDevice.prototype), "onSettings", this).call(this, oldSettings, newSettings));

            case 2:
            case "end":
              return _context5.stop();
          }
        }
      }, null, this);
    }
  }, {
    key: "onDeleted",
    value: function onDeleted() {
      return regeneratorRuntime.async(function onDeleted$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              this.tuyaDevice.disconnect();

              _get(_getPrototypeOf(MyDevice.prototype), "onDeleted", this).call(this);

            case 2:
            case "end":
              return _context6.stop();
          }
        }
      }, null, this);
    }
  }]);

  return MyDevice;
}(Homey.Device);

module.exports = MyDevice;
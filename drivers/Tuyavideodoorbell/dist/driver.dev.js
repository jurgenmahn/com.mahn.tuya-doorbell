"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Homey = require('homey');

var TuyAPI = require('tuyapi');

var net = require('net');

var TuyaLocalDriver =
/*#__PURE__*/
function (_Homey$Driver) {
  _inherits(TuyaLocalDriver, _Homey$Driver);

  function TuyaLocalDriver() {
    _classCallCheck(this, TuyaLocalDriver);

    return _possibleConstructorReturn(this, _getPrototypeOf(TuyaLocalDriver).apply(this, arguments));
  }

  _createClass(TuyaLocalDriver, [{
    key: "onInit",
    value: function onInit() {
      return regeneratorRuntime.async(function onInit$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              this.homey.app.log('Tuya Doorbell Driver initialized');

            case 1:
            case "end":
              return _context.stop();
          }
        }
      }, null, this);
    }
  }, {
    key: "onPair",
    value: function onPair(session) {
      var _this = this;

      var pairingDevice;
      return regeneratorRuntime.async(function onPair$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              pairingDevice = {};
              session.setHandler('search_device', function _callee(data) {
                var ips, deviceFound, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, ip;

                return regeneratorRuntime.async(function _callee$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        _this.homey.app.log('Received settings:', data);

                        pairingDevice = {
                          name: 'Tuya Doorbell',
                          data: {
                            id: data.deviceId
                          },
                          settings: {
                            deviceId: data.deviceId,
                            localKey: data.localKey,
                            ipAddress: data.ipAddress,
                            port: data.port || 6668
                          },
                          icon: "/img/devices/doorbell.svg"
                        };
                        ips = [];

                        if (!(pairingDevice.settings.ipAddress != "")) {
                          _context2.next = 7;
                          break;
                        }

                        ips = [pairingDevice.settings.ipAddress];
                        _context2.next = 12;
                        break;

                      case 7:
                        _this.homey.app.log("No ipaddress received, scanning network for open port " + pairingDevice.settings.port);

                        _context2.next = 10;
                        return regeneratorRuntime.awrap(_this.scanNetwork(pairingDevice.settings.port));

                      case 10:
                        ips = _context2.sent;

                        _this.homey.app.log("Found devices:", ips);

                      case 12:
                        deviceFound = false;
                        _iteratorNormalCompletion = true;
                        _didIteratorError = false;
                        _iteratorError = undefined;
                        _context2.prev = 16;
                        _iterator = ips[Symbol.iterator]();

                      case 18:
                        if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                          _context2.next = 35;
                          break;
                        }

                        ip = _step.value;
                        pairingDevice.settings.ipAddress = ip;
                        _context2.next = 23;
                        return regeneratorRuntime.awrap(_this.validateDevice(pairingDevice));

                      case 23:
                        if (!_context2.sent) {
                          _context2.next = 32;
                          break;
                        }

                        _this.homey.app.log("Doorbell found");

                        _this.homey.app.log('get device MACaddress');

                        _context2.next = 28;
                        return regeneratorRuntime.awrap(_this.homey.arp.getMAC(ip));

                      case 28:
                        pairingDevice.data.id = _context2.sent;
                        deviceFound = true;
                        session.showView('list_devices');
                        return _context2.abrupt("break", 35);

                      case 32:
                        _iteratorNormalCompletion = true;
                        _context2.next = 18;
                        break;

                      case 35:
                        _context2.next = 41;
                        break;

                      case 37:
                        _context2.prev = 37;
                        _context2.t0 = _context2["catch"](16);
                        _didIteratorError = true;
                        _iteratorError = _context2.t0;

                      case 41:
                        _context2.prev = 41;
                        _context2.prev = 42;

                        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                          _iterator["return"]();
                        }

                      case 44:
                        _context2.prev = 44;

                        if (!_didIteratorError) {
                          _context2.next = 47;
                          break;
                        }

                        throw _iteratorError;

                      case 47:
                        return _context2.finish(44);

                      case 48:
                        return _context2.finish(41);

                      case 49:
                        if (deviceFound) {
                          _context2.next = 52;
                          break;
                        }

                        session.showView('start');
                        throw new Error(_this.homey.__('errors.no_devices_found'));

                      case 52:
                      case "end":
                        return _context2.stop();
                    }
                  }
                }, null, null, [[16, 37, 41, 49], [42,, 44, 48]]);
              }); // Handle discovered devices list

              session.setHandler('list_devices', function _callee2() {
                return regeneratorRuntime.async(function _callee2$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        _this.homey.app.log('List devices handler called with pairingDevice:', pairingDevice);

                        if (!(!pairingDevice || Object.keys(pairingDevice).length === 0)) {
                          _context3.next = 3;
                          break;
                        }

                        throw new Error(_this.homey.__('errors.no_devices_found'));

                      case 3:
                        return _context3.abrupt("return", [pairingDevice]);

                      case 4:
                      case "end":
                        return _context3.stop();
                    }
                  }
                });
              });
              session.setHandler('add_device', function _callee3(data) {
                var devices, device;
                return regeneratorRuntime.async(function _callee3$(_context4) {
                  while (1) {
                    switch (_context4.prev = _context4.next) {
                      case 0:
                        console.log("add_device, data:");
                        console.log(data);
                        devices = _this.getDevices(); // Find the device by its ID

                        device = devices.find(function (device) {
                          return device.getData().id === data.data.id;
                        });

                        if (device) {
                          _this.log("Device found: ".concat(device.getName()));

                          device.onInit();
                        } else {
                          _this.log('Device not found');
                        }

                      case 5:
                      case "end":
                        return _context4.stop();
                    }
                  }
                });
              });

            case 4:
            case "end":
              return _context5.stop();
          }
        }
      });
    }
  }, {
    key: "validateDevice",
    value: function validateDevice(device) {
      var _this2 = this;

      var testDevice, status;
      return regeneratorRuntime.async(function validateDevice$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              _context6.prev = 0;
              this.homey.app.log('Validating device:', device);
              testDevice = new TuyAPI({
                id: device.settings.deviceId,
                key: device.settings.localKey,
                ip: device.settings.ipAddress,
                port: device.settings.port,
                version: 3.3,
                nullPayloadOnJSONError: true
              }); // Set up error handler

              testDevice.on('error', function (err) {
                _this2.homey.app.log('Validation device error:', err);
              });
              this.homey.app.log('Attempting to connect to device...');
              _context6.next = 7;
              return regeneratorRuntime.awrap(testDevice.connect());

            case 7:
              this.homey.app.log('Connected successfully'); // Try to get device info

              _context6.next = 10;
              return regeneratorRuntime.awrap(Promise.race([testDevice.get({
                schema: true
              }), new Promise(function (_, reject) {
                return setTimeout(function () {
                  return reject(new Error('Validation timeout'));
                }, 5000);
              })]));

            case 10:
              status = _context6.sent;
              this.homey.app.log('Got device status:', status);

              if (!(status && status.dps && (status.dps['101'] !== undefined || status.dps['103'] !== undefined))) {
                _context6.next = 16;
                break;
              }

              this.homey.app.log('Found matching doorbell device');
              _context6.next = 21;
              break;

            case 16:
              this.homey.app.log('Found a tuya device, but not a supported doorbell');
              this.homey.app.log('Validation failed');
              _context6.next = 20;
              return regeneratorRuntime.awrap(testDevice.disconnect());

            case 20:
              return _context6.abrupt("return", false);

            case 21:
              _context6.next = 23;
              return regeneratorRuntime.awrap(testDevice.disconnect());

            case 23:
              this.homey.app.log('Validation successful');
              return _context6.abrupt("return", true);

            case 27:
              _context6.prev = 27;
              _context6.t0 = _context6["catch"](0);
              this.homey.app.log('Validation failed:', _context6.t0);
              return _context6.abrupt("return", false);

            case 31:
            case "end":
              return _context6.stop();
          }
        }
      }, null, this, [[0, 27]]);
    }
  }, {
    key: "scanNetwork",
    value: function scanNetwork(port) {
      var _this3 = this;

      var baseAddr,
          foundIPs,
          BATCH_SIZE,
          scannedCount,
          start,
          end,
          batchPromises,
          _loop,
          i,
          _args7 = arguments;

      return regeneratorRuntime.async(function scanNetwork$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              baseAddr = _args7.length > 1 && _args7[1] !== undefined ? _args7[1] : '192.168.113';
              foundIPs = [];
              BATCH_SIZE = 25;
              scannedCount = 0;
              this.homey.app.log("Starting port scan on network:", baseAddr); // Scan in batches to avoid overwhelming the network

              start = 1;

            case 6:
              if (!(start < 255)) {
                _context7.next = 18;
                break;
              }

              end = Math.min(start + BATCH_SIZE, 255);
              batchPromises = [];

              _loop = function _loop(i) {
                var ip = "".concat(baseAddr, ".").concat(i);
                batchPromises.push(new Promise(function (resolve) {
                  var socket = new net.Socket();
                  socket.setTimeout(1000);
                  socket.on('connect', function () {
                    _this3.homey.app.log("Found device at ".concat(ip));

                    foundIPs.push(ip);
                    socket.destroy();
                    resolve();
                  });
                  socket.on('error', function () {
                    socket.destroy();
                    resolve();
                  });
                  socket.on('timeout', function () {
                    socket.destroy();
                    resolve();
                  });
                  socket.connect(port, ip);
                }));
              };

              for (i = start; i < end; i++) {
                _loop(i);
              }

              _context7.next = 13;
              return regeneratorRuntime.awrap(Promise.all(batchPromises));

            case 13:
              scannedCount += BATCH_SIZE;
              this.homey.app.log("Scanned ".concat(scannedCount, "/254 addresses..."));

            case 15:
              start += BATCH_SIZE;
              _context7.next = 6;
              break;

            case 18:
              this.homey.app.log("Found ".concat(foundIPs.length, " devices listening on port ").concat(port));
              return _context7.abrupt("return", foundIPs);

            case 20:
            case "end":
              return _context7.stop();
          }
        }
      }, null, this);
    }
  }]);

  return TuyaLocalDriver;
}(Homey.Driver);

module.exports = TuyaLocalDriver;
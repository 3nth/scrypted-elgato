
import Bonjour from "bonjour-service";
import { KeyLight } from './lights';
import sdk, { ScryptedDeviceBase, OnOff, Brightness, ColorSettingTemperature, Refresh, ScryptedDeviceType, DeviceProvider, ScryptedNativeId } from '@scrypted/sdk';
const { deviceManager } = sdk;

class ElgatoDevice extends ScryptedDeviceBase implements OnOff, Brightness, ColorSettingTemperature, Refresh {
  light: KeyLight;

  constructor(nativeId: ScryptedNativeId, light: KeyLight) {
    super(nativeId);
    this.light = light;
    this.updateState();
  }

  updateState() {
    this.on = !!this.light.options?.lights[0].on;
    this.brightness = this.light.options?.lights[0].brightness;
    let temperature = this.light.options?.lights[0].temperature;
    let kelvin = Math.round((1000000 * Math.pow(temperature, -1)) / 50) * 50
    if (kelvin > 7000) kelvin = 7000;
    if (kelvin < 2900) kelvin = 2900;
    this.colorTemperature = kelvin;
  }

  async getRefreshFrequency() {
    return 5;
  }

  async refresh() {
    await this.light.refresh();
    this.updateState();
  }

  async turnOn() {
    await this.light.turnOn();
    this.updateState();
  }

  async turnOff() {
    await this.light.turnOff();
    this.updateState();
  }

  async setBrightness(level: number) {
    await this.light.setBrightness(level);
    this.updateState();
  }

  async setColorTemperature(kelvin: number) {
    let temperature = Math.round(987007 * Math.pow(kelvin, -0.999));
    if (temperature > 344) temperature = 344;
    if (temperature < 143) temperature = 143;
    await this.light.setColorTemperature(temperature)
    this.updateState();
  }

  async getTemperatureMinK() {
    return 2900;
  }

  async getTemperatureMaxK() {
    return 7000;
  }
}

class ElgatoController extends ScryptedDeviceBase implements DeviceProvider {
  lights = new Map<ScryptedNativeId, ElgatoDevice>();

  constructor() {
    super();
    this.discoverDevices(30);
  }

  getDevice(nativeId: ScryptedNativeId) {
    return this.lights[nativeId];
  }

  async addDevice(service) {
    const light = await KeyLight.build(service['referer'].address, service.port);

    var info = {
      name: light.info.displayName,
      nativeId: light.info.serialNumber,
      interfaces: ['OnOff', 'Brightness', 'ColorSettingTemperature', 'Refresh'],
      type: ScryptedDeviceType.Light,
    };
    await deviceManager.onDeviceDiscovered(info);
    this.lights[info.nativeId] = new ElgatoDevice(info.nativeId, light);
  }

  async discoverDevices(duration: number) {
    const browser = new Bonjour().find({ type: 'elg' });
    this.console.log('Elgato device discovery started ...')
    browser.on('up', service => {
      this.console.log(`Found Elgato device: ${service.name}`)
      this.addDevice(service);
    });
    browser.start();
    setTimeout(() => {
      browser.stop();
      this.console.log('Elgato device discovery stopped.')
    }, duration * 1000);
  }
}

export default new ElgatoController();
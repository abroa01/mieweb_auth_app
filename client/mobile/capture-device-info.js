import { Meteor } from "meteor/meteor";
import { Session } from 'meteor/session';

export const captureDeviceInfo = () => {
  if (Meteor.isCordova) {
    console.log(" ### Log Step 1.1: inside capture-device-info.js and setting session with captured device info");
    Session.set('capturedDeviceInfo', {
      model: device.model,
      platform: device.platform,
      uuid: device.uuid,
      version: device.version,
      manufacturer: device.manufacturer,
    });
    console.log(`### Log Step 1.1.1 : session for capturedDeviceInfo: ${JSON.stringify(Session.get('capturedDeviceInfo'))}`);
    
  }
};


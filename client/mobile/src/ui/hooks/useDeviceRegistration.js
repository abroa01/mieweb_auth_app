import { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Tracker } from 'meteor/tracker';
import { DeviceDetails } from '../../../../../utils/api/deviceDetails';


export const useDeviceRegistration = () => {
  const [capturedDeviceUuid, setCapturedDeviceUuid] = useState(null);
  const [boolRegisteredDevice, setBoolRegisteredDevice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log(' ### Log Step 2.1 : inside useDeviceRegistration hook to check the if the device is already registered or not');

    const sessionTracker = Tracker.autorun(() => {
      const deviceInfo = Session.get('capturedDeviceInfo');
      console.log('### Log Step 2.1.1 : Session deviceInfo (hook):', JSON.stringify(deviceInfo));

      if (!deviceInfo || !deviceInfo.uuid) {
        console.log('No valid device info in session (hook)');
        setCapturedDeviceUuid(null);
        setBoolRegisteredDevice(false);
        setIsLoading(false); 
        return;
      }
      console.log('### Log Step 2.1.1.1 : Session uuis (hook):', JSON.stringify(deviceInfo.uuid));
      setCapturedDeviceUuid(deviceInfo.uuid);
      console.log('dfsdfsd', JSON.stringify(capturedDeviceUuid));

      const subscriber = Meteor.subscribe('deviceDetails.byDevice', deviceInfo.uuid, {
        onStop: (error) => {
          if (error) {
            console.error('Subscription error (hook):', error);
            setIsLoading(false); // loading stops on error
          }
        },
        onReady: () => {
          console.log('### Log Step 2.1.2 : Subscription is ready useDeviceRegistration (hook)');
          const deviceDetailsDoc = DeviceDetails.findOne({ 
            'devices.deviceUUID': deviceInfo.uuid 
          });
          
          console.log('### Log Step 2.1.3 : Fetched Device Info useDeviceRegistration (hook):', JSON.stringify({ deviceDetailsDoc }));          
          
          setBoolRegisteredDevice(!!deviceDetailsDoc);
          setIsLoading(false);
        }
      });

      return () => {
        console.log('Cleaning up subscription (hook)...');
        if (subscriber) {
          subscriber.stop();
        }
      };
    });

    return () => {
      console.log('Cleaning up session tracker (hook)...');
      sessionTracker.stop();
    };
  }, []); // only run on mount

  // Debug logging for state changes within the hook
  useEffect(() => {
    console.log(' ### Log Step 2.1.4 : useDeviceRegistration Hook state updated:', JSON.stringify({
      capturedDeviceUuid,
      boolRegisteredDevice,
      isLoading
    }));
  }, [capturedDeviceUuid, boolRegisteredDevice, isLoading]);


  return { capturedDeviceUuid, boolRegisteredDevice, isLoading };
}; 
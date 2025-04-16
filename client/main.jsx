import React from 'react';
import { createRoot } from 'react-dom/client';
import { Meteor } from 'meteor/meteor';
import './main.css';
import { App } from './mobile/src/ui/App';
import { captureDeviceInfo } from './mobile/capture-device-info';
import { initializeBiometrics } from './mobile/biometrics';
import { initializePushNotifications } from './mobile/push-notifications';

Meteor.startup(() => {
  const container = document.getElementById('react-target');
  const root = createRoot(container);

  if (Meteor.isCordova) {
    document.addEventListener('deviceready', () => {
      console.log(" ### Log Step 1: inside main.jsx and about to call configuration methods");
      captureDeviceInfo();
      initializeBiometrics();
      initializePushNotifications();
    }, false);
  }

  root.render(<App />);
});
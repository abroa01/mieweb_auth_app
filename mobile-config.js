App.info({
  id: 'com.mieweb.mieauth',
  name: 'MIEAuth',
  description: 'A Meteor app with Cordova integration',
  author: 'Anshul Abrol',
  email: 'abrol.anshul10@gmail.com',
  website: 'https://example.com',
  version: '0.0.2',
});

// Fix for iOS deployment target issue
App.setPreference('deployment-target', '12.0');

// Development team configuration
// Your team ID appears to be P78A624P7D based on your screenshots
App.setPreference('ios-team-id', 'P78A624P7D');

// Ensure proper device access
App.accessRule('*');
App.accessRule('http://*');
App.accessRule('https://*');
App.accessRule('data:*');
App.accessRule('blob:*');
App.accessRule('file:*');

// Configure orientation
App.setPreference('Orientation', 'default');
App.setPreference('Fullscreen', 'false');

// Ensure proper plugin configuration
App.configurePlugin('cordova-plugin-device', {
  version: '2.0.5',
});

// If you need push notifications
// App.configurePlugin('cordova-plugin-push', {
//   version: '1.9.4',
// });

// If you wish to restore your commented-out Google services functionality later
// App.setPreference('GradlePluginGoogleServicesEnabled', true);
// App.appendToConfig(`
// <platform name="android">
//   <resource-file src="google-services.json" target="app/google-services.json" />
// </platform>
// `);
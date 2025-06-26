App.info({
  id: 'com.mieweb.mieauth',
  name: 'MIEAuth',
  description: 'A Meteor app with Cordova integration',
  author: 'Anshul Abrol',
  email: 'abrol.anshul10@gmail.com',
  website: 'https://example.com',
  version: '0.0.2',
});

App.configurePlugin('cordova-plugin-device', {
  version: '2.0.5',
});

App.addResourceFile('public/android/dev/google-services.json', 'app/google-services.json', 'android');
App.addResourceFile('public/ios/dev/GoogleService-Info.plist', 'GoogleService-Info.plist', 'ios');

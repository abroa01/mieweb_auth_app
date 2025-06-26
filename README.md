# Mieweb Auth App

This is a full-stack Meteor application using React for the frontend and Cordova for mobile deployment. It integrates **Firebase Cloud Messaging (FCM)** to enable push notifications, using the `@havesource/cordova-plugin-push` plugin for mobile platforms.

## Architecture Overview

```mermaid
sequenceDiagram
    participant User as User
    participant PhoneApp as Phone App
    participant MeteorServer as Meteor Server / Push Gateway
    participant BashScript as Bash Script

    User->>PhoneApp: Allow Push Notifications
    PhoneApp->>MeteorServer: Register with FCM Token
    BashScript->>MeteorServer: Send Push Notification via curl
    MeteorServer->>PhoneApp: Forward Push Notification
    PhoneApp->>User: Display Notification (Foreground/Background)
    User-->>PhoneApp: Interact with Notification (Ok/Cancel)
    PhoneApp-->>MeteorServer: Notify User Response (Ok/Cancel)
    MeteorServer-->>BashScript: Return Response (Ok/Cancel)
```

## Application Screenshots

### Home Page
The main interface of the application where users can interact with the authentication features.

<div align="center">
  <img width="450" alt="App Home Page" src="https://github.com/user-attachments/assets/ceaab48e-3465-4b75-8932-174e2e2ff231" />
</div>

### Push Notification Example
Example of how push notifications appear on mobile devices.

<div align="center">
  <img src="screenshots/push.png" alt="Push Notification Example" width="450" />
</div>

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/mieweb/mieweb_auth_app
cd mieweb_auth_app
```

## Prerequisites

Before setting up the application, ensure you have the following tools installed and properly configured:

### Required Software
- **Node.js & npm** - JavaScript runtime and package manager
- **Meteor** - Full-stack JavaScript platform (see [Meteor Installation Docs](https://docs.meteor.com/install.html))
- **Android Studio** - Including Android SDK and adb tools for Android development
- **Xcode** - Required for iOS builds (Mac only)
- **Java JDK 17** - Java Development Kit version 17
- **Java Runtime Environment (JRE)** - See [Java Install Docs](https://www.java.com/en/download/help/index_installing.html)
- **Gradle** - Build automation tool (see [Gradle Installation Docs](https://gradle.org/install/))

### Environment Variables Setup

Configure the following environment variables in your `~/.zshrc` or `~/.bash_profile`:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH=$JAVA_HOME/bin:$PATH
export ANDROID_HOME=/path/to/your/android/sdk
```

### Environment Configuration Example

<div align="center">
  <img width="600" alt="Sample ~/.zshrc configuration" src="screenshots/zshrc.png" />
  <p><em>Example of environment variables configuration in ~/.zshrc file</em></p>
</div>

## Deployment Configuration

### Development Mode (Local Deployment)

For development with live reload and debugging capabilities:

```bash
meteor npm run start-dev
```

**What this command does:**
- Creates a secure tunnel using the **Magic Box** tool
- Prompts for **YubiKey** authentication to generate a secure proxy URL
- Provides a publicly accessible URL for mobile device testing
- Enables live reload and debugging features
- Eliminates the need for manual port forwarding

### Production Mode

For production deployment:

```bash
meteor npm run start
```

**Production considerations:**
- Starts the Meteor server in production mode
- Server must be accessible via your production domain or IP address
- No tunneling or proxy setup required
- Optimized for performance and security

## Firebase Configuration

Firebase Cloud Messaging (FCM) is essential for push notification functionality. Follow these steps to configure Firebase for your application.

### Initial Firebase Setup

1. **Create Firebase Project**
   - Navigate to the [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select an existing one
   - Note your project ID for later configuration

2. **Enable Cloud Messaging**
   - In your Firebase project, navigate to the Cloud Messaging section
   - Enable the Cloud Messaging API
   - Configure your messaging settings as needed

3. **Create Platform Applications**
   - Create both Android and iOS applications within your Firebase project
   - Follow the setup wizard for each platform
   - Download the required configuration files

### Platform-Specific Configuration

#### Android Configuration

Download the `google-services.json` configuration file and place it in the correct directory structure.

<div align="center">
  <img src="screenshots/googleservice.png" alt="Android Firebase Configuration Screen" width="700" />
  <p><em>Firebase Console - Android app configuration and file download</em></p>
</div>

**File placement:** The `google-services.json` file should be placed in `public/android/google-services.json`

#### iOS Configuration

Download the `GoogleService-Info.plist` configuration file for iOS integration.

<div align="center">
  <img src="screenshots/plist.png" alt="iOS Firebase Configuration Screen" width="700" />
  <p><em>Firebase Console - iOS app configuration and file download</em></p>
</div>

**File placement:** The `GoogleService-Info.plist` file should be placed in `public/ios/GoogleService-Info.plist`

### Security Considerations

> **Important Security Notice**
> 
> Never download or manually handle the Firebase Admin SDK JSON file. Instead, use the Firebase Admin SDK secret string method for secure environment variable configuration.

### Configuration Files Summary

| Platform | Configuration File | Destination Path |
|----------|-------------------|------------------|
| Android | `google-services.json` | `public/android/google-services.json` |
| iOS | `GoogleService-Info.plist` | `public/ios/GoogleService-Info.plist` |

**Note:** The `mobile-config.js` file automatically handles the inclusion of these configuration files in your Cordova build process.

### Firebase Admin SDK Configuration

#### Obtaining the Admin SDK Secret

1. Access your Firebase Console
2. Navigate to Project Settings → Service Accounts
3. Generate a new private key
4. Copy the JSON content (this is your admin SDK secret)

#### Environment Variable Setup

**For production servers:**
```bash
export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n..."}'
```

**For development environment:**
- Create a file: `server/private/firebase-admin-key.json`
- Add the JSON content to this file
- Ensure this file is included in your `.gitignore`
- Update the reference in your `firebase.js` configuration file

**Important:** Always use environment variables for production deployments to maintain security.

## Mobile Application Development

### Android Development

#### Initial Setup
```bash
meteor add-platform android
meteor add cordova:@havesource/cordova-plugin-push@5.0.5
```

#### Running on Physical Android Device
Ensure your Android device is connected via USB with Developer Options and USB Debugging enabled.

```bash
meteor npm run start android-device --mobile-server=https://<your-proxy-url-or-production-domain>
```

#### Running on Android Emulator
Ensure you have an Android emulator created and running through Android Studio.

```bash
meteor npm run start android
```

### iOS Development (Mac Only)

#### Initial Setup
```bash
meteor add-platform ios
```

#### Running on Physical iOS Device
Connect your iOS device to your Mac. This command will open Xcode where you need to manually select your device and build.

```bash
meteor npm run start ios-device --mobile-server=https://<your-proxy-url-or-production-domain>
```

#### Running on iOS Simulator
This command opens Xcode where you can select your preferred iOS simulator.

```bash
meteor npm run start ios
```

## Production Build Process

### Creating Production Builds

Generate a production-ready Android App Bundle (AAB) for Google Play Store distribution:

```bash
meteor build output/ --architecture os.linux.x86_64 --server=https://<your-production-domain>
```

**Build output:**
- The generated `.aab` file will be located in the `output/` directory
- This file is ready for upload to Google Play Console
- No additional tunneling tools are required for production builds

## Push Notification Testing

### Sending Test Notifications

Use the provided shell script to send test push notifications. Configure the script with your server details:

```bash
PUSHGATEWAY="http://localhost:3000"
RELYINGPARTY="your-username"
```

Run the notification script:
```bash
./send-notification.sh
```

### Expected Response Examples

```json
{"success":false,"error":"The registration token is not a valid FCM registration token"}
{"success":true,"action":"approve"}
{"success":true,"action":"reject"}
{"success":true,"action":"timeout"}
```

**Response meanings:**
- `success: false` - Invalid FCM token or configuration issue
- `action: approve` - User approved the notification
- `action: reject` - User rejected the notification
- `action: timeout` - Notification timed out without user interaction

## Project Structure

Understanding the application architecture and file organization:

| Path/File | Purpose | Description |
|-----------|---------|-------------|
| `client/main.jsx` | Frontend Logic | React UI components and push notification registration |
| `server/main.js` | Backend Logic | Meteor server implementation and push notification handling |
| `mobile-config.js` | Mobile Configuration | Cordova application metadata and mobile-specific settings |
| `public/android/` | Android Assets | Android-specific configuration files and resources |
| `public/ios/` | iOS Assets | iOS-specific configuration files and resources |
| `server/private/` | Server Secrets | Private configuration files (excluded from version control) |

## Continuous Integration and Deployment

### GitHub Actions Workflows

The project includes automated CI/CD pipelines:

#### Android Build Workflow
- **File:** `.github/workflows/android-build.yml`
- **Purpose:** Automated Android application building and testing
- **Triggers:** Push to main branch, pull requests

#### Server Bundle Workflow  
- **File:** `.github/workflows/build-server-on-release.yml`
- **Purpose:** Automated server bundling for production releases
- **Triggers:** Release creation, tagged commits

### CI/CD Configuration

**Required GitHub Secrets:**
- `FIREBASE_SERVICE_ACCOUNT_JSON` - Your Firebase Admin SDK secret for secure CI usage

**Setup Instructions:**
1. Navigate to your GitHub repository settings
2. Go to Secrets and Variables → Actions
3. Add the required secrets with their respective values
4. Ensure workflows have appropriate permissions

## Security Best Practices

### Firebase Security
- **Never commit Firebase Admin SDK JSON files to version control**
- Use environment variables for all sensitive configuration
- Implement proper `.gitignore` and `.meteorignore` rules
- Regularly rotate Firebase service account keys

### Application Security
- Restrict Firebase project access to necessary team members only
- Implement proper authentication and authorization
- Use HTTPS for all production communications
- Regularly audit and update dependencies

### Development Security
- Keep development and production environments separated
- Use different Firebase projects for different environments
- Implement proper logging without exposing sensitive data
- Regular security audits of the codebase

## Troubleshooting and Support

### Common Issues

**Firebase Connection Issues:**
- Verify configuration files are in correct locations
- Check Firebase project settings and API enablement
- Ensure environment variables are properly set

**Mobile Build Issues:**
- Verify all prerequisites are installed and properly configured
- Check platform-specific SDK versions
- Ensure proper signing certificates for iOS builds

**Push Notification Issues:**
- Verify FCM tokens are being properly generated and stored
- Check Firebase Cloud Messaging configuration
- Test with different notification payload formats

### Getting Help

If you encounter issues or need assistance:

1. **Check the documentation** - Review this README and official Meteor/Firebase documentation
2. **Search existing issues** - Look through GitHub issues for similar problems
3. **Create a new issue** - Provide detailed information about your problem
4. **Submit pull requests** - Contribute improvements and fixes

### Contributing

We welcome contributions to improve this application. Please:
- Fork the repository
- Create a feature branch
- Follow existing code style and conventions
- Add appropriate tests and documentation
- Submit a pull request with a clear description

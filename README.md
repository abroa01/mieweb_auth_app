# Meteor React App with Cordova Integration

This is a Meteor application that uses React for the frontend and supports Cordova for mobile platforms. It integrates Firebase Cloud Messaging (FCM) for push notifications using the `@havesource/cordova-plugin-push`.

---

## 📊 Sequence Diagram 
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
````

---

## 📷 Screenshots

### App HomePage

<img width="450" alt="image" src="https://github.com/user-attachments/assets/ceaab48e-3465-4b75-8932-174e2e2ff231" />

### Push Notification Example

![Push Notification](screenshots/push.png)

---

## 🔧 Local Development Setup

### 1. Clone the Project

```bash
git clone https://github.com/abroa01/mieweb_auth_app.git
cd mieweb_auth_app
```

### 2. Install Meteor

```bash
curl https://install.meteor.com/ | sh
```

### 3. Install Dependencies

```bash
meteor npm install
```

### 4. Setup Firebase

* Create a Firebase project
* Enable **Cloud Messaging**
* Download `google-services.json` and place it at:

  ```
  .meteor/local/cordova-build/platforms/android/app/google-services.json
  ```
* Also, download the **Firebase Admin SDK JSON** file and place it at:

  ```
  server/private/firebase-admin-key.json
  ```

---

## 📱 Run Mobile App (Local)

### Android

```bash
meteor add-platform android
meteor add cordova:@havesource/cordova-plugin-push@5.0.5
meteor run android-device
```

> ⚠️ Make sure to run the Meteor server with a public IP accessible to your device. Example:

```bash
meteor run android-device --mobile-server=https://<your-ngrok-url>
```

### iOS (Mac Only)

```bash
meteor add-platform ios
meteor run ios-device --mobile-server=https://<your-ngrok-url>
```

---

## 📦 Production Build Instructions

### 1. Start Local Server with Public URL

Use `ngrok` to expose your local server:

```bash
ngrok http 3000
```

### 2. Build for Android

```bash
meteor build output/ --architecture os.linux.x86_64 --server=https://<your-ngrok-url>
```

This creates a signed Android App Bundle (`.aab`) in `output/`.

### 3. Firebase Config Placement

* During GitHub Actions or production builds, ensure:

  * `google-services.json` is copied to:

    ```
    .meteor/local/cordova-build/platforms/android/app/google-services.json
    ```
  * `firebase-admin-key.json` is stored in and also update the location in the server/firebase.js file:

    ```
    server/private/firebase-admin-key.json
    ```

---

## 🚀 Push Notifications

### Sending Push Notifications to Meteor Server

Use the following curl command:

```bash
curl -X POST \
-H "Content-Type: application/json" \
-d '{
    "token": "<FCM_TOKEN>",
    "title": "Test Notification",
    "body": "This is a test message from Meteor.",
    "data": {"customKey": "customValue"}
}' \
http://localhost:3000/send-notification
```

Response:

```json
{"success":true,"messageId":"projects/..."}
```

---

## 🗂 File Overview

| File/Folder                                                              | Purpose                              |
| ------------------------------------------------------------------------ | ------------------------------------ |
| `client/main.jsx`                                                        | React UI + Cordova push registration |
| `server/main.js`                                                         | Meteor server + FCM push logic       |
| `server/private/firebase-admin-key.json`                                 | Firebase Admin SDK (used by server)  |
| `.meteor/local/cordova-build/platforms/android/app/google-services.json` | Firebase config for Android app      |
| `mobile-config.js`                                                       | Cordova app metadata                 |

---

## 🤖 GitHub Actions Build (Optional)

A GitHub Actions workflow is provided to build your `.aab` file for Android. See `.github/workflows/android-build.yml` (included in repo).

---

## 📋 Firebase Setup Summary

| Component              | Required? | Location                                             |
| ---------------------- | --------- | ---------------------------------------------------- |
| `google-services.json` | ✅         | `.meteor/local/cordova-build/platforms/android/app/` |
| Firebase Admin SDK     | ✅         | `server/private/firebase-admin-key.json`             |

---

## ❓ Questions?

Open an issue if you encounter any problems!


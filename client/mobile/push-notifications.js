import { Meteor } from "meteor/meteor";
import { Session } from 'meteor/session';

/**
 * Sends a user action (approve/reject) to the server
 * @param {string} appId - The application ID
 * @param {string} action - The action to perform (approve/reject)
 */
const sendUserAction = (appId, action) => {
  console.log(`Sending user action: ${action} for appId: ${appId}`);

  Meteor.call('notifications.handleResponse', appId, action, (error, result) => {
    if (error) {
      console.error('Error sending notification response:', error);
    } else {
      console.log('Server processed action:', result);
    }
  });
};

/**
 * Creates the default notification channel for Android
 */
const createNotificationChannel = () => {
  PushNotification.createChannel(
    () => console.log(" ### Log Step 1: inside main.jsx and about to call configuration methods"),
    () => console.error('Channel creation failed'),
    {
      id: 'default',
      description: 'Default channel',
      importance: 4,
      vibration: true,
      sound: 'default'
    }
  );
};

/**
 * Configures push notification settings for Android and iOS
 * @returns {Object} The initialized push notification object
 */
const configurePushNotifications = () => {
  return PushNotification.init({
    android: {
      forceShow: true,
      clearNotifications: false,
      icon: "ic_launcher",
      iconColor: "#4CAF50",
      actions: [
        { id: 'approve', title: 'Approve' },
        { id: 'reject', title: 'Reject' }
      ],
      priority: "high",
      sound: true,
      vibrate: true,
      channel: {
        id: "default",
        importance: "high",
        sound: "default",
        vibration: true
      }
    },
    ios: {
      alert: true,
      badge: true,
      sound: true,
      priority: "high",
      foreground: true
    }
  });
};

/**
 * Handles notification registration
 * @param {Object} push - The push notification object
 */
const setupRegistrationHandler = (push) => {
  push.on('registration', (data) => {
    console.log(" ### Log Step 1.3.1 : inside push-notifications.js and initializing Registration handler attached with data ", JSON.stringify(data));
    Session.set('deviceToken', data.registrationId);
  });
};

/**
 * Handles incoming notifications
 * @param {Object} push - The push notification object
 */
const setupNotificationHandler = (push) => {
  push.on('notification', (notification) => {
    console.log(" ### Log Step 1.3.2 : inside push-notifications.js and initializing Notification received handler with data ", JSON.stringify(notification));
    
    // Handle cold start (app launched from notification)
    if (notification.additionalData.coldstart) {
      const action = notification.additionalData.action;
      if(action) {
        sendUserAction(notification.additionalData.appId, action);
      }
    }
    
    // Handle foreground/background processing
    if (notification.additionalData.appId) {
      Session.set('notificationReceivedId', {
        appId: notification.additionalData.appId, 
        status: "pending"
      });
    }
  });
};

/**
 * Handles notification rejection
 * @param {Object} push - The push notification object
 */
const setupRejectHandler = (push) => {
  push.on('reject', (notification) => {
    if (notification.additionalData) {
      const { appId } = notification.additionalData;
      if(Session.get("userProfile")){
        sendUserAction(appId, 'reject');  
        Session.set('notificationReceivedId', {appId, status:"rejected"})  
      } else {
        Session.set('notificationReceivedId', {appId, status:"pending"})
      }
    }
  });
};

/**
 * Handles notification approval
 * @param {Object} push - The push notification object
 */
const setupApproveHandler = (push) => {
  push.on('approve', (notification) => {
    if (notification.additionalData) {
      const { appId } = notification.additionalData;
      if(Session.get("userProfile")){
        sendUserAction(appId, 'approve');    
        Session.set('notificationReceivedId', {appId, status:"approved"})
      } else {
        Session.set('notificationReceivedId', {appId, status:"pending"})
      }
    }
  });
};

/**
 * Handles push notification errors
 * @param {Object} push - The push notification object
 */
const setupErrorHandler = (push) => {
  push.on('error', (error) => {
    console.log(" ### Log Step 1.3.3 : inside push-notifications.js and Error handler attached with data ", JSON.stringify(error));
  });
};

/**
 * Initializes push notifications and sets up all event handlers
 */
export const initializePushNotifications = () => {
  try {
    console.log(" ### Log Step 1.3: inside push-notifications.js and initializing the push config on the device");
    // Create notification channel for Android 
    createNotificationChannel();
    
    // Initialize push notifications
    const push = configurePushNotifications();
    
    // Set up all event handlers
    setupRegistrationHandler(push);
    setupNotificationHandler(push);
    setupRejectHandler(push);
    setupApproveHandler(push);
    setupErrorHandler(push);
  
    console.log(" ### Log Step 1.3.4: All push notification handlers attached successfully");
  } catch (error) {
    console.error("Error initializing push notifications:", error);
  }
}; 
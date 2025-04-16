import { Meteor } from "meteor/meteor";
import { Email } from 'meteor/email';
import { WebApp } from "meteor/webapp";
import { sendNotification } from "./firebase";
import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import { Random } from "meteor/random";
import { DeviceDetails } from "../utils/api/deviceDetails.js";
import {NotificationHistory} from "../utils/api/notificationHistory.js"


// Create Maps to store pending notifications and response promises
const pendingNotifications = new Map();
const responsePromises = new Map();

/**
 * Save notification history for a user
 * @param {Object} notification - Notification details
 * @returns {String} Notification ID
 */
const saveUserNotificationHistory = async (notification) => {
  const { appId, title, body, userId } = notification;

  if (!userId) {
    console.error("No userId provided for notification history");
    return null;
  }

  try {
    // Generate a unique notification ID
    const notificationId = await Meteor.callAsync("notificationHistory.insert", { 
      userId, 
      appId, 
      title, 
      body 
    });
    
    console.log(`Notification history saved with ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error("Error saving notification history:", error);
    return null;
  }
};

/**
 * Helper function to send sync notifications to all user devices
 * @private
 */
const sendSyncNotificationToDevices = async (username, notificationId, action) => {
  try {
    const fcmTokens = await Meteor.callAsync('deviceDetails.getFCMTokenByUsername', username);
    if (!fcmTokens || fcmTokens.length === 0) return;

    const syncData = {
      notificationId,
      syncAction: action,
      timestamp: new Date().toISOString()
    };

    const notificationData = {
      appId: fcmTokens[0],
      messageFrom: 'mie',
      notificationType: 'sync',
      content_available: '1',
      notId: 'sync',
      isDismissal: 'false',
      isSync: 'true',
      syncData: JSON.stringify(syncData)
    };

    const sendPromises = fcmTokens.map(token =>
      sendNotification(
        token,
        'Notification Update',
        `Notification ${action}ed`,
        notificationData
      )
    );

    await Promise.allSettled(sendPromises);
    console.log('Sync notifications sent to all devices');
  } catch (error) {
    console.error('Error sending sync notifications:', error);
    // Don't throw error to prevent disrupting the main flow
  }
};

// Handle notification endpoint
WebApp.connectHandlers.use("/send-notification", async (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const requestBody = JSON.parse(body);
      console.log("Received request body:", requestBody);

      const { username, title, body: messageBody, actions } = requestBody;

      if (!username || !title || !messageBody || !actions) {
        throw new Error("Missing required fields");
      }

      // Get FCM tokens for the username
      const fcmTokens = await new Promise((resolve, reject) => {
        Meteor.call("deviceDetails.getFCMTokenByUsername", username, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });

      if (!fcmTokens || fcmTokens.length === 0) {
        throw new Error("No FCM tokens found for the given username");
      }

      // Get user document for appId
      const userDoc = await DeviceDetails.findOneAsync({ username });
      if (!userDoc) {
        throw new Error("User not found");
      }

      // Prepare notification data
      const notificationData = {
        appId: userDoc.devices[0].appId,
        messageFrom: 'mie',
        notificationType: 'approval',
        content_available: '1',
        notId: '10',
        isDismissal: 'false',
        isSync: 'false',
        actions: JSON.stringify(actions),
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sound: 'default',
        // Add platform-specific data
        platform: 'both',
        timestamp: new Date().toISOString()
      };

      // Send notification to all devices of the user
      const notificationPromises = fcmTokens.map(async fcmToken => {
        try {
          return await sendNotification(fcmToken, title, messageBody, notificationData);
        } catch (error) {
          console.error(`Error sending to token ${fcmToken}:`, error);
          // If token is invalid, we should remove it from the database
          if (error.code === 'messaging/invalid-registration-token' || 
              error.code === 'messaging/registration-token-not-registered') {
            await DeviceDetails.updateAsync(
              { username },
              { $pull: { 'devices.fcmToken': fcmToken } }
            );
            console.log(`Removed invalid token for user ${username}`);
          }
          throw error;
        }
      });

      await Promise.all(notificationPromises);
      console.log("Notifications sent successfully to all devices");

      // Save notification history for the user
      await saveUserNotificationHistory({
        appId: userDoc.devices[0].appId,
        title,
        body: messageBody,
        userId: userDoc.userId
      });

      // Create promise for user response
      const userResponsePromise = new Promise((resolve) => {
        responsePromises.set(username, resolve);

        setTimeout(() => {
          if (responsePromises.has(username)) {
            resolve("timeout");
            responsePromises.delete(username);
          }
        }, 25000);
      });

      const userResponse = await userResponsePromise;
      console.log("USER RESPONSE", userResponse);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          action: userResponse,
        })
      );
    } catch (error) {
      console.error("Error in /send-notification:", error);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          error: error.message,
        })
      );
    }
  });
});

// Meteor methods
Meteor.methods({
  async 'users.checkRegistrationStatus'({ userId, email }) {
    check(userId, Match.Maybe(String));
    check(email, Match.Maybe(String));
    
    console.log('### Log: Checking registration status for user', userId || email);
    
    // Ensure we have some identifier to search with
    if (!userId && !email) {
      throw new Meteor.Error('invalid-params', 'User ID or email is required');
    }
    
    // Create query based on available parameters
    const user = await Meteor.users.findOneAsync({
      $or: [
        { 'emails.address': { $regex: new RegExp(`^${email}$`, 'i') } },
        { userId: { $regex: new RegExp(`^${userId}$`, 'i') } }
      ]
    });
    
    // If no user found, return error
    if (!user) {
      throw new Meteor.Error('not-found', 'User not found');
    }

    console.log(`### user details while searching for status', ${JSON.stringify(user)}`);
    
    
    // Get registration status and device info
    const registrationStatus = user.profile?.registrationStatus || 'pending';
    const isFirstDevice = user.profile?.isFirstDevice || false;
    
    console.log(`### Log: User ${userId || email} registration status: ${registrationStatus}`);
    
    // Return registration status information
    return {
      status: registrationStatus,
      isFirstDevice,
      email: user.emails?.[0]?.address,
      username: user.username
    };
  },
  
  /**
   * Handle notification response
   * @param {String} username - Username
   * @param {String} action - User action
   * @returns {Object} Response status
   */
  async "notifications.handleResponse"(username, action) {
    check(username, String);
    check(action, String);

    console.log(`Handling notification response for username: ${username}, action: ${action}`);
    
    // First, find the user and latest notification to update its status
    const userDoc = await DeviceDetails.findOneAsync({ username });
    if (!userDoc) {
      throw new Meteor.Error("user-not-found", "User not found");
    }
    
    // Get the latest notification for this user
    const latestNotification = await NotificationHistory.findOneAsync(
      { userId: userDoc.userId },
      { sort: { createdAt: -1 } }
    );
    
    if (!latestNotification) {
      console.log("No notification found for user");
      return { success: false, message: "No notification found" };
    }
    
    // Check if notification is already handled
    if (latestNotification.status !== 'pending') {
      console.log(`Notification ${latestNotification.notificationId} already handled with status: ${latestNotification.status}`);
      
      // If this is a duplicate response, still send the sync notification to other devices
      try {
        await sendSyncNotificationToDevices(username, latestNotification.notificationId, action);
      } catch (error) {
        console.error("Error sending sync notification for already handled notification:", error);
      }
      
      // If there's still a pending promise (rare race condition), resolve it
      if (responsePromises.has(username)) {
        const resolve = responsePromises.get(username);
        resolve(latestNotification.status);
        responsePromises.delete(username);
        return { success: true, message: `Using existing status: ${latestNotification.status}` };
      }
      
      return { success: true, message: `Notification already handled with status: ${latestNotification.status}` };
    }
    
    // Update notification status in database
    const newStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : action;
    await Meteor.callAsync("notificationHistory.updateStatus", latestNotification.notificationId, newStatus);
    console.log(`Updated notification ${latestNotification.notificationId} status to ${newStatus}`);
    
    // Resolve the promise if it exists
    if (responsePromises.has(username)) {
      const resolve = responsePromises.get(username);
      resolve(action); // Return the action to the original request
      responsePromises.delete(username);
      console.log(`Resolved response promise for username ${username} with action ${action}`);
    } else {
      console.log(`No pending promise found for username: ${username}, but notification was updated`);
    }
    
    // Send sync notification to all devices
    await sendSyncNotificationToDevices(username, latestNotification.notificationId, action);
    
    return {
      success: true,
      message: `Response ${action} processed successfully`,
    };
  },
  
  /**
   * Login with biometric credentials
   * @param {String} secret - Biometric secret
   * @returns {Object} User data
   */
  async 'users.loginWithBiometric'(secret) {
    check(secret, String);
    
    // Find the device with this biometric secret
    const userDoc = await DeviceDetails.findOneAsync({ 'devices.biometricSecret': secret });
    
    if (!userDoc) {
      throw new Meteor.Error('not-found', 'Biometric credentials not found');
    }
    
    const device = userDoc.devices.find(d => d.biometricSecret === secret);
    
    // Get the user associated with this device
    const user = await Meteor.users.findOneAsync({ _id: userDoc.userId });
    
    if (!user) {
      throw new Meteor.Error('not-found', 'User not found with these biometric credentials');
    }
    
    // Return necessary user information for the session
    return {
      _id: user._id,
      email: user.emails[0].address,
      username: user.username,
      deviceLogId: device._id,
      appId: device.appId
    };
  },

  /**
   * Handle user action for notifications
   * @param {String} action - User action
   * @param {String} requestId - Request identifier
   * @param {String} replyText - Optional reply text
   * @returns {Object} Action result
   */
  async userAction(action, requestId, replyText = null) {
    check(action, String);
    check(requestId, String);
    if (replyText) check(replyText, String);

    const validActions = ["approve", "reject", "reply"];
    if (!validActions.includes(action)) {
      throw new Meteor.Error(
        "invalid-action",
        "Invalid action performed by the user."
      );
    }

    const pendingNotification = pendingNotifications.get(requestId);
    if (pendingNotification) {
      clearTimeout(pendingNotification.timeout);
      pendingNotification.resolve({ action, replyText });
      pendingNotifications.delete(requestId);
      return { success: true, action, replyText };
    } else {
      throw new Meteor.Error(
        "invalid-request",
        "No pending notification found for this request."
      );
    }
  },

  /**
   * Register a user or a new device for an existing user
   * @param {Object} userDetails - User registration details
   * @returns {Object} Registration result
   */
  /**
 * Register a user or a new device for an existing user
 * @param {Object} userDetails - User registration details
 * @returns {Object} Registration result
 */
async 'users.register'(userDetails) {
  console.log(" ### Log Step 5 : Inside server/main.js and checking all the userDetails received");
  check(userDetails, {
    email: String,
    username: String,
    pin: String,
    firstName: String,
    lastName: String,
    sessionDeviceInfo: Object,
    fcmDeviceToken: String,
    biometricSecret: String
  });
  
  const { email, username, pin, firstName, lastName, sessionDeviceInfo, fcmDeviceToken, biometricSecret } = userDetails;
  
  try {
    // Check if user already exists
    console.log(" ### Log Step 5.1 : Inside server/main.js and checking if user already exist? passing username and email to fetch the user")
    const existingUser = await Meteor.users.findOneAsync({
      $or: [
        { 'emails.address': { $regex: new RegExp(`^${email}$`, 'i') } },
        { username: { $regex: new RegExp(`^${username}$`, 'i') } }
      ]
    });
    
    let userId;
    let isFirstDevice = false;
    let userRegistrationStatus = 'approved'; // Default status for existing users or additional devices
    
    if (existingUser) {
      console.log(" ### Log Step 5.2 : Inside server/main.js, Existing user found with userId :", JSON.stringify(existingUser._id));
      userId = existingUser._id; // returning back the existing _id
      
      // Check if the user has any registered devices already
      const existingDevices = await Meteor.callAsync('deviceDetails.getByUserId', userId);
      if (!existingDevices || existingDevices.length === 0) {
        // This is the first device for an existing user
        isFirstDevice = true;
        userRegistrationStatus = 'pending';
      }
    } else {
      console.log(" ### Log Step 5.2.1 : Creating new user account for:", username);
      try {
        userId = await Accounts.createUser({
          email,
          username,
          password: pin,
          profile: { 
            firstName, 
            lastName,
            registrationStatus: 'pending' // New users start with pending status
          }
        });
        
        // Setting first device flag for new users
        isFirstDevice = true;
        userRegistrationStatus = 'pending';
        
        console.log(` ### Log Step 5.2.2 : Successfully created user with ID: ${userId}`);
      } catch (error) {
        console.error("User creation error:", error);
        throw new Meteor.Error('user-creation-failed', error.reason || 'User creation failed');
      }
    }
    
    console.log(" ### Log Step 5.3 : Inside server/main.js, Now registering the current device in deviceDetails collection");
    
    // Register or update device details
    const appId = await Meteor.callAsync('deviceDetails', {
      username,
      biometricSecret,
      userId,
      email,
      deviceUUID: sessionDeviceInfo.uuid,
      fcmToken: fcmDeviceToken,
      firstName,
      lastName,
      isPrimaryDevice: isFirstDevice,
      deviceStatus: isFirstDevice ? 'pending' : 'approved'
    });
    
    // If this is the first device, send email to admin for approval
    if (isFirstDevice) {
      try {
        const adminEmails = Meteor.settings.adminEmails || ['admin@example.com'];
        
        // Send notification email to admin
        Email.send({
          to: adminEmails,
          from: Meteor.settings.systemEmail || 'system@example.com',
          subject: `New device approval required for user: ${username}`,
          text: `
            A new user has registered with the following details:
            
            Username: ${username}
            Email: ${email}
            Name: ${firstName} ${lastName}
            Device UUID: ${sessionDeviceInfo.uuid}
            
            Please approve or reject this registration in the admin panel.
          `
        });
        
        console.log(` ### Log Step 5.4 : Sent approval request email to admin for user: ${username}`);
      } catch (emailError) {
        console.error('Failed to send admin notification email:', emailError);
        // Continue execution even if email fails
      }
    }
    
    return {
      success: true,
      userId,
      isFirstDevice,
      registrationStatus: userRegistrationStatus,
      message: isFirstDevice ? 
        'Your registration is pending approval by an administrator. You will be notified once approved.' : 
        'Device registered successfully'
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw new Meteor.Error(
      error.error || 'registration-failed',
      error.reason || 'Failed to register user'
    );
  }
},

  /**
   * Get user details by email
   * @param {String} email - User email
   * @returns {Object} User profile details
   */
  async getUserDetails(email) {
    check(email, String);

    const user = await Meteor.users.findOneAsync({ "emails.address": email });

    if (!user) {
      throw new Meteor.Error("User not found");
    }

    return {
      firstName: user.profile?.firstName || "",
      lastName: user.profile?.lastName || "",
      email: user.emails[0].address || "",
    };
  },

  /**
   * Check if a device is registered
   * @param {String} fcmToken - FCM token
   * @returns {String} User ID
   */
  async "users.checkRegistration"(fcmToken) {
    check(fcmToken, String);

    const deviceLog = await DeviceDetails.findOneAsync({ fcmToken: fcmToken });
    if (!deviceLog) {
      throw new Meteor.Error(
        "device-deregistered",
        "This device is deregistered. Please register again."
      );
    }
    return deviceLog.userId;
  },

  /**
   * Update user profile
   * @param {Object} profile - Profile data
   * @returns {Object} Update result
   */
  async updateUserProfile({ firstName, lastName, email }) {
    check(firstName, String);
    check(lastName, String);
    check(email, String);

    if (!this.userId) {
      throw new Meteor.Error(
        "not-authorized",
        "You must be logged in to update your profile"
      );
    }

    try {
      // Update the user's profile in the database
      await Meteor.users.updateAsync(this.userId, {
        $set: {
          "profile.firstName": firstName,
          "profile.lastName": lastName,
          "emails.0.address": email,
        },
      });

      return { success: true, message: "Profile updated successfully" };
    } catch (error) {
      console.error("Error updating profile:", error);
      throw new Meteor.Error("update-failed", "Failed to update profile", error);
    }
  },

  /**
   * Map FCM token to user
   * @param {String} userId - User ID
   * @param {String} fcmToken - FCM token
   * @returns {Object} Result
   */
  async "users.mapFCMTokenToUser"(userId, fcmToken) {
    check(userId, String);
    check(fcmToken, String);

    if (!this.userId) {
      throw new Meteor.Error("not-authorized", "User must be logged in");
    }

    const user = Meteor.users.findOne(userId);
    if (!user) {
      throw new Meteor.Error("user-not-found", "User not found");
    }

    // Find device log with this FCM token
    const deviceLog = await DeviceDetails.findOneAsync({ userId, fcmToken });
    
    // If device log exists, update it, otherwise create a new entry
    if (deviceLog) {
      await DeviceDetails.updateAsync(
        { _id: deviceLog._id },
        { $set: { fcmToken: fcmToken, lastUpdated: new Date() } }
      );
    }
    
    return { success: true };
  },
  
  /**
   * Check if any users exist in the system
   * @returns {Boolean} Whether users exist
   */
  async checkUsersExist() {
    try {
      const userCount = await Meteor.users.find().countAsync();
      console.log("User count:", userCount);
      return userCount > 0;
    } catch (error) {
      console.error("Error in checkUsersExist:", error);
      throw new Meteor.Error("server-error", "Failed to check user existence");
    }
  },
  
  /**
   * Update App ID in external system
   * @param {String} username - Username
   * @param {String} appId - App ID
   * @returns {Object} API response
   */
  'updateAppId': async function(username, appId) {
    try {
      // const result = await HTTP.post("https://937d-50-221-78-186.ngrok-free.app/update-app-id", {
      //   data: {
      //     username: username,
      //     appId: appId
      //   },
      //   headers: {
      //     'Content-Type': 'application/json'
      //   }
      // });
      const result = 'success';
      return result;
    } catch (error) {
      throw new Meteor.Error('api-error', error.message);
    }
  },

  'notifications.send': async function (username, title, body, actions) {
    check(username, String);
    check(title, String);
    check(body, String);
    check(actions, Array);

    try {
      const fcmTokens = await Meteor.callAsync('deviceDetails.getFCMTokenByUsername', username);
      console.log('Found FCM tokens:', fcmTokens);

      if (!fcmTokens || fcmTokens.length === 0) {
        throw new Meteor.Error('no-devices', 'No devices found for user');
      }

      const notificationData = {
        appId: fcmTokens[0], // Use first token as appId
        actions: JSON.stringify(actions),
        messageFrom: 'mie',
        notificationType: 'approval',
        content_available: '1',
        notId: '10',
        isDismissal: 'false',
        isSync: 'false'
      };

      // Send to all devices
      const sendPromises = fcmTokens.map(token => 
        sendNotification(token, title, body, notificationData)
      );

      await Promise.all(sendPromises);
      console.log('Notifications sent successfully to all devices');
    } catch (error) {
      console.error('Error sending notifications:', error);
      throw new Meteor.Error('notification-failed', error.message);
    }
  },

  'notifications.handleResponse': async function (username, action) {
    check(username, String);
    check(action, String);

    try {
      const user = await Meteor.users.findOneAsync({ username });
      if (!user) {
        throw new Meteor.Error('user-not-found', 'User not found');
      }

      const latestNotification = await NotificationHistory.findOneAsync(
        { userId: user._id },
        { sort: { createdAt: -1 } }
      );

      if (!latestNotification) {
        throw new Meteor.Error('no-notification', 'No notification found');
      }

      // Check if notification is already handled
      if (latestNotification.status !== 'pending') {
        console.log('Notification already handled, sending sync to other devices');
        // Still send sync notification to other devices
        await sendSyncNotificationToDevices(username, latestNotification.notificationId, action);
        return { status: 'already-handled' };
      }

      // Update notification status
      await NotificationHistory.updateAsync(
        { _id: latestNotification._id },
        { $set: { status: action === 'approve' ? 'approved' : 'rejected' } }
      );

      // Send sync notification to other devices
      await sendSyncNotificationToDevices(username, latestNotification.notificationId, action);

      // Resolve any pending promises for this notification
      if (responsePromises.has(username)) {
        const resolve = responsePromises.get(username);
        resolve(action);
        responsePromises.delete(username);
      }

      return { status: 'success', action };
    } catch (error) {
      console.error('Error handling notification response:', error);
      throw new Meteor.Error('response-failed', error.message);
    }
  },
  /**
 * Admin approves or rejects first device
 * 
 * @param {Object} options - Approval details
 * @returns {Object} Approval result
 */
'devices.adminApproval': async function(options) {
  check(options, {
    userId: String,
    deviceUUID: String,
    approved: Boolean
  });
  
  // Verify that this is an admin user (you'd need to implement proper admin checks)
  if (!Meteor.userId() || !Roles.userIsInRole(Meteor.userId(), ['admin'])) {
    throw new Meteor.Error('unauthorized', 'Only admins can approve devices');
  }
  
  const { userId, deviceUUID, approved } = options;
  
  // Find the user and device
  const userDeviceDoc = await DeviceDetails.findOneAsync({ 
    userId, 
    'devices.deviceUUID': deviceUUID 
  });
  
  if (!userDeviceDoc) {
    throw new Meteor.Error('not-found', 'User device not found');
  }
  
  const deviceIndex = userDeviceDoc.devices.findIndex(d => d.deviceUUID === deviceUUID);
  if (deviceIndex === -1) {
    throw new Meteor.Error('not-found', 'Device not found');
  }
  
  const device = userDeviceDoc.devices[deviceIndex];
  
  // Check if this is the first device (should be pending)
  if (device.approvalStatus !== 'pending') {
    throw new Meteor.Error('invalid-status', 'Device is not pending approval');
  }
  
  // Update device status
  await DeviceDetails.updateAsync(
    { userId, 'devices.deviceUUID': deviceUUID },
    {
      $set: {
        [`devices.${deviceIndex}.approvalStatus`]: approved ? 'approved' : 'rejected',
        [`devices.${deviceIndex}.lastUpdated`]: new Date(),
        lastUpdated: new Date()
      }
    }
  );
  
  // Update user account status
  await Meteor.users.updateAsync(
    { _id: userId },
    {
      $set: {
        'profile.accountStatus': approved ? 'active' : 'rejected'
      }
    }
  );
  
  // Send notification to the user about approval status
  import('../server/firebase.js').then(({ sendDeviceApprovalNotification }) => {
    sendDeviceApprovalNotification(userId, deviceUUID, approved);
  });
  
  return {
    success: true,
    message: approved ? 'Device approved successfully' : 'Device rejected'
  };
},

/**
 * Request approval for secondary device from primary device
 * 
 * @param {Object} options - Request details
 * @returns {Object} Request result
 */
'devices.requestSecondaryApproval': async function(options) {
  check(options, {
    userId: String,
    primaryDeviceUUID: String,
    newDeviceUUID: String
  });
  
  const { userId, primaryDeviceUUID, newDeviceUUID } = options;
  
  // Find the user and devices
  const userDeviceDoc = await DeviceDetails.findOneAsync({ userId });
  
  if (!userDeviceDoc) {
    throw new Meteor.Error('not-found', 'User device not found');
  }
  
  const primaryDevice = userDeviceDoc.devices.find(d => d.deviceUUID === primaryDeviceUUID);
  if (!primaryDevice || !primaryDevice.isPrimary) {
    throw new Meteor.Error('not-found', 'Primary device not found');
  }
  
  const newDevice = userDeviceDoc.devices.find(d => d.deviceUUID === newDeviceUUID);
  if (!newDevice) {
    throw new Meteor.Error('not-found', 'New device not found');
  }
  
  // Send notification to primary device requesting approval
  import('../server/firebase.js').then(({ sendSecondaryDeviceApprovalRequest }) => {
    sendSecondaryDeviceApprovalRequest(userId, primaryDeviceUUID, newDevice);
  });
  
  return {
    success: true,
    message: 'Secondary device approval requested'
  };
},

/**
 * Primary device responds to secondary device approval request
 * 
 * @param {Object} options - Response details
 * @returns {Object} Response result
 */
'devices.respondToSecondaryApproval': async function(options) {
  check(options, {
    userId: String,
    primaryDeviceUUID: String,
    secondaryDeviceUUID: String,
    approved: Boolean
  });
  
  const { userId, primaryDeviceUUID, secondaryDeviceUUID, approved } = options;
  
  // Find the user and devices
  const userDeviceDoc = await DeviceDetails.findOneAsync({ userId });
  
  if (!userDeviceDoc) {
    throw new Meteor.Error('not-found', 'User device not found');
  }
  
  const primaryDevice = userDeviceDoc.devices.find(d => d.deviceUUID === primaryDeviceUUID);
  if (!primaryDevice || !primaryDevice.isPrimary) {
    throw new Meteor.Error('unauthorized', 'Approval must come from primary device');
  }
  
  const secondaryDeviceIndex = userDeviceDoc.devices.findIndex(d => d.deviceUUID === secondaryDeviceUUID);
  if (secondaryDeviceIndex === -1) {
    throw new Meteor.Error('not-found', 'Secondary device not found');
  }
  
  // Update secondary device status
  await DeviceDetails.updateAsync(
    { userId, 'devices.deviceUUID': secondaryDeviceUUID },
    {
      $set: {
        [`devices.${secondaryDeviceIndex}.approvalStatus`]: approved ? 'approved' : 'rejected',
        [`devices.${secondaryDeviceIndex}.lastUpdated`]: new Date(),
        lastUpdated: new Date()
      }
    }
  );
  
  // Notify the secondary device about the approval result
  const secondaryDevice = userDeviceDoc.devices[secondaryDeviceIndex];
  import('../server/firebase.js').then(({ sendNotification }) => {
    sendNotification(
      secondaryDevice.fcmToken,
      approved ? 'Device Approved' : 'Device Registration Rejected',
      approved 
        ? 'Your device has been approved. You can now use the application.' 
        : 'Your device registration has been rejected.',
      {
        notificationType: 'device_approval',
        status: approved ? 'approved' : 'rejected'
      }
    );
  });
  
  return {
    success: true,
    message: approved ? 'Secondary device approved' : 'Secondary device rejected'
  };
}
});

Meteor.startup(() => {
  // Configure SMTP
  process.env.MAIL_URL = 'smtp://username:password@smtp.yourprovider.com:587';
  
  // Create indexes for better performance
  // Your existing code...
});
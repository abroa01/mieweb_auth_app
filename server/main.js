import { Meteor } from "meteor/meteor";
import { Email } from 'meteor/email';
import { WebApp } from "meteor/webapp";
import { sendNotification, sendDeviceApprovalNotification } from "./firebase";
import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import { Random } from "meteor/random";
import { DeviceDetails } from "../utils/api/deviceDetails.js";
import { NotificationHistory } from "../utils/api/notificationHistory.js"
import { ApprovalTokens } from "../utils/api/approvalTokens";
import { isValidToken } from "../utils/utils";
import { successTemplate, errorTemplate, rejectionTemplate, previouslyUsedTemplate } from './templates/email';
import dotenv from 'dotenv';


//load the env to process.env
dotenv.config();


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
const sendSyncNotificationToDevices = async (userId, notificationId, action) => {
  try {
    const fcmTokens = await Meteor.callAsync('deviceDetails.getFCMTokenByUserId', userId);
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
      syncData: JSON.stringify(syncData),
      sound: 'default'
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
WebApp.connectHandlers.use("/send-notification", (req, res, next) => {
  console.log(`${req.method} /send-notification - Origin: ${req.headers.origin}`);
  
  // Always set CORS headers first
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
  
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    res.writeHead(200); // Changed from 204 to 200
    res.end();
    return;
  }
  
  // Only handle POST requests for actual notification sending
  if (req.method !== "POST") {
    console.log(`Method ${req.method} not allowed`);
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
    return;
  }
  
  let body = "";
  
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  
  req.on("end", async () => {
    try {
      console.log("Raw request body:", body);
      
      if (!body || body.trim() === "") {
        throw new Error("Empty request body");
      }
      
      let requestBody;
      try {
        requestBody = JSON.parse(body);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error("Invalid JSON in request body");
      }
      
      console.log("Parsed request body:", requestBody);
      
      const { username, title, body: messageBody, actions } = requestBody;
      
      // Validate required fields
      if (!username) throw new Error("Username is required");
      if (!title) throw new Error("Title is required");  
      if (!messageBody) throw new Error("Message body is required");
      if (!actions || !Array.isArray(actions)) throw new Error("Actions array is required");
      
      console.log(`Processing notification for user: ${username}`);
      
      // Get FCM tokens
      const fcmTokens = await new Promise((resolve, reject) => {
        Meteor.call("deviceDetails.getFCMTokenByUsername", username, (error, result) => {
          if (error) {
            console.error("Error getting FCM tokens:", error);
            reject(error);
          } else {
            console.log("FCM tokens found:", result?.length || 0);
            resolve(result);
          }
        });
      });
      
      if (!fcmTokens || fcmTokens.length === 0) {
        throw new Error(`No FCM tokens found for username: ${username}`);
      }
      
      // Get user document
      const userDoc = await DeviceDetails.findOneAsync({ username });
      if (!userDoc) {
        throw new Error(`User not found: ${username}`);
      }
      
      if (!userDoc.devices || userDoc.devices.length === 0) {
        throw new Error(`No devices found for user: ${username}`);
      }
      
      // Prepare notification data
      const notificationData = {
        appId: userDoc.devices[0].appId,
        messageFrom: 'mie',
        notificationType: 'approval',
        content_available: '1',
        forceStart: '1',
        priority: 'high',
        notId: '10',
        isDismissal: 'false',
        isSync: 'false',
        actions: JSON.stringify(actions),
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sound: 'default',
        platform: 'both',
        timestamp: new Date().toISOString()
      };
      
      console.log("Sending notifications to", fcmTokens.length, "devices");
      
      // Send notifications
      const notificationPromises = fcmTokens.map(async (fcmToken, index) => {
        try {
          console.log(`Sending notification ${index + 1}/${fcmTokens.length}`);
          return await sendNotification(fcmToken, title, messageBody, notificationData);
        } catch (error) {
          console.error(`Error sending to token ${fcmToken}:`, error);
          
          // Handle invalid tokens
          if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
          ) {
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
      console.log("All notifications sent successfully");
      
      // Save notification history
      await saveUserNotificationHistory({
        appId: userDoc.devices[0].appId,
        title,
        body: messageBody,
        userId: userDoc.userId
      });
      
      // Wait for user response
      const userResponsePromise = new Promise((resolve) => {
        responsePromises.set(username, resolve);
        setTimeout(() => {
          if (responsePromises.has(username)) {
            console.log(`Timeout waiting for response from ${username}`);
            resolve("timeout");
            responsePromises.delete(username);
          }
        }, 25000);
      });
      
      console.log(`Waiting for response from ${username}...`);
      const userResponse = await userResponsePromise;
      console.log("USER RESPONSE:", userResponse);
      
      // Send success response
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        action: userResponse,
        message: "Notification sent successfully"
      }));
      
    } catch (error) {
      console.error("Error in /send-notification:", error);
      
      // Send error response
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }));
    }
  });
  
  req.on("error", (error) => {
    console.error("Request error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      success: false,
      error: "Internal server error"
    }));
  });
});

// For approval
WebApp.connectHandlers.use('/api/approve-user', async (req, res) => {
  const { userId, token } = req.query;
  const isValid = await isValidToken(userId, token);

  if (isValid) {
    // Mark token as used with 'approved' action
    await ApprovalTokens.updateAsync(
      { userId, token },
      {
        $set: {
          used: true,
          action: 'approved',
          usedAt: new Date()
        }
      }
    );

    // Update user's registration status
    await Meteor.users.updateAsync(
      { _id: userId },
      { $set: { 'profile.registrationStatus': 'approved' } }
    );

    await DeviceDetails.updateAsync(
      { userId },
      { $set: { 'devices.$[].deviceRegistrationStatus': 'approved' } }
    )


    // Return a success page
    res.writeHead(200, {
      'Content-Type': 'text/html'
    });
    res.end(successTemplate());
  } else {
    // Check if token was previously used
    const usedToken = await ApprovalTokens.findOneAsync({
      userId,
      token,
      used: true
    });

    if (usedToken) {
      // Token was used - show appropriate message
      res.writeHead(200, {
        'Content-Type': 'text/html'
      });

      res.end(previouslyUsedTemplate());
    } else {
      // Invalid or expired token
      res.writeHead(200, {
        'Content-Type': 'text/html'
      });
      res.end(errorTemplate());
    }
  }
});

WebApp.connectHandlers.use('/api/reject-user', async (req, res) => {
  const { userId, token } = req.query;
  const isValid = await isValidToken(userId, token);

  if (isValid) {
    try {
      // Mark token as used with 'rejected' action
      await ApprovalTokens.updateAsync(
        { userId, token },
        {
          $set: {
            used: true,
            action: 'rejected',
            usedAt: new Date()
          }
        }
      );

      // Remove user completely instead of just marking as rejected
      console.log(`Admin rejected user ${userId}, removing completely`);
      await Meteor.callAsync('users.removeCompletely', userId);

      // Return rejection page
      res.writeHead(200, {
        'Content-Type': 'text/html'
      });
      res.end(rejectionTemplate());
    } catch (error) {
      console.error('Error during user rejection:', error);
      res.writeHead(500, {
        'Content-Type': 'text/html'
      });
      res.end(errorTemplate());
    }
  } else {
    // Check if token was previously used (same logic as approve route)
    const usedToken = await ApprovalTokens.findOneAsync({
      userId,
      token,
      used: true
    });

    if (usedToken) {
      // Token was used - show appropriate message
      res.writeHead(200, {
        'Content-Type': 'text/html'
      });

      res.end(previouslyUsedTemplate());
    } else {
      // Invalid or expired token
      res.writeHead(200, {
        'Content-Type': 'text/html'
      });
      res.end(errorTemplate());
    }
  }
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
  async "notifications.handleResponse"(userId, action, notificationIdForAction) {
    check(userId, String);
    check(action, String);
    check(notificationIdForAction, String);

    // Fetch user to get the username
    const user = await Meteor.users.findOneAsync({ _id: userId });
    if (!user || !user.username) {
      console.log("User not found or missing username");
      return { success: false, message: "User not found or missing username" };
    }

    const username = user.username;

    const targetNotification = await NotificationHistory.findOneAsync({
      userId,
      notificationId: notificationIdForAction
    });

    if (!targetNotification) {
      console.log("Notification not found for given userId and notificationId");
      return { success: false, message: "Notification not found" };
    }

    if (targetNotification.status !== 'pending') {
      console.log(`Notification ${targetNotification.notificationId} already handled with status: ${targetNotification.status}`);

      try {
        await sendSyncNotificationToDevices(userId, targetNotification.notificationId, action);
      } catch (error) {
        console.error("Error sending sync notification:", error);
      }

      if (responsePromises.has(username)) {
        const resolve = responsePromises.get(username);
        resolve(targetNotification.status);
        responsePromises.delete(username);
        return { success: true, message: `Using existing status: ${targetNotification.status}` };
      }

      return { success: true, message: `Notification already handled` };
    }

    // Update status
    await NotificationHistory.updateAsync(
      { _id: targetNotification._id },
      { $set: { status: action, respondedAt: new Date() } }
    );

    console.log(`Notification ${targetNotification.notificationId} updated with action: ${action}`);

    try {
      await sendSyncNotificationToDevices(userId, targetNotification.notificationId, action);
    } catch (error) {
      console.error("Error sending sync notification:", error);
    }

    if (responsePromises.has(username)) {
      const resolve = responsePromises.get(username);
      resolve(action);
      responsePromises.delete(username);
    }

    return { success: true, message: `Notification updated with status: ${action}` };

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
  async 'users.register'(userDetails) {
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
      const existingUser = await Meteor.users.findOneAsync({
        $or: [
          { 'emails.address': { $regex: new RegExp(`^${email}$`, 'i') } },
          { username: { $regex: new RegExp(`^${username}$`, 'i') } }
        ]
      });

      console.log(`existing user : ${JSON.stringify(existingUser)}`);

      let userId, isFirstDevice = true, isSecondaryDevice = false, userAction = null;
      let deviceRegistrationStatus = 'pending';

      if (existingUser) {
        const regStatus = existingUser.profile?.registrationStatus;
        console.log(`### Log Step 5: Registration status for existing user ${username} is ${regStatus}`);

        // Block secondary devices if first device not approved yet
        if (regStatus === 'pending') {
          return { registrationStatus: 'pending' };
        }
        if (regStatus !== 'approved') {
          return { registrationStatus: 'rejected' };
        }

        userId = existingUser._id;
        isFirstDevice = false;
        isSecondaryDevice = true;

      } else {
        // Create new user with callback style (original)
        userId = await Accounts.createUser({
          email,
          username,
          password: pin,
          profile: {
            firstName,
            lastName,
            registrationStatus: 'pending'
          }
        }, (err) => {
          if (err) {
            console.error('Error creating user:', err);
            reject(err);
          } else {
            const newUser = Accounts.findUserByEmail(email);
            if (!newUser) {
              reject(new Meteor.Error('user-creation-failed', 'Failed to create user'));
            } else {
              resolve(newUser._id);
            }
          }
        });
      }

      const deviceResp = await Meteor.callAsync('deviceDetails', {
        username,
        biometricSecret,
        userId,
        email,
        deviceUUID: sessionDeviceInfo.uuid,
        fcmToken: fcmDeviceToken,
        firstName,
        lastName,
        isFirstDevice,
        isSecondaryDevice
      });

      console.log(`### Log Step 5.1: Device registration response: ${JSON.stringify(deviceResp)}`);

      if (isFirstDevice && deviceResp.isRequireAdminApproval) {
        try {
          const approvalToken = await Meteor.callAsync('users.generateApprovalToken', userId);
          const approvalUrl = Meteor.absoluteUrl(`api/approve-user?userId=${userId}&token=${approvalToken}`);
          let adminEmails, fromEmail;

          if (process.env.ENV === 'prod') {
            adminEmails = process.env.PROD_EMAIL_ADMIN;
            fromEmail = process.env.PROD_EMAIL_FROM;
          } else {
            adminEmails = process.env.DEV_EMAIL_ADMIN;
            fromEmail = process.env.DEV_EMAIL_FROM;
          }
          await Email.sendAsync({
            to: adminEmails,
            from: fromEmail,
            subject: `New device approval required for user: ${username}`,
            html: `
            <p>A new user has registered with the following details:</p>
            <ul>
              <li><strong>Username:</strong> ${username}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Name:</strong> ${firstName} ${lastName}</li>
              <li><strong>Device UUID:</strong> ${sessionDeviceInfo.uuid}</li>
            </ul>
            <p>Please approve or reject this registration:</p>
            <p>
              <a href="${approvalUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-right: 10px;">
                Approve Registration
              </a>
              <a href="${Meteor.absoluteUrl(`api/reject-user?userId=${userId}&token=${approvalToken}`)}" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Reject Registration
              </a>
            </p>
          `
          });

          console.log(`### Log Step 5.4: Sent approval request email to admin for user: ${username}, approval url: ${approvalUrl}`);
        } catch (emailError) {
          console.error('Failed to send admin notification email:', emailError);
        }
      }

      if (isSecondaryDevice) {
        try {
          const res = await sendDeviceApprovalNotification(userId, sessionDeviceInfo.uuid);

          if (res === 'timeout' || res === 'rejected' || res === 'reject') {
            await DeviceDetails.updateAsync(
              { userId: userId },
              { $pull: { devices: { appId: deviceResp.appId } } }
            );
          }
          userAction = res;
        } catch (error) {
          console.error('Error sending secondary approval notification:', error);
          userAction = 'error';
        }
      }


      return {
        success: true,
        userId,
        isFirstDevice,
        registrationStatus: deviceResp.deviceRegistrationStatus || deviceRegistrationStatus,
        userAction,
        isSecondaryDevice
      };

    } catch (error) {
      throw new Meteor.Error(error.error || 'registration-failed', error.reason || error.message);
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
  'updateAppId': async function (username, appId) {
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

  /**
 * Admin approves or rejects first device
 * 
 * @param {Object} options - Approval details
 * @returns {Object} Approval result
 */
  'devices.adminApproval': async function (options) {
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
   * Primary device responds to secondary device approval request
   * 
   * @param {Object} options - Response details
   * @returns {Object} Response result
   */
  'devices.respondToSecondaryApproval': async function (options) {
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
  },

  // When generating the token
  'users.generateApprovalToken': function (userId) {
    check(userId, String);

    // Generate a secure random token
    const token = Random.secret();

    // TODO: anisha - change later to appropriate expirt time
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    // Store the token with short expiration time
    ApprovalTokens.upsertAsync(
      { userId: userId },
      {
        $set: {
          token: token,
          createdAt: new Date(),
          expiresAt: expiresAt,
          used: false,
          action: null // Will store 'approved' or 'rejected' when used
        }
      }
    );

    console.log(`Generated approval token for user ${userId}, expires in 3 minutes`);
    return token;
  },

  /**
   * Clean up users with expired approval tokens
   * @returns {Object} Cleanup result with counts
   */
  'users.cleanupExpiredApprovals': async function() {
    console.log('Starting cleanup of users with expired approval tokens...');
    
    const now = new Date();
    let cleanedUsersCount = 0;
    let cleanedDevicesCount = 0;
    let cleanedTokensCount = 0;

    try {
      // Find all expired tokens that haven't been used
      const expiredTokens = await ApprovalTokens.find({
        expiresAt: { $lt: now },
        used: false
      }).fetchAsync();

      console.log(`Found ${expiredTokens.length} expired tokens to clean up`);

      for (const token of expiredTokens) {
        const { userId } = token;

        // Check if user is still pending (not approved) - extra safety check
        const user = await Meteor.users.findOneAsync({ _id: userId });
        if (user && user.profile?.registrationStatus === 'pending') {
          console.log(`Removing user ${userId} with expired approval token`);

          // Remove user from Meteor.users collection
          await Meteor.users.removeAsync({ _id: userId });
          cleanedUsersCount++;

          // Remove user's device details
          const deviceRemoveResult = await DeviceDetails.removeAsync({ userId });
          if (deviceRemoveResult) {
            cleanedDevicesCount++;
          }

          console.log(`Removed user ${userId} and associated device details`);
        }

        // Remove the expired token
        await ApprovalTokens.removeAsync({ _id: token._id });
        cleanedTokensCount++;
      }

      const result = {
        success: true,
        cleanedUsers: cleanedUsersCount,
        cleanedDevices: cleanedDevicesCount,
        cleanedTokens: cleanedTokensCount,
        message: `Cleanup completed: ${cleanedUsersCount} users, ${cleanedDevicesCount} device records, and ${cleanedTokensCount} tokens removed`
      };

      console.log(result.message);
      return result;

    } catch (error) {
      console.error('Error during expired approval cleanup:', error);
      throw new Meteor.Error('cleanup-failed', error.message);
    }
  },

  /**
   * Remove user completely (used for rejected users)
   * @param {String} userId - User ID to remove
   * @returns {Object} Removal result
   */
  'users.removeCompletely': async function(userId) {
    check(userId, String);
    
    console.log(`Completely removing user ${userId}`);
    
    try {
      // Remove user from Meteor.users collection
      const userRemoved = await Meteor.users.removeAsync({ _id: userId });
      
      // Remove user's device details
      const deviceRemoved = await DeviceDetails.removeAsync({ userId });
      
      // Remove any pending approval tokens
      const tokensRemoved = await ApprovalTokens.removeAsync({ userId });
      
      console.log(`User removal complete - User: ${userRemoved}, Devices: ${deviceRemoved}, Tokens: ${tokensRemoved}`);
      
      return {
        success: true,
        userRemoved: userRemoved > 0,
        deviceRemoved: deviceRemoved > 0,
        tokensRemoved: tokensRemoved > 0
      };
    } catch (error) {
      console.error(`Error removing user ${userId}:`, error);
      throw new Meteor.Error('user-removal-failed', error.message);
    }
  }
});



Meteor.startup(() => {
  // Configure SMTP from settings
  if (process.env.ENV === 'prod') {
    console.log("Running in production mode");
    process.env.MAIL_URL = process.env.MIE_SMTP_URL;
  } else if (process.env.ENV === 'dev') {
    console.log("Running in development mode");
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    if (!SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY is not set in environment variables");
      throw new Error("SENDGRID_API_KEY is required for email service");
    }
    // Configure SendGrid SMTP
    console.log("SENDGRID_API_KEY is set in environment variables");
    process.env.MAIL_URL = `smtp://apikey:${SENDGRID_API_KEY}@smtp.sendgrid.net:587`;
  } else {
    console.error("ENV variable must be set to either 'dev' or 'prod'");
    throw new Error("ENV variable is required. Please set ENV=dev or ENV=prod");
  }
  console.log("Email service configured");

  // Start background cleanup job for expired approval tokens
  // Run every 2 minutes to clean up expired tokens (tokens expire after 3 minutes)
  const cleanupInterval = 2 * 60 * 1000; // 2 minutes in milliseconds
  
  Meteor.setInterval(async () => {
    try {
      const result = await Meteor.callAsync('users.cleanupExpiredApprovals');
      if (result.cleanedUsers > 0) {
        console.log('Background cleanup completed:', result.message);
      }
    } catch (error) {
      console.error('Background cleanup failed:', error);
    }
  }, cleanupInterval);

  console.log(`Background cleanup job started - running every ${cleanupInterval / 1000} seconds`);
});
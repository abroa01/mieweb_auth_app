import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import { sendNotification } from "./firebase";
import { Accounts } from "meteor/accounts-base";
import "../imports/api/deviceLogs.js";
import { check } from "meteor/check";
import { DeviceLogs } from "../imports/api/deviceLogs.js";
import { NotificationHistory } from "../imports/api/notificationHistory";
import { Random } from "meteor/random";

// Create a Map to store pending notifications
const pendingNotifications = new Map();
const responsePromises = new Map();
const saveUserNotificationHistory = async (notification) => {
  const { appId, title, body } = notification;

  const deviceLog = await DeviceLogs.findOneAsync({ appId });
  if (!deviceLog) {
    console.error("No user found for appId:", appId);
    return;
  }

  const userId = deviceLog.userId;

  const data = {
    userId,
    appId,
    title,
    body,
  };

  Meteor.call("notificationHistory.insert", data, (error, result) => {
    if (error) {
      console.error("Error inserting notification:", error);
    } else {
      console.log("Notification inserted successfully:", result);
    }
  });
};

WebApp.connectHandlers.use("/send-notification", async (req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const requestBody = JSON.parse(body);
      console.log("Received request body:", requestBody);

      const { appId, title, body: messageBody, actions } = requestBody;

      if (!appId || !title || !messageBody || !actions) {
        throw new Error("Missing required fields");
      }

      // Get FCM token
      const fcmToken = await new Promise((resolve, reject) => {
        Meteor.call("deviceLogs.getFCMTokenByAppId", appId, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });

      // Send notification
      await sendNotification(fcmToken, title, messageBody, actions);
      console.log("Notification sent successfully");
      saveUserNotificationHistory({ appId, title, body: messageBody });

      // Create promise for user response
      const userResponsePromise = new Promise((resolve) => {
        // Store the FCM token as the appId since that's what we'll get back
        console.log("FCM tokennnnnnnnnnnnn", fcmToken);
        responsePromises.set(fcmToken, resolve);

        // Add timeout
        setTimeout(() => {
          if (responsePromises.has(fcmToken)) {
            resolve("timeout");
            responsePromises.delete(fcmToken);
          }
        }, 300000); // 5 minute timeout
      });

      // Wait for user response
      const userResponse = await userResponsePromise;
      console.log("USER RESPONSE", userResponse);

      // Send final response
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
  async "notifications.handleResponse"(appId, action) {
    check(appId, String);
    check(action, String);

    console.log(
      `Handling notification response for appId: ${appId}, action: ${action}`
    );
    console.log("Response promises", responsePromises);

    // If we have a pending promise for this notification, resolve it
    if (responsePromises.has(appId)) {
      const resolve = responsePromises.get(appId);
      resolve(action);
      responsePromises.delete(appId);
      return {
        success: true,
        message: `Response ${action} processed successfully`,
      };
    } else {
      console.log("No pending promise found for appId:", appId);
      return { success: false, message: "No pending notification found" };
    }
  },
  async 'users.loginWithBiometric'(secret) {
    check(secret, String);
    
    // Find the user with this biometric secret/app ID
    const user = await Meteor.users.findOneAsync({ 'profile.biometricSecret': secret });
    
    if (!user) {
      throw new Meteor.Error('not-found', 'User not found with these biometric credentials');
    }
    
    // Return necessary user information for the session
    return {
      _id: user._id,
      email: user.emails[0].address,
      username: user.username,
      // Add other fields you need for the session
    };
  },

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

  async "users.register"(userDetails) {
    check(userDetails, {
      username: String,
      email: String,
      pin: String,
      firstName: String,
      lastName: String,
      sessionDeviceInfo: {
        model: String,
        platform: String,
        uuid: String,
        version: String,
        manufacturer: String,
      },
      fcmDeviceToken: String,
    });

    const biometricSecret = Random.secret(32);
    const { email, username, pin, firstName, lastName, sessionDeviceInfo } = userDetails;
    const fcmToken = userDetails.fcmDeviceToken;

    // Check if user exists
    if (await Meteor.users.findOneAsync({ "emails.address": email })) {
      throw new Meteor.Error(
        "user-exists",
        "User already exists with this email"
      );
    }

    try {
      // Create user in Meteor users collection
      const userId = await Accounts.createUser({
        username,
        email,
        password: pin,
        profile: {
          firstName,
          biometricSecret,
          lastName,
          deviceInfo: sessionDeviceInfo,
          deviceToken: fcmToken,
        },
      });

      let generatedAppId = null;
      if (userId) {
        console.log(`user id in server is: ${userId}`);

        // Ensure userId is passed as a string
        generatedAppId = await Meteor.call('deviceLogs.upsert', {

          userId: userId.toString(),
          username,
          email,
          deviceUUID: sessionDeviceInfo.uuid,
          fcmToken,
          deviceInfo: sessionDeviceInfo,
          biometricSecret
        });
      }
      console.log(generatedAppId);
      const resAppId = generatedAppId || null;

      return {
        success: true,
        userId,
        resAppId,
        biometricSecret,
        message: 'Registration successful',
      };
    } catch (error) {
      console.error("Error during registration:", error);
      throw new Meteor.Error("registration-failed", error.message);
    }
  },

  async getUserDetails(email) {
    if (!email) {
      throw new Meteor.Error("Email is required");
    }

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

  async "users.checkRegistration"(fcmToken) {
    check(fcmToken, String);

    const user = Meteor.users.findOneAsync({ "profile.fcmToken": fcmToken });
    if (!user) {
      throw new Meteor.Error(
        "device-deregistered",
        "This device is deregistered. Please register again."
      );
    }
    return user._id;
  },

  async updateUserProfile({ firstName, lastName, email }) {
    check(firstName, String);
    check(lastName, String);
    check(email, String);

    console.log("Updating profile for user:", firstName, lastName, email);

    if (!this.userId) {
      throw new Meteor.Error(
        "not-authorized",
        "You must be logged in to update your profile"
      );
    }

    try {
      // Update the user's profile in the database
      Meteor.users.updateAsync(this.userId, {
        $set: {
          "profile.firstName": firstName,
          "profile.lastName": lastName,
          "emails.0.address": email,
        },
      });

      return { success: true, message: "Profile updated successfully" };
    } catch (error) {
      console.error("Error updating profile:", error);
      throw new Meteor.Error(
        "update-failed",
        "Failed to update profile",
        error
      );
    }
  },

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

    // Map token to the user
    Meteor.users.update(userId, {
      $set: {
        "profile.fcmToken": fcmToken,
      },
    });
  },
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
  'updateAppId': async function(username, appId) {
    try {
      const result = await HTTP.post("https://0ea8-50-221-78-186.ngrok-free.app/update-app-id", {
        data: {
          username: username,
          appId: appId
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return result.data;
    } catch (error) {
      throw new Meteor.Error('api-error', error.message);
    }
  },

});

Meteor.startup(() => {})


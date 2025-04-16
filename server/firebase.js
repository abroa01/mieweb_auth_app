import admin from 'firebase-admin';
import serviceAccount from '../server/private/miewebauthapp-ffab4fc33682.json';
import { Meteor } from 'meteor/meteor';
import { DeviceDetails } from '../utils/api/deviceDetails.js';
import { Email } from 'meteor/email';

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * Sends a push notification to a specific device
 * 
 * @param {string} fcmToken - The target device token
 * @param {string} title - The notification title
 * @param {string} body - The notification body
 * @param {Object} data - Additional data for the notification
 * @returns {string} Notification message ID
 */
export const sendNotification = async (fcmToken, title, body, data = {}) => {
  try {
    console.log("Sending notification to token:", fcmToken);
    console.log("Notification data:", { title, body, data });

    // Convert all data values to strings
    const stringifiedData = {};
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object') {
        stringifiedData[key] = JSON.stringify(value);
      } else {
        stringifiedData[key] = String(value);
      }
    });

    // Create base message object
    const message = {
      token: fcmToken,
      notification: {
        title,
        body
      },
      data: {
        ...stringifiedData,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "high_importance_channel"
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: title,
              body: body
            },
            sound: "default",
            badge: 1,
            'mutable-content': 1,
            'content-available': 1
          },
          // Add custom data for iOS
          notificationType: data.notificationType || 'approval',
          actions: data.actions || '[]',
          appId: data.appId || '',
          messageFrom: data.messageFrom || 'mie'
        },
        headers: {
          'apns-priority': '10'
        }
      }
    };

    // For dismissal/sync notifications, modify the payload
    if (data.isDismissal === 'true' || data.isSync === 'true') {
      message.android.notification.sound = null;
      message.apns.payload.aps.sound = null;
      message.apns.payload.aps['content-available'] = 1;
      message.apns.headers['apns-priority'] = '5';
    }

    console.log("Final message payload:", JSON.stringify(message, null, 2));
    const response = await admin.messaging().send(message);
    console.log("Successfully sent push notification:", response);
    return response;
  } catch (error) {
    console.error("Error sending push notification:", error);
    // Log more details about the error
    if (error.code === 'messaging/invalid-registration-token') {
      console.error("Invalid registration token - device may need to re-register");
    } else if (error.code === 'messaging/registration-token-not-registered') {
      console.error("Token not registered - device may need to re-register");
    }
    throw error;
  }
};

/**
 * Send admin approval email for first device registration
 * 
 * @param {Object} user - User details
 * @param {Object} device - Device details
 * @returns {boolean} Success status
 */
export const sendAdminApprovalEmail = (user, device) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const approvalUrl = `${process.env.APP_URL || 'https://yourapp.com'}/admin/approve-device/${user.userId}/${device.deviceUUID}`;
    const rejectUrl = `${process.env.APP_URL || 'https://yourapp.com'}/admin/reject-device/${user.userId}/${device.deviceUUID}`;
    
    Email.send({
      to: adminEmail,
      from: process.env.FROM_EMAIL || 'noreply@yourapp.com',
      subject: 'New User Device Registration Approval Required',
      html: `
        <h2>New User First Device Registration</h2>
        <p>A new user has registered their first device and requires approval:</p>
        <ul>
          <li><strong>User:</strong> ${user.firstName} ${user.lastName} (${user.email})</li>
          <li><strong>Username:</strong> ${user.username}</li>
          <li><strong>Device ID:</strong> ${device.deviceUUID}</li>
          <li><strong>Registration Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>
          <a href="${approvalUrl}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; margin-right: 10px;">Approve Device</a>
          <a href="${rejectUrl}" style="background-color: #f44336; color: white; padding: 10px 15px; text-decoration: none;">Reject Device</a>
        </p>
      `
    });
    
    console.log(`Admin approval email sent for user ${user.username}`);
    return true;
  } catch (error) {
    console.error('Error sending admin approval email:', error);
    return false;
  }
};

/**
 * Send device approval notification to user
 * 
 * @param {string} userId - User ID
 * @param {string} deviceUUID - Device UUID
 * @param {boolean} approved - Whether the device was approved or rejected
 * @returns {Promise<void>}
 */
export const sendDeviceApprovalNotification = async (userId, deviceUUID, approved) => {
  try {
    const userDoc = await DeviceDetails.findOneAsync({ userId });
    if (!userDoc) {
      throw new Error('User device details not found');
    }
    
    const device = userDoc.devices.find(d => d.deviceUUID === deviceUUID);
    if (!device) {
      throw new Error('Device not found');
    }
    
    const title = approved ? 'Device Approved' : 'Device Registration Rejected';
    const body = approved 
      ? 'Your device has been approved. You can now use the application.' 
      : 'Your device registration has been rejected. Please contact support for assistance.';
    
    await sendNotification(device.fcmToken, title, body, {
      notificationType: 'device_approval',
      status: approved ? 'approved' : 'rejected'
    });
    
    console.log(`Device approval notification sent to user ${userId} for device ${deviceUUID}`);
  } catch (error) {
    console.error('Error sending device approval notification:', error);
    throw error;
  }
};

/**
 * Send secondary device approval request to primary device
 * 
 * @param {string} userId - User ID
 * @param {string} primaryDeviceUUID - Primary device UUID
 * @param {Object} newDevice - New device details
 * @returns {Promise<void>}
 */
export const sendSecondaryDeviceApprovalRequest = async (userId, primaryDeviceUUID, newDevice) => {
  try {
    const userDoc = await DeviceDetails.findOneAsync({ userId });
    if (!userDoc) {
      throw new Error('User device details not found');
    }
    
    const primaryDevice = userDoc.devices.find(d => d.deviceUUID === primaryDeviceUUID);
    if (!primaryDevice) {
      throw new Error('Primary device not found');
    }
    
    const title = 'New Device Registration';
    const body = 'A new device is requesting access to your account. Please approve or reject.';
    
    await sendNotification(primaryDevice.fcmToken, title, body, {
      notificationType: 'secondary_device_approval',
      newDeviceUUID: newDevice.deviceUUID,
      userId: userId,
      actions: JSON.stringify([
        { id: 'approve', title: 'Approve' },
        { id: 'reject', title: 'Reject' }
      ])
    });
    
    console.log(`Secondary device approval request sent to primary device ${primaryDeviceUUID}`);
  } catch (error) {
    console.error('Error sending secondary device approval request:', error);
    throw error;
  }
};

export default admin;
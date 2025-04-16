import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { Random } from 'meteor/random';

export const NotificationHistory = new Mongo.Collection('notificationHistory');

// Create indexes for better query performance
if (Meteor.isServer) {
  Meteor.startup(() => {
    NotificationHistory.createIndex({ userId: 1 });
    NotificationHistory.createIndex({ appId: 1 });
    NotificationHistory.createIndex({ notificationId: 1 });
    NotificationHistory.createIndex({ status: 1 });
  });
}

Meteor.methods({
  // Insert a new notification into the history
  'notificationHistory.insert': function (data) {
    check(data, {
      userId: String,
      appId: String,
      title: String,
      body: String,
    });

    // Dynamically generate a unique notificationId
    const notificationId = Random.id();

    return NotificationHistory.insertAsync({
      userId: data.userId,
      appId: data.appId,
      notificationId: notificationId,
      title: data.title,
      body: data.body,
      status: 'pending',
      createdAt: new Date()
    });
  },

  // Update the status of a notification
  'notificationHistory.updateStatus': function (notificationId, status) {
    check(notificationId, String);
    check(status, String);

    if (!['pending', 'approved', 'rejected', 'timeout'].includes(status)) {
      throw new Meteor.Error('invalid-status', 'Status must be pending, approved, rejected, or timeout');
    }

    console.log(`Updating notification ${notificationId} status to ${status}`);

    // Update all notifications with the same notificationId
    return NotificationHistory.updateAsync(
      { notificationId },
      {
        $set: {
          status: status,
          updatedAt: new Date(),
        },
      },
      { multi: true } // Update all matching documents
    );
  },

  // Fetch the last notification ID for a specific user
  'notificationHistory.getLastIdByUser': function (userId) {
    check(userId, String);

    console.log(`Fetching last notification for user ${userId}`);
    return NotificationHistory.findOneAsync(
      { userId },
      { sort: { createdAt: -1 } }
    ).then((lastNotification) => {
      console.log("LAST NOTIFICATION:", lastNotification ? 
        `ID: ${lastNotification.notificationId}, Status: ${lastNotification.status}` : 
        "No notification found");
      return lastNotification ? lastNotification : null;
    }).catch((error) => {
      console.error("Error fetching last notification:", error);
      throw new Meteor.Error("database-error", "Failed to fetch last notification");
    });
  },

  // Fetch all notifications for a user
  'notificationHistory.getByUser': function (userId) {
    check(userId, String);
    console.log(`Fetching all notifications for user ${userId}`);
    
    // Return with newest notifications first
    return NotificationHistory.find(
      { userId }, 
      { 
        sort: { createdAt: -1 },
        limit: 50 // Limit to recent notifications for performance
      }
    ).fetch();
  },

  // Fetch notifications by their status
  'notificationHistory.getByStatus': function (status) {
    check(status, String);

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      throw new Meteor.Error('invalid-status', 'Status must be pending, accepted, or rejected');
    }

    return NotificationHistory.find({ status }).fetch();
  },

  // Check if a notification is already handled
  'notificationHistory.isHandled': async function (notificationId) {
    check(notificationId, String);
    
    const notification = await NotificationHistory.findOneAsync({ notificationId });
    if (!notification) {
      return false;
    }
    
    return notification.status !== 'pending';
  },
});

if (Meteor.isServer) {
  Meteor.publish('notificationHistory.byUser', function (userId) {
    check(userId, String);
    return NotificationHistory.find({ userId });
  });

  Meteor.publish('notificationHistory.byStatus', function (status) {
    check(status, String);
    return NotificationHistory.find({ status });
  });
}



import { useState, useEffect, useCallback } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Tracker } from 'meteor/tracker';

export const useNotificationHandler = (userId, username, fetchNotificationHistory) => {
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState(null); // 'approve' or 'reject'
  const [notificationIdForAction, setNotificationIdForAction] = useState(null);
  const [currentNotificationDetails, setCurrentNotificationDetails] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Function to fetch details of the *latest* pending notification
  const getLatestPendingNotification = useCallback(async () => {
    if (!userId) return null;
    try {
      const latestNotification = await Meteor.callAsync(
        "notificationHistory.getLastIdByUser",
        userId
      );
      if (latestNotification && latestNotification.status === 'pending') {
        return latestNotification;
      } else {
        console.log("No pending notification found or latest is not pending.");
        return null; // No pending notification or it's already handled
      }
    } catch (error) {
      console.error("Error getting latest notification:", error);
      return null;
    }
  }, [userId]);

  // Tracker for incoming notifications via Session
  useEffect(() => {
    if (!userId) return; // Don't start tracker without userId

    console.log("Initializing Notification Tracker for user:", userId);
    const tracker = Tracker.autorun(async () => {
      const newNotificationInfo = Session.get("notificationReceivedId");
      console.log("Tracker detected change in notificationReceivedId:", newNotificationInfo);

      if (!newNotificationInfo) return;

      // Handle Sync Notification (other device responded)
      if (newNotificationInfo.isSync === 'true' && newNotificationInfo.syncData) {
        try {
          const syncData = JSON.parse(newNotificationInfo.syncData);
          console.log("Processing sync notification:", syncData);
          if (syncData.notificationId && syncData.notificationId === notificationIdForAction) {
            console.log("Sync notification matches current action modal. Closing modal.");
            setIsActionsModalOpen(false); // Close modal if open for this ID
            setNotificationIdForAction(null);
            setCurrentNotificationDetails(null);
            // Optional: Show a brief message indicating action was taken elsewhere?
          }
          fetchNotificationHistory(); // Refresh history regardless
          Session.set("notificationReceivedId", null); // Clear the session variable
        } catch (error) {
          console.error("Error processing sync data:", error);
        }
        return; // Stop processing for sync
      }

      // Handle Dismissal Notification
      if (newNotificationInfo.isDismissal === 'true') {
        console.log("Processing dismissal notification.");
        if (notificationIdForAction) { // Check if a modal was potentially open
           setIsActionsModalOpen(false);
           setNotificationIdForAction(null);
           setCurrentNotificationDetails(null);
        }
        fetchNotificationHistory();
        Session.set("notificationReceivedId", null);
        return; // Stop processing for dismissal
      }

      // Handle Regular Incoming Notification
      try {
        const latestPending = await getLatestPendingNotification();
        if (latestPending) {
           console.log("Opening action modal for pending notification:", latestPending.notificationId);
           setCurrentNotificationDetails(latestPending);
           setNotificationIdForAction(latestPending.notificationId);
           setIsActionsModalOpen(true);
        } else {
           // If no pending notification found, ensure modal is closed
           console.log("No latest pending notification found. Ensuring modal is closed.");
           setIsActionsModalOpen(false);
           setNotificationIdForAction(null);
           setCurrentNotificationDetails(null);
        }
      } catch (error) {
        console.error("Error handling incoming notification:", error);
      }
      
      // Clear the session variable *after* processing
      Session.set("notificationReceivedId", null);
    });

    return () => {
      console.log("Stopping Notification Tracker for user:", userId);
      tracker.stop();
    };
  }, [userId, notificationIdForAction, getLatestPendingNotification, fetchNotificationHistory]); // Add dependencies

  // Function to send user action to server
  const sendUserAction = useCallback(async (action) => {
    if (!notificationIdForAction || !username) {
      console.error("Missing notification ID or username for action");
      return;
    }
    
    setIsProcessingAction(true);
    setActionError(null);
    setCurrentAction(action); // Set the current action being processed

    console.log(`Sending action '${action}' for notification ${notificationIdForAction} by user ${username}`);
    
    try {
      const result = await Meteor.callAsync(
        "notifications.handleResponse",
        username,
        action,
        notificationIdForAction // Pass the specific ID
      );
      console.log("Action response result:", result);
      setIsActionsModalOpen(false); 
      if (action === 'approve') {
          setIsResultModalOpen(true); // Show success modal only for approve
          setTimeout(() => setIsResultModalOpen(false), 3000); // Auto-close result modal
      }
      // fetchNotificationHistory(); // Let the sync notification handle the update ideally
    } catch (error) {
      console.error(`Error sending action ${action}:`, error);
      setActionError(`Failed to ${action}. Please try again.`);
      // Don't close modal on error, let user retry or dismiss
    } finally {
      setIsProcessingAction(false);
      // Clear action-specific state after processing, maybe keep notification details?
      // setNotificationIdForAction(null); 
      // setCurrentNotificationDetails(null);
    }
  }, [notificationIdForAction, username, fetchNotificationHistory]);

  const handleApprove = () => sendUserAction('approve');
  const handleReject = () => sendUserAction('reject');

  const handleCloseResultModal = () => setIsResultModalOpen(false);
  const handleCloseActionModal = () => {
    setIsActionsModalOpen(false);
    setNotificationIdForAction(null);
    setCurrentNotificationDetails(null);
    setActionError(null); // Clear error on manual close
  };

  return {
    isActionsModalOpen,
    isResultModalOpen,
    currentAction, // To show in ResultModal perhaps
    notificationDetails: currentNotificationDetails,
    isProcessingAction,
    actionError,
    handleApprove,
    handleReject,
    handleCloseResultModal,
    handleCloseActionModal
  };
};

// Note: Assumes the 'notifications.handleResponse' method expects notificationId as the third argument.
// You might need to adjust the server method signature:
/*
Meteor.methods({
  async "notifications.handleResponse"(username, action, notificationId) {
    check(username, String);
    check(action, String);
    check(notificationId, String);
    ...
    // Update the specific notification based on notificationId
    await NotificationHistory.updateAsync({ notificationId }, { $set: { status: action, ... } });
    ...
    // Send sync notification with the specific notificationId
    await sendSyncNotificationToDevices(username, notificationId, action);
    ...
  }
});
*/ 
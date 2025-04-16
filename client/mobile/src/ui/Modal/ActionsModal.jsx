import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const ActionsModal = ({ isOpen, onApprove, onReject, onClose, currentNotification, onTimeOut }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isStatusChecking, setIsStatusChecking] = useState(false);

  const calculateInitialTime = () => {
    if (!currentNotification?.createdAt) return 0;
    
    // Get timestamp in milliseconds from createdAt
    const createdAt = typeof currentNotification.createdAt === 'string'
      ? new Date(currentNotification.createdAt).getTime()
      : currentNotification.createdAt instanceof Date
        ? currentNotification.createdAt.getTime()
        : currentNotification.createdAt;
    
    const now = Date.now();
    const remainingTime = Math.floor((createdAt + 24000 - now) / 1000); // 24 seconds total
    return Math.max(0, remainingTime);
  };

  useEffect(() => {
    let timer;
    let statusCheckInterval;

    if (isOpen) {
      // Set initial time based on notification creation
      const initialTime = calculateInitialTime();
      
      if (initialTime <= 0) {
        onTimeOut();
        return;
      }

      setTimeLeft(initialTime);

      // Start countdown timer
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start status checking
      setIsStatusChecking(true);
      statusCheckInterval = setInterval(async () => {
        if (!currentNotification?.notificationId) return;

        try {
          const isHandled = await Meteor.callAsync(
            'notificationHistory.isHandled',
            currentNotification.notificationId
          );

          if (isHandled) {
            console.log('Notification already handled, closing modal');
            onClose();
          }
        } catch (error) {
          console.error('Error checking notification status:', error);
        }
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (statusCheckInterval) clearInterval(statusCheckInterval);
      setIsStatusChecking(false);
    };
  }, [isOpen, currentNotification]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Action Required
          </h2>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-gray-500" />
            <span className="text-gray-500">{timeLeft}s</span>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={onApprove}
            className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            <CheckCircle className="h-5 w-5" />
            <span>Approve</span>
          </button>

          <button
            onClick={onReject}
            className="w-full flex items-center justify-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            <XCircle className="h-5 w-5" />
            <span>Reject</span>
          </button>

          <button
            onClick={onClose}
            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionsModal;
import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { TIMEOUT_DURATION_MS } from '../../../../../utils/constants';

const ActionsModal = ({ isOpen, onApprove, onReject, onClose, onTimeOut, notification }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  const calculateInitialTime = () => {
    if (!notification?.createdAt) return 0;

    let createdAt = notification.createdAt;

    // Convert to number if it's a string
    if (typeof createdAt === 'string' || typeof createdAt === 'object') {
      createdAt = new Date(createdAt).getTime();
    } else if (typeof createdAt === 'number' && createdAt < 1e12) {
      // If it's a Unix timestamp in seconds, convert to milliseconds
      createdAt *= 1000;
    }

    const remainingTime = Math.max(0, Math.floor((createdAt + TIMEOUT_DURATION_MS - Date.now()) / 1000));

    return Math.max(0, remainingTime);
  };

  useEffect(() => {
    let timer;
    let statusCheckInterval;

    const checkStatus = async () => {
      if (!notification?.notificationId) return;
      try {
        const isHandled = await Meteor.callAsync(
          'notificationHistory.isHandled',
          notification.notificationId
        );
        if (isHandled) onClose();
      } catch (error) {
        console.error('Status check error:', error);
      }
    };

    if (isOpen && notification) {
      const initialTime = calculateInitialTime();
      console.log('Initial timer value:', initialTime);

      if (initialTime <= 0) {
        onTimeOut();
        return;
      }

      setTimeLeft(initialTime);

      // Countdown timer
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            onTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Status checking
      statusCheckInterval = setInterval(checkStatus, 2000);
    }

    return () => {
      clearInterval(timer);
      clearInterval(statusCheckInterval);
    };
  }, [isOpen, notification, onClose, onTimeOut]);

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
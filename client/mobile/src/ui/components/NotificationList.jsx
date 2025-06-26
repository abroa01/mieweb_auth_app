import React from 'react';
import {
  Clock,
  AlertTriangle, // For timeout or error
  Smartphone
} from 'lucide-react';
import { formatDateTime } from '../../../../../utils/utils.js'; // Adjust path


export const NotificationList = ({ notifications, isLoading, error }) => {

  if (isLoading) {
    return (
      <div className="text-center p-6 text-gray-500 dark:text-gray-400">
        <svg className="animate-spin h-6 w-6 text-blue-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <AlertTriangle size={24} className="mx-auto mb-2" />
        {error}
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg mx-2 ">
        No notification history found.
      </div>
    );
  }



  return (
    <div>
      {notifications.map((notification) => {
        console.log("Notification status", notification.status)
        return (
          <div
            key={notification._id}
            className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-2xl shadow-lg p-6 m-2"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {notification.title}
                </h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatDateTime(notification.createdAt)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Iphone 16
                  </p>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${notification.status === "approve"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : notification.status === "reject"
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }`}
              >
                {notification.status}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  );
}; 
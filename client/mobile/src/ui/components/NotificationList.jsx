import React from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle // For timeout or error
} from 'lucide-react';
import { formatDateTime } from '../../../../../utils/utils.js'; // Adjust path

const StatusIndicator = ({ status }) => {
  switch (status) {
    case 'approved':
      return <CheckCircle className="text-green-500" size={18} title="Approved" />;
    case 'rejected':
      return <XCircle className="text-red-500" size={18} title="Rejected" />;
    case 'pending':
      return <Clock className="text-yellow-500" size={18} title="Pending" />;
    case 'timeout':
      return <AlertTriangle className="text-orange-500" size={18} title="Timeout" />;
    default:
      return <Clock className="text-gray-500" size={18} title="Unknown" />;
  }
};

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
      <div className="text-center p-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        No notification history found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/12">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-3/12">
              Title
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-5/12">
              Body
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-3/12">
              Timestamp
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {notifications.map((notification) => (
            <tr key={notification._id || notification.notificationId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusIndicator status={notification.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                {notification.title}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                {notification.body}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {formatDateTime(notification.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 
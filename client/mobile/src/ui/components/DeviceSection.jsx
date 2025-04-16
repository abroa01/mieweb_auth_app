import React from 'react';
import { Smartphone } from 'lucide-react';
import { Session } from 'meteor/session'; // Needed to get initial device info

export const DeviceSection = () => {
  // Get device info directly from session for simplicity
  // Or could be passed as props if fetched elsewhere
  const capturedDeviceInfo = Session.get("capturedDeviceInfo") || {};
  const deviceInfo = {
    model: capturedDeviceInfo.model || "N/A",
    platform: capturedDeviceInfo.platform || "N/A",
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Device Information</h2>
      <div className="flex items-center space-x-3 mb-2">
        <Smartphone className="text-blue-500 dark:text-blue-400" size={20} />
        <span className="text-gray-700 dark:text-gray-300 font-medium">Model:</span>
        <span className="text-gray-600 dark:text-gray-400">{deviceInfo.model}</span>
      </div>
      <div className="flex items-center space-x-3">
        <Smartphone className="text-blue-500 dark:text-blue-400" size={20} />
        <span className="text-gray-700 dark:text-gray-300 font-medium">Platform:</span>
        <span className="text-gray-600 dark:text-gray-400">{deviceInfo.platform}</span>
      </div>
    </div>
  );
}; 
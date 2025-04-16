import React from 'react';
import {
  LogOut,
  Moon,
  Sun,
  RotateCcw,
  BellRing 
} from 'lucide-react';

export const DashboardHeader = ({ 
  title = "My Dashboard", 
  isDarkMode, 
  toggleDarkMode, 
  onRefresh, 
  onLogout 
}) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md p-4 mb-6 rounded-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2 text-xl font-semibold text-blue-600 dark:text-blue-400">
          <BellRing size={24} />
          <span>{title}</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            title="Refresh Notifications"
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={onLogout}
            title="Logout"
            className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}; 
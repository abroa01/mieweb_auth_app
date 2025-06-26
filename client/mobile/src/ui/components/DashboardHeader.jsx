import React from 'react';
import {
  LogOut,
  Moon,
  Sun,
  RotateCcw,
  BellRing,
  Shield,
} from 'lucide-react';

export const DashboardHeader = ({
  title = "My Dashboard",
  isDarkMode,
  toggleDarkMode,
  onRefresh,
  onLogout,
}) => {
  return (
    <header className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 shadow-lg sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {/* <BellRing className="h-5 w-5 text-blue-600 dark:text-blue-400" /> */}
              {title}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onRefresh}
              title="Refresh"
              className="flex items-center justify-center p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              aria-label="Refresh"
            >
              <RotateCcw className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={toggleDarkMode}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="flex items-center justify-center p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              aria-label="Toggle Night Mode"
            >
              {isDarkMode ? (
                <Sun className="h-6 w-6 text-yellow-400" />
              ) : (
                <Moon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <button
              onClick={onLogout}
              title="Logout"
              className="flex items-center space-x-2 px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { Search, Filter } from 'lucide-react';

export const NotificationFilters = ({ 
  filter,
  searchTerm,
  onFilterChange,
  onSearchChange 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 mb-4 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 sm:space-x-4">
      {/* Search Input */}
      <div className="relative w-full sm:w-1/2 lg:w-1/3">
        <input
          type="text"
          placeholder="Search notifications..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 ease-in-out"
        />
        <Search 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" 
          size={18} 
        />
      </div>

      {/* Filter Select */}
      <div className="relative w-full sm:w-auto">
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="w-full sm:w-auto appearance-none pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 ease-in-out"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="timeout">Timeout</option> 
        </select>
        <Filter 
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" 
          size={18} 
        />
      </div>
    </div>
  );
}; 
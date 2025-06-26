import React from 'react';
import { Search, Filter } from 'lucide-react';

export const NotificationFilters = ({
  filter,
  searchTerm,
  onFilterChange,
  onSearchChange
}) => {
  return (

    <div className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-2xl shadow-lg p-4 m-2">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              className="w-full pl-10 pr-4 py-2 text-gray-400 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            className="bg-transparent text-gray-400 border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approve">Approved</option>
            <option value="reject">Rejected</option>
          </select>
        </div>
      </div>
    </div>
  );
}; 
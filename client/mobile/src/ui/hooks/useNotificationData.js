import { useState, useEffect, useMemo, useCallback } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
const PAGE_SIZE = 5;

export const useNotificationData = (userId) => {
  const [allNotifications, setAllNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // e.g., 'all', 'pending', 'approved', 'rejected'
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotificationHistory = useCallback(async () => {
    if (!userId) return;
    console.log("Fetching notification history for user:", userId);
    setIsLoading(true);
    setError(null);
    try {
      const response = await Meteor.callAsync(
        "notificationHistory.getByUser",
        userId
      );
      setAllNotifications(response || []);
    } catch (err) {
      console.error("Error fetching notification history:", err);
      setError("Failed to load notification history.");
      setAllNotifications([]); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchNotificationHistory();
    const refreshInterval = setInterval(fetchNotificationHistory, 30000); // Refresh every 30s
    return () => clearInterval(refreshInterval);
  }, [fetchNotificationHistory]);

  const filteredNotifications = useMemo(() => {
    return allNotifications
      .filter(notification => {
        // Filter by status
        if (filter !== 'all' && notification.status !== filter) {
          return false;
        }
        // Filter by search term (case-insensitive)
        if (searchTerm) {
          const lowerSearchTerm = searchTerm.toLowerCase();
          const matchesTitle = notification.title?.toLowerCase().includes(lowerSearchTerm);
          const matchesBody = notification.body?.toLowerCase().includes(lowerSearchTerm);
          if (!matchesTitle && !matchesBody) {
            return false;
          }
        }
        return true;
      });
  }, [allNotifications, filter, searchTerm]);

  // Pagination logic
  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredNotifications.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredNotifications, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredNotifications.length / PAGE_SIZE);
  }, [filteredNotifications.length]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleSearchChange = (newSearchTerm) => {
    setSearchTerm(newSearchTerm);
    setCurrentPage(1); // Reset to first page on search change
  };

  return {
    notifications: paginatedNotifications,
    isLoading,
    error,
    filter,
    searchTerm,
    currentPage,
    totalPages,
    fetchNotificationHistory, // Expose refetch function
    handleFilterChange,
    handleSearchChange,
    handlePageChange
  };
}; 
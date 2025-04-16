import React from 'react';
import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';

// Import Hooks
import { useDarkMode } from './hooks/useDarkMode';
import { useUserProfile } from './hooks/useUserProfile';
import { useNotificationData } from './hooks/useNotificationData';
import { useNotificationHandler } from './hooks/useNotificationHandler';

// Import Components
import { DashboardHeader } from './components/DashboardHeader';
import { ProfileSection } from './components/ProfileSection';
import { DeviceSection } from './components/DeviceSection';
import { NotificationFilters } from './components/NotificationFilters';
import { NotificationList } from './components/NotificationList';
import Pagination from './Pagination/Pagination'; // Keep existing pagination
import ActionsModal from './Modal/ActionsModal';    // Keep existing modals
import ResultModal from './Modal/ResultModal';      // Keep existing modals

export const LandingPage = () => {
  // Get initial user info from Session (needed by hooks)
  const userProfileData = Session.get("userProfile") || {};
  const userId = userProfileData._id;
  const username = userProfileData.username; // Needed for sending actions

  // Use Custom Hooks
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { 
    profile,
    isEditing,
    isSaving,
    successMessage,
    errorMessage,
    handleProfileChange,
    handleProfileUpdate,
    toggleEdit,
    setSuccessMessage
  } = useUserProfile(); // Hook now fetches profile based on userId from Session

  const { 
    notifications,
    isLoading: isLoadingHistory,
    error: historyError,
    filter,
    searchTerm,
    currentPage,
    totalPages,
    fetchNotificationHistory, // Get refetch function
    handleFilterChange,
    handleSearchChange,
    handlePageChange
  } = useNotificationData(userId);

  const { 
    isActionsModalOpen,
    isResultModalOpen,
    currentAction,
    notificationDetails,
    isProcessingAction,
    actionError,
    handleApprove,
    handleReject,
    handleCloseResultModal,
    handleCloseActionModal
  } = useNotificationHandler(userId, username, fetchNotificationHistory); // Pass refetch

  // Logout Function
  const handleLogout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error("Logout failed:", err);
        // Show an error message to the user
      } else {
        console.log("User logged out");
        Session.clear(); // Clear session data on logout
        // Redirect to login or home page handled by App.jsx logic typically
        // window.location.href = '/'; // Or use react-router navigation
      }
    });
  };

  return (
    <div className={`min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-100 dark:bg-gray-900`}>
      <DashboardHeader
        title="Notification Dashboard"
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        onRefresh={fetchNotificationHistory} // Use refetch from hook
        onLogout={handleLogout}
      />

      <div className="container mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Profile & Device) */}
        <div className="lg:col-span-1 space-y-6">
          <ProfileSection 
            profile={profile}
            isEditing={isEditing}
            isSaving={isSaving}
            successMessage={successMessage}
            errorMessage={errorMessage} // Pass error message from hook
            handleProfileChange={handleProfileChange}
            handleProfileUpdate={handleProfileUpdate}
            toggleEdit={toggleEdit}
            setSuccessMessage={setSuccessMessage} // Pass setter for toaster
          />
          <DeviceSection />
        </div>

        {/* Right Column (Notifications) */}
        <div className="lg:col-span-2 space-y-6">
          <div>
             <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Notification History</h2>
             <NotificationFilters 
               filter={filter}
               searchTerm={searchTerm}
               onFilterChange={handleFilterChange}
               onSearchChange={handleSearchChange}
             />
             <NotificationList 
               notifications={notifications}
               isLoading={isLoadingHistory}
               error={historyError}
             />
             {totalPages > 1 && (
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ActionsModal
        isOpen={isActionsModalOpen}
        onClose={handleCloseActionModal}
        onApprove={handleApprove}
        onReject={handleReject}
        notification={notificationDetails} // Pass details from hook
        isLoading={isProcessingAction}
        error={actionError}
      />
      <ResultModal
        isOpen={isResultModalOpen}
        onClose={handleCloseResultModal}
        action={currentAction} // Pass current action from hook
      />
    </div>
  );
};

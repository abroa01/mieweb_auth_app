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
import { NotificationFilters } from './components/NotificationFilters';
import { NotificationList } from './components/NotificationList';
import Pagination from './Pagination/Pagination'; // Keep existing pagination
import ActionsModal from './Modal/ActionsModal';    // Keep existing modals
import ResultModal from './Modal/ResultModal';      // Keep existing modals
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router';

export const LandingPage = () => {
  // Get initial user info from Session (needed by hooks)
  const userProfileData = Session.get("userProfile") || {};
  const userId = userProfileData._id;
  const username = userProfileData.username; // Needed for sending actions

  const navigate = useNavigate()

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

  const handleTimeout = async () => {
    handleCloseActionModal()
    console.log("timeout")
  };

  // Logout Function
  const handleLogout = () => {
    Meteor.logout((err) => {
      if (err) {
        console.error("Logout failed:", err);
        // Show an error message to the user
      } else {
        navigate('/login');
        console.log("User logged out");
      }
    });
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-gray-900 dark:to-gray-800`}>
      <DashboardHeader
        title="MieAuth"
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        onRefresh={fetchNotificationHistory} // Use refetch from hook
        onLogout={handleLogout}
      />

      <main className='max-w-7xl mx-auto px-4 py-6'>


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
          </div>

          {/* Right Column (Notifications) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-2 mx-2">
              <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                History
              </h2>
            </div>
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

      </main>

      {/* Modals */}
      <ActionsModal
        isOpen={isActionsModalOpen}
        onClose={handleCloseActionModal}
        onApprove={handleApprove}
        onReject={handleReject}
        notification={notificationDetails} // Pass details from hook
        isLoading={isProcessingAction}
        error={actionError}
        onTimeOut={handleTimeout}
      />
      <ResultModal
        isOpen={isResultModalOpen}
        onClose={handleCloseResultModal}
        action={currentAction} // Pass current action from hook
      />
    </div>
  );
};

import React, { useState } from 'react';
import { User, Mail, Edit } from 'lucide-react';
import SuccessToaster from '../Toasters/SuccessToaster';

export const ProfileSection = ({
  isSaving,
  successMessage,
  errorMessage,
  handleProfileUpdate,
  setSuccessMessage
}) => {
  const capturedDeviceInfo = Session.get("capturedDeviceInfo") || {};
  const deviceInfo = {
    model: capturedDeviceInfo.model || "N/A",
    platform: capturedDeviceInfo.platform || "N/A",
  };

  const userProfile = Session.get("userProfile") || {};
  const [profile, setProfile] = useState({
    firstName: userProfile.firstname || "User",
    lastName: userProfile.lastname || userProfile.username,
    email: userProfile.email || "",
  });
  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (field) => (e) => {
    setProfile({ ...profile, [field]: e.target.value });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setProfile({
      firstName: userProfile.firstname || "User",
      lastName: userProfile.lastname || userProfile.username,
      email: userProfile.email || "",
    });
  };

  const renderProfileSection = () => (
    <div className="flex-1">
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={profile.firstName}
            onChange={handleChange('firstName')}
            className="w-full px-2 py-1 rounded border dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
            placeholder="First Name"
          />
          <input
            type="text"
            value={profile.lastName}
            onChange={handleChange('lastName')}
            className="w-full px-2 py-1 rounded border dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
            placeholder="Last Name"
          />
          <div className="flex space-x-2 mt-2">
            <button
              onClick={() => {
                handleProfileUpdate(profile);
                setIsEditing(false);
              }}
              disabled={isSaving}
              className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center justify-between">
          {`${profile.firstName} ${profile.lastName}`}
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <Edit className="h-4 w-4 text-gray-500" />
          </button>
        </h2>
      )}
      <p className="text-gray-600 dark:text-gray-300 flex items-center">
        <Mail className="h-4 w-4 mr-2" />
        {profile.email}
      </p>
    </div>
  );

  return (
    <div className="lg:col-span-1">
      <div className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 rounded-2xl shadow-lg p-6">
        <SuccessToaster
          message={successMessage}
          onClose={() => setSuccessMessage("")}
        />
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          {renderProfileSection()}
        </div>

        <div className="space-y-4">
          <div className="border-t dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Device Information
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Model</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {deviceInfo.model}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Platform</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {deviceInfo.platform}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Activity Summary
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between dark:text-gray-300">
                <span className="text-gray-600 dark:text-gray-300">Today's Activity</span>
                <span>3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

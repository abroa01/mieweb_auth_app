import React from 'react';
import {
  User,
  Mail,
  Edit,
  Save, // Assuming you have a Save icon, otherwise use Check or similar
  X // For cancel
} from 'lucide-react';
import SuccessToaster from '../Toasters/SuccessToaster'; // Adjust path

const ProfileField = ({ icon: Icon, label, value, name, isEditing, onChange }) => (
  <div className="flex items-center space-x-3 mb-3">
    <Icon className="text-blue-500 dark:text-blue-400" size={20} />
    {isEditing ? (
      <input
        type={name === 'email' ? 'email' : 'text'}
        name={name}
        value={value}
        onChange={onChange}
        disabled={name === 'email'} // Keep email non-editable for now
        className="flex-grow px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 ease-in-out"
        aria-label={label}
      />
    ) : (
      <span className="text-gray-700 dark:text-gray-300">{value || '-'}</span>
    )}
  </div>
);

export const ProfileSection = ({ 
  profile,
  isEditing,
  isSaving,
  successMessage,
  errorMessage,
  handleProfileChange,
  handleProfileUpdate,
  toggleEdit,
  setSuccessMessage // Receive setter to dismiss toaster
}) => {

  const handleCancel = () => {
    // Optionally reset changes here if needed, or let the hook handle it
    toggleEdit(); 
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">User Profile</h2>
        {!isEditing && (
          <button
            onClick={toggleEdit}
            className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            <Edit size={16} className="mr-1" /> Edit
          </button>
        )}
      </div>

      <ProfileField 
        icon={User} 
        label="First Name" 
        name="firstName" 
        value={profile.firstName} 
        isEditing={isEditing} 
        onChange={handleProfileChange} 
      />
      <ProfileField 
        icon={User} 
        label="Last Name" 
        name="lastName" 
        value={profile.lastName} 
        isEditing={isEditing} 
        onChange={handleProfileChange} 
      />
      <ProfileField 
        icon={Mail} 
        label="Email" 
        name="email" 
        value={profile.email} 
        isEditing={isEditing} 
        onChange={handleProfileChange} 
      />

      {isEditing && (
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
          >
            <X size={16} className="inline mr-1"/> Cancel
          </button>
          <button
            onClick={handleProfileUpdate}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <><Save size={16} className="inline mr-1" /> Save Changes</>
            )}
          </button>
        </div>
      )}

      {/* Toasters for feedback */}      
      <SuccessToaster 
        message={successMessage} 
        onClose={() => setSuccessMessage('')} 
      />
      {/* Assuming ErrorToaster exists and takes similar props */}
      {errorMessage && (
        <ErrorToaster 
          message={errorMessage} 
          onClose={() => { /* Clear error message via hook if needed */ }} 
        />
      )}
    </div>
  );
}; 
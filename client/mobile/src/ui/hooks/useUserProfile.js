import { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { DeviceDetails } from '../../../../../utils/api/deviceDetails';



export const useUserProfile = () => {
  const initialProfile = Session.get("userProfile") || {};
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: initialProfile.email || "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch user details on mount
  useEffect(() => {
    let isMounted = true;

    const fetchUserDetails = async () => {
      if (!initialProfile._id) return;
      try {
        const userDoc = await DeviceDetails.findOneAsync({ userId: initialProfile._id });
        if (isMounted && userDoc) {
          setProfile({
            firstName: userDoc.firstName || "",
            lastName: userDoc.lastName || "",
            email: userDoc.email || "",
          });
        } else if (isMounted) {
          console.log('User document not found for ID:', initialProfile._id);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching user details:", error);
          setErrorMessage("Failed to fetch profile.");
        }
      }
    };

    fetchUserDetails();
    
    return () => {
      isMounted = false;
    };
  }, [initialProfile._id]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async () => {
    if (!initialProfile._id) return;
    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      await Meteor.callAsync("user.updateProfile", initialProfile._id, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        // Maybe email updates should be handled differently?
        // email: profile.email,
      });
      setSuccessMessage("Profile updated successfully!");
      setIsEditing(false);
      // Optionally re-fetch profile or update Session
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMessage("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
      // Auto-dismiss success message
      if (successMessage) {
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    }
  };

  const toggleEdit = () => setIsEditing(prev => !prev);

  return {
    profile,
    isEditing,
    isSaving,
    successMessage,
    errorMessage,
    handleProfileChange,
    handleProfileUpdate,
    toggleEdit,
    setSuccessMessage // Expose setter if needed externally (e.g., for Toaster)
  };
};

// Note: Assumes a Meteor method 'user.updateProfile' exists on the server.
// You might need to create this method in your server-side code.
// Example server-side method (place in imports/api or server/main.js):
/*
Meteor.methods({
  'user.updateProfile': async function(userId, profileData) {
    check(userId, String);
    check(profileData, {
      firstName: String,
      lastName: String,
      // email: Match.Optional(String) // Handle email updates carefully
    });

    // Add validation/permission checks here if needed
    if (!this.userId || this.userId !== userId) {
      throw new Meteor.Error('not-authorized', 'You are not authorized to update this profile.');
    }

    try {
      const result = await DeviceDetails.updateAsync(
        { userId: userId }, 
        { $set: { 
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            // email: profileData.email, // Be cautious about updating email directly
            lastUpdated: new Date()
          }
        }
      );
      return result > 0;
    } catch (error) {
      console.error("Error in user.updateProfile method:", error);
      throw new Meteor.Error('update-failed', 'Could not update profile.');
    }
  }
});
*/ 
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import BiometricRegistrationModal from './Modal/BiometricRegistrationModal';
import { Random } from 'meteor/random';

export const RegistrationPage = ({ deviceDetails }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    pin: ''
  });
  const [loading, setLoading] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);
  const [error, setError] = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [showPendingScreen, setShowPendingScreen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('### Log Step 4 : RegistrationPage mounted');
    return () => console.log('### Log: RegistrationPage unmounted');
  }, []);

  const inputFields = useMemo(() => [
    { name: 'email', icon: FiMail, type: 'email', placeholder: 'Enter your email' },
    { name: 'username', icon: FiUser, type: 'text', placeholder: 'Enter your username' },
    { name: 'firstName', icon: FiUser, type: 'text', placeholder: 'First Name' },
    { name: 'lastName', icon: FiUser, type: 'text', placeholder: 'Last Name' },
    { 
      name: 'pin', 
      icon: FiLock, 
      type: 'password', 
      placeholder: 'Create a PIN (4-6 digits)',
      minLength: "4",
      maxLength: "6",
      pattern: "[0-9]*",
      inputMode: "numeric"
    }
  ], []);

 const handleSubmit = async (e) => {
  e.preventDefault();
  console.log('### Log Step 4.1 : Form submission initiated');
  
  if (loading) return;

  setError(null);
  setLoading(true);

  try {
    const sessionDeviceInfo = Session.get('capturedDeviceInfo');
    const fcmDeviceToken = Session.get('deviceToken');
    console.log('### Log Step 4.2: Session data:', JSON.stringify({
      sessionDeviceInfo,
      fcmDeviceToken
    }));

    if (!sessionDeviceInfo?.uuid || !fcmDeviceToken) {
      throw new Error('Device information or FCM token not available');
    }

    if (sessionDeviceInfo.uuid !== deviceDetails) {
      throw new Error('Device UUID mismatch');
    }

    const biometricSecret = Random.secret(32);
    console.log('### Log Step 4.3: Generated biometric secret');

    console.log('### Log Step 4.4: Calling users.register method...');
    const registerUser = await Meteor.callAsync('users.register', {
      ...formData,
      sessionDeviceInfo,
      fcmDeviceToken,
      biometricSecret
    });

    console.log('### Log Step 4.5: Registration response:', JSON.stringify(registerUser));

    // Handle secondary device approval flow
    if (registerUser?.userAction && registerUser.isSecondaryDevice) {
      console.log('### Log Step 4.5.1: Secondary device registration, userAction:', registerUser.userAction);

      if (registerUser.userAction === 'approve') {
        // Approved by primary device - proceed biometric modal or app flow
        const userPayload = {
          userId: registerUser.userId,
          email: formData.email,
          username: formData.username,
          biometricSecret,
          isFirstDevice: false,
          registrationStatus: 'approved'
        };
        setRegisteredUser(userPayload);

        setTimeout(() => {
          console.log('### Opening biometric modal for secondary device after approval');
          setShowBiometricModal(true);
        }, 0);

      } else if (registerUser.userAction === 'reject') {
        setError('Your secondary device registration was rejected by the primary device.');
      } else if (registerUser.userAction === 'timeout') {
        setError('Secondary device approval request timed out. Please try again later.');
      }
      // Stop further flow here
      return;
    }

    // Handle first device / regular flow
    if (registerUser?.userId) {
      console.log('### Log Step 4.6: Registration successful');

      const userPayload = {
        userId: registerUser.userId,
        email: formData.email,
        username: formData.username,
        biometricSecret,
        isFirstDevice: registerUser.isFirstDevice,
        registrationStatus: registerUser.registrationStatus
      };

      setRegisteredUser(userPayload);

      // Open biometric modal immediately after successful registration
      setTimeout(() => {
        console.log('### Opening biometric modal for first device');
        setShowBiometricModal(true);
      }, 0);

    } else if (registerUser?.registrationStatus) {
      const regStatus = registerUser.registrationStatus;

      if (regStatus === 'pending') {
        console.log('### Log Step 4.8: First device registration pending approval');
        setRegistrationStatus('pending');
        setShowPendingScreen(true);

      } else if (regStatus === 'approved') {
        console.log('### Log Step 4.9: Registration fully completed, redirecting to login');
        navigate('/login');

      } else if (regStatus === 'rejected') {
        console.log('### Log Step 4.10: Registration rejected, redirecting to rejection screen or showing error');
        setError('Your registration has been rejected. Please contact support.');
        // Optionally navigate('/rejectedRegistration');

      } else {
        // Fallback if user data is missing or unknown status
        console.log('### Log Step 4.11: Unknown registration status, redirecting to login');
        navigate('/login');
      }
    } else {
      // Fallback if no userId or registrationStatus at all
      console.log('### Log Step 4.12: No valid user data found after registration, redirecting to login');
      navigate('/login');
    }

  } catch (err) {
    console.error('### Log Step ERROR:', err);
    setError(err.reason || err.message || 'Registration failed');
  } finally {
    setLoading(false);
  }
};




  const handleBiometricComplete = useCallback((wasSuccessful) => {
  console.log('### Log Step 4.7: Biometric completion:', wasSuccessful);
  setShowBiometricModal(false);
 
    //Now check registration status after biometric handling is done
  if (registeredUser) {
    if (registeredUser.isFirstDevice && registeredUser.registrationStatus === 'pending') {
      console.log('### Log Step 4.8: First device registration pending approval');
        setRegistrationStatus('pending');
        setShowPendingScreen(true);
      } else {
        console.log('### Log Step 4.9: Registration fully completed, redirecting to login');
        navigate('/login');
      }
    } else {
      // Fallback if user data is missing
      console.log('### Log Step 4.10: No user data found, redirecting to login');
      navigate('/login');
    }
  }, [navigate, registeredUser]);

  const goToLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  // If showing the pending screen
  if (showPendingScreen) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col items-center justify-center p-4"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg"
        >
          <div className="text-center space-y-4">
            <motion.h2 
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="text-3xl font-bold text-gray-900"
            >
              Registration Pending
            </motion.h2>
            <div className="flex justify-center">
              <div className="animate-pulse w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <FiUser className="text-3xl text-blue-500" />
              </div>
            </div>
            <p className="text-gray-600">
              Since this is your first device registered with us, your account needs to be approved by an administrator.
            </p>
            <p className="text-gray-600">
              You will receive a notification once your registration has been processed.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={goToLogin}
            className="w-full py-3 px-4 rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-colors"
          >
            Back to Login
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  // Regular registration form
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg"
      >
        <div className="text-center space-y-2">
          <motion.h2 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-3xl font-bold text-gray-900"
          >
            Create Account
          </motion.h2>
          <p className="text-gray-600">Join our community today</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inputFields.map((field, index) => (
              <motion.div
                key={field.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={field.name === 'email' ? 'md:col-span-2' : ''}
              >
                <label className="text-sm font-medium text-gray-700">
                  {field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                </label>
                <div className="mt-1 relative">
                  <field.icon className="absolute top-3 left-3 text-gray-400" />
                  <input
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    required
                    value={formData[field.name]}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      [e.target.name]: e.target.value
                    }))}
                    className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    pattern={field.pattern}
                    inputMode={field.inputMode}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </motion.button>
        </form>
      </motion.div>

      {showBiometricModal && (
        <BiometricRegistrationModal
          key={Date.now()}
          isOpen={showBiometricModal}
          onClose={() => setShowBiometricModal(false)}
          userData={registeredUser}
          onComplete={handleBiometricComplete}
        />
      )}
    </motion.div>
  );
};
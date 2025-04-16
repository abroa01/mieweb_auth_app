import React, { useState, useEffect } from 'react';
import { Fingerprint as FingerprintIcon, XCircle, CheckCircle } from 'lucide-react';

const BiometricRegistrationModal = ({ isOpen, onClose, userData, onComplete }) => {
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && userData?.biometricSecret) {
      console.log('### Starting biometric registration');
      registerBiometrics();
    }
  }, [isOpen, userData]);

  const registerBiometrics = () => {
    console.log('Starting biometric registration with:', userData);
    
    if (!window.Fingerprint) {
      console.error('Fingerprint plugin not available');
      handleError('Biometric authentication not supported');
      return;
    }

    if (!userData?.biometricSecret) {
      handleError('Missing biometric configuration');
      return;
    }

    window.Fingerprint.registerBiometricSecret({
      description: "Secure login for your account",
      secret: userData.biometricSecret,
      invalidateOnEnrollment: true,
      disableBackup: true,
    }, 
    () => handleSuccess(),
    (error) => handleError(error.message));
  };

  const handleSuccess = () => {
    console.log('Biometric registration successful');
    setStatus('success');
    localStorage.setItem('biometricsEnabled', 'true');
    console.log("userData", userData, userData?.biometricSecret)
    localStorage.setItem('biometricUserId', userData?.biometricSecret);
    setTimeout(() => {
      onClose();
      onComplete(true);
    }, 2000);
  };

  const handleError = (message = 'Unknown error') => {
    console.error('Biometric error:', message);
    setStatus('error');
    setErrorMessage(message);
  };

  const handleRetry = () => {
    console.log('Retrying biometric registration');
    setStatus('processing');
    registerBiometrics();
  };

  const handleSkip = () => {
    console.log('Skipping biometric registration');
    onClose();
    onComplete(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-6 text-center">
        {status === 'processing' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 flex items-center justify-center bg-blue-100 rounded-full animate-pulse">
                <FingerprintIcon className="h-10 w-10 text-blue-500" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Register Biometrics
            </h2>
            <p className="text-gray-600">
              Follow your device's prompts to complete setup
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 flex items-center justify-center bg-green-100 rounded-full">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Biometric Login Enabled
            </h2>
            <p className="text-gray-600">
              You can now log in using your biometrics
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 flex items-center justify-center bg-red-100 rounded-full">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Registration Failed
            </h2>
            <p className="text-gray-600 mb-4">
              {errorMessage || 'Unable to register biometrics'}
            </p>
            <button
              className="w-full py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
              onClick={handleRetry}
            >
              Try Again
            </button>
            <button
              className="w-full py-2 mt-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              onClick={handleSkip}
            >
              Skip for Now
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BiometricRegistrationModal;
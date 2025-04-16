import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Fingerprint as FingerprintIcon } from 'lucide-react';

export const LoginPage = ({ deviceDetails }) => {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const navigate = useNavigate();
  const isBiometricAvailable = true;
  console.log(`biometrics in login page ${isBiometricAvailable}`);

  useEffect(() => {
    // Check for device details on component mount
    if (!deviceDetails) {
      console.warn('No device details available');
    }

    // Check for Meteor connection
    const connectionCheck = setInterval(() => {
      if (!Meteor.status().connected) {
        setError('Connection to server lost. Attempting to reconnect...');
      } else if (error.includes('Connection to server lost')) {
        setError('');
      }
    }, 3000);

    return () => clearInterval(connectionCheck);
  }, [deviceDetails, error]);

  // Function to check registration status
  const checkRegistrationStatus = async (userId, emailAddress) => {
    setCheckingStatus(true);
    
    try {
      console.log('### Log: Checking registration status for user');
      const result = await Meteor.callAsync('users.checkRegistrationStatus', {
        userId,
        email: emailAddress
      });
      
      console.log('### Log: Registration status result:', result);
      
      if (!result || !result.status) {
        throw new Error('Failed to retrieve registration status');
      }
      
      console.log(result)
      if (result.status !== 'approved') {
        console.log('### Log: User registration is pending approval');
        setError('Your account is pending approval by an administrator.');
        navigate('/pending-registration');
        return false;
      }
      
      console.log('### Log: User registration is approved');
      return true;
    } catch (err) {
      console.error('### Log ERROR: Registration status check failed', err);
      setError(err.reason || err.message || 'Failed to verify account status');
      return false;
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validate device details
    if (!deviceDetails) {
      setError('Device information not available. Please refresh the page.');
      return;
    }

    // Validate connection
    if (!Meteor.status().connected) {
      setError('Unable to connect to server. Please check your connection.');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      // First attempt login to get user credentials
      let userId;
      try {
        await new Promise((resolve, reject) => {
          Meteor.loginWithPassword(email, pin, (err) => {
            if (err) {
              console.error('Login Error:', err);
              reject(err);
            } else {
              userId = Meteor.userId();
              resolve();
            }
          });
        });
      } catch (err) {
        setError(err.reason || 'Login failed. Please try again.');
        setIsLoggingIn(false);
        return;
      }
      
      // Now check registration status
      const isApproved = await checkRegistrationStatus(userId, email);
      
      if (isApproved) {
        // Set user profile in session and proceed to dashboard
        Session.set('userProfile', {
          email: email,
          _id: userId
        });
        
        navigate('/dashboard');
      } else {
        // If not approved, logout the user since we don't want them to remain logged in
        Meteor.logout();
      }
    } catch (err) {
      console.error('### Log ERROR during login flow:', err);
      setError(err.reason || err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const handleBiometricLogin = async () => {
    console.log("handle with biometric")
    const biometricUserId = localStorage.getItem('biometricUserId'); 
    console.log("biometric id", biometricUserId)
    if (!biometricUserId) {
      console.log("no biometric")
      setError('No biometric credentials found. Please register first.');
      navigate('/biometricModal');
      return;
    }

    console.log("yes biopmrtri")
    
    setIsLoggingIn(true);
    setError('');
    
    try {
      console.log("inside try")
      if (Fingerprint) {
        console.log("fingerprint")

        await new Promise((resolve, reject) => {
          Fingerprint.loadBiometricSecret(
            {
              description: 'Scan your fingerprint to login',
              disableBackup: true,
            },
            async () => {
              try {
                // Use the retrieved secret to login
                const result = await Meteor.callAsync('users.loginWithBiometric', biometricUserId);
                
                if (!result || !result._id) {
                  throw new Error('Biometric authentication failed');
                }
                
                // Check registration status
                const isApproved = await checkRegistrationStatus(result._id, result.email);

                console.log("is approved", isApproved)
                
                if (isApproved) {
                  // Set user profile in session
                  Session.set('userProfile', {
                    email: result.email,
                    username: result.username,
                    _id: result._id,
                  });
                  
                  navigate('/dashboard');
                }
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            (err) => {
              reject(err || new Error('Fingerprint authentication failed'));
            }
          );
        });
      } else {
        throw new Error('Fingerprint authentication is not available.');
      }
    } catch (err) {
      console.error('### Log ERROR during biometric login:', err);
      setError(err.message || err.reason || 'Biometric login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="flex items-center text-red-600 text-sm text-center bg-red-100 p-3 rounded-lg">
              <FiAlertCircle className="mr-2" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="mt-1 relative">
              <FiMail className="absolute top-3 left-3 text-gray-400" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
                autoComplete="email"
                disabled={isLoggingIn || checkingStatus}
              />
            </div>
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
              PIN
            </label>
            <div className="mt-1 relative">
              <FiLock className="absolute top-3 left-3 text-gray-400" />
              <input
                id="pin"
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your PIN"
                maxLength={6}
                minLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                autoComplete="current-password"
                disabled={isLoggingIn || checkingStatus}
              />
            </div>
          </div>
          
          {isBiometricAvailable && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={isLoggingIn || checkingStatus}
                className="flex items-center space-x-2 py-2 px-4 rounded-xl text-white bg-green-600 hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FingerprintIcon />
                <span>Login with Biometrics</span>
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn || checkingStatus}
            className="w-full py-3 px-4 rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
          >
            {isLoggingIn || checkingStatus ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {checkingStatus ? 'Verifying Account...' : 'Signing In...'}
              </div>
            ) : (
              'Sign In'
            )}
          </button>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Register now
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
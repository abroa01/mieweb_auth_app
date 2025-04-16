import React, { useState, useEffect, useRef } from 'react';
import { useDeviceRegistration } from './hooks/useDeviceRegistration';
import { AppRoutes } from './components/AppRoutes';

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-white space-y-6">
    <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent" />
    <p className="text-blue-700 font-medium text-lg text-center px-4">
    Checking Device Status ...
    </p>
  </div>
);

const ConnectionError = ({ onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center p-6">
    <div className="max-w-xs mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-6">
      <div className="text-center space-y-3">
        <div className="text-red-500 text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-800">Connection Issues</h1>
      </div>

      <div className="space-y-4 text-gray-600">
        <div className="flex items-start gap-3">
          <div className="text-blue-500">1.</div>
          <p>Check your internet connection</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-blue-500">2.</div>
          <p>Refresh the application</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-blue-500">3.</div>
          <p>Manually close and reopen if needed</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-blue-500">4.</div>
          <p>Contact support if unresolved</p>
        </div>
      </div>

      <button
        onClick={onRetry}
        className="w-full py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-lg 
                  font-medium transition-all active:scale-95"
      >
        ↻ Refresh Now
      </button>
    </div>
  </div>
);

export const App = () => {
  const { capturedDeviceUuid, boolRegisteredDevice, isLoading } = useDeviceRegistration();
  const [showError, setShowError] = useState(false);
  const loadingRef = useRef(isLoading);

  console.log(' ### Log Step 2 : inside App.jsx,  App component rendering with:', JSON.stringify({ capturedDeviceUuid, boolRegisteredDevice, isLoading }));

  useEffect(() => {
    loadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loadingRef.current) setShowError(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => window.location.reload();

  return (
    <>
      {showError ? (
        <ConnectionError onRetry={handleRetry} />
      ) : isLoading ? (
        <LoadingState />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-blwue-50 to-indigo-50">
          <AppRoutes 
            isRegistered={boolRegisteredDevice} 
            deviceUuid={capturedDeviceUuid} 
          />
        </div>
      )}
    </>
  );
};
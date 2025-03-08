import React, { useState, useEffect } from 'react';

const ActionsModal = ({ isOpen, onApprove, onReject, onClose, currentNotification, onTimeOut }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  const calculateInitialTime = () => {
    if (!currentNotification?.createdAt) return 0;
    
    // Get timestamp in milliseconds from createdAt
    const createdAt = typeof currentNotification.createdAt === 'string'
      ? new Date(currentNotification.createdAt).getTime()
      : currentNotification.createdAt instanceof Date
        ? currentNotification.createdAt.getTime()
        : currentNotification.createdAt;
    
    const now = Date.now();
    const remainingTime = Math.floor((createdAt + 30000 - now) / 1000);
    return Math.max(0, remainingTime);
  };

  useEffect(() => { 
    if (isOpen) {
      const initialTime = calculateInitialTime();
      
      if (initialTime <= 0) {
        onTimeOut();
        return;
      }

      setTimeLeft(initialTime);

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            onTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, currentNotification, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-center">Authenticate?</h2>
          <div className="text-center text-sm text-gray-500 mt-1">
            {timeLeft} seconds left.
          </div>
        </div>
        <div className="p-4 flex flex-col items-center space-y-4">
          <button
            className="w-full py-2 text-white bg-green-500 rounded-lg hover:bg-green-600"
            onClick={onApprove}
          >
            Approve
          </button>
          <button
            className="w-full py-2 text-white bg-red-500 rounded-lg hover:bg-red-600"
            onClick={onReject}
          >
            Reject
          </button>
        </div>
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default ActionsModal;
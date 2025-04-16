import React, {useEffect} from 'react';
import { CheckCircle } from 'lucide-react';

const ResultModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); 
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 flex items-center justify-center bg-green-100 rounded-full">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          You have been successfully authenticated.
        </h2>
        <button
          className="w-full py-2 mt-4 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ResultModal;

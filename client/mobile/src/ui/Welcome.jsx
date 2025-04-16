import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogIn, FiUserPlus } from 'react-icons/fi';

export const WelcomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          MieSecure
          </h1>
          <p className="mt-4 text-gray-600">Your secure mobile companion</p>
        </div>
        
        <div className="mt-12 space-y-4">
          <button
            onClick={() => navigate('/login')}
            className="group relative w-full flex justify-center items-center px-4 py-3 border border-transparent text-lg font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition hover:scale-105"
          >
            <FiLogIn className="mr-2" /> Sign In
          </button>
          
          <button
            onClick={() => navigate('/register')}
            className="group relative w-full flex justify-center items-center px-4 py-3 border-2 border-blue-600 text-lg font-medium rounded-xl text-blue-600 bg-transparent hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition hover:scale-105"
          >
            <FiUserPlus className="mr-2" /> Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

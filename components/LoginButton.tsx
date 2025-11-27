import React from 'react';
import { useAuth } from './AuthContext.tsx';

const GoogleIcon = () => (
    <svg className="w-4 h-4 mr-2" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 401.8 0 265.8c0-13.2 1-26.3 2.9-39.2H244v78.2H123.9c6.1 46.8 43.4 83.1 90.1 83.1 52.2 0 94.6-42.4 94.6-94.6 0-52.2-42.4-94.6-94.6-94.6-26.2 0-49.5 10.6-66.6 27.6l-58.4-58.4C63.9 50.3 141.5 0 244 0c143.1 0 244 114.3 244 256.3 0 8.6-.7 17.1-2 25.5z"></path>
    </svg>
);

const LoginButton: React.FC = () => {
  const { login } = useAuth();

  return (
    <button
      onClick={login}
      className="flex items-center justify-center bg-white text-gray-700 font-semibold py-2 px-4 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition-colors duration-200 transform active:scale-95"
    >
      <GoogleIcon />
      Login with Google
    </button>
  );
};

export default LoginButton;

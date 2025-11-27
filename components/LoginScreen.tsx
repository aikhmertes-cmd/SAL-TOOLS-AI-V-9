
import React from 'react';
import { useAuth } from './AuthContext.tsx';

const GoogleIcon: React.FC = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fillRule="evenodd">
            <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.04-3.7H.9v2.34A9 9 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.95H.9A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3-2.34z" fill="#FBBC05"/>
            <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.6-2.6C13.46.8 11.43 0 9 0A9 9 0 0 0 .9 4.95l3.06 2.34c.72-2.12 2.7-3.7 5.04-3.7z" fill="#EA4335"/>
        </g>
    </svg>
);

const LoginScreen: React.FC = () => {
    const { login } = useAuth();

    return (
        <div className="flex-grow flex items-center justify-center p-4">
            <div className="w-full max-w-sm mx-auto bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-8 rounded-xl shadow-2xl text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to AI Media Studio</h2>
                <p className="text-gray-400 mb-8">
                    To access the studio, please sign in with your Google account.
                </p>
                
                <button
                    onClick={login}
                    className="w-full flex items-center justify-center bg-white text-gray-700 font-semibold py-3 px-4 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition-colors duration-200 transform active:scale-95"
                >
                    <GoogleIcon />
                    Continue with Google
                </button>
            </div>
        </div>
    );
};

export default LoginScreen;
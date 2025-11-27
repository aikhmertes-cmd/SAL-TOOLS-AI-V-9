import React, { useState, useEffect, useMemo } from 'react';
import { KeyAuthAPI } from '../services/keyauthService.ts';
import { useAuth } from './AuthContext.tsx';

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const LicenseManager: React.FC = () => {
    const api = useMemo(() => new KeyAuthAPI(), []);
    const { login, setIsLicensed } = useAuth();
    const [isInitialized, setIsInitialized] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [responseMessage, setResponseMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const initializeAndAutoLogin = async () => {
            const initRes = await api.init();
            if (!initRes.success) {
                setResponseMessage({ type: 'error', text: initRes.message });
                setIsLoading(false);
                return;
            }
            setIsInitialized(true);

            const savedUsername = localStorage.getItem('username');
            const savedKey = localStorage.getItem('license_key');

            if (savedUsername && savedKey) {
                setUsername(savedUsername);
                setPassword(savedKey);
                const loginRes = await api.login(savedUsername, savedKey);
                if (loginRes.success && loginRes.info) {
                    setIsLicensed(true);
                    login(loginRes.info as any); // Update context with user info
                } else {
                    localStorage.removeItem('username');
                    localStorage.removeItem('license_key');
                    setResponseMessage({ type: 'error', text: 'Your saved session is invalid. Please log in again.' });
                }
            }
            setIsLoading(false);
        };
        initializeAndAutoLogin();
    }, [api, login, setIsLicensed]);

    const handleLogin = async () => {
        setIsLoading(true);
        setResponseMessage(null);
        const loginRes = await api.login(username, password);
        
        if (loginRes.success && loginRes.info) {
            localStorage.setItem('username', username);
            localStorage.setItem('license_key', password);
            setIsLicensed(true);
            login(loginRes.info as any);
        } else {
            setResponseMessage({ type: 'error', text: loginRes.message });
        }
        setIsLoading(false);
    };

    const inputClasses = "bg-slate-800 border border-slate-700 text-white text-base rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3 placeholder-slate-400 disabled:opacity-50 transition-all duration-300";

    return (
        <div className="flex-grow flex items-center justify-center p-4">
            <div className="w-full max-w-sm mx-auto bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-8 rounded-xl shadow-2xl text-center">
                 <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">License Login</h2>
                    <p className="text-slate-400 mt-1">Please enter your credentials to access the studio.</p>
                    <p className="text-slate-400 mt-2 text-sm">my owner manager tools : អេតមីន - សាល</p>
                </div>

                <div className="space-y-4">
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className={inputClasses} disabled={isLoading || !isInitialized} aria-label="Username" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className={inputClasses} disabled={isLoading || !isInitialized} aria-label="Password" />
                </div>
                
                 {responseMessage && (
                    <div className={`mt-6 p-3 text-center rounded-lg text-sm ${
                        responseMessage.type === 'success' 
                            ? 'bg-green-900/50 border border-green-700 text-green-300' 
                            : 'bg-red-950/60 border border-red-700 text-red-300'
                    }`}>
                        {responseMessage.text}
                    </div>
                )}
                
                <div className="mt-6">
                     <button onClick={handleLogin} disabled={isLoading || !isInitialized || !username || !password} className="w-full flex items-center justify-center px-6 py-3 font-bold text-white bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-lg shadow-lg hover:from-fuchsia-700 hover:to-purple-700 transform transition-all duration-300 disabled:opacity-50 active:scale-95">
                       {isLoading ? <Spinner /> : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LicenseManager;
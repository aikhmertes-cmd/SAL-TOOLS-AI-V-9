import React from 'react';
import { useAuth } from './AuthContext.tsx';

const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }
  
  const subscription = user.subscriptions?.[0];

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full border-2 border-cyan-400" />
        <div className="text-left hidden sm:block">
            <span className="font-semibold text-gray-200 text-sm">{user.name}</span>
            {subscription && (
                <p className="text-xs text-gray-400">Expires: {subscription.expiry} ({subscription.daysLeft} days left)</p>
            )}
        </div>
      </div>
      <button
        onClick={logout}
        className="text-sm text-gray-400 hover:text-white bg-gray-700/50 px-3 py-1.5 rounded-md transition-colors duration-200"
      >
        Logout
      </button>
    </div>
  );
};

export default UserProfile;
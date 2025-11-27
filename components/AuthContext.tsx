import React, { createContext, useState, useContext, ReactNode } from 'react';

interface Subscription {
  subscription: string;
  expiry: string;
  daysLeft: number;
}
interface User {
  name: string;
  picture: string; // URL or data URI for the profile picture
  subscriptions?: Subscription[];
}

interface AuthContextType {
  user: User | null;
  login: (userInfo: { username: string; subscriptions?: Subscription[] }) => void;
  logout: () => void;
  isLicensed: boolean;
  setIsLicensed: (isLicensed: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLicensed, setIsLicensed] = useState<boolean>(false);

  const login = (userInfo: { username: string; subscriptions?: Subscription[] }) => {
    const firstLetter = userInfo.username.charAt(0).toUpperCase();
    setUser({
      name: userInfo.username,
      // Using a simple SVG as a placeholder avatar based on username
      picture: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%234f46e5" /><text x="50" y="68" font-size="50" fill="white" text-anchor="middle" font-family="Arial, sans-serif">${firstLetter}</text></svg>`,
      subscriptions: userInfo.subscriptions
    });
  };

  const logout = () => {
    setUser(null);
    setIsLicensed(false);
    // Clear saved credentials on logout
    localStorage.removeItem('username');
    localStorage.removeItem('license_key');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLicensed, setIsLicensed }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
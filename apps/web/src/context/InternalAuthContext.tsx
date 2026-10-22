import React, { createContext, useContext, useState, useEffect } from 'react';
import { internalDemoApi, InternalUser } from '../services/internalDemoApi';

interface InternalAuthContextType {
  internalUser: InternalUser | null;
  internalToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const InternalAuthContext = createContext<InternalAuthContextType | undefined>(undefined);

export const InternalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [internalUser, setInternalUser] = useState<InternalUser | null>(() => {
    try {
      const stored = localStorage.getItem('ricoz_internal_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [internalToken, setInternalToken] = useState<string | null>(() => {
    return localStorage.getItem('ricoz_internal_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyInternalAuth = async () => {
      if (internalToken) {
        try {
          const me = await internalDemoApi.getMe();
          setInternalUser(me);
          localStorage.setItem('ricoz_internal_user', JSON.stringify(me));
        } catch {
          // Token expired or invalid
          logout();
        }
      }
      setIsLoading(false);
    };
    verifyInternalAuth();
  }, [internalToken]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await internalDemoApi.login(email, pass);
      localStorage.setItem('ricoz_internal_token', res.access_token);
      localStorage.setItem('ricoz_internal_user', JSON.stringify(res.user));
      setInternalToken(res.access_token);
      setInternalUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    internalDemoApi.logout();
    localStorage.removeItem('ricoz_internal_token');
    localStorage.removeItem('ricoz_internal_user');
    setInternalToken(null);
    setInternalUser(null);
  };

  const refreshMe = async () => {
    if (!internalToken) return;
    try {
      const me = await internalDemoApi.getMe();
      setInternalUser(me);
      localStorage.setItem('ricoz_internal_user', JSON.stringify(me));
    } catch {
      // Ignore background refresh errors
    }
  };

  return (
    <InternalAuthContext.Provider
      value={{
        internalUser,
        internalToken,
        isAuthenticated: !!internalToken && !!internalUser,
        isLoading,
        login,
        logout,
        refreshMe
      }}
    >
      {children}
    </InternalAuthContext.Provider>
  );
};

export const useInternalAuth = (): InternalAuthContextType => {
  const context = useContext(InternalAuthContext);
  if (!context) {
    throw new Error('useInternalAuth must be used within an InternalAuthProvider');
  }
  return context;
};

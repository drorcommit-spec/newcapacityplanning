import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../types';
import { saveToStorage, loadFromStorage } from '../utils/storageUtils';

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => 
    loadFromStorage<AuthUser | null>('authUser', null)
  );

  useEffect(() => {
    saveToStorage('authUser', user);
  }, [user]);

  const login = (user: AuthUser) => {
    setUser(user);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

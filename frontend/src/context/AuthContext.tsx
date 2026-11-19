import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/auction';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { full_name: string; email: string; password: string; role: 'BUYER' | 'SUPPLIER' }) => Promise<void>;
  logout: () => void;
  quickSwitch: (roleOrEmail: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const profile = await authService.getMe();
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        } catch (e) {
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('token', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
  };

  const register = async (data: { full_name: string; email: string; password: string; role: 'BUYER' | 'SUPPLIER' }) => {
    await authService.register(data);
    await login(data.email, data.password);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const quickSwitch = async (accountKey: string) => {
    let email = 'buyer@demo.com';
    if (accountKey === 'supplier1' || accountKey === 'supplier1@demo.com') email = 'supplier1@demo.com';
    else if (accountKey === 'supplier2' || accountKey === 'supplier2@demo.com') email = 'supplier2@demo.com';
    else if (accountKey === 'supplier3' || accountKey === 'supplier3@demo.com') email = 'supplier3@demo.com';
    
    await login(email, 'password123');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, quickSwitch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

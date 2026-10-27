import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { login as apiLogin, getMe } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    return !(savedToken && savedUser);
  });

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const profile = await getMe();
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
        } catch (err: any) {
          // Only invalidate and clear session if backend specifically rejects credentials with 401
          if (err?.response?.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token]);

  const login = async (username: string, pass: string) => {
    setLoading(true);
    try {
      const data = await apiLogin(username, pass);
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      const profile = await getMe();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

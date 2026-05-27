import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface User {
  id: number;
  username: string;
  role: string;
  full_name: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, initialized: false,
  login: async () => {}, logout: () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      checkInit();
      return;
    }
    api.get('/auth/me')
      .then(res => { setUser(res.data); setInitialized(true); })
      .catch(() => { localStorage.removeItem('token'); setInitialized(true); })
      .finally(() => setLoading(false));
  }, []);

  const checkInit = async () => {
    try {
      const res = await api.get('/auth/init');
      setInitialized(res.data.initialized);
    } catch { setInitialized(true); }
    setLoading(false);
  };

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', res.data.access_token);
    setUser(res.data.user);
    setInitialized(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, initialized,
      login, logout,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

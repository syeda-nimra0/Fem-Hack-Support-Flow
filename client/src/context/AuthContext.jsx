import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!api.getToken()) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.auth.me();
      setUser(data.user);
      connectSocket();
    } catch (err) {
      api.clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (email, password) => {
    const data = await api.auth.login({ email, password });
    api.setToken(data.token);
    setUser(data.user);
    connectSocket();
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api.auth.register(payload);
    api.setToken(data.token);
    setUser(data.user);
    connectSocket();
    return data.user;
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
    disconnectSocket();
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    reload: loadMe,
    isAuthenticated: !!user,
    isCustomer: user?.role === 'customer',
    isAgent: user?.role === 'agent',
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'agent' || user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

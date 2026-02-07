import React, { createContext, useState, useContext, useEffect } from 'react';
import { gasAPI } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved session
    const savedSession = localStorage.getItem('userSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setUser(session);
      } catch (e) {
        console.error('Session parse error:', e);
        localStorage.removeItem('userSession');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const result = await gasAPI.loginUser(email, password);
      if (result.status === 'success' && result.user) {
        setUser(result.user);
        localStorage.setItem('userSession', JSON.stringify(result.user));
        return { success: true };
      } else {
        return { success: false, message: result.message || 'Login failed' };
      }
    } catch (error) {
      return { success: false, message: error.message || 'Login error' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userSession');
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


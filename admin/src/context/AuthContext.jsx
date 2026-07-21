import React, { createContext, useContext, useState, useEffect } from 'react';
import { TokenHelper } from '../utils/tokenHelper';
import axios from 'axios';

const AuthContext = createContext(null);

// Configure axios base URL if not already done globally
const api = axios.create({
  baseURL: 'http://localhost:5002/api'
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and validate session
  const checkAuth = async () => {
    const token = TokenHelper.getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/Auth/me', {
        headers: {
          Authorization: 'Bearer ' + token
        }
      });
      
      const userData = response.data;
      
      // Ensure the user is actually an admin
      if (userData.role !== 'Admin') {
        TokenHelper.clearTokens();
        setUser(null);
        setError('Access denied. Administrator privileges required.');
      } else {
        setUser(userData);
        setError(null);
      }
    } catch (err) {
      console.error('Session validation failed:', err);
      TokenHelper.clearTokens();
      setUser(null);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('Access denied.');
      } else {
        setError('Failed to authenticate.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (token) => {
    TokenHelper.setToken(token);
    await checkAuth(); // Re-validate and load user data
  };

  const logout = () => {
    TokenHelper.clearTokens();
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


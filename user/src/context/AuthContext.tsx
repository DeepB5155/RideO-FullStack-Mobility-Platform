import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PushNotificationService } from '../services/PushNotificationService';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: async () => {},
  isLoading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadToken = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userData');
      const storedToken = await AsyncStorage.getItem('jwtToken');
      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser);
        if (userData && userData.role === 'User') {
          setUser({
            id: userData.id,
            email: userData.email,
            name: userData.fullName || userData.name,
            role: userData.role,
          });
          setToken(storedToken);
          PushNotificationService.registerTokenWithBackend();
        }
      }
    } catch (e) {
      console.error('Failed to load user', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadToken();
  }, []);

  const login = async (authResponse: any) => {
    // Backend now returns { token, user }
    const { token, user } = authResponse;
    const userData = user || authResponse;

    if (userData && userData.role === 'User') {
      if (token) {
        await AsyncStorage.setItem('jwtToken', token);
        setToken(token);
      }
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.fullName || userData.name,
        role: userData.role,
      });
      PushNotificationService.registerTokenWithBackend();
    } else {
      throw new Error("Invalid User Role. Please login with a User account.");
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('jwtToken');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

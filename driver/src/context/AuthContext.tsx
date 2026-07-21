import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PushNotificationService } from '../services/PushNotificationService';
import { TokenHelper } from '../utils/tokenHelper';

// Define the shape of our User
export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  isVerified?: boolean;
}

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const loadStorageData = async () => {
      try {
        const token = await TokenHelper.getToken();
        const userDataString = await TokenHelper.getUserData();
        
        if (token && userDataString) {
          setUser(JSON.parse(userDataString));
          // Note: In a real app, you might want to validate the token with the backend here
          PushNotificationService.registerTokenWithBackend();
        }
      } catch (error) {
        console.error('Failed to load auth data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStorageData();
  }, []);

  const login = async (token: string, userData: User) => {
    try {
      await TokenHelper.setToken(token);
      await TokenHelper.setUserData(JSON.stringify(userData));
      setUser(userData);
      PushNotificationService.registerTokenWithBackend();
    } catch (error) {
      console.error('Failed to save auth data:', error);
    }
  };

  const logout = async () => {
    try {
      await TokenHelper.clearTokens();
      setUser(null);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  };

  const updateUser = useCallback(async (data: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      const updated = { ...prevUser, ...data };
      TokenHelper.setUserData(JSON.stringify(updated)).catch(e => console.error(e));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

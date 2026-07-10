import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PushNotificationService } from '../services/PushNotificationService';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phoneNumber?: string;
  profilePicture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>, newToken?: string) => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
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
            phoneNumber: userData.phoneNumber,
            profilePicture: userData.profilePicture,
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
        phoneNumber: userData.phoneNumber,
        profilePicture: userData.profilePicture,
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

  const updateUser = async (data: Partial<User>, newToken?: string) => {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    
    // Also update in AsyncStorage
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.fullName = updatedUser.name;
        parsed.phoneNumber = updatedUser.phoneNumber;
        parsed.email = updatedUser.email;
        parsed.profilePicture = updatedUser.profilePicture;
        await AsyncStorage.setItem('userData', JSON.stringify(parsed));
      }
      
      if (newToken) {
        setToken(newToken);
        await AsyncStorage.setItem('jwtToken', newToken);
      }
    } catch (e) {
      console.error('Failed to update local storage', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

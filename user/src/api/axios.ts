import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// UPDATE THIS to your computer's local Wi-Fi IP address (e.g., 192.168.1.100)
// Since you are testing on a physical device, localhost or 10.0.2.2 will not work.
import { API_BASE_URL as ENV_API_BASE_URL } from '@env';

export const API_BASE_URL = ENV_API_BASE_URL || 'http://192.168.1.182:5248/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('jwtToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

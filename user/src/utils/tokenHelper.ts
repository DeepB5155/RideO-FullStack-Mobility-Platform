import AsyncStorage from '@react-native-async-storage/async-storage';

export const CANONICAL_KEY = 'jwtToken';
export const LEGACY_KEYS = ['userToken'];
export const USER_DATA_KEY = 'userData';

export const TokenHelper = {
  getToken: async (): Promise<string | null> => {
    // Read the canonical key first
    let token = await AsyncStorage.getItem(CANONICAL_KEY);
    if (token) {
      return token;
    }

    // Fall back to known legacy keys
    for (const legacyKey of LEGACY_KEYS) {
      token = await AsyncStorage.getItem(legacyKey);
      if (token) {
        // Copy the token to the canonical key
        await AsyncStorage.setItem(CANONICAL_KEY, token);
        return token;
      }
    }
    
    return null;
  },

  setToken: async (token: string): Promise<void> => {
    await AsyncStorage.setItem(CANONICAL_KEY, token);
  },

  clearTokens: async (): Promise<void> => {
    await AsyncStorage.removeItem(CANONICAL_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
    for (const legacyKey of LEGACY_KEYS) {
      await AsyncStorage.removeItem(legacyKey);
    }
  },

  getUserData: async (): Promise<string | null> => {
    return await AsyncStorage.getItem(USER_DATA_KEY);
  },

  setUserData: async (userData: string): Promise<void> => {
    await AsyncStorage.setItem(USER_DATA_KEY, userData);
  }
};

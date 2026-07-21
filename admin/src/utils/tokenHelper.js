export const CANONICAL_KEY = 'adminToken';
export const LEGACY_KEYS = ['adminAuth'];

export const TokenHelper = {
  getToken: () => {
    return localStorage.getItem(CANONICAL_KEY);
  },

  setToken: (token) => {
    localStorage.setItem(CANONICAL_KEY, token);
    localStorage.setItem('adminAuth', 'true');
  },

  clearTokens: () => {
    localStorage.removeItem(CANONICAL_KEY);
    LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
  },

  isAuthenticated: () => {
    return !!TokenHelper.getToken();
  }
};

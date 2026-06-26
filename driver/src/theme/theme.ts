export const theme = {
  colors: {
    primary: '#4F46E5',    // Indigo
    primaryLight: '#818CF8',
    secondary: '#1E293B',  // Slate
    background: '#F8FAFC', // Light Gray
    surface: '#FFFFFF',
    text: {
      main: '#0F172A',
      muted: '#64748B',
      light: '#FFFFFF'
    },
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    border: '#E2E8F0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 24,
    xl: 30,
    full: 9999,
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    }
  }
};

import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { SignalRProvider } from './src/context/SignalRContext';
import AppNavigator from './src/navigation/AppNavigator';

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SignalRProvider>
          <AppNavigator />
        </SignalRProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;

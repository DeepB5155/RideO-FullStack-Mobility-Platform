import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { SignalRProvider } from './src/context/SignalRContext';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SignalRProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </SignalRProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;

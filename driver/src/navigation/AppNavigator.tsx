import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import KYCScreen from '../screens/KYCScreen';
import CreateRouteScreen from '../screens/CreateRouteScreen';
import MyRoutesScreen from '../screens/MyRoutesScreen';
import RouteBookingsScreen from '../screens/RouteBookingsScreen';
import ActiveRideScreen from '../screens/ActiveRideScreen';

// Context
import { AuthContext } from '../context/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'Dashboard' }} 
      />
      <Tab.Screen 
        name="My Routes" 
        component={MyRoutesScreen} 
        options={{ title: 'My Routes' }} 
      />
      <Tab.Screen 
        name="Create Route" 
        component={CreateRouteScreen} 
        options={{ title: 'Create' }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'My Profile' }} 
      />
      <Tab.Screen 
        name="Route Bookings" 
        component={RouteBookingsScreen} 
        options={{ tabBarButton: () => null, tabBarVisible: false }} // Hidden from bottom bar
      />
      <Tab.Screen 
        name="Active Ride" 
        component={ActiveRideScreen} 
        options={{ tabBarButton: () => null, tabBarVisible: false }} // Hidden from bottom bar
      />
    </Tab.Navigator>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

const MainStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="KYC" component={KYCScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;

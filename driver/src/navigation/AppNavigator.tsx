import React, { useContext } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from '../theme/theme';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import KYCScreen from '../screens/KYCScreen';
import CreateRouteScreen from '../screens/CreateRouteScreen';
import MyRoutesScreen from '../screens/MyRoutesScreen';
import RouteBookingsScreen from '../screens/RouteBookingsScreen';
import ActiveRideScreen from '../screens/ActiveRideScreen';
import RatingScreen from '../screens/RatingScreen';
import ChatScreen from '../screens/ChatScreen';
import EarningsScreen from '../screens/EarningsScreen';
import SupportScreen from '../screens/SupportScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import WalletScreen from '../screens/WalletScreen';
import InsightsScreen from '../screens/InsightsScreen';

// Context
import { AuthContext } from '../context/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text.main,
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          paddingBottom: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>
        }} 
      />
      <Tab.Screen 
        name="My Routes" 
        component={MyRoutesScreen} 
        options={{ 
          title: 'My Routes',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🛣️</Text>
        }} 
      />
      <Tab.Screen 
        name="Create Route" 
        component={CreateRouteScreen} 
        options={{ 
          title: 'Create',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>➕</Text>
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          title: 'My Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>
        }} 
      />
      <Tab.Screen 
        name="Route Bookings" 
        component={RouteBookingsScreen} 
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }} // Hidden from bottom bar
      />
      <Tab.Screen 
        name="Active Ride" 
        component={ActiveRideScreen} 
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }} // Hidden from bottom bar
      />
      <Tab.Screen 
        name="Rating" 
        component={RatingScreen} 
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }} 
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }} 
      />
      <Tab.Screen 
        name="Earnings" 
        component={EarningsScreen} 
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }} 
      />
      <Tab.Screen 
        name="Support" 
        component={SupportScreen} 
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }} 
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen} 
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }} 
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }} 
      />
      <Tab.Screen 
        name="Insights" 
        component={InsightsScreen} 
        options={{ tabBarButton: () => null, tabBarStyle: { display: 'none' } }} 
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

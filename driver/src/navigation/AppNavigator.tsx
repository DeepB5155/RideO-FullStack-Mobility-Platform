import React, { useContext, useEffect } from 'react';
import { ActivityIndicator, View, Text, Alert } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as signalR from '@microsoft/signalr';
import axiosInstance from '../api/axios';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from '../theme/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CustomHeader } from '../components/CustomHeader';

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
import MyComplaintsScreen from '../screens/MyComplaintsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import DailyCommuteSetupScreen from '../screens/DailyCommuteSetupScreen';
import EditVehicleScreen from '../screens/EditVehicleScreen';
import VehicleDetailsScreen from '../screens/VehicleDetailsScreen';
import WithdrawScreen from '../screens/WithdrawScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

// Context
import { AuthContext } from '../context/AuthContext';

export const navigationRef = createNavigationContainerRef<any>();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Tab Icon helper ────────────────────────────────────────────────────
const TabIcon = ({ name, title, focused }: { name: string; title: string; focused: boolean }) => (
  <View style={{
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: focused ? '#131b2e' : 'transparent',
    borderRadius: 24,
    width: focused ? 76 : 64,
    height: 56,
  }}>
    <View style={{ position: 'relative' }}>
      <Icon name={name} size={24} color={focused ? '#ffffff' : '#45464d'} />
      {title === 'Alerts' && !focused && (
        <View style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ba1a1a' }} />
      )}
    </View>
    <Text 
      numberOfLines={1}
      style={{
        fontSize: 11,
        fontWeight: '600',
        color: focused ? '#ffffff' : '#45464d',
        marginTop: 4,
      }}
    >
      {title}
    </Text>
  </View>
);

// ─── 5-Tab Bottom Navigator ─────────────────────────────────────────────
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        header: (props) => <CustomHeader {...props} />,
        headerShown: true,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: 'absolute',
          elevation: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          paddingBottom: 8,
          paddingTop: 8,
          height: 72,
          paddingHorizontal: 8,
        },
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{
          headerTransparent: true,
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" title="Home" focused={focused} />
        }} 
      />
      <Tab.Screen 
        name="My Routes" 
        component={MyRoutesScreen} 
        options={{
          title: 'My Routes',
          tabBarIcon: ({ focused }) => <TabIcon name="directions-car" title="My Routes" focused={focused} />
        }} 
      />
      <Tab.Screen 
        name="Earnings" 
        component={EarningsScreen} 
        options={{
          title: 'Earnings',
          tabBarIcon: ({ focused }) => <TabIcon name="account-balance-wallet" title="Earnings" focused={focused} />
        }} 
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{
          title: 'Notifications',
          tabBarIcon: ({ focused }) => <TabIcon name="notifications" title="Notifications" focused={focused} />
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="person" title="Profile" focused={focused} />
        }} 
      />
    </Tab.Navigator>
  );
};

// ─── Auth Stack ─────────────────────────────────────────────────────────
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};

// ─── Onboarding Stack (for unverified drivers) ────────────────────────────────────
const OnboardingStack = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        header: (props) => <CustomHeader {...props} />,
        headerShown: true
      }}
    >
      <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} options={{ title: 'Vehicle Details' }} />
      <Stack.Screen name="KYC" component={KYCScreen} options={{ title: 'KYC Setup' }} />
    </Stack.Navigator>
  );
};

// ─── Main Stack (wraps tabs + all secondary screens) ────────────────────────
const MainStack = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        header: (props) => <CustomHeader {...props} />,
        headerShown: true
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      {/* Secondary screens reachable via navigation.navigate() */}
      <Stack.Screen name="Withdraw" component={WithdrawScreen} options={{ title: 'Withdraw' }} />
      <Stack.Screen name="Create Route" component={CreateRouteScreen} options={{ title: 'Create Route' }} />
      <Stack.Screen name="Route Bookings" component={RouteBookingsScreen} options={{ title: 'Route Details' }} />
      <Stack.Screen name="Active Ride" component={ActiveRideScreen} options={{ headerTransparent: true }} />
      <Stack.Screen name="Rating" component={RatingScreen} options={{ title: 'Rating' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
      <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Stack.Screen name="Insights" component={InsightsScreen} options={{ title: 'Insights' }} />
      <Stack.Screen name="MyComplaints" component={MyComplaintsScreen} options={{ title: 'My Complaints' }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
      <Stack.Screen name="DailyCommuteSetup" component={DailyCommuteSetupScreen} options={{ title: 'Commute Setup' }} />
      <Stack.Screen name="EditVehicle" component={EditVehicleScreen} options={{ title: 'Edit Vehicle' }} />
      <Stack.Screen name="KYC" component={KYCScreen} options={{ title: 'KYC Details' }} />
    </Stack.Navigator>
  );
};

// ─── Root ────────────────────────────────────────────────────────────────
const AppNavigator = () => {
  const { user, isLoading, updateUser, logout } = useContext(AuthContext);

  useEffect(() => {
    let connection: signalR.HubConnection | null = null;
    
    const setupGlobalSignalR = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token || !user) return;
        
        const hubUrl = axiosInstance.defaults.baseURL?.replace('/api', '/rideHub') || 'http://localhost:5000/rideHub';
        
        connection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, { accessTokenFactory: () => token })
          .withAutomaticReconnect()
          .build();

        connection.on("KYCStatusUpdated", (newStatus: string, reason?: string) => {
          if (newStatus === 'Rejected') {
            Alert.alert(
              "KYC Rejected ⚠️",
              `Your documents were rejected.\n\nReason: ${reason || 'Invalid documents'}\n\nPlease update your details.`,
              [
                { 
                  text: "OK", 
                  onPress: () => {
                    updateUser({ isVerified: false });
                    if (navigationRef.isReady()) {
                      navigationRef.navigate('KYCScreen');
                    }
                  } 
                }
              ]
            );
          } else if (newStatus === 'Approved') {
             updateUser({ isVerified: true });
          }
        });

        connection.on("AccountSuspended", () => {
          console.log("RECEIVED AccountSuspended EVENT FROM SIGNALR!");
          Alert.alert(
            "Account Suspended 🚫",
            "Your driver account has been suspended by an administrator. You will be logged out. Contact support for assistance.",
            [
              { 
                text: "OK", 
                onPress: () => {
                  logout();
                } 
              }
            ]
          );
        });

        await connection.start();
        console.log("Global SignalR Connected Successfully in AppNavigator!");
      } catch (err) {
        console.log("Global SignalR Connection Error:", err);
      }
    };

    setupGlobalSignalR();

    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [user?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? (user.isVerified ? <MainStack /> : <OnboardingStack />) : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;

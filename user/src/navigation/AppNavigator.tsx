import React, { useContext } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CustomHeader } from '../components/CustomHeader';
import { AuthContext } from '../context/AuthContext';
import HomeScreen from '../screens/HomeScreen';
import SearchRideScreen from '../screens/SearchRideScreen';
import RideResultsScreen from '../screens/RideResultsScreen';
import MyRidesScreen from '../screens/MyRidesScreen';
import LiveTrackingScreen from '../screens/LiveTrackingScreen';
import RatingScreen from '../screens/RatingScreen';
import ChatScreen from '../screens/ChatScreen';
import LoginScreen from '../screens/LoginScreen';
import PaymentScreen from '../screens/PaymentScreen';
import SupportScreen from '../screens/SupportScreen';
import MyComplaintsScreen from '../screens/MyComplaintsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import WalletScreen from '../screens/WalletScreen';
import EmergencyContactsScreen from '../screens/EmergencyContactsScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileInformationScreen from '../screens/ProfileInformationScreen';
import SecurityScreen from '../screens/SecurityScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ModalsShowcaseScreen from '../screens/ModalsShowcaseScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import RideHistoryScreen from '../screens/RideHistoryScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- Tab Icon helper ---
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

// --- 5-Tab Bottom Navigator ---
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
          tabBarIcon: ({ focused }) => <TabIcon name="home" title="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="RidesTab"
        component={MyRidesScreen}
        options={{
          title: 'My Rides',
          tabBarIcon: ({ focused }) => <TabIcon name="directions-car" title="Rides" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="CommutesTab"
        component={SubscriptionsScreen}
        options={{
          title: 'Commutes',
          tabBarIcon: ({ focused }) => <TabIcon name="event-repeat" title="Commutes" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletScreen}
        options={{
          title: 'Wallet',
          tabBarIcon: ({ focused }) => <TabIcon name="account-balance-wallet" title="Wallet" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AlertsTab"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          tabBarIcon: ({ focused }) => <TabIcon name="notifications" title="Alerts" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <Stack.Navigator 
      screenOptions={{ 
        header: (props) => <CustomHeader {...props} />,
        headerShown: true
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerTransparent: true }} />
          <Stack.Screen name="SearchRide" component={SearchRideScreen} options={{ title: 'Search Ride' }} />
          <Stack.Screen name="RideResults" component={RideResultsScreen} options={{ title: 'Available Rides' }} />
          <Stack.Screen name="My Rides" component={MyRidesScreen} />
          <Stack.Screen name="Live Tracking" component={LiveTrackingScreen} options={{ headerTransparent: true }} />
          <Stack.Screen name="Rating" component={RatingScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="MyComplaints" component={MyComplaintsScreen} options={{ title: 'My Complaints' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="Emergency Contacts" component={EmergencyContactsScreen} options={{ title: 'Emergency Contacts' }} />
          <Stack.Screen name="SubscriptionsScreen" component={SubscriptionsScreen} options={{ title: 'Commutes' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="ProfileInformation" component={ProfileInformationScreen} options={{ title: 'Profile Info' }} />
          <Stack.Screen name="Security" component={SecurityScreen} />
          <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ title: 'Payment Methods' }} />
          <Stack.Screen name="ModalsShowcase" component={ModalsShowcaseScreen} options={{ title: 'Modals' }} />
          <Stack.Screen name="RideHistory" component={RideHistoryScreen} options={{ title: 'Past Rides & Invoices' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;

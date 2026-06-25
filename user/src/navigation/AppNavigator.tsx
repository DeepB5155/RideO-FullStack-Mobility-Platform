import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../context/AuthContext';
import HomeScreen from '../screens/HomeScreen';
import SearchRideScreen from '../screens/SearchRideScreen';
import RideResultsScreen from '../screens/RideResultsScreen';
import MyRidesScreen from '../screens/MyRidesScreen';
import LiveTrackingScreen from '../screens/LiveTrackingScreen';

const Stack = createStackNavigator();

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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="SearchRide" component={SearchRideScreen} />
          <Stack.Screen name="RideResults" component={RideResultsScreen} />
          <Stack.Screen name="My Rides" component={MyRidesScreen} />
          <Stack.Screen name="Live Tracking" component={LiveTrackingScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;

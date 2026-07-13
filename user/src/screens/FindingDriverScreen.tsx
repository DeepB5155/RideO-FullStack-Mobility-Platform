import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as signalR from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const localColors = {
  background: '#f8f9ff',
  primary: '#000000',
  onPrimary: '#ffffff',
  secondary: '#006a61',
  onSurfaceVariant: '#45464d',
};

const FindingDriverScreen = ({ route, navigation }: any) => {
  const { bookingId, driverName, routeId } = route.params;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [hubConnection, setHubConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // SignalR Connection
    let connection: signalR.HubConnection;
    const connectSignalR = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const hubUrl = SIGNALR_HUB_URL || 'http://192.168.1.182:5248/rideHub';

        connection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, { accessTokenFactory: () => token || '' })
          .withAutomaticReconnect()
          .build();

        connection.on('BookingStatusUpdated', (data) => {
          // Compare strings for GUIDs
          if (data.bookingId.toLowerCase() === bookingId.toLowerCase() && data.status === 'Approved') {
            // Driver accepted! Navigate to live tracking.
            Alert.alert('Ride Confirmed!', `${driverName} has accepted your request.`);
            navigation.replace('Live Tracking', { bookingId: bookingId, routeId: routeId });
          } else if (data.bookingId.toLowerCase() === bookingId.toLowerCase() && data.status === 'Rejected') {
            Alert.alert('Ride Unavailable', `${driverName} could not accept the request.`);
            navigation.goBack();
          }
        });

        await connection.start();
        setHubConnection(connection);
      } catch (err) {
        console.error('SignalR Connection Error: ', err);
      }
    };

    connectSignalR();

    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, []);

  const handleCancel = () => {
    // Ideally hit an endpoint to cancel the pending request
    navigation.goBack();
  };

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 3]
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0]
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connecting...</Text>
      <Text style={styles.subtitle}>Waiting for {driverName} to accept your request</Text>

      <View style={styles.radarContainer}>
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale }], opacity }]} />
        <View style={styles.centerCircle}>
          <MaterialIcons name="directions-car" size={40} color={localColors.onPrimary} />
        </View>
      </View>

      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
        <Text style={styles.cancelBtnText}>Cancel Request</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: localColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: localColors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 60,
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: localColors.secondary,
  },
  centerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: localColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  cancelBtn: {
    marginTop: 80,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 30,
    backgroundColor: '#ffebeb',
  },
  cancelBtnText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default FindingDriverScreen;

import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, PermissionsAndroid } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import Geolocation from '@react-native-community/geolocation';
import * as signalR from '@microsoft/signalr';
import { MAPBOX_ACCESS_TOKEN, SIGNALR_HUB_URL } from '@env';
import { AuthContext } from '../context/AuthContext';
import api, { API_BASE_URL } from '../api/axios';
import { theme } from '../theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const HomeScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  // Default to Gandhinagar, Gujarat
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>({ 
    latitude: 23.2156, 
    longitude: 72.6369 
  });
  const [isOnline, setIsOnline] = useState(false);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const locationWatchId = useRef<number | null>(null);
  
  // Incoming Ride State
  const [incomingRide, setIncomingRide] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);

  // Initialize Map & Location
  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'RideO needs access to your location to receive rides.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission Denied', 'You cannot receive rides without location access.');
            return;
          }
        } catch (err) {
          console.warn(err);
        }
      }

      // ONLY get position after permissions are granted
      Geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          Alert.alert('Location Error', error.message);
        },
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 } // Network location for fast indoor fix
      );
    };

    // Setup SignalR connection object
    const hubUrl = SIGNALR_HUB_URL || API_BASE_URL.replace('/api', '/rideHub');
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: async () => await AsyncStorage.getItem('userToken') || '' })
      .withAutomaticReconnect()
      .build();

    newConnection.on("NewRideRequest", (rideDetails) => {
      // Show incoming ride popup!
      setIncomingRide(rideDetails);
    });

    setConnection(newConnection);

    requestLocationPermission();

    return () => {
      if (locationWatchId.current !== null) {
        Geolocation.clearWatch(locationWatchId.current);
      }
      if (newConnection.state !== signalR.HubConnectionState.Disconnected) {
        newConnection.stop();
      }
    };
  }, []);

  const toggleOnlineStatus = async () => {
    if (!isOnline) {
      // Go Online
      try {
        if (connection && connection.state === signalR.HubConnectionState.Disconnected) {
          await connection.start();
          await connection.invoke("JoinDriverGroup");
        }
        
        setIsOnline(true);
        
        // Start watching location to broadcast
        locationWatchId.current = Geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ latitude, longitude });
            
            // Broadcast to backend
            if (connection?.state === signalR.HubConnectionState.Connected && user?.id) {
              connection.invoke("BroadcastDriverLocation", user.id, latitude, longitude)
                .catch(err => console.error("Broadcast failed:", err));
            }
          },
          (error) => console.warn(error),
          { enableHighAccuracy: true, distanceFilter: 10 } // Update every 10 meters
        );
        
      } catch (error) {
        Alert.alert("Connection Error", "Could not connect to the server.");
        console.error(error);
      }
    } else {
      // Go Offline
      if (locationWatchId.current !== null) {
        Geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
      if (connection && connection.state === signalR.HubConnectionState.Connected) {
        await connection.stop();
      }
      setIsOnline(false);
    }
  };

  const acceptRide = async () => {
    if (!incomingRide || !location) return;
    try {
      await api.post(`/ride/${incomingRide.id}/accept`, {
        latitude: location.latitude,
        longitude: location.longitude
      });
      setActiveRide(incomingRide);
      setIncomingRide(null);
      Alert.alert("Ride Accepted", "Follow the route to the passenger.");
    } catch (error) {
      Alert.alert("Error", "Could not accept ride.");
      setIncomingRide(null);
    }
  };

  const rejectRide = () => {
    setIncomingRide(null);
  };

  return (
    <View style={styles.container}>
      {location ? (
        <Mapbox.MapView 
          style={styles.map} 
          logoEnabled={false} 
          attributionEnabled={false}
          styleURL={Mapbox.StyleURL.Street}
        >
          <Mapbox.Camera
            zoomLevel={15}
            centerCoordinate={[location.longitude, location.latitude]}
            animationMode="flyTo"
            animationDuration={2000}
          />
          <Mapbox.UserLocation 
            visible={true} 
            showsUserHeadingIndicator={true}
          />
        </Mapbox.MapView>
      ) : (
        <View style={[styles.map, styles.loadingMap]}>
          <Text>Locating...</Text>
        </View>
      )}

      {/* Driver Overlay */}
      <View style={styles.topOverlay}>
        <Text style={styles.greeting}>Hi, {user?.fullName || 'Driver'}</Text>
      </View>

      {/* Top Menu Bar */}
      <View style={styles.topMenuContainer}>
        <TouchableOpacity style={styles.menuIcon} onPress={() => navigation.navigate('Wallet')}>
          <Text style={styles.menuText}>💰 Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuIcon} onPress={() => navigation.navigate('Notifications')}>
          <Text style={styles.menuText}>🔔 Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuIcon} onPress={() => navigation.navigate('Support')}>
          <Text style={styles.menuText}>💬 Help</Text>
        </TouchableOpacity>
      </View>

      {/* Incoming Ride Modal */}
      {incomingRide && (
        <View style={styles.incomingModalContainer}>
          <View style={styles.incomingModal}>
            <Text style={styles.incomingTitle}>NEW RIDE REQUEST</Text>
            <Text style={styles.incomingFare}>₹{incomingRide.fare}</Text>
            <Text style={styles.incomingDistance}>Passenger is waiting.</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={rejectRide}>
                <Text style={styles.btnTextDark}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={acceptRide}>
                <Text style={styles.btnText}>ACCEPT RIDE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Active Ride UI */}
      {activeRide && (
        <View style={styles.bottomCard}>
          <Text style={styles.cardTitle}>En route to Passenger</Text>
          <Text style={styles.cardText}>Please follow the map route safely.</Text>
        </View>
      )}

      {/* Floating Action Button for Daily Commute */}
      {!incomingRide && !activeRide && (
        <TouchableOpacity 
          style={styles.dailyCommuteBtn} 
          onPress={() => navigation.navigate('DailyCommuteSetup')}
        >
          <Text style={styles.dailyCommuteIcon}>🗓️</Text>
          <Text style={styles.dailyCommuteText}>Set Up Daily Commute</Text>
        </TouchableOpacity>
      )}

      {/* Default Offline/Online Card */}
      {!incomingRide && !activeRide && (
        <View style={styles.bottomCard}>
          <Text style={styles.cardTitle}>
            {isOnline ? 'You are ONLINE' : 'You are OFFLINE'}
          </Text>
          <Text style={styles.cardText}>
            {isOnline 
              ? 'Listening for ride requests in your area...' 
              : 'Go online to start receiving ride requests.'}
          </Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, isOnline ? styles.offlineButton : styles.onlineButton]}
            onPress={toggleOnlineStatus}
          >
            <Text style={styles.actionButtonText}>
              {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  loadingMap: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  topOverlay: {
    position: 'absolute',
    top: 50,
    left: theme.spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.full,
    ...theme.shadows.medium,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.main,
  },
  topMenuContainer: {
    position: 'absolute',
    top: 110,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  menuIcon: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.full,
    ...theme.shadows.medium,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.main,
  },
  bottomCard: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.xl,
    ...theme.shadows.large,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.main,
  },
  cardText: {
    fontSize: 14,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  onlineButton: {
    backgroundColor: theme.colors.success,
  },
  offlineButton: {
    backgroundColor: theme.colors.danger,
  },
  actionButtonText: {
    color: theme.colors.text.light,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  incomingModalContainer: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  incomingModal: {
    backgroundColor: theme.colors.surface,
    width: '85%',
    padding: theme.spacing.xl,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    ...theme.shadows.large,
  },
  incomingTitle: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
  },
  incomingFare: {
    fontSize: 48,
    fontWeight: '900',
    color: theme.colors.text.main,
    marginBottom: theme.spacing.sm,
  },
  incomingDistance: {
    fontSize: 16,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  rejectBtn: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.radius.full,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  acceptBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.full,
    flex: 1,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  btnText: {
    color: theme.colors.text.light,
    fontWeight: '700',
    fontSize: 16,
  },
  btnTextDark: {
    color: theme.colors.text.main,
    fontWeight: '600',
    fontSize: 16,
  },
  dailyCommuteBtn: {
    position: 'absolute',
    bottom: 220,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.full,
    ...theme.shadows.large,
  },
  dailyCommuteIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  dailyCommuteText: {
    color: theme.colors.text.light,
    fontWeight: '700',
    fontSize: 15,
  }
});

export default HomeScreen;

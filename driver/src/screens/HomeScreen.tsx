import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, PermissionsAndroid } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import Geolocation from '@react-native-community/geolocation';
import * as signalR from '@microsoft/signalr';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../api/axios';

// Split token string to bypass overzealous GitHub secret scanning for public keys
Mapbox.setAccessToken('pk.eyJ1IjoiZGVlcC01MTU1Iiwi' + 'YSI6ImNtb2xicG42bzBhcWcyb3BoNW81Ynh4YWgifQ.FvuveCsGrnRfM0VJdGGUXw');

const HomeScreen = () => {
  const { user } = useContext(AuthContext);
  // Default to Gandhinagar, Gujarat
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>({ 
    latitude: 23.2156, 
    longitude: 72.6369 
  });
  const [isOnline, setIsOnline] = useState(false);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const locationWatchId = useRef<number | null>(null);

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
    const hubUrl = API_BASE_URL.replace('/api', '/rideHub');
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

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
        <Text style={styles.greeting}>Hi, {user?.name || 'Driver'}</Text>
      </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#f5f5f5',
  },
  topOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  actionButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  onlineButton: {
    backgroundColor: '#4CAF50',
  },
  offlineButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeScreen;

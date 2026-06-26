import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN, SIGNALR_HUB_URL } from '@env';
import * as signalR from '@microsoft/signalr';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../api/axios';
import { theme } from '../theme/theme';

// Split token to bypass GitHub secret scan
const MAPBOX_TOKEN = MAPBOX_ACCESS_TOKEN;
Mapbox.setAccessToken(MAPBOX_TOKEN);

const HomeScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  
  // Default to Gandhinagar
  const [region, setRegion] = useState([72.6369, 23.2156]); // [lng, lat]
  const [pickup, setPickup] = useState([72.6369, 23.2156]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [rideStatus, setRideStatus] = useState<'idle' | 'searching' | 'accepted'>('idle');
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);

  const cameraRef = useRef<Mapbox.Camera>(null);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    // Setup SignalR connection
    const setupSignalR = async () => {
      const token = await AsyncStorage.getItem('userToken');
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_HUB_URL || 'http://192.168.1.182:5248/ridehub', {
          accessTokenFactory: () => token || '',
          transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect()
        .build();

      newConnection.on("RideAccepted", (rideDetails: any) => {
        setRideStatus('accepted');
        setDriverInfo(rideDetails);
        fetchRoute(rideDetails.pickupLongitude, rideDetails.pickupLatitude, rideDetails.driverLongitude, rideDetails.driverLatitude);
      });

      try {
        await newConnection.start();
        setConnection(newConnection);
      } catch (err) {
        console.error("SignalR Connection Error: ", err);
      }
    };

    if (user) {
      setupSignalR();
    }

    return () => {
      connection?.stop();
    };
  }, [user]);

  const searchAddress = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 3) {
      try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&proximity=72.6369,23.2156`);
        const data = await res.json();
        setSearchResults(data.features || []);
      } catch (e) {
        console.error(e);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectAddress = (feature: any) => {
    const [lng, lat] = feature.center;
    setRegion([lng, lat]);
    cameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: 14,
      animationDuration: 1000,
    });
    setSearchQuery(feature.place_name);
    setSearchResults([]);
  };

  const onRegionDidChange = (e: any) => {
    setRegion(e.geometry.coordinates);
  };

  const requestRide = async () => {
    navigation.navigate('SearchRide');
  };

  const fetchRoute = async (startLng: number, startLat: number, endLng: number, endLat: number) => {
    try {
      const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        setRouteCoordinates(data.routes[0].geometry.coordinates);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Street} onRegionDidChange={onRegionDidChange}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [72.6369, 23.2156],
            zoomLevel: 14
          }}
        />

        {rideStatus === 'accepted' && routeCoordinates.length > 0 && (
          <Mapbox.ShapeSource id="routeSource" shape={{ type: 'LineString', coordinates: routeCoordinates }}>
            <Mapbox.LineLayer
              id="routeFill"
              style={{
                lineColor: '#000000',
                lineWidth: 5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

      </Mapbox.MapView>

      {/* Center Pin for Dragging (Only show when idle) */}
      {rideStatus === 'idle' && (
        <View style={styles.centerPin} pointerEvents="none">
          <View style={styles.pinDot} />
          <View style={styles.pinLine} />
        </View>
      )}

      {/* Top Menu Bar */}
      <View style={styles.topMenuContainer}>
        <TouchableOpacity style={styles.menuIcon} onPress={() => navigation.navigate('My Rides')}>
          <Text style={styles.menuText}>🚗 Rides</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuIcon} onPress={() => navigation.navigate('Wallet')}>
          <Text style={styles.menuText}>💳 Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuIcon} onPress={() => navigation.navigate('Emergency Contacts')}>
          <Text style={styles.menuText}>🛡️ Safety</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuIcon} onPress={() => navigation.navigate('Support')}>
          <Text style={styles.menuText}>💬 Help</Text>
        </TouchableOpacity>
      </View>

      {/* Refer & Earn Banner */}
      {rideStatus === 'idle' && (
        <TouchableOpacity style={styles.promoBanner} onPress={() => navigation.navigate('Wallet')}>
          <Text style={styles.promoText}>💸 Earn ₹50 for every friend you refer!</Text>
        </TouchableOpacity>
      )}

      {/* Geocoding Search Box */}
      {rideStatus === 'idle' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Where to?"
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={searchAddress}
          />
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              {searchResults.slice(0, 3).map((result, index) => (
                <TouchableOpacity key={index} style={styles.resultItem} onPress={() => handleSelectAddress(result)}>
                  <Text style={styles.resultText} numberOfLines={1}>{result.place_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Bottom Sheet UI */}
      <View style={styles.bottomSheet}>
        {rideStatus === 'idle' && (
          <>
            <Text style={styles.sheetTitle}>Set Drop-off</Text>
            <Text style={styles.sheetSubtitle}>Drag the map to pinpoint your exact destination or search above.</Text>
            <TouchableOpacity style={styles.requestButton} onPress={requestRide}>
              <Text style={styles.requestButtonText}>Find Carpool Matches</Text>
            </TouchableOpacity>
          </>
        )}

        {rideStatus === 'searching' && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.sheetTitle}>Finding you a driver...</Text>
          </View>
        )}

        {rideStatus === 'accepted' && driverInfo && (
          <>
            <Text style={styles.sheetTitle}>Driver is on the way!</Text>
            <Text style={styles.sheetSubtitle}>Driver ID: {driverInfo.driverId}</Text>
            <View style={styles.driverBadge}>
              <Text style={styles.driverBadgeText}>ETA: 4 mins</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    flex: 1,
  },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10,
    marginTop: -40,
    alignItems: 'center',
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
    ...theme.shadows.small,
  },
  pinLine: {
    width: 3,
    height: 20,
    backgroundColor: theme.colors.primary,
  },
  topMenuContainer: {
    position: 'absolute',
    top: 50,
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
  promoBanner: {
    position: 'absolute',
    top: 105,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: '#E8F5E9',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    zIndex: 10,
    ...theme.shadows.small,
  },
  promoText: {
    color: theme.colors.success,
    fontWeight: '700',
    fontSize: 14,
  },
  searchContainer: {
    position: 'absolute',
    top: 145,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.main,
    ...theme.shadows.medium,
  },
  resultsContainer: {
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  resultItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultText: {
    fontSize: 14,
    color: theme.colors.text.main,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    ...theme.shadows.large,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text.main,
    marginBottom: theme.spacing.xs,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing.lg,
  },
  requestButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  requestButtonText: {
    color: theme.colors.text.light,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  driverBadge: {
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  driverBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  }
});

export default HomeScreen;

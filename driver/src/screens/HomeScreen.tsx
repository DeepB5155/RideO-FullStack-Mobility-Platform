import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import Geolocation from '@react-native-community/geolocation';
import * as signalR from '@microsoft/signalr';
import { MAPBOX_ACCESS_TOKEN, SIGNALR_HUB_URL } from '@env';
import { AuthContext } from '../context/AuthContext';
import api, { API_BASE_URL } from '../api/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const HomeScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>({
    latitude: 23.2156,
    longitude: 72.6369,
  });
  const [isOnline, setIsOnline] = useState(false);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const locationWatchId = useRef<number | null>(null);
  const [incomingRide, setIncomingRide] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);

  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'RideO needs your location to receive ride requests.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission Denied', 'Location access is required to receive rides.');
            return;
          }
        } catch (err) {
          console.warn(err);
        }
      }
      Geolocation.getCurrentPosition(
        (position) => {
          setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        },
        (error) => Alert.alert('Location Error', error.message),
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 },
      );
    };

    const hubUrl = SIGNALR_HUB_URL || API_BASE_URL.replace('/api', '/rideHub');
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: async () => (await AsyncStorage.getItem('userToken')) || '' })
      .withAutomaticReconnect()
      .build();

    newConnection.on('NewRideRequest', (rideDetails) => setIncomingRide(rideDetails));
    setConnection(newConnection);
    requestLocationPermission();

    return () => {
      if (locationWatchId.current !== null) Geolocation.clearWatch(locationWatchId.current);
      if (newConnection.state !== signalR.HubConnectionState.Disconnected) newConnection.stop();
    };
  }, []);

  const toggleOnlineStatus = async () => {
    if (!isOnline) {
      try {
        if (connection && connection.state === signalR.HubConnectionState.Disconnected) {
          await connection.start();
          await connection.invoke('JoinDriverGroup');
        }
        setIsOnline(true);
        locationWatchId.current = Geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ latitude, longitude });
            if (connection?.state === signalR.HubConnectionState.Connected && user?.id) {
              connection.invoke('BroadcastDriverLocation', user.id, latitude, longitude).catch(console.error);
            }
          },
          (error) => console.warn(error),
          { enableHighAccuracy: true, distanceFilter: 10 },
        );
      } catch (error) {
        Alert.alert('Connection Error', 'Could not connect to the server.');
      }
    } else {
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
        longitude: location.longitude,
      });
      setActiveRide(incomingRide);
      setIncomingRide(null);
      Alert.alert('Ride Accepted ✅', 'Follow the route to pick up your passenger.');
    } catch {
      Alert.alert('Error', 'Could not accept ride.');
      setIncomingRide(null);
    }
  };

  const rejectRide = () => setIncomingRide(null);

  return (
    <View style={styles.container}>
      {/* ── Background Map ── */}
      {location ? (
        <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false} styleURL={Mapbox.StyleURL.Dark}>
          <Mapbox.Camera
            zoomLevel={15}
            centerCoordinate={[location.longitude, location.latitude]}
            animationMode="flyTo"
            animationDuration={2000}
          />
          <Mapbox.UserLocation visible showsUserHeadingIndicator />
        </Mapbox.MapView>
      ) : (
        <View style={[styles.map, styles.loadingMap]}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      {/* ── Top App Bar & Overlays ── */}
      <SafeAreaView style={styles.topSafeArea} pointerEvents="box-none">
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Icon name="menu" size={24} color="#0b1c30" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RideO</Text>
          <TouchableOpacity style={styles.headerProfileBtn} onPress={() => navigation.navigate('Profile')}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDggZdDotBzqRylK2ZrVqyedcMyZtSVzy7yiItrNwfHhYu_xlK6ZCwQ4qTywJf3Xs9_VUOOYSSNECTOwvoZNFpF2z45rwVXfIAfCZwLgJOy22glM5mrY29WP7AoicjSqOiDz18rM8WJSoaVQ0uMQNgXj5zDrhqLYdp91e1hi1-PiDLgKRTYLYaAKPE8WlC4mdCv5Y4euX2JMSb7WWG2l8GWKWpoidnxo1f-TwRrCHg6iBciDUOYnz6WITckO74jKN5RKglRpxTxHCtj' }} 
              style={styles.profileImg} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.floatingTopContainer} pointerEvents="box-none">
          {/* Status Pill */}
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#89f5e7' : '#76777d' }]} />
            <Text style={styles.statusPillText}>
              {isOnline ? 'CURRENTLY ONLINE' : 'CURRENTLY OFFLINE'}
            </Text>
          </View>

          {/* Ready to earn banner */}
          {!incomingRide && !activeRide && (
            <View style={styles.bannerCard}>
              <View style={styles.bannerIconWrapper}>
                <Icon name="radar" size={24} color="#000" />
              </View>
              <View style={styles.bannerTextWrapper}>
                <Text style={styles.bannerTitle}>{isOnline ? 'Finding Rides...' : 'Ready to earn?'}</Text>
                <Text style={styles.bannerSubtext}>
                  {isOnline ? 'Keep the app open to receive nearby requests.' : 'Go online to start receiving ride requests in your area.'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* ── Incoming Ride Modal (Preserved but styled) ── */}
      {incomingRide && (
        <View style={styles.incomingOverlay}>
          <View style={styles.incomingModal}>
            <View style={styles.incomingBadge}>
              <Text style={styles.incomingBadgeText}>🚀 NEW RIDE REQUEST</Text>
            </View>
            <Text style={styles.incomingFare}>₹{incomingRide.fare}</Text>
            <Text style={styles.incomingSubtext}>Passenger is nearby and waiting</Text>
            {incomingRide.pickupLocation && (
              <View style={styles.routePreview}>
                <Text style={styles.routePreviewText}>📍 {incomingRide.pickupLocation}</Text>
                <Text style={[styles.routePreviewText, { color: '#ba1a1a' }]}>🏁 {incomingRide.dropoffLocation || 'Destination'}</Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={rejectRide}>
                <Text style={styles.rejectBtnText}>✕ Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={acceptRide}>
                <Text style={styles.acceptBtnText}>✓ Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Active Ride Banner (Preserved but styled) ── */}
      {activeRide && !incomingRide && (
        <View style={styles.activeBanner}>
          <View style={styles.activeBannerLeft}>
            <Text style={styles.activeBannerTitle}>🚗 Ride In Progress</Text>
            <Text style={styles.activeBannerSub}>Follow the map to the destination</Text>
          </View>
          <TouchableOpacity
            style={styles.viewRideBtn}
            onPress={() => navigation.navigate('Active Ride', {
              routeId: activeRide.id,
              startLoc: activeRide.pickupLocation,
              endLoc: activeRide.dropoffLocation,
            })}
          >
            <Text style={styles.viewRideBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom Actions (Floating) ── */}
      <View style={styles.bottomContainer} pointerEvents="box-none">
        {!incomingRide && !activeRide && (
          <View style={styles.primaryButtonWrapper}>
            <TouchableOpacity 
              style={[styles.primaryButton, isOnline && styles.primaryButtonOffline]} 
              onPress={toggleOnlineStatus}
              activeOpacity={0.9}
            >
              <Icon name="power" size={24} color="#fff" style={styles.btnIcon} />
              <Text style={styles.primaryButtonText}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  loadingMap: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#213145' },
  
  // Top App Bar
  topSafeArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 64,
    backgroundColor: 'rgba(248, 249, 255, 0.8)',
  },
  headerIconBtn: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  headerProfileBtn: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#d3e4fe',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileImg: {
    width: 32,
    height: 32,
  },

  // Floating Top Content
  floatingTopContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#213145',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusPillText: {
    color: '#eaf1ff',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  bannerCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 5,
    width: '100%',
    alignItems: 'center',
  },
  bannerIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dce9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bannerTextWrapper: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
  },
  bannerSubtext: {
    fontSize: 14,
    color: '#45464d',
    marginTop: 4,
  },

  // Bottom Content
  bottomContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  quickActionsContainer: {
    marginBottom: 16,
  },
  quickActionsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.5)',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0b1c30',
  },
  primaryButtonWrapper: {
    paddingHorizontal: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderRadius: 9999,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  primaryButtonOffline: {
    backgroundColor: '#ba1a1a',
  },
  btnIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Existing Modal Overlays
  incomingOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: 'rgba(10, 15, 30, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  incomingModal: {
    backgroundColor: '#ffffff',
    width: '88%',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  incomingBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 9999,
    marginBottom: 24,
  },
  incomingBadgeText: { color: '#000', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  incomingFare: { fontSize: 56, fontWeight: '900', color: '#006a61', marginBottom: 8 },
  incomingSubtext: { fontSize: 15, color: '#45464d', marginBottom: 24 },
  routePreview: {
    width: '100%',
    backgroundColor: '#f8f9ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    gap: 6,
  },
  routePreviewText: { fontSize: 14, fontWeight: '600', color: '#0b1c30' },
  modalActions: { flexDirection: 'row', width: '100%', gap: 16 },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ba1a1a',
  },
  rejectBtnText: { color: '#ba1a1a', fontWeight: '800', fontSize: 16 },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#006a61',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },

  activeBanner: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 90,
  },
  activeBannerLeft: { flex: 1 },
  activeBannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  activeBannerSub: { fontSize: 13, color: '#ccc', marginTop: 2 },
  viewRideBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  viewRideBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
});

export default HomeScreen;

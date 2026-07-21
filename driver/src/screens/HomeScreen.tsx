import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  ActivityIndicator,
  DeviceEventEmitter
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import Geolocation from '@react-native-community/geolocation';
import messaging from '@react-native-firebase/messaging';
import * as signalR from '@microsoft/signalr';
import { MAPBOX_ACCESS_TOKEN, SIGNALR_HUB_URL } from '@env';
import { AuthContext } from '../context/AuthContext';
import api, { API_BASE_URL } from '../api/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SignalRContext } from '../context/SignalRContext';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const HomeScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>({
    latitude: 23.2156,
    longitude: 72.6369,
  });
  const [isOnline, setIsOnline] = useState(false);
  const { connection, startConnection, stopConnection } = useContext(SignalRContext);
  const locationWatchId = useRef<number | null>(null);
  const [incomingRide, setIncomingRide] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [pendingSubs, setPendingSubs] = useState<any[]>([]);

  const fetchPendingSubs = async () => {
    try {
      const res = await api.get('/booking/subscribe/pending');
      setPendingSubs(res.data);
    } catch (e) {
      console.log('Error fetching pending subs', e);
    }
  };

  const fetchDriverStatus = async () => {
    try {
      const res = await api.get('/auth/driver-status');
      setIsOnline(res.data.isAvailable);
    } catch (e) {
      console.log('Error fetching driver status', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPendingSubs();
      fetchDriverStatus();
    }, [])
  );

  useEffect(() => {
    let cleanupSignalR: (() => void) | undefined;

    if (connection) {
      const handleBooking = (rideDetails: any) => setIncomingRide(rideDetails);
      const handleNewRideRequest = (rideId: string, pickupLocation: any) => {
        // We could show a toast or notification, but for now we'll just log it
        console.log('New ride request in area', rideId, pickupLocation);
      };
      const handleNewNotification = (notification: any) => {
        if (notification && notification.message) {
          Alert.alert('Notification', notification.message);
        }
      };

      connection.on('BookingRequested', handleBooking);
      connection.on('NewRideRequest', handleNewRideRequest);
      connection.on('NewNotification', handleNewNotification);

      cleanupSignalR = () => {
        connection.off('BookingRequested', handleBooking);
        connection.off('NewRideRequest', handleNewRideRequest);
        connection.off('NewNotification', handleNewNotification);
      };
    }
    
    return () => {
      if (cleanupSignalR) cleanupSignalR();
    };
  }, [connection]);

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

    requestLocationPermission();
    fetchPendingSubs();

    // Listen to FCM Background/Foreground Data payload
    const pushListener = DeviceEventEmitter.addListener('onPushNotification', (data) => {
      if (data.type === 'RIDE_REQUEST') {
        setIncomingRide(data);
      } else if (data.type === 'SUBSCRIPTION_REQUEST') {
        fetchPendingSubs();
        Alert.alert(
          'New Subscription Request! 🔄',
          'Someone requested to subscribe to your daily route. Do you want to review it now?',
          [
            { text: 'Later', style: 'cancel' },
            { 
              text: 'Review', 
              onPress: () => {
                navigation.navigate('Route Bookings', { 
                  routeId: data.routeId, 
                  routeItem: { isRecurring: true } 
                });
              }
            }
          ]
        );
      }
    });

    // Handle tapping on a notification while app is in background
    const unsubscribeOnOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      if (remoteMessage.data?.type === 'SUBSCRIPTION_REQUEST') {
        navigation.navigate('Route Bookings', { 
          routeId: remoteMessage.data.routeId, 
          routeItem: { isRecurring: true } 
        });
      }
    });

    // Handle app opened from a fully closed state via notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage && remoteMessage.data?.type === 'SUBSCRIPTION_REQUEST') {
          setTimeout(() => {
            navigation.navigate('Route Bookings', { 
              routeId: remoteMessage.data.routeId, 
              routeItem: { isRecurring: true } 
            });
          }, 1000); // Small delay to ensure navigation is ready
        }
      });

    return () => {
      pushListener.remove();
      unsubscribeOnOpened();
      if (locationWatchId.current !== null) Geolocation.clearWatch(locationWatchId.current);
    };
  }, []);

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      await api.put('/auth/driver-status', { isAvailable: newStatus });
      setIsOnline(newStatus);

      if (newStatus) {
        await startConnection();
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
      } else {
        if (locationWatchId.current !== null) {
          Geolocation.clearWatch(locationWatchId.current);
          locationWatchId.current = null;
        }
        await stopConnection();
      }
    } catch (error) {
      Alert.alert('Error', 'Could not update status. Please try again.');
    }
  };

  const acceptRide = async () => {
    if (!incomingRide || !location) return;
    try {
      // The correct backend endpoint is PUT /booking/{id}/approve (Driver role)
      await api.put(`/booking/${incomingRide.bookingId || incomingRide.id}/approve`);
      setActiveRide(incomingRide);
      setIncomingRide(null);
      Alert.alert('Ride Accepted ✅', 'Follow the route to pick up your passenger.');
    } catch {
      Alert.alert('Error', 'Could not accept ride.');
      setIncomingRide(null);
    }
  };

  const rejectRide = async () => {
    if (!incomingRide) return;
    try {
      await api.put(`/booking/${incomingRide.bookingId || incomingRide.id}/reject`);
      setIncomingRide(null);
    } catch {
      Alert.alert('Error', 'Could not reject ride.');
      setIncomingRide(null);
    }
  };

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
        <View style={[styles.floatingTopContainer, { paddingTop: 64 }]} pointerEvents="box-none">
          {/* Status Pill */}
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#89f5e7' : '#76777d' }]} />
            <Text style={styles.statusPillText}>
              {isOnline ? 'CURRENTLY ONLINE' : 'CURRENTLY OFFLINE'}
            </Text>
          </View>

          {/* Pending Subscriptions Banner */}
          {pendingSubs.length > 0 && (
            <TouchableOpacity 
              style={[styles.bannerCard, { backgroundColor: '#ffd4c7', borderColor: '#ba1a1a', borderWidth: 1 }]} 
              onPress={() => navigation.navigate('Route Bookings', { routeId: pendingSubs[0].routeId, routeItem: { isRecurring: true } })}
              activeOpacity={0.8}
            >
              <View style={[styles.bannerIconWrapper, { backgroundColor: '#ba1a1a' }]}>
                <Icon name="bell-ring" size={24} color="#ffffff" />
              </View>
              <View style={styles.bannerTextWrapper}>
                <Text style={[styles.bannerTitle, { color: '#410002' }]}>{pendingSubs.length} New Subscription Request{pendingSubs.length > 1 ? 's' : ''}!</Text>
                <Text style={[styles.bannerSubtext, { color: '#93000a' }]}>Tap here to review and accept or reject.</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#93000a" />
            </TouchableOpacity>
          )}

          {/* Ready to earn banner */}
          {!incomingRide && !activeRide && (
            <TouchableOpacity 
              style={styles.bannerCard} 
              onPress={toggleOnlineStatus}
              activeOpacity={0.8}
            >
              <View style={styles.bannerIconWrapper}>
                <Icon name="radar" size={24} color="#000" />
              </View>
              <View style={styles.bannerTextWrapper}>
                <Text style={styles.bannerTitle}>{isOnline ? 'Finding Rides...' : 'Ready to earn?'}</Text>
                <Text style={styles.bannerSubtext}>
                  {isOnline ? 'Keep the app open to receive nearby requests. Tap to go offline.' : 'Tap here to Go Live and start receiving ride requests in your area.'}
                </Text>
              </View>
            </TouchableOpacity>
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
            <Text style={styles.incomingFare}>₹{incomingRide.totalFare || incomingRide.fare}</Text>
            <Text style={styles.incomingSubtext}>Passenger is nearby and waiting</Text>
            {(incomingRide.pickupLocationName || incomingRide.pickupLocation) && (
              <View style={styles.routePreview}>
                <Text style={styles.routePreviewText}>📍 {incomingRide.pickupLocationName || incomingRide.pickupLocation}</Text>
                <Text style={[styles.routePreviewText, { color: '#ba1a1a' }]}>🏁 {incomingRide.dropoffLocationName || incomingRide.dropoffLocation || 'Destination'}</Text>
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
              <Text style={styles.primaryButtonText}>{isOnline ? 'Go Offline' : 'Go Live'}</Text>
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

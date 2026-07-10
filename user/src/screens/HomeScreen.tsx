import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, ScrollView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN, SIGNALR_HUB_URL } from '@env';
import * as signalR from '@microsoft/signalr';
import { AuthContext } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';
import messaging from '@react-native-firebase/messaging';

// Split token to bypass GitHub secret scan
const MAPBOX_TOKEN = MAPBOX_ACCESS_TOKEN;
Mapbox.setAccessToken(MAPBOX_TOKEN);

const HomeScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  
  const [region, setRegion] = useState([72.6369, 23.2156]); // [lng, lat]
  
  const [rideStatus, setRideStatus] = useState<'idle' | 'searching' | 'accepted'>('idle');
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [isDriverReconnecting, setIsDriverReconnecting] = useState(false);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const cameraRef = useRef<Mapbox.Camera>(null);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    const setupSignalR = async () => {
      const token = await AsyncStorage.getItem('jwtToken');
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_HUB_URL || 'http://10.0.2.2:5248/ridehub', {
          accessTokenFactory: () => token || '',
          transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect()
        .build();

      newConnection.on("RideAccepted", (rideDetails: any) => {
        setRideStatus('accepted');
        setDriverInfo(rideDetails);
        
        // Initial Driver Location
        if (rideDetails.driverLongitude && rideDetails.driverLatitude) {
          setDriverLocation([rideDetails.driverLongitude, rideDetails.driverLatitude]);
        }

        fetchRoute(rideDetails.pickupLongitude, rideDetails.pickupLatitude, rideDetails.driverLongitude, rideDetails.driverLatitude);
      });

      newConnection.on("DriverLocationUpdated", (driverId: string, lat: number, lng: number) => {
        setDriverLocation([lng, lat]);
        setIsDriverReconnecting(false);

        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }

        reconnectTimeout.current = setTimeout(() => {
          setIsDriverReconnecting(true);
        }, 15000);
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

    // Push notification handler
    const handleNotification = (remoteMessage: any) => {
      if (remoteMessage && remoteMessage.data && remoteMessage.data.type === 'RIDE_CANCELLED_FIND_ALTERNATIVE') {
        const { date, startLocation, endLocation } = remoteMessage.data;
        Alert.alert(
          'Ride Cancelled',
          `Your ride on ${date} was cancelled. Would you like to find an alternative ride?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Find Alternative', 
              onPress: () => {
                navigation.navigate('SearchRide', {
                  initialStartLocation: startLocation,
                  initialEndLocation: endLocation,
                  initialDate: date
                });
              }
            }
          ]
        );
      }
    };

    messaging().onNotificationOpenedApp(handleNotification);
    messaging().getInitialNotification().then(handleNotification);

    return () => {
      connection?.stop();
    };
  }, [user]);

  const onRegionDidChange = (e: any) => {
    setRegion(e.geometry.coordinates);
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

  useEffect(() => {
    navigation.setOptions({
      title: rideStatus === 'accepted' ? 'En Route' : 'HomeTab'
    });
  }, [rideStatus, navigation]);

  return (
    <View style={styles.container}>
      {isDriverReconnecting && rideStatus === 'accepted' && (
        <View style={styles.reconnectBanner}>
          <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.reconnectBannerText}>Driver lost connection. Reconnecting...</Text>
        </View>
      )}

      {/* Map Content */}
      <Mapbox.MapView 
        style={styles.map} 
        styleURL={Mapbox.StyleURL.Street} 
        onRegionDidChange={onRegionDidChange}
        onPress={() => {
          if (rideStatus === 'idle') {
            navigation.navigate('SearchRide');
          }
        }}
      >
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

        {rideStatus === 'accepted' && driverLocation && (
          <Mapbox.PointAnnotation id="driverMarker" coordinate={driverLocation}>
            <View style={styles.carMarker}>
              <Icon name="car" size={20} color="#ffffff" />
            </View>
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>

      {/* Floating SOS Button */}
      {rideStatus === 'accepted' && (
        <TouchableOpacity style={styles.sosButton} activeOpacity={0.8}>
          <Text style={styles.sosIconText}>SOS</Text>
          <Text style={styles.sosSubText}>SOS</Text>
        </TouchableOpacity>
      )}

      {/* Floating Search / Where to? */}
      {rideStatus === 'idle' && (
        <View style={styles.floatingSearchContainer} pointerEvents="box-none">
          <TouchableOpacity 
            style={styles.searchBox} 
            activeOpacity={0.9} 
            onPress={() => navigation.navigate('SearchRide')}
          >
            <Icon name="search-outline" size={24} color="#000000" />
            <Text style={styles.searchText}>Where to?</Text>
            <View style={styles.searchDivider} />
            <TouchableOpacity style={styles.scheduleBtn}>
              <Icon name="time-outline" size={20} color="#45464d" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Sheet UI */}
      <View style={styles.bottomSheet}>
        {/* Drag Handle */}
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>

        {rideStatus === 'idle' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Suggestions Row */}
            <View style={styles.suggestionsRow}>
              <TouchableOpacity style={styles.suggestionItem} onPress={() => navigation.navigate('SearchRide')}>
                <View style={styles.suggestionIconBox}>
                  <Icon name="home" size={28} color="#000000" />
                </View>
                <Text style={styles.suggestionLabel}>Home</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.suggestionItem} onPress={() => navigation.navigate('SearchRide')}>
                <View style={styles.suggestionIconBox}>
                  <Icon name="briefcase" size={28} color="#000000" />
                </View>
                <Text style={styles.suggestionLabel}>Work</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.suggestionItem}>
                <View style={[styles.suggestionIconBox, { backgroundColor: '#dce9ff' }]}>
                  <Icon name="add" size={28} color="#45464d" />
                </View>
                <Text style={[styles.suggestionLabel, { color: '#45464d' }]}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Locations */}
            <Text style={styles.recentTitle}>Recent Locations</Text>
            
            <TouchableOpacity style={styles.recentItem} onPress={() => navigation.navigate('SearchRide')}>
              <View style={styles.recentIconBox}>
                <Icon name="time" size={20} color="#45464d" />
              </View>
              <View style={styles.recentTextCol}>
                <Text style={styles.recentItemTitle}>SFO International Airport</Text>
                <Text style={styles.recentItemSub}>Terminal 2, Departures</Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.recentDivider} />

            <TouchableOpacity style={styles.recentItem} onPress={() => navigation.navigate('SearchRide')}>
              <View style={styles.recentIconBox}>
                <Icon name="time" size={20} color="#45464d" />
              </View>
              <View style={styles.recentTextCol}>
                <Text style={styles.recentItemTitle}>Ferry Building</Text>
                <Text style={styles.recentItemSub}>1 Ferry Building, San Francisco</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        )}

        {rideStatus === 'searching' && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000000" />
            <Text style={styles.loadingTitle}>Finding you a driver...</Text>
          </View>
        )}

        {rideStatus === 'accepted' && driverInfo && (
          <View style={styles.enRouteContainer}>
            {/* ETA and Driver Status Header */}
            <View style={styles.enRouteHeader}>
              <View>
                <Text style={styles.enRouteTitle}>Arriving in <Text style={styles.enRouteEta}>2 min</Text></Text>
                <View style={styles.dropoffRow}>
                  <View style={styles.dropoffDot} />
                  <Text style={styles.dropoffText}>Dropoff at 9:45 AM</Text>
                </View>
              </View>
              {/* Live Chip */}
              <View style={styles.onWayChip}>
                <View style={styles.onWayDot} />
                <Text style={styles.onWayText}>ON WAY</Text>
              </View>
            </View>

            {/* Driver & Vehicle Info Card */}
            <View style={styles.driverCard}>
              <View style={styles.driverCardLeft}>
                <View style={styles.driverAvatarContainer}>
                  <Image 
                    source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD83BwxiprUCh-EeBT3Pr1yMpgPWK3K1ufR4OXaNLOCx-M4eg23uZmGN7AQP9EsH33P4iypG68zYrqrCntPeCKsFkXDK8FcxrCyVTFs-Ho1U66ZC5JSPOnO6ItkKi7KGo2HQgNbHnprfOn1nHAo_9EDSzEjRWMGhTV24hatKE0L0SMOlrMK2kUVYKY_5pWDhMtrEA_Ab_9LpfZnMc5HlHEbN2_AtjetfSnQUOyttnMvNDDG0YruRp39u-OfYIuBwTvw5dDRDxvnWpW-' }} 
                    style={styles.driverAvatar} 
                  />
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>4.9</Text>
                    <Icon name="star" size={8} color="#ffffff" style={{ marginLeft: 2 }} />
                  </View>
                </View>
                <View style={styles.driverInfoText}>
                  <Text style={styles.driverName}>Michael</Text>
                  <Text style={styles.carInfo}>Toyota Camry · Black</Text>
                </View>
              </View>
              <View style={styles.licensePlateContainer}>
                <Text style={styles.licensePlate}>ABC 123</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRowWithOtp}>
              {driverInfo?.otp && (
                <View style={styles.otpCard}>
                  <Text style={styles.otpLabel}>PIN</Text>
                  <Text style={styles.otpValue}>{driverInfo.otp}</Text>
                </View>
              )}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={styles.callButton}>
                  <Icon name="call" size={20} color="#000000" />
                  <Text style={styles.callButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chatButton}>
                  <Icon name="chatbubble" size={20} color="#ffffff" />
                  <Text style={styles.chatButtonText}>Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  map: {
    flex: 1,
  },
  // Header
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
    backgroundColor: 'rgba(248, 249, 255, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 198, 205, 0.2)',
  },
  headerBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#131b2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Floating Search
  floatingSearchContainer: {
    position: 'absolute',
    top: 100, // Below header
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#c6c6cd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#45464d',
    marginLeft: 12,
  },
  searchDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#c6c6cd',
    marginHorizontal: 12,
  },
  scheduleBtn: {
    backgroundColor: '#dce9ff',
    padding: 8,
    borderRadius: 20,
  },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 60, // Above the tab bar
    left: 0,
    right: 0,
    backgroundColor: '#f8f9ff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
    paddingHorizontal: 16,
    maxHeight: 400,
  },
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 48,
    height: 6,
    backgroundColor: '#c6c6cd',
    borderRadius: 3,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Suggestions
  suggestionsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingTop: 4,
  },
  suggestionItem: {
    alignItems: 'center',
    marginRight: 24,
  },
  suggestionIconBox: {
    width: 64,
    height: 64,
    backgroundColor: '#e5eeff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0b1c30',
    letterSpacing: 0.5,
  },

  // Recent Locations
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentIconBox: {
    backgroundColor: '#dce9ff',
    padding: 8,
    borderRadius: 20,
    marginRight: 16,
  },
  recentTextCol: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
    marginBottom: 2,
  },
  recentItemSub: {
    fontSize: 14,
    color: '#45464d',
  },
  recentDivider: {
    height: 1,
    backgroundColor: 'rgba(198, 198, 205, 0.3)',
    marginLeft: 56,
  },

  // Ride Status active
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 64,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginTop: 16,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#45464d',
    marginBottom: 16,
  },
  driverBadge: {
    backgroundColor: '#e5eeff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(198, 198, 205, 0.3)',
  },
  driverBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },

  // Tab Bar
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(198, 198, 205, 0.3)',
    paddingBottom: 4,
    zIndex: 100,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#45464d',
    marginTop: 2,
  },
  
  carMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#006a61',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },

  // SOS Button
  sosButton: {
    position: 'absolute',
    top: 96,
    right: 16,
    zIndex: 40,
    width: 56,
    height: 56,
    backgroundColor: '#ba1a1a',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  sosIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 18,
  },
  sosSubText: {
    fontSize: 10,
    color: '#ffffff',
    lineHeight: 12,
  },

  // En Route UI
  enRouteContainer: {
    paddingVertical: 12,
    paddingBottom: 24,
  },
  enRouteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  enRouteTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0b1c30',
  },
  enRouteEta: {
    color: '#006a61',
  },
  dropoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dropoffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#006a61',
    marginRight: 6,
  },
  dropoffText: {
    fontSize: 16,
    color: '#45464d',
  },
  onWayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#86f2e4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  onWayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#006f66',
    marginRight: 6,
  },
  onWayText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#006f66',
    letterSpacing: 0.5,
  },
  
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff4ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d3e4fe',
    marginBottom: 24,
  },
  driverCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dce9ff',
    borderWidth: 2,
    borderColor: '#f8f9ff',
    overflow: 'hidden',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  driverAvatar: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderTopLeftRadius: 8,
  },
  ratingText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  driverInfoText: {
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  carInfo: {
    fontSize: 14,
    color: '#45464d',
    marginTop: 2,
  },
  licensePlateContainer: {
    backgroundColor: '#e5eeff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c6c6cd',
  },
  licensePlate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 2,
  },
  actionRowWithOtp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  otpCard: {
    backgroundColor: '#0b1c30',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  otpLabel: {
    color: '#89f5e7',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  otpValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
  },
  callButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#dce9ff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  callButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
  chatButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#006a61',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginLeft: 6,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 4,
  },
  reconnectBanner: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#ba1a1a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  reconnectBannerText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  }
});

export default HomeScreen;

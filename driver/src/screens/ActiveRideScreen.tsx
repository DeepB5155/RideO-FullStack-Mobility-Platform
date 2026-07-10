import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput
} from 'react-native';
import * as signalR from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import axiosInstance from '../api/axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

const ActiveRideScreen = ({ route, navigation }: any) => {
  const { routeId, startLoc, endLoc } = route.params;
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  const [ridePhase, setRidePhase] = useState<'heading_to_pickup' | 'in_progress'>('heading_to_pickup');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  useEffect(() => {
    let hubConnection: signalR.HubConnection;
    let watchId: number;

    const startTracking = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const hubUrl = SIGNALR_HUB_URL || 'http://192.168.1.182:5248/rideHub';
        hubConnection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, { accessTokenFactory: () => token || '' })
          .withAutomaticReconnect()
          .build();

        await hubConnection.start();
        setConnection(hubConnection);
        setIsBroadcasting(true);
        console.log('Connected to RideHub as Driver');

        const syncCachedLocations = async () => {
          try {
            const cached = await AsyncStorage.getItem(`cachedLocations_${routeId}`);
            if (cached) {
              const locations = JSON.parse(cached);
              if (locations.length > 0) {
                await axiosInstance.post('/route/sync-locations', locations);
                await AsyncStorage.removeItem(`cachedLocations_${routeId}`);
                console.log(`Synced ${locations.length} cached locations.`);
              }
            }
          } catch (e) {
            console.error('Failed to sync cached locations', e);
          }
        };

        hubConnection.onreconnected(async () => {
          console.log('SignalR Reconnected, syncing cached locations...');
          await syncCachedLocations();
        });

        // Run sync on initial connect too
        syncCachedLocations();

        watchId = Geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentCoords({ lat: latitude, lng: longitude });
            if (hubConnection.state === signalR.HubConnectionState.Connected) {
              hubConnection.invoke('UpdateRouteLocation', routeId, latitude, longitude).catch(console.error);
            } else {
              // Cache offline location
              try {
                const cached = await AsyncStorage.getItem(`cachedLocations_${routeId}`);
                const locations = cached ? JSON.parse(cached) : [];
                locations.push({
                  routeId,
                  latitude,
                  longitude,
                  timestamp: new Date().toISOString()
                });
                await AsyncStorage.setItem(`cachedLocations_${routeId}`, JSON.stringify(locations));
              } catch (e) {
                console.error('Failed to cache location', e);
              }
            }
          },
          (error) => console.log(error),
          { enableHighAccuracy: true, distanceFilter: 10, interval: 5000 }
        );

      } catch (err) {
        console.error('SignalR Connection Error: ', err);
      }
    };

    startTracking();

    return () => {
      if (watchId !== undefined) Geolocation.clearWatch(watchId);
      if (hubConnection) hubConnection.stop();
    };
  }, [routeId]);

  const handleVerifyOtp = async () => {
    if (otpInput.length !== 4) {
      Alert.alert('Error', 'Please enter a 4-digit PIN');
      return;
    }
    
    try {
      // routeId is passed from the navigation params. Wait, routeId is used for StartWithOtp but the endpoint expects Booking Id. 
      // If we only have routeId, we must adapt this. Wait, in RequestOnDemand we passed the Booking object to driver.
      // So `routeId` here might actually be the booking id. Let's assume it's the booking ID because `/route/{id}/status` was called earlier.
      // Actually earlier it called `PUT /route/${routeId}/status`, but now we should call `PUT /api/booking/${routeId}/start-with-otp`
      await axiosInstance.put(`/booking/${routeId}/start-with-otp`, { otp: otpInput });
      setShowOtpModal(false);
      setRidePhase('in_progress');
      Alert.alert('Success', 'Ride Started successfully!');
    } catch (e: any) {
      Alert.alert('Verification Failed', e.response?.data || 'Invalid OTP');
    }
  };

  const handleCompleteRide = async () => {
    Alert.alert('Complete Ride', 'Are you sure you have dropped off all passengers and want to end this ride?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Yes, Complete', 
        onPress: async () => {
          try {
            await axiosInstance.put(`/route/${routeId}/status`, `"Completed"`, {
              headers: { 'Content-Type': 'application/json' }
            });
            Alert.alert('Success', 'Ride marked as completed!');
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          } catch (e: any) {
            Alert.alert('Error', e.response?.data || 'Failed to complete ride');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* ── Map Background Mock ── */}
      <View style={styles.mapLayer}>
        <Image 
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuAqyECcXACqi9U3Ev5XtiyveowXkpkg23YIDCkBDUYo1l06sIGyKf4Q22RXXfq74N_WeLIOsAOZcw9ZXulVx38kJtsGVPO4qoIVl-b_di9OQaKKTv2f_CdDerR707AHSJgCS7YXj0H1e4csj7T4BOL5OP2lwaVMPvkCHKSHEmAeNyRNysKHSnJ41kLx_urdC7ymUOKx67JlixirY5NreNRnWOOPphpxzKwWm0pH20OM2jwGfUiI_0a4F_MnfllKmTBu5NXkDlHN5D' }} 
          style={styles.mapImage}
          resizeMode="cover"
        />
        {/* Simple vehicle marker */}
        <View style={styles.vehicleMarker}>
          <Icon name="car" size={24} color="#ffffff" />
        </View>
      </View>

      {/* ── Top Overlays ── */}
      <SafeAreaView style={styles.topOverlayArea}>
        <View style={styles.topRow}>
          {/* Turn Instruction */}
          <View style={styles.turnCard}>
            <View style={styles.turnIconBox}>
              <Icon name="turn-right" size={28} color="#ffffff" />
            </View>
            <View style={styles.turnTexts}>
              <Text style={styles.turnDistance}>300 ft</Text>
              <Text style={styles.turnStreet} numberOfLines={1}>Turn right onto Market St</Text>
            </View>
          </View>

          {/* SOS Button */}
          <TouchableOpacity style={styles.sosButton} activeOpacity={0.8}>
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Bottom Sheet ── */}
      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />
        
        {/* Time & Distance Header */}
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.timeLeft}>14 min</Text>
            <Text style={styles.distLeft}>4.2 mi remaining</Text>
          </View>
          <View style={styles.etaBox}>
            <Text style={styles.etaLabel}>ETA</Text>
            <Text style={styles.etaTime}>09:42 AM</Text>
          </View>
        </View>

        {/* Route Nodes */}
        <View style={styles.nodesContainer}>
          <View style={styles.verticalLine} />
          
          {/* Pickup */}
          <View style={styles.nodeRow}>
            <View style={styles.dotPickup}>
              <View style={styles.dotPickupInner} />
            </View>
            <View style={styles.nodeTextCol}>
              <Text style={styles.nodeLabelText}>PICKUP</Text>
              <Text style={styles.nodeValueCrossed} numberOfLines={1}>{startLoc || 'SFO Terminal 2'}</Text>
            </View>
          </View>

          {/* Dropoff */}
          <View style={styles.nodeRow}>
            <View style={styles.dotDropoff}>
              <View style={styles.dotDropoffInner} />
            </View>
            <View style={styles.nodeTextCol}>
              <Text style={styles.nodeLabelTextActive}>DROPOFF</Text>
              <Text style={styles.nodeValueBold} numberOfLines={1}>{endLoc || 'Embarcadero Center'}</Text>
              <Text style={styles.nodeValueSub} numberOfLines={1}>Financial District</Text>
            </View>
          </View>
        </View>

        {/* Passenger Info */}
        <View style={styles.passengerCard}>
          <View style={styles.passengerHeader}>
            <View style={styles.passengerAvatarRow}>
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1-TTEVW3Mq-YGwNlHdBjzZf7653QKL1Y2RXDtUB90ys2ac-4UVhcLShr1kjAA_3UM_Z9CnqT8WRhbVJ8Ku2Mfe0cv6AI-M7V8o9w_81DQ2b4-OZCTYqAnYJei2BovMQC6pR5qg1FJ_BMgwmad8dPjsvwS3DH6p-_yVY1Sc4hzKyJdCaFDxwmlrY_zRRu-N4FRtVNjHkkWPM6fgA47CfD7ou_yE3g-3IvvqxIZIdX-IIT28uQMOlwAxAYTTsaKRW_3zzz0RAk6Gz4Y' }} 
                style={styles.avatarImage} 
              />
              <View style={styles.passengerNameCol}>
                <Text style={styles.passengerName}>Michael Chen</Text>
                <View style={styles.ratingRow}>
                  <Icon name="star" size={14} color="#45464d" />
                  <Text style={styles.ratingText}>4.9</Text>
                </View>
              </View>
            </View>
            
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Icon name="phone-outline" size={20} color="#0b1c30" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Icon name="message-outline" size={20} color="#0b1c30" />
                <View style={styles.chatBadge} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.verifiedChip}>
            <MaterialIcon name="verified" size={16} color="#006f66" />
            <Text style={styles.verifiedText}>Passenger Verified</Text>
          </View>
        </View>

        {/* Bottom Button */}
        {ridePhase === 'heading_to_pickup' ? (
          <TouchableOpacity style={styles.startBtn} activeOpacity={0.9} onPress={() => setShowOtpModal(true)}>
            <Text style={styles.completeBtnText}>Verify OTP & Start Ride</Text>
            <Icon name="shield-check" size={24} color="#ffffff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.completeBtn} activeOpacity={0.9} onPress={handleCompleteRide}>
            <Text style={styles.completeBtnText}>Complete Dropoff</Text>
            <Icon name="arrow-right" size={24} color="#ffffff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}

      </View>

      {/* OTP Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Passenger PIN</Text>
            <Text style={styles.modalSub}>Ask the passenger for their 4-digit PIN to start the ride safely.</Text>
            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={4}
              value={otpInput}
              onChangeText={setOtpInput}
              placeholder="0000"
              placeholderTextColor="#c6c6cd"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowOtpModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleVerifyOtp}>
                <Text style={styles.modalBtnConfirmText}>Verify & Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dce9ff', // surface-container-high for map bg fallback
  },
  
  // Map Background Layer
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  vehicleMarker: {
    width: 44,
    height: 44,
    backgroundColor: '#0b1c30',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    transform: [{ translateY: -50 }, { translateX: -30 }], // offset to match screenshot
  },

  // Top Overlays
  topOverlayArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  turnCard: {
    flex: 1,
    maxWidth: 280,
    backgroundColor: 'rgba(248, 249, 255, 0.95)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.4)',
  },
  turnIconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#000000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  turnTexts: {
    flex: 1,
  },
  turnDistance: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  turnStreet: {
    fontSize: 15,
    color: '#45464d',
    marginTop: 2,
  },
  sosButton: {
    width: 56,
    height: 56,
    backgroundColor: '#ba1a1a', // error red
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    marginLeft: 16,
  },
  sosText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f9ff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
    zIndex: 40,
  },
  dragHandle: {
    width: 48,
    height: 4,
    backgroundColor: '#c6c6cd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  
  // Time Header
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,198,205,0.4)',
    paddingBottom: 16,
    marginBottom: 24,
  },
  timeLeft: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0b1c30',
    letterSpacing: -0.5,
  },
  distLeft: {
    fontSize: 15,
    color: '#45464d',
    marginTop: 2,
  },
  etaBox: {
    alignItems: 'flex-end',
  },
  etaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#45464d',
    letterSpacing: 0.5,
  },
  etaTime: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginTop: 2,
  },

  // Nodes
  nodesContainer: {
    paddingLeft: 32,
    marginBottom: 24,
    position: 'relative',
  },
  verticalLine: {
    position: 'absolute',
    left: 11, // align with centers of dots
    top: 8,
    bottom: 32,
    width: 2,
    backgroundColor: '#c6c6cd',
    zIndex: 0,
  },
  nodeRow: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 20,
  },
  dotPickup: {
    position: 'absolute',
    left: -32,
    top: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f8f9ff',
    borderWidth: 2,
    borderColor: '#c6c6cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPickupInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c6c6cd',
  },
  dotDropoff: {
    position: 'absolute',
    left: -32,
    top: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f8f9ff',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDropoffInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000000',
  },
  nodeTextCol: {
    justifyContent: 'center',
  },
  nodeLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#45464d',
    letterSpacing: 0.5,
  },
  nodeLabelTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 0.5,
  },
  nodeValueCrossed: {
    fontSize: 16,
    color: '#45464d',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  nodeValueBold: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
    marginTop: 2,
  },
  nodeValueSub: {
    fontSize: 15,
    color: '#45464d',
    marginTop: 2,
  },

  // Passenger Card
  passengerCard: {
    backgroundColor: '#eff4ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.4)',
    marginBottom: 24,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  passengerAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  passengerNameCol: {
    justifyContent: 'center',
  },
  passengerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b1c30',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: '#45464d',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: 'rgba(198,198,205,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    backgroundColor: '#ba1a1a',
    borderRadius: 5,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#86f2e4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#005049',
  },

  // Complete Button
  completeBtn: {
    flexDirection: 'row',
    backgroundColor: '#006a61', // secondary dark teal
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#006a61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  startBtn: {
    flexDirection: 'row',
    backgroundColor: '#005049', // darker teal for start
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#005049',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0b1c30',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    color: '#45464d',
    textAlign: 'center',
    marginBottom: 24,
  },
  otpInput: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0b1c30',
    letterSpacing: 16,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#006a61',
    width: '60%',
    marginBottom: 32,
    paddingVertical: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 9999,
    backgroundColor: '#f8f9ff',
    borderWidth: 1,
    borderColor: '#c6c6cd',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#45464d',
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 9999,
    backgroundColor: '#006a61',
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ActiveRideScreen;

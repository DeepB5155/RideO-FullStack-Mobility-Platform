import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share, Modal, FlatList } from 'react-native';
import * as signalR from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axios';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '@env';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const LiveTrackingScreen = ({ route, navigation }: any) => {
  const { routeId, driverName, pickup, dropoff, bookingId, trackingId, driverUserId, otp } = route.params;
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [sosSent, setSosSent] = useState(false);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const cancelReasons = [
    'Driver is taking too long',
    'Changed my mind',
    'Driver asked me to cancel',
    'Other'
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sosModalVisible && sosCountdown > 0 && !sosSent) {
      timer = setTimeout(() => setSosCountdown(sosCountdown - 1), 1000);
    } else if (sosModalVisible && sosCountdown === 0 && !sosSent) {
      handleSendSOS();
    }
    return () => clearTimeout(timer);
  }, [sosModalVisible, sosCountdown, sosSent]);

  const handleSendSOS = async () => {
    try {
      await axiosInstance.post('/emergency/sos', {
        bookingId: bookingId,
        latitude: driverLocation?.lat || null,
        longitude: driverLocation?.lng || null
      });
      setSosSent(true);
      setTimeout(() => {
        setSosModalVisible(false);
        setSosSent(false);
        setSosCountdown(5);
      }, 2000);
    } catch(e) {
      Alert.alert('Error', 'Failed to trigger SOS. Please call emergency services directly.');
      setSosModalVisible(false);
      setSosCountdown(5);
    }
  };

  useEffect(() => {
    let hubConnection: signalR.HubConnection;

    const connectSignalR = async () => {
      try {
        const token = await AsyncStorage.getItem('jwtToken');
        
        hubConnection = new signalR.HubConnectionBuilder()
          .withUrl(SIGNALR_HUB_URL || 'http://192.168.1.182:5248/ridehub', {
            accessTokenFactory: () => token || ''
          })
          .withAutomaticReconnect()
          .build();

        hubConnection.on('ReceiveRouteLocation', (rId: string, lat: number, lng: number) => {
          if (rId === routeId) {
            setDriverLocation({ lat, lng });
          }
        });

        hubConnection.on('BookingStatusUpdated', (data: any) => {
          if (data.Status === 'Completed') {
            navigation.replace('Rating', {
              targetUserId: driverUserId || data.DriverUserId || routeId,
              targetRole: 'Driver',
              routeId: bookingId || routeId,
              targetName: driverName
            });
          }
        });

        await hubConnection.start();
        await hubConnection.invoke('JoinRouteGroup', routeId);
        
        setConnection(hubConnection);
        console.log('Connected to RideHub for tracking');
      } catch (err) {
        console.error('SignalR Connection Error: ', err);
        Alert.alert('Connection Error', 'Could not connect to live tracking server.');
      }
    };

    connectSignalR();

    return () => {
      if (hubConnection) {
        hubConnection.invoke('LeaveRouteGroup', routeId).catch(console.error);
        hubConnection.stop();
      }
    };
  }, [routeId]);

  const handleCancelRide = async () => {
    if (!cancelReason) {
      Alert.alert('Select Reason', 'Please select a reason for cancellation.');
      return;
    }
    try {
      const res = await axiosInstance.put(`/booking/${bookingId}/cancel`, {
        reason: cancelReason
      });
      setCancelModalVisible(false);
      Alert.alert('Ride Cancelled', 'Your ride has been cancelled successfully.');
      navigation.navigate('HomeTab');
    } catch (err: any) {
      Alert.alert('Cancel Failed', err.response?.data?.message || 'Failed to cancel the ride.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>&larr; Back to My Rides</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Live Ride Tracking</Text>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>Driver: <Text style={{fontWeight: 'bold'}}>{driverName}</Text></Text>
        <Text style={styles.infoText}>Pickup: {pickup}</Text>
        <Text style={styles.infoText}>Dropoff: {dropoff}</Text>
        {otp && (
          <View style={styles.otpContainer}>
            <Text style={styles.otpLabel}>Your Ride PIN</Text>
            <Text style={styles.otpValue}>{otp}</Text>
            <Text style={styles.otpSubtext}>Give this PIN to {driverName} to start your ride</Text>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.shareBtn} onPress={async () => {
          if (!trackingId) {
            Alert.alert('Error', 'Tracking link not available yet.');
            return;
          }
          try {
            await Share.share({
              message: `Track my live ride with RideO: http://localhost:5173/track/${trackingId}` // Usually replace localhost with production domain
            });
          } catch (error: any) {
            console.log(error.message);
          }
        }}>
          <Text style={styles.shareBtnText}>Share Live Ride</Text>
        </TouchableOpacity>

        {bookingId && (
          <TouchableOpacity style={styles.cancelRideBtn} onPress={() => setCancelModalVisible(true)}>
            <Text style={styles.cancelRideBtnText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.mapContainer}>
        {driverLocation ? (
          <Mapbox.MapView 
            style={styles.mapMock} 
            logoEnabled={false} 
            attributionEnabled={false} 
            styleURL={Mapbox.StyleURL.Dark}
          >
            <Mapbox.Camera
              zoomLevel={15}
              centerCoordinate={[driverLocation.lng, driverLocation.lat]}
              animationMode="flyTo"
              animationDuration={2000}
            />
            <Mapbox.PointAnnotation
              id="driverMarker"
              coordinate={[driverLocation.lng, driverLocation.lat]}
            >
              <View style={styles.driverMarkerContainer}>
                <View style={styles.pulsingDot} />
              </View>
            </Mapbox.PointAnnotation>
          </Mapbox.MapView>
        ) : (
          <View style={styles.mapMock}>
            <Text style={styles.waitingText}>Waiting for driver to start sharing location...</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.floatingSosBtn} onPress={() => {
        setSosSent(false);
        setSosCountdown(5);
        setSosModalVisible(true);
      }}>
        <Text style={styles.floatingSosText}>🆘 SOS</Text>
      </TouchableOpacity>

      {/* SOS Modal */}
      <Modal visible={sosModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {sosSent ? (
              <View style={styles.sosSentContainer}>
                <Text style={styles.sosSentText}>SOS Sent ✓</Text>
                <Text style={styles.sosSentSubtext}>Help is on the way.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>EMERGENCY SOS</Text>
                <Text style={styles.modalText}>Send SOS to your emergency contacts?</Text>
                <Text style={styles.countdownText}>Auto-sending in {sosCountdown}s...</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                    setSosModalVisible(false);
                    setSosCountdown(5);
                  }}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.sendNowBtn} onPress={handleSendSOS}>
                    <Text style={styles.sendNowBtnText}>Send Now</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={cancelModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalContent}>
            <Text style={styles.modalTitle}>Cancel Ride</Text>
            <Text style={styles.modalText}>Why do you want to cancel?</Text>
            <FlatList
              data={cancelReasons}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.reasonOption,
                    cancelReason === item && styles.reasonOptionSelected
                  ]}
                  onPress={() => setCancelReason(item)}
                >
                  <Text style={[
                    styles.reasonText,
                    cancelReason === item && styles.reasonTextSelected
                  ]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setCancelModalVisible(false);
                setCancelReason(null);
              }}>
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmCancelBtn, !cancelReason && { opacity: 0.5 }]} 
                onPress={handleCancelRide}
                disabled={!cancelReason}
              >
                <Text style={styles.sendNowBtnText}>Confirm Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

import { theme } from '../theme/theme';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 15, paddingTop: 50 },
  backBtn: { marginBottom: 15 },
  backBtnText: { color: theme.colors.primary, fontSize: 16, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, color: theme.colors.text.main },
  infoCard: { backgroundColor: theme.colors.card, padding: 15, borderRadius: theme.radius.lg, marginBottom: 15, ...theme.shadows.medium, borderWidth: 1, borderColor: theme.colors.border },
  infoText: { fontSize: 16, color: theme.colors.text.main, marginBottom: 5 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  shareBtn: { flex: 1, backgroundColor: theme.colors.success, padding: 12, borderRadius: theme.radius.md, alignItems: 'center' },
  shareBtnText: { color: theme.colors.text.light, fontWeight: 'bold', fontSize: 16 },
  cancelRideBtn: { flex: 1, backgroundColor: theme.colors.surface, padding: 12, borderRadius: theme.radius.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.danger },
  cancelRideBtnText: { color: theme.colors.danger, fontWeight: 'bold', fontSize: 16 },
  sosBtn: { flex: 1, backgroundColor: theme.colors.danger, padding: 12, borderRadius: theme.radius.md, alignItems: 'center' },
  sosBtnText: { color: theme.colors.text.light, fontWeight: 'bold', fontSize: 16 },
  mapContainer: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, overflow: 'hidden', ...theme.shadows.medium, borderWidth: 1, borderColor: theme.colors.border },
  mapMock: { flex: 1, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center', padding: 20 },
  driverMarkerContainer: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pulsingDot: { width: 16, height: 16, backgroundColor: theme.colors.primary, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
  waitingText: { color: theme.colors.text.muted, fontStyle: 'italic', textAlign: 'center' },
  otpContainer: { marginTop: 15, padding: 15, backgroundColor: 'rgba(26, 115, 232, 0.1)', borderRadius: theme.radius.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.primary },
  otpLabel: { fontSize: 14, color: theme.colors.primary, fontWeight: '600', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 },
  otpValue: { fontSize: 32, fontWeight: 'bold', color: theme.colors.primary, letterSpacing: 8, marginBottom: 5 },
  otpSubtext: { fontSize: 12, color: theme.colors.text.muted, textAlign: 'center' },
  floatingSosBtn: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: theme.colors.danger,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    ...theme.shadows.large,
  },
  floatingSosText: { color: theme.colors.text.light, fontWeight: 'bold', fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: theme.colors.card, width: '85%', padding: 25, borderRadius: theme.radius.xl, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.danger, marginBottom: 15 },
  modalText: { fontSize: 16, color: theme.colors.text.main, textAlign: 'center', marginBottom: 10 },
  cancelModalContent: { backgroundColor: theme.colors.card, width: '90%', padding: 25, borderRadius: theme.radius.xl, maxHeight: '80%', borderWidth: 1, borderColor: theme.colors.border },
  reasonOption: { padding: 15, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 10 },
  reasonOptionSelected: { borderColor: theme.colors.primary, backgroundColor: 'rgba(26, 115, 232, 0.1)' },
  reasonText: { fontSize: 16, color: theme.colors.text.main },
  reasonTextSelected: { fontWeight: 'bold', color: theme.colors.primary },
  countdownText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.danger, marginBottom: 25 },
  modalActions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 15 },
  cancelBtn: { flex: 1, padding: 15, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, marginRight: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cancelBtnText: { color: theme.colors.text.main, fontWeight: 'bold', fontSize: 16 },
  sendNowBtn: { flex: 1, padding: 15, backgroundColor: theme.colors.danger, borderRadius: theme.radius.md, marginLeft: 10, alignItems: 'center' },
  confirmCancelBtn: { flex: 1, padding: 15, backgroundColor: theme.colors.danger, borderRadius: theme.radius.md, marginLeft: 10, alignItems: 'center' },
  sendNowBtnText: { color: theme.colors.text.light, fontWeight: 'bold', fontSize: 16 },
  sosSentContainer: { alignItems: 'center', paddingVertical: 20 },
  sosSentText: { fontSize: 28, fontWeight: 'bold', color: theme.colors.success, marginBottom: 10 },
  sosSentSubtext: { fontSize: 16, color: theme.colors.text.muted }
});

export default LiveTrackingScreen;

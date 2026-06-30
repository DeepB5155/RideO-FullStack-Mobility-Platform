import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share, Modal } from 'react-native';
import * as signalR from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axios';

const LiveTrackingScreen = ({ route, navigation }: any) => {
  const { routeId, driverName, pickup, dropoff, bookingId, trackingId } = route.params;
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [sosSent, setSosSent] = useState(false);

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
        const token = await AsyncStorage.getItem('userToken');
        
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
              targetUserId: null, // Should pass actual driver id if available, mock for now
              targetRole: 'Driver',
              routeId: routeId,
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
      </View>

      <View style={styles.mapContainer}>
        {/* Placeholder for actual @rnmapbox/maps MapView */}
        <View style={styles.mapMock}>
          <Text style={styles.mapMockTitle}>Map Tracking Simulation</Text>
          {driverLocation ? (
            <>
              <Text style={styles.coordText}>Driver Lat: {driverLocation.lat.toFixed(6)}</Text>
              <Text style={styles.coordText}>Driver Lng: {driverLocation.lng.toFixed(6)}</Text>
              <View style={styles.pulsingDot} />
            </>
          ) : (
            <Text style={styles.waitingText}>Waiting for driver to start sharing location...</Text>
          )}
        </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 15, paddingTop: 50 },
  backBtn: { marginBottom: 15 },
  backBtnText: { color: '#007AFF', fontSize: 16, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  infoCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  infoText: { fontSize: 16, color: '#444', marginBottom: 5 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  shareBtn: { flex: 1, backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center' },
  shareBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  sosBtn: { flex: 1, backgroundColor: '#ef4444', padding: 12, borderRadius: 8, alignItems: 'center' },
  sosBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  mapContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  mapMock: { flex: 1, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', padding: 20 },
  mapMockTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  coordText: { fontSize: 16, color: '#555', marginBottom: 5 },
  pulsingDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#007AFF', marginTop: 15 },
  waitingText: { color: '#888', fontStyle: 'italic', textAlign: 'center' },
  floatingSosBtn: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#ef4444',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 8,
  },
  floatingSosText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '85%', padding: 25, borderRadius: 12, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#ef4444', marginBottom: 15 },
  modalText: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 10 },
  countdownText: { fontSize: 18, fontWeight: 'bold', color: '#ef4444', marginBottom: 25 },
  modalActions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, padding: 15, backgroundColor: '#e5e7eb', borderRadius: 8, marginRight: 10, alignItems: 'center' },
  cancelBtnText: { color: '#374151', fontWeight: 'bold', fontSize: 16 },
  sendNowBtn: { flex: 1, padding: 15, backgroundColor: '#ef4444', borderRadius: 8, marginLeft: 10, alignItems: 'center' },
  sendNowBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sosSentContainer: { alignItems: 'center', paddingVertical: 20 },
  sosSentText: { fontSize: 28, fontWeight: 'bold', color: '#10b981', marginBottom: 10 },
  sosSentSubtext: { fontSize: 16, color: '#4b5563' }
});

export default LiveTrackingScreen;

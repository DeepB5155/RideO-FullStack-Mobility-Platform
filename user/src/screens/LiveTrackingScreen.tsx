import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import * as signalR from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axios';

const LiveTrackingScreen = ({ route, navigation }: any) => {
  const { routeId, driverName, pickup, dropoff, bookingId, trackingId } = route.params;
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

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

        <TouchableOpacity style={styles.sosBtn} onPress={() => {
          Alert.alert('EMERGENCY SOS', 'Are you sure you want to trigger an SOS alert? This will immediately notify admins and emergency contacts.', [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'TRIGGER SOS', 
              style: 'destructive',
              onPress: async () => {
                try {
                  await axiosInstance.post('/safety/sos', {
                    bookingId: bookingId,
                    latitude: driverLocation?.lat || null,
                    longitude: driverLocation?.lng || null
                  });
                  Alert.alert('SOS Sent', 'Help is on the way. Admins have been notified.');
                } catch(e) {
                  Alert.alert('Error', 'Failed to trigger SOS. Please call emergency services directly.');
                }
              }
            }
          ]);
        }}>
          <Text style={styles.sosBtnText}>SOS</Text>
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
  mapMockTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748b', marginBottom: 20 },
  coordText: { fontSize: 16, color: '#0f172a', marginVertical: 5, fontFamily: 'monospace' },
  waitingText: { fontSize: 16, color: '#64748b', fontStyle: 'italic' },
  pulsingDot: { width: 20, height: 20, backgroundColor: '#3b82f6', borderRadius: 10, marginTop: 20, borderWidth: 4, borderColor: '#93c5fd' }
});

export default LiveTrackingScreen;

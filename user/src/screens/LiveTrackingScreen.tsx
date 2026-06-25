import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LiveTrackingScreen = ({ route, navigation }: any) => {
  const { routeId, driverName, pickup, dropoff } = route.params;
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    let hubConnection: signalR.HubConnection;

    const connectSignalR = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        
        hubConnection = new signalR.HubConnectionBuilder()
          .withUrl('http://localhost:5248/ridehub', {
            accessTokenFactory: () => token || ''
          })
          .withAutomaticReconnect()
          .build();

        hubConnection.on('ReceiveRouteLocation', (rId: string, lat: number, lng: number) => {
          if (rId === routeId) {
            setDriverLocation({ lat, lng });
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
  mapContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  mapMock: { flex: 1, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', padding: 20 },
  mapMockTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748b', marginBottom: 20 },
  coordText: { fontSize: 16, color: '#0f172a', marginVertical: 5, fontFamily: 'monospace' },
  waitingText: { fontSize: 16, color: '#64748b', fontStyle: 'italic' },
  pulsingDot: { width: 20, height: 20, backgroundColor: '#3b82f6', borderRadius: 10, marginTop: 20, borderWidth: 4, borderColor: '#93c5fd' }
});

export default LiveTrackingScreen;

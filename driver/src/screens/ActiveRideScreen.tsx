import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as signalR from '@microsoft/signalr';
import { SIGNALR_HUB_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import axiosInstance from '../api/axios';

const ActiveRideScreen = ({ route, navigation }: any) => {
  const { routeId, startLoc, endLoc } = route.params;
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

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

        // Start watching position
        watchId = Geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentCoords({ lat: latitude, lng: longitude });
            
            // Send to RideHub
            if (hubConnection.state === signalR.HubConnectionState.Connected) {
              hubConnection.invoke('UpdateRouteLocation', routeId, latitude, longitude).catch(console.error);
            }
          },
          (error) => console.log(error),
          { enableHighAccuracy: true, distanceFilter: 10, interval: 5000 }
        );

      } catch (err) {
        console.error('SignalR Connection Error: ', err);
        Alert.alert('Connection Error', 'Could not connect to tracking server.');
      }
    };

    startTracking();

    return () => {
      if (watchId !== undefined) Geolocation.clearWatch(watchId);
      if (hubConnection) hubConnection.stop();
    };
  }, [routeId]);

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
            // Ideally we'd map over passengers to rate them, but for MVP we return to Home.
            // Wait, we can navigate to RatingScreen to rate the app or skip.
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
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
      <Text style={styles.title}>Active Ride</Text>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>Route: {startLoc} → {endLoc}</Text>
        <Text style={styles.infoText}>Status: {isBroadcasting ? 'Broadcasting Location 📡' : 'Connecting...'}</Text>
      </View>

      <View style={styles.mapContainer}>
        <View style={styles.mapMock}>
          <Text style={styles.mapMockTitle}>GPS Broadcaster Active</Text>
          {currentCoords ? (
            <>
              <Text style={styles.coordText}>Lat: {currentCoords.lat.toFixed(6)}</Text>
              <Text style={styles.coordText}>Lng: {currentCoords.lng.toFixed(6)}</Text>
              <Text style={styles.hintText}>Your location is being sent to passengers and admin securely.</Text>
              <View style={styles.pulsingDot} />
            </>
          ) : (
            <Text style={styles.waitingText}>Acquiring GPS Signal...</Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.completeBtn} onPress={handleCompleteRide}>
        <Text style={styles.completeBtnText}>Complete Ride</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', padding: 15, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, color: '#f8fafc' },
  infoCard: { backgroundColor: '#1f2937', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#374151' },
  infoText: { fontSize: 16, color: '#cbd5e1', marginBottom: 5 },
  mapContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', marginBottom: 20 },
  mapMock: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 20, borderWidth: 2, borderColor: '#3b82f6' },
  mapMockTitle: { fontSize: 18, fontWeight: 'bold', color: '#60a5fa', marginBottom: 20 },
  coordText: { fontSize: 18, color: '#f8fafc', marginVertical: 5, fontFamily: 'monospace' },
  hintText: { color: '#94a3b8', textAlign: 'center', marginTop: 15, paddingHorizontal: 20 },
  waitingText: { fontSize: 16, color: '#cbd5e1', fontStyle: 'italic' },
  pulsingDot: { width: 24, height: 24, backgroundColor: '#10b981', borderRadius: 12, marginTop: 30, borderWidth: 4, borderColor: '#34d399' },
  completeBtn: { padding: 15, backgroundColor: '#ef4444', borderRadius: 8, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 }
});

export default ActiveRideScreen;

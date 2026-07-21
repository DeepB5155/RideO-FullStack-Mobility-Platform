import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Alert, Platform
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as signalR from '@microsoft/signalr';
import { TokenHelper } from '../utils/tokenHelper';
import { SignalRContext } from '../context/SignalRContext';
import { SIGNALR_HUB_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axios';

const colors = {
  background: '#f8f9ff',
  primary: '#000000',
  onPrimary: '#ffffff',
  secondary: '#006a61',
  onSurfaceVariant: '#45464d',
  surface: '#ffffff',
  outlineVariant: '#c6c6cd',
  onBackground: '#0b1c30',
};

interface AwaitingApprovalRouteParams {
  bookingId: string;
  driverName: string;
  routeId: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  seatCount?: number;
  fare?: number;
}

const AwaitingApprovalScreen = ({ route, navigation }: any) => {
  const { bookingId, driverName, routeId, pickupLocation, dropoffLocation, seatCount, fare } = route.params as AwaitingApprovalRouteParams;
  const { connection } = useContext(SignalRContext);

  const [elapsed, setElapsed] = useState(0);
  const pulseAnims = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  // Pulse rings animation
  useEffect(() => {
    pulseAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 500),
          Animated.timing(anim, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // 5-min timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      Alert.alert(
        'No Response',
        'The driver hasn\'t responded yet. Would you like to try another ride?',
        [
          { text: 'Wait More', style: 'cancel' },
          { text: 'Try Another', onPress: () => navigation.goBack() }
        ]
      );
    }, 300000);
    return () => clearTimeout(timeout);
  }, []);

  // SignalR
  useEffect(() => {
    let cleanupSignalR: (() => void) | undefined;

    if (connection) {
      const handleBookingStatus = (data: any) => {
        const id = (data.bookingId || data.BookingId || '').toLowerCase();
        const status = data.status || data.Status;
        if (id === bookingId.toLowerCase()) {
          if (status === 'Approved') {
            AsyncStorage.removeItem('pendingBookingData').catch(() => {});
            Alert.alert('🎉 Confirmed!', `${driverName} has accepted your ride!`);
            navigation.replace('Live Tracking', { bookingId, routeId, driverName });
          } else if (status === 'Rejected') {
            AsyncStorage.removeItem('pendingBookingData').catch(() => {});
            Alert.alert('Ride Unavailable', `${driverName} couldn\'t accept your request. Please try another ride.`);
            navigation.goBack();
          }
        }
      };

      connection.on('BookingStatusUpdated', handleBookingStatus);

      cleanupSignalR = () => {
        connection.off('BookingStatusUpdated', handleBookingStatus);
      };
    }

    return () => {
      if (cleanupSignalR) cleanupSignalR();
    };
  }, [connection, bookingId, driverName, routeId, navigation]);

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await axiosInstance.put(`/booking/${bookingId}/cancel`, { reason: 'Cancelled by user' });
          } catch (e) { /* ignore */ }
          await AsyncStorage.removeItem('pendingBookingData').catch(() => {});
          navigation.goBack();
        }
      }
    ]);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const initial = driverName ? driverName[0].toUpperCase() : 'D';

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        {/* Pulsing rings */}
        <View style={styles.ringContainer}>
          {pulseAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[styles.ring, {
                transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
                opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
              }]}
            />
          ))}
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>

        <Text style={styles.waitingLabel}>Waiting for</Text>
        <Text style={styles.driverName}>{driverName}</Text>
        <Text style={styles.waitingSubtitle}>to accept your request...</Text>
        <View style={styles.timerRow}>
          <MaterialIcons name="timer" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.timer}> {formatTime(elapsed)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
        <Text style={styles.cancelBtnText}>Cancel Request</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'space-between', paddingBottom: Platform.OS === 'ios' ? 48 : 32, paddingTop: 60 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringContainer: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  ring: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: colors.secondary },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#131b2e', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  waitingLabel: { fontSize: 16, color: colors.onSurfaceVariant, marginBottom: 4 },
  driverName: { fontSize: 28, fontWeight: '700', color: colors.onBackground, marginBottom: 4 },
  waitingSubtitle: { fontSize: 16, color: colors.onSurfaceVariant, marginBottom: 16 },
  timerRow: { flexDirection: 'row', alignItems: 'center' },
  timer: { fontSize: 15, color: colors.onSurfaceVariant, fontWeight: '500' },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 30, backgroundColor: '#ffebeb' },
  cancelBtnText: { color: '#d32f2f', fontSize: 16, fontWeight: '600' },
});

export default AwaitingApprovalScreen;

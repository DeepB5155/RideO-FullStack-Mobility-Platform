import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axiosInstance from '../api/axios';

const MyRidesScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<'OneTime' | 'Recurring'>('OneTime');
  const [bookings, setBookings] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  const fetchBookings = async () => {
    try {
      const res = await axiosInstance.get('/booking/my-bookings');
      setBookings(res.data);
    } catch (e) {
      console.log('Failed to fetch bookings', e);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await axiosInstance.get('/booking/subscriptions');
      setSubscriptions(res.data);
    } catch (e) {
      console.log('Failed to fetch subscriptions', e);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBookings();
      fetchSubscriptions();
    });
    return unsubscribe;
  }, [navigation]);

  const cancelBooking = async (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this ride?', [
      { text: 'No', style: 'cancel' },
      { 
        text: 'Yes', 
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosInstance.put(`/booking/${id}/cancel`);
            fetchBookings();
            Alert.alert('Success', 'Booking cancelled.');
          } catch (e: any) {
            Alert.alert('Error', e.response?.data || 'Failed to cancel booking');
          }
        }
      }
    ]);
  };

  const cancelSubscription = async (id: string) => {
    Alert.alert('Cancel Subscription', 'Are you sure you want to stop this daily subscription?', [
      { text: 'No', style: 'cancel' },
      { 
        text: 'Yes', 
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosInstance.put(`/booking/unsubscribe/${id}`);
            fetchSubscriptions();
            Alert.alert('Success', 'Subscription cancelled.');
          } catch (e: any) {
            Alert.alert('Error', e.response?.data || 'Failed to cancel subscription');
          }
        }
      }
    ]);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pending': return '#ffc107';
      case 'Approved': return '#28a745';
      case 'Started': return '#17a2b8';
      case 'Completed': return '#6c757d';
      case 'Rejected':
      case 'Cancelled':
      case 'No-show': return '#dc3545';
      default: return '#666';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.locations}>{item.pickupLocationName} → {item.dropoffLocationName}</Text>
        <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>{item.status}</Text>
      </View>
      <Text style={styles.details}>Driver: {item.route.driverName}</Text>
      <Text style={styles.details}>Date: {new Date(item.route.startTime).toLocaleString()}</Text>
      <Text style={styles.details}>Seats: {item.seatsBooked} | Total: ₹{item.totalFare}</Text>
      
      {(item.status === 'Pending' || item.status === 'Approved') && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelBooking(item.id)}>
          <Text style={styles.cancelBtnText}>Cancel Booking</Text>
        </TouchableOpacity>
      )}

      {(item.status === 'Approved' || item.status === 'Started') && (
        <View style={{flexDirection: 'row', gap: 10}}>
          <TouchableOpacity 
            style={[styles.trackBtn, {flex: 1}]} 
            onPress={() => navigation.navigate('Live Tracking', { 
              routeId: item.routeId,
              driverName: item.route.driverName,
              pickup: item.pickupLocationName,
              dropoff: item.dropoffLocationName,
              bookingId: item.id,
              trackingId: item.trackingId
            })}
          >
            <Text style={styles.trackBtnText}>Track Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.trackBtn, {flex: 1, backgroundColor: '#4F46E5'}]} 
            onPress={() => navigation.navigate('Chat', { 
              bookingId: item.id,
              targetName: item.route.driverName
            })}
          >
            <Text style={styles.trackBtnText}>Chat</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderSubscription = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.locations}>{item.routeDetails.startLocation} → {item.routeDetails.endLocation}</Text>
        <Text style={[styles.statusBadge, { backgroundColor: item.routeDetails.isTemplateActive ? '#28a745' : '#dc3545' }]}>
          {item.routeDetails.isTemplateActive ? 'Active' : 'Stopped by Driver'}
        </Text>
      </View>
      <Text style={styles.details}>Driver: {item.routeDetails.driverName}</Text>
      <Text style={styles.details}>Schedule: {item.routeDetails.days} at {item.routeDetails.time}</Text>
      <Text style={styles.details}>Seats: {item.seatsBooked} | Per Ride: ₹{item.totalFarePerRide}</Text>
      
      <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelSubscription(item.id)}>
        <Text style={styles.cancelBtnText}>Unsubscribe</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Rides</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'OneTime' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('OneTime')}
        >
          <Text style={[styles.tabText, activeTab === 'OneTime' && styles.tabTextActive]}>One-Time Rides</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'Recurring' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('Recurring')}
        >
          <Text style={[styles.tabText, activeTab === 'Recurring' && styles.tabTextActive]}>Daily Subscriptions</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'OneTime' ? (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>You have no one-time booked rides.</Text>}
        />
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => item.id}
          renderItem={renderSubscription}
          ListEmptyComponent={<Text style={styles.empty}>You have no active daily subscriptions.</Text>}
        />
      )}
    </View>
  );
};

import { theme } from '../theme/theme';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 15, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, color: theme.colors.text.main },
  tabContainer: { flexDirection: 'row', marginBottom: 15, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: theme.radius.sm },
  tabBtnActive: { backgroundColor: theme.colors.card, ...theme.shadows.small, borderWidth: 1, borderColor: theme.colors.border },
  tabText: { fontWeight: '600', color: theme.colors.text.muted },
  tabTextActive: { color: theme.colors.primary, fontWeight: 'bold' },
  card: { backgroundColor: theme.colors.card, padding: 15, borderRadius: theme.radius.lg, marginBottom: 10, ...theme.shadows.medium, borderWidth: 1, borderColor: theme.colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  locations: { fontSize: 16, fontWeight: 'bold', flex: 1, color: theme.colors.text.main },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, color: theme.colors.text.light, fontSize: 12, overflow: 'hidden', fontWeight: 'bold' },
  details: { color: theme.colors.text.muted, marginBottom: 5 },
  cancelBtn: { marginTop: 10, padding: 10, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.danger, alignItems: 'center' },
  cancelBtnText: { color: theme.colors.danger, fontWeight: 'bold' },
  trackBtn: { marginTop: 10, padding: 10, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, alignItems: 'center' },
  trackBtnText: { color: theme.colors.text.light, fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, color: theme.colors.text.muted }
});

export default MyRidesScreen;

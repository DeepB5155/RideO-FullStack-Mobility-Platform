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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 15, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  tabContainer: { flexDirection: 'row', marginBottom: 15, backgroundColor: '#e9ecef', borderRadius: 8, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#007AFF', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  locations: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, color: '#fff', fontSize: 12, overflow: 'hidden', fontWeight: 'bold' },
  details: { color: '#666', marginBottom: 5 },
  cancelBtn: { marginTop: 10, padding: 10, borderRadius: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dc3545', alignItems: 'center' },
  cancelBtnText: { color: '#dc3545', fontWeight: 'bold' },
  trackBtn: { marginTop: 10, padding: 10, borderRadius: 6, backgroundColor: '#007AFF', alignItems: 'center' },
  trackBtnText: { color: '#fff', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});

export default MyRidesScreen;

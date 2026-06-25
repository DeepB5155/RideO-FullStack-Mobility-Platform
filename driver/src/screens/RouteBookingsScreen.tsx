import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axiosInstance from '../api/axios';

const RouteBookingsScreen = ({ route, navigation }: any) => {
  const { routeId } = route.params;
  const [bookings, setBookings] = useState<any[]>([]);

  const fetchBookings = async () => {
    try {
      const res = await axiosInstance.get(`/booking/route/${routeId}`);
      setBookings(res.data);
    } catch (e) {
      console.log('Failed to fetch route bookings', e);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateBookingStatus = async (id: string, action: string) => {
    try {
      if (action === 'Approve' || action === 'Reject') {
        await axiosInstance.put(`/booking/${id}/${action.toLowerCase()}`);
      } else {
        await axiosInstance.put(`/booking/${id}/status`, `"${action}"`, {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      fetchBookings();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data || `Failed to ${action} booking`);
    }
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
        <Text style={styles.userName}>{item.userName}</Text>
        <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>{item.status}</Text>
      </View>
      <Text style={styles.details}>Phone: {item.userPhone || 'N/A'}</Text>
      <Text style={styles.details}>Locations: {item.pickupLocationName} → {item.dropoffLocationName}</Text>
      <Text style={styles.details}>Seats: {item.seatsBooked} | Total Fare: ${item.totalFare}</Text>
      
      {item.status === 'Pending' && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, {backgroundColor: '#28a745'}]} onPress={() => updateBookingStatus(item.id, 'Approve')}>
            <Text style={styles.btnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, {backgroundColor: '#dc3545'}]} onPress={() => updateBookingStatus(item.id, 'Reject')}>
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'Approved' && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, {backgroundColor: '#17a2b8'}]} onPress={() => updateBookingStatus(item.id, 'Started')}>
            <Text style={styles.btnText}>Picked Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, {backgroundColor: '#6c757d'}]} onPress={() => updateBookingStatus(item.id, 'No-show')}>
            <Text style={styles.btnText}>No-Show</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'Started' && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, {backgroundColor: '#28a745'}]} onPress={() => updateBookingStatus(item.id, 'Completed')}>
            <Text style={styles.btnText}>Dropped Off</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>&larr; Back to Routes</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Passenger Bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No passenger requests yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 15, paddingTop: 50 },
  backBtn: { marginBottom: 15 },
  backBtnText: { color: '#007AFF', fontSize: 16, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  userName: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, color: '#fff', fontSize: 12, overflow: 'hidden', fontWeight: 'bold' },
  details: { color: '#666', marginBottom: 5 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  btn: { flex: 1, padding: 10, borderRadius: 6, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});

export default RouteBookingsScreen;

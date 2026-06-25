import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axiosInstance from '../api/axios';

const MyRoutesScreen = ({ navigation }: any) => {
  const [routes, setRoutes] = useState<any[]>([]);

  const fetchRoutes = async () => {
    try {
      const res = await axiosInstance.get('/route/my-routes');
      setRoutes(res.data);
    } catch (e) {
      console.log('Failed to fetch routes', e);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchRoutes();
    });
    return unsubscribe;
  }, [navigation]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await axiosInstance.put(`/route/${id}/status`, `"${newStatus}"`, {
        headers: { 'Content-Type': 'application/json' }
      });
      fetchRoutes();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data || 'Failed to update status');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.locations}>{item.startLocation} → {item.endLocation}</Text>
        <Text style={[styles.status, item.status === 'Published' && styles.statusActive]}>{item.status}</Text>
      </View>
      <Text style={styles.details}>Time: {new Date(item.startTime).toLocaleString()}</Text>
      <Text style={styles.details}>Seats: {item.availableSeats} | Price: ${item.pricePerSeat}</Text>
      
      <View style={styles.actionRow}>
        {item.status === 'Draft' && (
           <TouchableOpacity style={[styles.btn, {backgroundColor: '#28a745'}]} onPress={() => updateStatus(item.id, 'Published')}>
             <Text style={styles.btnText}>Publish</Text>
           </TouchableOpacity>
        )}
        {item.status === 'Published' && (
           <TouchableOpacity 
             style={[styles.btn, {backgroundColor: '#007AFF'}]} 
             onPress={() => {
               updateStatus(item.id, 'Started');
               navigation.navigate('Active Ride', { 
                 routeId: item.id, 
                 startLoc: item.startLocation, 
                 endLoc: item.endLocation 
               });
             }}
           >
             <Text style={styles.btnText}>Start Ride</Text>
           </TouchableOpacity>
        )}
        {item.status === 'Started' && (
           <TouchableOpacity style={[styles.btn, {backgroundColor: '#ffc107'}]} onPress={() => updateStatus(item.id, 'Completed')}>
             <Text style={{fontWeight: 'bold'}} >Complete</Text>
           </TouchableOpacity>
        )}
        {(item.status !== 'Completed' && item.status !== 'Cancelled') && (
           <TouchableOpacity style={[styles.btn, {backgroundColor: '#dc3545'}]} onPress={() => updateStatus(item.id, 'Cancelled')}>
             <Text style={styles.btnText}>Cancel</Text>
           </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity 
        style={styles.bookingsBtn} 
        onPress={() => navigation.navigate('Route Bookings', { routeId: item.id })}
      >
        <Text style={styles.bookingsBtnText}>View Passenger Bookings</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('Create Route')}>
        <Text style={styles.createBtnText}>+ Create New Route</Text>
      </TouchableOpacity>
      
      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>You have no routes.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 15 },
  createBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  locations: { fontSize: 16, fontWeight: 'bold' },
  status: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#e9ecef', fontSize: 12, overflow: 'hidden' },
  statusActive: { backgroundColor: '#d4edda', color: '#155724' },
  details: { color: '#666', marginBottom: 5 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, padding: 10, borderRadius: 6, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  bookingsBtn: { marginTop: 15, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  bookingsBtnText: { color: '#333', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});

export default MyRoutesScreen;

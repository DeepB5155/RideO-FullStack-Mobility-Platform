import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import axiosInstance from '../api/axios';

const RideResultsScreen = ({ route, navigation }: any) => {
  const { pickupText, dropoffText, pickupLat, pickupLng, dropLat, dropLng, date, seats } = route.params;
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Wallet'>('Wallet');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const url = `/route/search?pickupLat=${pickupLat}&pickupLng=${pickupLng}&dropLat=${dropLat}&dropLng=${dropLng}&date=${date}&seats=${seats}`;
        const res = await axiosInstance.get(url);
        setResults(res.data);
      } catch (err) {
        console.error('Search failed:', err);
        Alert.alert('Error', 'Failed to fetch rides.');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const handleRequestSeat = async (item: any) => {
    try {
      await axiosInstance.post('/booking/request', {
        routeId: item.routeId,
        pickupLocationName: item.matchedPickup,
        dropoffLocationName: item.matchedDropoff,
        seatsBooked: seats,
        paymentMethod: paymentMethod
      });
      Alert.alert('Success', item.autoApprove ? 'Booking Confirmed!' : 'Request sent to driver.');
      navigation.navigate('My Rides'); 
    } catch (err: any) {
      Alert.alert('Error', err.response?.data || 'Failed to request seat.');
    }
  };

  const handleSubscribeDaily = async (item: any) => {
    try {
      await axiosInstance.post(`/booking/subscribe/${item.routeId}`, {
        routeId: item.routeId,
        pickupLocationName: item.matchedPickup,
        dropoffLocationName: item.matchedDropoff,
        seatsBooked: seats
      });
      Alert.alert('Success', 'You are now subscribed to this daily route!');
      navigation.navigate('My Rides'); 
    } catch (err: any) {
      Alert.alert('Error', err.response?.data || 'Failed to subscribe to route.');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.driverInfoContainer}>
          <Text style={styles.driverName}>{item.driver.name}</Text>
          {item.isProDriver && (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>🏆 PRO</Text>
            </View>
          )}
        </View>
        <Text style={styles.price}>${item.pricePerSeat}</Text>
      </View>
      <Text style={styles.rating}>⭐ {item.driver.rating.toFixed(1)} | {item.vehicle.make} {item.vehicle.model}</Text>
      
      <View style={styles.routeBox}>
        <Text style={styles.routeText}>📍 {item.matchedPickup}</Text>
        <View style={styles.line} />
        <Text style={styles.routeText}>🏁 {item.matchedDropoff}</Text>
      </View>
      
      <View style={styles.footerRow}>
        <Text style={styles.time}>{new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={styles.seats}>{item.availableSeats} seats left</Text>
      </View>

      <TouchableOpacity style={styles.bookBtn} onPress={() => handleRequestSeat(item)}>
        <Text style={styles.bookBtnText}>{item.autoApprove ? 'Book Instantly' : 'Request Seat'}</Text>
      </TouchableOpacity>

      {item.isRecurring && (
        <TouchableOpacity style={styles.subscribeBtn} onPress={() => handleSubscribeDaily(item)}>
          <Text style={styles.subscribeBtnText}>Subscribe Daily</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>&larr; Modify Search</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>{pickupText} to {dropoffText}</Text>
      <Text style={styles.subtitle}>{date} • {seats} Passenger(s)</Text>

      <Text style={styles.paymentTitle}>Select Payment Method:</Text>
      <View style={styles.paymentSelector}>
        {['Wallet', 'Cash', 'UPI'].map((method) => (
          <TouchableOpacity 
            key={method} 
            style={[styles.paymentOption, paymentMethod === method && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod(method as any)}
          >
            <Text style={[styles.paymentOptionText, paymentMethod === method && styles.paymentOptionTextActive]}>
              {method}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.routeId}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.empty}>No rides found along this route for your date.</Text>
          }
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 15, paddingTop: 50 },
  backBtn: { marginBottom: 15 },
  backBtnText: { color: '#007AFF', fontSize: 16, fontWeight: '500' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverInfoContainer: { flexDirection: 'row', alignItems: 'center' },
  driverName: { fontSize: 18, fontWeight: 'bold' },
  proBadge: { backgroundColor: '#fffbe6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8, borderWidth: 1, borderColor: '#ffc107' },
  proBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#d48806' },
  price: { fontSize: 20, fontWeight: 'bold', color: '#28a745' },
  rating: { color: '#666', marginTop: 5, marginBottom: 15 },
  routeBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 8, marginBottom: 15 },
  routeText: { fontSize: 16, fontWeight: '500', color: '#444' },
  line: { width: 2, height: 15, backgroundColor: '#ccc', marginLeft: 8, marginVertical: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  time: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  seats: { fontSize: 14, color: '#007AFF', fontWeight: '500' },
  bookBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  subscribeBtn: { backgroundColor: '#e6f2ff', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#007AFF' },
  subscribeBtnText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 },
  paymentTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  paymentSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  paymentOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginHorizontal: 4, backgroundColor: '#fff' },
  paymentOptionActive: { borderColor: '#007AFF', backgroundColor: '#e6f2ff' },
  paymentOptionText: { fontSize: 14, color: '#666', fontWeight: '500' },
  paymentOptionTextActive: { color: '#007AFF', fontWeight: 'bold' }
});

export default RideResultsScreen;

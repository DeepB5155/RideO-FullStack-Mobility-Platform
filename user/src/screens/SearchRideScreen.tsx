import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const SearchRideScreen = ({ navigation }: any) => {
  // In a real app with Google Maps autocomplete, we would store lat/lng directly.
  // Here we use mock coordinates for demonstration.
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [seats, setSeats] = useState('1');

  const handleSearch = () => {
    if (!pickup || !dropoff || !date) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    // Mock geocoding: In production use Google Geocoding API to get exact lat/lng
    // For this prototype, we'll pass dummy coords representing Ahmedabad (23.0, 72.5) to Vadodara (22.3, 73.1)
    const pickupLat = 23.0;
    const pickupLng = 72.5;
    const dropLat = 22.3;
    const dropLng = 73.1;

    navigation.navigate('RideResults', {
      pickupText: pickup,
      dropoffText: dropoff,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      date,
      seats: parseInt(seats) || 1
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Find a Ride</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Leaving from</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g., Ahmedabad" 
          value={pickup} 
          onChangeText={setPickup} 
        />

        <Text style={styles.label}>Going to</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g., Vadodara" 
          value={dropoff} 
          onChangeText={setDropoff} 
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Date</Text>
            <TextInput 
              style={styles.input} 
              placeholder="YYYY-MM-DD" 
              value={date} 
              onChangeText={setDate} 
            />
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Passengers</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="number-pad" 
              value={seats} 
              onChangeText={setSeats} 
            />
          </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSearch}>
          <Text style={styles.btnText}>Search Rides</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#f4f4f4', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfWidth: { width: '48%' },
  btn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default SearchRideScreen;

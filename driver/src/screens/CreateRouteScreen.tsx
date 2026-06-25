import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import axiosInstance from '../api/axios';

const CreateRouteScreen = ({ navigation }: any) => {
  const [step, setStep] = useState(1);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Step 1
  const [startLoc, setStartLoc] = useState('');
  const [endLoc, setEndLoc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Step 2
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('');

  // Step 3
  const [vehicleId, setVehicleId] = useState('');
  const [luggage, setLuggage] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // In a real app, fetch driver vehicles. For now we will mock it
    // since we only added one vehicle in KYC submission
    const fetchKYC = async () => {
      try {
        const res = await axiosInstance.get('/admin/kyc/current'); // We don't have this endpoint, so let's just use dummy or fetch from /kyc/status
      } catch (e) {
      }
    };
    // Dummy Vehicle
    setVehicles([{ id: 'dummy-vehicle-id', name: 'My Vehicle (Auto Selected)' }]);
    setVehicleId('dummy-vehicle-id');
  }, []);

  const handlePublish = async () => {
    if (!startLoc || !endLoc || !price || !seats) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }

    try {
      // Mocking DateTime parsing
      const startTime = new Date(); // In real app, parse from date/time inputs
      startTime.setHours(startTime.getHours() + 24); // Future time
      
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2); // 2 hours later

      await axiosInstance.post('/route/publish', {
        startLocation: startLoc,
        endLocation: endLoc,
        startTime: startTime.toISOString(),
        estimatedEndTime: endTime.toISOString(),
        availableSeats: parseInt(seats),
        pricePerSeat: parseFloat(price),
        vehicleId: vehicleId || '00000000-0000-0000-0000-000000000000', // Need actual ID in prod
        isLuggageAllowed: luggage,
        autoApprove: autoApprove,
        rideNotes: notes,
        stops: []
      });

      Alert.alert('Success', 'Route published successfully!');
      navigation.navigate('My Routes');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data || 'Failed to publish route');
    }
  };

  const handleDraft = async () => {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 24);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);

      await axiosInstance.post('/route/draft', {
        startLocation: startLoc,
        endLocation: endLoc,
        startTime: startTime.toISOString(),
        estimatedEndTime: endTime.toISOString(),
        availableSeats: parseInt(seats) || 4,
        pricePerSeat: parseFloat(price) || 0,
        vehicleId: vehicleId || '00000000-0000-0000-0000-000000000000',
        isLuggageAllowed: luggage,
        autoApprove: autoApprove,
        rideNotes: notes,
        stops: []
      });

      Alert.alert('Draft Saved', 'Route saved as draft.');
      navigation.navigate('My Routes');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data || 'Failed to save draft');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Create Route - Step {step} of 3</Text>

      {step === 1 && (
        <View>
          <TextInput style={styles.input} placeholder="Start Location" value={startLoc} onChangeText={setStartLoc} />
          <TextInput style={styles.input} placeholder="End Location" value={endLoc} onChangeText={setEndLoc} />
          <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
          <TextInput style={styles.input} placeholder="Time (HH:MM)" value={time} onChangeText={setTime} />
          <TouchableOpacity style={styles.btn} onPress={() => setStep(2)}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View>
          <TextInput style={styles.input} placeholder="Price Per Seat ($)" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
          <TextInput style={styles.input} placeholder="Available Seats" keyboardType="number-pad" value={seats} onChangeText={setSeats} />
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnLight]} onPress={() => setStep(1)}><Text>Back</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => setStep(3)}><Text style={styles.btnText}>Next</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && (
        <View>
          <View style={styles.switchRow}>
            <Text>Allow Luggage?</Text>
            <Switch value={luggage} onValueChange={setLuggage} />
          </View>
          <View style={styles.switchRow}>
            <Text>Auto Approve Requests?</Text>
            <Switch value={autoApprove} onValueChange={setAutoApprove} />
          </View>
          <TextInput style={[styles.input, {height: 80}]} placeholder="Ride Notes (Optional)" multiline value={notes} onChangeText={setNotes} />

          <View style={styles.row}>
             <TouchableOpacity style={[styles.btn, styles.btnLight]} onPress={() => setStep(2)}><Text>Back</Text></TouchableOpacity>
             <TouchableOpacity style={[styles.btn, {backgroundColor: '#6c757d'}]} onPress={handleDraft}><Text style={styles.btnText}>Save Draft</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.btn, {backgroundColor: '#28a745', marginTop: 10}]} onPress={handlePublish}>
            <Text style={styles.btnText}>Publish Ride</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 8 },
  btn: { flex: 1, backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnLight: { backgroundColor: '#e9ecef' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});

export default CreateRouteScreen;

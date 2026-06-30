import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import { theme } from '../theme/theme';

const EditVehicleScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  // Form State
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('White');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Sedan');
  const [seats, setSeats] = useState('4');

  const VEHICLE_TYPES = [
    { type: 'Hatchback', icon: '🚗' },
    { type: 'Sedan', icon: '🚙' },
    { type: 'SUV', icon: '🛻' },
    { type: 'MPV', icon: '🚐' }
  ];

  const VEHICLE_COLORS = [
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Silver', hex: '#C0C0C0' },
    { name: 'Black', hex: '#000000' },
    { name: 'Red', hex: '#FF0000' },
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Grey', hex: '#808080' },
    { name: 'Gold', hex: '#FFD700' },
    { name: 'Brown', hex: '#A52A2A' }
  ];

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      const res = await axiosInstance.get('/vehicle/my');
      const v = res.data;
      setVehicleId(v.id);
      setMake(v.make);
      setModel(v.model);
      setYear(v.year.toString());
      setColor(v.color || 'White');
      setLicensePlate(v.licensePlate);
      setVehicleType(v.vehicleType || 'Sedan');
      setSeats(v.totalSeats.toString());
    } catch (e: any) {
      if (e.response?.status === 404) {
        Alert.alert('No Vehicle', 'You do not have a vehicle registered yet. Please complete KYC.');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to fetch vehicle details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveVehicle = async () => {
    if (!make || !model || !licensePlate) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setIsSaving(true);
      await axiosInstance.put(`/vehicle/${vehicleId}`, {
        make,
        model,
        year: parseInt(year) || 2020,
        color,
        licensePlate,
        vehicleType,
        totalSeats: parseInt(seats) || 4
      });
      
      Alert.alert('Success', 'Vehicle updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update vehicle');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}>
        <Text style={styles.header}>Edit Vehicle</Text>
        
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Make (Brand)</Text>
            <TextInput style={styles.input} placeholder="e.g. Toyota, Honda, Tata" placeholderTextColor={theme.colors.text.muted} value={make} onChangeText={setMake} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Model</Text>
            <TextInput style={styles.input} placeholder="e.g. Camry, Civic, Nexon" placeholderTextColor={theme.colors.text.muted} value={model} onChangeText={setModel} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Manufacturing Year</Text>
            <TextInput style={styles.input} placeholder="e.g. 2022" placeholderTextColor={theme.colors.text.muted} keyboardType="number-pad" value={year} onChangeText={setYear} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Type</Text>
            <View style={styles.typeRow}>
              {VEHICLE_TYPES.map(item => (
                <TouchableOpacity 
                  key={item.type} 
                  style={[styles.typeCard, vehicleType === item.type && styles.typeCardSelected]}
                  onPress={() => setVehicleType(item.type)}
                >
                  <Text style={styles.typeIcon}>{item.icon}</Text>
                  <Text style={[styles.typeText, vehicleType === item.type && styles.typeTextSelected]}>{item.type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {VEHICLE_COLORS.map(c => (
                <TouchableOpacity 
                  key={c.name}
                  style={[
                    styles.colorCircle, 
                    { backgroundColor: c.hex },
                    c.name === 'White' && { borderWidth: 1, borderColor: '#ccc' }
                  ]}
                  onPress={() => setColor(c.name)}
                >
                  {color === c.name && (
                    <Text style={[styles.colorCheck, (c.name === 'White' || c.name === 'Silver' || c.name === 'Gold') ? {color: '#000'} : {color: '#fff'}]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Plate Number</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. GJ01AB1234" 
              placeholderTextColor={theme.colors.text.muted} 
              autoCapitalize="characters"
              value={licensePlate} 
              onChangeText={setLicensePlate} 
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Passenger Seats</Text>
            <TextInput style={styles.input} placeholder="e.g. 4" placeholderTextColor={theme.colors.text.muted} keyboardType="number-pad" value={seats} onChangeText={setSeats} />
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={saveVehicle} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color={theme.colors.text.light} />
          ) : (
            <Text style={styles.submitBtnText}>SAVE CHANGES</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { fontSize: 32, fontWeight: '800', marginBottom: theme.spacing.xl, color: theme.colors.text.main, marginTop: theme.spacing.md },
  card: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.radius.xl, marginBottom: theme.spacing.xl, ...theme.shadows.medium },
  inputGroup: { marginBottom: theme.spacing.lg },
  label: { fontSize: 14, fontWeight: '700', color: theme.colors.text.main, marginBottom: theme.spacing.sm, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: theme.spacing.md, fontSize: 16, color: theme.colors.text.main, backgroundColor: theme.colors.background },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  typeCard: { flex: 1, alignItems: 'center', padding: 10, marginHorizontal: 4, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.background },
  typeCardSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight + '20' },
  typeIcon: { fontSize: 24, marginBottom: 4 },
  typeText: { fontSize: 12, color: theme.colors.text.muted, fontWeight: '600' },
  typeTextSelected: { color: theme.colors.primary },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  colorCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', ...theme.shadows.small },
  colorCheck: { fontSize: 18, fontWeight: 'bold' },
  submitBtn: { backgroundColor: theme.colors.primary, padding: theme.spacing.lg, borderRadius: theme.radius.full, alignItems: 'center', ...theme.shadows.medium },
  submitBtnText: { color: theme.colors.text.light, fontSize: 16, fontWeight: '800', letterSpacing: 1 }
});

export default EditVehicleScreen;

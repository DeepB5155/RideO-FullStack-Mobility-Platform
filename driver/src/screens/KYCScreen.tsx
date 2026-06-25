import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axios';

const KYCScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [licenseNumber, setLicenseNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [seats, setSeats] = useState('4');

  // Dummy URLs since Expo Image Picker isn't installed by default, 
  // and we'll just simulate the upload for now to prove the API logic.
  const [licenseFrontUrl, setLicenseFrontUrl] = useState('');
  const [licenseBackUrl, setLicenseBackUrl] = useState('');
  const [rcUrl, setRcUrl] = useState('');

  const checkStatus = async () => {
    try {
      const res = await axiosInstance.get('/kyc/status');
      setStatus(res.data.status); // NotSubmitted, Pending, Approved, Rejected
    } catch (e) {
      console.log('Failed to check KYC status', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const simulateUpload = async (type: string) => {
    // In a real app, use react-native-image-picker or expo-image-picker
    // then upload via FormData to /kyc/upload
    // We will just use dummy URLs for testing the flow here
    Alert.alert('Simulated Upload', `Uploaded ${type}`);
    if (type === 'License Front') setLicenseFrontUrl('/uploads/kyc/dummy-license-front.jpg');
    if (type === 'License Back') setLicenseBackUrl('/uploads/kyc/dummy-license-back.jpg');
    if (type === 'RC') setRcUrl('/uploads/kyc/dummy-rc.jpg');
  };

  const submitKYC = async () => {
    if (!licenseNumber || !make || !model || !licensePlate) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setIsLoading(true);
      await axiosInstance.post('/kyc/submit', {
        licenseNumber,
        make,
        model,
        year: parseInt(year) || 2020,
        color,
        licensePlate,
        totalSeats: parseInt(seats) || 4,
        licenseFrontUrl,
        licenseBackUrl,
        rcUrl
      });
      
      Alert.alert('Success', 'KYC Submitted successfully. Pending Admin review.');
      await checkStatus();
    } catch (e) {
      Alert.alert('Error', 'Failed to submit KYC');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (status === 'Approved') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>You are Verified!</Text>
        <Text style={styles.subtitle}>You can now access the full Driver App features.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.buttonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'Pending') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Under Review ⏳</Text>
        <Text style={styles.subtitle}>Your documents are currently being verified by an admin.</Text>
        <TouchableOpacity style={styles.buttonOutline} onPress={checkStatus}>
          <Text style={styles.buttonOutlineText}>Refresh Status</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <Text style={styles.title}>Complete KYC & Vehicle Setup</Text>
      {status === 'Rejected' && (
        <Text style={styles.errorText}>Your previous submission was rejected. Please re-submit.</Text>
      )}

      <Text style={styles.sectionTitle}>Driver Details</Text>
      <TextInput style={styles.input} placeholder="Driving License Number" value={licenseNumber} onChangeText={setLicenseNumber} />
      
      <View style={styles.uploadRow}>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => simulateUpload('License Front')}>
          <Text style={styles.uploadText}>{licenseFrontUrl ? '✓ Front Added' : '+ License Front'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => simulateUpload('License Back')}>
          <Text style={styles.uploadText}>{licenseBackUrl ? '✓ Back Added' : '+ License Back'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Vehicle Details</Text>
      <TextInput style={styles.input} placeholder="Make (e.g. Toyota)" value={make} onChangeText={setMake} />
      <TextInput style={styles.input} placeholder="Model (e.g. Camry)" value={model} onChangeText={setModel} />
      <View style={{flexDirection: 'row', gap: 10}}>
        <TextInput style={[styles.input, {flex: 1}]} placeholder="Year" keyboardType="number-pad" value={year} onChangeText={setYear} />
        <TextInput style={[styles.input, {flex: 1}]} placeholder="Color" value={color} onChangeText={setColor} />
      </View>
      <TextInput style={styles.input} placeholder="License Plate Number" value={licensePlate} onChangeText={setLicensePlate} />
      <TextInput style={styles.input} placeholder="Total Passenger Seats (e.g. 4)" keyboardType="number-pad" value={seats} onChangeText={setSeats} />

      <TouchableOpacity style={styles.uploadBtnFull} onPress={() => simulateUpload('RC')}>
        <Text style={styles.uploadText}>{rcUrl ? '✓ Vehicle RC Added' : '+ Upload Vehicle RC'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.submitBtn} onPress={submitKYC}>
        <Text style={styles.submitBtnText}>Submit KYC for Review</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6c757d', textAlign: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#333' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonOutline: { borderWidth: 1, borderColor: '#007AFF', padding: 15, borderRadius: 8, marginTop: 10, width: '100%', alignItems: 'center' },
  buttonOutlineText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  uploadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  uploadBtn: { flex: 0.48, backgroundColor: '#e9ecef', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#dee2e6', borderStyle: 'dashed' },
  uploadBtnFull: { backgroundColor: '#e9ecef', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#dee2e6', borderStyle: 'dashed', marginBottom: 20 },
  uploadText: { color: '#495057', fontWeight: '500' },
  submitBtn: { backgroundColor: '#28a745', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 10, fontWeight: '500' }
});

export default KYCScreen;

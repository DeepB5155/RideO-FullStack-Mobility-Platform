import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../api/axios';
import * as signalR from '@microsoft/signalr';
import { theme } from '../theme/theme';

const KYCScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState('');

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

  useEffect(() => {
    let connection: signalR.HubConnection | null = null;
    
    const setupSignalR = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token || status !== 'Pending') return;
        
        // Remove /api from base url if it exists to get hub path
        const hubUrl = axiosInstance.defaults.baseURL?.replace('/api', '/rideHub') || 'http://localhost:5000/rideHub';
        
        connection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, { accessTokenFactory: () => token })
          .withAutomaticReconnect()
          .build();

        connection.on("KYCStatusUpdated", (newStatus: string) => {
          console.log("Realtime KYC Status Update:", newStatus);
          setStatus(newStatus); // instantly update the UI without an extra network request
        });

        await connection.start();
        console.log("SignalR Connected for KYC realtime updates");
      } catch (err) {
        console.log("SignalR Connection Error:", err);
      }
    };

    setupSignalR();

    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [status]);

  const simulateUpload = async (type: string) => {
    // In a real app, use react-native-image-picker or expo-image-picker
    // then upload via FormData to /kyc/upload
    // We will just use dummy URLs for testing the flow here
    if (type === 'License Front') setLicenseFrontUrl('/uploads/kyc/dummy-license-front.jpg');
    if (type === 'License Back') setLicenseBackUrl('/uploads/kyc/dummy-license-back.jpg');
    if (type === 'RC') setRcUrl('/uploads/kyc/dummy-rc.jpg');
  };

  const submitKYC = async () => {
    setFormError(''); // reset error

    if (!licenseNumber || !make || !model || !licensePlate) {
      setFormError('Please fill all required fields');
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
    } catch (e: any) {
      console.log('Failed to submit KYC', e.response?.data || e);
      let errorMsg = 'Failed to submit KYC';
      if (e.response?.data) {
        if (typeof e.response.data === 'string') errorMsg = e.response.data;
        else if (e.response.data.title) errorMsg = e.response.data.title;
        else errorMsg = JSON.stringify(e.response.data);
      } else if (e.message) {
        errorMsg = `Connection Error: ${e.message}. Please check if your backend is running and the API_BASE_URL IP address is correct.`;
      }
      setFormError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'Approved') {
      // Small delay for smooth transition if it just got approved instantly
      setTimeout(() => {
        navigation.replace('MainTabs');
      }, 500);
    }
  }, [status, navigation]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (status === 'Approved') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.success} />
        <Text style={[styles.subtitle, { marginTop: 15, color: theme.colors.success, fontWeight: 'bold' }]}>
          Verified! Loading Dashboard...
        </Text>
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}>
        <Text style={styles.header}>Complete Setup</Text>
        {status === 'Rejected' && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>Your previous submission was rejected. Please re-submit.</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Driver Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Driving License Number</Text>
            <TextInput style={styles.input} placeholder="e.g. DL-1234567890" placeholderTextColor={theme.colors.text.muted} value={licenseNumber} onChangeText={setLicenseNumber} />
          </View>
          
          <View style={styles.uploadRow}>
            <TouchableOpacity style={licenseFrontUrl ? styles.uploadBtnActive : styles.uploadBtn} onPress={() => simulateUpload('License Front')}>
              <Text style={licenseFrontUrl ? styles.uploadTextActive : styles.uploadText}>{licenseFrontUrl ? '✓ Front Added' : '+ License Front'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={licenseBackUrl ? styles.uploadBtnActive : styles.uploadBtn} onPress={() => simulateUpload('License Back')}>
              <Text style={licenseBackUrl ? styles.uploadTextActive : styles.uploadText}>{licenseBackUrl ? '✓ Back Added' : '+ License Back'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Make (Brand)</Text>
            <TextInput style={styles.input} placeholder="e.g. Toyota, Honda, Tata" placeholderTextColor={theme.colors.text.muted} value={make} onChangeText={setMake} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Model</Text>
            <TextInput style={styles.input} placeholder="e.g. Camry, Civic, Nexon" placeholderTextColor={theme.colors.text.muted} value={model} onChangeText={setModel} />
          </View>

          <View style={{flexDirection: 'row', gap: theme.spacing.md}}>
            <View style={[styles.inputGroup, {flex: 1}]}>
              <Text style={styles.label}>Manufacturing Year</Text>
              <TextInput style={styles.input} placeholder="e.g. 2022" placeholderTextColor={theme.colors.text.muted} keyboardType="number-pad" value={year} onChangeText={setYear} />
            </View>
            <View style={[styles.inputGroup, {flex: 1}]}>
              <Text style={styles.label}>Color</Text>
              <TextInput style={styles.input} placeholder="e.g. White" placeholderTextColor={theme.colors.text.muted} value={color} onChangeText={setColor} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Plate Number</Text>
            <TextInput style={styles.input} placeholder="e.g. MH-01-AB-1234" placeholderTextColor={theme.colors.text.muted} value={licensePlate} onChangeText={setLicensePlate} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Passenger Seats</Text>
            <TextInput style={styles.input} placeholder="e.g. 4 (excluding driver)" placeholderTextColor={theme.colors.text.muted} keyboardType="number-pad" value={seats} onChangeText={setSeats} />
          </View>

          <TouchableOpacity style={rcUrl ? styles.uploadBtnFullActive : styles.uploadBtnFull} onPress={() => simulateUpload('RC')}>
            <Text style={rcUrl ? styles.uploadTextActive : styles.uploadText}>{rcUrl ? '✓ Vehicle RC Added' : '+ Upload Vehicle RC'}</Text>
          </TouchableOpacity>
        </View>

        {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

        <TouchableOpacity style={styles.submitBtn} onPress={submitKYC}>
          <Text style={styles.submitBtnText}>SUBMIT FOR REVIEW</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={async () => {
            await AsyncStorage.removeItem('userToken');
            navigation.replace('Login');
          }}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: { 
    flex: 1, 
    padding: theme.spacing.lg, 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background 
  },
  header: { 
    fontSize: 32, 
    fontWeight: '800', 
    marginBottom: theme.spacing.xl, 
    color: theme.colors.text.main,
    marginTop: theme.spacing.md,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    marginBottom: theme.spacing.sm, 
    textAlign: 'center',
    color: theme.colors.text.main 
  },
  subtitle: { 
    fontSize: 16, 
    color: theme.colors.text.muted, 
    textAlign: 'center', 
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.medium,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    marginBottom: theme.spacing.lg, 
    color: theme.colors.text.main,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
  },
  inputGroup: { marginBottom: theme.spacing.lg },
  label: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: theme.colors.text.muted, 
    marginBottom: theme.spacing.xs, 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: { 
    backgroundColor: '#FAFAFA', 
    borderWidth: 1, 
    borderColor: theme.colors.border, 
    padding: theme.spacing.md, 
    borderRadius: theme.radius.md,
    fontSize: 16,
    color: theme.colors.text.main,
  },
  buttonOutline: { 
    borderWidth: 2, 
    borderColor: theme.colors.primary, 
    padding: theme.spacing.lg, 
    borderRadius: theme.radius.full, 
    marginTop: theme.spacing.md, 
    width: '100%', 
    alignItems: 'center' 
  },
  buttonOutlineText: { 
    color: theme.colors.primary, 
    fontSize: 16, 
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  uploadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  uploadBtn: { 
    flex: 0.48, 
    backgroundColor: '#FAFAFA', 
    padding: theme.spacing.lg, 
    borderRadius: theme.radius.md, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: theme.colors.border, 
    borderStyle: 'dashed' 
  },
  uploadBtnActive: { 
    flex: 0.48, 
    backgroundColor: theme.colors.success + '15', 
    padding: theme.spacing.lg, 
    borderRadius: theme.radius.md, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: theme.colors.success 
  },
  uploadBtnFull: { 
    backgroundColor: '#FAFAFA', 
    padding: theme.spacing.lg, 
    borderRadius: theme.radius.md, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: theme.colors.border, 
    borderStyle: 'dashed', 
    marginTop: theme.spacing.sm 
  },
  uploadBtnFullActive: { 
    backgroundColor: theme.colors.success + '15', 
    padding: theme.spacing.lg, 
    borderRadius: theme.radius.md, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: theme.colors.success, 
    marginTop: theme.spacing.sm 
  },
  uploadText: { color: theme.colors.text.muted, fontWeight: '600' },
  uploadTextActive: { color: theme.colors.success, fontWeight: '700' },
  formErrorText: { 
    color: theme.colors.danger, 
    textAlign: 'center', 
    marginBottom: theme.spacing.md, 
    fontSize: 14, 
    fontWeight: '700' 
  },
  errorBanner: {
    backgroundColor: theme.colors.danger + '15',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.danger,
  },
  errorText: { 
    color: theme.colors.danger, 
    fontWeight: '600' 
  },
  submitBtn: { 
    backgroundColor: theme.colors.primary, 
    padding: theme.spacing.lg, 
    borderRadius: theme.radius.full, 
    alignItems: 'center', 
    marginTop: theme.spacing.sm,
    ...theme.shadows.medium,
  },
  submitBtnText: { 
    color: theme.colors.text.light, 
    fontSize: 16, 
    fontWeight: '800',
    letterSpacing: 1,
  },
  logoutBtn: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  logoutBtnText: {
    color: theme.colors.danger,
    fontWeight: '700',
    fontSize: 15,
  }
});

export default KYCScreen;

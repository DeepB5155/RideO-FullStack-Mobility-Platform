import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axios';
import { theme } from '../theme/theme';

const localColors = {
  primary: '#0d2340',
  secondary: '#2e5c8a',
  accent: '#f9a826',
  background: '#f4f6fb',
  surface: '#ffffff',
  text: '#1c1c1e',
  textMuted: '#8e8e93',
  outline: '#c7c7cc',
  error: '#ff3b30',
  success: '#34c759',
};

const EditProfileScreen = () => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation<any>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');

  useEffect(() => {
    checkPendingRequest();
  }, []);

  const checkPendingRequest = async () => {
    try {
      const res = await axiosInstance.get('/profile/edit-request/status');
      if (res.data.hasPendingRequest) {
        setPendingRequest(res.data.request);
      }
    } catch (e) {
      console.log('Failed to fetch edit request status', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!fullName || !email || !phoneNumber) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await axiosInstance.post('/profile/edit-request', {
        fullName,
        email,
        phoneNumber
      });
      Alert.alert('Success', 'Your profile update request has been submitted for review.');
      checkPendingRequest();
    } catch (e: any) {
      console.log('Failed to submit profile edit', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={localColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcon name="arrow-back" size={24} color={localColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {pendingRequest ? (
          <View style={styles.pendingContainer}>
            <MaterialIcon name="pending-actions" size={64} color="#f57c00" />
            <Text style={styles.pendingTitle}>Update Under Review</Text>
            <Text style={styles.pendingText}>
              Your request to update your profile is currently being reviewed by an admin. You will be notified once it is approved.
            </Text>
            <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.goBackText}>Back to Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.infoText}>
              Note: Updating your details requires admin verification.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcon name="person" size={20} color={localColors.textMuted} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="John Doe"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcon name="phone" size={20} color={localColors.textMuted} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="9876543210"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcon name="email" size={20} color={localColors.textMuted} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="john@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: localColors.background,
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: localColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: localColors.surface,
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: localColors.text,
  },
  formContainer: {
    padding: 20,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f57c00',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: localColors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: localColors.outline,
    paddingHorizontal: 15,
    height: 52,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'normal',
    color: localColors.text,
  },
  submitBtn: {
    backgroundColor: localColors.primary,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: localColors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  pendingText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: localColors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  goBackBtn: {
    borderWidth: 1,
    borderColor: localColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  goBackText: {
    color: localColors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;

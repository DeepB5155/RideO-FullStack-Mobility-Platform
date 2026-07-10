import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axiosInstance from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const localColors = {
  background: '#f8f9ff',
  surface: '#ffffff',
  primary: '#000000',
  secondary: '#006a61',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#45464d',
  outlineVariant: '#c6c6cd',
  outline: '#76777d',
  error: '#ba1a1a',
  surfaceContainerLow: '#eff4ff',
};

const ProfileInformationScreen = ({ navigation }: any) => {
  const { user, updateUser } = useContext(AuthContext);
  
  const [fullName, setFullName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.name);
      setPhoneNumber(user.phoneNumber || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Validation Error', 'Full Name and Email are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (phoneNumber.trim()) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phoneNumber.trim())) {
        Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number.');
        return;
      }
    }

    try {
      setIsLoading(true);
      const res = await axiosInstance.put('/auth/me', {
        fullName,
        phoneNumber,
        email,
      });

      // Update global context
      if (updateUser) {
        await updateUser({ name: fullName, phoneNumber, email }, res.data.token);
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Update Profile Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        
        {/* App Bar */}
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={28} color={localColors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.appTitle}>Profile Information</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerSubtitle}>Keep your profile details up to date.</Text>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="email" size={20} color={localColors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={localColors.outlineVariant}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="person" size={20} color={localColors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={localColors.outlineVariant}
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="phone" size={20} color={localColors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your phone number"
                placeholderTextColor={localColors.outlineVariant}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]} 
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={localColors.surface} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
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
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 64,
    backgroundColor: localColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 198, 205, 0.2)',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: localColors.onSurface,
    marginLeft: 8,
  },
  scrollContent: {
    padding: 24,
  },
  headerSubtitle: {
    fontSize: 14,
    color: localColors.onSurfaceVariant,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: localColors.onSurface,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surface,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: localColors.primary,
  },
  helperText: {
    fontSize: 12,
    color: localColors.outline,
    marginTop: 4,
    marginLeft: 4,
  },
  footer: {
    padding: 24,
    backgroundColor: localColors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198, 198, 205, 0.2)',
  },
  saveBtn: {
    backgroundColor: localColors.primary,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: localColors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileInformationScreen;

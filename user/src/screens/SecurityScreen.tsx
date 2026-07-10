import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axiosInstance from '../api/axios';

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

const SecurityScreen = ({ navigation }: any) => {
  const [step, setStep] = useState(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!currentPassword) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }

    try {
      setIsLoading(true);
      await axiosInstance.post('/auth/verify-password', {
        currentPassword,
      });
      setStep(2); // Move forward to step 2 on success
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Incorrect current password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      Alert.alert('Validation Error', 'New password must be different from the current password.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters.');
      return;
    }

    try {
      setIsLoading(true);
      await axiosInstance.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      Alert.alert('Success', 'Password changed successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Change Password Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to change password. Please check your current password and try again.');
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
          <Text style={styles.appTitle}>Security</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerSubtitle}>Keep your account secure by using a strong password.</Text>

          {step === 1 ? (
            /* Current Password */
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock-outline" size={20} color={localColors.primary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={localColors.outlineVariant}
                  secureTextEntry={!showCurrent}
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeIcon}>
                  <MaterialIcons name={showCurrent ? "visibility" : "visibility-off"} size={20} color={localColors.outlineVariant} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock" size={20} color={localColors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor={localColors.outlineVariant}
                    secureTextEntry={!showNew}
                  />
                  <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeIcon}>
                    <MaterialIcons name={showNew ? "visibility" : "visibility-off"} size={20} color={localColors.outlineVariant} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock" size={20} color={localColors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={localColors.outlineVariant}
                    secureTextEntry={!showConfirm}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
                    <MaterialIcons name={showConfirm ? "visibility" : "visibility-off"} size={20} color={localColors.outlineVariant} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]} 
            onPress={step === 1 ? handleVerify : handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={localColors.surface} />
            ) : (
              <Text style={styles.saveBtnText}>{step === 1 ? 'Continue' : 'Update Password'}</Text>
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
  eyeIcon: {
    padding: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: localColors.primary,
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

export default SecurityScreen;

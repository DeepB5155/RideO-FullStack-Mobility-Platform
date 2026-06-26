import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { theme } from '../theme/theme';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isForgotPassword) {
        const response = await api.post('/Auth/forgot-password', { email });
        Alert.alert('Reset Link Sent', response.data.message);
        setIsForgotPassword(false);
        return;
      }

      const response = await api.post('/Auth/login', { email, password });
      
      const { token, user } = response.data;
      
      if (user.role !== 'Driver') {
        Alert.alert('Error', 'Invalid User Role. Please login with a Driver account.');
        return;
      }
      
      await login(token, user);
    } catch (error: any) {
      const message = error.response?.data || error.message || 'Login failed';
      Alert.alert('Login Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>RideO</Text>
          <Text style={styles.headerSubtitle}>
            {isForgotPassword ? 'Reset your password' : 'Sign in to Driver Portal'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={theme.colors.text.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {!isForgotPassword && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={theme.colors.text.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          )}

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.text.light} />
            ) : (
              <Text style={styles.buttonText}>{isForgotPassword ? 'Send Reset Link' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.switchButton} 
            onPress={() => setIsForgotPassword(!isForgotPassword)}
          >
            <Text style={styles.switchButtonText}>
              {isForgotPassword ? 'Back to Login' : 'Forgot Password?'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xxl * 1.5,
    paddingBottom: theme.spacing.xxl,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.text.light,
    marginBottom: theme.spacing.xs,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.primaryLight,
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    ...theme.shadows.large,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 14,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.main,
    ...theme.shadows.small,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  buttonText: {
    color: theme.colors.text.light,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  switchButton: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  switchButtonText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default LoginScreen;

import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { theme } from '../theme/theme';

const LoginScreen = () => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (isForgotPassword && !email) {
      Alert.alert('Error', 'Please enter your email to reset password.');
      return;
    }
    
    if (!isForgotPassword && (!email || !password || (isRegistering && !fullName))) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (isForgotPassword) {
        const response = await api.post('/auth/forgot-password', { email });
        Alert.alert('Reset Link Sent', response.data.message);
        setIsForgotPassword(false);
        return;
      }

      if (isRegistering) {
        await api.post('/auth/register', { 
          fullName, 
          email, 
          password, 
          role: 'User',
          referralCode: referralCode ? referralCode : undefined
        });
        Alert.alert('Success', 'Account created! Logging you in...');
      }
      
      const response = await api.post('/auth/login', { email, password });
      await login(response.data);
    } catch (error: any) {
      Alert.alert('Authentication Failed', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isForgotPassword ? 'Reset Password' : 'RideO Passenger'}</Text>
      <Text style={styles.subtitle}>
        {isForgotPassword ? 'Enter email to receive a reset link' : isRegistering ? 'Create a new account' : 'Log in to request a ride'}
      </Text>

      {!isForgotPassword && isRegistering && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={theme.colors.text.muted}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor={theme.colors.text.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      {!isForgotPassword && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.colors.text.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
      )}

      {!isForgotPassword && isRegistering && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Referral Code (Optional)"
            placeholderTextColor={theme.colors.text.muted}
            autoCapitalize="characters"
            value={referralCode}
            onChangeText={setReferralCode}
          />
        </View>
      )}

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleAuth}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{isForgotPassword ? 'Send Reset Link' : isRegistering ? 'Sign Up' : 'Log In'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.toggleButton} 
        onPress={() => {
          if (isForgotPassword) setIsForgotPassword(false);
          else setIsRegistering(!isRegistering);
        }}
      >
        <Text style={styles.toggleText}>
          {isForgotPassword ? 'Back to Login' : isRegistering ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>

      {!isRegistering && !isForgotPassword && (
        <TouchableOpacity 
          style={styles.forgotButton} 
          onPress={() => setIsForgotPassword(true)}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text.main,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing.xxl,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    fontSize: 16,
    color: theme.colors.text.main,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadows.medium,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.surface,
  },
  buttonText: {
    color: theme.colors.text.light,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  toggleButton: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  toggleText: {
    color: theme.colors.primaryLight,
    fontSize: 14,
    fontWeight: '700',
  },
  forgotButton: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  forgotText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  }
});

export default LoginScreen;

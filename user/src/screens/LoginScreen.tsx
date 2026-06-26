import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

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
            placeholderTextColor="#999"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#999"
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
            placeholderTextColor="#999"
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
            placeholderTextColor="#999"
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
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    color: '#333', // ensure text is visible
  },
  button: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  forgotButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotText: {
    color: '#007AFF',
    fontSize: 14,
  }
});

export default LoginScreen;

import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

const LoginScreen = () => {
  // Tabs: 'phone' or 'email'
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    const identifier = loginMethod === 'phone' ? phone : email;

    if (!identifier || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (loginMethod === 'phone') {
      if (phone.length !== 10) {
        Alert.alert('Error', 'Phone number must be exactly 10 digits.');
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Error', 'Please enter a valid email address.');
        return;
      }
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{4,}$/;
    if (!strongPasswordRegex.test(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 4 characters and contain 1 uppercase, 1 lowercase, 1 number, and 1 special character.'
      );
      return;
    }

    setLoading(true);
    try {
      // The API currently expects { email, password } for login.
      const response = await api.post('/Auth/login', { email: identifier, password });
      
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
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollGrow}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainContainer}>
            {/* Header Section */}
            <View style={styles.header}>
              <Text style={styles.title}>RideO</Text>
              <Text style={styles.subtitle}>Driver Portal</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              
              {/* Login Method Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, loginMethod === 'phone' && styles.tabButtonActive]}
                  onPress={() => setLoginMethod('phone')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, loginMethod === 'phone' && styles.tabTextActive]}>Phone</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, loginMethod === 'email' && styles.tabButtonActive]}
                  onPress={() => setLoginMethod('email')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, loginMethod === 'email' && styles.tabTextActive]}>Email</Text>
                </TouchableOpacity>
              </View>

              {/* Dynamic Input based on Tab */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{loginMethod === 'phone' ? 'PHONE NUMBER' : 'EMAIL ADDRESS'}</Text>
                <View style={styles.inputWrapper}>
                  <Icon name={loginMethod === 'phone' ? "call" : "email"} size={20} color="#76777d" style={styles.icon} />
                  {loginMethod === 'phone' ? (
                    <TextInput
                      style={styles.input}
                      placeholder="+91 98765 43210"
                      placeholderTextColor="#76777d"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  ) : (
                    <TextInput
                      style={styles.input}
                      placeholder="name@example.com"
                      placeholderTextColor="#76777d"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  )}
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>PASSWORD</Text>
                  <TouchableOpacity onPress={() => Alert.alert('Reset Password', 'Contact support to reset your password.')}>
                    <Text style={styles.forgotText}>Forgot?</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <Icon name="lock-outline" size={20} color="#76777d" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#76777d"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Icon name={showPassword ? "visibility" : "visibility-off"} size={20} color="#76777d" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Login</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer Section */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                New to RideO?{' '}
              </Text>
              <TouchableOpacity onPress={() => Alert.alert('KYC', 'Please login with an existing account to complete KYC, or contact admin.')}>
                <Text style={styles.footerLink}>Complete KYC to drive</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollGrow: {
    flexGrow: 1,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#45464d',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#eaf1ff',
    borderRadius: 9999,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9999,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#76777d',
  },
  tabTextActive: {
    color: '#000000',
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0b1c30',
    letterSpacing: 1.5,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c6c6cd',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 52,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0b1c30',
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  buttonContainer: {
    marginTop: 16,
  },
  button: {
    backgroundColor: '#000000',
    borderRadius: 9999,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  footerText: {
    fontSize: 16,
    color: '#45464d',
  },
  footerLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

export default LoginScreen;

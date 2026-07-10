import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

const localColors = {
  background: '#f8f9ff',
  primary: '#000000',
  secondary: '#006a61',
  onSurfaceVariant: '#45464d',
  surfaceContainerLowest: '#ffffff',
  outlineVariant: '#c6c6cd',
  outline: '#76777d',
  onSurface: '#0b1c30',
  surfaceContainer: '#e5eeff',
  surfaceVariant: '#d3e4fe',
};

const LoginScreen = () => {
  // Toggle between Login and Register
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Tabs for Login: 'phone' or 'email'
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);

  const handleAuth = async () => {
    if (isRegistering) {
      if (!fullName || !email || !phone || !password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Error', 'Please enter a valid email address.');
        return;
      }

      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
        Alert.alert('Error', 'Please enter a valid 10-digit phone number.');
        return;
      }

      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!strongPasswordRegex.test(password)) {
        Alert.alert('Weak Password', 'Password must be at least 8 characters and contain 1 uppercase, 1 lowercase, 1 number, and 1 special character.');
        return;
      }

      setLoading(true);
      try {
        await api.post('/Auth/register', {
          fullName,
          email,
          phone,
          password,
          role: 'Driver'
        });
        // After successful registration, log them in
        const response = await api.post('/Auth/login', { email, password });
        const { token, user } = response.data;
        await login(token, user);
      } catch (error: any) {
        const message = error.response?.data || error.message || 'Registration failed';
        Alert.alert('Registration Error', message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login Flow
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

    setLoading(true);
    try {
      // The API currently expects { email, password } for login.
      const response = await api.post('/Auth/login', { email: identifier, password });
      
      const { token, user } = response.data;
      
      if (user.role !== 'Driver') {
        Alert.alert('Error', 'Account not found. Please register as a Driver first.');
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

  const handleForgotPassword = async () => {
    const identifier = loginMethod === 'phone' ? phone : email;
    if (!identifier) {
      Alert.alert('Error', 'Please enter your email or phone to reset password.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/forgot-password', { email: identifier });
      
      if (response.data.debug_token) {
        Alert.alert(
          'Reset Link Sent', 
          `Your debug token is: ${response.data.debug_token}\n\nUse this to test the reset password flow.`,
          [{ text: 'OK', onPress: () => navigation.navigate('ResetPassword') }]
        );
      } else {
        Alert.alert('Reset Link Sent', response.data.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  // --- REGISTRATION UI ---
  if (isRegistering) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />
        <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.regScrollInner} showsVerticalScrollIndicator={false}>
            
            <View style={styles.regHeader}>
              <View style={styles.regStepBadge}>
                <Text style={styles.regStepText}>STEP 1 OF 3</Text>
              </View>
              <Text style={styles.regTitle}>Create your profile</Text>
              <Text style={styles.regSubtitle}>Enter your basic information to get started.</Text>
            </View>

            <View style={styles.regForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.regLabel}>Full Name</Text>
                <View style={styles.regInputWrapper}>
                  <Icon name="person" size={20} color={localColors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.regInput}
                    placeholder="Jane Doe"
                    placeholderTextColor={localColors.outline}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.regLabel}>Email Address</Text>
                <View style={styles.regInputWrapper}>
                  <Icon name="mail" size={20} color={localColors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.regInput}
                    placeholder="jane@example.com"
                    placeholderTextColor={localColors.outline}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.regLabel}>Phone Number</Text>
                <View style={styles.regInputWrapper}>
                  <Icon name="phone-iphone" size={20} color={localColors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.regInput}
                    placeholder="9876543210"
                    placeholderTextColor={localColors.outline}
                    keyboardType="numeric"
                    maxLength={10}
                    value={phone}
                    onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.regLabel}>Password</Text>
                <View style={styles.regInputWrapper}>
                  <Icon name="lock" size={20} color={localColors.outline} style={styles.icon} />
                  <TextInput
                    style={styles.regInput}
                    placeholder="••••••••"
                    placeholderTextColor={localColors.outline}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Icon name={showPassword ? "visibility" : "visibility-off"} size={20} color={localColors.outline} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.regPasswordHint}>Must be at least 8 characters.</Text>
              </View>

              <View style={styles.regDivider} />

              <TouchableOpacity 
                style={styles.regSubmitBtn} 
                onPress={handleAuth}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.regSubmitBtnText}>Next: Vehicle Details</Text>
                    <Icon name="arrow-forward" size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.regFooter}>
                <Text style={styles.regFooterText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => setIsRegistering(false)}>
                  <Text style={styles.regFooterLink}>Sign In</Text>
                </TouchableOpacity>
              </View>

            </View>

            <View style={styles.regTermsSection}>
              <Text style={styles.regTermsText}>
                By proceeding, you agree to RideO's{' '}
                <Text style={styles.regTermsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.regTermsLink}>Privacy Policy</Text>.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- STANDARD LOGIN UI ---
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
                  <TouchableOpacity onPress={handleForgotPassword}>
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
                  onPress={handleAuth}
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
              <TouchableOpacity onPress={() => setIsRegistering(true)}>
                <Text style={styles.footerLink}>Create a profile</Text>
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

  // --- REGISTRATION STYLES ---
  regScrollInner: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  regHeader: {
    marginBottom: 32,
  },
  regStepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  regStepText: {
    fontSize: 12,
    fontWeight: '700',
    color: localColors.secondary,
    letterSpacing: 1,
  },
  regTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: localColors.onSurface,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  regSubtitle: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
    lineHeight: 24,
  },
  regForm: {
    flex: 1,
  },
  regLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: localColors.onSurface,
    marginBottom: 8,
  },
  regInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: localColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: localColors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 52,
  },
  regInput: {
    flex: 1,
    fontSize: 16,
    color: localColors.onSurface,
    height: '100%',
  },
  regPasswordHint: {
    fontSize: 12,
    color: localColors.outline,
    marginTop: 6,
  },
  regDivider: {
    height: 1,
    backgroundColor: 'rgba(198, 198, 205, 0.3)',
    marginVertical: 32,
  },
  regSubmitBtn: {
    backgroundColor: localColors.primary,
    flexDirection: 'row',
    borderRadius: 9999,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
  },
  regSubmitBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  regFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  regFooterText: {
    fontSize: 16,
    color: localColors.onSurfaceVariant,
  },
  regFooterLink: {
    fontSize: 16,
    fontWeight: '600',
    color: localColors.secondary,
  },
  regTermsSection: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  regTermsText: {
    fontSize: 12,
    color: localColors.outline,
    textAlign: 'center',
    lineHeight: 18,
  },
  regTermsLink: {
    textDecorationLine: 'underline',
    color: localColors.onSurface,
  }
});

export default LoginScreen;
